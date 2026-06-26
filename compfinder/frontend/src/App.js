import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import InputPanel from "./components/InputPanel";
import ResultsPanel from "./components/ResultsPanel";
import CompanyDetail from "./components/CompanyDetail";
import MarketIntelligenceTerminal from "./components/MarketIntelligenceTerminal";
import MAModelStudio from "./components/MAModelStudio";
import MADealDetail from "./components/MADealDetail";
import DefensibilityStudio from "./components/DefensibilityStudio";
import { apiUrl } from "./api";
import "./App.css";

const heatmapSectors = [
  {
    name: "AI / Machine Learning",
    shortName: "AI / ML",
    deals: 18,
    multiple: "18.4x",
    momentum: "Premium",
    read: "High-growth comps and active strategic buyer demand.",
    comps: "NVDA, PLTR, MSFT",
    tone: "hot",
    sourceName: "ServiceNow / Moveworks",
    sourceUrl: "https://www.servicenow.com/company/media/press-room/servicenow-to-acquire-moveworks.html",
  },
  {
    name: "Cybersecurity",
    shortName: "Cybersecurity",
    deals: 14,
    multiple: "12.1x",
    momentum: "Active",
    read: "Security budgets remain resilient; cloud security is the hottest pocket.",
    comps: "CRWD, PANW, ZS",
    tone: "hot",
    sourceName: "Google / Wiz",
    sourceUrl: "https://cloud.google.com/blog/products/identity-security/google-agreement-to-acquire-wiz",
  },
  {
    name: "Cloud / Data Infrastructure",
    shortName: "Cloud / Data Infra",
    deals: 11,
    multiple: "10.8x",
    momentum: "Active",
    read: "Data platforms are being valued on AI readiness and scale.",
    comps: "SNOW, MDB, DDOG",
    tone: "warm",
    sourceName: "Salesforce / Informatica",
    sourceUrl: "https://www.salesforce.com/news/press-releases/2025/05/27/salesforce-signs-definitive-agreement-to-acquire-informatica/",
  },
  {
    name: "Vertical Software",
    shortName: "Vertical Software",
    deals: 9,
    multiple: "8.6x",
    momentum: "Steady",
    read: "Durable niches still get credit when retention and margins are strong.",
    comps: "VEEV, APPF, BLKB",
    tone: "warm",
    sourceName: "Synopsys / Ansys",
    sourceUrl: "https://news.synopsys.com/2025-07-17-Synopsys-Completes-Acquisition-of-Ansys",
  },
  {
    name: "FinTech / Payments",
    shortName: "FinTech",
    deals: 6,
    multiple: "5.2x",
    momentum: "Selective",
    read: "Buyers are more selective and focused on profitable payment rails.",
    comps: "SQ, PYPL, FOUR",
    tone: "cool",
    sourceName: "Market context",
    sourceUrl: "",
  },
  {
    name: "Developer Tools / DevOps",
    shortName: "DevTools",
    deals: 8,
    multiple: "9.4x",
    momentum: "Repricing",
    read: "AI coding workflows help, but buyers are watching efficiency.",
    comps: "GTLB, TEAM, DDOG",
    tone: "cool",
    sourceName: "IBM / HashiCorp",
    sourceUrl: "https://newsroom.ibm.com/2025-02-27-IBM-Completes-Acquisition-of-HashiCorp",
  },
];

function WorkflowRail({ hasSubmitted, loading, results }) {
  const steps = [
    { label: "Profile", detail: "Enter company basics", active: !hasSubmitted },
    { label: "Screen", detail: "Run public comp search", active: loading },
    { label: "Curate", detail: "Pick the strongest peers", active: !!results },
    { label: "Report", detail: "Assemble valuation output", active: !!results },
  ];

  return (
    <div className="workflow-rail" aria-label="Comp set builder workflow">
      {steps.map((step, index) => (
        <div
          key={step.label}
          className={`workflow-step ${step.active ? "active" : ""} ${
            index === 0 || hasSubmitted ? "complete" : ""
          }`}
        >
          <span>{index + 1}</span>
          <div>
            <strong>{step.label}</strong>
            <p>{step.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SectorHeatmap({ selectedSector, onSelectSector }) {
  return (
    <div className="sector-heatmap" aria-label="Sector signals">
      <div className="heatmap-heading">
        <div>
          <span>Sector Signals</span>
          <strong>Pick a market starting point</strong>
        </div>
        <p>Each tile shows median EV/Revenue, recent strategic deal count, public comp examples, and the current valuation read.</p>
      </div>

      <div className="heatmap-grid">
        {heatmapSectors.map((sector) => (
          <article
            key={sector.name}
            className={`heatmap-tile ${sector.tone} ${
              selectedSector === sector.name ? "selected" : ""
            }`}
          >
            <button type="button" onClick={() => onSelectSector(sector.name)}>
              <span>{sector.shortName}</span>
              <strong>{sector.multiple}</strong>
              <small>Median EV/Revenue</small>
              <em>{sector.deals} recent strategic deals - {sector.momentum}</em>
              <p>{sector.read}</p>
              <b>{sector.comps}</b>
            </button>
            {sector.sourceUrl && (
              <a href={sector.sourceUrl} target="_blank" rel="noreferrer">
                Latest source: {sector.sourceName}
              </a>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function HomePage() {
  const [results, setResults] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("valenceLastResults") || "null");
    } catch {
      return null;
    }
  });
  const [privateCompany, setPrivateCompany] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("valenceLastPrivateCompany") || "null");
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState("market");
  const [selectedSector, setSelectedSector] = useState("");

  useEffect(() => {
    if (window.location.hash === "#analysis-workbench") {
      setActiveWorkspaceTab("builder");
      setHasSubmitted(!!localStorage.getItem("valenceLastResults"));
    } else if (window.location.hash === "#ma-studio") {
      setActiveWorkspaceTab("ma");
    } else if (window.location.hash === "#ai-defensibility") {
      setActiveWorkspaceTab("defensibility");
    }
  }, []);

  const openBuilder = () => {
    setActiveWorkspaceTab("builder");
    window.history.replaceState(null, "", "#analysis-workbench");
  };

  const chooseSector = (sector) => {
    setSelectedSector(sector);
    openBuilder();

    window.requestAnimationFrame(() => {
      document.getElementById("analysis-workbench")?.scrollIntoView({ block: "start" });
    });
  };

  const openMarket = () => {
    setActiveWorkspaceTab("market");
    window.history.replaceState(null, "", window.location.pathname);
  };

  const openMAStudio = () => {
    setActiveWorkspaceTab("ma");
    window.history.replaceState(null, "", "#ma-studio");
  };

  const openDefensibilityStudio = () => {
    setActiveWorkspaceTab("defensibility");
    window.history.replaceState(null, "", "#ai-defensibility");
  };

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError("");
    setResults(null);
    setHasSubmitted(true);

    setPrivateCompany(formData);

    try {
      const res = await fetch(apiUrl("/api/find-comps"), {
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

        localStorage.setItem(
          "valenceLastResults",
          JSON.stringify(data || {})
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
          <span className="nav-pill">BETA</span>
        </div>

        <div className="nav-right" aria-hidden="true" />
      </nav>

      <div className="workspace-tabs">
        <button
          type="button"
          className={activeWorkspaceTab === "market" ? "active" : ""}
          onClick={openMarket}
        >
          MARKET INTELLIGENCE
        </button>
        <button
          type="button"
          className={activeWorkspaceTab === "builder" ? "active" : ""}
          onClick={openBuilder}
        >
          BUILD COMP SET
        </button>
        <button
          type="button"
          className={activeWorkspaceTab === "ma" ? "active" : ""}
          onClick={openMAStudio}
        >
          M&A STUDIO
        </button>
        <button
          type="button"
          className={activeWorkspaceTab === "defensibility" ? "active" : ""}
          onClick={openDefensibilityStudio}
        >
          AI DEFENSIBILITY
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

          <div className="builder-console">
            <WorkflowRail hasSubmitted={hasSubmitted} loading={loading} results={results} />
            <SectorHeatmap selectedSector={selectedSector} onSelectSector={chooseSector} />
          </div>

          <div className={`layout ${hasSubmitted ? "layout-split" : "layout-center"}`}>
            <InputPanel
              onSubmit={handleSubmit}
              loading={loading}
              selectedSector={selectedSector}
            />

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

      {activeWorkspaceTab === "ma" && <MAModelStudio />}

      {activeWorkspaceTab === "defensibility" && <DefensibilityStudio />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/company/:ticker" element={<CompanyDetail />} />
        <Route path="/ma-deal/:dealId" element={<MADealDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
