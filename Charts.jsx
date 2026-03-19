// =============================================================================================
//  FILE: frontend/src/components/Charts.jsx
// =============================================================================================
//
//  PURPOSE OF THIS FILE:
// ---------------------------------------------------------------------------------------------
// This file defines the "Charts" React component that visualizes analytical data
// from your ML-based Resume Screening System. It shows multiple interactive charts
// — all rendered dynamically based on backend data (from FastAPI).
//
// Specifically, it displays:
//   1️ A Bar chart — shows how many candidates cover each job skill.
//   2️ A Donut chart — shows distribution of candidate quality (High/Medium/Low).
//   3️ A Scatter chart — compares semantic similarity vs skill match percentage.
//   4️ A Line chart — visualizes each candidate’s skill coverage (✓ matched / ✕ missing).
//
// This file uses React + Chart.js libraries. You see these visualizations in your
// web browser when you run: `npm run dev` and open http://localhost:5173.
//
// ---------------------------------------------------------------------------------------------
//  FILE LOCATION (Windows):
// C:\pbldbms\frontend\src\components\Charts.jsx
//
// React automatically bundles this file through Vite when you run your frontend server.
// =============================================================================================


// ---------------------------------------------------------------------------------------------
//  STEP 1️: IMPORT REQUIRED LIBRARIES
// ---------------------------------------------------------------------------------------------
import React, { useMemo } from "react";  // React core library + useMemo optimization hook
import { Bar, Doughnut, Scatter, Line } from "react-chartjs-2";  // 4 chart components from react-chartjs-2 wrapper

// Import base Chart.js modules (each chart type depends on several parts of Chart.js)
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";

// ---------------------------------------------------------------------------------------------
//  REGISTER CHART COMPONENTS
// ---------------------------------------------------------------------------------------------
// Chart.js requires us to register the chart components (scales, elements, plugins)
// before we can use them. Think of this like “enabling” certain chart types.
// ---------------------------------------------------------------------------------------------
ChartJS.register(
  CategoryScale,   // x-axis (categorical)
  LinearScale,     // y-axis (numeric)
  BarElement,      // bars for bar chart
  ArcElement,      // arcs for donut chart
  PointElement,    // points for scatter and line charts
  LineElement,     // lines for line chart
  Tooltip,         // tooltip on hover
  Legend,          // chart legends
  Title            // chart titles
);


// ---------------------------------------------------------------------------------------------
//  STEP 2️: COLOR PALETTE
// ---------------------------------------------------------------------------------------------
// These are 10 pre-selected HEX color codes used to style charts consistently.
// Each candidate or dataset will automatically get one of these colors by index.
// ---------------------------------------------------------------------------------------------
const COLORS = [
  "#2563eb", "#059669", "#db2777", "#d97706", "#8b5cf6",
  "#e11d48", "#0ea5a6", "#1f2937", "#065f46", "#BE185D"
];


// ---------------------------------------------------------------------------------------------
// 🖍️ STEP 3️: FUNCTION TO CREATE CUSTOM MARKERS (✓ and ✕)
// ---------------------------------------------------------------------------------------------
// This function dynamically creates small circular icons for use as data points
// in the Line chart at the bottom of this component.
//
// It draws a small circle and places either a ✓ (tick) or ✕ (cross) symbol inside it.
// Each symbol’s color corresponds to the candidate’s assigned color.
//
// These icons are rendered into an invisible <canvas> element, then turned into an
// image that Chart.js can use for points.
// ---------------------------------------------------------------------------------------------
function createMarkerImage(char, color) {
  // Create a small HTML <canvas> to draw on
  const c = document.createElement("canvas");
  c.width = 28; // width in pixels
  c.height = 28;

  // Get drawing context
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height); // clear any old drawing

  // Draw circular background (white with transparency)
  ctx.beginPath();
  ctx.arc(c.width / 2, c.height / 2, 12, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fill();

  // Draw the ✓ or ✕ character in the center
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(char, c.width / 2, c.height / 2);

  // Convert the drawing to an image
  const img = new Image();
  img.src = c.toDataURL();
  return img;
}


// ---------------------------------------------------------------------------------------------
//  STEP 4️: DEFINE MAIN COMPONENT — Charts
// ---------------------------------------------------------------------------------------------
//
// Props received from parent (JobSummary page):
//   jobSkillCounts → array of { skill_name, matches } objects (from backend job summary)
//   candidates → array of candidate summary objects (with scores, embeddings, etc.)
//
// This component then generates four types of charts using that data.
// ---------------------------------------------------------------------------------------------
export default function Charts({ jobSkillCounts = [], candidates = [] }) {

  // -------------------------------------------------------------------------------------------
  // SKILL LABELS
  // -------------------------------------------------------------------------------------------
  // Extracts all skill names from jobSkillCounts to use as chart labels.
  // Fallback: if skill_name missing, show "—"
  // -------------------------------------------------------------------------------------------
  const skillLabels = jobSkillCounts.map(
    (s) => s.skill_name || s.skill || "—"
  );

  // -------------------------------------------------------------------------------------------
  //  PRE-CREATE TICK (✓) AND CROSS (✕) IMAGES
  // -------------------------------------------------------------------------------------------
  // useMemo ensures the function runs only once for performance.
  // These markers are used in the line chart for skill presence visualization.
  // -------------------------------------------------------------------------------------------
  const [tickImg, crossImg] = useMemo(
    () => [
      createMarkerImage("✓", "#10B981"), // green tick
      createMarkerImage("✕", "#EF4444"), // red cross
    ],
    []
  );

  // ===========================================================================================
  //  CHART 1 — BAR CHART (JOB SKILL COVERAGE)
  // ===========================================================================================
  //
  // Shows how many candidates have each skill.
  // For example: “Python – 4 candidates”, “SQL – 3 candidates”.
  // -------------------------------------------------------------------------------------------
  const barData = {
    labels: skillLabels,
    datasets: [
      {
        label: "Candidates covering skill",
        data: jobSkillCounts.map((s) => s.matches || 0),
        backgroundColor: "rgba(54,162,235,0.78)", // blue bars
      },
    ],
  };

  // Chart options — control look & behavior
  const barOptions = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
    layout: { padding: { top: 8, bottom: 8 } },
  };

  // ===========================================================================================
  //  CHART 2 — DONUT CHART (CANDIDATE QUALITY DISTRIBUTION)
  // ===========================================================================================
  //
  // Categorizes candidates based on score percentage:
  //   ≥75% = High quality
  //   50–74% = Medium
  //   <50% = Low
  // -------------------------------------------------------------------------------------------
  const qualityBuckets = useMemo(() => {
    const buckets = { high: 0, medium: 0, low: 0 };
    (candidates || []).forEach((c) => {
      const pct = (c.score || 0) * 100;
      if (pct >= 75) buckets.high++;
      else if (pct >= 50) buckets.medium++;
      else buckets.low++;
    });
    return buckets;
  }, [candidates]);

  // Donut data + configuration
  const donutData = {
    labels: ["High (≥75%)", "Medium (50–74%)", "Low (<50%)"],
    datasets: [
      {
        data: [qualityBuckets.high, qualityBuckets.medium, qualityBuckets.low],
        backgroundColor: ["#10B981", "#F59E0B", "#EF4444"], // green, yellow, red
        borderWidth: 0,
      },
    ],
  };

  const donutOptions = {
    maintainAspectRatio: false,
    responsive: true,
    cutout: "65%", // makes it a donut (inner hole)
    plugins: {
      legend: {
        position: "top",
        labels: { boxWidth: 14, color: "#111", font: { size: 12, weight: "500" } },
      },
      tooltip: {
        callbacks: {
          label: function (ctx) {
            const val = ctx.raw || 0;
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0) || 1;
            const pct = Math.round((val / total) * 100);
            return `${ctx.label}: ${val} (${pct}%)`;
          },
        },
      },
    },
    layout: { padding: 8 },
  };

  // ===========================================================================================
  //  CHART 3 — SCATTER CHART (SEMANTIC VS SKILL-MATCH)
  // ===========================================================================================
  //
  // Each dot = one candidate.
  // X-axis = semantic similarity (%)
  // Y-axis = skill-match (%)
  // Helps visualize balance between understanding (semantic) and technical fit (skills).
  // -------------------------------------------------------------------------------------------
  const scatterDatasets = (candidates || []).map((c, idx) => {
    const color = COLORS[idx % COLORS.length];
    const semanticPct = Math.round((c.semantic || 0) * 100);
    const skillPct = Math.round((c.skill_score || 0) * 100);
    const size = Math.max(6, Math.min(12, 6 + Math.round((c.score || 0) * 6)));
    return {
      label: c.candidate_name || `Cand ${c.candidate_id}`,
      data: [{ x: semanticPct, y: skillPct }],
      backgroundColor: color,
      pointRadius: size,
      pointHoverRadius: size + 3,
    };
  });

  const scatterData = { datasets: scatterDatasets };
  const scatterOptions = {
    maintainAspectRatio: false,
    responsive: true,
    scales: {
      x: { title: { display: true, text: "Semantic (%)" }, min: 0, max: 100 },
      y: { title: { display: true, text: "Skill-match (%)" }, min: 0, max: 100 },
    },
  };

  // ===========================================================================================
  //  CHART 4 — LINE CHART (SKILL PRESENCE LINES)
  // ===========================================================================================
  //
  // Each line = one candidate.
  // Each point = ✓ (skill present) or ✕ (missing).
  // Shows which candidates cover which job skills.
  // -------------------------------------------------------------------------------------------
  const lineDatasets = (candidates || []).map((cand, idx) => {
    const color = COLORS[idx % COLORS.length];
    const data = (cand.coverage_vector || []).map((v) => (v ? 1 : 0));
    return {
      label: cand.candidate_name || `Candidate ${cand.candidate_id}`,
      data,
      borderColor: color,
      borderWidth: 2,
      tension: 0.25, // smooth curve
      showLine: true,
      fill: false,
      pointStyle: function (ctx) {
        const v = ctx.raw;
        return v === 1 ? tickImg : crossImg; // ✓ if skill matched, ✕ if missing
      },
      pointRadius: 10,
      pointHoverRadius: 12,
    };
  });

  const lineData = { labels: skillLabels, datasets: lineDatasets };
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" } },
    scales: {
      x: { ticks: { autoSkip: false } },
      y: {
        min: -0.2,
        max: 1.2,
        ticks: {
          stepSize: 1,
          callback: (v) => (v === 1 ? "✓" : v === 0 ? "✕" : ""),
        },
      },
    },
  };

  // ===========================================================================================
  //  STEP 5️: RETURN THE JSX LAYOUT
  // ===========================================================================================
  //
  // Uses CSS grid to layout all charts neatly:
  //   - Left: Bar chart
  //   - Right: Donut + Scatter
  //   - Bottom: Line chart
  // -------------------------------------------------------------------------------------------
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 400px",
          gap: 12,
          alignItems: "start",
        }}
      >
        {/* LEFT COLUMN → BAR CHART */}
        <div
          style={{
            background: "#fff",
            padding: 14,
            borderRadius: 8,
            height: 340,
          }}
        >
          <h4 style={{ marginTop: 0 }}>Job Skill Coverage</h4>
          <div style={{ height: "280px" }}>
            {skillLabels.length ? (
              <Bar data={barData} options={barOptions} />
            ) : (
              <div style={{ color: "#666" }}>No job skills defined.</div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN → DONUT + SCATTER */}
        <div style={{ display: "grid", gridTemplateRows: "220px 260px", gap: 12 }}>
          {/* Donut Chart */}
          <div style={{ background: "#fff", padding: 12, borderRadius: 8 }}>
            <h4 style={{ marginTop: 0 }}>Candidate Quality</h4>
            <div style={{ width: "100%", height: 150 }}>
              <Doughnut data={donutData} options={donutOptions} />
            </div>
          </div>

          {/* Scatter Chart */}
          <div style={{ background: "#fff", padding: 12, borderRadius: 8 }}>
            <h4 style={{ marginTop: 0 }}>Semantic vs Skill-match</h4>
            <div style={{ height: 200 }}>
              <Scatter data={scatterData} options={scatterOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION → LINE CHART */}
      <div style={{ background: "#fff", padding: 12, borderRadius: 8, minHeight: 200 }}>
        <h4 style={{ marginTop: 0 }}>Skill Presence Lines</h4>
        <div style={{ color: "#666", marginBottom: 8, fontSize: 13 }}>
          Each colored line = a candidate. Hover points to see details (✓ matched, ✕ missing).
        </div>

        {skillLabels.length && candidates.length ? (
          <div style={{ height: 300 }}>
            <Line data={lineData} options={lineOptions} />
          </div>
        ) : (
          <div style={{ color: "#666" }}>No skill vector data available.</div>
        )}
      </div>
    </div>
  );
}

// =============================================================================================
//  HOW THIS FILE FITS INTO THE PROJECT
// =============================================================================================
//
// Used inside: frontend/src/pages/JobSummary.jsx
// JobSummary fetches job + candidate data from backend and passes it here:
//   <Charts jobSkillCounts={jobSummary.job_skill_counts} candidates={jobSummary.candidates} />
//
// Chart data comes from FastAPI backend (main.py → job_summary endpoint).
//
// - Backend sends skill names + match counts + candidate stats
// - Charts.jsx visualizes them in real time in your browser.
// =============================================================================================


// =============================================================================================
//  WINDOWS-SPECIFIC NOTES (BEGINNER-FRIENDLY)
// =============================================================================================
//
//  Run the frontend (in PowerShell):
//   cd C:\pbldbms\frontend
//   npm run dev
//   → Open browser at http://localhost:5173
//
//  Dependencies (auto-installed by npm):
//   react, react-dom, react-chartjs-2, chart.js
//
//  Troubleshooting:
//   - If chart not showing → run: npm install chart.js react-chartjs-2
//   - If blank screen → open browser DevTools (F12) → “Console” → check for red errors.
//
//  Hot Reloading:
//   - When you save this file (Ctrl + S), Vite automatically updates the page in your browser.
//
//  Tip:
//   - You can adjust chart heights (height: 340, 300, etc.) if they don’t fit your screen.
//   - All charts are responsive, meaning they resize automatically on window resize.
//
// =============================================================================================
//
//  IN SHORT
// ---------------------------------------------------------------------------------------------
// This component takes raw numerical data from backend and turns it into visual insights:
//   ✔ Bar chart → Skill coverage among candidates.
//   ✔ Donut chart → Quality distribution (High/Medium/Low).
//   ✔ Scatter chart → Relationship between semantic and skill scores.
//   ✔ Line chart → Detailed skill-by-skill coverage per candidate.
//
// These visuals help you instantly understand which candidates fit the job best.
//
// =============================================================================================
