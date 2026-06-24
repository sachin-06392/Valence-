import React, { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { apiUrl } from "../api";
import "./CompanyDetail.css";
import ReportButton from "./ReportButton";

function isValidNumber(value) {
  return value !== null && value !== undefined && !Number.isNaN(Number(value));
}

function money(value) {
  if (!isValidNumber(value)) return "N/A";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function bigMoney(value) {
  if (!isValidNumber(value)) return "N/A";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatFact(fact) {
  if (!fact || !isValidNumber(fact.value)) return "N/A";

  return `${bigMoney(fact.value)} • ${fact.form || "Filing"} • filed ${
    fact.filed || "N/A"
  }`;
}

function toMillions(value) {
  if (!isValidNumber(value)) return null;
  return Number(value) / 1e6;
}

function safeDivide(numerator, denominator) {
  if (!isValidNumber(numerator) || !isValidNumber(denominator)) return null;
  if (Number(denominator) === 0) return null;
  return Number(numerator) / Number(denominator);
}

function formatMillions(value) {
  if (!isValidNumber(value)) return "N/A";
  return `$${Number(value).toFixed(1)}M`;
}

function formatMultiple(value) {
  if (!isValidNumber(value)) return "N/A";
  return `${Number(value).toFixed(1)}x`;
}

function formatPercent(value) {
  if (!isValidNumber(value)) return "N/A";
  return `${Number(value).toFixed(0)}%`;
}

function readSavedComps(location) {
  try {
    return (
      location.state?.comps ||
      JSON.parse(localStorage.getItem("valenceLastComps") || "[]")
    );
  } catch (err) {
    return [];
  }
}

function readSavedPrivateCompany(location) {
  try {
    return (
      location.state?.privateCompany ||
      JSON.parse(localStorage.getItem("valenceLastPrivateCompany") || "{}")
    );
  } catch (err) {
    return {};
  }
}

function readSavedResults(location) {
  try {
    return (
      location.state?.results ||
      JSON.parse(localStorage.getItem("valenceLastResults") || "null")
    );
  } catch (err) {
    return null;
  }
}

function DetailPageShell({ children }) {
  return (
    <div className="company-detail-page app">
      <nav className="nav">
        <div className="nav-left">
          <div className="logo">
            <img src="/logo4.png" alt="Valence logo" />
          </div>

          <span className="brand">Valence</span>
          <span className="nav-pill">Beta</span>
        </div>

        <div className="nav-right">Company intelligence - Report builder</div>
      </nav>

      <main className="company-detail-shell">{children}</main>
    </div>
  );
}

export default function CompanyDetail() {
  const { ticker } = useParams();
  const location = useLocation();

  const savedComps = readSavedComps(location);
  const savedPrivateCompany = readSavedPrivateCompany(location);
  const savedResults = readSavedResults(location);

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCompany(showLoading = false) {
      try {
        if (showLoading) setLoading(true);

        setError("");

        const response = await fetch(apiUrl(`/api/company/${ticker}`));

        if (!response.ok) {
          throw new Error("Could not load company details.");
        }

        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err.message || "Something went wrong.");
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
      <DetailPageShell>
        <Link to="/#analysis-workbench" className="back-link">
          Back to analysis workbench
        </Link>

        <div className="detail-state-panel">
          <div className="detail-spinner" aria-hidden="true" />
          <p>Loading company details...</p>
        </div>
      </DetailPageShell>
    );
  }

  if (error) {
    return (
      <DetailPageShell>
        <Link to="/#analysis-workbench" className="back-link">
          Back to analysis workbench
        </Link>

        <div className="detail-state-panel">
          <p className="error-text">{error}</p>
        </div>
      </DetailPageShell>
    );
  }

  if (!data || !data.company) {
    return (
      <DetailPageShell>
        <Link to="/#analysis-workbench" className="back-link">
          Back to analysis workbench
        </Link>

        <div className="detail-state-panel">
          <p className="error-text">No company data found.</p>
        </div>
      </DetailPageShell>
    );
  }

  const company = data.company || {};
  const stock = data.stock || {};
  const financials = data.financials || {};
  const filings = data.filings || [];

  const revenueM = toMillions(financials.revenue?.value);
  const operatingIncomeM = toMillions(financials.operatingIncome?.value);
  const netIncomeM = toMillions(financials.netIncome?.value);
  const totalAssetsM = toMillions(financials.totalAssets?.value);
  const totalLiabilitiesM = toMillions(financials.totalLiabilities?.value);
  const cashM = toMillions(financials.cash?.value);

  const marketCapM = toMillions(stock.marketCap);

  const enterpriseValueM = isValidNumber(stock.enterpriseValue)
    ? toMillions(stock.enterpriseValue)
    : marketCapM;

  const evRev = safeDivide(enterpriseValueM, revenueM);
  const evEbitda = safeDivide(enterpriseValueM, operatingIncomeM);

  const ebitdaMargin = safeDivide(operatingIncomeM, revenueM);
  const ebitdaMarginPct = isValidNumber(ebitdaMargin)
    ? ebitdaMargin * 100
    : null;

  const companyForReport = {
    ticker: company.ticker || ticker,
    symbol: company.ticker || ticker,
    name: company.name || "Company",
    company: company.name || "Company",

    cik: company.cik || "N/A",
    sub: company.sicDescription || "N/A",
    sector: company.sicDescription || "N/A",
    sicDescription: company.sicDescription || "N/A",
    industry: company.sicDescription || "N/A",

    current_price: stock.currentPrice ?? null,
    previous_close: stock.previousClose ?? null,
    day_high: stock.dayHigh ?? null,
    day_low: stock.dayLow ?? null,
    year_high: stock.yearHigh ?? null,
    year_low: stock.yearLow ?? null,

    market_cap_m: marketCapM,
    market_cap_b: isValidNumber(marketCapM) ? marketCapM / 1000 : null,

    ev_m: enterpriseValueM,
    ev_b: isValidNumber(enterpriseValueM) ? enterpriseValueM / 1000 : null,

    revenue_m: revenueM,
    ebitda_m: operatingIncomeM,
    operating_income_m: operatingIncomeM,
    net_income_m: netIncomeM,
    total_assets_m: totalAssetsM,
    total_liabilities_m: totalLiabilitiesM,
    cash_m: cashM,

    ev_rev: evRev,
    ev_ebitda: evEbitda,
    ev_gp: null,

    gross_margin: ebitdaMarginPct,
    ebitda_margin: ebitdaMarginPct,
    rev_growth: null,

    match_score: 100,

    stock: {
      currentPrice: stock.currentPrice ?? null,
      previousClose: stock.previousClose ?? null,
      dayHigh: stock.dayHigh ?? null,
      dayLow: stock.dayLow ?? null,
      yearHigh: stock.yearHigh ?? null,
      yearLow: stock.yearLow ?? null,
      marketCap: stock.marketCap ?? null,
      enterpriseValue: stock.enterpriseValue ?? null,
    },

    financials,
    filings,
  };

  const privateCompanyForReport = {
    name: company.name || "Company",
    sector: company.sicDescription || "N/A",
    subSector: company.sicDescription || "N/A",
    geography: "N/A",
    stage: "N/A",
    revenue: revenueM,
    revenue_m: revenueM,
    ebitda: operatingIncomeM,
    ebitda_m: operatingIncomeM,
    netIncome: netIncomeM,
    net_income_m: netIncomeM,
    grossMargin: ebitdaMarginPct,
    revGrowth: null,
    employees: "N/A",
  };

  const matchingSearchComp = savedComps.find(
    (comp) =>
      String(comp.ticker || comp.symbol || "").toUpperCase() ===
      String(company.ticker || ticker || "").toUpperCase()
  );

  const selectedCompanyForReport = {
    ...(matchingSearchComp || {}),
    ...companyForReport,

    ticker: company.ticker || ticker,
    symbol: company.ticker || ticker,
    name: company.name || matchingSearchComp?.name || "Company",
    company: company.name || matchingSearchComp?.company || "Company",

    sub: matchingSearchComp?.sub || company.sicDescription || "N/A",
    sector:
      matchingSearchComp?.sector ||
      matchingSearchComp?.sub ||
      company.sicDescription ||
      "N/A",
    industry:
      matchingSearchComp?.industry ||
      matchingSearchComp?.sub ||
      company.sicDescription ||
      "N/A",

    revenue_m: matchingSearchComp?.revenue_m ?? companyForReport.revenue_m,
    ebitda_m: matchingSearchComp?.ebitda_m ?? companyForReport.ebitda_m,
    operating_income_m:
      matchingSearchComp?.ebitda_m ?? companyForReport.operating_income_m,
    net_income_m: matchingSearchComp?.net_income_m ?? companyForReport.net_income_m,

    market_cap_b: matchingSearchComp?.market_cap_b ?? companyForReport.market_cap_b,
    market_cap_m:
      matchingSearchComp?.market_cap_b != null
        ? Number(matchingSearchComp.market_cap_b) * 1000
        : companyForReport.market_cap_m,

    ev_b: matchingSearchComp?.ev_b ?? companyForReport.ev_b,
    ev_m:
      matchingSearchComp?.ev_b != null
        ? Number(matchingSearchComp.ev_b) * 1000
        : companyForReport.ev_m,

    ev_rev: matchingSearchComp?.ev_rev ?? companyForReport.ev_rev,
    ev_ebitda: matchingSearchComp?.ev_ebitda ?? companyForReport.ev_ebitda,
    ev_gp: matchingSearchComp?.ev_gp ?? companyForReport.ev_gp,
    gross_margin: matchingSearchComp?.gross_margin ?? companyForReport.gross_margin,
    ebitda_margin:
      matchingSearchComp?.gross_margin ?? companyForReport.ebitda_margin,
    rev_growth: matchingSearchComp?.rev_growth ?? companyForReport.rev_growth,
    match_score: matchingSearchComp?.match_score ?? companyForReport.match_score,

    financials,
    filings,
  };

  const compsForReport =
    savedComps && savedComps.length >= 2
      ? savedComps.map((comp) => {
          const sameTicker =
            String(comp.ticker || comp.symbol || "").toUpperCase() ===
            String(company.ticker || ticker || "").toUpperCase();

          return sameTicker ? selectedCompanyForReport : comp;
        })
      : [selectedCompanyForReport];

  const finalPrivateCompanyForReport =
    savedPrivateCompany && Object.keys(savedPrivateCompany).length > 0
      ? savedPrivateCompany
      : privateCompanyForReport;

  const resultsForReport =
    savedResults || {
      comps: compsForReport,
      multiples: {},
      implied: {},
      overall_range: null,
      sector_label: selectedCompanyForReport.sector || selectedCompanyForReport.sub || "selected sector",
      comps_count: compsForReport.length,
  };

  return (
    <DetailPageShell>
      <Link to="/#analysis-workbench" className="back-link">
        Back to analysis workbench
      </Link>

      <div className="company-header">
        <div className="company-title-block">
          <span className="detail-kicker">Public company snapshot</span>
          <h1>{company.name}</h1>
          <p>
            {company.ticker} • CIK {company.cik}
          </p>
          <p>{company.sicDescription || "No industry description available"}</p>

          <ReportButton
            company={selectedCompanyForReport}
            comps={compsForReport}
            privateCompany={finalPrivateCompanyForReport}
            results={resultsForReport}
          />
        </div>

        <div className="price-box">
          <p>Current Price</p>
          <h2>{money(stock.currentPrice)}</h2>
          <p>Previous Close: {money(stock.previousClose)}</p>
        </div>
      </div>

      <h2 className="detail-section-title">Stock Snapshot</h2>

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

      <h2 className="detail-section-title">Latest Financials</h2>

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

      {compsForReport.length >= 2 && (
        <>
          <h2 className="detail-section-title">Peer Comparison</h2>

          <div className="peer-comparison-table">
            <div className="peer-row peer-header">
              <span>Ticker</span>
              <span>Company</span>
              <span>Revenue</span>
              <span>EBITDA</span>
              <span>EV/Rev</span>
              <span>EV/EBITDA</span>
              <span>Match</span>
            </div>

            {compsForReport.map((comp) => (
              <div className="peer-row" key={comp.ticker || comp.symbol}>
                <span>{comp.ticker || comp.symbol || "N/A"}</span>
                <span>{comp.name || comp.company || "N/A"}</span>
                <span>{formatMillions(comp.revenue_m)}</span>
                <span>{formatMillions(comp.ebitda_m)}</span>
                <span>{formatMultiple(comp.ev_rev)}</span>
                <span>{formatMultiple(comp.ev_ebitda)}</span>
                <span>{formatPercent(comp.match_score)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="detail-section-title">SEC Reports</h2>

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
    </DetailPageShell>
  );
}
