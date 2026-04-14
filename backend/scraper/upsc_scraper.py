"""
UPSC (and PSC/civil services) job scraper using freejobalert.com as source.

upsc.gov.in is a JavaScript-rendered Drupal site — the active-examinations page
delivers an empty HTML skeleton without JS execution, making BeautifulSoup
scraping impossible.  We use freejobalert.com which mirrors UPSC notifications.

Additionally, this module scrapes the UPSC category page on FreeJobAlert for a
targeted UPSC/civil-services subset.
"""

import hashlib
import logging
import re
from datetime import datetime
from typing import Optional

import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import Job, JobCategory, JobStatus
from .ssc_scraper import (
    HEADERS,
    _detect_category,
    _extract_job_details,
    _extract_organisation,
    _make_content_hash,
    _parse_date,
    _upsert_job,
)

logger = logging.getLogger(__name__)

# UPSC / PSC focused pages on freejobalert
UPSC_PAGES = [
    "https://www.freejobalert.com/government-jobs/",
    "https://www.freejobalert.com/state-government-jobs/",
]


def _get_category_job_links(page_url: str) -> list[tuple[str, str]]:
    """Scrape a FreeJobAlert category/tag page for job links."""
    try:
        r = requests.get(page_url, headers=HEADERS, timeout=20)
        r.raise_for_status()
    except Exception as exc:
        logger.warning("Could not fetch %s: %s", page_url, exc)
        return []

    soup = BeautifulSoup(r.text, "lxml")
    links = []

    # hpgjbcont divs (featured section)
    for div in soup.find_all("div", class_="hpgjbcont"):
        for a in div.find_all("a", href=True):
            title = a.get_text(strip=True)
            href = a["href"]
            if len(title) > 15 and "/articles/" in href:
                links.append((title, href))

    # Standard WordPress post list
    for post in soup.select("article.post, .post-listing article, h2.entry-title a, h3.entry-title a"):
        a = post if post.name == "a" else post.find("a", href=True)
        if a:
            title = a.get_text(strip=True)
            href = a.get("href", "")
            if len(title) > 15 and href:
                links.append((title, href))

    # Deduplicate
    seen = set()
    unique = []
    for title, url in links:
        if url not in seen:
            seen.add(url)
            unique.append((title, url))

    logger.info("Found %d UPSC/PSC links on %s", len(unique), page_url)
    return unique


def scrape_upsc(max_jobs: int = 40) -> int:
    """
    Scrape UPSC / PSC job listings from FreeJobAlert category pages.
    Returns count of newly inserted rows.
    """
    all_links: list[tuple[str, str]] = []
    for page_url in UPSC_PAGES:
        all_links.extend(_get_category_job_links(page_url))

    if not all_links:
        logger.warning("No UPSC job links found — skipping.")
        return 0

    # Deduplicate across pages
    seen = set()
    unique_links = []
    for item in all_links:
        if item[1] not in seen:
            seen.add(item[1])
            unique_links.append(item)

    db = SessionLocal()
    inserted = 0
    try:
        for title, url in unique_links[:max_jobs]:
            try:
                details = _extract_job_details(url)
                org = _extract_organisation(
                    title,
                    details.get("description") or "",
                    hint=details.get("organisation_hint") or "",
                )

                # Force UPSC/PSC category if the source page is UPSC-focused
                category = _detect_category(title + " " + org)
                if category == JobCategory.OTHER and any(
                    kw in title.lower() for kw in ["civil", "service", "ias", "ips", "combined"]
                ):
                    category = JobCategory.UPSC

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
                    "notification_pdf": details.get("notification_pdf"),
                    "last_date": details.get("last_date"),
                    "source_url": url,
                    "source": "freejobalert.com",
                }

                if _upsert_job(db, data):
                    inserted += 1

            except Exception as exc:
                logger.warning("Error processing UPSC job %s: %s", url[:60], exc)
                db.rollback()

    finally:
        db.close()

    logger.info("UPSC scraper done. Inserted %d / %d jobs.", inserted, len(unique_links[:max_jobs]))
    return inserted


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    count = scrape_upsc(max_jobs=20)
    print(f"Inserted {count} new UPSC jobs.")
