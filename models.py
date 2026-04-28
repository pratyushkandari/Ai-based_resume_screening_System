# backend/app/models.py

from datetime import datetime
from sqlalchemy import (
    Column, Integer, Text, Float, ForeignKey, DateTime, UniqueConstraint, String
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from .db import Base

# =============================================================================
#  Candidate TABLE
# =============================================================================
class Candidate(Base):
    __tablename__ = "candidates"

    candidate_id = Column(Integer, primary_key=True, index=True)
    full_name = Column(Text)
    email = Column(Text, unique=True)
    phone = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    resumes = relationship(
        "Resume",
        back_populates="candidate",
        cascade="all, delete-orphan"
    )


# =============================================================================
#  Resume TABLE
# =============================================================================
class Resume(Base):
    __tablename__ = "resumes"

    resume_id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.candidate_id", ondelete="CASCADE"))
    job_id = Column(Integer, ForeignKey("jobs.job_id", ondelete="SET NULL"), nullable=True)

    filename = Column(Text)
    upload_path = Column(Text)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    raw_text = Column(Text)
    parsed_json = Column(JSONB)
    embedding = Column(JSONB)

    candidate = relationship("Candidate", back_populates="resumes")
    resume_skills = relationship(
        "ResumeSkill",
        back_populates="resume",
        cascade="all, delete-orphan"
    )
    rankings = relationship(
        "Ranking",
        back_populates="resume",
        cascade="all, delete-orphan"
    )


# =============================================================================
#  Skill TABLE
# =============================================================================
class Skill(Base):
    __tablename__ = "skills"

    skill_id = Column(Integer, primary_key=True, index=True)
    skill_name = Column(Text, unique=True, nullable=False)
    canonical_name = Column(Text)

    resume_links = relationship(
        "ResumeSkill",
        back_populates="skill",
        cascade="all, delete-orphan"
    )
    job_links = relationship(
        "JobSkill",
        back_populates="skill",
        cascade="all, delete-orphan"
    )


# =============================================================================
#  ResumeSkill TABLE
# =============================================================================
class ResumeSkill(Base):
    __tablename__ = "resume_skills"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.resume_id", ondelete="CASCADE"))
    skill_id = Column(Integer, ForeignKey("skills.skill_id", ondelete="CASCADE"))
    confidence = Column(Float)

    resume = relationship("Resume", back_populates="resume_skills")
    skill = relationship("Skill", back_populates="resume_links")


# =============================================================================
#  Job TABLE  ✅ FIXED (SINGLE USER SYSTEM)
# =============================================================================
class Job(Base):
    __tablename__ = "jobs"

    job_id = Column(Integer, primary_key=True, index=True)

    # ✅ FIX: replaced hr_id with created_by
    created_by = Column(Integer, ForeignKey("users.user_id"))

    title = Column(Text, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    embedding = Column(JSONB)

    # ✅ FIX: relation updated to User
    user = relationship("User")

    job_skills = relationship(
        "JobSkill",
        back_populates="job",
        cascade="all, delete-orphan"
    )
    rankings = relationship(
        "Ranking",
        back_populates="job",
        cascade="all, delete-orphan"
    )


# =============================================================================
#  JobSkill TABLE
# =============================================================================
class JobSkill(Base):
    __tablename__ = "job_skills"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.job_id", ondelete="CASCADE"))
    skill_id = Column(Integer, ForeignKey("skills.skill_id", ondelete="CASCADE"))
    required_level = Column(Integer, default=1)

    job = relationship("Job", back_populates="job_skills")
    skill = relationship("Skill", back_populates="job_links")


# =============================================================================
#  Ranking TABLE
# =============================================================================
class Ranking(Base):
    __tablename__ = "rankings"

    ranking_id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.job_id", ondelete="CASCADE"))
    resume_id = Column(Integer, ForeignKey("resumes.resume_id", ondelete="CASCADE"))

    score = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    # ✅ Shortlisting status (AUTO)
    status = Column(String, default="pending")

    job = relationship("Job", back_populates="rankings")
    resume = relationship("Resume", back_populates="rankings")

    __table_args__ = (
        UniqueConstraint("job_id", "resume_id", name="uix_job_resume"),
    )


# =============================================================================
#  USER TABLE (SINGLE SOURCE OF TRUTH)
# =============================================================================
class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True)
    name = Column(String)
    email = Column(String, unique=True)
    password = Column(String)   # hashed password
    role = Column(String)       # "hr" / "candidate"
