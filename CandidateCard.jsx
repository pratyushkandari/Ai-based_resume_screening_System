// =============================================================================================
//  FILE: frontend/src/components/CandidateCard.jsx
// =============================================================================================
//  PURPOSE OF THIS FILE:
// ---------------------------------------------------------------------------------------------
// This React component is responsible for displaying ONE candidate's information on the frontend.
// It is used in the ML-Based Resume Screening System web UI (React + FastAPI + PostgreSQL project).
//
// When you view the job ranking results in your frontend browser (http://localhost:5173/),
// each candidate's details — such as name, ID, and score — are shown using this component.
//
// In short:
//  It receives candidate data (from backend API).
//  It formats that data visually.
//  It displays a simple card for each candidate.
//
// ---------------------------------------------------------------------------------------------
//  FILE LOCATION (WINDOWS PATH):
// C:\pbldbms\frontend\src\components\CandidateCard.jsx
//
//  “src” folder → contains all the React source code (not configuration or build files)
//  “components” folder → holds reusable UI building blocks (like cards, forms, lists)
//  “CandidateCard.jsx” → this file defines a single component to display one candidate.
//
// ---------------------------------------------------------------------------------------------
//  THIS FILE IS WRITTEN IN JSX (JavaScript + XML-like syntax).
// JSX allows you to write HTML-like tags inside JavaScript code. React converts it into HTML
// dynamically inside the browser. It is not pure HTML, but React syntax that gets compiled.
//
// For Windows users: Don’t worry — no special setup is needed beyond `npm install`.
// Your Vite + React dev server automatically understands JSX.
// =============================================================================================


// ---------------------------------------------------------------------------------------------
//  STEP 1️: IMPORTING REACT
// ---------------------------------------------------------------------------------------------
// This line imports React, which is necessary for using JSX syntax and creating components.
//
// NOTE (React 18+): In newer versions of React, you *could* omit this import because Vite or Babel
// automatically adds it behind the scenes — but keeping it here is good practice, especially for beginners.
// ---------------------------------------------------------------------------------------------
import React from "react";


// ---------------------------------------------------------------------------------------------
// STEP 2️: DEFINING THE FUNCTIONAL COMPONENT
// ---------------------------------------------------------------------------------------------
// We define a React component called CandidateCard.
//
// “export default function CandidateCard({ r }) { ... }” means:
// - export default → allows this component to be imported in other files (e.g., JobSummary.jsx)
// - function CandidateCard → declares a normal JavaScript function
// - ({ r }) → this is called *object destructuring*
//   It means we are receiving a prop named “r” from the parent component.
//
// What is a “prop”? (short for “property”)
// Props are values passed *into* a component by its parent (similar to parameters in a function).
// In our case, each “r” is a single candidate result fetched from the backend ranking API.
//
// Example of what “r” might look like (from backend):
// {
//   "candidate_id": 5,
//   "candidate_name": "Ravi Sharma",
//   "score": 0.88342
// }
// ---------------------------------------------------------------------------------------------
export default function CandidateCard({ r }) {

  // -------------------------------------------------------------------------------------------
  //  STEP 3️: RETURNING THE JSX TEMPLATE
  // -------------------------------------------------------------------------------------------
  // In React, every component must return some JSX — this is what appears on screen.
  // The return() block below defines what the card looks like for each candidate.
  //
  // We are using inline styles here (simple CSS inside a JavaScript object).
  // Style object: { border: "1px solid #ddd", padding: 8, marginBottom: 8 }
  //
  // These styles are applied directly to the <div> element — this means:
  //   - Thin gray border (#ddd)
  //   - Padding of 8px (space inside the card)
  //   - MarginBottom of 8px (space between stacked cards)
  //
  // This makes each candidate card neatly separated and easy to read.
  // -------------------------------------------------------------------------------------------
  return (
    <div
      style={{
        border: "1px solid #ddd",
        padding: 8,
        marginBottom: 8,
      }}
    >

      {/* -----------------------------------------------------------------------------
        🧩 INNER CONTENT OF THE CARD
        -----------------------------------------------------------------------------
        Inside this outer <div>, we create two small sections:
        1️ Candidate Name and ID
        2️ Candidate Score
      ----------------------------------------------------------------------------- */}

      {/* -----------------------------------------------------------------------------
        🔹 LINE 1 — CANDIDATE NAME AND ID
        -----------------------------------------------------------------------------
        <div><strong>{r.candidate_name}</strong> (ID: {r.candidate_id})</div>

        - <div> → Basic HTML container element.
        - <strong> → Makes text bold.
        - {r.candidate_name} → Dynamically inserts the candidate’s name from data.
        - {r.candidate_id} → Inserts the candidate’s numeric ID from backend.

        These curly braces { } tell React to insert a JavaScript expression inside JSX.

        Example result on screen:
          Ravi Sharma (ID: 5)
      ----------------------------------------------------------------------------- */}
      <div>
        <strong>{r.candidate_name}</strong> (ID: {r.candidate_id})
      </div>

      {/* -----------------------------------------------------------------------------
        🔹 LINE 2 — CANDIDATE SCORE
        -----------------------------------------------------------------------------
        <div>Score: {r.score.toFixed(3)}</div>

        - “r.score” is the candidate’s matching score calculated by ML model (between 0 and 1).
        - .toFixed(3) formats it to 3 decimal places for cleaner display.
          For example:
          0.883423 → 0.883
          0.9275632 → 0.928

        Why show 3 decimals?
        - It’s precise enough to show difference in ranking without clutter.
        - It helps HR users compare candidates easily.

        Example result on screen:
          Score: 0.883
      ----------------------------------------------------------------------------- */}
      <div>
        Score: {r.score.toFixed(3)}
      </div>
    </div>
  );
}


// =============================================================================================
// 🧩 HOW THIS FILE CONNECTS TO THE REST OF YOUR PROJECT
// =============================================================================================
//
// ⚙️ Data flow overview (for Windows users running this locally):
//
// 1️ Backend (FastAPI)
//     → Endpoint: GET /api/jobs/{job_id}/rankings
//     → Returns a list of ranked candidates in JSON format.
//     Example JSON response:
//     [
//       { "candidate_id": 1, "candidate_name": "Pratyush Kandari", "score": 0.925 },
//       { "candidate_id": 2, "candidate_name": "Ravi Sharma", "score": 0.883 }
//     ]
//
// 2️ Frontend (React)
//     → Component “JobSummary.jsx” (or similar) calls that backend API using fetch() or Axios.
//     → It stores the list of results in a state variable (like `rankings`).
//     → Then, it maps over that array to create multiple CandidateCard components:
//
//         {rankings.map(r => (
//             <CandidateCard key={r.candidate_id} r={r} />
//         ))}
//
//     → Each CandidateCard receives one “r” (a single candidate object).
//
// 3️ CandidateCard.jsx (this file)
//     → Displays each candidate nicely in a styled box.
//
// 4️ Browser (Windows)
//     → When you open http://localhost:5173/, React automatically refreshes and shows results.
//     → No manual refresh needed — Vite’s development server does hot reloads.
//
// =============================================================================================


// =============================================================================================
//  EXTRA WINDOWS-SPECIFIC TIPS FOR BEGINNERS
// =============================================================================================
//
//  How to open this file:
//   - Right-click → “Open with” → choose “VS Code” or “Notepad++”.
//   - Avoid plain Notepad because it may mess with line endings.
//
//  Where this file runs:
//   - This code runs entirely in the browser (frontend), not in the terminal.
//   - You start it using `npm run dev` from PowerShell inside your frontend folder.
//
//  Hot Reloading:
//   - When you save this file (Ctrl + S), your frontend at http://localhost:5173/ auto-refreshes.
//   - You’ll immediately see any visual or text changes — no need to restart anything.
//
//  How to test it quickly:
//   - Make sure backend is running (`uvicorn app.main:app --reload`).
//   - Start frontend (`npm run dev`).
//   - Open http://localhost:5173/.
//   - Navigate to your job ranking page — you’ll see CandidateCard components listed there.
//
//  Important note:
//   - Do NOT modify variable names (like `r` or `candidate_name`) unless you also change backend JSON keys.
//   - React component names must start with a CAPITAL letter (`CandidateCard`, not `candidateCard`).
//
//  Debugging Tip (Windows):
//   - If something doesn’t render, press `F12` in your browser → open “Console” → see errors.
//   - Example: “Cannot read property ‘toFixed’ of undefined” → means `r.score` is missing in data.
//
// =============================================================================================
//
//  IN SUMMARY
// ---------------------------------------------------------------------------------------------
// This CandidateCard.jsx component:
//   ✔ Accepts one candidate object (r) from parent component
//   ✔ Displays candidate name and ID
//   ✔ Shows ML score (rounded to 3 decimals)
//   ✔ Uses simple inline styling
//   ✔ Automatically updates when backend data changes
//
// It is a simple, elegant, and reusable building block for your frontend UI.
//
// =============================================================================================
