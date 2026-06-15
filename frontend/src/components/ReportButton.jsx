import React, { useState } from "react";

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

function normalizeCompany(company = {}) {
  const marketCapM =
    toNumber(company.market_cap) ??
    toNumber(company.marketCap) ??
    toNumber(company.market_cap_m) ??
    (toNumber(company.market_cap_b) !== null ? toNumber(company.market_cap_b) * 1000 : null);

  const enterpriseValueM =
    toNumber(company.enterprise_value) ??
    toNumber(company.enterpriseValue) ??
    toNumber(company.ev) ??
    toNumber(company.ev_m) ??
    (toNumber(company.ev_b) !== null ? toNumber(company.ev_b) * 1000 : null);

  const revenueM =
    toNumber(company.revenue) ??
    toNumber(company.revenue_m) ??
    toNumber(company.totalRevenue) ??
    (toNumber(company.revenue_b) !== null ? toNumber(company.revenue_b) * 1000 : null);

  const ebitdaM =
    toNumber(company.ebitda) ??
    toNumber(company.ebitda_m) ??
    (toNumber(company.ebitda_b) !== null ? toNumber(company.ebitda_b) * 1000 : null);

  const grossMargin = toNumber(company.gross_margin ?? company.grossMargin);

  const grossProfitM =
    toNumber(company.gross_profit) ??
    toNumber(company.grossProfit) ??
    (
      revenueM !== null && grossMargin !== null
        ? revenueM * grossMargin / 100
        : null
    );

  const ebitdaMargin =
    toNumber(company.ebitda_margin ?? company.ebitdaMargin) ??
    (
      revenueM !== null && revenueM !== 0 && ebitdaM !== null
        ? ebitdaM / revenueM * 100
        : null
    );

  return {
    ...company,

    company: pick(company, ["company", "name", "company_name"], "N/A"),
    name: pick(company, ["name", "company", "company_name"], "N/A"),
    ticker: pick(company, ["ticker", "symbol"], "N/A"),
    symbol: pick(company, ["symbol", "ticker"], "N/A"),

    industry: pick(company, ["industry", "sector", "sub"], "N/A"),
    sub: pick(company, ["sub", "industry", "sector"], "N/A"),

    revenue: revenueM,
    ebitda: ebitdaM,
    grossProfit: grossProfitM,
    gross_profit: grossProfitM,

    marketCap: marketCapM,
    market_cap: marketCapM,

    enterpriseValue: enterpriseValueM,
    enterprise_value: enterpriseValueM,

    evRevenue: toNumber(company.ev_rev ?? company.evRevenue ?? company.ev_revenue),
    ev_revenue: toNumber(company.ev_rev ?? company.evRevenue ?? company.ev_revenue),
    ev_rev: toNumber(company.ev_rev ?? company.evRevenue ?? company.ev_revenue),

    evEbitda: toNumber(company.ev_ebitda ?? company.evEbitda),
    ev_ebitda: toNumber(company.ev_ebitda ?? company.evEbitda),

    evGrossProfit: toNumber(company.ev_gp ?? company.evGrossProfit),
    ev_gp: toNumber(company.ev_gp ?? company.evGrossProfit),

    rev_growth: toNumber(company.rev_growth ?? company.revenue_growth),
    gross_margin: grossMargin,
    ebitda_margin: ebitdaMargin,

    matchScore: toNumber(company.match_score ?? company.matchScore ?? company.score),
    match_score: toNumber(company.match_score ?? company.matchScore ?? company.score),
  };
}

function normalizePrivateCompany(privateCompany = {}) {
  const revenueM =
    toNumber(privateCompany.revenue) ??
    toNumber(privateCompany.revenue_m) ??
    toNumber(privateCompany.targetRevenue) ??
    (toNumber(privateCompany.revenue_b) !== null ? toNumber(privateCompany.revenue_b) * 1000 : null);

  const ebitdaM =
    toNumber(privateCompany.ebitda) ??
    toNumber(privateCompany.ebitda_m) ??
    toNumber(privateCompany.targetEbitda) ??
    (toNumber(privateCompany.ebitda_b) !== null ? toNumber(privateCompany.ebitda_b) * 1000 : null);

  const margin =
    toNumber(privateCompany.ebitda_margin ?? privateCompany.ebitdaMargin ?? privateCompany.margin) ??
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

export default function ReportButton({ company, comps, privateCompany }) {
  const [loading, setLoading] = useState(false);

  const handleDownloadReport = async () => {
    try {
      setLoading(true);

      const selectedCompany = normalizeCompany(company || {});
      const normalizedComps = Array.isArray(comps)
        ? comps.map(normalizeCompany)
        : [];

      const normalizedPrivateCompany = normalizePrivateCompany(privateCompany || {});

      const response = await fetch(`${API_BASE}/api/generate-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          selectedCompany,
          selectedComparable: selectedCompany,
          company: selectedCompany,

          comps: normalizedComps,
          comparables: normalizedComps,

          privateCompany: normalizedPrivateCompany,
          target: normalizedPrivateCompany,
        })
      });

      if (!response.ok) {
        throw new Error("Could not generate report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const fileName = `valence-report-${selectedCompany?.ticker || selectedCompany?.symbol || "company"}.pdf`;

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Report failed to generate. Check backend terminal for the error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="download-report-btn report-btn"
      onClick={handleDownloadReport}
      disabled={loading}
    >
      {loading ? "Generating..." : "Download Report"}
    </button>
  );
}