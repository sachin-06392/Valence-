import React, { useEffect, useMemo, useState } from "react";
import "./MarketIntelligenceTerminal.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const tickerTape = [
  { symbol: "NVDA", price: "$141.22", change: "+2.4%" },
  { symbol: "PLTR", price: "$78.10", change: "+1.8%" },
  { symbol: "SNOW", price: "$134.44", change: "-0.6%" },
  { symbol: "CRWD", price: "$355.80", change: "+0.9%" },
  { symbol: "NET", price: "$88.42", change: "+1.2%" },
  { symbol: "DDOG", price: "$129.35", change: "-0.4%" },
];

const fallbackDeals = [
  {
    buyer: "Salesforce",
    target: "Informatica",
    value: "$8.0B",
    sector: "Data Infrastructure",
    status: "Announced",
    date: "2025-05-27",
    angle: "Strategic data cloud expansion",
    sourceName: "Salesforce Newsroom",
    sourceUrl:
      "https://www.salesforce.com/news/press-releases/2025/05/27/salesforce-signs-definitive-agreement-to-acquire-informatica/",
  },
  {
    buyer: "HPE",
    target: "Juniper Networks",
    value: "$14.0B",
    sector: "AI Networking",
    status: "Closed",
    date: "2025-07-02",
    angle: "AI networking scale-up",
    sourceName: "HPE Newsroom",
    sourceUrl:
      "https://www.hpe.com/us/en/newsroom/press-release/2025/07/hewlett-packard-enterprise-completes-acquisition-of-juniper-networks.html",
  },
  {
    buyer: "Synopsys",
    target: "Ansys",
    value: "$35.0B",
    sector: "Engineering Software",
    status: "Closed",
    date: "2025-07-17",
    angle: "EDA and simulation platform buildout",
    sourceName: "Synopsys Newsroom",
    sourceUrl: "https://news.synopsys.com/2025-07-17-Synopsys-Completes-Acquisition-of-Ansys",
  },
  {
    buyer: "Cisco",
    target: "Splunk",
    value: "$28.0B",
    sector: "Observability",
    status: "Closed",
    date: "2024-03-18",
    angle: "Security and data analytics consolidation",
    sourceName: "Cisco Newsroom",
    sourceUrl:
      "https://newsroom.cisco.com/c/r/newsroom/en/us/a/y2024/m03/cisco-completes-acquisition-of-splunk.html",
  },
  {
    buyer: "IBM",
    target: "HashiCorp",
    value: "$6.4B",
    sector: "Cloud Infrastructure",
    status: "Closed",
    date: "2025-02-27",
    angle: "Hybrid cloud automation",
    sourceName: "IBM Newsroom",
    sourceUrl: "https://newsroom.ibm.com/2025-02-27-IBM-Completes-Acquisition-of-HashiCorp",
  },
  {
    buyer: "Google",
    target: "Wiz",
    value: "$32.0B",
    sector: "Cloud Security",
    status: "Announced",
    date: "2025-03-18",
    angle: "Cloud-native security expansion",
    sourceName: "Google Cloud Blog",
    sourceUrl: "https://cloud.google.com/blog/products/identity-security/google-agreement-to-acquire-wiz",
  },
];

const movers = [
  { ticker: "PLTR", name: "Palantir", move: "+4.8%", metric: "AI software demand" },
  { ticker: "CRWD", name: "CrowdStrike", move: "+2.1%", metric: "Cybersecurity comps" },
  { ticker: "SNOW", name: "Snowflake", move: "-1.6%", metric: "Data infra reset" },
  { ticker: "MDB", name: "MongoDB", move: "+1.3%", metric: "Developer data platform" },
];

const multiples = [
  { sector: "AI / ML", evRev: "18.4x", growth: "31%", note: "Premium peer set" },
  { sector: "Cybersecurity", evRev: "12.1x", growth: "24%", note: "Durable public demand" },
  { sector: "Vertical SaaS", evRev: "8.6x", growth: "18%", note: "Rule-of-40 focus" },
  { sector: "FinTech", evRev: "5.2x", growth: "14%", note: "Margin quality matters" },
];

const tabDetails = {
  deals: {
    label: "M&A Tape",
    title: "Track strategic deal flow before choosing comps.",
    description:
      "Recent acquisitions show which sectors buyers are paying attention to and which strategic narratives are getting rewarded.",
  },
  movers: {
    label: "Market Movers",
    title: "Watch public comps react in real time.",
    description:
      "Use market movers to spot sentiment shifts across AI, cybersecurity, data infrastructure, and software peer groups.",
  },
  multiples: {
    label: "Sector Multiples",
    title: "Benchmark valuation context by category.",
    description:
      "Sector multiples give a quick read on how growth, margin quality, and category strength affect valuation ranges.",
  },
};

export default function MarketIntelligenceTerminal({
  privateCompany,
  results,
  loading,
  onRunAnalysis,
}) {
  const [activeTab, setActiveTab] = useState("deals");
  const [deals, setDeals] = useState(fallbackDeals.slice(0, 4));
  const [dealSource, setDealSource] = useState("official fallback");
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const [refreshingDeals, setRefreshingDeals] = useState(false);
  const [, setFallbackOffset] = useState(0);
  const activeDetail = tabDetails[activeTab];

  const rotateFallbackDeals = () => {
    setFallbackOffset((current) => {
      const next = (current + 1) % fallbackDeals.length;
      const rotated = [...fallbackDeals.slice(next), ...fallbackDeals.slice(0, next)];
      setDeals(rotated.slice(0, 4));
      setDealSource("official fallback");
      setUpdatedAt(new Date());
      return next;
    });
  };

  const loadLatestDeals = async ({ rotateOnFail = false } = {}) => {
    setRefreshingDeals(true);

    try {
      const response = await fetch(`${API_BASE}/api/market-intelligence/deals?limit=6`);

      if (!response.ok) {
        throw new Error("Could not load latest deals");
      }

      const payload = await response.json();
      const incomingDeals = Array.isArray(payload?.deals) ? payload.deals : [];

      if (!incomingDeals.length) {
        throw new Error("No deals returned");
      }

      setDeals(incomingDeals.slice(0, 4));
      setDealSource(payload?.source === "fmp" ? "live market feed" : "official fallback");
      setUpdatedAt(payload?.updatedAt ? new Date(payload.updatedAt) : new Date());
    } catch {
      if (rotateOnFail) {
        rotateFallbackDeals();
      }
    } finally {
      setRefreshingDeals(false);
    }
  };

  useEffect(() => {
    loadLatestDeals();

    const interval = setInterval(() => {
      loadLatestDeals({ rotateOnFail: true });
    }, 90000);

    const fallbackInterval = setInterval(() => {
      if (dealSource !== "live market feed") {
        rotateFallbackDeals();
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(fallbackInterval);
    };
    // dealSource intentionally omitted so polling cadence does not reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const context = useMemo(() => {
    const companyName = privateCompany?.company_name?.trim() || "your target";
    const compsCount = results?.comps_count ?? results?.comps?.length ?? 0;

    if (loading) {
      return "Screening public comps and valuation signals...";
    }

    if (compsCount) {
      return `${compsCount} comps found for ${companyName}. Market context is ready.`;
    }

    return "Track deal activity, public comps, and sector multiples before running your analysis.";
  }, [loading, privateCompany, results]);

  return (
    <section className="market-terminal" aria-label="Market intelligence terminal">
      <div className="terminal-topbar">
        <div className="terminal-window-controls" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span className="terminal-label">VALENCE MARKET INTELLIGENCE</span>
        <span className="terminal-live">Live Preview</span>
      </div>

      <div className="ticker-tape" aria-label="Market ticker tape">
        <div className="ticker-track">
          {[...tickerTape, ...tickerTape].map((item, index) => (
            <span key={`${item.symbol}-${index}`} className="ticker-chip">
              <strong>{item.symbol}</strong>
              <span>{item.price}</span>
              <em className={item.change.startsWith("+") ? "up" : "down"}>
                {item.change}
              </em>
            </span>
          ))}
        </div>
      </div>

      <div className="terminal-grid">
        <div className="terminal-main">
          <div className="terminal-headline">
            <span>Today&apos;s Signal</span>
            <h2>Deal activity and public market data, before you run the comp set.</h2>
            <p>{context}</p>
          </div>

          <div className="terminal-tabs" role="tablist" aria-label="Market intelligence views">
            {Object.entries(tabDetails).map(([key, detail]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeTab === key}
                className={activeTab === key ? "active" : ""}
                onClick={() => setActiveTab(key)}
              >
                {detail.label}
              </button>
            ))}
          </div>

          <div className="terminal-tab-description">
            <span>{activeDetail.label}</span>
            <h3>{activeDetail.title}</h3>
            <p>{activeDetail.description}</p>
          </div>

          {activeTab === "deals" && (
            <>
              <div className="deal-feed-controls">
                <span>
                  Updated {updatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} via {dealSource}
                </span>
                <button type="button" onClick={() => loadLatestDeals({ rotateOnFail: true })}>
                  {refreshingDeals ? "Refreshing..." : "Refresh deals"}
                </button>
              </div>

              <div className="deal-list">
                {deals.map((deal) => (
                  <article key={`${deal.buyer}-${deal.target}-${deal.date}`} className="deal-row">
                    <div>
                      <div className="deal-row-topline">
                        <span className="deal-status">{deal.status}</span>
                        {deal.date && <time>{deal.date}</time>}
                      </div>
                      <h3>
                        {deal.buyer} / {deal.target}
                      </h3>
                      <p>{deal.angle}</p>
                      {deal.sourceUrl && (
                        <a
                          className="deal-source-link"
                          href={deal.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Read official source: {deal.sourceName || "Source"}
                        </a>
                      )}
                    </div>
                    <div className="deal-meta">
                      <strong>{deal.value}</strong>
                      <span>{deal.sector}</span>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {activeTab === "movers" && (
            <div className="mover-grid">
              {movers.map((item) => (
                <article key={item.ticker} className="mover-card">
                  <div className="mover-symbol">{item.ticker}</div>
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.metric}</p>
                  </div>
                  <strong className={item.move.startsWith("+") ? "up" : "down"}>
                    {item.move}
                  </strong>
                </article>
              ))}
            </div>
          )}

          {activeTab === "multiples" && (
            <div className="multiple-table">
              <div className="multiple-header">
                <span>Sector</span>
                <span>EV/Rev</span>
                <span>Growth</span>
                <span>Read</span>
              </div>
              {multiples.map((row) => (
                <div key={row.sector} className="multiple-row">
                  <strong>{row.sector}</strong>
                  <span>{row.evRev}</span>
                  <span>{row.growth}</span>
                  <em>{row.note}</em>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="terminal-side">
          <div className="signal-card">
            <span>Active Strategic Buyers</span>
            <strong>42</strong>
            <p>Cloud, AI, cybersecurity, and vertical software acquirers tracked.</p>
          </div>

          <div className="signal-card accent">
            <span>Valuation Mode</span>
            <strong>{results ? "Ready" : "Standby"}</strong>
            <p>
              {results
                ? "Peer multiples are available for your report."
                : "Enter company data below to generate comps."}
            </p>
          </div>

          <button type="button" className="terminal-cta" onClick={onRunAnalysis}>
            Run My Comps Analysis
          </button>
        </aside>
      </div>
    </section>
  );
}
