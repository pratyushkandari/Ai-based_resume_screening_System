// frontend/src/components/Dashboard.jsx
// ==============================
// IMPORTS
// ==============================

// React hooks:
// useState → to store data (like jobs, summary)
// useEffect → runs code when component loads
import React, { useEffect, useState } from "react";

// API instance (Axios)
// Used to call backend endpoints
import api, { API_BASE_URL } from "../api";

// Charts component (for graphs)
import Charts from "./Charts";

// Modal for single candidate details
import CandidateModal from "./CandidateModal";

// Modal for comparing multiple candidates
import CompareModal from "./CompareModal";

// Toast notifications (popup messages)
import { toast } from "react-toastify";


// ==============================
// MAIN COMPONENT
// ==============================

export default function Dashboard() {

  // ==============================
  // STATE VARIABLES (DATA STORAGE)
  // ==============================

  const [jobs, setJobs] = useState([]);  
  // Stores list of jobs fetched from backend

  const [jobId, setJobId] = useState(null);  
  // Stores selected job ID

  const [summary, setSummary] = useState(null);  
  // Stores job summary (candidates, skills, charts data)

  const [loading, setLoading] = useState(false);  
  // Used to show loading state (button disabled / text change)

  const [compareIds, setCompareIds] = useState([]);  
  // Stores selected candidate IDs for comparison

  const [openCandidate, setOpenCandidate] = useState(null);  
  // Stores candidate for modal popup

  const [showCompare, setShowCompare] = useState(false);  
  // Controls compare modal visibility

  const [message, setMessage] = useState("");  
  // Optional message display


  // ==============================
  // RUN ON PAGE LOAD
  // ==============================

  useEffect(() => {
    loadJobs(); // Load jobs when page loads
  }, []);


  // ==============================
  // FUNCTION: LOAD JOBS
  // ==============================

  async function loadJobs() {
    try {
      const res = await api.get("/api/jobs"); // Call backend API
      setJobs(res.data || []); // Store jobs in state
    } catch (e) {
      toast.error("❌ Failed to load jobs"); // Show error popup
    }
  }


  // ==============================
  // FUNCTION: FETCH SUMMARY
  // ==============================

  async function fetchSummary(id) {
    if (!id) {
      setSummary(null); // If no job selected, clear summary
      return;
    }

    setLoading(true); // Start loading
    setMessage("");

    try {
      // Call backend summary API
      const res = await api.get(`/api/jobs/${Number(id)}/summary`);
      setSummary(res.data || null);
    } catch (e) {
      toast.error("❌ Failed to load summary");
      setSummary(null);
    } finally {
      setLoading(false); // Stop loading
    }
  }


  // ==============================
  // FUNCTION: GENERATE RANKINGS
  // ==============================

  async function generateRankings() {
    if (!jobId) {
      toast.warn("⚠️ Please select a job first");
      return;
    }

    setLoading(true);

    try {
      // Call backend ranking API
      await api.post(`/api/jobs/${Number(jobId)}/rank`);

      toast.success("✅ Rankings generated!");

      // Reload summary after ranking
      await fetchSummary(jobId);

    } catch (e) {
      toast.error("❌ Ranking failed");
    } finally {
      setLoading(false);
    }
  }


  // ==============================
  // FUNCTION: JOB SELECT
  // ==============================

  function onJobSelect(e) {
    const val = e.target.value;

    const numeric = val ? Number(val) : null;

    setJobId(numeric);        // Save selected job
    fetchSummary(numeric);    // Load its summary
  }


  // ==============================
  // FUNCTION: TOGGLE COMPARE
  // ==============================

  function toggleCompare(candidate_id) {
    setCompareIds((prev) =>
      prev.includes(candidate_id)
        ? prev.filter((x) => x !== candidate_id) // Remove if already selected
        : [...prev, candidate_id].slice(0, 4)    // Add (max 4 candidates)
    );
  }


  // ==============================
  // UI RENDER STARTS HERE
  // ==============================

  return (
    <div style={{ padding: 18 }}>

      {/* ==============================
          HEADER SECTION
      ============================== */}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>🤖 AI-Powered Resume Screening System</h1>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>

          {/* JOB DROPDOWN */}
          <select
            value={jobId ?? ""}
            onChange={onJobSelect}
            style={{ padding: 8, borderRadius: 8, minWidth: 260 }}
          >
            <option value="">Select a job...</option>

            {/* Loop through jobs */}
            {jobs.map((j) => (
              <option key={j.job_id} value={j.job_id}>
                {j.job_id} — {j.title}
              </option>
            ))}
          </select>

          {/* GENERATE BUTTON */}
          <button
            onClick={generateRankings}
            disabled={!jobId || loading}
            className="btn"
          >
            {loading ? "Processing..." : "Generate Rankings"}
          </button>

        </div>
      </div>


      {/* ==============================
          EMPTY STATE (NO JOB SELECTED)
      ============================== */}

      {!summary ? (
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <h2>No Job Selected</h2>
          <p>Select a job to see results</p>
        </div>

      ) : (

        <>
          {/* ==============================
              OVERVIEW SECTION
          ============================== */}

          <div style={{ marginTop: 16 }} className="card">
            <div className="card-title">Overview</div>

            <div style={{ marginTop: 8 }}>
              <Charts
                jobSkillCounts={summary.job_skill_counts || []}
                candidates={summary.candidates || []}
              />
            </div>
          </div>


          {/* ==============================
              CANDIDATES LIST
          ============================== */}

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-title">Ranked Candidates</div>

            <div style={{ marginTop: 12 }}>

              {summary.candidates.map((c) => (

                <div key={c.resume_id} className="cand-card">

                  {/* BASIC INFO */}
                  <div>
                    <strong>{c.candidate_name}</strong>
                    <div>
                      Score: {c.score.toFixed(3)}
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div>
                    <button onClick={() => setOpenCandidate(c)}>View</button>

                    <input
                      type="checkbox"
                      checked={compareIds.includes(c.candidate_id)}
                      onChange={() => toggleCompare(c.candidate_id)}
                    />

                    <a
                      href={`${API_BASE_URL}/api/resumes/${c.resume_id}/download`}
                      target="_blank"
                    >
                      Download
                    </a>
                  </div>

                </div>

              ))}

              {/* COMPARE BUTTON */}
              <button
                onClick={() => setShowCompare(true)}
                disabled={compareIds.length < 2}
              >
                Compare Selected ({compareIds.length})
              </button>

            </div>
          </div>
        </>
      )}


      {/* ==============================
          MODALS
      ============================== */}

      {/* Candidate Details Modal */}
      {openCandidate && (
        <CandidateModal
          candidate={openCandidate}
          jobSkills={summary?.job_skills || []}
          onClose={() => setOpenCandidate(null)}
        />
      )}

      {/* Compare Modal */}
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

    </div>
  );
}
