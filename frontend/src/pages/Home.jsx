import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Home.css";

export function Home({ formData, setFormData }) {
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate("/page2");
  };
  return (
    <div className="page-container">
      <div className="form-card">
        <h1 className="logo">SellSync</h1>
        <h3 className="subtitle">AI-Powered Store OS</h3>

        <div className="divider" />

        <h4>SIGNUP TO SELLSYNC</h4>
        <p>
          Please provide all the required details to register your business with
          us
        </p>
        <div className="divider" />

        <form onSubmit={handleSubmit} className="signup-form">
          <p className="info">
            All fields marked with <span>*</span> are required.
          </p>

          <div className="form-row">
            <div className="form-label">
              Business Owner <span>*</span>
            </div>
            <div className="form-input">
              <input
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
              <input
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-label">
              Business Name <span>*</span>
            </div>
            <div className="form-input">
              <input
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-label">
              Contact Number <span>*</span>
            </div>
            <div className="form-input">
              <input
                name="contactNumber"
                placeholder="+234..."
                value={formData.contactNumber}
                onChange={handleChange}
                required
              />
              <small>Start with your country code</small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-label">
              E-mail <span>*</span>
            </div>
            <div className="form-input">
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-label">
              Address <span>*</span>
            </div>
            <div className="form-input">
              <input
                name="addressLine1"
                placeholder="Address line 1"
                value={formData.addressLine1}
                onChange={handleChange}
                required
              />
              <input
                name="addressLine2"
                placeholder="Address line 2"
                value={formData.addressLine2}
                onChange={handleChange}
              />
              <div className="form-row">
                <input
                  name="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
                <input
                  name="state"
                  placeholder="State / Province"
                  value={formData.state}
                  onChange={handleChange}
                  required
                />
              </div>
              <input
                type="number"
                name="postalCode"
                placeholder="Postal / Zip Code"
                value={formData.postalCode}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-label">
              Type of Business <span>*</span>
            </div>
            <div className="form-input">
              <select
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                required
              >
                <option value="">Please Select</option>
                <option value="Retail">Retail</option>
                <option value="Wholesale">Wholesale</option>
                <option value="Service">Service</option>
              </select>
            </div>
          </div>

          <div className="divider" />

          <button type="submit" className="next-btn">
            Next
          </button>
        </form>
      </div>
    </div>
  );
}
