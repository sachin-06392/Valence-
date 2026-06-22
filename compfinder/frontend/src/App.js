import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import InputPanel from "./components/InputPanel";
import ResultsPanel from "./components/ResultsPanel";
import CompanyDetail from "./components/CompanyDetail";
import MarketIntelligenceTerminal from "./components/MarketIntelligenceTerminal";
import "./App.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

function HomePage() {
  const [results, setResults] = useState(null);
  const [privateCompany, setPrivateCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState("market");

  useEffect(() => {
    if (window.location.hash === "#analysis-workbench") {
      setActiveWorkspaceTab("builder");
    }
  }, []);

  const openBuilder = () => {
    setActiveWorkspaceTab("builder");
    window.history.replaceState(null, "", "#analysis-workbench");
  };

  const openMarket = () => {
    setActiveWorkspaceTab("market");
    window.history.replaceState(null, "", window.location.pathname);
  };

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

      <div className="workspace-tabs">
        <button
          type="button"
          className={activeWorkspaceTab === "market" ? "active" : ""}
          onClick={openMarket}
        >
          Market Intelligence
        </button>
        <button
          type="button"
          className={activeWorkspaceTab === "builder" ? "active" : ""}
          onClick={openBuilder}
        >
          Build Comp Set
        </button>
      </div>

      {activeWorkspaceTab === "market" && (
        <div className="hero-shell">
          <div className="hero-copy">
            <span className="hero-kicker">AI-powered public comps engine</span>
            <h1>Trading Comps Analysis</h1>
            <p>
              Enter a private company's financials. Valence screens public
              comparables, ranks fit, and computes an implied valuation range.
            </p>
          </div>

          <MarketIntelligenceTerminal
            privateCompany={privateCompany}
            results={results}
            loading={loading}
            onRunAnalysis={openBuilder}
          />
        </div>
      )}

      {activeWorkspaceTab === "builder" && (
        <section id="analysis-workbench" className="workbench-section">
          <div className="workbench-header">
            <span>Company Analysis Workbench</span>
            <h2>Build the private company profile, then generate the comp set.</h2>
            <p>
              Enter the target company&apos;s operating metrics below. Valence uses
              that profile to rank public comps, calculate valuation multiples,
              and prepare the report.
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
        </section>
      )}
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
