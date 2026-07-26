import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Page3.css";

export function Page3({ formData }) {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");

  const generateUserId = () => {
    const randomNumbers = Math.floor(10000 + Math.random() * 90000);
    const businessType = formData.businessType.toLowerCase();

    setUserId(`${businessType}/${randomNumbers}`);
  };

  return (
    <div className="page-container">
      <div className="form-card">

        <div className="top-bar" />

        <div className="button-row">
          <button className="back-btn" onClick={() => navigate(-1)}>
            Back
          </button>
          <button className="continue-btn" disabled={!userId}>
            Continue
          </button>
        </div>

        <div className="divider" />

        <div className="user-id-section">
          <h4>Click on the link below to generate your user ID</h4>
          <p className="hint">
            user ID should contain the following business type/ 5 random numbers 
          </p>

          {!userId ? (
            <button className="generate-btn" onClick={generateUserId}>
              Generate User ID
            </button>
          ) : (
            <div className="user-id-box">
              <strong>{userId}</strong>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

