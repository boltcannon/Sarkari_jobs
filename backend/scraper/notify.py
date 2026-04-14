"""
Send Expo push notifications to subscribers when new jobs are inserted.
"""
import logging
from typing import List

import requests
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import Job, PushSubscription

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def notify_new_jobs(new_jobs: List[Job]) -> None:
    """
    For each newly inserted job, find subscribers whose categories include
    this job's category and send them an Expo push notification.
    """
    if not new_jobs:
        return

    db: Session = SessionLocal()
    try:
        for job in new_jobs:
            cat_value = job.category if isinstance(job.category, str) else job.category.value

            # Find tokens subscribed to this category
            subs = db.query(PushSubscription).filter(
                PushSubscription.categories.contains([cat_value])
            ).all()

            if not subs:
                continue

            tokens = [s.expo_token for s in subs]

            # Build notification body
            parts = [job.organisation]
            if job.total_posts:
                parts.append(f"{job.total_posts:,} posts")
            if job.last_date:
                parts.append(f"Last date: {job.last_date.strftime('%d %b %Y')}")
            body = " · ".join(parts)

            _send_batch(
                tokens=tokens,
                title=f"New {cat_value} Job 🏛️",
                body=f"{job.title[:80]}\n{body}",
                data={"jobId": job.id, "category": cat_value},
            )
            logger.info(
                "Sent push for job %d (%s) to %d device(s)", job.id, cat_value, len(tokens)
            )
    except Exception as exc:
        logger.warning("notify_new_jobs error: %s", exc)
    finally:
        db.close()


def _send_batch(tokens: List[str], title: str, body: str, data: dict) -> None:
    """Send up to 100 messages per Expo push request."""
    messages = [
        {
            "to": token,
            "title": title,
            "body": body,
            "data": data,
            "sound": "default",
            "priority": "high",
            "channelId": "jobs",
        }
        for token in tokens
    ]
    for i in range(0, len(messages), 100):
        chunk = messages[i : i + 100]
        try:
            resp = requests.post(
                EXPO_PUSH_URL,
                json=chunk,
                headers={"Accept": "application/json", "Accept-Encoding": "gzip, deflate"},
                timeout=10,
            )
            logger.info("Expo push API: %d messages, HTTP %d", len(chunk), resp.status_code)
        except Exception as exc:
            logger.warning("Expo push failed: %s", exc)
