import React, { useState } from "react";
import api from "../api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function UploadJob() {

  const [title, setTitle] = useState("");            
  const [description, setDescription] = useState(""); 
  const [skillsText, setSkillsText] = useState("");  
  const [loading, setLoading] = useState(false);     
  const navigate = useNavigate();                    

  async function handleSubmit(e) {
    e.preventDefault(); 

    // Step 1: Validation
    if (!title.trim()) {
      toast.warn("⚠️ Please enter a job title.");
      return;
    }

    // Step 2: Skills parsing
    const skills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // ✅ FIXED SESSION BLOCK
    const raw_user_id = localStorage.getItem("user_id");
    const role = (localStorage.getItem("role") || "").toLowerCase().trim();

    const user_id = Number(raw_user_id); // 🔥 FIX: DEFINE user_id

    // ✅ STRICT VALIDATION
    if (!raw_user_id || isNaN(user_id) || user_id <= 0) {
      toast.error("❌ Invalid session. Please login again.");
      localStorage.clear();
      navigate("/login");
      return;
    }

    // ✅ HR ONLY
    if (role !== "hr") {
      toast.error("❌ Only HR can create jobs.");
      navigate("/");
      return;
    }

    // 🧪 DEBUG
    console.log("Creating job with:", {
      user_id,
      numeric_id: user_id,
      role
    });

    const fd = new FormData();
    fd.append("title", title.trim());
    fd.append("description", description.trim());
    fd.append("skills", skills.join(","));
    fd.append("created_by", user_id); // ✅ NOW WORKS

    try {
      setLoading(true); 
      const res = await api.post("/api/jobs", fd);

      const jobId = res?.data?.job_id;
      toast.success(`✅ Created job successfully (ID: ${jobId})`);

      if (jobId) {
        navigate(`/upload-resume?jobId=${jobId}`);
      } else {
        setTitle("");
        setDescription("");
        setSkillsText("");
      }

    } catch (err) {
      console.error("Create job error", err);
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to create job";
      toast.error(`❌ Error: ${detail}`);
    } finally {
      setLoading(false); 
    }
  }

  return (
    <div style={{ padding: 18 }}>
      <div className="card">
        <div className="card-title">Create Job</div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          
          <div>
            <label className="small">Title</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Assistant Professor - ML"
              required
            />
          </div>

          <div>
            <label className="small">Description</label>
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Job description / responsibilities..."
            />
          </div>

          <div>
            <label className="small">Skills (comma separated)</label>
            <input
              className="input"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="python, ml, fastapi, docker"
            />
          </div>

          <div className="button-row">
            <button type="submit" disabled={loading} className="btn">
              {loading ? "Creating..." : "Create Job"}
            </button>

            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setTitle("");
                setDescription("");
                setSkillsText("");
              }}
            >
              Reset
            </button>
          </div>

          <div className="footer-note">
            After creating, you'll be redirected to Upload Resume with the job selected.
          </div>
        </form>
      </div>
    </div>
  );
}
