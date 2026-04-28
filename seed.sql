
DROP TABLE IF EXISTS rankings CASCADE;
DROP TABLE IF EXISTS job_skills CASCADE;
DROP TABLE IF EXISTS resume_skills CASCADE;
DROP TABLE IF EXISTS resumes CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS hr_users CASCADE;



-- =============================================================================================
--  STEP 2️: HR USERS TABLE
-- =============================================================================================
-- Stores HR/recruiter accounts who post jobs or view results.
-- Each HR has login info (email + password_hash).
-- Passwords are stored as hashes for security.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE hr_users (
  hr_id SERIAL PRIMARY KEY,             -- Auto-incrementing unique HR ID
  name TEXT NOT NULL,                   -- HR’s full name
  email TEXT NOT NULL UNIQUE,           -- Must be unique (used for login)
  password_hash TEXT NOT NULL,          -- Encrypted password
  created_at TIMESTAMPTZ DEFAULT now()  -- Timestamp when HR was created
);



-- =============================================================================================
--  STEP 3️: CANDIDATES TABLE
-- =============================================================================================
-- Stores candidate personal details (linked later with resumes).
-- Each resume belongs to one candidate.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE candidates (
  candidate_id SERIAL PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);



-- =============================================================================================
--  STEP 4️: SKILLS TABLE
-- =============================================================================================
-- Holds all unique skills (like “Python”, “FastAPI”, “Docker”).
-- ML and NLP pipelines match these against resumes and job descriptions.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE skills (
  skill_id SERIAL PRIMARY KEY,
  skill_name TEXT UNIQUE NOT NULL,
  canonical_name TEXT,                  -- Normalized lowercase version (e.g., “machine learning”)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster case-insensitive skill lookups
CREATE INDEX idx_skills_lower_name ON skills (lower(skill_name));



-- =============================================================================================
--  STEP 5️: JOBS TABLE
-- =============================================================================================
-- Stores all job openings created by HRs.
-- Each job belongs to an HR and can have many required skills.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE jobs (
  job_id SERIAL PRIMARY KEY,
  hr_id INTEGER REFERENCES hr_users(hr_id) ON DELETE SET NULL,
  title TEXT NOT NULL,                  -- e.g., “ML Engineer”
  description TEXT,                     -- Job responsibilities, etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  embedding JSONB                       -- ML-generated vector for job description (used in similarity ranking)
);



-- =============================================================================================
--  STEP 6️: RESUMES TABLE
-- =============================================================================================
-- Each candidate may upload multiple resumes.
-- Each resume may be linked to a specific job or be general.
-- ML/NLP pipelines parse, extract text, and embed it here.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE resumes (
  resume_id SERIAL PRIMARY KEY,
  candidate_id INTEGER REFERENCES candidates(candidate_id) ON DELETE CASCADE,
  job_id INTEGER REFERENCES jobs(job_id) ON DELETE SET NULL,
  filename TEXT,                        -- e.g., “resume_pratyush.pdf”
  upload_path TEXT,                     -- file path (e.g., “/uploads/resume_pratyush.pdf”)
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  raw_text TEXT,                        -- extracted plain text of resume
  parsed_json JSONB,                    -- structured JSON (skills, contact info, etc.)
  embedding JSONB                       -- ML embedding (vectorized form)
);



-- =============================================================================================
--  STEP 7️: RESUME_SKILLS TABLE (Many-to-Many)
-- =============================================================================================
-- Maps resumes ↔ skills, with a confidence score from the ML extractor.
-- E.g., resume_id=1 may have skill_id=2 (Python) with confidence=0.97.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE resume_skills (
  id SERIAL PRIMARY KEY,
  resume_id INTEGER REFERENCES resumes(resume_id) ON DELETE CASCADE,
  skill_id INTEGER REFERENCES skills(skill_id) ON DELETE CASCADE,
  confidence DOUBLE PRECISION           -- 0.0–1.0, how confident ML model is about the skill
);



-- =============================================================================================
--  STEP 8️: JOB_SKILLS TABLE (Many-to-Many)
-- =============================================================================================
-- Links job postings to their required skills.
-- E.g., Job 1 may require (Python, ML, Docker).
-- ---------------------------------------------------------------------------------------------
CREATE TABLE job_skills (
  id SERIAL PRIMARY KEY,
  job_id INTEGER REFERENCES jobs(job_id) ON DELETE CASCADE,
  skill_id INTEGER REFERENCES skills(skill_id) ON DELETE CASCADE,
  required_level INTEGER DEFAULT 1      -- Optional numeric level (1–5) or priority weight
);



-- =============================================================================================
--  STEP 9️: RANKINGS TABLE
-- =============================================================================================
-- Stores final ranking scores (ML/NLP similarity results) between jobs and resumes.
-- Each job-resume pair has one unique score.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE rankings (
  ranking_id SERIAL PRIMARY KEY,
  job_id INTEGER REFERENCES jobs(job_id) ON DELETE CASCADE,
  resume_id INTEGER REFERENCES resumes(resume_id) ON DELETE CASCADE,
  score DOUBLE PRECISION,               -- final ML score (0.0–1.0)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (job_id, resume_id)            -- prevent duplicate ranking for same job-resume pair
);



-- =============================================================================================
--  STEP : INSERT SAMPLE DATA (for testing backend + frontend)
-- =============================================================================================

--  HR USERS
INSERT INTO hr_users (name, email, password_hash) VALUES
('Alice HR', 'alice@company.com', 'hashed_alice123'),
('Bob Recruiter', 'bob@company.com', 'hashed_bob456');

--  CANDIDATES
INSERT INTO candidates (full_name, email, phone) VALUES
('Pratyush Kandari', 'pratyush@example.com', '+91-90000-00001'),
('Ravi Sharma', 'ravi@example.com', '+91-90000-00002'),
('Kavya Iyer', 'kavya@example.com', '+91-90000-00003');

--  SKILLS
INSERT INTO skills (skill_name, canonical_name) VALUES
('Python', 'python'),
('AI', 'ai'),
('ML', 'ml'),
('SQL', 'sql'),
('FastAPI', 'fastapi'),
('Docker', 'docker'),
('PostgreSQL', 'postgresql');

--  JOBS
INSERT INTO jobs (hr_id, title, description)
VALUES
(1, 'Machine Learning Engineer', 'Looking for ML Engineer skilled in Python, FastAPI, Docker'),
(2, 'Backend Developer', 'Experience with SQL, PostgreSQL, FastAPI, Docker');

--  JOB SKILLS
INSERT INTO job_skills (job_id, skill_id)
SELECT 1, skill_id FROM skills WHERE skill_name IN ('Python', 'AI', 'ML', 'FastAPI', 'Docker');
INSERT INTO job_skills (job_id, skill_id)
SELECT 2, skill_id FROM skills WHERE skill_name IN ('SQL', 'PostgreSQL', 'FastAPI', 'Docker');

--  RESUMES
INSERT INTO resumes (candidate_id, job_id, filename, upload_path, raw_text, parsed_json)
VALUES
(1, 1, 'resume_pratyush.pdf', '/uploads/resume_pratyush.pdf', 'Pratyush resume content',
 '{"skills":["Python","AI","ML"],"email":"pratyush@example.com"}'),
(2, 2, 'resume_ravi.pdf', '/uploads/resume_ravi.pdf', 'Ravi resume content',
 '{"skills":["SQL","Docker","PostgreSQL"],"email":"ravi@example.com"}'),
(3, NULL, 'resume_kavya.pdf', '/uploads/resume_kavya.pdf', 'Kavya resume content',
 '{"skills":["Python","AI"],"email":"kavya@example.com"}');

-- 🧩 RESUME_SKILLS
INSERT INTO resume_skills (resume_id, skill_id, confidence)
SELECT 1, skill_id, 0.95 FROM skills WHERE skill_name IN ('Python','AI','ML');
INSERT INTO resume_skills (resume_id, skill_id, confidence)
SELECT 2, skill_id, 0.90 FROM skills WHERE skill_name IN ('SQL','Docker','PostgreSQL');
INSERT INTO resume_skills (resume_id, skill_id, confidence)
SELECT 3, skill_id, 0.85 FROM skills WHERE skill_name IN ('Python','AI');

--  RANKINGS
INSERT INTO rankings (job_id, resume_id, score) VALUES
(1, 1, 0.92),
(1, 3, 0.75),
(2, 2, 0.88);


