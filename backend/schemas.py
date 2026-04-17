from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr

from .models import JobCategory, JobStatus


# ── Job schemas ────────────────────────────────────────────────────────────────

class JobBase(BaseModel):
    title: str
    organisation: str
    category: JobCategory
    status: JobStatus = JobStatus.ACTIVE
    total_posts: Optional[int] = None
    description: Optional[str] = None
    qualification: Optional[str] = None
    age_limit: Optional[str] = None
    salary: Optional[str] = None
    location: Optional[str] = None
    states: Optional[List[str]] = None
    apply_link: Optional[str] = None
    notification_pdf: Optional[str] = None
    last_date: Optional[datetime] = None
    source_url: Optional[str] = None
    source: Optional[str] = None
    content_type: Optional[str] = "job"


class JobCreate(JobBase):
    pass


class JobOut(JobBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class JobListOut(BaseModel):
    total: int
    page: int
    per_page: int
    items: List[JobOut]


# ── User / Auth schemas ────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Profile schemas ────────────────────────────────────────────────────────────

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    qualification: Optional[str] = None
    state: Optional[str] = None
    preferred_categories: Optional[List[str]] = None
    dob: Optional[datetime] = None


class ProfileOut(BaseModel):
    id: int
    user_id: int
    name: Optional[str]
    qualification: Optional[str]
    state: Optional[str]
    preferred_categories: Optional[List[str]]
    dob: Optional[datetime]
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Saved jobs ─────────────────────────────────────────────────────────────────

class SavedJobOut(BaseModel):
    id: int
    job: JobOut
    saved_at: datetime

    model_config = {"from_attributes": True}


# ── Notifications ──────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: int
    job_id: Optional[int]
    title: str
    body: Optional[str]
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
