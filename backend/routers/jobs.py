from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, asc, desc, func

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("", response_model=schemas.JobListOut)
def list_jobs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    status: Optional[str] = None,
    state: Optional[str] = None,
    q: Optional[str] = None,
    categories: Optional[str] = None,
    include_closed: bool = Query(False),
    sort: str = Query("newest"),
    db: Session = Depends(get_db),
):
    query = db.query(models.Job)

    if not include_closed:
        now = datetime.utcnow()
        query = query.filter(
            or_(models.Job.last_date == None, models.Job.last_date >= now)
        )
    if categories:
        raw = [c.strip() for c in categories.split(",") if c.strip()]
        # Normalize to exact enum values (case-insensitive match)
        enum_map = {e.value.lower(): e.value for e in models.JobCategory}
        cat_list = [enum_map.get(c.lower(), c) for c in raw]
        if cat_list:
            query = query.filter(models.Job.category.in_(cat_list))
    elif category:
        enum_map = {e.value.lower(): e.value for e in models.JobCategory}
        category = enum_map.get(category.lower(), category)
        query = query.filter(models.Job.category == category)
    if status:
        query = query.filter(models.Job.status == status)
    if state:
        query = query.filter(models.Job.states.any(state))
    if q:
        search = f"%{q}%"
        query = query.filter(
            or_(
                models.Job.title.ilike(search),
                models.Job.organisation.ilike(search),
                models.Job.description.ilike(search),
            )
        )

    total = query.count()

    if sort == "deadline":
        order = models.Job.last_date.asc().nullslast()
    elif sort == "posts":
        order = models.Job.total_posts.desc().nullslast()
    else:
        order = models.Job.created_at.desc()

    items = (
        query.order_by(order)
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return {"total": total, "page": page, "per_page": per_page, "items": items}


@router.get("/feed", response_model=schemas.JobListOut)
def personalized_feed(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    profile = current_user.profile
    query = db.query(models.Job)

    if profile and profile.preferred_categories:
        query = query.filter(models.Job.category.in_(profile.preferred_categories))
    if profile and profile.state:
        query = query.filter(
            or_(models.Job.states.any(profile.state), models.Job.states == None)
        )

    total = query.count()
    items = (
        query.order_by(models.Job.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return {"total": total, "page": page, "per_page": per_page, "items": items}


@router.get("/{job_id}", response_model=schemas.JobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/save", status_code=201)
def save_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = (
        db.query(models.SavedJob)
        .filter(and_(models.SavedJob.user_id == current_user.id, models.SavedJob.job_id == job_id))
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Already saved")

    db.add(models.SavedJob(user_id=current_user.id, job_id=job_id))
    db.commit()
    return {"message": "Job saved"}


@router.delete("/{job_id}/save", status_code=200)
def unsave_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    saved = (
        db.query(models.SavedJob)
        .filter(and_(models.SavedJob.user_id == current_user.id, models.SavedJob.job_id == job_id))
        .first()
    )
    if not saved:
        raise HTTPException(status_code=404, detail="Not saved")

    db.delete(saved)
    db.commit()
    return {"message": "Removed from saved"}


@router.get("/categories/list")
def list_categories():
    return [c.value for c in models.JobCategory]
