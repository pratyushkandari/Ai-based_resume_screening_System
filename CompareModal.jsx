// =============================================================================================
//  FILE: frontend/src/components/CompareModal.jsx
// =============================================================================================
//
//  PURPOSE OF THIS FILE (BEGINNER-FRIENDLY EXPLANATION):
// ---------------------------------------------------------------------------------------------
// This React component creates a popup window — called a **modal** — that appears
// on top of the main application when you want to **compare multiple candidates**
// for a particular job.
//
// In your ML Resume Screening System:
//   - You upload resumes to backend (FastAPI).
//   - Backend extracts info & calculates scores.
//   - You select multiple candidates in the frontend.
//   - When you click “Compare”, THIS COMPONENT opens a modal window
//     showing detailed visual comparisons of those candidates.
//
// You will see inside this modal:
//    Candidate names, scores, matched & missing skills.
//    Small circular “radar” charts that visualize each candidate’s skill coverage.
//    One “stacked bar chart” comparing matched vs missing skills for all candidates.
//
// ---------------------------------------------------------------------------------------------
//  Works together with:
//   - CompareModal.css   → handles visual design of the modal
//   - api.js              → handles API calls to FastAPI backend
//   - Chart.js libraries → render radar & bar charts
// ---------------------------------------------------------------------------------------------
//  WINDOWS PATH (for your setup):
//   C:\pbldbms\frontend\src\components\CompareModal.jsx
//
//  Runs automatically when you start frontend with PowerShell:
//   cd C:\pbldbms\frontend
//   npm run dev
//   → Open http://localhost:5173 in browser
//
// =============================================================================================


// ---------------------------------------------------------------------------------------------
//  STEP 1️: IMPORT ALL REQUIRED LIBRARIES
// ---------------------------------------------------------------------------------------------
import React, { useEffect, useState } from "react";  // React + Hooks for state & lifecycle mgmt
import api from "../api";                           // Pre-configured Axios instance for backend
import { Radar, Bar } from "react-chartjs-2";       // Chart components to render data visualizations

// Import core building blocks of Chart.js used to draw radar & bar charts
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";

//  Import CSS file to apply layout, colors, modal styles defined separately
import "./CompareModal.css";


// ---------------------------------------------------------------------------------------------
//  STEP 2️: REGISTER CHART COMPONENTS WITH Chart.js
// ---------------------------------------------------------------------------------------------
// Chart.js is modular — you must “register” every chart type or feature you plan to use.
// Here we register all needed chart types (Radar & Bar) and utilities (Tooltip, Legend, etc.)
// so they’re available globally throughout your app.
// ---------------------------------------------------------------------------------------------
ChartJS.register(
  RadialLinearScale, // circular coordinate grid for radar
  PointElement,      // dots in charts
  LineElement,       // lines connecting points in radar
  Filler,            // color filling under radar area
  Tooltip,           // tooltips on hover
  Legend,            // chart legend display
  CategoryScale,     // x-axis labels for bar chart
  LinearScale,       // y-axis numerical values
  BarElement         // bars for bar chart
);


// ---------------------------------------------------------------------------------------------
// STEP 3️: DEFINE CONSISTENT COLOR PALETTE
// ---------------------------------------------------------------------------------------------
// Each candidate gets one color. Same palette is used in all frontend visualizations.
// HEX = web color format (e.g., "#2563eb" is blue). These help differentiate candidates visually.
// ---------------------------------------------------------------------------------------------
const COLORS = [
  "#2563eb", "#059669", "#db2777", "#d97706",
  "#8b5cf6", "#e11d48", "#0ea5a6", "#1f2937",
  "#065f46", "#BE185D"
];


// ---------------------------------------------------------------------------------------------
// 🖍️ STEP 4️: COLOR CONVERSION HELPER (HEX → RGBA)
// ---------------------------------------------------------------------------------------------
// Converts solid colors to transparent versions for radar chart background fills.
// Example usage: hexToRGBA("#2563eb", 0.3) → "rgba(37,99,235,0.3)"
// ---------------------------------------------------------------------------------------------
function hexToRGBA(hex, alpha = 1) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}


// =============================================================================================
// 🧩 STEP 5️: MAIN COMPONENT — CompareModal()
// =============================================================================================
//
// Props (data passed from parent component JobSummary.jsx):
//   - ids:   array of selected candidate IDs
//   - jobId: current job’s unique ID
//   - onClose: callback function triggered when user clicks “Close”
//
// This component:
//   1️Fetches candidate comparison data from FastAPI backend.
//   2️ Displays summary + charts inside modal.
//   3️ Allows closing the modal safely.
//
// ---------------------------------------------------------------------------------------------
export default function CompareModal({ ids = [], jobId = null, onClose }) {

  // -------------------------------------------------------------------------------------------
  //  STATE VARIABLES (React’s useState)
  // -------------------------------------------------------------------------------------------
  const [loading, setLoading] = useState(false);    // “true” while data is loading
  const [candidates, setCandidates] = useState([]); // stores selected candidates’ info
  const [jobSkills, setJobSkills] = useState([]);   // stores list of job-required skills


  // -------------------------------------------------------------------------------------------
  //  STEP 6️: FETCH DATA FROM BACKEND WHEN MODAL OPENS
  // -------------------------------------------------------------------------------------------
  //
  // - Runs automatically when `jobId` or `ids` change (useEffect dependency).
  // - Calls backend endpoint `/api/jobs/{jobId}/summary` using Axios (api.get).
  // - Extracts candidates and job skills.
  // - Filters out only candidates user selected for comparison.
  // -------------------------------------------------------------------------------------------
  useEffect(() => {
    if (!jobId || !ids?.length) {
      setCandidates([]); // reset if no selection
      return;
    }

    // Immediately invoked async function
    (async () => {
      setLoading(true); // start loader
      try {
        // Fetch summary data from backend
        const res = await api.get(`/api/jobs/${jobId}/summary`);
        const all = res.data?.candidates || [];
        setJobSkills(res.data?.job_skills || []);

        // Only include selected candidates
        const pick = all.filter(c => ids.includes(c.candidate_id));
        setCandidates(pick);

      } catch (e) {
        console.error("Compare fetch error", e);
        setCandidates([]); // fallback to empty
      } finally {
        setLoading(false); // stop loader
      }
    })();
  }, [ids, jobId]);


  // -------------------------------------------------------------------------------------------
  // SAFETY CHECK
  // -------------------------------------------------------------------------------------------
  // If no candidates are selected, there’s no reason to render the modal — return nothing.
  if (!ids?.length) return null;


  // ===========================================================================================
  //  STEP 7️: CREATE STACKED BAR CHART DATA
  // ===========================================================================================
  //
  // The stacked bar chart shows total number of matched vs missing skills for each candidate.
  // Two bars stacked vertically:
  //   🟩 Green bar = matched skills
  //   🟥 Red bar = missing skills
  // -------------------------------------------------------------------------------------------
  const barData = {
    labels: candidates.map(c => c.candidate_name),
    datasets: [
      {
        label: "Matched",
        data: candidates.map(c => (c.matched_skills || []).length),
        backgroundColor: "#4caf50",
        stack: "a"
      },
      {
        label: "Missing",
        data: candidates.map(c => (c.missing_skills || []).length),
        backgroundColor: "#f44336",
        stack: "a"
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }
    },
    plugins: { legend: { position: "top" } }
  };


  // ===========================================================================================
  //  STEP 8️: RENDER MODAL STRUCTURE (HTML + JSX)
  // ===========================================================================================
  //
  // The structure includes:
  //   - .cm-backdrop: dark overlay background
  //   - .cm-modal: white modal box
  //   - Header: title + close button
  //   - Candidate summaries
  //   - Charts section (Radar grid + Bar)
  // -------------------------------------------------------------------------------------------
  return (
    <div className="cm-backdrop">
      <div className="cm-modal">
        {/* ---------------- HEADER ---------------- */}
        <div className="cm-header">
          <h3>Compare Candidates</h3>
          <button className="cm-close" onClick={onClose}>Close</button>
        </div>

        {/* ---------------- MAIN CONTENT ---------------- */}
        {loading ? (
          <div style={{ padding: 12 }}>Loading...</div>
        ) : (
          <>
            {/* -----------------------------------------------------------
                🧾 CANDIDATE SUMMARY CARDS
               ----------------------------------------------------------- */}
            <div className="cm-summary">
              {candidates.map((c) => (
                <div key={c.candidate_id} className="cm-card">
                  <div style={{ fontWeight: 700 }}>{c.candidate_name}</div>
                  <div style={{ marginTop: 6, fontSize: 13 }}>
                    Score: {c.score} — Coverage {c.coverage_percent}%
                  </div>

                  {/* Matched Skills Section */}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>Matched:</div>
                    <div style={{ marginTop: 6 }}>
                      {(c.matched_skills || []).length
                        ? c.matched_skills.map(s => (
                            <span key={s} className="chip matched">{s}</span>
                          ))
                        : <span style={{ color: "#777" }}>—</span>}
                    </div>
                  </div>

                  {/* Missing Skills Section */}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>Missing:</div>
                    <div style={{ marginTop: 6 }}>
                      {(c.missing_skills || []).length
                        ? c.missing_skills.map(s => (
                            <span key={s} className="chip missing">{s}</span>
                          ))
                        : <span style={{ color: "#777" }}>—</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* -----------------------------------------------------------
                📊 CHARTS SECTION
               ----------------------------------------------------------- */}
            <div className="cm-charts-row">

              {/* LEFT: RADAR CHARTS FOR EACH CANDIDATE */}
              <div className="cm-radar-grid">
                {candidates.map((c, idx) => {
                  const color = COLORS[idx % COLORS.length];

                  const radarData = {
                    labels: jobSkills,
                    datasets: [
                      {
                        label: c.candidate_name,
                        data: c.coverage_vector || jobSkills.map(() => 0),
                        backgroundColor: hexToRGBA(color, 0.18),
                        borderColor: hexToRGBA(color, 0.9),
                        borderWidth: 1
                      }
                    ]
                  };

                  const radarOptions = {
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                      r: {
                        ticks: {
                          display: false,
                          stepSize: 1,
                          beginAtZero: true,
                          max: 1
                        },
                        grid: { color: "rgba(0,0,0,0.04)" }
                      }
                    }
                  };

                  return (
                    <div key={c.candidate_id} className="cm-radar-card">
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>
                        {c.candidate_name}
                      </div>
                      <div style={{ height: 180 }}>
                        <Radar data={radarData} options={radarOptions} />
                      </div>
                      <div style={{ marginTop: 8, fontSize: 12, color: "#444" }}>
                        Matched: {(c.matched_skills || []).length} •
                        Missing: {(c.missing_skills || []).length}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* RIGHT: STACKED BAR CHART (Matched vs Missing) */}
              <div className="cm-bar-box">
                <h4 style={{ marginTop: 0 }}>Matched vs Missing (stacked)</h4>
                <div style={{ height: 320 }}>
                  <Bar data={barData} options={barOptions} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


// =============================================================================================
//  HOW THIS COMPONENT CONNECTS TO THE REST OF YOUR PROJECT
// =============================================================================================
//
//  Parent Component: JobSummary.jsx
// When user selects multiple candidates, JobSummary opens this modal like:
//   <CompareModal ids={selectedIds} jobId={job.id} onClose={() => setShowModal(false)} />
//
//  Backend (FastAPI):
//   Endpoint `/api/jobs/{job_id}/summary` in backend/app/main.py sends job + candidate data.
//   This React component consumes that data via Axios (`api.get(...)`).
//
//  Styles:
//   The appearance (overlay, rounded corners, chips, etc.) is defined in CompareModal.css.
// =============================================================================================


// =============================================================================================
//  WINDOWS-SPECIFIC INSTRUCTIONS & TIPS
// =============================================================================================
//
//  RUN FRONTEND SERVER (PowerShell):
//   cd C:\pbldbms\frontend
//   npm run dev
//   → open http://localhost:5173
//
//  LIVE UPDATING (Vite Hot Reload):
//   Save this file (Ctrl + S) → Browser auto-refreshes instantly.
//
//  DEPENDENCIES:
//   Make sure these are installed:
//     npm install chart.js react-chartjs-2 axios
//
//  TROUBLESHOOTING ON WINDOWS:
//   🟥 “Compare fetch error” in browser console → Backend not running or wrong jobId.
//   🟧 Modal won’t close → check `onClose` prop is passed correctly.
//   🟨 Blank chart → data may be missing from backend (check FastAPI logs).
//   🟩 Everything blank → reload http://127.0.0.1:8000/docs and verify API works.
//
//  VISUAL CUSTOMIZATION:
//   - Edit CompareModal.css → `.cm-modal { max-width: 1200px; }` to resize popup.
//   - Change radar chart height: `height: 180 → 220`.
//   - Change chip colors or text fonts freely; save to auto-refresh.
//
// =============================================================================================
//
//  TL;DR (BEGINNER SUMMARY):
// ---------------------------------------------------------------------------------------------
// 🟢 This component pops up when comparing candidates.
// 🟢 It fetches comparison data from backend.
// 🟢 It shows skill matches visually (radar + bar charts).
// 🟢 It closes safely with “Close” button.
// 🟢 It’s styled by CompareModal.css and updates live on save.
// 🟢 It runs perfectly on Windows PowerShell with `npm run dev`.
//
// Understanding this file gives you full insight into how frontend visualizes backend ML data! 🚀
// =============================================================================================
