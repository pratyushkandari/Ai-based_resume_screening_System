
import React, { useState, useEffect, useRef } from "react"; // React + hooks for state, effects, and DOM refs
import api from "../api";                                  // Axios instance for backend API requests
import { toast } from "react-toastify";                    // Popup messages for user feedback
import { useSearchParams } from "react-router-dom";        // To read ?jobId= query from URL



export default function UploadResume() {


  const [file, setFile] = useState(null);             // stores the selected resume file
  const [jobId, setJobId] = useState("");             // ID of job selected from dropdown
  const [jobs, setJobs] = useState([]);               // list of available jobs (fetched from backend)
  const [loading, setLoading] = useState(false);      // upload loading flag (to disable buttons)
  const [progress, setProgress] = useState(0);        // upload progress percentage
  const [lastUpload, setLastUpload] = useState(null); // stores info of last successful upload
  const fileInputRef = useRef(null);                  // reference to the HTML <input type="file" />
  const [searchParams] = useSearchParams();           // read jobId from URL (e.g., ?jobId=3)


  useEffect(() => {
    const preset = searchParams.get("jobId");
    if (preset) setJobId(String(preset));  // set preselected job
    loadJobs();
    // eslint-disable-next-line
  }, []); // runs only once on mount



async function loadJobs() {
  try {
    const raw_user_id = localStorage.getItem("user_id");
    const role = (localStorage.getItem("role") || "").toLowerCase().trim();

    const user_id = Number(raw_user_id);

    // ✅ STRICT VALIDATION
    if (!raw_user_id || isNaN(user_id) || user_id <= 0) {
      toast.error("❌ Invalid session. Please login again.");
      return;
    }

    // ✅ CALL API WITH REQUIRED PARAMS
    const res = await api.get("/api/jobs", {
      params: {
        user_id: user_id,
        role: role
      }
    });

    setJobs(res.data || []);

  } catch (err) {
    console.error("Failed to load jobs", err);
    toast.error("❌ Failed to load jobs from server.");
  }
}



  function onFileChange(e) {
    const f = e.target.files && e.target.files[0];
    setFile(f || null);
  }


 
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

