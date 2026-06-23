import React, { useState } from "react";
import { apiUrl } from "../api";

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
      .replace("X", "")
      .replace("%", "")
      .trim();

    if (
      !clean ||
      clean === "—" ||
      clean.toLowerCase() === "n/a" ||
      clean.toLowerCase() === "na" ||
      clean.toLowerCase() === "none" ||
      clean.toLowerCase() === "null"
    ) {
      return null;
    }

    let multiplier = 1;

    if (clean.toUpperCase().endsWith("B")) {
      multiplier = 1000;
      clean = clean.slice(0, -1);
    } else if (clean.toUpperCase().endsWith("M")) {
      multiplier = 1;
      clean = clean.slice(0, -1);
    } else if (clean.toUpperCase().endsWith("K")) {
      multiplier = 0.001;
      clean = clean.slice(0, -1);
    }

    const n = Number(clean);
    return Number.isFinite(n) ? n * multiplier : null;
  }

  return null;
}

function toMillions(value) {
  const n = toNumber(value);

  if (n === null) return null;

  // If it looks like raw dollars from Yahoo / SEC, convert to millions.
  if (Math.abs(n) > 100000) {
    return n / 1000000;
  }

  // Otherwise assume the app is already using millions.
  return n;
}

function firstNumber(obj, keys) {
  for (const key of keys) {
    const n = toNumber(obj?.[key]);
    if (n !== null) return n;
  }

  return null;
}

function firstMoneyMillions(obj, keys) {
  for (const key of keys) {
    const n = toMillions(obj?.[key]);
    if (n !== null) return n;
  }

  return null;
}

function normalizePercent(value) {
  const n = toNumber(value);

  if (n === null) return null;

  // Handles both 0.76 and 76.0.
  if (Math.abs(n) <= 1) {
    return n * 100;
  }

  return n;
}

function firstPercent(obj, keys) {
  for (const key of keys) {
    const n = normalizePercent(obj?.[key]);
    if (n !== null) return n;
  }

  return null;
}

function sanitizeFileName(value) {
  return String(value || "company")
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
}

function normalizeCompanyForReport(c = {}) {
  const marketCapM =
    firstMoneyMillions(c, ["market_cap_m", "marketCapM"]) ??
    (toNumber(c.market_cap_b) !== null ? toNumber(c.market_cap_b) * 1000 : null) ??
    firstMoneyMillions(c, ["market_cap", "marketCap"]);

  const enterpriseValueM =
    firstMoneyMillions(c, ["ev_m", "enterprise_value_m", "enterpriseValueM"]) ??
    (toNumber(c.ev_b) !== null ? toNumber(c.ev_b) * 1000 : null) ??
    firstMoneyMillions(c, ["enterprise_value", "enterpriseValue", "ev", "EV"]);

  const revenueM =
    firstMoneyMillions(c, [
      "revenue_m",
      "revenueM",
      "revenue",
      "Revenue",
      "totalRevenue",
      "total_revenue_m",
      "sales",
    ]) ?? (toNumber(c.revenue_b) !== null ? toNumber(c.revenue_b) * 1000 : null);

  const ebitdaM =
    firstMoneyMillions(c, ["ebitda_m", "ebitdaM", "ebitda", "EBITDA"]) ??
    (toNumber(c.ebitda_b) !== null ? toNumber(c.ebitda_b) * 1000 : null);

  const grossMargin = firstPercent(c, [
    "gross_margin",
    "grossMargin",
    "gross_margin_pct",
  ]);

  const grossProfitM =
    firstMoneyMillions(c, ["gross_profit_m", "gross_profit", "grossProfit"]) ??
    (revenueM !== null && grossMargin !== null
      ? (revenueM * grossMargin) / 100
      : null);

  const ebitdaMargin =
    firstPercent(c, ["ebitda_margin", "ebitdaMargin", "margin"]) ??
    (revenueM !== null && revenueM !== 0 && ebitdaM !== null
      ? (ebitdaM / revenueM) * 100
      : null);

  const ticker = pick(c, ["ticker", "symbol", "Ticker", "Symbol"], "N/A");
  const name = pick(c, ["name", "companyName", "company", "company_name"], ticker);

  const industry = pick(c, ["industry", "sub", "subSector", "sector"], "N/A");
  const sector = pick(c, ["sector", "industry"], "N/A");

  const evRevenue = firstNumber(c, [
    "ev_rev",
    "evRevenue",
    "ev_revenue",
    "evToRevenue",
  ]);

  const evEbitda = firstNumber(c, [
    "ev_ebitda",
    "evEbitda",
    "evToEbitda",
  ]);

  const evGrossProfit = firstNumber(c, [
    "ev_gp",
    "evGrossProfit",
    "ev_gross_profit",
  ]);

  const revenueGrowth = firstPercent(c, [
    "rev_growth",
    "revenue_growth",
    "revenueGrowth",
    "rev_growth_pct",
  ]);

  const matchScore = firstNumber(c, ["match_score", "matchScore", "score"]);

  return {
    ...c,

    companyName: name,
    company: name,
    name,

    ticker,
    symbol: ticker,

    sector,
    industry,
    subSector: pick(c, ["subSector", "sub_sector", "sub", "industry"], industry),
    sub: pick(c, ["sub", "industry", "subSector"], industry),
    geography: pick(c, ["geography", "geo", "location"], "Global"),

    businessModel: pick(
      c,
      ["businessModel", "business_model", "revenueModel", "revenue_model"],
      "Public company comparable"
    ),

    description: pick(c, ["description", "businessDescription"], ""),

    revenue_m: revenueM,
    revenue: revenueM,

    ebitda_m: ebitdaM,
    ebitda: ebitdaM,

    grossProfit: grossProfitM,
    gross_profit: grossProfitM,

    marketCap: marketCapM,
    market_cap: marketCapM,
    market_cap_m: marketCapM,
    market_cap_b: marketCapM !== null ? marketCapM / 1000 : null,

    enterpriseValue: enterpriseValueM,
    enterprise_value: enterpriseValueM,
    ev: enterpriseValueM,
    ev_m: enterpriseValueM,
    ev_b: enterpriseValueM !== null ? enterpriseValueM / 1000 : null,

    evRevenue,
    ev_revenue: evRevenue,
    ev_rev: evRevenue,

    evEbitda,
    ev_ebitda: evEbitda,

    evGrossProfit,
    ev_gp: evGrossProfit,

    revenueGrowth,
    revenue_growth: revenueGrowth,
    rev_growth: revenueGrowth,

    grossMargin,
    gross_margin: grossMargin,

    ebitdaMargin,
    ebitda_margin: ebitdaMargin,

    matchScore,
    match_score: matchScore,

    marketDataDate: pick(
      c,
      ["marketDataDate", "asOfDate", "sourceDate"],
      "Latest available market/database data"
    ),

    financialPeriod: pick(
      c,
      ["financialPeriod", "period", "fiscalYear", "latestFiscalYear"],
      "Latest available fiscal year / LTM where available"
    ),
  };
}

function normalizePrivateCompanyForReport(privateCompany = {}) {
  const revenueM =
    firstMoneyMillions(privateCompany, [
      "revenue_m",
      "revenue",
      "Revenue",
      "targetRevenue",
      "annualRevenue",
    ]) ??
    (toNumber(privateCompany.revenue_b) !== null
      ? toNumber(privateCompany.revenue_b) * 1000
      : null);

  const ebitdaM =
    firstMoneyMillions(privateCompany, [
      "ebitda_m",
      "ebitda",
      "EBITDA",
      "targetEbitda",
    ]) ??
    (toNumber(privateCompany.ebitda_b) !== null
      ? toNumber(privateCompany.ebitda_b) * 1000
      : null);

  const grossMargin = firstPercent(privateCompany, [
    "gross_margin_pct",
    "grossMargin",
    "gross_margin",
  ]);

  const revenueGrowth = firstPercent(privateCompany, [
    "rev_growth_pct",
    "revenueGrowth",
    "revenue_growth",
    "growth",
  ]);

  const ebitdaMargin =
    firstPercent(privateCompany, ["ebitda_margin", "ebitdaMargin", "margin"]) ??
    (revenueM !== null && revenueM !== 0 && ebitdaM !== null
      ? (ebitdaM / revenueM) * 100
      : null);

  const freeCashFlowMargin = firstPercent(privateCompany, [
    "free_cash_flow_margin_pct",
    "freeCashFlowMargin",
    "fcfMargin",
  ]);

  const ruleOf40 =
    firstPercent(privateCompany, ["ruleOf40", "rule_of_40"]) ??
    (revenueGrowth !== null && freeCashFlowMargin !== null
      ? revenueGrowth + freeCashFlowMargin
      : null);

  const companyName = pick(
    privateCompany,
    ["companyName", "company_name", "name", "company", "targetCompany"],
    "Private Company"
  );

  const sector = pick(privateCompany, ["sector", "industry"], "N/A");
  const subSector = pick(
    privateCompany,
    ["subSector", "sub_sector", "sub", "industry"],
    sector
  );

  const revenueModel = pick(
    privateCompany,
    ["revenue_model", "revenueModel", "businessModel", "business_model"],
    "Not provided"
  );

  const businessDescription = pick(
    privateCompany,
    ["business_description", "businessDescription", "description"],
    "Not provided"
  );

  return {
    ...privateCompany,

    companyName,
    name: companyName,
    company: companyName,

    description: businessDescription,
    businessDescription,

    sector,
    industry: subSector,
    subSector,

    geography: pick(
      privateCompany,
      ["geo", "geography", "location", "headquarters"],
      "North America"
    ),

    revenueModel,
    businessModel: revenueModel,

    customerType: pick(
      privateCompany,
      ["customer_type", "customerType"],
      "Not provided"
    ),

    revenue_m: revenueM,
    revenue: revenueM,

    ebitda_m: ebitdaM,
    ebitda: ebitdaM,

    grossMargin,
    gross_margin: grossMargin,

    ebitdaMargin,
    ebitda_margin: ebitdaMargin,

    revenueGrowth,
    revenue_growth: revenueGrowth,
    rev_growth_pct: revenueGrowth,

    employees: pick(privateCompany, ["employees", "employeeCount", "employee_count"], null),

    arr: firstMoneyMillions(privateCompany, ["arr_m", "arr", "ARR"]),
    netRevenueRetention: firstPercent(privateCompany, [
      "net_revenue_retention_pct",
      "netRevenueRetention",
      "nrr",
    ]),

    freeCashFlowMargin,
    fcfMargin: freeCashFlowMargin,

    ruleOf40,

    salesEfficiency: firstNumber(privateCompany, [
      "sales_efficiency",
      "salesEfficiency",
    ]),

    cacPaybackMonths: firstNumber(privateCompany, [
      "cac_payback_months",
      "cacPaybackMonths",
    ]),
  };
}

export default function ReportButton({
  company,
  comps = [],
  privateCompany = {},
  results = null,
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);

      const selectedCompany = normalizeCompanyForReport(company || {});

      const normalizedComps = Array.isArray(comps)
        ? comps.map(normalizeCompanyForReport)
        : [];

      const finalComps =
        normalizedComps.length > 0 ? normalizedComps : [selectedCompany];

      const finalPrivateCompany = normalizePrivateCompanyForReport(
        privateCompany || {}
      );

      const payload = {
        selectedCompany,
        comps: finalComps,
        privateCompany: finalPrivateCompany,

        // These are optional, but keeping them lets the backend use them later.
        multiples: results?.multiples || {},
        implied: results?.implied || {},
        overall_range: results?.overall_range || null,
        sector_label: results?.sector_label || "",
        comps_count: results?.comps_count || finalComps.length,
      };

      const response = await fetch(apiUrl("/api/generate-report"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = "Report download failed";

        try {
          const errorText = await response.text();
          if (errorText) errorMessage = errorText;
        } catch {
          // Keep default message.
        }

        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const ticker = sanitizeFileName(
        selectedCompany.ticker ||
          selectedCompany.symbol ||
          selectedCompany.companyName ||
          "company"
      );

      const a = document.createElement("a");
      a.href = url;
      a.download = `valence-report-${ticker}.pdf`;
      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(
        "Could not download the report. Make sure the backend is running and report_generator.py has the new banker report code."
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      type="button"
      className="download-report-btn detail-download-btn"
      onClick={handleDownload}
      disabled={downloading}
    >
      {downloading ? "Downloading..." : "Download Report"}
    </button>
  );
}
