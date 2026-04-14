"""
APScheduler configuration — runs all scrapers every 6 hours.
"""
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from ..config import settings
from .ssc_scraper import scrape_ssc
from .upsc_scraper import scrape_upsc

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def _run_all_scrapers() -> dict:
    """Run SSC + UPSC scrapers and return summary."""
    logger.info("Running all scrapers...")
    results = {
        "ssc": scrape_ssc(max_jobs=150),
        "upsc": scrape_upsc(max_jobs=50),
    }
    logger.info("Scraper run complete: %s", results)
    return results


def run_now() -> dict:
    """Trigger an immediate scrape outside the schedule (used by admin endpoint)."""
    return _run_all_scrapers()


def start_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler and _scheduler.running:
        return _scheduler

    _scheduler = BackgroundScheduler(timezone="Asia/Kolkata")
    _scheduler.add_job(
        func=_run_all_scrapers,
        trigger=IntervalTrigger(hours=settings.SCRAPER_INTERVAL_HOURS),
        id="scrape_all_jobs",
        name="Scrape SSC + UPSC job boards",
        replace_existing=True,
        misfire_grace_time=600,
    )
    _scheduler.start()
    logger.info(
        "Scheduler started — scraping every %d hours (SSC + UPSC).",
        settings.SCRAPER_INTERVAL_HOURS,
    )
    return _scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped.")
