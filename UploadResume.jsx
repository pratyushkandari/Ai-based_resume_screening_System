// =============================================================================================
//  FILE: frontend/src/components/UploadResume.jsx
// =============================================================================================
//
//  PURPOSE OF THIS FILE:
// ---------------------------------------------------------------------------------------------
// This React component is responsible for uploading **resumes** (in .doc, .docx, or .pdf format)
// and linking them to an existing **job** in the ML-Based Resume Screening System.
//
// After you create a job in UploadJob.jsx, you are automatically redirected here,
// with that job pre-selected via a ?jobId= query parameter in the URL.
//
// This page lets you:
//   ✅ Select the correct job from a dropdown
//   ✅ Choose a resume file to upload
//   ✅ See a live upload progress bar (percentage)
//   ✅ Get confirmation of successful upload (resume ID, candidate ID, job ID)
//   ✅ Navigate directly to the Dashboard to view candidate rankings
//
// ---------------------------------------------------------------------------------------------
//  WINDOWS PATH (for your setup):
//   C:\pbldbms\frontend\src\components\UploadResume.jsx
//
// ▶ Run in PowerShell (Frontend):
//   cd C:\pbldbms\frontend
//   npm run dev
//   → open http://localhost:5173
//
// ▶ Backend (FastAPI) must be running in another PowerShell window:
//   cd C:\pbldbms\backend
//   .\venv\Scripts\Activate.ps1
//   uvicorn app.main:app --reload
//
// =============================================================================================


// ---------------------------------------------------------------------------------------------
//  STEP 1️: IMPORT REQUIRED LIBRARIES
// ---------------------------------------------------------------------------------------------
import React, { useState, useEffect, useRef } from "react"; // React + hooks for state, effects, and DOM refs
import api from "../api";                                  // Axios instance for backend API requests
import { toast } from "react-toastify";                    // Popup messages for user feedback
import { useSearchParams } from "react-router-dom";        // To read ?jobId= query from URL


// =============================================================================================
//  STEP 2️: DEFINE MAIN COMPONENT — UploadResume()
// =============================================================================================
//
// This is a React function component that controls all upload interactions.
// It fetches jobs from backend, allows file upload, and handles the upload process.
// ---------------------------------------------------------------------------------------------
export default function UploadResume() {

  // -------------------------------------------------------------------------------------------
  // STATE VARIABLES (React useState Hooks)
  // -------------------------------------------------------------------------------------------
  //
  // Each state variable dynamically stores and updates part of the UI data.
  // -------------------------------------------------------------------------------------------
  const [file, setFile] = useState(null);             // stores the selected resume file
  const [jobId, setJobId] = useState("");             // ID of job selected from dropdown
  const [jobs, setJobs] = useState([]);               // list of available jobs (fetched from backend)
  const [loading, setLoading] = useState(false);      // upload loading flag (to disable buttons)
  const [progress, setProgress] = useState(0);        // upload progress percentage
  const [lastUpload, setLastUpload] = useState(null); // stores info of last successful upload
  const fileInputRef = useRef(null);                  // reference to the HTML <input type="file" />
  const [searchParams] = useSearchParams();           // read jobId from URL (e.g., ?jobId=3)


  // -------------------------------------------------------------------------------------------
  //  STEP 3️: INITIAL EFFECT (load jobs + pre-select job)
  // -------------------------------------------------------------------------------------------
  //
  // When page loads:
  //   - It checks the URL for ?jobId= parameter.
  //   - Pre-selects that job automatically.
  //   - Fetches all jobs from backend.
  // -------------------------------------------------------------------------------------------
  useEffect(() => {
    const preset = searchParams.get("jobId");
    if (preset) setJobId(String(preset));  // set preselected job
    loadJobs();
    // eslint-disable-next-line
  }, []); // runs only once on mount


  // -------------------------------------------------------------------------------------------
  // FUNCTION: loadJobs()
  // -------------------------------------------------------------------------------------------
  //
  // Fetches the list of all jobs from backend API: GET /api/jobs
  // These jobs appear in the dropdown menu so user can choose one.
  // -------------------------------------------------------------------------------------------
  async function loadJobs() {
    try {
      const res = await api.get("/api/jobs");
      setJobs(res.data || []);
    } catch (err) {
      console.error("Failed to load jobs", err);
      toast.error("❌ Failed to load jobs from server. Check if backend is running.");
    }
  }


  // -------------------------------------------------------------------------------------------
  //  FUNCTION: onFileChange(e)
  // -------------------------------------------------------------------------------------------
  //
  // Triggered when user selects a file from file input.
  // Stores selected file object (for display & upload).
  // -------------------------------------------------------------------------------------------
  function onFileChange(e) {
    const f = e.target.files && e.target.files[0];
    setFile(f || null);
  }


  // -------------------------------------------------------------------------------------------
  // ⬆ FUNCTION: handleUpload(e)
  // -------------------------------------------------------------------------------------------
  //
  // Handles the resume upload process.
  // Steps:
  //   1️ Validate inputs (jobId + file)
  //   2️ Check allowed file extensions (.doc, .docx, .pdf)
  //   3️ Create FormData (multipart form)
  //   4️ POST to backend endpoint `/api/resumes/upload`
  //   5️ Show progress bar + success/failure messages
  // -------------------------------------------------------------------------------------------
  async function handleUpload(e) {
    e.preventDefault();

    // Validation checks
    if (!jobId) {
      toast.warn("⚠️ Please select a job before uploading a resume.");
      return;
    }
    if (!file) {
      toast.warn("⚠️ Please choose a resume file first.");
      return;
    }

    // File type validation
    const allowed = [".doc", ".docx", ".pdf"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error("❌ Unsupported file type. Allowed: .doc, .docx, .pdf");
      return;
    }

    // Build FormData payload (used for file uploads in HTTP)
    const fd = new FormData();
    fd.append("file", file);
    fd.append("job_id", String(jobId));

    try {
      setLoading(true);
      setProgress(0);

      // Send POST request with progress tracking
      const res = await api.post("/api/resumes/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (ev) => {
          try {
            if (ev.total)
              setProgress(Math.round((ev.loaded / ev.total) * 100)); // % progress
          } catch (_) {}
        },
      });

      // Extract IDs returned by backend
      const resumeId = res?.data?.resume_id;
      const candidateId = res?.data?.candidate_id;

      // Save upload info to state
      setLastUpload({ resumeId, candidateId, jobId });
      toast.success(`✅ Resume uploaded! ID: ${resumeId}, Linked to Job ${jobId}`);

      // Reset file input
      setFile(null);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Upload failed", err);
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "Upload failed (Check backend logs)";
      toast.error(`❌ Upload failed — ${detail}`);
    } finally {
      setLoading(false);
    }
  }


  // ===========================================================================================
  // STEP 4️: FRONTEND LAYOUT (JSX)
  // ===========================================================================================
  //
  // Displays:
  //   - Job selection dropdown
  //   - File input box
  //   - Upload & Clear buttons
  //   - Progress bar (during upload)
  //   - Confirmation card (after successful upload)
  // -------------------------------------------------------------------------------------------
  return (
    <div style={{ padding: 18 }}>
      <div className="card">
        <div className="card-title">Upload Resume</div>

        {/* ---------------- UPLOAD FORM ---------------- */}
        <form onSubmit={handleUpload} style={{ display: "grid", gap: 12 }}>
          
          {/* Select Job Dropdown */}
          <div>
            <label className="small">Link to Job (required)</label>
            <select
              className="input"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              required
            >
              <option value="">-- Select Job --</option>
              {jobs.map((j) => (
                <option key={j.job_id} value={j.job_id}>
                  {j.job_id} — {j.title}
                </option>
              ))}
            </select>
          </div>

          {/* File Upload Section */}
          <div>
            <label className="small">Resume File (accepted: .doc, .docx, .pdf)</label>
            <input
              ref={fileInputRef}
              id="resume-input"
              type="file"
              accept=".doc,.docx,.pdf"
              onChange={onFileChange}
              style={{ marginTop: 8 }}
            />
            {file && (
              <div className="file-info">
                Selected: <strong>{file.name}</strong> — {(file.size / 1024).toFixed(1)} KB
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="button-row">
            <button className="btn" type="submit" disabled={loading || !file || !jobId}>
              {loading ? "Uploading..." : "Upload Resume"}
            </button>

            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setFile(null);
                setProgress(0);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              Clear
            </button>
          </div>

          {/* Upload Progress Bar */}
          {progress > 0 && (
            <div style={{ width: "100%", marginTop: 4 }}>
              <div className="progress">
                <i style={{ width: `${progress}%` }} />
              </div>
              <div className="small" style={{ marginTop: 6 }}>{progress}% uploaded</div>
            </div>
          )}
        </form>

        {/* ---------------- SUCCESS CONFIRMATION CARD ---------------- */}
        {lastUpload && (
          <div style={{
            marginTop: 14,
            borderRadius: 10,
            padding: 12,
            background: "linear-gradient(180deg,#f7fffb,#ffffff)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700 }}>Upload Successful ✅</div>
                <div className="small" style={{ marginTop: 6 }}>
                  Resume ID: <strong>{String(lastUpload.resumeId)}</strong> • Candidate ID: <strong>{String(lastUpload.candidateId)}</strong>
                </div>
                <div className="small" style={{ marginTop: 6 }}>
                  Linked to Job ID: <span style={{ color: "var(--accent-600)", fontWeight: 700 }}>{lastUpload.jobId}</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <button
                    className="btn"
                    onClick={() => {
                      // Navigate to dashboard to view rankings for this job
                      window.location.href = `/`;
                      setTimeout(() => {
                        const select = document.querySelector("select");
                        if (select) {
                          select.value = lastUpload.jobId;
                          select.dispatchEvent(new Event("change", { bubbles: true }));
                        }
                      }, 600);
                    }}
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>

              {/* Right side - Resume ID summary */}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Uploaded</div>
                <div style={{ fontWeight: 700, fontSize: 20, color: "var(--accent)" }}>
                  {String(lastUpload.resumeId)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// =============================================================================================
//  HOW THIS COMPONENT FITS INTO THE PROJECT
// =============================================================================================
//
//  UploadJob.jsx → creates a job → redirects to UploadResume.jsx with ?jobId= in URL
//  UploadResume.jsx → uploads resume → backend extracts text & stores in database
//  Dashboard.jsx → visualizes job and candidate data (charts, rankings)
//
// Backend Route Used (FastAPI):
//   @app.post("/api/resumes/upload")
//   def upload_resume(file: UploadFile, job_id: int):
//       - Saves resume file
//       - Extracts candidate details
//       - Links candidate to job
//       - Returns resume_id and candidate_id
//
// =============================================================================================


// =============================================================================================
//  WINDOWS-SPECIFIC NOTES
// =============================================================================================
//
// ▶ Run Frontend (PowerShell):
//   cd C:\pbldbms\frontend
//   npm run dev
//   → open http://localhost:5173
//
// ▶ Run Backend (FastAPI):
//   cd C:\pbldbms\backend
//   .\venv\Scripts\Activate.ps1
//   uvicorn app.main:app --reload
//
// ▶ File Paths on Windows:
//   - Uploaded resumes are stored in backend/uploads/ directory.
//   - Each resume is renamed with a unique ID (e.g., resume_3.docx).
//
// ▶ Debugging Tips:
//   ❌ “Upload failed — ECONNREFUSED” → Backend not running.
//   ❌ “Unsupported file type” → Only .doc, .docx, or .pdf are allowed.
//   ❌ “No job selected” → Select a valid job before uploading.
//   ✅ “Upload Successful” → Resume successfully linked in database.
//
// ▶ File Upload Behavior:
//   - You can watch real-time upload percentage (progress bar).
//   - After success, "Go to Dashboard" button takes you to job overview.
//
// ▶ Windows Explorer Tip:
//   You can drag & drop resume files into this upload input if browser supports it.
//
// =============================================================================================
//
// ✅ TL;DR (BEGINNER SUMMARY):
// ---------------------------------------------------------------------------------------------
// 🟢 UploadResume.jsx lets users upload .doc/.pdf resumes for a selected job.
// 🟢 It connects to FastAPI backend at /api/resumes/upload.
// 🟢 It shows live progress and confirmation messages using React Toastify.
// 🟢 It automatically redirects user to Dashboard after success.
// 🟢 Designed to run smoothly on Windows PowerShell with Vite frontend + FastAPI backend.
// =============================================================================================
