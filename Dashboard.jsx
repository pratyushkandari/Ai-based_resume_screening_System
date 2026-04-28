import React, { useEffect, useState } from "react";
import api, { API_BASE_URL } from "../api";
import Charts from "./Charts";
import CandidateModal from "./CandidateModal";
import CompareModal from "./CompareModal";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {

const navigate = useNavigate();

const [jobs, setJobs] = useState([]);
const [jobId, setJobId] = useState(null);
const [summary, setSummary] = useState(null);
const [loading, setLoading] = useState(false);
const [compareIds, setCompareIds] = useState([]);
const [openCandidate, setOpenCandidate] = useState(null);
const [showCompare, setShowCompare] = useState(false);
const [message, setMessage] = useState("");

useEffect(() => {
  loadJobs();
}, []); // ✅ FIXED

async function loadJobs() {
  try {
    const raw_user_id = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");

    const user_id = Number(raw_user_id);

    // ✅ HARD VALIDATION
    if (!raw_user_id || !role || isNaN(user_id) || user_id <= 0) {
      toast.error("❌ Invalid user session. Please login again.");
      localStorage.clear();   // 🔥 ADD THIS
      navigate("/login");
      return;
    }

    const res = await api.get("/api/jobs", {
      params: {
        user_id: user_id,
        role: role
      }
    });

    setJobs(res.data || []);
  } catch (e) {
    toast.error("❌ Failed to load jobs");
  }
}
async function fetchSummary(id) {
  if (!id) {
    setSummary(null);
    return;
  }

  setLoading(true);
  setMessage("");

  try {
    const raw_user_id = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");

    const user_id = Number(raw_user_id);

    // ✅ SAME VALIDATION HERE (VERY IMPORTANT)
    if (!raw_user_id || !role || isNaN(user_id) || user_id <= 0) {
      toast.error("❌ Session expired. Please login again.");
      localStorage.clear();
      navigate("/login");
      return;
    }

    const res = await api.get(`/api/jobs/${Number(id)}/summary`, {
      params: {
        user_id: user_id,
        role: role
      }
    });

    setSummary(res.data || null);

  } catch (e) {
    toast.error("❌ Failed to load summary");
    setSummary(null);
  } finally {
    setLoading(false);
  }
}

async function generateRankings() {
if (!jobId) {
toast.warn("⚠️ Please select a job first");
return;
}
setLoading(true);
try {
await api.post(`/api/jobs/${Number(jobId)}/rank`);
toast.success("✅ Rankings generated!");
await fetchSummary(jobId);
} catch (e) {
toast.error("❌ Ranking failed");
} finally {
setLoading(false);
}
}

function onJobSelect(e) {
const val = e.target.value;
const numeric = val ? Number(val) : null;
setJobId(numeric);
fetchSummary(numeric);
}

function toggleCompare(candidate_id) {
  setCompareIds((prev) => {
    let updated;

    if (prev.includes(candidate_id)) {
      updated = prev.filter((x) => x !== candidate_id);
    } else {
      updated = [...prev, candidate_id]
    }



    return updated;
  });
}

return (
<div style={{ padding: 18 }}>

  {/* HEADER */}
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <h1>🤖 AI-Based Resume Matching and Ranking System</h1>

    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <select
        value={jobId ?? ""}
        onChange={onJobSelect}
        style={{ padding: 8, borderRadius: 8, minWidth: 260 }}
      >
        <option value="">Select a job...</option>
        {jobs.map((j) => (
          <option key={j.job_id} value={j.job_id}>
            {j.job_id} — {j.title}
          </option>
        ))}
      </select>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={generateRankings}
          disabled={!jobId || loading}
          className="btn"
        >
          {loading ? "Processing..." : "Generate Rankings"}
        </button>


        <button
          onClick={() => navigate("/upload-job")}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            background: "#16a34a",
            color: "#fff",
            cursor: "pointer"
          }}
        >
          ➕ Upload Job
        </button>
      </div>

    </div>
  </div>

  {message && (
    <div style={{ marginTop: 10, color: "#2b6cb0" }}>{message}</div>
  )}

  {!summary ? (
    <div
      style={{
        marginTop: 24,
        borderRadius: 16,
        padding: 30,
        textAlign: "center",
        background: "linear-gradient(135deg, #f8fafc, #eef2ff)",
        border: "1px solid #e2e8f0",
        boxShadow: "0 10px 25px rgba(0,0,0,0.05)"
      }}
    >
      <div style={{ fontSize: 40 }}>📊</div>
      <h2 style={{ margin: "10px 0" }}>No Job Selected</h2>
      <p style={{ color: "#64748b", fontSize: 14 }}>
        Select a job to view candidate rankings, skill insights, and AI-based analysis.
      </p>
    </div>
  ) : (
    <>
      {/* OVERVIEW */}
      <div style={{ marginTop: 16 }} className="card">
        <div className="card-title">Overview</div>

        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{summary.title}</div>
              <div className="small">
                Job ID: {summary.job_id} • {summary.job_skills?.length || 0} skills
              </div>
            </div>

            <div>
              <div className="small">Top Skills</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[...(summary.job_skill_counts || [])]
                  .sort((a, b) => (b.matches || 0) - (a.matches || 0))
                  .slice(0, 5)
                  .map((s) => (
                    <div key={s.skill_name} className="chip matched">
                      {s.skill_name} • {s.matches}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <Charts
            jobSkillCounts={summary.job_skill_counts || []}
            candidates={summary.candidates || []}
          />
        </div>
      </div>

      {/* CANDIDATES */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">Ranked Candidates</div>

        <div className="card-grid">
          {(summary.candidates || []).map((c) => (
            <div key={`${c.resume_id}-${c.candidate_id}`} className="cand-card">

              <div className="cand-header">
                <div>
                  <div className="cand-title">
                    {c.candidate_name || `#${c.candidate_id}`}
                  </div>

                  <div className="cand-meta">
                    Score: <strong>{(c.score ?? 0).toFixed(3)}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button onClick={() => setOpenCandidate(c)} className="btn secondary">
                    View
                  </button>
                  {/* ✅ ADD THIS BUTTON */}
<button
  onClick={() => toggleCompare(c.candidate_id)}
  className="btn ghost"
  style={{
    background: compareIds.includes(c.candidate_id) ? "#e0f2fe" : "",
    border: compareIds.includes(c.candidate_id) ? "1px solid #0284c7" : ""
  }}
>
  {compareIds.includes(c.candidate_id) ? "✓ Selected" : "Compare"}
</button>

                  {/* ✅ FIXED: USE BACKEND STATUS */}
                  <div style={{
                    marginTop: 8,
                    padding: "6px 10px",
                    borderRadius: 6,
                    background: c.status === "accepted" ? "#dcfce7" : "#fee2e2",
                    color: c.status === "accepted" ? "#166534" : "#991b1b",
                    fontWeight: "bold",
                    textAlign: "center"
                  }}>
                    {c.status === "accepted" ? "✅ Accepted" : "❌ Rejected"}
                  </div>

                  <a
                    href={`${API_BASE_URL}/api/resumes/${c.resume_id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download
                  </a>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div><b>Matched:</b> {c.matched_skills.join(", ")}</div>
                <div><b>Missing:</b> {c.missing_skills.join(", ")}</div>
              </div>

            </div>
          ))}
        </div>
      </div>
    </>
  )}

  {openCandidate && (
    <CandidateModal
      candidate={openCandidate}
      jobSkills={summary?.job_skills || []}
      onClose={() => setOpenCandidate(null)}
    />
  )}

  {showCompare && (
    <CompareModal
      ids={compareIds}
      jobId={jobId}
      onClose={() => {
        setShowCompare(false);
        setCompareIds([]);
      }}
    />
  )}
{compareIds.length > 0 && (
  <div
    style={{
      position: "fixed",
      bottom: 20,
      left: "50%",
      transform: "translateX(-50%)",
      background: "#1e293b",
      color: "#fff",
      padding: "12px 20px",
      borderRadius: 12,
      boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
      display: "flex",
      gap: 12,
      alignItems: "center",
      zIndex: 1000
    }}
  >
    <span>{compareIds.length} selected</span>

    <button
      onClick={() => setShowCompare(true)}
      disabled={compareIds.length < 2}
      style={{
        padding: "6px 12px",
        borderRadius: 6,
        border: "none",
        background: compareIds.length < 2 ? "#94a3b8" : "#22c55e",
        color: "#fff",
        cursor: compareIds.length < 2 ? "not-allowed" : "pointer"
      }}
    >
      Compare
    </button>

    <button
      onClick={() => setCompareIds([])}
      style={{
        padding: "6px 12px",
        borderRadius: 6,
        border: "none",
        background: "#ef4444",
        color: "#fff",
        cursor: "pointer"
      }}
    >
      Clear
    </button>
  </div>
)}
</div>
);
}
