# backend/app/schemas.py

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class ResumeUploadResponse(BaseModel):
    """
    Returned after a resume file is successfully uploaded and processed.

    Example:
        {
          "resume_id": 12,
          "candidate_id": 7,
          "parsed": {"name": "John Doe", "email": "john@gmail.com", "skills": ["python"]}
        }
    """
    resume_id: int             # Unique ID of the newly saved resume
    candidate_id: int          # Linked candidate record (existing or new)
    parsed: Dict[str, Any]     # Parsed information such as name, email, phone, and skills


# =============================================================================
#  CandidateOut
# =============================================================================
class CandidateOut(BaseModel):
    """
    Used for sending candidate details in API responses.
    Optional fields are allowed because some data (like phone) may be missing.
    """
    candidate_id: int
    full_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]


# =============================================================================
# JobCreate
# =============================================================================
class JobCreate(BaseModel):
    """
    Used when an HR creates a new job posting via POST /api/jobs.
    """
    title: str                                     # Required job title
    description: Optional[str] = None              # Optional job description
    skills: Optional[List[str]] = Field(default_factory=list)
    # Default empty list ensures FastAPI never gets a null value.


# =============================================================================
#  JobOut
# =============================================================================
class JobOut(BaseModel):
    """
    Returned when listing jobs (GET /api/jobs).
    Only includes basic info, not embeddings or extra metadata.
    """
    job_id: int
    title: str
    description: Optional[str] = None


# =============================================================================
#  RankingOut
# =============================================================================
class RankingOut(BaseModel):
    """
    Defines how each ranking result should be returned in JSON.

    Example:
        {
          "ranking_id": 3,
          "resume_id": 14,
          "candidate_id": 9,
          "candidate_name": "Jane Doe",
          "score": 0.87
        }
    """
    ranking_id: int
    resume_id: int
    candidate_id: int
    candidate_name: Optional[str]
    score: float


# =============================================================================
#  JobSkillCount
# =============================================================================
class JobSkillCount(BaseModel):
    """
    Represents how many candidates matched a particular skill for a job.
    Used to build visual charts in the frontend dashboard.
    """
    skill_name: str
    matches: int


# =============================================================================
#  CandidateSummary
# =============================================================================
class CandidateSummary(BaseModel):
    """
    Represents one candidate's summarized evaluation for a specific job.
    Combines both semantic and skill-based analysis.
    Returned inside JobSummaryOut.
    """
    candidate_id: Optional[int]     # ID of candidate (can be None if parsing failed)
    candidate_name: Optional[str]   # Name parsed from resume
    resume_id: int                  # Resume chosen as the "best" one for this candidate
    semantic: float                 # Semantic similarity score (0–1)
    skill_score: float              # Skill overlap score (0–1)
    score: float                    # Final weighted score (combined)
    matched_skills: List[str]       # List of skills matched with job requirements
    missing_skills: List[str]       # List of missing job skills
    coverage_vector: List[int]      # Binary vector showing matched skills (1=matched, 0=missing)
    coverage_percent: int           # % of required job skills covered (0–100)


# =============================================================================
#  JobSummaryOut
# =============================================================================
class JobSummaryOut(BaseModel):
    """
    The main response structure for GET /api/jobs/{job_id}/summary

    This endpoint powers the frontend dashboard and includes:
      - Job info (title, id)
      - List of required skills
      - Skill match statistics
      - List of candidate summaries (ranked)
    """
    job_id: int                                   # Unique job ID
    title: str                                    # Job title
    job_skills: List[str]                         # All required skills for the job
    job_skill_counts: List[JobSkillCount]         # Each skill + how many candidates have it
    top_skills: List[JobSkillCount]               # Top N skills based on matches (for charts)
    candidates: List[CandidateSummary]            # Ranked list of candidates with scores


