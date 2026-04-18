"""
Multi-category job scraper using freejobalert.com.

Scrapes Railway, Banking, Police, Teaching, Defence and State PSC category
pages — the same infrastructure used by ssc_scraper / upsc_scraper, but
with a forced category assignment so jobs land in the right bucket.
"""

import logging

from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import Job, JobCategory, JobStatus
from .ssc_scraper import (
    HEADERS,
    _detect_category,
    _extract_job_details,
    _extract_organisation,
    _make_content_hash,
    _upsert_job,
)

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# ── Category page map ─────────────────────────────────────────────────────────
# Each entry: (freejobalert URL, forced JobCategory or None to auto-detect)
CATEGORY_PAGES: list[tuple[str, JobCategory | None]] = [
    ("https://www.freejobalert.com/bank-jobs/",         JobCategory.BANKING),
    ("https://www.freejobalert.com/railway-jobs/",      JobCategory.RAILWAY),
    ("https://www.freejobalert.com/police-jobs/",       JobCategory.POLICE),
    ("https://www.freejobalert.com/teaching-jobs/",     JobCategory.TEACHING),
    ("https://www.freejobalert.com/defence-jobs/",      JobCategory.DEFENCE),
    ("https://www.freejobalert.com/state-psc-jobs/",    JobCategory.STATE_PSC),
    ("https://www.freejobalert.com/psu-jobs/",          None),   # auto-detect
    ("https://www.freejobalert.com/engineering-jobs/",  None),   # auto-detect
]


def _get_category_links(page_url: str) -> list[tuple[str, str]]:
    """Return (title, url) pairs from a freejobalert category page."""
    try:
        r = requests.get(page_url, headers=HEADERS, timeout=20)
        r.raise_for_status()
    except Exception as exc:
        logger.warning("Could not fetch %s: %s", page_url, exc)
        return []

    soup = BeautifulSoup(r.text, "lxml")
    links: list[tuple[str, str]] = []

    # hpgjbcont featured blocks
    for div in soup.find_all("div", class_="hpgjbcont"):
        for a in div.find_all("a", href=True):
            title = a.get_text(strip=True)
            href = a["href"]
            if len(title) > 15 and "/articles/" in href:
                links.append((title, href))

    # Standard WordPress post list / entry titles
    for el in soup.select("h2.entry-title a, h3.entry-title a, .post-listing h2 a"):
        title = el.get_text(strip=True)
        href = el.get("href", "")
        if len(title) > 15 and href:
            links.append((title, href))

    # Deduplicate preserving order
    seen: set[str] = set()
    unique: list[tuple[str, str]] = []
    for t, u in links:
        if u not in seen:
            seen.add(u)
            unique.append((t, u))

    logger.info("Found %d links on %s", len(unique), page_url)
    return unique


def scrape_multi(max_per_category: int = 30) -> dict[str, int]:
    """
    Scrape all category pages and insert new jobs.
    Returns a dict mapping category name → inserted count.
    """
    totals: dict[str, int] = {}
    new_jobs: list[Job] = []

    db: Session = SessionLocal()
    try:
        for page_url, forced_category in CATEGORY_PAGES:
            cat_name = forced_category.value if forced_category else "auto"
            links = _get_category_links(page_url)
            inserted = 0

            for title, url in links[:max_per_category]:
                try:
                    details = _extract_job_details(url)
                    org = _extract_organisation(
                        title,
                        details.get("description") or "",
                        hint=details.get("organisation_hint") or "",
                    )

                    category = forced_category or _detect_category(title + " " + org)
                    content_hash = _make_content_hash(title, org, details.get("last_date"))

                    data = {
                        "title": title[:500],
                        "organisation": org[:300],
                        "category": category,
                        "status": JobStatus.ACTIVE,
                        "content_hash": content_hash,
                        "total_posts": details.get("total_posts"),
                        "description": details.get("description"),
                        "qualification": details.get("qualification"),
                        "age_limit": details.get("age_limit"),
                        "salary": details.get("salary"),
                        "apply_link": url,
                        "is_official_link": False,
                        "notification_pdf": details.get("notification_pdf"),
                        "last_date": details.get("last_date"),
                        "source_url": url,
                        "source": "freejobalert.com",
                        "content_type": "job",
                    }

                    job = _upsert_job(db, data)
                    if job is not None:
                        inserted += 1
                        new_jobs.append(job)

                except Exception as exc:
                    logger.warning("Error processing %s: %s", url[:60], exc)
                    db.rollback()

            totals[cat_name] = totals.get(cat_name, 0) + inserted
            logger.info("Category %s: inserted %d / %d", cat_name, inserted, len(links[:max_per_category]))

    finally:
        db.close()

    # Send push notifications for all newly inserted jobs
    if new_jobs:
        try:
            from .notify import notify_new_jobs
            notify_new_jobs(new_jobs)
        except Exception as exc:
            logger.warning("Push notify error: %s", exc)

    logger.info("multi_scraper done: %s", totals)
    return totals


if __name__ == "__main__":
    import logging as _logging
    _logging.basicConfig(level=_logging.INFO)
    result = scrape_multi(max_per_category=10)
    print("Result:", result)
