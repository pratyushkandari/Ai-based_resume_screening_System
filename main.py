# backend/app/main.py

import os
import uuid
import shutil
import logging
from pathlib import Path
from typing import List, Tuple, Any, Dict, Optional
from datetime import datetime
import re

# FastAPI modules for building REST APIs
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

# SQLAlchemy modules for database ORM
from sqlalchemy.orm import Session
from sqlalchemy import func, text, or_

# Import local project modules
from .db import SessionLocal, engine, Base
from . import models, schemas, ml_utils
from .auth import hash_password, verify_password


Base.metadata.create_all(bind=engine)


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------------
#  Create the FastAPI app
# -----------------------------------------------------------------------------
app = FastAPI(title="ML Resume Screening (Fixed, Aggregated Summary)")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all origins (for dev/testing)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
#  File Upload Directory Setup
# -----------------------------------------------------------------------------
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# -----------------------------------------------------------------------------
#  Dependency: Database Session
# -----------------------------------------------------------------------------
def get_db():
    """
    Creates and provides a new SQLAlchemy session for each request.
    FastAPI automatically closes it after the request ends.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -----------------------------------------------------------------------------
#  Helper: Remove duplicates but preserve order
# -----------------------------------------------------------------------------
def _unique_preserve_order(seq: List[Any]) -> List[Any]:
    """
    Returns a new list without duplicates, preserving the original order.
    Useful when we need distinct skill IDs or names.
    """
    seen, out = set(), []
    for x in seq:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out

# -----------------------------------------------------------------------------
#  Normalize and merge duplicate skills
# -----------------------------------------------------------------------------
def _normalize_and_merge_skills_table():
    """
    Ensures that skill names in the database are lowercase and unique.

    Example:
        If both "Python" and "python" exist, they will be merged into one record.
    """
    db = SessionLocal()
    try:
        all_skills = db.query(models.Skill).all()
        groups: Dict[str, List[models.Skill]] = {}

        # Group by lowercase skill name
        for s in all_skills:
            if s.skill_name:
                key = s.skill_name.strip().lower()
                groups.setdefault(key, []).append(s)

        # Merge duplicates safely
        for lower_name, rows in groups.items():
            canonical = db.query(models.Skill).filter(func.lower(models.Skill.skill_name) == lower_name).first()
            if not canonical:
                canonical = rows[0]
                try:
                    canonical.skill_name = lower_name
                    db.add(canonical)
                    db.commit()
                except Exception:
                    db.rollback()

            keep_id = canonical.skill_id
            for dup in rows:
                if dup.skill_id != keep_id:
                    try:
                        # Update foreign key references
                        db.execute(
                            text("UPDATE resume_skills SET skill_id = :keep WHERE skill_id = :dup"),
                            {"keep": keep_id, "dup": dup.skill_id},
                        )
                        db.execute(
                            text("UPDATE job_skills SET skill_id = :keep WHERE skill_id = :dup"),
                            {"keep": keep_id, "dup": dup.skill_id},
                        )
                        db.commit()
                    except Exception:
                        db.rollback()

                    # Remove duplicate row
                    try:
                        db.delete(dup)
                        db.commit()
                    except Exception:
                        db.rollback()
    except Exception as e:
        logger.exception("Skill normalization error (continuing): %s", e)
    finally:
        db.close()

# Run normalization once at startup
_normalize_and_merge_skills_table()

# -----------------------------------------------------------------------------
#  Helper: Get relevant resumes
# -----------------------------------------------------------------------------
def _relevant_resumes(db: Session, after: Optional[datetime] = None, job_id: Optional[int] = None):
    """
    Fetch resumes that match filters:
      - If job_id given → resumes for that job
      - Else if 'after' given → resumes uploaded after that date
      - Else → all resumes (most recent first)
    """
    q = db.query(models.Resume)
    if job_id is not None:
        q = q.filter(models.Resume.job_id == job_id)
    elif after is not None:
        q = q.filter(models.Resume.uploaded_at >= after)
    return q.order_by(models.Resume.uploaded_at.desc()).all()

# -----------------------------------------------------------------------------
#  Helper: Parse skill extraction results
# -----------------------------------------------------------------------------
def _parse_detected_skills(raw: Any) -> List[Tuple[str, float]]:
    """
    Converts various skill extraction outputs into a standardized format:
    [(skill_name, confidence_score), ...]
    """
    out: List[Tuple[str, float]] = []
    if not raw:
        return out
    for item in raw:
        # Example formats supported:
        # ["python", 0.9] or {"skill": "python", "confidence": 0.9} or "python"
        if isinstance(item, (list, tuple)):
            if len(item) >= 1:
                name = str(item[0]).strip().lower()
                conf = float(item[1]) if len(item) > 1 else 1.0
                if name:
                    out.append((name, conf))
        elif isinstance(item, dict):
            name = item.get("skill") or item.get("name") or item.get("skill_name") or ""
            name = str(name).strip().lower()
            conf = float(item.get("confidence", 1.0))
            if name:
                out.append((name, conf))
        elif isinstance(item, str):
            name = item.strip().lower()
            if name:
                out.append((name, 1.0))
    return out

# =============================================================================
#  API: Upload Resume
# =============================================================================
@app.post("/api/resumes/upload", response_model=schemas.ResumeUploadResponse)
def upload_resume(
    file: UploadFile = File(...),
    job_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Handles resume upload (.doc or .docx file).
    1. Saves uploaded file.
    2. Extracts text using ml_utils.
    3. Detects skills.
    4. Creates Candidate + Resume records.
    5. Returns parsed info.
    """

    # -------------------- Save uploaded file -------------------- #
    ext = os.path.splitext(file.filename)[1].lower()
    uid = str(uuid.uuid4())[:8]  # generate unique prefix
    safe_name = Path(file.filename).name  # sanitize filename
    saved = os.path.join(UPLOAD_DIR, f"{uid}_{safe_name}")

    try:
        with open(saved, "wb") as out:
            shutil.copyfileobj(file.file, out)
    finally:
        file.file.close()

    # -------------------- Optional .doc → .docx conversion -------------------- #
    if ext == ".doc" and hasattr(ml_utils, "convert_doc_to_docx"):
        try:
            conv = ml_utils.convert_doc_to_docx(saved)
            if conv and os.path.exists(conv):
                saved = conv
        except Exception:
            logger.exception("doc->docx conversion failed (continuing)")

    # -------------------- Extract text -------------------- #
    try:
        text = ml_utils.extract_text_docx(saved)
    except Exception as e:
        logger.exception("Failed to extract text")
        raise HTTPException(status_code=400, detail=f"Failed to extract text: {e}")

    parsed = ml_utils.parse_contacts(text) or {}

    # -------------------- Upsert Candidate -------------------- #
    candidate = None
    if parsed.get("email"):
        candidate = db.query(models.Candidate).filter(func.lower(models.Candidate.email) == parsed["email"].strip().lower()).first()
    if not candidate:
        candidate = models.Candidate(
            full_name=parsed.get("name"),
            email=(parsed.get("email") or None),
            phone=parsed.get("phone"),
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)

    # -------------------- Create Resume record -------------------- #
    resume = models.Resume(
        candidate_id=candidate.candidate_id,
        filename=os.path.basename(saved),
        upload_path=os.path.abspath(saved),
        raw_text=text,
        parsed_json={"parsed": parsed, "skills": []},
        job_id=job_id,
    )

    # Try generating embedding
    try:
        resume.embedding = ml_utils.embed_text(text)
    except Exception:
        resume.embedding = None

    db.add(resume)
    db.commit()
    db.refresh(resume)

    # -------------------- Detect skills -------------------- #
    skills_rows = db.query(models.Skill).all()
    canonical_skills = [s.skill_name.lower() for s in skills_rows if s.skill_name]

    raw_detected = []
    if hasattr(ml_utils, "extract_skills"):
        try:
            raw_detected = ml_utils.extract_skills(text, canonical_skills)
        except Exception:
            raw_detected = []

    detected = _parse_detected_skills(raw_detected)
    skill_names_for_parsed_json = []

    for skill_name, conf in detected:
        name_lower = skill_name.strip().lower()
        skill_names_for_parsed_json.append(name_lower)
        s_row = db.query(models.Skill).filter(func.lower(models.Skill.skill_name) == name_lower).first()
        if not s_row:
            s_row = models.Skill(skill_name=name_lower)
            db.add(s_row)
            db.commit()
            db.refresh(s_row)

        exists = db.query(models.ResumeSkill).filter_by(resume_id=resume.resume_id, skill_id=s_row.skill_id).first()
        if not exists:
            db.add(models.ResumeSkill(resume_id=resume.resume_id, skill_id=s_row.skill_id, confidence=conf))

    # Update parsed JSON field
    try:
        resume.parsed_json = {"parsed": parsed, "skills": skill_names_for_parsed_json}
        db.add(resume)
        db.commit()
    except Exception:
        db.rollback()

    logger.info("Uploaded resume %s -> resume_id=%s candidate_id=%s job_id=%s", saved, resume.resume_id, candidate.candidate_id, job_id)
    return {"resume_id": resume.resume_id, "candidate_id": candidate.candidate_id, "parsed": resume.parsed_json}

# =============================================================================
#  API: Create Job + List Jobs
# =============================================================================
from fastapi import Form  # ✅ make sure this import exists at top

@app.post("/api/jobs", response_model=schemas.JobOut)
def create_job(
    title: str = Form(...),
    description: str = Form(""),
    created_by: int = Form(...),   # ✅ ADDED
    skills: Optional[str] = Form(""),  # ✅ ADDED (comma separated)
    db: Session = Depends(get_db)
):
    """
    Create a new job entry.
    Optionally embeds its description for semantic matching.
    """

    # ✅ UPDATED: include created_by
    job_row = models.Job(
        title=title,
        description=description,
        created_by=created_by
    )

    try:
        job_row.embedding = ml_utils.embed_text(description or title)
    except Exception:
        job_row.embedding = None

    db.add(job_row)
    db.commit()
    db.refresh(job_row)

    # ✅ UPDATED: handle skills from string → list
    seen_skill_ids = []
    skills_list = [s.strip() for s in skills.split(",") if s.strip()]

    for s in skills_list:
        s_lower = s.lower()

        skill_row = db.query(models.Skill).filter(
            func.lower(models.Skill.skill_name) == s_lower
        ).first()

        if not skill_row:
            skill_row = models.Skill(skill_name=s_lower)
            db.add(skill_row)
            db.commit()
            db.refresh(skill_row)

        if skill_row.skill_id not in seen_skill_ids:
            exists_js = db.query(models.JobSkill).filter_by(
                job_id=job_row.job_id,
                skill_id=skill_row.skill_id
            ).first()

            if not exists_js:
                db.add(models.JobSkill(
                    job_id=job_row.job_id,
                    skill_id=skill_row.skill_id,
                    required_level=1
                ))
                seen_skill_ids.append(skill_row.skill_id)

    db.commit()

    logger.info(
        "Created job %s (id=%s) by user %s",
        job_row.title,
        job_row.job_id,
        created_by
    )

    return {
        "job_id": job_row.job_id,
        "title": job_row.title,
        "description": job_row.description
    }



# =============================================================================
#  API: Generate Rankings
# =============================================================================
@app.post("/api/jobs/{job_id}/rank")
def rank_job(job_id: int, db: Session = Depends(get_db)):
    """
    Compute ranking scores for all resumes linked to this job.
    Combines semantic and skill similarity into one score.
    """
    job = db.query(models.Job).filter_by(job_id=job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job_skill_links = db.query(models.JobSkill).filter_by(job_id=job_id).all()
    job_skill_ids = _unique_preserve_order([jl.skill_id for jl in job_skill_links])

    # Remove old rankings
    db.query(models.Ranking).filter_by(job_id=job_id).delete(synchronize_session=False)
    db.commit()

    resumes = _relevant_resumes(db, after=job.created_at, job_id=job_id)

    logger.info("Rank Job %s: resumes considered -> %s", job_id, [r.resume_id for r in resumes])
    count = 0

    for r in resumes:
        r_skill_links = db.query(models.ResumeSkill).filter_by(resume_id=r.resume_id).all()
        r_skill_ids = [rl.skill_id for rl in r_skill_links]
        final_score = 0.0

        if job.embedding and r.embedding and hasattr(ml_utils, "compute_final_score"):
            try:
                res = ml_utils.compute_final_score(job.embedding, r.embedding, job_skill_ids, r_skill_ids)
                final_score = float(res.get("final_score", 0.0))
            except Exception:
                logger.exception("compute_final_score failure for resume %s", r.resume_id)
        else:
            # Simple fallback if embeddings unavailable
            if job_skill_ids:
                


                matched = len(set(job_skill_ids).intersection(set(r_skill_ids)))
                total = len(job_skill_ids)

                skill_score = (matched / total) if total else 0.0

                # Keep consistent with summary logic
                final_score = 0.8 * skill_score




        status = "accepted" if final_score >= 0.6 else "rejected"
        try:
            db.add(models.Ranking(
                job_id=job_id,
                resume_id=r.resume_id,
                score=round(final_score, 6),
                status=status   # ✅ ADDED
    )) 
            db.commit()
        except Exception:
            db.rollback()
            existing = db.query(models.Ranking).filter_by(job_id=job_id, resume_id=r.resume_id).first()
            if existing:
                existing.score = round(final_score, 6)
                existing.status = status   # ✅ IMPORTANT
                db.add(existing)
                db.commit()
        count += 1

    logger.info("Rank Job %s: Ranked %s resumes", job_id, count)
    return {"status": "done", "ranked": count}

# =============================================================================
#  API: Fetch Rankings + Job Summary
# =============================================================================
@app.get("/api/jobs/{job_id}/rankings")
def get_rankings(job_id: int, user_id: int, role: str, db: Session = Depends(get_db)):

    job = db.query(models.Job).filter_by(job_id=job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")

    # 🔒 LOCK
    if role.strip().lower() == "hr" and job.created_by != int(user_id):
        raise HTTPException(403, "Not authorized")

    rows = db.query(models.Ranking)\
        .filter_by(job_id=job_id)\
        .order_by(models.Ranking.score.desc())\
        .all()

    out = []
    for row in rows:
        r = db.query(models.Resume).filter_by(resume_id=row.resume_id).first()
        cand = db.query(models.Candidate).filter_by(candidate_id=r.candidate_id).first()

        out.append({
            "ranking_id": row.ranking_id,
            "resume_id": r.resume_id,
            "candidate_id": cand.candidate_id,
            "candidate_name": cand.full_name,
            "score": row.score,
            "status": "accepted" if row.score >= 0.6 else "rejected"  # 🔥 FORCE AUTO
        })

    return out

@app.get("/api/jobs/{job_id}/summary")
def job_summary(job_id: int, user_id: int, role: str, db: Session = Depends(get_db)):
    """
    Returns aggregated job summary for the dashboard:
      - One record per candidate (best resume chosen automatically)
      - Includes semantic and skill-based matching results
      - Used by frontend charts
    """
    job = db.query(models.Job).filter_by(job_id=job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # ✅ SECURITY FIX: Only job owner HR can access
    if role.strip().lower() == "hr" and job.created_by != int(user_id):
        raise HTTPException(status_code=403, detail="Not authorized to view this job")

    # Collect job skill data
    job_skill_links = db.query(models.JobSkill).filter_by(job_id=job_id).all()
    job_skill_ids = _unique_preserve_order([jl.skill_id for jl in job_skill_links])
    job_skill_objs = db.query(models.Skill).filter(models.Skill.skill_id.in_(job_skill_ids)).all()
    id_to_name = {s.skill_id: s.skill_name for s in job_skill_objs}
    job_skill_names = [id_to_name[sid] for sid in job_skill_ids if sid in id_to_name]

    resumes = _relevant_resumes(db, after=job.created_at, job_id=job_id)

    # Build per-resume metrics
    resume_info = {}
    for r in resumes:
        cand = db.query(models.Candidate).filter_by(candidate_id=r.candidate_id).first()
        r_skill_links = db.query(models.ResumeSkill).filter_by(resume_id=r.resume_id).all()
        r_skill_ids = [rl.skill_id for rl in r_skill_links]
        r_skill_objs = db.query(models.Skill).filter(models.Skill.skill_id.in_(r_skill_ids)).all()
        r_skill_names = [s.skill_name for s in r_skill_objs]
        r_skill_set = set(r_skill_names)

        sem = 0.0
        if job.embedding and r.embedding:
            try:
                sem_raw = ml_utils.cosine_sim(job.embedding or [], r.embedding or [])
                sem = round(((sem_raw + 1.0) / 2.0), 3)
            except Exception:
                sem = 0.0

        matched_count = len([s for s in job_skill_names if s in r_skill_set])
        total_skills = len(job_skill_names)

        skill_score = round((matched_count / total_skills) if total_skills else 0.0, 3)

        final = round(skill_score * 0.8 + sem * 0.2, 3)

        # bonus boost
        if skill_score > 0.7:
            final += 0.05
        final = min(final, 1.0)

        matched = [s for s in job_skill_names if s in r_skill_set]
        missing = [s for s in job_skill_names if s not in r_skill_set]
        coverage_vector = [1 if s in r_skill_set else 0 for s in job_skill_names]

        resume_info[r.resume_id] = {
            "resume_id": r.resume_id,
            "candidate_id": cand.candidate_id if cand else None,
            "candidate_name": cand.full_name if cand else None,
            "semantic": sem,
            "skill_score": skill_score,
            "score": final,
            "matched_skills": matched,
            "missing_skills": missing,
            "coverage_vector": coverage_vector,
            "coverage_percent": int((sum(coverage_vector) / len(coverage_vector) * 100) if coverage_vector else 0),
        }

    # Aggregate per candidate
    cand_map: Dict[int, List[Dict[str, Any]]] = {}
    for info in resume_info.values():
        cid = info["candidate_id"] or -1
        cand_map.setdefault(cid, []).append(info)

    candidates = []
    coverage_counts = {s: 0 for s in job_skill_names}

    for cid, infos in cand_map.items():
        best = max(infos, key=lambda x: x["score"])
        matched_union = set()
        coverage_vector = [0] * len(job_skill_names)

        for info in infos:
            matched_union.update(info.get("matched_skills", []))
            vec = info.get("coverage_vector", [])
            for i, v in enumerate(vec):
                if v:
                    coverage_vector[i] = 1

        matched = sorted(list(matched_union))
        missing = [s for s in job_skill_names if s not in matched]

        for i, s in enumerate(job_skill_names):
            if coverage_vector[i]:
                coverage_counts[s] = coverage_counts.get(s, 0) + 1

        # 🔥 FETCH STATUS FROM RANKING TABLE
        ranking_row = db.query(models.Ranking).filter_by(
            job_id=job_id,
            resume_id=best["resume_id"]
        ).first()

        status = "accepted" if best["score"] >= 0.6 else "rejected"

        candidates.append({
            "candidate_id": best["candidate_id"],
            "candidate_name": best["candidate_name"],
            "resume_id": best["resume_id"],
            "semantic": best["semantic"],
            "skill_score": best["skill_score"],
            "score": best["score"],
            "status": status,
            "matched_skills": matched,
            "missing_skills": missing,
            "coverage_vector": coverage_vector,
            "coverage_percent": int((sum(coverage_vector) / len(coverage_vector) * 100) if coverage_vector else 0),
        })

    job_skill_counts = [{"skill_name": s, "matches": int(coverage_counts.get(s, 0))} for s in job_skill_names]

    agg = db.query(models.Skill.skill_name,
                   func.count(func.distinct(models.Resume.candidate_id)).label("matches")) \
        .join(models.ResumeSkill, models.ResumeSkill.skill_id == models.Skill.skill_id) \
        .join(models.Resume, models.Resume.resume_id == models.ResumeSkill.resume_id) \
        .group_by(models.Skill.skill_name) \
        .order_by(func.count(func.distinct(models.Resume.candidate_id)).desc()) \
        .limit(10).all()

    top_skills = [{"skill_name": a.skill_name, "matches": int(a.matches)} for a in agg]

    candidates = sorted(candidates, key=lambda x: x["score"], reverse=True)

    return {
        "job_id": job.job_id,
        "title": job.title,
        "job_skills": job_skill_names,
        "job_skill_counts": job_skill_counts,
        "top_skills": top_skills,
        "candidates": candidates
    }
# =============================================================================
#  API: Download Resume
# =============================================================================
@app.get("/api/resumes/{resume_id}/download")
def download_resume(resume_id: int, db: Session = Depends(get_db)):
    """Allow HR to download stored resume file."""
    r = db.query(models.Resume).filter_by(resume_id=resume_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Resume not found")
    if not os.path.exists(r.upload_path):
        raise HTTPException(status_code=404, detail="File missing on server")
    return FileResponse(r.upload_path, filename=r.filename, media_type="application/octet-stream")

# =============================================================================
#  Debug Helper: List Resumes for a Job
# =============================================================================
@app.get("/api/jobs/{job_id}/resumes")
def debug_job_resumes(job_id: int, db: Session = Depends(get_db)):
    """Quick debugging endpoint: list resumes for a job."""
    rows = db.query(models.Resume).filter(models.Resume.job_id == job_id).order_by(models.Resume.uploaded_at.desc()).all()
    return [{"resume_id": r.resume_id, "uploaded_at": r.uploaded_at, "filename": r.filename, "candidate_id": r.candidate_id} for r in rows]

@app.post("/api/register")
def register(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    db: Session = Depends(get_db)
):

    email = email.strip().lower()

    # ✅ EMAIL VALIDATION
    if not re.match(r"^[\w\.-]+@[\w\.-]+\.\w+$", email):
        raise HTTPException(400, "Invalid email format (must contain @ and domain)")

    # ✅ PASSWORD VALIDATION
    if len(password) < 5:
        raise HTTPException(400, "Password must be at least 5 characters")

    if not re.search(r"[A-Za-z]", password) or not re.search(r"[0-9]", password):
        raise HTTPException(400, "Password must contain letters and numbers")

    # ✅ CHECK EXISTING USER
    user = db.query(models.User).filter(
        func.lower(models.User.email) == email
    ).first()

    if user:
        raise HTTPException(400, "User already registered with this email")

    new_user = models.User(
        name=name,
        email=email,
        password=hash_password(password),
        role=role
    )

    db.add(new_user)
    db.commit()

    return {"msg": "registered successfully"}

@app.post("/api/login")
def login(
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    email = email.strip().lower()

    # ✅ EMAIL FORMAT CHECK
    if not re.match(r"^[\w\.-]+@[\w\.-]+\.\w+$", email):
        raise HTTPException(400, "Invalid email format")

    user = db.query(models.User).filter(
        func.lower(models.User.email) == email
    ).first()

    if not user:
        raise HTTPException(401, "No account found with this email")

    stored = user.password or ""

    # 🔁 OLD PASSWORD MIGRATION (KEEPED EXACTLY)
    if stored == password:
        try:
            user.password = hash_password(password)
            db.add(user)
            db.commit()
        except Exception:
            db.rollback()

        return {
            "role": user.role,
            "name": user.name,
            "user_id": user.user_id
        }

    # ✅ VERIFY PASSWORD
    try:
        if not verify_password(password, stored):
            raise HTTPException(401, "Incorrect password")
    except Exception:
        raise HTTPException(401, "Invalid credentials")

    return {
        "role": user.role,
        "name": user.name,
        "user_id": user.user_id
    }

@app.get("/api/jobs")
def list_jobs(role: str, user_id: int, db: Session = Depends(get_db)):

    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user_id")

    role_clean = (role or "").strip().lower()

    # 🔒 HARD LOCK: ONLY HR sees OWN jobs
    if role_clean == "hr":
        rows = db.query(models.Job)\
            .filter(models.Job.created_by == int(user_id))\
            .order_by(models.Job.created_at.desc())\
            .all()
    else:
        rows = db.query(models.Job)\
            .order_by(models.Job.created_at.desc())\
            .all()

    return [
    {
        "job_id": j.job_id,
        "title": j.title,
        "description": j.description,
        "created_by": j.created_by,

        # ✅ ADD THIS BLOCK (THIS IS THE FIX)
        "skills": [
            js.skill.skill_name
            for js in j.job_skills
            if js.skill and js.skill.skill_name
        ]
    }
    for j in rows
]
from fastapi import Body  # ✅ ADD THIS IMPORT

@app.post("/api/ranking/{id}/status")
def update_status():
    raise HTTPException(
        status_code=403,
        detail="Manual status update disabled. System is automatic."
    )
