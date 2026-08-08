import datetime
import uuid

from sqlalchemy import Column, String, Float, DateTime, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from .database import Base


def gen_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="citizen", index=True)  # "citizen" | "government"
    department = Column(String, nullable=True)  # government users only, e.g. "Electricity Department"
    phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    complaints = relationship("Complaint", back_populates="citizen")


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String, primary_key=True, default=lambda: gen_id("CW"))
    citizen_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    description = Column(String, nullable=False)
    original_text = Column(String, nullable=True)  # raw voice/typed transcript before parsing
    language = Column(String, default="en")

    category = Column(String, index=True)
    department = Column(String, index=True)
    priority = Column(String, default="medium")  # low, medium, high, critical

    area = Column(String, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    status = Column(String, default="submitted", index=True)  # submitted, in_progress, resolved, escalated
    escalation_level = Column(Integer, default=0)

    reporter_name = Column(String, nullable=True)
    reporter_contact = Column(String, nullable=True)
    photo_data_url = Column(String, nullable=True)  # base64 data url, demo only

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    citizen = relationship("User", back_populates="complaints")
    logs = relationship("StatusLog", back_populates="complaint", cascade="all, delete-orphan")


class StatusLog(Base):
    __tablename__ = "status_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    complaint_id = Column(String, ForeignKey("complaints.id"))
    status = Column(String)
    note = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    complaint = relationship("Complaint", back_populates="logs")


class EligibilityCheck(Base):
    """Stores a snapshot of every eligibility check run, purely for the dashboard's
    'scheme adoption / interest' analytics."""
    __tablename__ = "eligibility_checks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scheme_id = Column(String, index=True)
    scheme_name = Column(String)
    matched = Column(Boolean, default=False)
    state = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
