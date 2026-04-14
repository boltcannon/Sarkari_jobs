from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean,
    ForeignKey, Enum, ARRAY
)
from sqlalchemy.orm import relationship
import enum

from .database import Base


class JobCategory(str, enum.Enum):
    SSC = "SSC"
    UPSC = "UPSC"
    RAILWAY = "Railway"
    BANKING = "Banking"
    STATE_PSC = "State PSC"
    DEFENCE = "Defence"
    POLICE = "Police"
    TEACHING = "Teaching"
    OTHER = "Other"


class JobStatus(str, enum.Enum):
    ACTIVE = "active"
    CLOSED = "closed"
    UPCOMING = "upcoming"


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    organisation = Column(String(300), nullable=False)
    category = Column(Enum(JobCategory), nullable=False, index=True)
    status = Column(Enum(JobStatus), default=JobStatus.ACTIVE, index=True)
    content_hash = Column(String(64), unique=True, nullable=True, index=True)
    total_posts = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    qualification = Column(String(500), nullable=True)
    age_limit = Column(String(200), nullable=True)
    salary = Column(String(200), nullable=True)
    location = Column(String(200), nullable=True)
    states = Column(ARRAY(String), nullable=True)
    apply_link = Column(String(1000), nullable=True)
    is_official_link = Column(Boolean, default=False, nullable=False, server_default="false")
    notification_pdf = Column(String(1000), nullable=True)
    last_date = Column(DateTime, nullable=True)
    source_url = Column(String(1000), nullable=True)
    source = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    saved_by = relationship("SavedJob", back_populates="job", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    saved_jobs = relationship("SavedJob", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    name = Column(String(200), nullable=True)
    qualification = Column(String(200), nullable=True)
    state = Column(String(100), nullable=True)
    preferred_categories = Column(ARRAY(String), nullable=True, default=[])
    dob = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="profile")


class SavedJob(Base):
    __tablename__ = "saved_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"))
    saved_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="saved_jobs")
    job = relationship("Job", back_populates="saved_by")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(500), nullable=False)
    body = Column(Text, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    expo_token = Column(String(300), unique=True, nullable=False, index=True)
    categories = Column(ARRAY(String), nullable=False, server_default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
