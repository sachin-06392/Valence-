import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import InputPanel from "./components/InputPanel";
import ResultsPanel from "./components/ResultsPanel";
import CompanyDetail from "./components/CompanyDetail";
import "./App.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

function HomePage() {
  const [results, setResults] = useState(null);
  const [privateCompany, setPrivateCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError("");
    setResults(null);
    setHasSubmitted(true);

    setPrivateCompany(formData);

    try {
      const res = await fetch(`${API_BASE}/api/find-comps`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || data?.error || "Something went wrong.");
      }

      if (data?.error) {
        setError(data.error);
        setResults(null);
      } else {
        setResults(data);

        // Save the full comp set so the ticker detail page + PDF can use it
        localStorage.setItem(
          "valenceLastComps",
          JSON.stringify(data.comps || [])
        );

        // Save the private company input so the PDF valuation section uses the user input
        localStorage.setItem(
          "valenceLastPrivateCompany",
          JSON.stringify(formData || {})
        );
      }
    } catch (e) {
      console.error(e);
      setError(
        e.message ||
          "Cannot reach server. Make sure the backend is running on port 8000."
      );
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-left">
          <div className="logo">
            <img src="/logo4.png" alt="Valence logo" />
          </div>

          <span className="brand">Valence</span>
          <span className="nav-pill">Beta</span>
        </div>

        <div className="nav-right">60+ public comps · 5 sectors</div>
      </nav>

      <div className="page-header">
        <h1>Trading Comps Analysis</h1>
        <p>
          Enter a private company's financials. We'll find the closest public
          comparables and compute an implied valuation.
        </p>
      </div>

      <div className={`layout ${hasSubmitted ? "layout-split" : "layout-center"}`}>
        <InputPanel onSubmit={handleSubmit} loading={loading} />

        {hasSubmitted && (
          <ResultsPanel
            results={results}
            loading={loading}
            error={error}
            privateCompany={privateCompany}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/company/:ticker" element={<CompanyDetail />} />
      </Routes>
    </BrowserRouter>
  );
}