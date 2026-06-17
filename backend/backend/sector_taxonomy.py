# backend/sector_taxonomy.py

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional


LIVE = "live"
HISTORICAL = "historical"

DIRECT = "direct"
STRATEGIC = "strategic"


def comp(
    ticker: str,
    name: str,
    status: str = LIVE,
    note: str = "",
) -> Dict[str, Any]:
    return {
        "ticker": ticker,
        "name": name,
        "status": status,
        "note": note,
    }


SECTOR_TAXONOMY: Dict[str, List[Dict[str, Any]]] = {
    "AI / Machine Learning": [
        comp("PLTR", "Palantir"),
        comp("SNOW", "Snowflake"),
        comp("DDOG", "Datadog"),
        comp("MDB", "MongoDB"),
        comp("CFLT", "Confluent"),
        comp("ESTC", "Elastic"),
        comp("AI", "C3.ai"),
        comp("PATH", "UiPath"),
    ],

    "Enterprise Software / SaaS": [
        comp("CRM", "Salesforce"),
        comp("NOW", "ServiceNow"),
        comp("WDAY", "Workday"),
        comp("TEAM", "Atlassian"),
        comp("ADBE", "Adobe"),
        comp("INTU", "Intuit"),
        comp("ORCL", "Oracle"),
        comp("SAP", "SAP"),
        comp("MSFT", "Microsoft"),
    ],

    "Cloud / Data Infrastructure": [
        comp("SNOW", "Snowflake"),
        comp("MDB", "MongoDB"),
        comp("NET", "Cloudflare"),
        comp("DDOG", "Datadog"),
        comp("CFLT", "Confluent"),
        comp("ESTC", "Elastic"),
        comp("FIVN", "Five9"),
        comp("TWLO", "Twilio"),
        comp("DOCN", "DigitalOcean"),
    ],

    "Cybersecurity": [
        comp("CRWD", "CrowdStrike"),
        comp("ZS", "Zscaler"),
        comp("PANW", "Palo Alto Networks"),
        comp("FTNT", "Fortinet"),
        comp("OKTA", "Okta"),
        comp("S", "SentinelOne"),
        comp("CYBR", "CyberArk"),
        comp("TENB", "Tenable"),
        comp("QLYS", "Qualys"),
        comp("NET", "Cloudflare"),
    ],

    "Developer Tools / DevOps": [
        comp("GTLB", "GitLab"),
        comp("TEAM", "Atlassian"),
        comp("DDOG", "Datadog"),
        comp("FROG", "JFrog"),
        comp("CFLT", "Confluent"),
        comp("MDB", "MongoDB"),
        comp("ESTC", "Elastic"),
        comp("DOCN", "DigitalOcean"),
    ],

    "Data Analytics / Observability": [
        comp("DDOG", "Datadog"),
        comp("PLTR", "Palantir"),
        comp("SNOW", "Snowflake"),
        comp("ESTC", "Elastic"),
        comp("MDB", "MongoDB"),
        comp("CFLT", "Confluent"),
        comp(
            "SPLK",
            "Splunk",
            HISTORICAL,
            "Historical comp only; acquired by Cisco in 2024.",
        ),
        comp(
            "NEWR",
            "New Relic",
            HISTORICAL,
            "Historical comp only; taken private in 2023.",
        ),
    ],

    "FinTech / Payments": [
        comp("PYPL", "PayPal"),
        comp("SQ", "Block"),
        comp("FI", "Fiserv"),
        comp("FIS", "Fidelity National Information Services"),
        comp("GPN", "Global Payments"),
        comp("TOST", "Toast"),
        comp("FOUR", "Shift4 Payments"),
        comp("ADYEY", "Adyen"),
        comp("NU", "Nu Holdings"),
        comp("SOFI", "SoFi"),
    ],

    "E-Commerce / Marketplaces": [
        comp("SHOP", "Shopify"),
        comp("AMZN", "Amazon"),
        comp("ETSY", "Etsy"),
        comp("EBAY", "eBay"),
        comp("MELI", "MercadoLibre"),
        comp("SE", "Sea Limited"),
        comp("CPNG", "Coupang"),
        comp("DASH", "DoorDash"),
        comp("UBER", "Uber"),
        comp("ABNB", "Airbnb"),
    ],

    "Consumer Internet / Digital Ads": [
        comp("META", "Meta"),
        comp("GOOGL", "Alphabet"),
        comp("SNAP", "Snap"),
        comp("PINS", "Pinterest"),
        comp("RDDT", "Reddit"),
        comp("MTCH", "Match Group"),
        comp("SPOT", "Spotify"),
        comp("NFLX", "Netflix"),
    ],

    "Media / Communications": [
        comp("ZM", "Zoom"),
        comp("TWLO", "Twilio"),
        comp("FIVN", "Five9"),
        comp("NFLX", "Netflix"),
        comp("SPOT", "Spotify"),
        comp("DIS", "Disney"),
        comp("WBD", "Warner Bros. Discovery"),
        comp("PARA", "Paramount"),
    ],

    "Semiconductors / AI Hardware": [
        comp("NVDA", "NVIDIA"),
        comp("AMD", "Advanced Micro Devices"),
        comp("AVGO", "Broadcom"),
        comp("INTC", "Intel"),
        comp("QCOM", "Qualcomm"),
        comp("MRVL", "Marvell"),
        comp("ARM", "Arm Holdings"),
        comp("TSM", "Taiwan Semiconductor"),
        comp("MU", "Micron"),
        comp("ASML", "ASML"),
    ],

    "IT Services / Consulting": [
        comp("ACN", "Accenture"),
        comp("IBM", "IBM"),
        comp("CTSH", "Cognizant"),
        comp("INFY", "Infosys"),
        comp("WIT", "Wipro"),
        comp("GLOB", "Globant"),
        comp("EPAM", "EPAM Systems"),
        comp("DXC", "DXC Technology"),
    ],

    "Healthcare Technology": [
        comp("VEEV", "Veeva"),
        comp("TDOC", "Teladoc"),
        comp("DOCS", "Doximity"),
        comp("HIMS", "Hims & Hers"),
        comp("OSCR", "Oscar Health"),
        comp("CLOV", "Clover Health"),
        comp("HQY", "HealthEquity"),
        comp("OMCL", "Omnicell"),
    ],

    "Life Sciences Software": [
        comp("VEEV", "Veeva"),
        comp("IQV", "IQVIA"),
        comp("CERT", "Certara"),
        comp("MEDP", "Medpace"),
        comp("DHR", "Danaher"),
        comp("TMO", "Thermo Fisher"),
        comp("A", "Agilent"),
    ],

    "HR / Payroll / Workforce Software": [
        comp("WDAY", "Workday"),
        comp("ADP", "ADP"),
        comp("PAYX", "Paychex"),
        comp("PCTY", "Paylocity"),
        comp("PAYC", "Paycom"),
        comp("DAY", "Dayforce"),
        comp("BILL", "BILL"),
    ],

    "Vertical Software": [
        comp("VEEV", "Veeva"),
        comp("APPF", "AppFolio"),
        comp("LSPD", "Lightspeed"),
        comp("TOST", "Toast"),
        comp("MNDY", "Monday.com"),
        comp("HUBS", "HubSpot"),
        comp("DOCU", "DocuSign"),
        comp("BL", "BlackLine"),
        comp("NCNO", "nCino"),
    ],

    "Consumer / SMB Software": [
        comp("INTU", "Intuit"),
        comp("HUBS", "HubSpot"),
        comp("BILL", "BILL"),
        comp("DOCU", "DocuSign"),
        comp("BOX", "Box"),
        comp("DBX", "Dropbox"),
        comp("ASAN", "Asana"),
        comp("MNDY", "Monday.com"),
        comp(
            "SMAR",
            "Smartsheet",
            HISTORICAL,
            "Historical comp only; acquisition by Blackstone / Vista closed in 2025.",
        ),
    ],

    "Real Estate / PropTech": [
        comp("Z", "Zillow"),
        comp("OPEN", "Opendoor"),
        comp("RDFN", "Redfin"),
        comp("APPF", "AppFolio"),
        comp("CSGP", "CoStar"),
        comp("CBRE", "CBRE"),
        comp("JLL", "JLL"),
    ],

    "Education Technology": [
        comp("DUOL", "Duolingo"),
        comp("COUR", "Coursera"),
        comp("CHGG", "Chegg"),
        comp("LRN", "Stride"),
        comp(
            "TWOU",
            "2U",
            HISTORICAL,
            "Distressed / historical comp only; Chapter 11 and delisting issues.",
        ),
        comp("UDMY", "Udemy"),
    ],

    "Energy / Climate Tech": [
        comp("TSLA", "Tesla"),
        comp("ENPH", "Enphase"),
        comp("SEDG", "SolarEdge"),
        comp("FSLR", "First Solar"),
        comp("BE", "Bloom Energy"),
        comp("PLUG", "Plug Power"),
        comp("RUN", "Sunrun"),
        comp("NEE", "NextEra Energy"),
    ],
}


SECTOR_KEYWORDS: Dict[str, List[str]] = {
    "AI / Machine Learning": [
        "ai",
        "artificial intelligence",
        "machine learning",
        "llm",
        "large language model",
        "foundation model",
        "generative ai",
        "anthropic",
        "openai",
        "model",
        "automation",
        "agent",
        "copilot",
    ],
    "Enterprise Software / SaaS": [
        "saas",
        "enterprise software",
        "subscription",
        "workflow",
        "crm",
        "erp",
        "business software",
        "platform",
    ],
    "Cloud / Data Infrastructure": [
        "cloud",
        "database",
        "data infrastructure",
        "data warehouse",
        "api",
        "storage",
        "compute",
        "infrastructure",
    ],
    "Cybersecurity": [
        "security",
        "cybersecurity",
        "identity",
        "endpoint",
        "zero trust",
        "firewall",
        "threat",
        "vulnerability",
    ],
    "Developer Tools / DevOps": [
        "developer",
        "devops",
        "git",
        "ci/cd",
        "deployment",
        "software development",
        "engineering workflow",
    ],
    "Data Analytics / Observability": [
        "analytics",
        "observability",
        "monitoring",
        "logs",
        "metrics",
        "data analytics",
        "business intelligence",
    ],
    "FinTech / Payments": [
        "fintech",
        "payments",
        "banking",
        "lending",
        "card",
        "wallet",
        "merchant",
        "financial services",
    ],
    "E-Commerce / Marketplaces": [
        "ecommerce",
        "e-commerce",
        "marketplace",
        "commerce",
        "retail",
        "online store",
        "delivery",
        "booking",
    ],
    "Consumer Internet / Digital Ads": [
        "consumer internet",
        "ads",
        "advertising",
        "social",
        "search",
        "creator",
        "streaming",
        "dating",
    ],
    "Media / Communications": [
        "media",
        "communications",
        "video",
        "streaming",
        "messaging",
        "contact center",
        "telephony",
    ],
    "Semiconductors / AI Hardware": [
        "semiconductor",
        "chip",
        "gpu",
        "ai hardware",
        "datacenter hardware",
        "foundry",
        "memory",
    ],
    "IT Services / Consulting": [
        "consulting",
        "it services",
        "systems integration",
        "outsourcing",
        "digital transformation",
    ],
    "Healthcare Technology": [
        "healthcare",
        "health tech",
        "telehealth",
        "patient",
        "provider",
        "insurance",
        "clinical",
    ],
    "Life Sciences Software": [
        "life sciences",
        "pharma",
        "clinical trial",
        "biotech",
        "laboratory",
        "drug development",
    ],
    "HR / Payroll / Workforce Software": [
        "hr",
        "payroll",
        "workforce",
        "human capital",
        "benefits",
        "employee",
    ],
    "Vertical Software": [
        "vertical software",
        "industry software",
        "restaurant software",
        "legal software",
        "real estate software",
        "field service",
    ],
    "Consumer / SMB Software": [
        "smb",
        "small business",
        "consumer software",
        "productivity",
        "collaboration",
        "documents",
        "invoicing",
    ],
    "Real Estate / PropTech": [
        "real estate",
        "property",
        "proptech",
        "brokerage",
        "housing",
        "rentals",
    ],
    "Education Technology": [
        "education",
        "edtech",
        "learning",
        "courses",
        "students",
        "tutoring",
        "online education",
    ],
    "Energy / Climate Tech": [
        "energy",
        "climate",
        "solar",
        "renewable",
        "battery",
        "ev",
        "clean energy",
    ],
}


AI_STRATEGIC_ECOSYSTEM_SECTORS = [
    "Semiconductors / AI Hardware",
    "Cloud / Data Infrastructure",
]


SECTOR_LIST = list(SECTOR_TAXONOMY.keys())


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).lower().strip()


def normalize_sector(sector: Optional[str]) -> Optional[str]:
    if not sector:
        return None

    raw = clean_text(sector)

    for valid_sector in SECTOR_LIST:
        if raw == valid_sector.lower():
            return valid_sector

    for valid_sector in SECTOR_LIST:
        simple = valid_sector.lower().replace("/", " ").replace("-", " ")
        if raw in simple or simple in raw:
            return valid_sector

    return None


def infer_sector(private_company: Dict[str, Any]) -> str:
    explicit_sector = normalize_sector(
        private_company.get("sector")
        or private_company.get("industry")
        or private_company.get("category")
    )

    if explicit_sector:
        return explicit_sector

    searchable_text = " ".join(
        [
            clean_text(private_company.get("companyName")),
            clean_text(private_company.get("name")),
            clean_text(private_company.get("description")),
            clean_text(private_company.get("businessDescription")),
            clean_text(private_company.get("product")),
            clean_text(private_company.get("website")),
        ]
    )

    scores: Dict[str, int] = {}

    for sector, keywords in SECTOR_KEYWORDS.items():
        score = 0

        for keyword in keywords:
            if keyword in searchable_text:
                score += 1

        if score > 0:
            scores[sector] = score

    if not scores:
        return "Enterprise Software / SaaS"

    return max(scores.items(), key=lambda item: item[1])[0]


def tokenize(text: str) -> set[str]:
    words = re.findall(r"[a-zA-Z0-9]+", clean_text(text))

    stop_words = {
        "the",
        "and",
        "for",
        "with",
        "from",
        "that",
        "this",
        "into",
        "company",
        "platform",
        "software",
        "solutions",
        "technology",
        "services",
    }

    return {word for word in words if word not in stop_words and len(word) > 2}


def build_candidate_reason(
    selected_sector: str,
    candidate_sector: str,
    relationship: str,
    candidate: Dict[str, Any],
) -> str:
    if relationship == STRATEGIC:
        return (
            f"Strategic ecosystem comp for {selected_sector}; useful for understanding "
            f"AI infrastructure exposure, but not a direct operating comp."
        )

    if candidate["status"] == HISTORICAL:
        return candidate.get("note") or "Historical comp only."

    return f"Direct public comp in {candidate_sector}."


def score_candidate(
    private_company: Dict[str, Any],
    candidate: Dict[str, Any],
    selected_sector: str,
    candidate_sector: str,
    relationship: str,
    order_index: int,
) -> int:
    base_score = 70 if relationship == DIRECT else 45

    if candidate_sector == selected_sector:
        base_score += 20

    private_text = " ".join(
        [
            clean_text(private_company.get("companyName")),
            clean_text(private_company.get("name")),
            clean_text(private_company.get("description")),
            clean_text(private_company.get("businessDescription")),
            clean_text(private_company.get("product")),
        ]
    )

    private_tokens = tokenize(private_text)
    sector_tokens = tokenize(candidate_sector)
    name_tokens = tokenize(candidate["name"])

    overlap = len(private_tokens.intersection(sector_tokens.union(name_tokens)))

    base_score += min(overlap * 4, 12)

    # Preserve your intentional ordering inside each sector.
    base_score -= min(order_index, 15)

    if candidate["status"] == HISTORICAL:
        base_score -= 30

    return max(0, min(99, base_score))


def select_sector_comps(
    private_company: Dict[str, Any],
    max_direct: int = 8,
    max_strategic: int = 5,
    include_historical: bool = False,
) -> Dict[str, Any]:
    selected_sector = infer_sector(private_company)

    direct_comps: List[Dict[str, Any]] = []
    strategic_comps: List[Dict[str, Any]] = []

    seen_tickers = set()

    for idx, candidate in enumerate(SECTOR_TAXONOMY[selected_sector]):
        if candidate["status"] == HISTORICAL and not include_historical:
            continue

        ticker = candidate["ticker"]

        if ticker in seen_tickers:
            continue

        seen_tickers.add(ticker)

        enriched = {
            **candidate,
            "sector": selected_sector,
            "relationship": DIRECT,
            "matchScore": score_candidate(
                private_company,
                candidate,
                selected_sector,
                selected_sector,
                DIRECT,
                idx,
            ),
            "reason": build_candidate_reason(
                selected_sector,
                selected_sector,
                DIRECT,
                candidate,
            ),
        }

        direct_comps.append(enriched)

    # AI companies should also show ecosystem comps, but separately.
    if selected_sector == "AI / Machine Learning":
        for ecosystem_sector in AI_STRATEGIC_ECOSYSTEM_SECTORS:
            for idx, candidate in enumerate(SECTOR_TAXONOMY[ecosystem_sector]):
                if candidate["status"] == HISTORICAL and not include_historical:
                    continue

                ticker = candidate["ticker"]

                if ticker in seen_tickers:
                    continue

                seen_tickers.add(ticker)

                enriched = {
                    **candidate,
                    "sector": ecosystem_sector,
                    "relationship": STRATEGIC,
                    "matchScore": score_candidate(
                        private_company,
                        candidate,
                        selected_sector,
                        ecosystem_sector,
                        STRATEGIC,
                        idx,
                    ),
                    "reason": build_candidate_reason(
                        selected_sector,
                        ecosystem_sector,
                        STRATEGIC,
                        candidate,
                    ),
                }

                strategic_comps.append(enriched)

    direct_comps = sorted(direct_comps, key=lambda item: item["matchScore"], reverse=True)
    strategic_comps = sorted(strategic_comps, key=lambda item: item["matchScore"], reverse=True)

    direct_comps = direct_comps[:max_direct]
    strategic_comps = strategic_comps[:max_strategic]

    selected_comps = direct_comps + strategic_comps

    return {
        "selectedSector": selected_sector,
        "directComps": direct_comps,
        "strategicComps": strategic_comps,
        "selectedComps": selected_comps,
        "allSectors": SECTOR_LIST,
    }