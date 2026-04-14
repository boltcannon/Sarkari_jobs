"""
SSC (and general government job) scraper using freejobalert.com as source.

Why freejobalert.com instead of ssc.gov.in directly?
ssc.gov.in is an Angular SPA whose backend API requires undiscoverable proprietary
query parameters — every endpoint returns HTTP 203 "Query params are missing" when
called without them.  freejobalert.com mirrors all SSC/central govt notifications in
plain HTML with structured tables and is publicly accessible.

The scraper:
  1. Fetches the FreeJobAlert homepage and extracts job links from "hpgjbcont" sections.
  2. Visits each job detail page and parses tables for dates, vacancies, qualification.
  3. Generates a SHA-256 content_hash from (title + organisation + last_date) to
     deduplicate on re-runs.
  4. Upserts into the `jobs` table — skipping rows that already exist.
"""

import hashlib
import logging
import re
from datetime import datetime
from typing import Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import Job, JobCategory, JobStatus

logger = logging.getLogger(__name__)

BASE_URL = "https://www.freejobalert.com"
HOME_URL = "https://www.freejobalert.com/"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
}

# ── Org → official apply portal map ─────────────────────────────────────────────
# Keys are lowercase substrings matched against the organisation name.
# Listed from most-specific to least-specific — first match wins.
_ORG_PORTAL_MAP: list[tuple[str, str]] = [
    # Central exam / recruitment bodies — most specific first
    ("staff selection commission",     "https://ssc.gov.in/login"),
    ("union public service commission","https://upsconline.nic.in"),
    # Railways
    ("railway recruitment board",      "https://rrbapply.gov.in"),
    ("indian railway catering",        "https://www.irctc.com/"),
    ("dedicated freight corridor",     "https://dfccil.com/dfccil_/Careers"),
    # Banking — specific banks before generic "ibps"
    ("reserve bank of india",          "https://opportunities.rbi.org.in"),
    ("state bank of india",            "https://bank.sbi/careers"),
    ("nabard",                         "https://nabard.org/careers.aspx"),
    ("sidbi",                          "https://www.sidbi.in/en/careers"),
    ("institute of banking personnel", "https://ibps.in"),
    # Defence / paramilitary — full names first, then abbreviations
    ("indian army",                    "https://joinindianarmy.nic.in"),
    ("territorial army",               "https://joinindianarmy.nic.in"),
    ("indian navy",                    "https://joinindiannavy.gov.in"),
    ("indian air force",               "https://agnipathvayu.cdac.in"),
    ("central reserve police force",   "https://rect.crpf.gov.in"),
    ("border security force",          "https://rectt.bsf.gov.in"),
    ("central industrial security force", "https://cisfrectt.cisf.gov.in"),
    ("indo-tibetan border police",     "https://itbpolice.nic.in"),
    ("sashastra seema bal",            "https://ssbrectt.gov.in"),
    ("national disaster response force","https://ndrf.gov.in"),
    ("intelligence bureau",            "https://mha.gov.in/en/recruitment"),
    # Teaching
    ("kendriya vidyalaya",             "https://kvsangathan.nic.in"),
    ("navodaya vidyalaya",             "https://navodaya.gov.in"),
    ("national testing agency",        "https://nta.ac.in"),
    # PSUs — matched by distinctive full name fragments
    ("rashtriya chemicals",            "https://www.rcfltd.com/"),
    ("metallurgical and engineering",  "https://meconlimited.co.in/career.html"),
    ("bharat earth movers",            "https://bemlindia.in/Careers"),
    ("bharat electronics",             "https://bel-india.in/careers"),
    ("bharat heavy electricals",       "https://careers.bhel.in"),
    ("oil and natural gas",            "https://ongcindia.com/ongc5/eng/career.aspx"),
    ("oil india",                      "https://www.oil-india.com/OIL_New/Careers"),
    ("bharat petroleum",               "https://www.bharatpetroleum.in/career.aspx"),
    ("hindustan petroleum",            "https://hindustanpetroleum.com/careers"),
    ("coal india",                     "https://coalindia.in/en-us/career.aspx"),
    ("northern coalfields",            "https://nclcil.in/careers"),
    ("south eastern coalfields",       "https://secl-cil.in/"),
    ("mahanadi coalfields",            "https://mcl.gov.in/"),
    ("steel authority",                "https://sailcareers.com"),
    ("hindustan aeronautics",          "https://hal-india.co.in/Career.aspx"),
    ("ntpc green energy",              "https://ngel.in"),
    ("ntpc",                           "https://careers.ntpc.co.in"),
    ("gail",                           "https://gailonline.com/careers.html"),
    ("iffco",                          "https://iffco.in/career"),
    ("defence research",               "https://rac.gov.in"),
    ("isro",                           "https://www.isro.gov.in/Careers.html"),
    ("national informatics centre",    "https://www.nic.in/careers"),
    ("nic scientist",                  "https://examinationservices.nic.in"),
    ("central university of punjab",   "https://cup.ac.in/page/opportunities"),
    ("mizoram public service",         "https://mpsc.mizoram.gov.in"),
    ("employees state insurance",      "https://esic.in/recruitment.php"),
    ("employees provident fund",       "https://epfindia.gov.in/site_en/Careers.php"),
    ("unique identification",          "https://uidai.gov.in/en/careers.html"),
    ("national pension system",        "https://npstrust.org.in/"),
    ("centre for development of telematics", "https://www.cdot.in/cdotweb/web/current_openings.php?lang=en"),
    ("cochin shipyard",                "https://cochinshipyard.in"),
    ("central warehousing",            "https://www.cwceportal.com/careers"),
    ("life insurance corporation",     "https://licindia.in/home/careers"),
    # Medical / health
    ("all india institute of medical", "https://aiimsexams.ac.in"),
    ("aiims",                          "https://aiimsexams.ac.in"),
    ("employees state insurance",      "https://esic.gov.in"),
    # Additional PSUs / bodies
    ("uranium corporation",            "https://ucil.gov.in/careers"),
    ("ucil",                           "https://ucil.gov.in/careers"),
    ("electronics corporation of india","https://ecil.co.in"),
    ("ecil",                           "https://ecil.co.in"),
    ("rail india technical",           "https://rites.com/careers"),
    ("rites",                          "https://rites.com/careers"),
    ("sports authority of india",      "https://sportsauthorityofindia.nic.in"),
    ("national cadet corps",           "https://ncc.gov.in"),
    ("assam rifles",                   "https://assamrifles.gov.in"),
    # Sashastra Seema Bal — matched by org fragment "ssb" is too broad,
    # so also match by title keywords set in _enrich_apply_link
    ("sashastra seema bal",            "https://ssbrectt.gov.in"),
    ("ssb asi",                        "https://ssbrectt.gov.in"),
    ("ssb constable",                  "https://ssbrectt.gov.in"),
    ("ssb paramedical",                "https://ssbrectt.gov.in"),
    ("ssb head constable",             "https://ssbrectt.gov.in"),
    # Special Security Force (airports)
    ("special security force",         "https://aai.aero/en/careers"),
    ("ssf constable",                  "https://aai.aero/en/careers"),
]

# ── Category → default portal ────────────────────────────────────────────────────
# ONLY for categories that have a single dominant central portal.
# State-level orgs (STATE_PSC, state POLICE, etc.) vary too much — omitted
# intentionally so we fall back to the FJA article URL instead of a wrong site.
_CATEGORY_PORTALS: dict[JobCategory, str] = {
    JobCategory.SSC:     "https://ssc.gov.in",
    JobCategory.UPSC:    "https://upsc.gov.in",
    JobCategory.RAILWAY: "https://rrbapply.gov.in",
}


def _enrich_apply_link(
    org: str,
    title: str,
    category: JobCategory,
    apply_link: str,
    is_official: bool,
) -> tuple[str, bool]:
    """
    If we don't already have an official link from the page, try to find one via:
    1. Org name keyword match against _ORG_PORTAL_MAP
    2. Title keyword match (catches cases where org extraction was imperfect)
    3. Category default (only for SSC / UPSC / Railway — single dominant portal)
    Returns (apply_link, is_official_link).
    """
    if is_official:
        return apply_link, True

    search_text = (org + " " + title).lower()
    for keyword, portal in _ORG_PORTAL_MAP:
        if keyword in search_text:
            return portal, True

    portal = _CATEGORY_PORTALS.get(category)
    if portal:
        return portal, True

    # No confident match — keep the FJA article URL so the user at least
    # sees the job details page rather than a wrong official site.
    return apply_link, False


# ── Keyword → category mapping ──────────────────────────────────────────────────
_CATEGORY_RULES: list[tuple[list[str], JobCategory]] = [
    (["ssc", "staff selection"], JobCategory.SSC),
    (["upsc", "civil service", "ias ", "ips ", "ifs "], JobCategory.UPSC),
    (["railway", "rrb", "rrb ", "rrc ", "rail"], JobCategory.RAILWAY),
    (["bank", "rbi ", "nabard", "sidbi", "lic ", "sbi ", "ibps"], JobCategory.BANKING),
    (["psc", "state public service", "mpsc", "rpsc", "tnpsc", "kpsc", "uppsc", "bpsc", "jpsc"], JobCategory.STATE_PSC),
    (["army", "navy", "air force", "agniveer", "defence", "military", "crpf", "bsf", "cisf", "itbp", "ssb ", "nda"], JobCategory.DEFENCE),
    (["police", "constable", "sub inspector", " si ", "ssf "], JobCategory.POLICE),
    (["teacher", "teaching", "nvs ", "kvs ", "school", "college", "professor", "lecturer"], JobCategory.TEACHING),
]


def _detect_category(text: str) -> JobCategory:
    lower = text.lower()
    for keywords, category in _CATEGORY_RULES:
        if any(kw in lower for kw in keywords):
            return category
    return JobCategory.OTHER


def _make_content_hash(title: str, organisation: str, last_date: Optional[datetime]) -> str:
    raw = f"{title.strip().lower()}|{organisation.strip().lower()}|{last_date.isoformat() if last_date else ''}"
    return hashlib.sha256(raw.encode()).hexdigest()


# ── Date parsing ─────────────────────────────────────────────────────────────────
_DATE_FORMATS = [
    "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y",
    "%B %d, %Y", "%d %B %Y", "%d %b %Y", "%b %d, %Y",
]


def _parse_date(text: str) -> Optional[datetime]:
    text = re.sub(r"\s+", " ", text.strip())
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            pass
    # Try extracting first date-like substring
    match = re.search(r"\d{1,2}[/\-.]\d{1,2}[/\-.]\d{4}", text)
    if match:
        return _parse_date(match.group())
    match = re.search(r"\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}", text, re.I)
    if match:
        return _parse_date(match.group())
    return None


# ── Description cleaner ───────────────────────────────────────────────────────────
_DESC_JUNK_SUBSTRINGS = [
    "download", "whatsapp", "follow us", "google news", "play fun games",
    "join us", "add as a preferred source", "never miss", "get custom",
    "updated", "mobile app", "mobile app", "sarkari result", "advertisement",
    "also read", "freejobalert", "click here", "official website",
    "preferred source", "as preferred source", "subscribe",
    "facebook", "instagram", "youtube", "telegram channel",
]
# Month-date lines like "April 10, 2026 12:00 PM" or "by Abisha Muthukumar"
_DESC_JUNK_PREFIXES = (
    "by abisha", "by puja", "by divya", "by priya", "by kavitha",
    "by ", "january ", "february ", "march ", "april ", "may ", "june ",
    "july ", "august ", "september ", "october ", "november ", "december ",
)


def _clean_description(raw: str) -> str:
    """Strip FJA navigation/social junk lines, return clean job description."""
    lines = raw.split("\n")
    clean: list[str] = []
    for line in lines:
        line = line.strip()
        if not line or len(line) < 20:          # skip blank / fragment lines
            continue
        lower = line.lower()
        if any(phrase in lower for phrase in _DESC_JUNK_SUBSTRINGS):
            continue
        if lower.startswith(_DESC_JUNK_PREFIXES):
            continue
        clean.append(line)
    # Return first 800 chars of clean content
    return "\n".join(clean)[:800] or None


# ── Detail page parser ────────────────────────────────────────────────────────────
# Domains that are NOT official govt portals (we skip these)
_NON_OFFICIAL_DOMAINS = {
    "freejobalert.com", "sarkariresult.com", "rojgarresult.com",
    "indgovtjobs.in", "sarkarijobfind.com", "naukri.com",
    "shine.com", "indeed.com", "monsterindia.com", "timesjobs.com",
    "freshersworld.com", "careerpower.in", "adda247.com",
    "testbook.com", "gradeup.co", "oliveboard.in",
}


def _is_official_url(url: str) -> bool:
    """Return True if the URL looks like an official govt/bank/org portal."""
    if not url or not url.startswith("http"):
        return False
    domain = urlparse(url).netloc.lower().lstrip("www.")
    return not any(bad in domain for bad in _NON_OFFICIAL_DOMAINS)


def _extract_job_details(url: str) -> dict:
    """Fetch a FreeJobAlert article page and extract structured fields."""
    result = {
        "total_posts": None,
        "last_date": None,
        "qualification": None,
        "age_limit": None,
        "salary": None,
        "description": None,
        "apply_link": url,          # fallback: FJA article URL
        "is_official_link": False,
        "notification_pdf": None,
        "organisation_hint": None,   # extracted from first table cell
    }
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
    except Exception as exc:
        logger.warning("Could not fetch detail page %s: %s", url, exc)
        return result

    soup = BeautifulSoup(r.text, "lxml")
    article = soup.find("article") or soup.find("div", class_="entry-content")
    if not article:
        return result

    full_text = article.get_text(separator="\n", strip=True)
    result["description"] = _clean_description(full_text)

    # ── Organisation hint extraction ─────────────────────────────────────────
    # Strategy 1: look for label-value rows like "Conducting Body | OSSSC"
    _ORG_LABELS = {
        "conducting body", "name of organisation", "organisation name",
        "name of organization", "organization name", "name of the organisation",
        "name of the organization", "recruiting body", "board name",
        "authority name", "recruiting organisation", "advertised by",
        "name of organization/board", "name of board",
    }
    _HINT_JUNK = {
        "document", "download", "particulars", "details", "important",
        "notification", "link", "pdf", "official", "sr", "s.no", "sno",
        "description", "information", "category", "post", "name",
        "conducting", "total", "vacancy", "vacancies", "qualification",
        "sl", "no.", "serial", "position", "designation",
    }
    tables = article.find_all("table")
    # Pass 1: look for explicit "Conducting Body | <Name>" rows
    for table in tables:
        if result["organisation_hint"]:
            break
        for row in table.find_all("tr"):
            cells = [td.get_text(" ", strip=True) for td in row.find_all(["td", "th"])]
            if len(cells) < 2:
                continue
            label = cells[0].lower().strip().rstrip(":")
            if any(lbl in label for lbl in _ORG_LABELS):
                val = cells[1].strip()
                if val and 3 < len(val) < 200:
                    result["organisation_hint"] = val[:150]
                    break

    # Pass 2: fallback — first cell that looks like an org name
    if not result["organisation_hint"]:
        for table in tables:
            first_cell = table.find(["td", "th"])
            if not first_cell:
                continue
            cell_text = first_cell.get_text(" ", strip=True)
            first_word = cell_text.split()[0].lower().rstrip(".,") if cell_text else ""
            if first_word in _HINT_JUNK:
                continue
            # Cell looks like "Rashtriya Chemicals (RCFL) Advt No ..."
            org_match = re.match(
                r"^([A-Za-z][A-Za-z0-9\s()\-/&,.']{5,80}?)(?:\s+(?:Advt|No\.|Notification|Recruitment|Vacancy|\d))",
                cell_text,
            )
            if org_match:
                result["organisation_hint"] = org_match.group(1).strip()[:150]
            elif len(cell_text) < 120 and cell_text and cell_text[0].isupper():
                result["organisation_hint"] = cell_text.split("\n")[0][:120]
            if result["organisation_hint"]:
                break

    # Parse all tables
    for table in tables:
        rows = table.find_all("tr")
        for row in rows:
            cells = [td.get_text(" ", strip=True) for td in row.find_all(["td", "th"])]
            row_text = " ".join(cells).lower()

            # Last date
            if result["last_date"] is None and any(
                kw in row_text for kw in ["last date", "closing date", "end date", "apply online last"]
            ):
                # grab cell with a date value
                for cell in cells:
                    d = _parse_date(cell)
                    if d:
                        result["last_date"] = d
                        break

            # Total posts / vacancies
            if result["total_posts"] is None and any(
                kw in row_text for kw in ["total post", "total vacancy", "total vacancies", "no. of post", "number of post"]
            ):
                for cell in cells:
                    nums = re.findall(r"[\d,]+", cell.replace(",", ""))
                    if nums:
                        try:
                            result["total_posts"] = int(nums[0])
                            break
                        except ValueError:
                            pass

            # Qualification
            if result["qualification"] is None and any(
                kw in row_text for kw in ["qualification", "eligibility", "educational"]
            ):
                # Use the second cell (value cell)
                if len(cells) >= 2:
                    result["qualification"] = cells[-1][:200]

            # Age limit
            if result["age_limit"] is None and "age limit" in row_text:
                if len(cells) >= 2:
                    result["age_limit"] = cells[-1][:200]

            # Salary / pay
            if result["salary"] is None and any(kw in row_text for kw in ["salary", "pay scale", "pay band", "ctc", "stipend"]):
                if len(cells) >= 2:
                    result["salary"] = cells[-1][:200]

    # ── Important Links table (class="scrollable-table") ──────────────────────
    # FJA always has a single "Important Links" table at the bottom with rows:
    #   Apply Online  | <a href="https://ssc.gov.in/...">Click Here</a>
    #   Notification  | <a href="...pdf">Click here</a>
    #   Official Website | <a href="https://ssc.gov.in">Click here</a>
    #
    # Strategy: find the scrollable-table first; if not present, fall back to
    # scanning all tables for rows matching apply/notification labels.
    imp_table = article.find("table", class_="scrollable-table")
    candidate_tables = [imp_table] if imp_table else tables

    official_website_fallback: Optional[str] = None

    for table in candidate_tables:
        if table is None:
            continue
        for row in table.find_all("tr"):
            cells = row.find_all(["td", "th"])
            if len(cells) < 2:
                continue
            label = cells[0].get_text(" ", strip=True).lower().strip().rstrip(":")
            # Grab the first non-empty href from the last cell
            link_href: Optional[str] = None
            for a in cells[-1].find_all("a", href=True):
                href = a["href"].strip()
                if href and href.startswith("http"):
                    link_href = href
                    break

            if label == "apply online":
                if link_href and _is_official_url(link_href):
                    result["apply_link"] = link_href
                    result["is_official_link"] = True

            elif label in ("notification", "download notification", "official notification"):
                if link_href:
                    result["notification_pdf"] = link_href

            elif label == "official website":
                if link_href and _is_official_url(link_href):
                    official_website_fallback = link_href

    # If Apply Online was empty/unofficial, use Official Website as fallback
    if not result["is_official_link"] and official_website_fallback:
        result["apply_link"] = official_website_fallback
        result["is_official_link"] = True

    # Last-resort PDF: scan all links for a .pdf href
    if not result["notification_pdf"]:
        for a in article.find_all("a", href=True):
            href = a["href"].strip()
            if href.lower().endswith(".pdf"):
                result["notification_pdf"] = href
                break

    # Fallback: extract last date from text
    if result["last_date"] is None:
        for line in full_text.split("\n"):
            if any(kw in line.lower() for kw in ["last date", "closing date"]):
                d = _parse_date(line)
                if d:
                    result["last_date"] = d
                    break

    # Fallback total posts from title/text
    if result["total_posts"] is None:
        match = re.search(r"([\d,]+)\s*(?:posts?|vacancies|vacancy)", full_text[:500], re.I)
        if match:
            try:
                result["total_posts"] = int(match.group(1).replace(",", ""))
            except ValueError:
                pass

    return result


# ── Organisation extraction ───────────────────────────────────────────────────────
# Words that appear at the top of article pages but are NOT organisation names
_JUNK_FIRST_WORDS = {
    "download", "join", "mobile", "app", "get", "free", "job", "alert",
    "home", "latest", "new", "all", "click", "apply", "online", "form",
    "official", "notification", "recruitment", "jobs", "result", "admit",
    "events", "event", "news", "update", "check", "visit", "here",
    "whatsapp", "telegram", "youtube", "follow", "subscribe",
}

_ORG_PATTERNS = [
    # Explicit known orgs in title
    (r"(Staff Selection Commission)", "Staff Selection Commission (SSC)"),
    (r"\bSSC\b", "Staff Selection Commission (SSC)"),
    (r"(Union Public Service Commission)", "Union Public Service Commission (UPSC)"),
    (r"\bUPSC\b", "Union Public Service Commission (UPSC)"),
    (r"(Railway Recruitment Board[s]?|RRB\b)", "Railway Recruitment Board (RRB)"),
    (r"(Indian Railway[s]?)", "Indian Railways"),
    (r"(Indian Navy)", "Indian Navy"),
    (r"(Indian Army)", "Indian Army"),
    (r"(Indian Air Force|IAF\b)", "Indian Air Force"),
    (r"(Central Reserve Police Force|CRPF\b)", "CRPF"),
    (r"\b(BSF)\b", "Border Security Force (BSF)"),
    (r"\b(CISF)\b", "Central Industrial Security Force (CISF)"),
    (r"\b(ITBP)\b", "Indo-Tibetan Border Police (ITBP)"),
    (r"\b(NIC)\b", "National Informatics Centre (NIC)"),
    (r"\b(NPCIL)\b", "NPCIL"),
    (r"\b(ECIL)\b", "ECIL"),
    (r"\b(RCFL)\b", "RCFL"),
    (r"\b(NCL)\b", "Northern Coalfields Ltd (NCL)"),
    (r"\b(SECL)\b", "SECL"),
    (r"\b(IFFCO)\b", "IFFCO"),
    (r"\b(IRCTC)\b", "IRCTC"),
    (r"\b(MECON)\b", "MECON"),
    (r"\b(IRFC)\b", "IRFC"),
    (r"\b(C-DOT)\b", "C-DOT"),
    (r"\b(NGEL|NTPC Green Energy)\b", "NTPC Green Energy (NGEL)"),
    # Generic: "ORG N posts/vacancies" in title — e.g. "RBI Grade B 294 Posts"
]


def _extract_organisation(title: str, description: str = "", hint: str = "") -> str:
    # 0. Highest priority: organisation_hint from first table cell on detail page
    if hint:
        hint_lower = hint.lower()
        # Reject if hint starts with any junk word (handles "DownloadMobile" concatenations too)
        if not any(hint_lower.startswith(jw) for jw in _JUNK_FIRST_WORDS):
            return hint[:150]

    # 1. Try explicit org patterns from title
    for pat, label in _ORG_PATTERNS:
        if re.search(pat, title, re.I):
            return label

    # 2. Fallback: strip trailing action words from title
    # "Punjab and Sind Bank 1000 LBO Online Form 2026" → "Punjab and Sind Bank"
    m = re.match(
        r"^((?:[A-Z][A-Za-z&()\-/\s]{3,60}?))\s+"
        r"(?:\d[\d,]*\s+|Online Form|Offline Form|Recruitment|Vacancy|Notification|Exam|Result|Admit)",
        title
    )
    if m:
        org = m.group(1).strip()
        if org.lower() not in _JUNK_FIRST_WORDS:
            return org[:150]

    # 3. Last resort: first 3 words of title
    words = title.split()
    return " ".join(words[:3])[:100]


# ── DB upsert ─────────────────────────────────────────────────────────────────────
_JUNK_ORG_PREFIXES = {
    "download", "mobile", "app", "events", "event", "whatsapp", "telegram",
    "join", "click", "follow", "subscribe", "news", "update",
}
_JUNK_ORG_EXACT = {
    "company name", "company", "discipline", "organization", "organisation",
    "name", "post name", "board", "authority", "department", "ministry",
}


def _upsert_job(db: Session, data: dict) -> Optional[Job]:
    """Insert job if not exists. Returns inserted Job or None if skipped."""
    # Skip junk entries
    org_lower = data["organisation"].lower().strip().rstrip(".,")
    org_first = org_lower.split()[0].rstrip(".,") if org_lower else ""
    if (any(org_lower.startswith(jw) for jw in _JUNK_ORG_PREFIXES)
            or org_lower in _JUNK_ORG_EXACT):
        logger.debug("Skipping junk org '%s': %s", data["organisation"][:40], data["title"][:60])
        return None
    existing = db.query(Job).filter(Job.content_hash == data["content_hash"]).first()
    if existing:
        logger.debug("Skipping duplicate: %s", data["title"][:60])
        return None
    job = Job(**data)
    db.add(job)
    db.commit()
    db.refresh(job)
    logger.info("Inserted: %s", data["title"][:80])
    return job


# ── Homepage scraper ──────────────────────────────────────────────────────────────
def _get_homepage_job_links() -> list[tuple[str, str]]:
    """Return list of (title, url) from the FreeJobAlert homepage."""
    try:
        r = requests.get(HOME_URL, headers=HEADERS, timeout=20)
        r.raise_for_status()
    except Exception as exc:
        logger.error("Failed to fetch FreeJobAlert homepage: %s", exc)
        return []

    soup = BeautifulSoup(r.text, "lxml")
    links = []

    # Section 1: hpgjbcont divs (Govt Jobs, Latest, etc.)
    for div in soup.find_all("div", class_="hpgjbcont"):
        for a in div.find_all("a", href=True):
            title = a.get_text(strip=True)
            href = a["href"]
            if len(title) > 15 and "/articles/" in href:
                links.append((title, href))

    # Section 2: entry-content tables (tickertape)
    for table in soup.select(".entry-content table"):
        for a in table.find_all("a", href=True):
            title = a.get_text(strip=True)
            href = a["href"]
            if len(title) > 15 and "/articles/" in href:
                links.append((title, href))

    # Deduplicate by URL
    seen = set()
    unique = []
    for title, url in links:
        if url not in seen:
            seen.add(url)
            unique.append((title, url))

    logger.info("Found %d job links on homepage", len(unique))
    return unique


# ── Extra source pages for upcoming / active jobs ──────────────────────────────
_EXTRA_PAGES = [
    "https://www.freejobalert.com/government-jobs/",
    "https://www.freejobalert.com/government-jobs/page/2/",
    "https://www.freejobalert.com/government-jobs/page/3/",
    "https://www.freejobalert.com/bank-jobs/",
    "https://www.freejobalert.com/bank-jobs/page/2/",
    "https://www.freejobalert.com/railway-jobs/",
    "https://www.freejobalert.com/railway-jobs/page/2/",
    "https://www.freejobalert.com/police-defence-jobs/",
    "https://www.freejobalert.com/police-defence-jobs/page/2/",
    "https://www.freejobalert.com/teaching-faculty-jobs/",
    "https://www.freejobalert.com/teaching-faculty-jobs/page/2/",
    "https://www.freejobalert.com/state-government-jobs/",
    "https://www.freejobalert.com/state-government-jobs/page/2/",
]


def _get_category_page_links(page_url: str) -> list[tuple[str, str]]:
    """Scrape a FreeJobAlert category/listing page for job article links."""
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
            if len(title) > 15 and "/articles/" in href:
                links.append((title, href))
    for a in soup.select("h2.entry-title a, h3.entry-title a, .post-title a"):
        title = a.get_text(strip=True)
        href = a.get("href", "")
        if len(title) > 15 and "/articles/" in href:
            links.append((title, href))
    seen: set[str] = set()
    unique = [(t, u) for t, u in links if not (u in seen or seen.add(u))]  # type: ignore[func-returns-value]
    return unique


def scrape_ssc(max_jobs: int = 50) -> int:
    """
    Main entry point: scrape FreeJobAlert for all central govt job listings,
    save to DB, return count of new rows inserted.
    """
    links = _get_homepage_job_links()
    # Also pull from category pages to get more upcoming/active jobs
    for page_url in _EXTRA_PAGES:
        links.extend(_get_category_page_links(page_url))
    # Deduplicate by URL
    seen: set[str] = set()
    links = [(t, u) for t, u in links if not (u in seen or seen.add(u))]  # type: ignore[func-returns-value]

    if not links:
        logger.warning("No job links found — skipping.")
        return 0

    db = SessionLocal()
    inserted = 0
    new_jobs: list[Job] = []
    try:
        for title, url in links[:max_jobs]:
            try:
                details = _extract_job_details(url)
                org = _extract_organisation(
                    title,
                    details.get("description") or "",
                    hint=details.get("organisation_hint") or "",
                )
                category = _detect_category(title + " " + org)
                content_hash = _make_content_hash(title, org, details.get("last_date"))

                apply_link, is_official = _enrich_apply_link(
                    org,
                    title,
                    category,
                    details.get("apply_link") or url,
                    details.get("is_official_link", False),
                )

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
                    "apply_link": apply_link,
                    "is_official_link": is_official,
                    "notification_pdf": details.get("notification_pdf"),
                    "last_date": details.get("last_date"),
                    "source_url": url,
                    "source": "freejobalert.com",
                }

                job = _upsert_job(db, data)
                if job is not None:
                    inserted += 1
                    new_jobs.append(job)

            except Exception as exc:
                logger.warning("Error processing job %s: %s", url[:60], exc)
                db.rollback()

    finally:
        db.close()

    logger.info("SSC scraper done. Inserted %d / %d jobs.", inserted, len(links[:max_jobs]))

    # Send push notifications for newly inserted jobs (import here to avoid circular imports)
    if new_jobs:
        from .notify import notify_new_jobs
        notify_new_jobs(new_jobs)

    return inserted


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    count = scrape_ssc(max_jobs=150)
    print(f"Inserted {count} new jobs.")
