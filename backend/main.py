from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .database import engine
from .models import Base
from .routers import jobs, users, push
from .scraper.scheduler import start_scheduler, stop_scheduler, run_now

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ensured.")

    # Add content_type column if it doesn't exist (safe on re-runs)
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS content_type VARCHAR(20) DEFAULT 'job'"
        ))
        conn.commit()
    logger.info("content_type column ensured.")

    # Start background scraper scheduler
    start_scheduler()

    yield

    stop_scheduler()


app = FastAPI(
    title="Sarkari Jobs API",
    description="Backend API for the Sarkari Jobs mobile app",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router)
app.include_router(users.router)
app.include_router(push.router)


@app.get("/health")
def health():
    from .scraper.scheduler import _scheduler
    next_run = None
    if _scheduler and _scheduler.running:
        job = _scheduler.get_job("scrape_all_jobs")
        if job and job.next_run_time:
            next_run = job.next_run_time.isoformat()
    return {"status": "ok", "service": "sarkari-jobs-api", "next_scrape": next_run}


@app.post("/api/admin/scrape")
def trigger_scrape():
    """Manually trigger an immediate scrape of all job boards."""
    import threading
    thread = threading.Thread(target=run_now, daemon=True)
    thread.start()
    return {"status": "started", "message": "Scrape running in background"}


@app.get("/api/admin/stats")
def get_stats():
    """Live dashboard stats — jobs DB + registered push users."""
    from datetime import date, timedelta
    from sqlalchemy import func
    from .database import SessionLocal
    from .models import Job, PushSubscription

    db = SessionLocal()
    try:
        today = datetime.utcnow().date()
        week_ago = today - timedelta(days=7)

        # ── Jobs ──────────────────────────────────────────────────────────────
        total_jobs      = db.query(Job).count()
        jobs_today      = db.query(Job).filter(func.date(Job.created_at) == today).count()
        jobs_this_week  = db.query(Job).filter(func.date(Job.created_at) >= week_ago).count()
        active_jobs     = db.query(Job).filter(
            Job.last_date >= datetime.utcnow()
        ).count()

        # Jobs by category
        by_category = {
            row[0]: row[1]
            for row in db.query(Job.category, func.count(Job.id))
                         .group_by(Job.category).all()
        }

        # ── Push subscribers (= app installs with notifications on) ──────────
        total_users = db.query(PushSubscription).count()

        # Top categories among subscribers
        all_subs = db.query(PushSubscription.categories).all()
        cat_counts: dict[str, int] = {}
        for (cats,) in all_subs:
            for c in (cats or []):
                cat_counts[c] = cat_counts.get(c, 0) + 1
        top_categories = dict(sorted(cat_counts.items(), key=lambda x: -x[1]))

        return {
            "users": {
                "total_registered": total_users,
                "top_categories": top_categories,
            },
            "jobs": {
                "total": total_jobs,
                "active": active_jobs,
                "added_today": jobs_today,
                "added_this_week": jobs_this_week,
                "by_category": by_category,
            },
            "generated_at": datetime.utcnow().isoformat() + "Z",
        }
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "Sarkari Jobs API", "docs": "/docs"}
