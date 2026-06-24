import React, { useEffect, useMemo, useState } from 'react';
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { apiUrl } from "../api";
import './ResultsPanel.css';

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

function sanitizeFileName(value) {
  return String(value || "company")
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
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

function CompsTable({
  comps = [],
  privateCompany,
  results,
  selectedCompIds,
  onToggleComp
}) {
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
            <th>Use</th>
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
            const isSelected = selectedCompIds.includes(c._compId);

            return (
              <tr key={c._compId} className={i === 0 ? 'top-row' : ''}>
                <td>
                  <Link
                    className="ticker ticker-link"
                    to={`/company/${encodeURIComponent(ticker)}`}
                    state={{
                      company: c,
                      comps,
                      privateCompany,
                      results
                    }}
                  >
                    {ticker}
                  </Link>
                </td>

                <td className="name-cell">
                  <div className="company-name">
                    {c.name || c.company || "N/A"}
                  </div>

                  <Link
                    className="basic-details-link"
                    to={`/company/${encodeURIComponent(ticker)}`}
                    state={{
                      company: c,
                      comps,
                      privateCompany,
                      results
                    }}
                  >
                    Basic Details
                  </Link>
                </td>

                <td>
                  <button
                    type="button"
                    className={`use-comp-btn ${isSelected ? "selected" : ""}`}
                    onClick={() => onToggleComp(c._compId)}
                  >
                    {isSelected ? "Selected" : "Add"}
                  </button>
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

function ReportBuilder({ selectedComps, privateCompany, overallRange, results }) {
  const [sections, setSections] = useState({
    overview: true,
    comps: true,
    multiples: true,
    valuation: true,
    market: false,
  });
  const [colorway, setColorway] = useState("midnight");
  const [componentStyle, setComponentStyle] = useState("strategy");
  const [density, setDensity] = useState("balanced");
  const [audience, setAudience] = useState("investor");
  const [featurePack, setFeaturePack] = useState("consulting");
  const [instructions, setInstructions] = useState(
    "Make this consulting-grade: executive storyline, quantified valuation defense, proper appendix support, judge Q&A prep, and polished strategy visuals."
  );
  const [downloading, setDownloading] = useState("");

  const enabledSections = Object.values(sections).filter(Boolean).length;
  const companyName = privateCompany?.company_name || "Target company";
  const leadComp = selectedComps[0] || {};

  const toggleSection = (key) => {
    setSections((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const buildPayload = () => {
    const selectedCompany = selectedComps[0] || {};

    return {
      selectedCompany,
      comps: selectedComps,
      privateCompany: privateCompany || {},
      multiples: results?.multiples || {},
      implied: results?.implied || {},
      overall_range: results?.overall_range || null,
      sector_label: results?.sector_label || "",
      comps_count: selectedComps.length,
      deckOptions: {
        sections,
        colorway,
        componentStyle,
        density,
        audience,
        featurePack,
        instructions,
      },
    };
  };

  const downloadFile = async (kind) => {
    if (!selectedComps.length) return;

    const isDeckExport = kind === "deck" || kind === "google";
    const exportLabel = kind === "report"
      ? "PDF"
      : kind === "google"
        ? "Google Slides-ready deck"
        : "PowerPoint deck";

    try {
      setDownloading(kind);

      const response = await fetch(apiUrl(isDeckExport ? "/api/generate-deck" : "/api/generate-report"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload()),
      });

      if (!response.ok) {
        let message = `${exportLabel} download failed`;

        try {
          const errorText = await response.text();
          if (errorText) message = errorText;
        } catch {
          // Keep the default message.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const ticker = sanitizeFileName(
        leadComp.ticker || leadComp.symbol || leadComp.name || privateCompany?.company_name
      );

      const a = document.createElement("a");
      a.href = url;
      if (kind === "report") {
        a.download = `valence-report-${ticker}.pdf`;
      } else if (kind === "google") {
        a.download = `valence-google-slides-${ticker}.pptx`;
      } else {
        a.download = `valence-deck-${ticker}.pptx`;
      }
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(
        isDeckExport
          ? `Could not download the ${exportLabel}. Make sure the backend has python-pptx installed and is running.`
          : "Could not download the report. Make sure the backend is running."
      );
    } finally {
      setDownloading("");
    }
  };

  const sectionRows = [
    ["overview", "Company overview"],
    ["comps", "Selected public comps"],
    ["multiples", "Trading multiples"],
    ["valuation", "Implied valuation range"],
    ["market", "Market intelligence appendix"],
  ];

  return (
    <aside className="report-builder">
      <div className="report-builder-head">
        <span>PowerPoint Studio</span>
        <strong>{enabledSections} sections</strong>
      </div>

      <div className="selected-comps-summary">
        <p>Selected peer set</p>
        <strong>{selectedComps.length || 0} companies</strong>
        <div>
          {selectedComps.length
            ? selectedComps.map((comp) => (
                <span key={comp._compId}>{comp.ticker || comp.symbol || comp.name || "Comp"}</span>
              ))
            : <em>Add comps from the table.</em>}
        </div>
      </div>

      <div className="report-section-list">
        {sectionRows.map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={sections[key]}
              onChange={() => toggleSection(key)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div className="deck-customizer">
        <label>
          <span>Colorway</span>
          <select value={colorway} onChange={(event) => setColorway(event.target.value)}>
            <option value="midnight">Midnight cyan</option>
            <option value="boardroom">Boardroom blue</option>
            <option value="emerald">Emerald slate</option>
            <option value="plum">Plum strategy</option>
            <option value="onyx">Onyx magenta</option>
            <option value="copper">Copper graphite</option>
            <option value="arctic">Arctic glass</option>
            <option value="terminal">Terminal green</option>
          </select>
        </label>

        <label>
          <span>Components</span>
          <select value={componentStyle} onChange={(event) => setComponentStyle(event.target.value)}>
            <option value="strategy">Strategy tiles</option>
            <option value="metrics">Metric bands</option>
            <option value="mosaic">Mosaic brief</option>
            <option value="banker">Banker memo</option>
            <option value="board">Board update</option>
          </select>
        </label>

        <label>
          <span>Audience</span>
          <select value={audience} onChange={(event) => setAudience(event.target.value)}>
            <option value="investor">Investor / banker</option>
            <option value="competition">Case competition judges</option>
            <option value="founder">Founder / operator</option>
            <option value="board">Board room</option>
          </select>
        </label>

        <label>
          <span>Feature pack</span>
          <select value={featurePack} onChange={(event) => setFeaturePack(event.target.value)}>
            <option value="consulting">Consulting-grade storyline</option>
            <option value="competition">Recommendation + judge Q&A</option>
            <option value="valuation">Valuation defense</option>
            <option value="market">Market intelligence appendix</option>
            <option value="operating">Operating KPI story</option>
          </select>
        </label>

        <label>
          <span>Detail level</span>
          <select value={density} onChange={(event) => setDensity(event.target.value)}>
            <option value="concise">Concise</option>
            <option value="balanced">Balanced</option>
            <option value="detailed">Detailed</option>
          </select>
        </label>
      </div>

      <label className="ai-deck-brief">
        <span>AI deck brief</span>
        <textarea
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          rows={5}
          placeholder="Tell Valence how to tailor the deck: competition angle, tone, judges, must-have slides, color direction, or team strategy."
        />
      </label>

      <div className="report-preview-card">
        <span>Deck Preview</span>
        <h3>{companyName} Comp Set Report</h3>
        <p>
          A consulting-style slide deck with {selectedComps.length || "selected"} public comps,
          {` ${colorway.replace("-", " ")} colors, ${componentStyle} components, ${audience.replace("-", " ")} audience framing, and ${density} detail`}
          {overallRange
            ? ` with an implied EV range of ${fmtM(overallRange.low)} to ${fmtM(overallRange.high)}.`
            : "."}
        </p>
      </div>

      <div className="export-format-heading">
        <span>Choose download format</span>
        <p>PDF is best for sharing. PPTX is editable in PowerPoint. Google Slides downloads a Slides-ready PPTX you can import into Google Slides.</p>
      </div>

      <div className="export-actions">
        <button
          type="button"
          className="report-btn pdf"
          onClick={() => downloadFile("report")}
          disabled={!selectedComps.length || downloading !== ""}
        >
          {downloading === "report" ? "Building PDF..." : "Download PDF"}
        </button>

        <button
          type="button"
          className="report-btn deck"
          onClick={() => downloadFile("deck")}
          disabled={!selectedComps.length || downloading !== ""}
        >
          {downloading === "deck" ? "Building PPTX..." : "Download PPTX"}
        </button>

        <button
          type="button"
          className="report-btn google"
          onClick={() => downloadFile("google")}
          disabled={!selectedComps.length || downloading !== ""}
        >
          {downloading === "google" ? "Building Slides file..." : "Google Slides"}
        </button>
      </div>
    </aside>
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
  const {
    comps = [],
    multiples = {},
    implied = {},
    overall_range,
    sector_label,
    comps_count
  } = results || {};
  const compsWithIds = useMemo(
    () => comps.map((comp, index) => ({
      ...comp,
      _compId: `${comp.ticker || comp.symbol || comp.name || comp.company || "company"}-${index}`,
    })),
    [comps]
  );
  const defaultCompIds = useMemo(
    () => compsWithIds.slice(0, Math.min(5, compsWithIds.length)).map((c) => c._compId),
    [compsWithIds]
  );
  const [selectedCompIds, setSelectedCompIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("valenceSelectedCompIds") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const selectedStillExists = selectedCompIds.some((id) =>
      compsWithIds.some((comp) => comp._compId === id)
    );

    if ((!selectedCompIds.length || !selectedStillExists) && defaultCompIds.length) {
      setSelectedCompIds(defaultCompIds);
    }
  }, [compsWithIds, defaultCompIds, selectedCompIds]);

  useEffect(() => {
    localStorage.setItem("valenceSelectedCompIds", JSON.stringify(selectedCompIds));
  }, [selectedCompIds]);

  const selectedComps = useMemo(
    () => compsWithIds.filter((c) => selectedCompIds.includes(c._compId)),
    [compsWithIds, selectedCompIds]
  );

  const toggleComp = (compId) => {
    setSelectedCompIds((current) => (
      current.includes(compId)
        ? current.filter((item) => item !== compId)
        : [...current, compId]
    ));
  };

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

      <div className="results-action-bar">
        <div>
          <strong>Ready to package this analysis?</strong>
          <span>Use the PowerPoint studio to choose slides, colors, audience, and deck style.</span>
        </div>
        <button type="button" onClick={() => setTab("export")}>
          Make PowerPoint
        </button>
      </div>

      <div className="tabs">
        {[
          ['comps', 'Comparable Companies'],
          ['multiples', 'Multiples Summary'],
          ['valuation', 'Implied Valuation'],
          ['export', 'Make PowerPoint']
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
          <div className="comp-builder-grid table-only">
            <CompsTable
              comps={compsWithIds}
              privateCompany={privateCompany}
              results={results}
              selectedCompIds={selectedCompIds}
              onToggleComp={toggleComp}
            />
          </div>
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

        {tab === 'export' && (
          <ReportBuilder
            selectedComps={selectedComps}
            privateCompany={privateCompany}
            overallRange={overall_range}
            results={results}
          />
        )}
      </div>
    </div>
  );
}
