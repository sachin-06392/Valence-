import React, { useState } from 'react';
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './ResultsPanel.css';

const fmtM   = n => n != null ? `$${Number(n).toFixed(0)}M` : '—';
const fmtB   = n => n != null ? `$${Number(n).toFixed(2)}B` : '—';
const fmtPct = n => n != null ? `${Number(n).toFixed(1)}%` : '—';
const fmtX   = n => n != null ? `${Number(n).toFixed(1)}×` : '—';

function MatchBadge({ score }) {
  const cls = score >= 85 ? 'match-high' : score >= 70 ? 'match-med' : 'match-low';
  return <span className={`match-badge ${cls}`}>{score}%</span>;
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

function CompsTable({ comps }) {
  const [sort, setSort] = useState({ key: 'match_score', dir: -1 });

  const sorted = [...comps].sort((a, b) => {
    return ((a[sort.key] ?? -Infinity) - (b[sort.key] ?? -Infinity)) * sort.dir;
  });

  const toggleSort = k => {
    setSort(s => ({ key: k, dir: s.key === k ? -s.dir : -1 }));
  };

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
            <th>Details</th>
          </tr>
        </thead>

        <tbody>
          {sorted.map((c, i) => {
            const ticker = c.ticker || c.symbol;

            return (
              <tr key={ticker || c.name} className={i === 0 ? 'top-row' : ''}>
                <td>
                  {ticker ? (
                    <Link to={`/company/${ticker}`} className="ticker ticker-link">
                      {ticker}
                    </Link>
                  ) : (
                    <span className="ticker">—</span>
                  )}
                </td>

                <td className="name-cell">
                  {ticker ? (
                    <Link to={`/company/${ticker}`} className="company-name-link">
                      {c.name}
                    </Link>
                  ) : (
                    c.name
                  )}
                </td>

                <td className="sub-cell">{c.sub}</td>
                <td><MatchBadge score={c.match_score} /></td>
                <td>{fmtB(c.market_cap_b)}</td>
                <td>{fmtB(c.ev_b)}</td>
                <td className="num">{fmtX(c.ev_rev)}</td>
                <td className="num">{fmtX(c.ev_ebitda)}</td>
                <td className="num">{fmtX(c.ev_gp)}</td>
                <td className="num">{fmtPct(c.rev_growth)}</td>
                <td className="num">{fmtPct(c.gross_margin)}</td>

                <td>
                  {ticker ? (
                    <Link to={`/company/${ticker}`} className="view-details-btn">
                      View
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
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
        const m = multiples[r.key];
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

function ValuationOutput({ implied, overall_range }) {
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
          <div className="implied-note">Based on 25th–75th percentile of peer multiples</div>
        </div>
      )}
    </div>
  );
}

export default function ResultsPanel({ results, loading, error }) {
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

  const { comps, multiples, implied, overall_range, sector_label, comps_count } = results;

  const medEVRev = multiples?.ev_rev?.median;
  const medEVEBITDA = multiples?.ev_ebitda?.median;

  return (
    <div className="results-panel">
      <div className="stats-row">
        <StatCard label="Comps found" value={comps_count} sub={`in ${sector_label}`} />
        <StatCard label="Median EV/Revenue" value={medEVRev ? `${medEVRev}×` : '—'} sub="peer median" />
        <StatCard label="Median EV/EBITDA" value={medEVEBITDA ? `${medEVEBITDA}×` : '—'} sub="peer median" />

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
        {tab === 'comps' && <CompsTable comps={comps} />}

        {tab === 'multiples' && (
          <div>
            <p className="section-desc">
              Multiples across the {comps_count} closest public comparables.
            </p>
            <MultiplesTable multiples={multiples} />
          </div>
        )}

        {tab === 'valuation' && (
          <ValuationOutput implied={implied} overall_range={overall_range} />
        )}
      </div>
    </div>
  );
}