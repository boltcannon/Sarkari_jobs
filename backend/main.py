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


@app.get("/")
def root():
    return {"message": "Sarkari Jobs API", "docs": "/docs"}
