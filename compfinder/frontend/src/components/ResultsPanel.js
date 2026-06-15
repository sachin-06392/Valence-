import React, { useState } from 'react';
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './ResultsPanel.css';
import ReportButton from "./ReportButton";

const API_BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

function pick(obj, keys, fallback = null) {
  if (!obj) return fallback;

  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      return obj[key];
    }
  }

  return fallback;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    let clean = value
      .replace("$", "")
      .replace(/,/g, "")
      .replace("×", "")
      .replace("x", "")
      .replace("%", "")
      .trim();

    if (!clean || clean === "—" || clean.toLowerCase() === "n/a") return null;

    let multiplier = 1;

    if (clean.toUpperCase().endsWith("B")) {
      multiplier = 1000;
      clean = clean.slice(0, -1);
    } else if (clean.toUpperCase().endsWith("M")) {
      multiplier = 1;
      clean = clean.slice(0, -1);
    }

    const n = Number(clean);
    return Number.isFinite(n) ? n * multiplier : null;
  }

  return null;
}

function firstNumber(obj, keys) {
  for (const key of keys) {
    const n = toNumber(obj?.[key]);
    if (n !== null) return n;
  }

  return null;
}

function fmtM(n) {
  const v = toNumber(n);
  return v !== null ? `$${v.toFixed(0)}M` : '—';
}

function fmtB(n) {
  const v = toNumber(n);
  return v !== null ? `$${v.toFixed(2)}B` : '—';
}

function fmtPct(n) {
  const v = toNumber(n);
  return v !== null ? `${v.toFixed(1)}%` : '—';
}

function fmtX(n) {
  const v = toNumber(n);
  return v !== null ? `${v.toFixed(1)}×` : '—';
}

function normalizeCompanyForReport(c = {}) {
  const marketCapM =
    firstNumber(c, ["market_cap", "marketCap", "market_cap_m", "marketCapM"]) ??
    (toNumber(c.market_cap_b) !== null ? toNumber(c.market_cap_b) * 1000 : null);

  const enterpriseValueM =
    firstNumber(c, ["enterprise_value", "enterpriseValue", "ev", "ev_m", "enterprise_value_m"]) ??
    (toNumber(c.ev_b) !== null ? toNumber(c.ev_b) * 1000 : null);

  const revenueM =
    firstNumber(c, ["revenue", "Revenue", "revenue_m", "totalRevenue", "total_revenue_m", "sales"]) ??
    (toNumber(c.revenue_b) !== null ? toNumber(c.revenue_b) * 1000 : null);

  const ebitdaM =
    firstNumber(c, ["ebitda", "EBITDA", "ebitda_m"]) ??
    (toNumber(c.ebitda_b) !== null ? toNumber(c.ebitda_b) * 1000 : null);

  const grossProfitM =
    firstNumber(c, ["gross_profit", "grossProfit", "gross_profit_m"]) ??
    (
      revenueM !== null && toNumber(c.gross_margin) !== null
        ? revenueM * toNumber(c.gross_margin) / 100
        : null
    );

  const ebitdaMargin =
    firstNumber(c, ["ebitda_margin", "ebitdaMargin", "margin"]) ??
    (
      revenueM !== null && revenueM !== 0 && ebitdaM !== null
        ? ebitdaM / revenueM * 100
        : null
    );

  return {
    ...c,

    company: pick(c, ["company", "name", "company_name"], "N/A"),
    name: pick(c, ["name", "company", "company_name"], "N/A"),
    ticker: pick(c, ["ticker", "symbol"], "N/A"),
    symbol: pick(c, ["symbol", "ticker"], "N/A"),
    industry: pick(c, ["industry", "sector", "sub"], "N/A"),
    sub: pick(c, ["sub", "industry", "sector"], "N/A"),

    revenue: revenueM,
    ebitda: ebitdaM,
    grossProfit: grossProfitM,
    gross_profit: grossProfitM,

    marketCap: marketCapM,
    market_cap: marketCapM,
    enterpriseValue: enterpriseValueM,
    enterprise_value: enterpriseValueM,

    evRevenue: firstNumber(c, ["ev_rev", "evRevenue", "ev_revenue", "evToRevenue"]),
    ev_revenue: firstNumber(c, ["ev_rev", "evRevenue", "ev_revenue", "evToRevenue"]),
    evEbitda: firstNumber(c, ["ev_ebitda", "evEbitda", "evToEbitda"]),
    ev_ebitda: firstNumber(c, ["ev_ebitda", "evEbitda", "evToEbitda"]),
    evGrossProfit: firstNumber(c, ["ev_gp", "evGrossProfit", "ev_gross_profit"]),
    ev_gp: firstNumber(c, ["ev_gp", "evGrossProfit", "ev_gross_profit"]),

    rev_growth: firstNumber(c, ["rev_growth", "revenue_growth", "revenueGrowth"]),
    gross_margin: firstNumber(c, ["gross_margin", "grossMargin"]),
    ebitda_margin: ebitdaMargin,

    matchScore: firstNumber(c, ["match_score", "matchScore", "score"]),
    match_score: firstNumber(c, ["match_score", "matchScore", "score"]),
  };
}

function normalizePrivateCompanyForReport(privateCompany = {}) {
  const revenueM =
    firstNumber(privateCompany, ["revenue", "Revenue", "revenue_m", "targetRevenue"]) ??
    (toNumber(privateCompany.revenue_b) !== null ? toNumber(privateCompany.revenue_b) * 1000 : null);

  const ebitdaM =
    firstNumber(privateCompany, ["ebitda", "EBITDA", "ebitda_m", "targetEbitda"]) ??
    (toNumber(privateCompany.ebitda_b) !== null ? toNumber(privateCompany.ebitda_b) * 1000 : null);

  const margin =
    firstNumber(privateCompany, ["ebitda_margin", "ebitdaMargin", "margin"]) ??
    (
      revenueM !== null && revenueM !== 0 && ebitdaM !== null
        ? ebitdaM / revenueM * 100
        : null
    );

  return {
    ...privateCompany,
    name: pick(privateCompany, ["name", "company", "companyName", "targetCompany"], "Private Company"),
    company: pick(privateCompany, ["company", "name", "companyName", "targetCompany"], "Private Company"),
    industry: pick(privateCompany, ["industry", "sector"], "N/A"),
    sector: pick(privateCompany, ["sector", "industry"], "N/A"),
    revenue: revenueM,
    ebitda: ebitdaM,
    ebitda_margin: margin,
  };
}

function MatchBadge({ score }) {
  const safeScore = score != null ? Number(score).toFixed(0) : '—';
  const cls = score >= 85 ? 'match-high' : score >= 70 ? 'match-med' : 'match-low';
  return <span className={`match-badge ${cls}`}>{safeScore}%</span>;
}

function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function DownloadReportButton({ company, comps, privateCompany, results }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);

      const selectedComparable = normalizeCompanyForReport(company);
      const normalizedComps = Array.isArray(comps)
        ? comps.map(normalizeCompanyForReport)
        : [];

      const payload = {
        target: normalizePrivateCompanyForReport(privateCompany || {}),
        selectedComparable,
        comparables: normalizedComps,

        multiples: results?.multiples || {},
        implied: results?.implied || {},
        overall_range: results?.overall_range || null,
        sector_label: results?.sector_label || "",
        comps_count: results?.comps_count || normalizedComps.length,
      };

      const response = await fetch(`${API_BASE}/api/download-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Report download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const ticker =
        selectedComparable.ticker ||
        selectedComparable.symbol ||
        selectedComparable.company ||
        "company";

      const a = document.createElement("a");
      a.href = url;
      a.download = `valence-report-${ticker}.pdf`;
      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Could not download the report. Make sure the backend is running.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      type="button"
      className="download-report-btn"
      onClick={handleDownload}
      disabled={downloading}
    >
      {downloading ? "Downloading..." : "Download Report"}
    </button>
  );
}

function CompsTable({ comps = [], privateCompany, results }) {
  const [sort, setSort] = useState({ key: 'match_score', dir: -1 });

  const sorted = [...comps].sort((a, b) => {
    const av = toNumber(a?.[sort.key]);
    const bv = toNumber(b?.[sort.key]);

    const safeA = av === null ? -Infinity : av;
    const safeB = bv === null ? -Infinity : bv;

    return (safeA - safeB) * sort.dir;
  });

  const toggleSort = k => setSort(s => ({ key: k, dir: s.key === k ? -s.dir : -1 }));

  const Th = ({ k, label }) => (
    <th onClick={() => toggleSort(k)} className={`sortable ${sort.key === k ? 'active' : ''}`}>
      {label} {sort.key === k ? (sort.dir === -1 ? '↓' : '↑') : ''}
    </th>
  );

  return (
    <div className="table-wrap">
      <table className="comps-table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Company</th>
            <th>Sub-sector</th>
            <Th k="match_score" label="Match" />
            <Th k="market_cap_b" label="Mkt Cap" />
            <Th k="ev_b" label="EV" />
            <Th k="ev_rev" label="EV/Rev" />
            <Th k="ev_ebitda" label="EV/EBITDA" />
            <Th k="ev_gp" label="EV/GP" />
            <Th k="rev_growth" label="Rev Growth" />
            <Th k="gross_margin" label="Gross Margin" />
          </tr>
        </thead>

        <tbody>
          {sorted.map((c, i) => {
            const ticker = c.ticker || c.symbol || "company";

            return (
              <tr key={`${ticker}-${i}`} className={i === 0 ? 'top-row' : ''}>
                <td>
                  <Link
                    className="ticker ticker-link"
                    to={`/company/${encodeURIComponent(ticker)}`}
                  >
                    {ticker}
                  </Link>
                </td>

                <td className="name-cell">
                  <div className="company-name">{c.name || c.company || "N/A"}</div>

                  <div className="company-actions-inline">
                    <Link
                      className="basic-details-link"
                      to={`/company/${encodeURIComponent(ticker)}`}
                    >
                      Basic Details
                    </Link>

                    <DownloadReportButton
                      company={c}
                      comps={comps}
                      privateCompany={privateCompany}
                      results={results}
                    />
                  </div>
                </td>

                <td className="sub-cell">{c.sub || c.industry || "—"}</td>
                <td><MatchBadge score={c.match_score} /></td>
                <td>{fmtB(c.market_cap_b)}</td>
                <td>{fmtB(c.ev_b)}</td>
                <td className="num">{fmtX(c.ev_rev)}</td>
                <td className="num">{fmtX(c.ev_ebitda)}</td>
                <td className="num">{fmtX(c.ev_gp)}</td>
                <td className="num">{fmtPct(c.rev_growth)}</td>
                <td className="num">{fmtPct(c.gross_margin)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MultiplesTable({ multiples }) {
  const rows = [
    { key: 'ev_rev', label: 'EV / Revenue' },
    { key: 'ev_ebitda', label: 'EV / EBITDA' },
    { key: 'ev_gp', label: 'EV / Gross Profit' },
    { key: 'pe', label: 'P/E Ratio' },
  ];

  return (
    <div className="multiples-grid">
      {rows.map(r => {
        const m = multiples?.[r.key];
        if (!m) return null;

        return (
          <div key={r.key} className="mult-card">
            <div className="mult-label">{r.label}</div>
            <div className="mult-median">
              {fmtX(m.median)} <span className="mult-sub">median</span>
            </div>
            <div className="mult-range">
              {fmtX(m.p25)} – {fmtX(m.p75)} <span className="mult-sub">IQR</span>
            </div>
            <div className="mult-range">
              Range: {fmtX(m.min)} – {fmtX(m.max)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ValuationOutput({ implied = {}, overall_range }) {
  const methods = Object.values(implied);

  if (!methods.length) {
    return <p className="no-data">Add EBITDA and gross margin for more valuation methods.</p>;
  }

  const chartData = methods.map(m => ({
    name: m.method.replace('EV / ', '').replace(' Profit', ' P.'),
    low: m.low,
    mid: m.mid,
    high: m.high,
  }));

  return (
    <div>
      <div className="val-methods">
        {methods.map(m => (
          <div key={m.method} className="val-method-row">
            <div>
              <div className="val-method-name">{m.method}</div>
              <div className="val-method-calc">{m.label}</div>
            </div>

            <div className="val-method-results">
              <span className="val-range-low">{fmtM(m.low)}</span>
              <span className="val-arrow"> — </span>
              <span className="val-range-high">{fmtM(m.high)}</span>
              <span className="val-mid"> (mid: {fmtM(m.mid)})</span>
            </div>
          </div>
        ))}
      </div>

      <div className="chart-section">
        <div className="section-title">Valuation range by method ($M)</div>

        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 40, top: 8, bottom: 8 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}M`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={75} />
            <Tooltip formatter={v => [`$${v}M`]} />
            <Bar dataKey="low" name="Low" fill="#93c5fd" />
            <Bar dataKey="mid" name="Mid" fill="#3b82f6" />
            <Bar dataKey="high" name="High" fill="#1d4ed8" radius={[4, 4, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {overall_range && (
        <div className="implied-box">
          <div>
            <div className="implied-label">Implied enterprise value range</div>
            <div className="implied-range">
              {fmtM(overall_range.low)} – {fmtM(overall_range.high)}
            </div>
          </div>

          <div className="implied-note">
            Based on 25th–75th percentile of peer multiples
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultsPanel({
  results,
  loading = false,
  error = "",
  privateCompany = null
}) {
  const [tab, setTab] = useState('comps');

  if (loading) {
    return (
      <div className="results-panel loading-state">
        <div className="spinner" />
        <p>Screening companies and computing multiples…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-panel error-state">
        <div className="error-icon">⚠️</div>
        <p>{error}</p>
      </div>
    );
  }

  if (!results) return null;

  const {
    comps = [],
    multiples = {},
    implied = {},
    overall_range,
    sector_label,
    comps_count
  } = results;

  const medEVRev = multiples?.ev_rev?.median;
  const medEVEBITDA = multiples?.ev_ebitda?.median;

  return (
    <div className="results-panel">
      <div className="stats-row">
        <StatCard
          label="Comps found"
          value={comps_count ?? comps.length}
          sub={`in ${sector_label || "selected sector"}`}
        />

        <StatCard
          label="Median EV/Revenue"
          value={medEVRev != null ? `${medEVRev}×` : '—'}
          sub="peer median"
        />

        <StatCard
          label="Median EV/EBITDA"
          value={medEVEBITDA != null ? `${medEVEBITDA}×` : '—'}
          sub="peer median"
        />

        {overall_range && (
          <StatCard
            label="Implied EV range"
            value={`${fmtM(overall_range.low)} – ${fmtM(overall_range.high)}`}
            sub="25th–75th pctl"
          />
        )}
      </div>

      <div className="tabs">
        {[
          ['comps', 'Comparable Companies'],
          ['multiples', 'Multiples Summary'],
          ['valuation', 'Implied Valuation']
        ].map(([k, label]) => (
          <button
            key={k}
            className={`tab ${tab === k ? 'active' : ''}`}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tab === 'comps' && (
          <CompsTable
            comps={comps}
            privateCompany={privateCompany}
            results={results}
          />
        )}

        {tab === 'multiples' && (
          <div>
            <p className="section-desc">
              Multiples across the {comps_count ?? comps.length} closest public comparables.
            </p>

            <MultiplesTable multiples={multiples} />
          </div>
        )}

        {tab === 'valuation' && (
          <ValuationOutput
            implied={implied}
            overall_range={overall_range}
          />
        )}
      </div>
    </div>
  );
}