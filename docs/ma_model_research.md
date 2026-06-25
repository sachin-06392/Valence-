# Valence M&A Recommendation Engine Research

## Objective

Build a professional-grade feature that recommends credible acquisition ideas, models the buyer-target transaction, and explains the strategic and financial reasoning clearly enough for corporate development, investment banking, and private equity users.

## What Professionals Expect

An M&A model should not only say "Company A should buy Company B." It needs to show:

- Why the buyer would care: product adjacency, customer overlap, geography, channel fit, technology capability, or defensive positioning.
- Why the target is digestible: purchase price relative to buyer EV, cash capacity, leverage capacity, share dilution, and integration complexity.
- Whether the math works: premium paid, funding mix, cost synergies, revenue synergies, tax rate, debt cost, incremental EBITDA, and EPS accretion/dilution.
- What precedent supports it: similar announced or closed deals, sector activity, premium paid, and transaction value.
- What could break the thesis: antitrust, customer churn, culture, integration spend, debt capacity, accounting effects, and multiple compression.
- What data was used: source, timestamp, financial period, and whether values are live, estimated, curated, or fallback.

## Data Architecture

### Public companies

SEC EDGAR should be the core public-company source because `data.sec.gov` provides JSON APIs for company submissions and extracted XBRL financial facts, including company filing history and companyfacts endpoints. The SEC notes these APIs are updated throughout the day and support bulk nightly ZIP files for efficient ingestion. Use the submissions endpoint for CIK/ticker/company metadata and companyfacts for standardized US-GAAP/IFRS facts.

Source: https://www.sec.gov/search-filings/edgar-application-programming-interfaces

The SEC fair-access page also requires efficient scripting, a declared user agent, and a current maximum request rate of 10 requests per second. Production ingestion should respect that limit, cache aggressively, and use bulk archives where possible.

Source: https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data

### Market data

EDGAR does not give live EV, share price, beta, trading multiples, short interest, or analyst estimates. A professional build needs at least one of:

- Financial Modeling Prep, Intrinio, Polygon, Tiingo, Nasdaq Data Link, FactSet, Bloomberg, S&P Capital IQ, Refinitiv, or Koyfin-style feeds.
- Daily snapshot tables for equity value, net debt, EV, EV/Revenue, EV/EBITDA, P/E, share count, and historical price reactions.

### Private and smaller-company coverage

The "big and small companies" requirement cannot be solved from SEC alone. Private-company targets require licensed datasets or user-uploaded CRM/proprietary sourcing data:

- Crunchbase, PitchBook, CB Insights, Tracxn, PrivCo, Apollo, LinkedIn/company headcount, Similarweb, BuiltWith, G2, app-store data, patent datasets, and web traffic sources.
- Fields needed: company description, sector taxonomy, funding, investors, ownership, revenue estimates, headcount trend, geography, product tags, customer segment, web traffic, founder/management, and latest news.

### News and event feeds

GDELT is useful for a live news and event layer. GDELT supports large-scale querying through BigQuery and provides raw event/graph datasets; it also exposes DOC 2.0 API query modes for article lists and galleries. For M&A, use it to monitor acquisition rumors, activist pressure, product launches, regulatory scrutiny, partnerships, litigation, and buyer intent.

Sources:

- https://www.gdeltproject.org/data.html
- https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/

### Deal precedents

The production engine should maintain a transactions table:

- Announced date, close date, buyer, target, target sector, transaction value, EV, revenue, EBITDA, EV/Revenue, EV/EBITDA, premium, consideration mix, source URL, and status.
- Sources: company press releases, SEC 8-Ks/proxy filings, FMP M&A feeds, Dealogic, FactSet, S&P Capital IQ, PitchBook, and manually curated banker-quality precedents.

## Scoring Model

The first production scoring version should be transparent and explainable:

- Strategic fit: sector adjacency, product overlap, customer segment, geography, route-to-market, and buyer stated strategy.
- Financial fit: target size relative to buyer, margin profile, growth spread, multiple spread, leverage capacity, liquidity, and share currency quality.
- Deal feasibility: antitrust risk, buyer acquisition history, target ownership, valuation premium required, target profitability, and integration complexity.
- Market timing: news momentum, sector M&A volume, public comp rerating, capital-market conditions, and buyer stock performance.
- Precedent support: similar deal volume, transaction multiples, strategic rationale, and paid premiums.

The current implementation uses the existing Valence public-company universe as a working screen. It ranks combinations by strategic fit, affordability, EV/Revenue arbitrage, growth, precedent support, and modeled EPS impact.

## Merger Model Layers

The in-app model should evolve in stages:

1. Screening model: purchase EV, premium, cash/debt/stock mix, cost synergies, revenue synergies, tax rate, interest cost, incremental EBITDA, and year-one EPS impact.
2. Banker model: purchase price allocation, goodwill, intangible asset write-up, amortization, refinancing, fees, transaction expenses, integration costs, pro forma share count, debt schedule, and multi-year accretion/dilution.
3. Forecast model: standalone buyer and target forecasts, revenue synergy ramp, cost synergy ramp, dis-synergies, working capital, capex, D&A, tax, and FCF.
4. Scenario model: base/upside/downside cases, sensitivity tables, break-even synergies, maximum premium before dilution, and leverage constraints.

## Product Requirements

- M&A Studio tab with acquirer selection, target filter, assumption controls, ranked recommendations, detail panel, precedents, risks, and data-source disclosure.
- Every recommendation must expose its assumptions and rationale.
- Avoid black-box "AI said so" recommendations.
- Add citation/source fields for every market, filing, news, and precedent datapoint.
- Add a confidence score separated from the recommendation score. Confidence should reflect source completeness, recency, and data quality.
- Add export to PDF/deck later, with a banker-style output: executive summary, transaction overview, strategic rationale, model assumptions, accretion/dilution, precedents, risks, and diligence checklist.

## Current Implementation Scope

Implemented now:

- `/api/ma/universe`: exposes the broad SEC public-company ticker universe, with curated Valence financials where available.
- `/api/ma/recommendations`: ranks acquirer-target combinations and returns modeled deal assumptions, score, rationale, risks, and relevant precedents. Non-curated public companies are enriched on demand with market data during live screens.
- `/api/market-intelligence/deals`: provides official-source fallback deal precedents used by the market terminal and M&A screen.
- `M&A Studio` frontend tab with scenario controls, ranked deal ideas, detailed transaction model view, risks, precedents, and data-path disclosure.

Not yet implemented:

- Licensed private-company database.
- Live GDELT ingestion.
- Full SEC bulk ingestion and normalized financial statement warehouse beyond ticker universe loading.
- Purchase accounting and multi-year forecast model.
- Human-in-the-loop audit workflow for professional sign-off.
