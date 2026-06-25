import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import "./MADealDetail.css";

const isNumber = (value) => value !== null && value !== undefined && !Number.isNaN(Number(value));
const fmtB = (value) => (isNumber(value) ? `$${Number(value).toFixed(2)}B` : "N/A");
const fmtM = (value) => (isNumber(value) ? `$${Number(value).toFixed(0)}M` : "N/A");
const fmtX = (value) => (isNumber(value) ? `${Number(value).toFixed(1)}x` : "N/A");
const fmtPct = (value) => (isNumber(value) ? `${Number(value).toFixed(1)}%` : "N/A");

const dealStorageKey = (dealId) => `valenceMADeal:${dealId}`;

function readStoredModel(dealId) {
  try {
    const raw = sessionStorage.getItem(dealStorageKey(dealId)) || localStorage.getItem(dealStorageKey(dealId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function DetailPageShell({ children }) {
  return (
    <div className="ma-deal-page app">
      <nav className="nav">
        <div className="nav-left">
          <div className="logo">
            <img src="/logo4.png" alt="Valence logo" />
          </div>

          <span className="brand">Valence</span>
          <span className="nav-pill">BETA</span>
        </div>
      </nav>

      <main className="ma-deal-shell">{children}</main>
    </div>
  );
}

function StatCard({ label, value, helper }) {
  return (
    <div className="ma-deal-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {helper && <p>{helper}</p>}
    </div>
  );
}

function DealSection({ label, title, children }) {
  return (
    <section className="ma-deal-section">
      <span>{label}</span>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default function MADealDetail() {
  const { dealId } = useParams();
  const storedModel = useMemo(() => readStoredModel(dealId), [dealId]);

  if (!storedModel?.deal) {
    return (
      <DetailPageShell>
        <Link to="/#ma-studio" className="ma-back-link">
          Back to M&A Studio
        </Link>

        <div className="ma-deal-empty">
          <span>Model not loaded</span>
          <h1>Run a transaction screen first.</h1>
          <p>
            Full model pages are built from the deal case you select in the M&A Studio.
          </p>
        </div>
      </DetailPageShell>
    );
  }

  const { deal, assumptions = {}, meta = {} } = storedModel;
  const scoreTone = deal.score >= 75 ? "high" : deal.score >= 45 ? "medium" : "low";
  const funding = [
    ["Cash", assumptions.cash_pct],
    ["Debt", assumptions.debt_pct],
    ["Stock", assumptions.stock_pct],
  ];

  const stats = [
    ["Purchase EV", fmtB(deal.model.purchase_ev_b), "Premium-adjusted transaction enterprise value"],
    ["Strategic Score", deal.score, scoreTone === "low" ? "Low score signals weak adjacency or deal logic" : "Composite fit, affordability, and valuation read"],
    ["EPS Impact", fmtPct(deal.model.eps_change_pct), "Modeled first-pass accretion or dilution"],
    ["Deal / Buyer EV", fmtPct(deal.model.deal_size_to_acquirer_ev_pct), "Relative scale against acquirer enterprise value"],
  ];

  return (
    <DetailPageShell>
      <Link to="/#ma-studio" className="ma-back-link">
        Back to M&A Studio
      </Link>

      <header className={`ma-deal-hero ${scoreTone}`}>
        <div>
          <span>Transaction model</span>
          <h1>{deal.acquirer.name} acquires {deal.target.name}</h1>
          <p>
            Full case view for the selected M&A model, including strategic fit,
            valuation framing, funding mix, accretion bridge, diligence risks, and precedents.
          </p>
        </div>

        <div className="ma-deal-score">
          <span>Score</span>
          <strong>{deal.score}</strong>
          <p>{scoreTone === "low" ? "Weak fit" : scoreTone === "medium" ? "Needs diligence" : "Strong fit"}</p>
        </div>
      </header>

      <section className="ma-deal-stat-grid">
        {stats.map(([label, value, helper]) => (
          <StatCard key={label} label={label} value={value} helper={helper} />
        ))}
      </section>

      <section className="ma-deal-parties">
        <article>
          <span>Acquirer</span>
          <h2>{deal.acquirer.ticker}</h2>
          <strong>{deal.acquirer.name}</strong>
          <p>{deal.acquirer.sector}</p>
          <small>{fmtB(deal.acquirer.ev_b)} EV · {fmtX(deal.acquirer.ev_rev)} EV/Revenue</small>
        </article>

        <article>
          <span>Company being acquired</span>
          <h2>{deal.target.ticker}</h2>
          <strong>{deal.target.name}</strong>
          <p>{deal.target.sub || deal.target.sector}</p>
          <small>{fmtB(deal.target.ev_b)} EV · {fmtX(deal.target.ev_rev)} EV/Revenue</small>
        </article>
      </section>

      <div className="ma-deal-grid">
        <DealSection label="Model bridge" title="Funding and accretion">
          <div className="ma-deal-funding">
            {funding.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{fmtPct(value)}</strong>
              </div>
            ))}
          </div>

          <div className="ma-deal-mini-grid">
            <StatCard label="Offer premium" value={fmtPct(assumptions.premium_pct)} />
            <StatCard label="Cost synergies" value={fmtM(deal.model.cost_synergies_m)} />
            <StatCard label="Revenue synergies" value={fmtM(deal.model.revenue_synergies_m)} />
            <StatCard label="Screened cases" value={meta.screened_count || "N/A"} />
          </div>
        </DealSection>

        <DealSection label="Strategic fit" title="Why this deal works or fails">
          <ul className="ma-deal-list">
            {(deal.rationale || []).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </DealSection>

        <DealSection label="Diligence" title="Key questions before recommendation">
          <ul className="ma-deal-list">
            {(deal.risks || []).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </DealSection>

        <DealSection label="Market support" title="Comparable precedent logic">
          {deal.precedents?.length ? (
            <div className="ma-deal-precedents">
              {deal.precedents.map((precedent) => (
                <a
                  key={`${precedent.buyer}-${precedent.target}`}
                  href={precedent.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <strong>{precedent.buyer} / {precedent.target}</strong>
                  <span>{precedent.value} · {precedent.date}</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="ma-deal-muted">
              No direct precedent was attached to this generated case. Add live banker-grade precedent
              coverage before using this model in an external process.
            </p>
          )}
        </DealSection>
      </div>
    </DetailPageShell>
  );
}
