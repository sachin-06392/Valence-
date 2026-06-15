from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import numpy as np
from fastapi.middleware.cors import CORSMiddleware

from company_universe import COMPANY_UNIVERSE
from financials_db import FINANCIALS_DB

app = FastAPI(title="CompFinder API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://valence-lac-ten.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        implied["ev_rev"] = {
            "method": "EV / Revenue",
            "low":    round(m["p25"] * rev_m, 1),
            "mid":    round(m["median"] * rev_m, 1),
            "high":   round(m["p75"] * rev_m, 1),
            "multiple_used": m["median"],
            "label":  f"${rev_m}M x {m['median']}x",
        }
    if multiples["ev_ebitda"] and ebitda_m and ebitda_m > 0:
        m = multiples["ev_ebitda"]
        implied["ev_ebitda"] = {
            "method": "EV / EBITDA",
            "low":    round(m["p25"] * ebitda_m, 1),
            "mid":    round(m["median"] * ebitda_m, 1),
            "high":   round(m["p75"] * ebitda_m, 1),
            "multiple_used": m["median"],
            "label":  f"${ebitda_m}M x {m['median']}x",
        }
    if multiples["ev_gp"] and gp_m and gp_m > 0:
        m = multiples["ev_gp"]
        implied["ev_gp"] = {
            "method": "EV / Gross Profit",
            "low":    round(m["p25"] * gp_m, 1),
            "mid":    round(m["median"] * gp_m, 1),
            "high":   round(m["p75"] * gp_m, 1),
            "multiple_used": m["median"],
            "label":  f"${round(gp_m,1)}M x {m['median']}x",
        }

    all_lows  = [v["low"]  for v in implied.values()]
    all_highs = [v["high"] for v in implied.values()]
    overall_range = {
        "low":  round(min(all_lows), 1),
        "high": round(max(all_highs), 1),
    } if all_lows else None

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


@app.get("/api/health")
def health():
    return {"status": "ok", "companies_in_db": len(FINANCIALS_DB)}

@app.get("/api/sectors")
def sectors():
    return {"sectors": list(INPUT_SECTOR_MAP.keys())}

import os
import requests
import yfinance as yf
from functools import lru_cache
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware

# If you already have this CORS part, you do not need to duplicate it.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SEC_USER_AGENT = os.getenv(
    "SEC_USER_AGENT",
    "ValenceApp/1.0 veera.sachinsk@gmail.com"
)

SEC_HEADERS = {
    "User-Agent": SEC_USER_AGENT,
    "Accept-Encoding": "gzip, deflate",
}

TICKER_CIK_URL = "https://www.sec.gov/files/company_tickers.json"


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


def get_recent_filings(submissions):
    recent = submissions.get("filings", {}).get("recent", {})

    forms = recent.get("form", [])
    filing_dates = recent.get("filingDate", [])
    report_dates = recent.get("reportDate", [])
    accession_numbers = recent.get("accessionNumber", [])
    primary_docs = recent.get("primaryDocument", [])

    important_forms = {
        "10-K",
        "10-Q",
        "8-K",
        "S-1",
        "DEF 14A",
        "10-K/A",
        "10-Q/A",
        "424B4",
    }

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
            "url": build_filing_url(
                submissions.get("cik"),
                accession,
                primary_doc
            ),
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

        clean_items = [
            item for item in unit_data
            if item.get("val") is not None and item.get("filed")
        ]

        if not clean_items:
            continue

        latest = sorted(
            clean_items,
            key=lambda x: (x.get("filed", ""), x.get("end", "")),
            reverse=True
        )[0]

        return {
            "tag": tag,
            "label": concept.get("label", tag),
            "value": latest.get("val"),
            "filed": latest.get("filed"),
            "period": latest.get("fp"),
            "form": latest.get("form"),
            "end": latest.get("end"),
        }

    return None


def get_financials(companyfacts):
    return {
        "revenue": latest_fact(companyfacts, [
            "RevenueFromContractWithCustomerExcludingAssessedTax",
            "SalesRevenueNet",
            "Revenues",
        ]),
        "netIncome": latest_fact(companyfacts, [
            "NetIncomeLoss",
        ]),
        "totalAssets": latest_fact(companyfacts, [
            "Assets",
        ]),
        "totalLiabilities": latest_fact(companyfacts, [
            "Liabilities",
            "LiabilitiesCurrent",
        ]),
        "stockholdersEquity": latest_fact(companyfacts, [
            "StockholdersEquity",
            "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
        ]),
        "cash": latest_fact(companyfacts, [
            "CashAndCashEquivalentsAtCarryingValue",
            "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
        ]),
        "operatingIncome": latest_fact(companyfacts, [
            "OperatingIncomeLoss",
        ]),
    }


def safe_float(value):
    try:
        if value is None:
            return None
        return float(value)
    except Exception:
        return None


def fast_info_get(fast_info, key):
    try:
        return fast_info[key]
    except Exception:
        try:
            return fast_info.get(key)
        except Exception:
            return None


def get_stock_data(ticker):
    try:
        stock = yf.Ticker(ticker)
        fast_info = stock.fast_info

        one_year_history = stock.history(period="1y")
        five_day_history = stock.history(period="5d")

        current_price = safe_float(fast_info_get(fast_info, "last_price"))

        if current_price is None and not five_day_history.empty:
            current_price = safe_float(five_day_history["Close"].dropna().iloc[-1])

        year_high = None
        year_low = None

        if not one_year_history.empty:
            year_high = safe_float(one_year_history["High"].max())
            year_low = safe_float(one_year_history["Low"].min())

        return {
            "ticker": ticker,
            "currentPrice": current_price,
            "previousClose": safe_float(fast_info_get(fast_info, "previous_close")),
            "dayHigh": safe_float(fast_info_get(fast_info, "day_high")),
            "dayLow": safe_float(fast_info_get(fast_info, "day_low")),
            "yearHigh": year_high,
            "yearLow": year_low,
            "marketCap": safe_float(fast_info_get(fast_info, "market_cap")),
            "currency": fast_info_get(fast_info, "currency") or "USD",
        }

    except Exception as e:
        return {
            "ticker": ticker,
            "error": str(e),
        }


@app.get("/api/company/{ticker}")
def get_company_detail(ticker: str):
    ticker = ticker.upper().strip()

    ticker_map = load_ticker_to_cik_map()

    if ticker not in ticker_map:
        raise HTTPException(
            status_code=404,
            detail=f"No SEC CIK found for ticker {ticker}."
        )

    cik = ticker_map[ticker]

    submissions = sec_get_json(
        f"https://data.sec.gov/submissions/CIK{cik}.json"
    )

    companyfacts = sec_get_json(
        f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
    )

    return {
        "company": {
            "name": submissions.get("name"),
            "ticker": ticker,
            "cik": cik,
            "sic": submissions.get("sic"),
            "sicDescription": submissions.get("sicDescription"),
            "exchanges": submissions.get("exchanges", []),
            "entityType": submissions.get("entityType"),
        },
        "stock": get_stock_data(ticker),
        "financials": get_financials(companyfacts),
        "filings": get_recent_filings(submissions),
    }