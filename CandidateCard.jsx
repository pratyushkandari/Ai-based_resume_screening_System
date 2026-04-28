
import React from "react";



export default function CandidateCard({ r }) {


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


