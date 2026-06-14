import React, { useState } from "react";
import "./App.css";

function App() {
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [revenue, setRevenue] = useState("");
  const [results, setResults] = useState(null);

  const handleAnalyze = () => {
    setResults({
      company,
      bestMatch: "Example Public Company",
      ticker: "EXMP",
      evRevenue: "4.2x",
      evEbitda: "12.5x",
      estimatedValue: revenue ? `$${(Number(revenue) * 4.2).toFixed(1)}M` : "N/A",
    });
  };

  return (
    <div className="app">
      <h1>Valence</h1>
      <p>Find public company comps and valuation ranges for private companies.</p>

      <div className="card">
        <input
          placeholder="Private company name"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />

        <input
          placeholder="Industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
        />

        <input
          placeholder="Revenue in millions"
          value={revenue}
          onChange={(e) => setRevenue(e.target.value)}
        />

        <button onClick={handleAnalyze}>Find Comps</button>
      </div>

      {results && (
        <div className="results">
          <h2>Results for {results.company}</h2>
          <p><strong>Closest Public Comp:</strong> {results.bestMatch} ({results.ticker})</p>
          <p><strong>EV / Revenue:</strong> {results.evRevenue}</p>
          <p><strong>EV / EBITDA:</strong> {results.evEbitda}</p>
          <p><strong>Estimated Valuation:</strong> {results.estimatedValue}</p>
        </div>
      )}
    </div>
  );
}

export default App;