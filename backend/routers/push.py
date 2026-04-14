from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PushSubscription

router = APIRouter(prefix="/api/push", tags=["push"])


class RegisterRequest(BaseModel):
    token: str
    categories: List[str] = []


@router.post("/register")
def register_push_token(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register or update an Expo push token with category preferences."""
    sub = db.query(PushSubscription).filter(
        PushSubscription.expo_token == req.token
    ).first()
    if sub:
        sub.categories = req.categories
        sub.updated_at = datetime.utcnow()
    else:
        sub = PushSubscription(expo_token=req.token, categories=req.categories)
        db.add(sub)
    db.commit()
    return {"status": "ok", "token": req.token[:20] + "..."}


@router.delete("/register")
def unregister_push_token(token: str, db: Session = Depends(get_db)):
    """Remove a push token (user disabled notifications)."""
    db.query(PushSubscription).filter(
        PushSubscription.expo_token == token
    ).delete()
    db.commit()
    return {"status": "ok"}
