// =============================================================================================
//  FILE: frontend/src/api.js
// =============================================================================================
//
//  PURPOSE OF THIS FILE:
// ---------------------------------------------------------------------------------------------
// This file configures the **Axios HTTP client** to make requests from the frontend (React)
// to the backend (FastAPI) API.
//
// It ensures that every API call (GET, POST, etc.) automatically uses the same backend URL,
// headers, and timeout settings.
//
// All other files (like UploadJob.jsx, Dashboard.jsx, UploadResume.jsx, etc.)
// import this `api` object to communicate with your backend.
//
// ---------------------------------------------------------------------------------------------
//  WINDOWS PATH (for your setup):
//   C:\pbldbms\frontend\src\api.js
//
// ▶ Run Frontend (PowerShell):
//   cd C:\pbldbms\frontend
//   npm run dev
//   → open http://localhost:5173
//
// ▶ Backend must also be running (in another PowerShell):
//   cd C:\pbldbms\backend
//   .\venv\Scripts\Activate.ps1
//   uvicorn app.main:app --reload
//
// =============================================================================================


// ---------------------------------------------------------------------------------------------
//  STEP 1️: IMPORT AXIOS
// ---------------------------------------------------------------------------------------------
//
// Axios is a popular HTTP client library for JavaScript.
// It makes API requests (GET, POST, PUT, DELETE) easy and consistent.
//
// Installation (already handled by npm install):
//   npm install axios
//
// ---------------------------------------------------------------------------------------------
import axios from "axios";


// ---------------------------------------------------------------------------------------------
//  STEP 2️: DEFINE BACKEND BASE URL
// ---------------------------------------------------------------------------------------------
//
// BASE is the root URL for your FastAPI backend server.
//
// 1️ Primary: It tries to read from your environment variable
//              VITE_API_URL (set in .env file, if available).
//              Example .env file in frontend folder:
//                VITE_API_URL=http://127.0.0.1:8000
//
// 2️ Fallback: If no environment variable is found, it defaults to:
//                "http://127.0.0.1:8000"
//              which is the default address where FastAPI runs on Windows.
//
// ---------------------------------------------------------------------------------------------
const BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";


// ---------------------------------------------------------------------------------------------
// 🧩 STEP 3️: CREATE AXIOS INSTANCE
// ---------------------------------------------------------------------------------------------
//
// Here we create an “axios instance” — think of it like a configured version of axios,
// where every request automatically uses the same base URL, headers, and timeout.
//
// Why use an instance?
//   - Consistency (all requests share same base URL)
//   - Cleaner imports (no need to write full URL each time)
//   - Easier debugging (you can log or intercept requests globally)
//
// ---------------------------------------------------------------------------------------------
const api = axios.create({
  baseURL: BASE,          // ✅ All API calls will start from this base URL
  timeout: 30000,         // ⏳ Timeout after 30 seconds (good for Windows slower networks)
  headers: {
    Accept: "application/json", // Tell backend that we expect JSON responses
  },
});


// ---------------------------------------------------------------------------------------------
//  STEP 4️: EXPORTS
// ---------------------------------------------------------------------------------------------
//
// We export two things:
//
// 1️ `api` → the preconfigured Axios instance.
//     Used in components like:
//       import api from "../api";
//       api.get("/api/jobs");
//       api.post("/api/resumes/upload");
//
// 2️ `API_BASE_URL` → raw base URL string, useful for links or downloads.
//     Used in Dashboard.jsx for download links:
//       href={`${API_BASE_URL}/api/resumes/${id}/download`}
//
// ---------------------------------------------------------------------------------------------
export default api;
export { BASE as API_BASE_URL };


// =============================================================================================
//  HOW THIS FILE FITS INTO THE PROJECT
// =============================================================================================
//
// 1️ UploadJob.jsx
//     → api.post("/api/jobs", payload)
//     → Creates a new job in backend
//
// 2️ UploadResume.jsx
//     → api.post("/api/resumes/upload", FormData)
//     → Uploads resume file for a specific job
//
// 3️ Dashboard.jsx
//     → api.get("/api/jobs")
//     → Loads job list from backend
//     → api.get(`/api/jobs/${jobId}/summary`)
//     → Loads candidate rankings
//
//  With this centralized `api.js` file, you don’t need to repeat URLs like:
//     "http://127.0.0.1:8000/api/jobs"
//   You can just write `/api/jobs` everywhere.
//
// =============================================================================================


// =============================================================================================
// 🪟 WINDOWS-SPECIFIC DETAILS & TROUBLESHOOTING
// =============================================================================================
//
// ▶ 1️ Check backend server
// Make sure FastAPI is running before starting frontend.
// Run in PowerShell:
//
//   cd C:\pbldbms\backend
//   .\venv\Scripts\Activate.ps1
//   uvicorn app.main:app --reload
//
// Visit this URL in browser to confirm:
//    http://127.0.0.1:8000/docs
//
// If it opens the Swagger API docs, your backend is fine.
//
// ---------------------------------------------------------------------------------------------
//
// ▶ 2️ Frontend connection
// When you start your frontend (`npm run dev`), open this URL:
//    http://localhost:5173
//
// The frontend runs on port 5173 (Vite default).
// The backend runs on port 8000.
//
// Axios automatically sends requests from port 5173 → port 8000.
// (No need to set up CORS manually if your FastAPI backend already allows it.)
//
// ---------------------------------------------------------------------------------------------
//
// ▶ 3️ Testing the connection manually
//
// Open browser DevTools (F12 → Network tab), refresh your app, and look for requests like:
//
//   Request URL: http://127.0.0.1:8000/api/jobs
//   Status: 200 OK
//
// That means your frontend and backend are successfully connected.
//
// ---------------------------------------------------------------------------------------------
//
// ▶ 4️ Common Windows errors:
//
// ❌ Error: "Network Error"
//     → Backend is not running or wrong URL.
//       Fix: Start backend → check with `uvicorn app.main:app --reload`.
//
// ❌ Error: "CORS Policy Error"
//     → Add CORS middleware in backend (FastAPI):
//         from fastapi.middleware.cors import CORSMiddleware
//         app.add_middleware(CORSMiddleware,
//             allow_origins=["*"], allow_credentials=True,
//             allow_methods=["*"], allow_headers=["*"])
//
// ❌ Error: "Request timeout"
//     → Your backend query took longer than 30 seconds (timeout: 30000).
//       Fix: Increase timeout in this file (e.g., `timeout: 60000`)
//
// ---------------------------------------------------------------------------------------------
//
// ▶ 5️ Optional: Environment variable setup (Windows .env file)
//
// You can define your backend URL in `.env` file (inside frontend folder):
//
//   VITE_API_URL=http://127.0.0.1:8000
//
// Then restart your frontend using:
//   npm run dev
//
// Vite automatically injects variables starting with “VITE_” into your React app.
//
// ---------------------------------------------------------------------------------------------
//
// ▶ 6️ Where uploaded files go (Windows path info)
//
// When you upload resumes through frontend:
//   - The backend saves them to: C:\pbldbms\backend\uploads\
//   - Each file gets a unique name (like resume_3.docx).
//
// The backend then parses the resume (using NLP/ML logic) and stores extracted
// candidate info in your PostgreSQL database.
//
// =============================================================================================
//
// ✅ TL;DR (BEGINNER SUMMARY):
// ---------------------------------------------------------------------------------------------
// 🟢 This file connects your React frontend with the FastAPI backend.
// 🟢 It uses Axios to make API calls consistently.
// 🟢 It sets default backend URL (http://127.0.0.1:8000) for Windows users.
// 🟢 All components import this file to access backend routes.
// 🟢 If backend or frontend ports change, update the BASE URL here or in .env.
// =============================================================================================
