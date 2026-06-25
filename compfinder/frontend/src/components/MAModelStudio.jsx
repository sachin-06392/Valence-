import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../api";
import "./MAModelStudio.css";

const fmtB = (value) => (value != null ? `$${Number(value).toFixed(2)}B` : "-");
const fmtM = (value) => (value != null ? `$${Number(value).toFixed(0)}M` : "-");
const fmtX = (value) => (value != null ? `${Number(value).toFixed(1)}x` : "-");
const fmtPct = (value) => (value != null ? `${Number(value).toFixed(1)}%` : "-");

const defaultAssumptions = {
  acquirer_ticker: "",
  target_ticker: "",
  target_sector: "",
  target_query: "",
  premium_pct: 25,
  cash_pct: 35,
  debt_pct: 35,
  stock_pct: 30,
  cost_synergy_pct: 8,
  revenue_synergy_pct: 4,
  max_results: 5,
  candidate_limit: 120,
};

const fallbackUniverse = [
  { ticker: "MSFT", name: "Microsoft", sector: "Enterprise Software / SaaS", raw_sector: "saas_tech", sub: "Cloud / AI / Enterprise Software", ev_b: 3600, ev_rev: 13.4, has_financials: true },
  { ticker: "CRM", name: "Salesforce", sector: "Enterprise Software / SaaS", raw_sector: "saas_tech", sub: "CRM / Enterprise Applications", ev_b: 265, ev_rev: 7.6, has_financials: true },
  { ticker: "NOW", name: "ServiceNow", sector: "Enterprise Software / SaaS", raw_sector: "saas_tech", sub: "Workflow Automation", ev_b: 192, ev_rev: 19.2, has_financials: true },
  { ticker: "ADBE", name: "Adobe", sector: "Enterprise Software / SaaS", raw_sector: "saas_tech", sub: "Creative / Marketing Software", ev_b: 210, ev_rev: 10.1, has_financials: true },
  { ticker: "ORCL", name: "Oracle", sector: "Enterprise Software / SaaS", raw_sector: "saas_tech", sub: "Database / Cloud Software", ev_b: 520, ev_rev: 9.6, has_financials: true },
  { ticker: "SNOW", name: "Snowflake", sector: "Enterprise Software / SaaS", raw_sector: "saas_tech", sub: "Data Platform", ev_b: 43, ev_rev: 12.3, has_financials: true },
  { ticker: "DDOG", name: "Datadog", sector: "Enterprise Software / SaaS", raw_sector: "saas_tech", sub: "Observability", ev_b: 42, ev_rev: 15.6, has_financials: true },
  { ticker: "CRWD", name: "CrowdStrike", sector: "Enterprise Software / SaaS", raw_sector: "saas_tech", sub: "Cybersecurity", ev_b: 86, ev_rev: 22.6, has_financials: true },
  { ticker: "PANW", name: "Palo Alto Networks", sector: "Enterprise Software / SaaS", raw_sector: "saas_tech", sub: "Cybersecurity", ev_b: 120, ev_rev: 13.8, has_financials: true },
  { ticker: "ZM", name: "Zoom Video", sector: "Enterprise Software / SaaS", raw_sector: "saas_tech", sub: "Video Collaboration", ev_b: 15, ev_rev: 3.2, has_financials: true },
  { ticker: "DOCN", name: "DigitalOcean", sector: "Enterprise Software / SaaS", raw_sector: "saas_tech", sub: "Cloud Infrastructure", ev_b: 3.4, ev_rev: 4.4, has_financials: true },
  { ticker: "BILL", name: "BILL", sector: "Enterprise Software / SaaS", raw_sector: "saas_tech", sub: "Office of the CFO", ev_b: 4.8, ev_rev: 3.7, has_financials: true },
  { ticker: "SHOP", name: "Shopify", sector: "Consumer / Retail", raw_sector: "consumer", sub: "Commerce Platform", ev_b: 145, ev_rev: 15.1, has_financials: true },
  { ticker: "PYPL", name: "PayPal", sector: "FinTech / Payments", raw_sector: "financial", sub: "Digital Payments", ev_b: 72, ev_rev: 2.3, has_financials: true },
  { ticker: "SQ", name: "Block", sector: "FinTech / Payments", raw_sector: "financial", sub: "Merchant / Consumer Finance", ev_b: 45, ev_rev: 2.0, has_financials: true },
  { ticker: "ISRG", name: "Intuitive Surgical", sector: "Healthcare Technology", raw_sector: "healthcare", sub: "Medical Devices", ev_b: 147, ev_rev: 18.4, has_financials: true },
  { ticker: "VEEV", name: "Veeva Systems", sector: "Healthcare Technology", raw_sector: "healthcare", sub: "Life Sciences Software", ev_b: 34, ev_rev: 14.2, has_financials: true },
  { ticker: "IBM", name: "IBM", sector: "Industrial Technology", raw_sector: "industrials", sub: "Hybrid Cloud / IT Services", ev_b: 235, ev_rev: 3.6, has_financials: true },
  { ticker: "CSCO", name: "Cisco", sector: "Industrial Technology", raw_sector: "industrials", sub: "Networking / Security", ev_b: 205, ev_rev: 3.8, has_financials: true },
  { ticker: "AMD", name: "AMD", sector: "Industrial Technology", raw_sector: "industrials", sub: "AI Semiconductors", ev_b: 260, ev_rev: 10.5, has_financials: true },
  { ticker: "ANTH", name: "Anthropic", sector: "Enterprise Software / SaaS", raw_sector: "saas_tech", sub: "Frontier AI / Foundation Models", ev_b: 60, ev_rev: null, has_financials: true },
];

const publicCompanySeedRows = `
NVDA|NVIDIA|Industrial Technology|industrials|AI Semiconductors
GOOGL|Alphabet|Enterprise Software / SaaS|saas_tech|Search / Cloud / AI
AAPL|Apple|Consumer / Retail|consumer|Consumer Technology
AMZN|Amazon|Consumer / Retail|consumer|E-Commerce / Cloud
AVGO|Broadcom|Industrial Technology|industrials|Semiconductors / Infrastructure Software
TSLA|Tesla|Industrial Technology|industrials|EV / Energy
META|Meta Platforms|Enterprise Software / SaaS|saas_tech|Social / Advertising / AI
MU|Micron Technology|Industrial Technology|industrials|Memory Semiconductors
BRK-B|Berkshire Hathaway|All Public Companies|public_unclassified|Diversified Holding Company
LLY|Eli Lilly|Healthcare Technology|healthcare|Pharmaceuticals
WMT|Walmart|Consumer / Retail|consumer|Retail
JPM|JPMorgan Chase|FinTech / Payments|financial|Banking
ASML|ASML Holding|Industrial Technology|industrials|Semiconductor Equipment
V|Visa|FinTech / Payments|financial|Payments Network
INTC|Intel|Industrial Technology|industrials|Semiconductors
XOM|Exxon Mobil|Industrial Technology|industrials|Energy
JNJ|Johnson & Johnson|Healthcare Technology|healthcare|Healthcare Products
AMAT|Applied Materials|Industrial Technology|industrials|Semiconductor Equipment
LRCX|Lam Research|Industrial Technology|industrials|Semiconductor Equipment
ARM|Arm Holdings|Industrial Technology|industrials|Semiconductor IP
CAT|Caterpillar|Industrial Technology|industrials|Heavy Equipment
MA|Mastercard|FinTech / Payments|financial|Payments Network
COST|Costco Wholesale|Consumer / Retail|consumer|Retail
BAC|Bank of America|FinTech / Payments|financial|Banking
ABBV|AbbVie|Healthcare Technology|healthcare|Pharmaceuticals
GE|General Electric|Industrial Technology|industrials|Industrial Systems
UNH|UnitedHealth Group|Healthcare Technology|healthcare|Managed Care
MS|Morgan Stanley|FinTech / Payments|financial|Capital Markets
CVX|Chevron|Industrial Technology|industrials|Energy
PG|Procter & Gamble|Consumer / Retail|consumer|Consumer Products
KO|Coca-Cola|Consumer / Retail|consumer|Beverages
HD|Home Depot|Consumer / Retail|consumer|Home Improvement Retail
GS|Goldman Sachs|FinTech / Payments|financial|Investment Banking
NFLX|Netflix|Consumer / Retail|consumer|Streaming Media
PLTR|Palantir Technologies|Enterprise Software / SaaS|saas_tech|Data Analytics / AI
KLAC|KLA|Industrial Technology|industrials|Semiconductor Equipment
MRK|Merck|Healthcare Technology|healthcare|Pharmaceuticals
GEV|GE Vernova|Industrial Technology|industrials|Power / Energy
PM|Philip Morris International|Consumer / Retail|consumer|Consumer Products
AZN|AstraZeneca|Healthcare Technology|healthcare|Pharmaceuticals
TXN|Texas Instruments|Industrial Technology|industrials|Semiconductors
DELL|Dell Technologies|Industrial Technology|industrials|Enterprise Hardware
RTX|RTX|Industrial Technology|industrials|Aerospace / Defense
BABA|Alibaba|Consumer / Retail|consumer|E-Commerce / Cloud
WFC|Wells Fargo|FinTech / Payments|financial|Banking
MRVL|Marvell Technology|Industrial Technology|industrials|Semiconductors
WDC|Western Digital|Industrial Technology|industrials|Storage Hardware
C|Citigroup|FinTech / Payments|financial|Banking
STX|Seagate Technology|Industrial Technology|industrials|Storage Hardware
LIN|Linde|Industrial Technology|industrials|Industrial Gases
AXP|American Express|FinTech / Payments|financial|Payments / Credit
FTNT|Fortinet|Enterprise Software / SaaS|saas_tech|Cybersecurity
ANET|Arista Networks|Industrial Technology|industrials|Cloud Networking
QCOM|Qualcomm|Industrial Technology|industrials|Semiconductors
MCD|McDonald's|Consumer / Retail|consumer|Restaurants
TMUS|T-Mobile US|All Public Companies|public_unclassified|Telecommunications
PEP|PepsiCo|Consumer / Retail|consumer|Food / Beverage
NVO|Novo Nordisk|Healthcare Technology|healthcare|Pharmaceuticals
SAP|SAP|Enterprise Software / SaaS|saas_tech|Enterprise Applications
AMGN|Amgen|Healthcare Technology|healthcare|Biotechnology
NEE|NextEra Energy|Industrial Technology|industrials|Utilities / Clean Energy
BA|Boeing|Industrial Technology|industrials|Aerospace
DIS|Disney|Consumer / Retail|consumer|Media / Entertainment
BLK|BlackRock|FinTech / Payments|financial|Asset Management
TMO|Thermo Fisher Scientific|Healthcare Technology|healthcare|Life Sciences Tools
SCHW|Charles Schwab|FinTech / Payments|financial|Brokerage
APP|AppLovin|Enterprise Software / SaaS|saas_tech|Advertising Software
ETN|Eaton|Industrial Technology|industrials|Electrical Equipment
DE|Deere|Industrial Technology|industrials|Agricultural Equipment
T|AT&T|All Public Companies|public_unclassified|Telecommunications
GILD|Gilead Sciences|Healthcare Technology|healthcare|Biotechnology
ABT|Abbott Laboratories|Healthcare Technology|healthcare|Medical Devices
UNP|Union Pacific|Industrial Technology|industrials|Rail Transportation
BX|Blackstone|FinTech / Payments|financial|Alternative Asset Management
GLW|Corning|Industrial Technology|industrials|Specialty Materials
PFE|Pfizer|Healthcare Technology|healthcare|Pharmaceuticals
HON|Honeywell|Industrial Technology|industrials|Industrial Automation
UBER|Uber Technologies|Consumer / Retail|consumer|Mobility / Delivery Marketplace
BKNG|Booking Holdings|Consumer / Retail|consumer|Travel Marketplace
PLD|Prologis|All Public Companies|public_unclassified|Logistics Real Estate
CB|Chubb|FinTech / Payments|financial|Insurance
SPGI|S&P Global|FinTech / Payments|financial|Financial Data
LMT|Lockheed Martin|Industrial Technology|industrials|Defense
VRT|Vertiv|Industrial Technology|industrials|Data Center Infrastructure
LOW|Lowe's|Consumer / Retail|consumer|Home Improvement Retail
PGR|Progressive|FinTech / Payments|financial|Insurance
PH|Parker-Hannifin|Industrial Technology|industrials|Motion / Control Systems
VRTX|Vertex Pharmaceuticals|Healthcare Technology|healthcare|Biotechnology
SYK|Stryker|Healthcare Technology|healthcare|Medical Devices
SBUX|Starbucks|Consumer / Retail|consumer|Restaurants
PDD|PDD Holdings|Consumer / Retail|consumer|E-Commerce Marketplace
HWM|Howmet Aerospace|Industrial Technology|industrials|Aerospace Components
BMY|Bristol Myers Squibb|Healthcare Technology|healthcare|Pharmaceuticals
NEM|Newmont|Industrial Technology|industrials|Mining
CDNS|Cadence Design Systems|Enterprise Software / SaaS|saas_tech|EDA Software
EQIX|Equinix|All Public Companies|public_unclassified|Data Center REIT
PWR|Quanta Services|Industrial Technology|industrials|Infrastructure Services
TT|Trane Technologies|Industrial Technology|industrials|Building Systems
SO|Southern Company|Industrial Technology|industrials|Utilities
MAR|Marriott International|Consumer / Retail|consumer|Hospitality
MDT|Medtronic|Healthcare Technology|healthcare|Medical Devices
FCX|Freeport-McMoRan|Industrial Technology|industrials|Mining
CMI|Cummins|Industrial Technology|industrials|Engines / Power
ACN|Accenture|Industrial Technology|industrials|IT Services / Consulting
DUK|Duke Energy|Industrial Technology|industrials|Utilities
CEG|Constellation Energy|Industrial Technology|industrials|Power
HOOD|Robinhood Markets|FinTech / Payments|financial|Retail Brokerage
SPOT|Spotify|Consumer / Retail|consumer|Audio Streaming
PNC|PNC Financial Services|FinTech / Payments|financial|Banking
MCK|McKesson|Healthcare Technology|healthcare|Healthcare Distribution
CME|CME Group|FinTech / Payments|financial|Exchange / Market Infrastructure
KKR|KKR|FinTech / Payments|financial|Alternative Asset Management
INTU|Intuit|Enterprise Software / SaaS|saas_tech|Financial Software
ADP|ADP|Enterprise Software / SaaS|saas_tech|Payroll / HCM
PAYX|Paychex|Enterprise Software / SaaS|saas_tech|Payroll / HCM
TEAM|Atlassian|Enterprise Software / SaaS|saas_tech|Collaboration / DevOps
WDAY|Workday|Enterprise Software / SaaS|saas_tech|HCM / Finance SaaS
MDB|MongoDB|Enterprise Software / SaaS|saas_tech|Database Software
ZS|Zscaler|Enterprise Software / SaaS|saas_tech|Cybersecurity
OKTA|Okta|Enterprise Software / SaaS|saas_tech|Identity Security
HUBS|HubSpot|Enterprise Software / SaaS|saas_tech|CRM / Marketing Software
NET|Cloudflare|Enterprise Software / SaaS|saas_tech|Network / Security
GTLB|GitLab|Enterprise Software / SaaS|saas_tech|DevOps
FROG|JFrog|Enterprise Software / SaaS|saas_tech|DevOps Platform
ESTC|Elastic|Enterprise Software / SaaS|saas_tech|Search / Observability
CFLT|Confluent|Enterprise Software / SaaS|saas_tech|Data Streaming
TWLO|Twilio|Enterprise Software / SaaS|saas_tech|Communications Platform
FIVN|Five9|Enterprise Software / SaaS|saas_tech|Contact Center
PATH|UiPath|Enterprise Software / SaaS|saas_tech|Automation Software
AI|C3.ai|Enterprise Software / SaaS|saas_tech|Enterprise AI
DOCU|DocuSign|Enterprise Software / SaaS|saas_tech|Agreement Cloud
BOX|Box|Enterprise Software / SaaS|saas_tech|Content Cloud
DBX|Dropbox|Enterprise Software / SaaS|saas_tech|File Collaboration
ASAN|Asana|Enterprise Software / SaaS|saas_tech|Work Management
MNDY|Monday.com|Enterprise Software / SaaS|saas_tech|Work Management
APPF|AppFolio|Enterprise Software / SaaS|saas_tech|Vertical Software
TOST|Toast|FinTech / Payments|financial|Restaurant Payments / Software
FOUR|Shift4 Payments|FinTech / Payments|financial|Payments
FIS|Fidelity National Information Services|FinTech / Payments|financial|Financial Infrastructure
FI|Fiserv|FinTech / Payments|financial|Payments / Fintech
GPN|Global Payments|FinTech / Payments|financial|Payments
SOFI|SoFi Technologies|FinTech / Payments|financial|Digital Banking
AFRM|Affirm|FinTech / Payments|financial|Consumer Credit
UPST|Upstart|FinTech / Payments|financial|AI Lending
IBKR|Interactive Brokers|FinTech / Payments|financial|Brokerage
LPLA|LPL Financial|FinTech / Payments|financial|Wealth Management
PAYO|Payoneer|FinTech / Payments|financial|Cross-Border Payments
ETSY|Etsy|Consumer / Retail|consumer|Marketplace
EBAY|eBay|Consumer / Retail|consumer|Marketplace
DASH|DoorDash|Consumer / Retail|consumer|Local Delivery
ABNB|Airbnb|Consumer / Retail|consumer|Travel Marketplace
MELI|MercadoLibre|Consumer / Retail|consumer|E-Commerce / Fintech
CPNG|Coupang|Consumer / Retail|consumer|E-Commerce
CHWY|Chewy|Consumer / Retail|consumer|Pet E-Commerce
W|Wayfair|Consumer / Retail|consumer|Home E-Commerce
DOCS|Doximity|Healthcare Technology|healthcare|Healthcare Network
TDOC|Teladoc Health|Healthcare Technology|healthcare|Telehealth
DXCM|DexCom|Healthcare Technology|healthcare|Diabetes Devices
PODD|Insulet|Healthcare Technology|healthcare|Medical Devices
NTRA|Natera|Healthcare Technology|healthcare|Diagnostics
EXAS|Exact Sciences|Healthcare Technology|healthcare|Diagnostics
CERT|Certara|Healthcare Technology|healthcare|Life Sciences Software
GH|Guardant Health|Healthcare Technology|healthcare|Diagnostics
TMDX|TransMedics|Healthcare Technology|healthcare|Medical Devices
HQY|HealthEquity|Healthcare Technology|healthcare|Health Savings Accounts
OMCL|Omnicell|Healthcare Technology|healthcare|Pharmacy Automation
GNRC|Generac|Industrial Technology|industrials|Power Generation
CWST|Casella Waste Systems|Industrial Technology|industrials|Waste Management
ITRI|Itron|Industrial Technology|industrials|Smart Grid
AEIS|Advanced Energy Industries|Industrial Technology|industrials|Power Electronics
HLIO|Helios Technologies|Industrial Technology|industrials|Industrial Components
ROAD|Construction Partners|Industrial Technology|industrials|Infrastructure Construction
HAYW|Hayward Holdings|Industrial Technology|industrials|Water Systems
ERII|Energy Recovery|Industrial Technology|industrials|Water / Energy Efficiency
CSWI|CSW Industrials|Industrial Technology|industrials|Specialty Industrial
FELE|Franklin Electric|Industrial Technology|industrials|Water Systems
GTES|Gates Industrial|Industrial Technology|industrials|Industrial Components
GIS|General Mills|Consumer / Retail|consumer|Packaged Food
K|Kellanova|Consumer / Retail|consumer|Packaged Food
CPB|Campbell's|Consumer / Retail|consumer|Packaged Food
HSY|Hershey|Consumer / Retail|consumer|Packaged Food
MDLZ|Mondelez International|Consumer / Retail|consumer|Packaged Food
KHC|Kraft Heinz|Consumer / Retail|consumer|Packaged Food
CAG|Conagra Brands|Consumer / Retail|consumer|Packaged Food
SJM|J.M. Smucker|Consumer / Retail|consumer|Packaged Food
`;

const seededTickers = new Set(fallbackUniverse.map((company) => company.ticker));
publicCompanySeedRows
  .trim()
  .split("\n")
  .map((row) => row.split("|"))
  .forEach(([ticker, name, sector, raw_sector, sub]) => {
    const cleanTicker = String(ticker || "").trim().toUpperCase();
    if (!cleanTicker || seededTickers.has(cleanTicker)) return;
    seededTickers.add(cleanTicker);
    fallbackUniverse.push({
      ticker: cleanTicker,
      name: String(name || cleanTicker).trim(),
      sector: String(sector || "All Public Companies").trim(),
      raw_sector: String(raw_sector || "public_unclassified").trim(),
      sub: String(sub || "Public Company").trim(),
      ev_b: null,
      ev_rev: null,
      has_financials: false,
      source: "Valence Public Company Seed",
    });
  });

const fallbackSectors = [
  { key: "saas_tech", label: "Enterprise Software / SaaS" },
  { key: "healthcare", label: "Healthcare Technology" },
  { key: "financial", label: "FinTech / Payments" },
  { key: "consumer", label: "Consumer / Retail" },
  { key: "industrials", label: "Industrial Technology" },
  { key: "public_unclassified", label: "All Public Companies" },
];

const normalizeSecUniverse = (data) => {
  if (!data || typeof data !== "object") {
    return [];
  }

  return Object.values(data)
    .map((item) => ({
      ticker: String(item?.ticker || "").toUpperCase(),
      name: item?.title || item?.ticker || "",
      sector: "All Public Companies",
      raw_sector: "public_unclassified",
      sub: "SEC Public Issuer",
      ev_b: null,
      ev_rev: null,
      has_financials: false,
      source: "SEC Company Tickers",
    }))
    .filter((company) => company.ticker && company.name)
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
};

const mergeCuratedMetrics = (companies) => {
  const curatedByTicker = new Map(fallbackUniverse.map((company) => [company.ticker, company]));

  return companies.map((company) => {
    const curated = curatedByTicker.get(company.ticker);
    return curated ? { ...company, ...curated, source: "SEC Ticker Universe + Valence Metrics" } : company;
  });
};

const mergeCompanyLists = (...lists) => {
  const byTicker = new Map();

  lists.flat().forEach((company) => {
    if (!company?.ticker) return;
    const ticker = company.ticker.toUpperCase();
    const existing = byTicker.get(ticker);
    byTicker.set(ticker, {
      ...existing,
      ...company,
      ticker,
      has_financials: Boolean(company.has_financials || existing?.has_financials),
    });
  });

  return Array.from(byTicker.values()).sort((a, b) => a.ticker.localeCompare(b.ticker));
};

function AssumptionField({ label, value, onChange, min = 0, max = 100, suffix = "%" }) {
  return (
    <label className="ma-assumption">
      <span>{label}</span>
      <div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <strong>
          {value}
          {suffix}
        </strong>
      </div>
    </label>
  );
}

function ScoreMeter({ score }) {
  const width = Math.max(0, Math.min(Number(score || 0), 99));
  return (
    <div className="ma-score-meter" aria-label={`Deal score ${score}`}>
      <span style={{ width: `${width}%` }} />
    </div>
  );
}

const dealStorageKey = (dealId) => `valenceMADeal:${dealId}`;

const createDealId = (deal) =>
  `${deal?.acquirer?.ticker || "buyer"}-${deal?.target?.ticker || "target"}`.toLowerCase();

function RecommendationCard({ item, isActive, onSelect, onOpen }) {
  const scoreTone = item.score >= 75 ? "high" : item.score >= 45 ? "medium" : "low";

  return (
    <article className={`ma-reco-card ${scoreTone} ${isActive ? "active" : ""}`}>
      <button type="button" className="ma-reco-card-main" onClick={onOpen}>
        <div className="ma-reco-top">
          <span>{item.target.ticker}</span>
          <strong className={`score-${scoreTone}`}>{item.score}</strong>
        </div>
        <h3>{item.acquirer.name} acquires {item.target.name}</h3>
        <p>{item.rationale?.[0]}</p>
        <ScoreMeter score={item.score} />
        <div className="ma-reco-metrics">
          <span>{fmtB(item.model.purchase_ev_b)} deal EV</span>
          <span>{fmtPct(item.model.eps_change_pct)} EPS</span>
        </div>
      </button>

      <div className="ma-reco-actions">
        <button type="button" className="ma-open-model-btn subtle" onClick={onSelect}>
          Quick view
        </button>
        <button type="button" className="ma-open-model-btn" onClick={onOpen}>
          Open full model
        </button>
      </div>
    </article>
  );
}

function DetailPanel({ deal, onOpen }) {
  if (!deal) {
    return (
      <div className="ma-detail-panel empty">
        <p>Select a deal idea to inspect the model.</p>
      </div>
    );
  }

  const stats = [
    ["Purchase EV", fmtB(deal.model.purchase_ev_b)],
    ["Target EV/Revenue", fmtX(deal.target.ev_rev)],
    ["Deal / acquirer EV", fmtPct(deal.model.deal_size_to_acquirer_ev_pct)],
    ["Modeled EPS impact", fmtPct(deal.model.eps_change_pct)],
    ["Cost synergies", fmtM(deal.model.cost_synergies_m)],
    ["Revenue synergies", fmtM(deal.model.revenue_synergies_m)],
  ];

  return (
    <article className="ma-detail-panel">
      <div className="ma-detail-header">
        <div>
          <span>Recommended transaction</span>
          <h2>{deal.acquirer.name} / {deal.target.name}</h2>
        </div>
        <strong>{deal.score}</strong>
      </div>

      <div className="ma-parties">
        <div>
          <span>Acquirer</span>
          <strong>{deal.acquirer.ticker}</strong>
          <p>{deal.acquirer.sector}</p>
          <small>{fmtB(deal.acquirer.ev_b)} EV · {fmtX(deal.acquirer.ev_rev)} EV/Rev</small>
        </div>
        <div>
          <span>Target</span>
          <strong>{deal.target.ticker}</strong>
          <p>{deal.target.sub}</p>
          <small>{fmtB(deal.target.ev_b)} EV · {fmtX(deal.target.ev_rev)} EV/Rev</small>
        </div>
      </div>

      <div className="ma-stat-grid">
        {stats.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <section className="ma-detail-section">
        <h3>Investment thesis</h3>
        <ul>
          {deal.rationale.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="ma-detail-section">
        <h3>Risks to diligence</h3>
        <ul>
          {deal.risks.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      {!!deal.precedents?.length && (
        <section className="ma-detail-section">
          <h3>Relevant precedents</h3>
          <div className="ma-precedents">
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
        </section>
      )}

      <button type="button" className="ma-open-model-btn detail" onClick={() => onOpen(deal)}>
        Open full model
      </button>
    </article>
  );
}

export default function MAModelStudio() {
  const navigate = useNavigate();
  const [universe, setUniverse] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [assumptions, setAssumptions] = useState(defaultAssumptions);
  const [recommendations, setRecommendations] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState(null);
  const [coverage, setCoverage] = useState(null);

  const activeDeal = recommendations[activeIndex];

  const openDealPage = (deal) => {
    if (!deal) return;
    const dealId = createDealId(deal);
    const savedModel = {
      deal,
      assumptions,
      meta,
      coverage,
      savedAt: new Date().toISOString(),
    };

    try {
      sessionStorage.setItem(dealStorageKey(dealId), JSON.stringify(savedModel));
    } catch {
      localStorage.setItem(dealStorageKey(dealId), JSON.stringify(savedModel));
    }

    navigate(`/ma-deal/${dealId}`);
  };

  const acquirer = useMemo(
    () => universe.find((company) => company.ticker === assumptions.acquirer_ticker),
    [universe, assumptions.acquirer_ticker]
  );

  const target = useMemo(
    () => universe.find((company) => company.ticker === assumptions.target_ticker),
    [universe, assumptions.target_ticker]
  );

  const targetOptions = useMemo(() => {
    const query = String(assumptions.target_query || "").toLowerCase().trim();

    return universe
      .filter((company) => company.ticker !== assumptions.acquirer_ticker)
      .filter((company) => !assumptions.target_sector || company.raw_sector === assumptions.target_sector)
      .filter((company) => {
        if (!query) return true;
        return `${company.ticker} ${company.name} ${company.sub}`.toLowerCase().includes(query);
      });
  }, [universe, assumptions.acquirer_ticker, assumptions.target_sector, assumptions.target_query]);

  const set = (key, value) => {
    setAssumptions((current) => {
      const next = { ...current, [key]: value };
      if (key === "acquirer_ticker" && value && value === current.target_ticker) {
        next.target_ticker = "";
      }
      return next;
    });
  };

  const buildLocalDeal = (buyer, acquired, index = 0) => {
    const buyerEv = Number(buyer?.ev_b || 250);
    const targetEv = Number(acquired?.ev_b || Math.max(2, buyerEv * 0.035));
    const premium = 1 + Number(assumptions.premium_pct || 0) / 100;
    const adjacencyMap = {
      saas_tech: { saas_tech: 1, financial: 0.68, healthcare: 0.58, industrials: 0.46, consumer: 0.28, public_unclassified: 0.34 },
      financial: { financial: 1, saas_tech: 0.66, consumer: 0.52, healthcare: 0.3, industrials: 0.24, public_unclassified: 0.32 },
      healthcare: { healthcare: 1, saas_tech: 0.58, industrials: 0.34, financial: 0.28, consumer: 0.16, public_unclassified: 0.3 },
      consumer: { consumer: 1, financial: 0.48, saas_tech: 0.28, industrials: 0.26, healthcare: 0.16, public_unclassified: 0.28 },
      industrials: { industrials: 1, saas_tech: 0.46, healthcare: 0.34, consumer: 0.26, financial: 0.24, public_unclassified: 0.3 },
      public_unclassified: { public_unclassified: 0.42, saas_tech: 0.34, financial: 0.32, healthcare: 0.3, industrials: 0.3, consumer: 0.28 },
    };
    const adjacency = adjacencyMap[buyer?.raw_sector]?.[acquired?.raw_sector] ?? 0.15;
    const sectorFit = adjacency * 30;
    const sizeFit = targetEv / Math.max(buyerEv, 1) < 0.25 ? 16 : 6;
    const dataFit = acquired?.has_financials ? 10 : 4;
    const mismatchPenalty = adjacency < 0.25 ? 36 : adjacency < 0.4 ? 22 : adjacency < 0.55 ? 10 : 0;
    const score = Math.max(8, Math.min(98, 38 + sectorFit + sizeFit + dataFit - mismatchPenalty - index * 3));
    const fitRead = adjacency < 0.4
      ? "Strategic fit is weak because the buyer and target operate in unrelated sectors."
      : adjacency < 0.6
        ? "Strategic fit is moderate and needs a clear expansion thesis."
        : "Strategic fit is credible based on sector and business-model adjacency.";

    return {
      score,
      acquirer: buyer,
      target: acquired,
      model: {
        purchase_ev_b: targetEv * premium,
        deal_size_to_acquirer_ev_pct: (targetEv * premium * 100) / Math.max(buyerEv, 1),
        eps_change_pct: acquired?.has_financials ? 2.8 - index * 0.35 : 0.8 - index * 0.2,
        cost_synergies_m: targetEv * 1000 * (Number(assumptions.cost_synergy_pct || 0) / 100),
        revenue_synergies_m: targetEv * 1000 * (Number(assumptions.revenue_synergy_pct || 0) / 100),
      },
      rationale: [
        fitRead,
        `${buyer.name} acquiring ${acquired.name} would add ${acquired.sub} exposure.`,
        `The model applies a ${assumptions.premium_pct}% premium with ${assumptions.cash_pct}% cash, ${assumptions.debt_pct}% debt, and ${assumptions.stock_pct}% stock funding.`,
        acquired?.has_financials
          ? "Valence has local valuation metrics for this target."
          : "This company is available in the public-company universe; detailed valuation metrics should be enriched from the live backend before professional use.",
      ],
      risks: [
        adjacency < 0.4 ? "Low strategic adjacency should be treated as a major red flag unless management has a specific diversification mandate." : "Confirm the strategic thesis with customer, product, and channel diligence.",
        "Confirm live enterprise value, revenue, EBITDA, and share count before presenting the case.",
        "Validate product overlap, customer retention, integration cost, and antitrust risk.",
        "Run a full debt schedule, purchase accounting model, and synergy ramp before final recommendation.",
      ],
      precedents: [],
    };
  };

  const runModel = async (nextAssumptions = assumptions) => {
    if (!nextAssumptions.acquirer_ticker || !nextAssumptions.target_ticker) {
      setRecommendations([]);
      setMeta(null);
      setActiveIndex(0);
      setError("Select an acquirer and a company being acquired to run the model.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(apiUrl("/api/ma/recommendations"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextAssumptions),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || "Could not run the M&A model.");
      }

      setRecommendations(payload.recommendations || []);
      setMeta(payload);
      setActiveIndex(0);
    } catch (err) {
      const buyer = universe.find((company) => company.ticker === nextAssumptions.acquirer_ticker) || fallbackUniverse[0];
      const selectedTarget = universe.find((company) => company.ticker === nextAssumptions.target_ticker);
      const alternatives = universe
        .filter((company) => company.ticker !== buyer.ticker)
        .filter((company) => company.ticker !== selectedTarget?.ticker)
        .filter((company) => !nextAssumptions.target_sector || company.raw_sector === nextAssumptions.target_sector)
        .filter((company) => {
          const query = String(nextAssumptions.target_query || "").toLowerCase().trim();
          if (!query) return true;
          return `${company.ticker} ${company.name} ${company.sub}`.toLowerCase().includes(query);
        })
        .slice(0, Math.max(0, Math.min(Number(nextAssumptions.max_results || 5), 5) - 1))
        .map((company, index) => buildLocalDeal(buyer, company, index + 1));
      const fallbackDeals = [
        ...(selectedTarget ? [buildLocalDeal(buyer, selectedTarget, 0)] : []),
        ...alternatives,
      ];

      setRecommendations(fallbackDeals);
      setMeta({
        source: "Local Valence fallback data",
        universe_total: universe.length || fallbackUniverse.length,
        screened_count: fallbackDeals.length,
        financially_modeled_count: fallbackDeals.length,
      });
      setActiveIndex(0);
      setError("Live M&A API unavailable. Showing local Valence fallback data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadUniverse() {
      try {
        const response = await fetch(apiUrl("/api/ma/universe?limit=12000"));
        if (!response.ok) {
          throw new Error("Universe endpoint unavailable");
        }
        const payload = await response.json();
        const backendCompanies = mergeCuratedMetrics(payload.companies || []);
        const companies = mergeCompanyLists(backendCompanies, fallbackUniverse);
        setUniverse(companies);
        setSectors(payload.sectors?.length ? payload.sectors : fallbackSectors);
        setCoverage({
          ...payload,
          total_available: Math.max(payload.total_available || 0, companies.length),
          returned: companies.length,
        });
      } catch {
        let companies = [];

        try {
          const secResponse = await fetch("https://www.sec.gov/files/company_tickers.json");
          if (secResponse.ok) {
            companies = mergeCuratedMetrics(normalizeSecUniverse(await secResponse.json()));
          }
        } catch {
          companies = [];
        }

        const fallbackCompanies = companies.length ? companies : fallbackUniverse;

        setUniverse(fallbackCompanies);
        setSectors(fallbackSectors);
        setCoverage({
          total_available: fallbackCompanies.length,
          returned: fallbackCompanies.length,
          coverage_note: companies.length
            ? "Using SEC public-company ticker data directly in the browser until the live backend is available."
            : "Using local Valence fallback data until the live backend is available.",
        });
        setError(companies.length
          ? "Live backend unavailable. Showing SEC ticker universe with on-demand local modeling."
          : "Live company universe unavailable. Showing local Valence fallback data."
        );
      }
    }

    loadUniverse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="ma-studio">
      <div className="ma-hero">
        <span>M&A Strategy Studio</span>
        <h1>M&A Transaction Model</h1>
        <p>
          Select the buyer and the company being acquired, tune deal assumptions, compare fit, and see
          the core accretion model before turning an idea into a banker-grade case.
        </p>
        {coverage && (
          <div className="ma-coverage-strip">
            <strong>{coverage.total_available?.toLocaleString()} public companies loaded</strong>
            <span>{coverage.returned?.toLocaleString()} shown in picker · valuation metrics enriched on demand</span>
          </div>
        )}
      </div>

      <div className="ma-shell">
        <aside className="ma-control-panel">
          <div className="ma-control-heading">
            <span>Scenario</span>
            <strong>Transaction parties</strong>
          </div>

          <label className="ma-select-field">
            <span>ACQUIRER</span>
            <select
              value={assumptions.acquirer_ticker}
              onChange={(event) => set("acquirer_ticker", event.target.value)}
            >
              <option value="">SELECT ACQUIRER</option>
              {universe.map((company) => (
                <option key={company.ticker} value={company.ticker}>
                  {company.ticker} · {company.name}
                </option>
              ))}
            </select>
          </label>

          <label className="ma-select-field">
            <span>COMPANY BEING ACQUIRED</span>
            <select
              value={assumptions.target_ticker}
              onChange={(event) => set("target_ticker", event.target.value)}
            >
              <option value="">SELECT COMPANY BEING ACQUIRED</option>
              {targetOptions.map((company) => (
                <option key={company.ticker} value={company.ticker}>
                  {company.ticker} · {company.name}
                </option>
              ))}
            </select>
          </label>

          <label className="ma-select-field">
            <span>TARGET SECTOR</span>
            <select
              value={assumptions.target_sector}
              onChange={(event) => set("target_sector", event.target.value)}
            >
              <option value="">ALL SECTORS</option>
              {sectors.map((sector) => (
                <option key={sector.key} value={sector.key}>
                  {sector.label}
                </option>
              ))}
            </select>
          </label>

          <label className="ma-select-field">
            <span>TARGET SEARCH</span>
            <input
              value={assumptions.target_query}
              onChange={(event) => set("target_query", event.target.value)}
              placeholder="OPTIONAL TICKER, COMPANY, OR KEYWORD"
            />
          </label>

          {acquirer && (
            <div className="ma-acquirer-card">
              <span>Selected buyer</span>
              <strong>{acquirer.name}</strong>
              <p>{acquirer.sector}</p>
              <small>{fmtB(acquirer.ev_b)} EV · {fmtX(acquirer.ev_rev)} EV/Revenue</small>
            </div>
          )}

          {target && (
            <div className="ma-acquirer-card target-card">
              <span>Selected target</span>
              <strong>{target.name}</strong>
              <p>{target.sector}</p>
              <small>{fmtB(target.ev_b)} EV · {fmtX(target.ev_rev)} EV/Revenue</small>
            </div>
          )}

          <div className="ma-control-heading spaced">
            <span>Merger model</span>
            <strong>Deal assumptions</strong>
          </div>

          <AssumptionField label="Offer premium" value={assumptions.premium_pct} onChange={(value) => set("premium_pct", value)} />
          <AssumptionField label="Cash funding" value={assumptions.cash_pct} onChange={(value) => set("cash_pct", value)} />
          <AssumptionField label="Debt funding" value={assumptions.debt_pct} onChange={(value) => set("debt_pct", value)} />
          <AssumptionField label="Stock funding" value={assumptions.stock_pct} onChange={(value) => set("stock_pct", value)} />
          <AssumptionField label="Cost synergies" value={assumptions.cost_synergy_pct} onChange={(value) => set("cost_synergy_pct", value)} />
          <AssumptionField label="Revenue synergies" value={assumptions.revenue_synergy_pct} onChange={(value) => set("revenue_synergy_pct", value)} />
          <AssumptionField
            label="Live candidate screen"
            value={assumptions.candidate_limit}
            min={40}
            max={300}
            suffix=""
            onChange={(value) => set("candidate_limit", value)}
          />

          <button className="ma-run-button" type="button" onClick={() => runModel()}>
            {loading ? "Running model..." : "Run M&A screen"}
          </button>

          {error && <p className="ma-error">{error}</p>}
        </aside>

        <div className="ma-results-panel">
          <div className="ma-results-toolbar">
            <div>
              <span>Transaction analysis</span>
              <strong>{recommendations.length ? "Selected deal + alternatives" : "No deal loaded"}</strong>
            </div>
            <p>
              {meta
                ? `${meta.universe_total?.toLocaleString()} companies available · ${meta.screened_count} screened · ${meta.financially_modeled_count} modeled`
                : "Screening strategic fit, affordability, valuation spread, and precedent support."}
            </p>
          </div>

          <div className="ma-workspace">
            <div className="ma-reco-list">
              {loading && <div className="ma-loading">Building transaction cases...</div>}
              {!loading && recommendations.slice(0, 5).map((item, index) => (
                <RecommendationCard
                  key={`${item.acquirer.ticker}-${item.target.ticker}`}
                  item={item}
                  isActive={index === activeIndex}
                  onSelect={() => setActiveIndex(index)}
                  onOpen={() => openDealPage(item)}
                />
              ))}
            </div>

            <DetailPanel deal={activeDeal} onOpen={openDealPage} />
          </div>

          <div className="ma-data-note">
            <strong>Professional data path</strong>
            <p>
              This version now loads the broad SEC public-company ticker universe and enriches
              screened names with market data when the model runs. The next professional layer is
              licensed private-company coverage for venture-backed, founder-owned, and lower-middle-market targets.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
