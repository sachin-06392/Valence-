from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional, Any, Dict, List
import numpy as np
import os
import requests
import yfinance as yf
from functools import lru_cache
from datetime import datetime
import io

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch

from company_universe import COMPANY_UNIVERSE
from financials_db import FINANCIALS_DB

app = FastAPI(title="CompFinder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

INPUT_SECTOR_MAP = {
    "Enterprise SaaS / Tech":      "saas_tech",
    "Healthcare / Biotech":        "healthcare",
    "Financial Services":          "financial",
    "Consumer / Retail":           "consumer",
    "Industrials / Manufacturing": "industrials",
}

SECTOR_LABEL_MAP = {v: k for k, v in INPUT_SECTOR_MAP.items()}

SEC_USER_AGENT = os.getenv("SEC_USER_AGENT", "ValenceApp/1.0 veera.sachinsk@gmail.com")
SEC_HEADERS = {
    "User-Agent": SEC_USER_AGENT,
    "Accept-Encoding": "gzip, deflate",
}
TICKER_CIK_URL = "https://www.sec.gov/files/company_tickers.json"


# ── Scoring ───────────────────────────────────────────────────────────────────
def score_company(pub, priv, fin):
    score = 0.0
    if pub["sector"] == INPUT_SECTOR_MAP.get(priv.get("sector", ""), ""):
        score += 40
    priv_rev = (priv.get("revenue_m") or 0) * 1e6
    pub_rev  = fin.get("revenue") or 0
    if priv_rev > 0 and pub_rev > 0:
        log_dist = abs(np.log10(pub_rev / priv_rev))
        score += max(0, 20 - log_dist * 8)
    priv_growth = (priv.get("rev_growth_pct") or 0) / 100
    pub_growth  = fin.get("rev_growth") or 0
    diff = abs(pub_growth - priv_growth)
    score += max(0, 20 - diff * 100)
    priv_gm = (priv.get("gross_margin_pct") or 0) / 100
    pub_gm  = fin.get("gross_margin") or 0
    diff = abs(pub_gm - priv_gm)
    score += max(0, 15 - diff * 60)
    if priv.get("geo") == pub.get("geo") or pub.get("geo") == "Global":
        score += 5
    return round(min(score, 100), 1)


# ── Models ────────────────────────────────────────────────────────────────────
class PrivateCompanyInput(BaseModel):
    company_name:      str
    sector:            str
    sub_sector:        Optional[str] = ""
    geo:               Optional[str] = "North America"
    stage:             Optional[str] = "Growth"
    revenue_m:         float
    ebitda_m:          Optional[float] = None
    gross_margin_pct:  Optional[float] = None
    net_income_m:      Optional[float] = None
    rev_growth_pct:    Optional[float] = None
    employees:         Optional[int]   = None
    max_comps:         Optional[int]   = 5

class ReportRequest(BaseModel):
    selectedCompany: Dict[str, Any]
    comps: List[Dict[str, Any]] = []
    privateCompany: Dict[str, Any] = {}


# ── Find Comps ────────────────────────────────────────────────────────────────
@app.post("/api/find-comps")
def find_comps(inp: PrivateCompanyInput):
    priv = inp.dict()
    target_sector = INPUT_SECTOR_MAP.get(inp.sector, "")
    candidates = [c for c in COMPANY_UNIVERSE if c["sector"] == target_sector]
    if not candidates:
        candidates = COMPANY_UNIVERSE

    scored = []
    for pub in candidates:
        fin = FINANCIALS_DB.get(pub["ticker"])
        if not fin:
            continue
        s = score_company(pub, priv, fin)
        scored.append({**pub, **fin, "match_score": s})

    scored.sort(key=lambda x: x["match_score"], reverse=True)
    top = scored[:inp.max_comps]

    if not top:
        return {"error": "No comparables found."}

    def stats(vals):
        vals = [v for v in vals if v is not None and v > 0]
        if not vals:
            return None
        return {
            "median": round(float(np.median(vals)), 2),
            "p25":    round(float(np.percentile(vals, 25)), 2),
            "p75":    round(float(np.percentile(vals, 75)), 2),
            "mean":   round(float(np.mean(vals)), 2),
            "min":    round(float(np.min(vals)), 2),
            "max":    round(float(np.max(vals)), 2),
        }

    multiples = {
        "ev_rev":    stats([c.get("ev_rev")    for c in top]),
        "ev_ebitda": stats([c.get("ev_ebitda") for c in top]),
        "ev_gp":     stats([c.get("ev_gp")     for c in top]),
        "pe":        stats([c.get("pe_ratio")   for c in top]),
    }

    rev_m    = inp.revenue_m
    ebitda_m = inp.ebitda_m
    gp_m     = rev_m * (inp.gross_margin_pct / 100) if inp.gross_margin_pct else None

    implied = {}
    if multiples["ev_rev"] and rev_m:
        m = multiples["ev_rev"]
        implied["ev_rev"] = {"method": "EV / Revenue", "low": round(m["p25"] * rev_m, 1), "mid": round(m["median"] * rev_m, 1), "high": round(m["p75"] * rev_m, 1), "multiple_used": m["median"], "label": f"${rev_m}M x {m['median']}x"}
    if multiples["ev_ebitda"] and ebitda_m and ebitda_m > 0:
        m = multiples["ev_ebitda"]
        implied["ev_ebitda"] = {"method": "EV / EBITDA", "low": round(m["p25"] * ebitda_m, 1), "mid": round(m["median"] * ebitda_m, 1), "high": round(m["p75"] * ebitda_m, 1), "multiple_used": m["median"], "label": f"${ebitda_m}M x {m['median']}x"}
    if multiples["ev_gp"] and gp_m and gp_m > 0:
        m = multiples["ev_gp"]
        implied["ev_gp"] = {"method": "EV / Gross Profit", "low": round(m["p25"] * gp_m, 1), "mid": round(m["median"] * gp_m, 1), "high": round(m["p75"] * gp_m, 1), "multiple_used": m["median"], "label": f"${round(gp_m,1)}M x {m['median']}x"}

    all_lows  = [v["low"]  for v in implied.values()]
    all_highs = [v["high"] for v in implied.values()]
    overall_range = {"low": round(min(all_lows), 1), "high": round(max(all_highs), 1)} if all_lows else None

    comps_out = []
    for c in top:
        comps_out.append({
            "ticker":       c["ticker"],
            "name":         c["name"],
            "sub":          c.get("sub", ""),
            "match_score":  c["match_score"],
            "market_cap_b": round(c["market_cap"] / 1e9, 2) if c.get("market_cap") else None,
            "ev_b":         round(c["ev"] / 1e9, 2)          if c.get("ev")         else None,
            "revenue_m":    round(c["revenue"] / 1e6, 1)     if c.get("revenue")    else None,
            "ebitda_m":     round(c["ebitda"] / 1e6, 1)      if c.get("ebitda")     else None,
            "ev_rev":       c.get("ev_rev"),
            "ev_ebitda":    c.get("ev_ebitda"),
            "ev_gp":        c.get("ev_gp"),
            "pe_ratio":     c.get("pe_ratio"),
            "rev_growth":   round(c["rev_growth"] * 100, 1)   if c.get("rev_growth")   else None,
            "gross_margin": round(c["gross_margin"] * 100, 1)  if c.get("gross_margin")  else None,
            "employees":    c.get("employees"),
        })

    return {
        "comps":         comps_out,
        "multiples":     multiples,
        "implied":       implied,
        "overall_range": overall_range,
        "sector_label":  SECTOR_LABEL_MAP.get(target_sector, inp.sector),
        "comps_count":   len(top),
    }


# ── Generate PDF Report ───────────────────────────────────────────────────────
@app.post("/api/generate-report")
def generate_report(req: ReportRequest):
    company = req.selectedCompany
    comps   = req.comps
    private = req.privateCompany

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                            rightMargin=0.75*inch, leftMargin=0.75*inch,
                            topMargin=0.75*inch, bottomMargin=0.75*inch)

    styles  = getSampleStyleSheet()
    purple  = colors.HexColor("#7c3aed")
    dark    = colors.HexColor("#111111")

    title_style = ParagraphStyle("title", parent=styles["Title"],
                                  textColor=purple, fontSize=20, spaceAfter=6)
    h2_style    = ParagraphStyle("h2", parent=styles["Heading2"],
                                  textColor=purple, fontSize=13, spaceAfter=4)
    body_style  = ParagraphStyle("body", parent=styles["Normal"],
                                  fontSize=10, spaceAfter=4, textColor=dark)
    small_style = ParagraphStyle("small", parent=styles["Normal"],
                                  fontSize=8, textColor=colors.grey)

    def fmt_m(v):
        if v is None: return "N/A"
        try: return f"${float(v):,.1f}M"
        except: return "N/A"

    def fmt_b(v):
        if v is None: return "N/A"
        try: return f"${float(v):,.2f}B"
        except: return "N/A"

    def fmt_x(v):
        if v is None: return "—"
        try: return f"{float(v):.1f}x"
        except: return "—"

    def fmt_pct(v):
        if v is None: return "—"
        try: return f"{float(v):.1f}%"
        except: return "—"

    ticker       = company.get("ticker", "N/A")
    name         = company.get("name", "N/A")
    private_name = private.get("company_name", "Target Company")
    rev_m        = company.get("revenue_m")
    ebitda_m     = company.get("ebitda_m")
    market_cap_b = company.get("market_cap_b")
    ev_b         = company.get("ev_b")
    ev_rev       = company.get("ev_rev")
    ev_ebitda    = company.get("ev_ebitda")
    ev_gp        = company.get("ev_gp")
    match_score  = company.get("match_score")
    gross_margin = company.get("gross_margin")
    rev_growth   = company.get("rev_growth")
    ebitda_margin = round(float(ebitda_m) / float(rev_m) * 100, 1) if ebitda_m and rev_m else None

    private_rev    = private.get("revenue_m")
    private_ebitda = private.get("ebitda_m")
    private_gm     = private.get("gross_margin_pct")
    private_growth = private.get("rev_growth_pct")

    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    story.append(Paragraph("Valence Comparable Company Report", title_style))
    story.append(Paragraph(f"Target Company: {private_name}", body_style))
    story.append(Paragraph(f"Selected Public Comparable: {name} ({ticker})", body_style))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y')}", small_style))
    story.append(Spacer(1, 0.2*inch))

    # ── Executive Summary ─────────────────────────────────────────────────────
    story.append(Paragraph("Executive Summary", h2_style))
    story.append(Paragraph(
        f"This report presents a comparable company analysis for {private_name} using "
        f"{name} ({ticker}) as a selected public comparable. The analysis reviews business "
        f"similarity, financial metrics, trading multiples, and implied valuation calculations.",
        body_style
    ))
    story.append(Spacer(1, 0.15*inch))

    # ── Private Company Inputs ────────────────────────────────────────────────
    story.append(Paragraph("Private Company Inputs", h2_style))
    priv_data = [
        ["Metric", "Value"],
        ["Company Name",    private_name],
        ["Sector",          private.get("sector", "N/A")],
        ["Geography",       private.get("geo", "N/A")],
        ["Stage",           private.get("stage", "N/A")],
        ["Revenue (TTM)",   fmt_m(private_rev)],
        ["EBITDA (TTM)",    fmt_m(private_ebitda)],
        ["Gross Margin",    fmt_pct(private_gm)],
        ["Revenue Growth",  fmt_pct(private_growth)],
    ]
    pt = Table(priv_data, colWidths=[2.5*inch, 4*inch])
    pt.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), purple),
        ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f3ff")]),
        ("GRID",          (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
    ]))
    story.append(pt)
    story.append(Spacer(1, 0.2*inch))

    # ── Selected Comparable Overview ──────────────────────────────────────────
    story.append(Paragraph("Selected Comparable Company Overview", h2_style))
    overview_data = [
        ["Metric", "Value"],
        ["Company",         name],
        ["Ticker",          ticker],
        ["Sub-sector",      company.get("sub", "N/A")],
        ["Revenue (TTM)",   fmt_m(rev_m)],
        ["EBITDA (TTM)",    fmt_m(ebitda_m)],
        ["EBITDA Margin",   fmt_pct(ebitda_margin)],
        ["Gross Margin",    fmt_pct(gross_margin)],
        ["Revenue Growth",  fmt_pct(rev_growth)],
        ["Market Cap",      fmt_b(market_cap_b)],
        ["Enterprise Value",fmt_b(ev_b)],
        ["EV / Revenue",    fmt_x(ev_rev)],
        ["EV / EBITDA",     fmt_x(ev_ebitda)],
        ["EV / Gross Profit",fmt_x(ev_gp)],
        ["Match Score",     f"{match_score}%" if match_score else "N/A"],
    ]
    t = Table(overview_data, colWidths=[2.5*inch, 4*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), purple),
        ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f3ff")]),
        ("GRID",          (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.2*inch))

    # ── Full Comp Set ─────────────────────────────────────────────────────────
    story.append(Paragraph("Comparable Company Set", h2_style))
    comp_rows = [["Ticker", "Company", "Revenue", "EBITDA", "Gross Margin", "Rev Growth", "EV/Rev", "EV/EBITDA", "Match"]]
    for c in comps:
        comp_rows.append([
            c.get("ticker", ""),
            c.get("name", ""),
            fmt_m(c.get("revenue_m")),
            fmt_m(c.get("ebitda_m")),
            fmt_pct(c.get("gross_margin")),
            fmt_pct(c.get("rev_growth")),
            fmt_x(c.get("ev_rev")),
            fmt_x(c.get("ev_ebitda")),
            f"{c.get('match_score', '')}%",
        ])
    ct = Table(comp_rows, colWidths=[0.55*inch, 1.7*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.65*inch, 0.8*inch, 0.6*inch])
    ct.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), purple),
        ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 7.5),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f3ff")]),
        ("GRID",          (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("TOPPADDING",    (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING",   (0, 0), (-1, -1), 5),
    ]))
    story.append(ct)
    story.append(Spacer(1, 0.2*inch))

    # ── Valuation Analysis ────────────────────────────────────────────────────
    story.append(Paragraph("Valuation Analysis", h2_style))
    val_rows = [["Method", "Private Co. Metric", "Selected Multiple", "Implied Enterprise Value"]]
    if ev_rev and private_rev:
        implied_ev_rev = round(float(ev_rev) * float(private_rev), 1)
        val_rows.append(["EV / Revenue", fmt_m(private_rev), fmt_x(ev_rev), fmt_m(implied_ev_rev)])
    if ev_ebitda and private_ebitda:
        implied_ev_ebitda = round(float(ev_ebitda) * float(private_ebitda), 1)
        val_rows.append(["EV / EBITDA", fmt_m(private_ebitda), fmt_x(ev_ebitda), fmt_m(implied_ev_ebitda)])
    if ev_gp and private_gm and private_rev:
        gp = float(private_rev) * float(private_gm) / 100
        implied_ev_gp = round(float(ev_gp) * gp, 1)
        val_rows.append(["EV / Gross Profit", fmt_m(gp), fmt_x(ev_gp), fmt_m(implied_ev_gp)])

    vt = Table(val_rows, colWidths=[1.5*inch, 1.7*inch, 1.7*inch, 1.9*inch])
    vt.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), purple),
        ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f3ff")]),
        ("GRID",          (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
    ]))
    story.append(vt)
    story.append(Spacer(1, 0.15*inch))

    # ── Calculation Walkthrough ───────────────────────────────────────────────
    story.append(Paragraph("Calculation Walkthrough", h2_style))
    if ev_rev and private_rev:
        story.append(Paragraph(
            f"<b>EV / Revenue Method:</b> {private_name}'s revenue of {fmt_m(private_rev)} multiplied "
            f"by {name}'s EV/Revenue multiple of {fmt_x(ev_rev)} implies an enterprise value of "
            f"{fmt_m(round(float(ev_rev)*float(private_rev),1))}.",
            body_style
        ))
    if ev_ebitda and private_ebitda:
        story.append(Paragraph(
            f"<b>EV / EBITDA Method:</b> {private_name}'s EBITDA of {fmt_m(private_ebitda)} multiplied "
            f"by {name}'s EV/EBITDA multiple of {fmt_x(ev_ebitda)} implies an enterprise value of "
            f"{fmt_m(round(float(ev_ebitda)*float(private_ebitda),1))}.",
            body_style
        ))
    if ev_gp and private_gm and private_rev:
        gp = float(private_rev) * float(private_gm) / 100
        story.append(Paragraph(
            f"<b>EV / Gross Profit Method:</b> {private_name}'s gross profit of {fmt_m(gp)} "
            f"(revenue {fmt_m(private_rev)} x {fmt_pct(private_gm)} margin) multiplied by "
            f"{name}'s EV/GP multiple of {fmt_x(ev_gp)} implies an enterprise value of "
            f"{fmt_m(round(float(ev_gp)*gp,1))}.",
            body_style
        ))
    story.append(Spacer(1, 0.15*inch))

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(Paragraph("Important Notes", h2_style))
    story.append(Paragraph(
        "This report is automatically generated by Valence. Valuation outputs should be reviewed "
        "carefully and do not constitute investment advice. Results depend on the quality of the "
        "peer set, accuracy of financial data, and assumptions provided for the private company.",
        body_style
    ))
    story.append(Spacer(1, 0.1*inch))
    story.append(Paragraph("Generated by Valence", small_style))

    doc.build(story)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="valence-report-{ticker}.pdf"'}
    )


# ── Health & Sectors ──────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "companies_in_db": len(FINANCIALS_DB)}

@app.get("/api/sectors")
def sectors():
    return {"sectors": list(INPUT_SECTOR_MAP.keys())}


# ── SEC EDGAR Helpers ─────────────────────────────────────────────────────────
@lru_cache(maxsize=1)
def load_ticker_to_cik_map():
    response = requests.get(TICKER_CIK_URL, headers=SEC_HEADERS, timeout=20)
    response.raise_for_status()
    data = response.json()
    ticker_map = {}
    for item in data.values():
        ticker = item["ticker"].upper()
        cik = str(item["cik_str"]).zfill(10)
        ticker_map[ticker] = cik
    return ticker_map

def sec_get_json(url):
    response = requests.get(url, headers=SEC_HEADERS, timeout=20)
    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="SEC data not found.")
    response.raise_for_status()
    return response.json()

def build_filing_url(cik, accession_number, primary_document):
    cik_no_leading_zeros = str(int(cik))
    accession_no_dashes = accession_number.replace("-", "")
    return (
        f"https://www.sec.gov/Archives/edgar/data/"
        f"{cik_no_leading_zeros}/{accession_no_dashes}/{primary_document}"
    )

def get_recent_filings(submissions, cik):
    recent = submissions.get("filings", {}).get("recent", {})
    forms = recent.get("form", [])
    filing_dates = recent.get("filingDate", [])
    report_dates = recent.get("reportDate", [])
    accession_numbers = recent.get("accessionNumber", [])
    primary_docs = recent.get("primaryDocument", [])
    important_forms = {"10-K","10-Q","8-K","S-1","DEF 14A","10-K/A","10-Q/A","424B4"}
    filings = []
    for i, form in enumerate(forms):
        if form not in important_forms:
            continue
        accession = accession_numbers[i]
        primary_doc = primary_docs[i]
        filings.append({
            "form": form,
            "filingDate": filing_dates[i],
            "reportDate": report_dates[i] if i < len(report_dates) else None,
            "accessionNumber": accession,
            "document": primary_doc,
            "url": build_filing_url(cik, accession, primary_doc),
        })
        if len(filings) >= 25:
            break
    return filings

def latest_fact(companyfacts, possible_tags, unit="USD"):
    facts_root = companyfacts.get("facts", {}).get("us-gaap", {})
    for tag in possible_tags:
        concept = facts_root.get(tag)
        if not concept:
            continue
        unit_data = concept.get("units", {}).get(unit)
        if not unit_data:
            continue
        clean_items = [item for item in unit_data if item.get("val") is not None and item.get("filed")]
        if not clean_items:
            continue
        latest = sorted(clean_items, key=lambda x: (x.get("filed", ""), x.get("end", "")), reverse=True)[0]
        return {
            "tag":    tag,
            "label":  concept.get("label", tag),
            "value":  latest.get("val"),
            "filed":  latest.get("filed"),
            "period": latest.get("fp"),
            "form":   latest.get("form"),
            "end":    latest.get("end"),
        }
    return None

def get_financials(companyfacts):
    return {
        "revenue":           latest_fact(companyfacts, ["RevenueFromContractWithCustomerExcludingAssessedTax","SalesRevenueNet","Revenues"]),
        "netIncome":         latest_fact(companyfacts, ["NetIncomeLoss"]),
        "totalAssets":       latest_fact(companyfacts, ["Assets"]),
        "totalLiabilities":  latest_fact(companyfacts, ["Liabilities","LiabilitiesCurrent"]),
        "stockholdersEquity":latest_fact(companyfacts, ["StockholdersEquity","StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"]),
        "cash":              latest_fact(companyfacts, ["CashAndCashEquivalentsAtCarryingValue","CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"]),
        "operatingIncome":   latest_fact(companyfacts, ["OperatingIncomeLoss"]),
    }

def safe_float(value):
    try:
        if value is None: return None
        return float(value)
    except: return None

def fast_info_get(fast_info, key):
    try: return fast_info[key]
    except:
        try: return fast_info.get(key)
        except: return None

def get_stock_data(ticker):
    try:
        stock = yf.Ticker(ticker)
        fast_info = stock.fast_info
        one_year_history = stock.history(period="1y")
        five_day_history = stock.history(period="5d")
        current_price = safe_float(fast_info_get(fast_info, "last_price"))
        if current_price is None and not five_day_history.empty:
            current_price = safe_float(five_day_history["Close"].dropna().iloc[-1])
        year_high = year_low = None
        if not one_year_history.empty:
            year_high = safe_float(one_year_history["High"].max())
            year_low  = safe_float(one_year_history["Low"].min())
        return {
            "ticker":        ticker,
            "currentPrice":  current_price,
            "previousClose": safe_float(fast_info_get(fast_info, "previous_close")),
            "dayHigh":       safe_float(fast_info_get(fast_info, "day_high")),
            "dayLow":        safe_float(fast_info_get(fast_info, "day_low")),
            "yearHigh":      year_high,
            "yearLow":       year_low,
            "marketCap":     safe_float(fast_info_get(fast_info, "market_cap")),
            "currency":      fast_info_get(fast_info, "currency") or "USD",
        }
    except Exception as e:
        return {"ticker": ticker, "error": str(e)}


# ── Company Detail ────────────────────────────────────────────────────────────
@app.get("/api/company/{ticker}")
def get_company_detail(ticker: str):
    ticker = ticker.upper().strip()
    ticker_map = load_ticker_to_cik_map()
    if ticker not in ticker_map:
        raise HTTPException(status_code=404, detail=f"No SEC CIK found for ticker {ticker}.")
    cik = ticker_map[ticker]
    submissions  = sec_get_json(f"https://data.sec.gov/submissions/CIK{cik}.json")
    companyfacts = sec_get_json(f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json")
    return {
        "company": {
            "name":        submissions.get("name"),
            "ticker":      ticker,
            "cik":         cik,
            "sic":         submissions.get("sic"),
            "sicDescription": submissions.get("sicDescription"),
            "exchanges":   submissions.get("exchanges", []),
            "entityType":  submissions.get("entityType"),
        },
        "stock":    get_stock_data(ticker),
        "financials": get_financials(companyfacts),
        "filings":  get_recent_filings(submissions, cik),
    }