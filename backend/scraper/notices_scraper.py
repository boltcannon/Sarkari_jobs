"""
Scraper for Admit Cards and Results from freejobalert.com.
Uses the same parsing infrastructure as ssc_scraper.
"""
import hashlib
import logging
import re
from datetime import datetime
from typing import Optional

import requests
from bs4 import BeautifulSoup

from ..database import SessionLocal
from ..models import Job, JobCategory, JobStatus
from .ssc_scraper import (
    HEADERS,
    _detect_category,
    _extract_organisation,
    _make_content_hash,
    _upsert_job,
    _parse_date,
    _clean_description,
    _is_official_url,
)

logger = logging.getLogger(__name__)

NOTICE_PAGES = {
    "admit_card": [
        "https://www.freejobalert.com/admit-card/",
        "https://www.freejobalert.com/admit-card/page/2/",
        "https://www.freejobalert.com/admit-card/page/3/",
    ],
    "result": [
        "https://www.freejobalert.com/result/",
        "https://www.freejobalert.com/result/page/2/",
        "https://www.freejobalert.com/result/page/3/",
    ],
}


def _get_notice_links(page_url: str) -> list[tuple[str, str]]:
    try:
        r = requests.get(page_url, headers=HEADERS, timeout=20)
        r.raise_for_status()
    except Exception as exc:
        logger.warning("Could not fetch %s: %s", page_url, exc)
        return []

    soup = BeautifulSoup(r.text, "lxml")
    links = []

    for div in soup.find_all("div", class_="hpgjbcont"):
        for a in div.find_all("a", href=True):
            title = a.get_text(strip=True)
            href = a["href"]
            if len(title) > 10 and "/articles/" in href:
                links.append((title, href))

    for a in soup.select("h2.entry-title a, h3.entry-title a, .post-title a"):
        title = a.get_text(strip=True)
        href = a.get("href", "")
        if len(title) > 10 and href:
            links.append((title, href))

    seen: set[str] = set()
    return [(t, u) for t, u in links if not (u in seen or seen.add(u))]  # type: ignore


def _extract_notice_details(url: str) -> dict:
    result = {
        "description": None,
        "apply_link": url,
        "is_official_link": False,
        "notification_pdf": None,
        "last_date": None,
        "organisation_hint": None,
    }
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
    except Exception as exc:
        logger.warning("Could not fetch %s: %s", url, exc)
        return result

    soup = BeautifulSoup(r.text, "lxml")
    article = soup.find("article") or soup.find("div", class_="entry-content")
    if not article:
        return result

    full_text = article.get_text(separator="\n", strip=True)
    result["description"] = _clean_description(full_text)

    # Find official download / result link
    for table in article.find_all("table"):
        for row in table.find_all("tr"):
            cells = row.find_all(["td", "th"])
            if len(cells) < 2:
                continue
            label = cells[0].get_text(" ", strip=True).lower().strip()
            for a in cells[-1].find_all("a", href=True):
                href = a["href"].strip()
                if not href.startswith("http"):
                    continue
                if any(kw in label for kw in ["admit card", "hall ticket", "call letter",
                                               "download", "result", "merit list", "score card"]):
                    if _is_official_url(href):
                        result["apply_link"] = href
                        result["is_official_link"] = True
                if href.lower().endswith(".pdf") and not result["notification_pdf"]:
                    result["notification_pdf"] = href

    # Extract date
    for line in full_text.split("\n"):
        if any(kw in line.lower() for kw in ["exam date", "date of exam", "result date",
                                               "last date", "download from", "available"]):
            d = _parse_date(line)
            if d:
                result["last_date"] = d
                break

    return result


def scrape_notices(max_per_type: int = 60) -> dict:
    """Scrape admit cards and results. Returns count dict."""
    counts = {"admit_card": 0, "result": 0}

    for content_type, pages in NOTICE_PAGES.items():
        all_links: list[tuple[str, str]] = []
        for page_url in pages:
            all_links.extend(_get_notice_links(page_url))

        # Deduplicate
        seen: set[str] = set()
        unique = [(t, u) for t, u in all_links if not (u in seen or seen.add(u))]  # type: ignore

        if not unique:
            logger.warning("No %s links found.", content_type)
            continue

        db = SessionLocal()
        inserted = 0
        try:
            for title, url in unique[:max_per_type]:
                try:
                    details = _extract_notice_details(url)
                    org = _extract_organisation(title, details.get("description") or "",
                                                hint=details.get("organisation_hint") or "")
                    category = _detect_category(title + " " + org)
                    content_hash = hashlib.sha256(
                        f"{content_type}|{title.strip().lower()}|{org.strip().lower()}".encode()
                    ).hexdigest()

                    data = {
                        "title": title[:500],
                        "organisation": org[:300],
                        "category": category,
                        "status": JobStatus.ACTIVE,
                        "content_hash": content_hash,
                        "description": details.get("description"),
                        "apply_link": details.get("apply_link") or url,
                        "is_official_link": details.get("is_official_link", False),
                        "notification_pdf": details.get("notification_pdf"),
                        "last_date": details.get("last_date"),
                        "source_url": url,
                        "source": "freejobalert.com",
                        "content_type": content_type,
                    }

                    job = _upsert_job(db, data)
                    if job:
                        inserted += 1

                except Exception as exc:
                    logger.warning("Error processing %s %s: %s", content_type, url[:60], exc)
                    db.rollback()
        finally:
            db.close()

        counts[content_type] = inserted
        logger.info("Notices scraper: %d new %s inserted.", inserted, content_type)

    return counts


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    result = scrape_notices(max_per_type=30)
    print(f"Inserted: {result}")
