import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./CompanyDetail.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
function money(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function bigMoney(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatFact(fact) {
  if (!fact) return "N/A";

  return `${bigMoney(fact.value)} • ${fact.form || "Filing"} • filed ${
    fact.filed || "N/A"
  }`;
}

export default function CompanyDetail() {
  const { ticker } = useParams();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  async function loadCompany(showLoading = false) {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE}/api/company/${ticker}`)

      if (!response.ok) {
        throw new Error("Could not load company details.");
      }

      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  loadCompany(true);

  const intervalId = setInterval(() => {
    loadCompany(false);
  }, 60000);

  return () => clearInterval(intervalId);
}, [ticker]);

  if (loading) {
    return (
      <div className="company-detail-page">
        <Link to="/" className="back-link">← Back to search</Link>
        <p>Loading company details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="company-detail-page">
        <Link to="/" className="back-link">← Back to search</Link>
        <p className="error-text">{error}</p>
      </div>
    );
  }

  const company = data.company;
  const stock = data.stock;
  const financials = data.financials;
  const filings = data.filings || [];

  return (
    <div className="company-detail-page">
      <Link to="/" className="back-link">← Back to search</Link>

      <div className="company-header">
        <div>
          <h1>{company.name}</h1>
          <p>{company.ticker} • CIK {company.cik}</p>
          <p>{company.sicDescription || "No industry description available"}</p>
        </div>

        <div className="price-box">
          <p>Current Price</p>
          <h2>{money(stock.currentPrice)}</h2>
          <p>Previous Close: {money(stock.previousClose)}</p>
        </div>
      </div>

      <h2>Stock Snapshot</h2>

      <div className="metric-grid">
        <div className="metric-card">
          <p>Day High</p>
          <h3>{money(stock.dayHigh)}</h3>
        </div>

        <div className="metric-card">
          <p>Day Low</p>
          <h3>{money(stock.dayLow)}</h3>
        </div>

        <div className="metric-card">
          <p>52-Week High</p>
          <h3>{money(stock.yearHigh)}</h3>
        </div>

        <div className="metric-card">
          <p>52-Week Low</p>
          <h3>{money(stock.yearLow)}</h3>
        </div>

        <div className="metric-card">
          <p>Market Cap</p>
          <h3>{bigMoney(stock.marketCap)}</h3>
        </div>
      </div>

      <h2>Latest Financials</h2>

      <div className="financial-table">
        <div>
          <strong>Revenue</strong>
          <span>{formatFact(financials.revenue)}</span>
        </div>

        <div>
          <strong>Operating Income</strong>
          <span>{formatFact(financials.operatingIncome)}</span>
        </div>

        <div>
          <strong>Net Income</strong>
          <span>{formatFact(financials.netIncome)}</span>
        </div>

        <div>
          <strong>Total Assets</strong>
          <span>{formatFact(financials.totalAssets)}</span>
        </div>

        <div>
          <strong>Total Liabilities</strong>
          <span>{formatFact(financials.totalLiabilities)}</span>
        </div>

        <div>
          <strong>Cash</strong>
          <span>{formatFact(financials.cash)}</span>
        </div>
      </div>

      <h2>SEC Reports</h2>

      <div className="filings-table">
        <div className="filings-row filings-header">
          <span>Form</span>
          <span>Filed</span>
          <span>Report Date</span>
          <span>Document</span>
        </div>

        {filings.map((filing) => (
          <div className="filings-row" key={filing.accessionNumber}>
            <span>{filing.form}</span>
            <span>{filing.filingDate}</span>
            <span>{filing.reportDate || "N/A"}</span>
            <a href={filing.url} target="_blank" rel="noreferrer">
              Open Filing
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}