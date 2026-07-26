import { useNavigate } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { useRef, useState } from "react";
import "../css/Page2.css";

export function Page2({ formData, setFormData }) {
  const navigate = useNavigate();
  const sigRef = useRef(null);
  const [hasSigned, setHasSigned] = useState(false);


  const saveSignature = () => {
    if (!sigRef.current.isEmpty()) {
      setHasSigned(true); // ✅ hide placeholder
      setFormData(prev => ({
        ...prev,
        signature: sigRef.current.toDataURL(),
      }));
    }
  };

  const clearSignature = () => {
    sigRef.current.clear();
    setHasSigned(false); // ✅ show placeholder again
    setFormData(prev => ({
      ...prev,
      signature: null,
    }));
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      businessFile: e.target.files[0],
    }));
  };

  const handleNext = () => {
    if (!formData.signature) {
      alert("Please sign before continuing");
      return;
    }
    if (!formData.businessFile) {
      alert("Please upload a business document");
      return;
    }
    navigate("/page3");
  };

  return (
    <div className="page-container">
      <div className="form-card">
        {/* Signature */}
       <div className="form-row">
      <div className="form-label">Signature</div>

      <div className="form-input">
        <div className="signature-wrapper">

          {!hasSigned && (
            <div className="signature-placeholder">
              <span className="pen-icon">✍️</span>
              <span className="signature">Sign Here</span>
            </div>
          )}

          <SignatureCanvas
            ref={sigRef}
            penColor="black"
            canvasProps={{
              width: 420,
              height: 160,
              className: "signature-canvas",
            }}
            onEnd={saveSignature}
          />
        </div>

        <button
          type="button"
          className="clear-btn"
          onClick={clearSignature}
        >
          Clear
        </button>
      </div>
    </div>


        {/* Business summary (label only, like screenshot) */}
        <div className="form-row">
          <div className="form-label">A brief summary of your business</div>
          <div className="form-input">
            <div className="upload-box">
              <input type="file" required onChange={handleFileChange} />

              <div className="upload-content">
                <span className="upload-icon">☁️</span>
                <p><strong>Browse Files</strong></p>
                <small>Drag and drop files here</small>
              </div>
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* Navigation buttons */}
        <div className="button-row">
          <button className="back-btn" onClick={() => navigate(-1)}>
            Back
          </button>
          <button className="next-btn" onClick={handleNext}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
