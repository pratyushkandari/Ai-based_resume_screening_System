import React, { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import CandidatePage from "./components/CandidatePage";
import Login from "./components/Login";
import UploadJob from "./components/UploadJob";

export default function App() {
  const [role, setRole] = useState(localStorage.getItem("role"));
  const navigate = useNavigate(); // ✅ added

  const handleLogout = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    setRole(null);
    navigate("/");
  };

  if (!role) return <Login setRole={setRole} />;

  return (
    <div>
      {/* 🔝 Top Bar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "14px 24px",
        background: "linear-gradient(90deg, #2563eb, #1e40af)",
        color: "#fff",
        alignItems: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
      }}>
        <div style={{ fontWeight: "bold", fontSize: 20 }}>
          🚀 Resume Matcher
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>

          {/* ✅ NEW: DASHBOARD BUTTON (ONLY FOR HR) */}
          {role === "hr" && (
            <button
              onClick={() => navigate("/")}
              style={{
                background: "#22c55e",
                color: "#fff",
                border: "none",
                padding: "8px 14px",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              🏠 Dashboard
            </button>
          )}

          <span style={{ fontSize: 14 }}>
            👤 {localStorage.getItem("name")}
          </span>

          <button
            onClick={handleLogout}
            style={{
              background: "#ef4444",
              color: "#fff",
              border: "none",
              padding: "8px 14px",
              borderRadius: 8,
              cursor: "pointer"
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* 🎯 ROUTES */}
      <Routes>
        {role === "hr" ? (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload-job" element={<UploadJob />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        ) : (
          <>
            <Route path="/" element={<CandidatePage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </div>
  );
}
