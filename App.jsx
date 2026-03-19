// =============================================================================================
//  FILE: frontend/src/App.jsx
// =============================================================================================
//
//  PURPOSE OF THIS FILE:
// ---------------------------------------------------------------------------------------------
// This is the **main entry component** of your React frontend application.
//
// It controls:
//   ✅ The top navigation bar (header links for navigation)
//   ✅ The routing between pages (Dashboard, Upload Resume, Upload Job)
//   ✅ The general layout (header + main content area)
//
// Whenever the user clicks a link in the header,
// React Router dynamically loads the correct component (page)
// WITHOUT reloading the entire website.
//
// ---------------------------------------------------------------------------------------------
//  WINDOWS PATH (for your setup):
//   C:\pbldbms\frontend\src\App.jsx
//
// ▶ Run Frontend (Windows PowerShell):
//   cd C:\pbldbms\frontend
//   npm run dev
//   → open http://localhost:5173
//
// ▶ Backend (FastAPI) must also be running in another PowerShell window:
//   cd C:\pbldbms\backend
//   .\venv\Scripts\Activate.ps1
//   uvicorn app.main:app --reload
//
// =============================================================================================


// ---------------------------------------------------------------------------------------------
//  STEP 1️: IMPORT REQUIRED LIBRARIES AND COMPONENTS
// ---------------------------------------------------------------------------------------------
//
// React: base library for building frontend UI components
// Routes, Route, Link: imported from React Router DOM (handles navigation)
// Dashboard, UploadResume, UploadJob: our own page components
//
// React Router is the navigation engine for this app. It replaces the need
// for multiple HTML pages by switching between components dynamically.
//
// ---------------------------------------------------------------------------------------------
import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import UploadResume from "./components/UploadResume";
import UploadJob from "./components/UploadJob";


// =============================================================================================
//  STEP 2️: DEFINE MAIN APPLICATION COMPONENT — App()
// =============================================================================================
//
// This function is the root of your entire React app.
// It defines the navigation header and sets up all routes for the app.
//
// In React, every project typically has one top-level component like this.
// It’s rendered inside index.jsx (or main.jsx).
//
// ---------------------------------------------------------------------------------------------
export default function App() {
  return (
    <>
      {/* ===================================================================================== */}
      {/* 🧭 HEADER SECTION — Navigation bar */}
      {/* ===================================================================================== */}
      {/* 
          The header is always visible at the top of the app.
          It contains:
          - Brand name (“ResumeMatcher”)
          - Three navigation links (Dashboard, Upload Resume, Upload Job)
          
          The header uses inline CSS styles for simplicity. You can move these styles
          to an external CSS file (like App.css) later if you prefer cleaner markup.
      */}
      <header
        className="header"
        style={{
          padding: 10,               // space around header content
          background: "#2563eb",     // blue background (Tailwind’s blue-600)
          color: "#fff"              // white text
        }}
      >
        {/* Brand / Title */}
        <div
          className="brand"
          style={{ fontWeight: "bold", fontSize: 20 }}
        >
          ResumeMatcher
        </div>

        {/* Navigation links (React Router Links, not <a> tags) */}
        <nav
          className="nav"
          style={{
            marginTop: 8,
            display: "flex",
            gap: 12
          }}
        >
          {/* Each <Link> changes the route without reloading the page */}
          <Link to="/" style={{ color: "#fff", textDecoration: "none" }}>
            Dashboard
          </Link>
          <Link to="/upload-resume" style={{ color: "#fff", textDecoration: "none" }}>
            Upload Resume
          </Link>
          <Link to="/upload-job" style={{ color: "#fff", textDecoration: "none" }}>
            Upload Job
          </Link>
        </nav>
      </header>

      {/* ===================================================================================== */}
      {/*  MAIN CONTENT SECTION — Dynamic Pages */}
      {/* ===================================================================================== */}
      {/* 
          The <Routes> component from React Router switches between different “pages”
          (technically, components) based on the browser’s URL path.
          
          Example:
            - http://localhost:5173/              → shows Dashboard.jsx
            - http://localhost:5173/upload-job    → shows UploadJob.jsx
            - http://localhost:5173/upload-resume → shows UploadResume.jsx
          
          No full reloads happen — React dynamically swaps out components.
      */}
      <main
        className="container"
        style={{ padding: 20 }}
      >
        <Routes>
          {/* Route 1️⃣: Dashboard (main analytics page) */}
          <Route path="/" element={<Dashboard />} />

          {/* Route 2️⃣: Upload Resume (for adding candidate resumes) */}
          <Route path="/upload-resume" element={<UploadResume />} />

          {/* Route 3️⃣: Upload Job (for creating new job openings) */}
          <Route path="/upload-job" element={<UploadJob />} />
        </Routes>
      </main>
    </>
  );
}


// =============================================================================================
// 🧩 HOW THIS FILE FITS INTO THE PROJECT
// =============================================================================================
//
// This App.jsx file acts as the “router” that connects all your major screens:
//
// 1️ Dashboard.jsx → Displays all jobs, candidates, charts, rankings.
// 2️ UploadJob.jsx → Page where you create a new job (title, skills, etc.).
// 3️ UploadResume.jsx → Page where you upload resumes for a selected job.
//
// React Router automatically loads the right page based on URL path.
//
// These three files, together with App.jsx, make up your entire user interface.
//
// ---------------------------------------------------------------------------------------------
//  Example route behavior:
//
//   ➤ When user clicks “Upload Resume”:
//        URL changes to: http://localhost:5173/upload-resume
//        Component shown: <UploadResume />
//
//   ➤ When user clicks “Dashboard”:
//        URL changes to: http://localhost:5173/
//        Component shown: <Dashboard />
//
//   ➤ When user clicks “Upload Job”:
//        URL changes to: http://localhost:5173/upload-job
//        Component shown: <UploadJob />
//
// No reload happens because React Router controls navigation using JavaScript.
//
// =============================================================================================


// =============================================================================================
// 🪟 WINDOWS-SPECIFIC NOTES
// =============================================================================================
//
// ▶ 1️ Running the frontend (in PowerShell):
//
//   cd C:\pbldbms\frontend
//   npm run dev
//
//   → Open http://localhost:5173 in your web browser (Edge or Chrome recommended).
//
// ---------------------------------------------------------------------------------------------
//
// ▶ 2️ Backend (FastAPI) setup (in separate PowerShell window):
//
//   cd C:\pbldbms\backend
//   .\venv\Scripts\Activate.ps1
//   uvicorn app.main:app --reload
//
//   → Open http://127.0.0.1:8000/docs to verify backend is working.
//
// ---------------------------------------------------------------------------------------------
//
// ▶ 3️ Frontend + Backend integration:
//
//   - Frontend calls backend via Axios (`frontend/src/api.js`).
//   - When you create jobs or upload resumes, requests go to backend endpoints like:
//       http://127.0.0.1:8000/api/jobs
//       http://127.0.0.1:8000/api/resumes/upload
//
//   - FastAPI processes requests and updates the PostgreSQL database.
//   - Dashboard then fetches those updates and displays charts.
//
// ---------------------------------------------------------------------------------------------
//
// ▶ 4️ Common Windows issues:
//
// ❌ “404 Not Found” on route reload (like refreshing /upload-resume):
//    - Solution: Add a fallback in Vite config or deploy settings.
//      In development, use React Router BrowserRouter (default handles this).
//
// ❌ “Network Error” when clicking buttons (like Upload Resume):
//    - Backend not running or URL in `frontend/src/api.js` incorrect.
//
// ❌ Header links not working (if text looks plain blue):
//    - Ensure you imported `react-router-dom` properly:
//        npm install react-router-dom
//
// ---------------------------------------------------------------------------------------------
//
// ▶ 5️ Tips for Visual Studio Code (Windows):
//
//   - Open integrated PowerShell terminal: Ctrl + `
//   - Run both frontend and backend in separate terminals.
//   - Use Ctrl + Click on route paths (e.g., /upload-resume) to open linked file quickly.
//
// ---------------------------------------------------------------------------------------------
//
// ▶ 6️ Hot Reloading (Windows feature with Vite):
//
//   - Any time you save App.jsx or other files (Ctrl + S),
//     the browser automatically refreshes the page with your latest changes.
//   - You do NOT need to restart npm run dev every time.
//
// =============================================================================================
//
// ✅ TL;DR (BEGINNER SUMMARY):
// ---------------------------------------------------------------------------------------------
// 🟢 App.jsx is your frontend’s “main switchboard” — it connects all pages.
// 🟢 It creates the top navigation bar and defines routes using React Router.
// 🟢 Works seamlessly on Windows (Vite + PowerShell + FastAPI).
// 🟢 Core pages: Dashboard, Upload Resume, Upload Job.
// 🟢 Supports instant page switching without full reloads.
//
// Once you understand this file, you understand the **structure of the entire frontend UI**!
// =============================================================================================
