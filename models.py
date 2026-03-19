# backend/app/models.py
from datetime import datetime
from sqlalchemy import (
    Column, Integer, Text, Float, ForeignKey, DateTime, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from .db import Base

# -----------------------------------------------------------------------------
#  PURPOSE OF THIS FILE:
# -----------------------------------------------------------------------------
# This file defines the **database schema** using SQLAlchemy ORM (Object-Relational Mapping).
# Each Python class = one database table.
#
# ORM allows us to interact with the database using Python objects instead of raw SQL.
# Example:
#     candidate = Candidate(full_name="John Doe")
#     db.add(candidate)
#     db.commit()
#
# SQLAlchemy then automatically converts that into an `INSERT INTO candidates (...)` query.
# -----------------------------------------------------------------------------

# =============================================================================
#  HRUser TABLE
# =============================================================================
class HRUser(Base):
    """
    Table: hr_users
    Purpose: Stores HR (admin) user accounts who can create jobs and manage resumes.
    """
    __tablename__ = "hr_users"

    # Primary key column (unique identifier for each HR)
    hr_id = Column(Integer, primary_key=True, index=True)

    # Basic information
    name = Column(Text, nullable=False)
    email = Column(Text, nullable=False, unique=True)  # unique ensures one HR per email
    password_hash = Column(Text, nullable=False)       # store hashed password, not plain text
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    # One HR can create multiple Jobs → 1-to-many relationship
    jobs = relationship("Job", back_populates="hr")


# =============================================================================
#  Candidate TABLE
# =============================================================================
class Candidate(Base):
    """
    Table: candidates
    Purpose: Stores personal information of candidates whose resumes are uploaded.
    """
    __tablename__ = "candidates"

    candidate_id = Column(Integer, primary_key=True, index=True)
    full_name = Column(Text)
    email = Column(Text, unique=True)   # helps identify duplicates
    phone = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    # One candidate can have many resumes uploaded (1-to-many)
    resumes = relationship("Resume", back_populates="candidate", cascade="all, delete-orphan")


# =============================================================================
#  Resume TABLE
# =============================================================================
class Resume(Base):
    """
    Table: resumes
    Purpose: Stores uploaded resumes and their extracted metadata.
    """
    __tablename__ = "resumes"

    resume_id = Column(Integer, primary_key=True, index=True)

    # Candidate who owns this resume (linked by candidate_id foreign key)
    candidate_id = Column(Integer, ForeignKey("candidates.candidate_id", ondelete="CASCADE"))

    # Optional: Job this resume was submitted for
    job_id = Column(Integer, ForeignKey("jobs.job_id", ondelete="SET NULL"), nullable=True)

    # File details
    filename = Column(Text)
    upload_path = Column(Text)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Extracted information from resume file
    raw_text = Column(Text)       # full plain text extracted
    parsed_json = Column(JSONB)   # structured data (name, email, skills, etc.)
    embedding = Column(JSONB)     # numeric vector for ML similarity comparison

    # ORM Relationships:
    candidate = relationship("Candidate", back_populates="resumes")
    resume_skills = relationship("ResumeSkill", back_populates="resume", cascade="all, delete-orphan")
    rankings = relationship("Ranking", back_populates="resume", cascade="all, delete-orphan")


# =============================================================================
#  Skill TABLE
# =============================================================================
class Skill(Base):
    """
    Table: skills
    Purpose: Stores every distinct skill in the system (e.g., "python", "java").
    """
    __tablename__ = "skills"

    skill_id = Column(Integer, primary_key=True, index=True)
    skill_name = Column(Text, unique=True, nullable=False)  # ensure each skill appears only once
    canonical_name = Column(Text)  # optional, for standardized naming

    # Relationships:
    resume_links = relationship("ResumeSkill", back_populates="skill", cascade="all, delete-orphan")
    job_links = relationship("JobSkill", back_populates="skill", cascade="all, delete-orphan")


# =============================================================================
#  ResumeSkill TABLE (Link Table: Resume ↔ Skill)
# =============================================================================
class ResumeSkill(Base):
    """
    Table: resume_skills
    Purpose: Many-to-many relationship between Resume and Skill.
    Each row means "This resume contains this skill".
    """
    __tablename__ = "resume_skills"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.resume_id", ondelete="CASCADE"))
    skill_id = Column(Integer, ForeignKey("skills.skill_id", ondelete="CASCADE"))
    confidence = Column(Float)  # confidence of detection (optional)

    # ORM Relationships:
    resume = relationship("Resume", back_populates="resume_skills")
    skill = relationship("Skill", back_populates="resume_links")


# =============================================================================
#  Job TABLE
# =============================================================================
class Job(Base):
    """
    Table: jobs
    Purpose: Stores job postings created by HR users.
    Each job may have a list of required skills and its own embedding vector.
    """
    __tablename__ = "jobs"

    job_id = Column(Integer, primary_key=True, index=True)
    hr_id = Column(Integer, ForeignKey("hr_users.hr_id"))  # link job to the HR who created it
    title = Column(Text, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    embedding = Column(JSONB)  # ML embedding vector of job description

    # ORM Relationships:
    hr = relationship("HRUser", back_populates="jobs")
    job_skills = relationship("JobSkill", back_populates="job", cascade="all, delete-orphan")
    rankings = relationship("Ranking", back_populates="job", cascade="all, delete-orphan")


# =============================================================================
#  JobSkill TABLE (Link Table: Job ↔ Skill)
# =============================================================================
class JobSkill(Base):
    """
    Table: job_skills
    Purpose: Many-to-many relationship between Job and Skill.
    Each row = a required skill for a job posting.
    """
    __tablename__ = "job_skills"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.job_id", ondelete="CASCADE"))
    skill_id = Column(Integer, ForeignKey("skills.skill_id", ondelete="CASCADE"))
    required_level = Column(Integer, default=1)  # could represent importance or difficulty

    # ORM Relationships:
    job = relationship("Job", back_populates="job_skills")
    skill = relationship("Skill", back_populates="job_links")


# =============================================================================
#  Ranking TABLE
# =============================================================================
class Ranking(Base):
    """
    Table: rankings
    Purpose:
        Stores the computed score of how well a particular resume matches
        a specific job. Used for ranking resumes in the dashboard.

    Relationship type:
        Many-to-one to Job (a job can have many rankings)
        Many-to-one to Resume (a resume can have multiple rankings for different jobs)
    """
    __tablename__ = "rankings"

    ranking_id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.job_id", ondelete="CASCADE"))
    resume_id = Column(Integer, ForeignKey("resumes.resume_id", ondelete="CASCADE"))
    score = Column(Float)  # final computed score (0 to 1)
    created_at = Column(DateTime, default=datetime.utcnow)

    # ORM Relationships:
    job = relationship("Job", back_populates="rankings")
    resume = relationship("Resume", back_populates="rankings")

    # Ensure that for each (job, resume) pair there’s only one ranking entry
    __table_args__ = (UniqueConstraint("job_id", "resume_id", name="uix_job_resume"),)


# -----------------------------------------------------------------------------
#  SCHEMA RELATIONSHIP SUMMARY
# -----------------------------------------------------------------------------
# HRUser 1 ───< Job
# Job 1 ───< JobSkill >─── 1 Skill
# Resume 1 ───< ResumeSkill >─── 1 Skill
# Candidate 1 ───< Resume
# Job 1 ───< Ranking >─── 1 Resume
#
# Meaning:
# - An HR can post many Jobs.
# - Each Job can require many Skills (via JobSkill).
# - Each Candidate can upload multiple Resumes.
# - Each Resume can contain multiple Skills (via ResumeSkill).
# - Each Job-Resume pair has one Ranking record representing the matching score.
# -----------------------------------------------------------------------------
