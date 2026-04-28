# backend/app/ml_utils.py

import re
import os
import numpy as np


try:
    from sentence_transformers import SentenceTransformer
    MODEL = SentenceTransformer("all-MiniLM-L6-v2")
except Exception:
    MODEL = None  # fallback if model isn't available


def embed_text(text):
    """
    Return embedding (list of floats). If model missing, return deterministic fallback.

    Args:
        text (str): Resume or job description text.

    Returns:
        list[float]: 384-dimensional vector representing semantic meaning.

    Why fallback? 
        - In case sentence-transformers isn't installed, we still want the system
          to run (for testing or in restricted environments).
        - The fallback generates a fake, deterministic vector from hash(text)
          so repeated inputs produce consistent outputs.
    """
    if not text:
        return []

    if MODEL:
        vec = MODEL.encode([text], show_progress_bar=False)[0]
        return vec.tolist()

    # fallback: create a deterministic pseudo-vector using hash value
    h = abs(hash(text)) % 1000
    vec = [((h + i) % 100) / 100.0 for i in range(384)]
    return vec

# -----------------------------------------------------------------------------
# 3️ cosine_sim(): Compute similarity between two embedding vectors
# -----------------------------------------------------------------------------
def cosine_sim(a, b):
    """
    Compute cosine similarity between two numeric vectors.
    Returns a value in range [-1, 1], where:
      - 1.0 = perfectly similar
      - 0.0 = no similarity
      - -1.0 = opposite meaning

    Example: cosine_sim(job_embedding, resume_embedding)
    """
    if not a or not b:
        return 0.0
    a = np.array(a, dtype=float)
    b = np.array(b, dtype=float)
    # Ensure same length by trimming to smaller vector
    if a.size != b.size:
        n = min(a.size, b.size)
        a = a[:n]
        b = b[:n]
    denom = (np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)

# -----------------------------------------------------------------------------
# 4️ extract_text_docx(): Extract text from a .docx resume file
# -----------------------------------------------------------------------------
def extract_text_docx(path):
    """
    Extract readable text from a Microsoft Word (.docx) document.
    Uses the `python-docx` library internally.

    Args:
        path (str): Path to .docx file.

    Returns:
        str: Combined text content (paragraphs joined with newlines).

    Raises:
        RuntimeError: If python-docx is not installed.
    """
    try:
        from docx import Document
    except Exception as e:
        raise RuntimeError("python-docx not installed") from e

    doc = Document(path)
    # Collect all non-empty paragraph texts
    paragraphs = [p.text for p in doc.paragraphs if p.text and p.text.strip()]
    return "\n".join(paragraphs)

# -----------------------------------------------------------------------------
# 5️ Regex patterns for emails and phone numbers
# -----------------------------------------------------------------------------
# We precompile regular expressions for efficiency.
# - RE_EMAIL matches typical email formats (e.g., name@example.com)
# - RE_PHONE matches local and international phone numbers with optional '+'
# -----------------------------------------------------------------------------
RE_EMAIL = re.compile(r"([a-zA-Z0-9_.+\-]+@[a-zA-Z0-9\-]+\.[a-zA-Z0-9\-.]+)")
RE_PHONE = re.compile(r"(\+?\d[\d\-\s]{6,}\d)")

# -----------------------------------------------------------------------------
# 6️ parse_contacts(): Extract name, email, and phone from text
# -----------------------------------------------------------------------------
def parse_contacts(text):
    """
    Extracts contact info from resume text.

    - Name: first few lines containing alphabets (usually at the top of a resume)
    - Email: first match of email pattern
    - Phone: first match of phone pattern

    Returns:
        dict: {"name": ..., "email": ..., "phone": ...}
    """
    # Split lines and clean whitespace
    lines = [l.strip() for l in (text or "").splitlines() if l.strip()]
    name = None

    # Heuristic: the first meaningful line with alphabets is probably the name
    if lines:
        for ln in lines[:5]:
            if re.search(r"[A-Za-z]", ln):
                name = ln
                break
        if not name:
            name = lines[0]

    # Find first email and phone matches using regex
    email = None
    phone = None
    m = RE_EMAIL.search(text or "")
    if m:
        email = m.group(1)
    p = RE_PHONE.search(text or "")
    if p:
        phone = p.group(1)

    return {"name": name, "email": email, "phone": phone}

# -----------------------------------------------------------------------------
# 7️ extract_skills(): Detect known skills in resume text
# -----------------------------------------------------------------------------
def extract_skills(text, canonical_skills):
    """
    Simple skill extractor:
      - Uses exact case-insensitive substring matching.
      - canonical_skills: list of known skill names from DB.
      - Returns list of (skill_name, confidence) tuples.

    Example:
        text = "Experienced in Python and Machine Learning"
        canonical_skills = ["python", "java", "machine learning"]
        → output = [("python", 0.95), ("machine learning", 0.95)]
    """
    found = []
    low = (text or "").lower()

    for s in canonical_skills:
        if not s:
            continue
        if s.lower() in low:
            found.append((s, 0.95))  # fixed confidence for now

    # Deduplicate skills while keeping original order
    seen = set()
    out = []
    for s, c in found:
        if s not in seen:
            seen.add(s)
            out.append((s, c))
    return out

# -----------------------------------------------------------------------------
# 8️ compute_final_score(): Combine semantic + skill scores into final ranking
# -----------------------------------------------------------------------------
def compute_final_score(job_emb, resume_emb, job_skill_ids, resume_skill_ids,
                        weight_semantic=0.7, weight_skill=0.3):
    """
    Combine semantic and skill overlap into one final score.

    Args:
        job_emb (list[float]): embedding of job description
        resume_emb (list[float]): embedding of resume text
        job_skill_ids (list[int]): skill IDs required for the job
        resume_skill_ids (list[int]): skill IDs found in the resume
        weight_semantic (float): relative weight for semantic score (default 0.7)
        weight_skill (float): relative weight for skill overlap score (default 0.3)

    Returns:
        dict:
            {
              "semantic": semantic_score (0–1),
              "skill": skill_score (0–1),
              "final_score": weighted_combination (0–1)
            }

    Formula:
        semantic = (cosine_sim + 1) / 2   → normalize to 0–1
        skill = (# matched skills) / (# job skills)
        final = 0.7 * semantic + 0.3 * skill
    """
    # Semantic similarity from embeddings
    sem_raw = cosine_sim(job_emb, resume_emb)
    semantic = (sem_raw + 1.0) / 2.0

    # Skill overlap fraction
    skill = 0.0
    if job_skill_ids:
        matched = len(set(job_skill_ids).intersection(set(resume_skill_ids)))
        skill = matched / len(job_skill_ids)

    # Weighted final score (tunable weights)
    final = weight_semantic * semantic + weight_skill * skill
    return {"semantic": semantic, "skill": skill, "final_score": final}
