import React, { useMemo, useState } from "react";
import { apiUrl } from "../api";
import { buildDefensibilityTest } from "../utils/defensibility";
import "./DefensibilityStudio.css";

const starterProfile = {
  name: "WorkflowCloud",
  industry:
    "Enterprise software platform with workflow automation, customer data, integrations, analytics, and compliance controls.",
  revenueM: 850,
  operatingIncomeM: 145,
  cashM: 420,
  liabilitiesM: 680,
  marketCapB: 9.5,
};

const factorGuides = {
  "Proprietary Data": {
    meaning: "Does the company own unique data that competitors cannot easily get?",
    high: "High score means the product may improve with customer behavior, transactions, usage history, or industry-specific data.",
    low: "Low score means the product may rely mostly on public data or generic workflows.",
    ask: "What data is exclusive, how long has it been collected, and does it make the product better over time?",
  },
  "Product Differentiation": {
    meaning: "Is the product meaningfully better, faster, cheaper, more accurate, or more useful than alternatives?",
    high: "High score means customers have a real product reason to choose this company.",
    low: "Low score means the product may look like a feature that competitors can copy.",
    ask: "Which feature would customers miss most if the product disappeared?",
  },
  "Switching Costs": {
    meaning: "How painful would it be for customers to leave?",
    high: "High score means the product is embedded in workflows, data, training, contracts, or integrations.",
    low: "Low score means a customer could replace it without much cost or disruption.",
    ask: "What breaks, slows down, or becomes expensive if a customer switches?",
  },
  "Network Effects": {
    meaning: "Does the product become more valuable as more users, partners, or transactions join?",
    high: "High score means the user base itself becomes hard to copy.",
    low: "Low score means each customer mostly receives standalone value.",
    ask: "Does each new user make the product better for existing users?",
  },
  "Brand and Trust": {
    meaning: "Do customers trust this company more than cheaper or newer alternatives?",
    high: "High score matters most in finance, healthcare, cybersecurity, legal, insurance, and enterprise software.",
    low: "Low score means customers may switch if a cheaper or bundled option appears.",
    ask: "Would customers pay more because this specific company is trusted?",
  },
  "Distribution Advantage": {
    meaning: "How strong is the company’s path to customers?",
    high: "High score means strong sales channels, partnerships, app stores, referrals, or installed base.",
    low: "Low score means the company may have a good product but weak customer access.",
    ask: "Can competitors reach the same customers just as easily?",
  },
  "Technology Moat": {
    meaning: "Is the technology actually hard to rebuild?",
    high: "High score means patents, specialized engineering, infrastructure, algorithms, accuracy, or performance are difficult to copy.",
    low: "Low score means the company uses AI, but not in a way that is uniquely defensible.",
    ask: "Could a strong engineering team rebuild the core product in a few months?",
  },
  "Regulatory Barriers": {
    meaning: "Does regulation make it harder for new competitors to enter?",
    high: "High score means licenses, security certifications, HIPAA, SOC 2, FedRAMP, approvals, or privacy rules create friction.",
    low: "Low score means regulation is not a major barrier.",
    ask: "What certifications or approvals would a new competitor need before selling?",
  },
  "Customer Stickiness": {
    meaning: "Do customers stay and expand over time?",
    high: "High score means strong retention, renewals, contract length, repeat purchases, or net revenue retention.",
    low: "Low score means customers may churn when cheaper or bundled tools appear.",
    ask: "What are churn, renewal rate, gross retention, and net revenue retention?",
  },
  "Scale Advantage": {
    meaning: "Does the company get stronger as it gets bigger?",
    high: "High score means more data, lower costs, better pricing, more integrations, and larger R&D budget.",
    low: "Low score means growth does not create much extra advantage.",
    ask: "What advantage does the company have at $1B revenue that it did not have at $100M?",
  },
  "Competitive Landscape": {
    meaning: "How crowded and copyable is the market?",
    high: "High score means fewer credible competitors or harder-to-copy positioning.",
    low: "Low score means many similar companies or large platforms can copy the product.",
    ask: "Who are the strongest competitors, and can they bundle this feature for free?",
  },
  "Financial Strength": {
    meaning: "Can the company afford to defend its position?",
    high: "High score means strong growth, margins, cash flow, balance sheet, and unit economics.",
    low: "Low score means the company may struggle to keep investing against larger rivals.",
    ask: "Does the company have enough margin and cash to keep improving the product?",
  },
};

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function toMillions(value) {
  const parsed = numberOrNull(value);
  if (parsed === null) return "";
  return parsed / 1e6;
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="defense-field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default function DefensibilityStudio() {
  const [mode, setMode] = useState("existing");
  const [profile, setProfile] = useState(starterProfile);
  const [selectedFactorName, setSelectedFactorName] = useState("Proprietary Data");
  const [companyQuery, setCompanyQuery] = useState("salesforce");
  const [companyResults, setCompanyResults] = useState([]);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);

  const updateProfile = (key, value) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const applyCompanyToProfile = async (company) => {
    setSelectedCompany(company);
    setCompanyError("");
    setProfile({
      name: company.name || company.ticker || "Company",
      industry: `${company.name || company.ticker} is a ${company.sub || "public company"} in ${
        company.sector || "the public markets"
      }. Source: ${company.source || "Valence public-company universe"}.`,
      revenueM: "",
      operatingIncomeM: "",
      cashM: "",
      liabilitiesM: "",
      marketCapB: company.market_cap_b || company.ev_b || "",
    });

    try {
      const response = await fetch(apiUrl(`/api/company/${company.ticker}`));
      if (!response.ok) return;
      const payload = await response.json();
      const detailCompany = payload.company || {};
      const financials = payload.financials || {};
      const stock = payload.stock || {};

      setProfile({
        name: detailCompany.name || company.name || company.ticker,
        industry:
          detailCompany.sicDescription ||
          `${company.name || company.ticker} is a ${company.sub || "public company"} in ${
            company.sector || "the public markets"
          }.`,
        revenueM: toMillions(financials.revenue?.value),
        operatingIncomeM: toMillions(financials.operatingIncome?.value),
        cashM: toMillions(financials.cash?.value),
        liabilitiesM: toMillions(financials.totalLiabilities?.value),
        marketCapB: numberOrNull(stock.marketCap) ? Number(stock.marketCap) / 1e9 : company.market_cap_b || "",
      });
    } catch {
      // Keep the universe-level profile when detailed company data is unavailable.
    }
  };

  const searchCompanies = async () => {
    setCompanyLoading(true);
    setCompanyError("");

    try {
      const response = await fetch(
        apiUrl(`/api/ma/universe?limit=24&search=${encodeURIComponent(companyQuery)}`)
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || "Could not search companies.");
      }
      setCompanyResults(payload.companies || []);
      if (!(payload.companies || []).length) {
        setCompanyError("No matching public companies found in the Valence universe.");
      }
    } catch (err) {
      setCompanyResults([]);
      setCompanyError(err.message || "Could not search the company universe.");
    } finally {
      setCompanyLoading(false);
    }
  };

  const defensibility = useMemo(
    () =>
      buildDefensibilityTest({
        company: {
          name: profile.name,
          sicDescription: profile.industry,
          description: profile.industry,
          sector: profile.industry,
        },
        stock: {
          marketCap: (numberOrNull(profile.marketCapB) || 0) * 1e9,
        },
        revenueM: numberOrNull(profile.revenueM),
        operatingIncomeM: numberOrNull(profile.operatingIncomeM),
        cashM: numberOrNull(profile.cashM),
        totalLiabilitiesM: numberOrNull(profile.liabilitiesM),
      }),
    [profile]
  );

  const priorityFactors = defensibility.categories.filter((category) =>
    [
      "Proprietary Data",
      "Switching Costs",
      "Customer Stickiness",
      "Product Differentiation",
      "Competitive Landscape",
      "Financial Strength",
    ].includes(category.name)
  );
  const selectedFactor =
    defensibility.categories.find((category) => category.name === selectedFactorName) ||
    defensibility.categories[0];
  const selectedGuide = factorGuides[selectedFactor.name] || {
    meaning: selectedFactor.note,
    high: "A higher score means this factor is more likely to protect the company from AI copy risk.",
    low: "A lower score means buyers should verify whether the moat is real.",
    ask: "What evidence proves this factor is durable?",
  };

  return (
    <section className="defense-studio">
      <div className="defense-studio-header">
        <span>AI Defensibility Studio</span>
        <h1>Can AI copy this company?</h1>
        <p>
          Score whether a product is protected by real data, customer lock-in,
          retention, differentiation, distribution, regulation, scale, and financial strength.
        </p>
      </div>

      <div className="defense-layout">
        <aside className="defense-input-panel">
          <div className="defense-panel-heading">
            <span>Company Profile</span>
            <strong>Test the moat</strong>
            <p>
              Search existing public companies from Valence&apos;s universe, or switch
              to custom mode for private or random companies.
            </p>
          </div>

          <div className="defense-mode-tabs" aria-label="Defensibility input mode">
            <button
              type="button"
              className={mode === "existing" ? "active" : ""}
              onClick={() => setMode("existing")}
            >
              Existing Company
            </button>
            <button
              type="button"
              className={mode === "custom" ? "active" : ""}
              onClick={() => {
                setMode("custom");
                setSelectedCompany(null);
              }}
            >
              Custom Company
            </button>
          </div>

          {mode === "existing" && (
            <div className="defense-company-search">
              <label className="defense-field">
                <span>Search Valence Universe</span>
                <input
                  type="search"
                  value={companyQuery}
                  placeholder="Try CRM, Salesforce, Tesla, Microsoft..."
                  onChange={(event) => setCompanyQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      searchCompanies();
                    }
                  }}
                />
              </label>
              <button type="button" onClick={searchCompanies} disabled={companyLoading}>
                {companyLoading ? "Searching..." : "Search Companies"}
              </button>

              {companyError && <p className="defense-search-error">{companyError}</p>}

              {companyResults.length > 0 && (
                <div className="defense-company-results">
                  {companyResults.map((company) => (
                    <button
                      type="button"
                      key={company.ticker}
                      className={selectedCompany?.ticker === company.ticker ? "selected" : ""}
                      onClick={() => applyCompanyToProfile(company)}
                    >
                      <strong>{company.ticker}</strong>
                      <span>{company.name}</span>
                      <small>{company.sub || company.sector || "Public company"}</small>
                    </button>
                  ))}
                </div>
              )}

              {selectedCompany && (
                <div className="defense-selected-company">
                  <span>Selected from universe</span>
                  <strong>
                    {selectedCompany.name} ({selectedCompany.ticker})
                  </strong>
                  <p>{selectedCompany.source || "Valence public-company universe"}</p>
                </div>
              )}
            </div>
          )}

          {mode === "custom" && (
            <p className="defense-mode-note">
              Use this for private companies, startups, or companies not in the
              public-company database.
            </p>
          )}

          <Field
            label="Company Name"
            value={profile.name}
            placeholder="Example: Salesforce"
            onChange={(value) => updateProfile("name", value)}
          />

          <label className="defense-field">
            <span>Product / Industry Description</span>
            <textarea
              value={profile.industry}
              placeholder="Describe the product, market, data, workflows, customers, regulation, and competitors."
              onChange={(event) => updateProfile("industry", event.target.value)}
            />
          </label>

          <div className="defense-field-grid">
            <Field
              label="Revenue ($M)"
              type="number"
              value={profile.revenueM}
              onChange={(value) => updateProfile("revenueM", value)}
            />
            <Field
              label="Operating Income ($M)"
              type="number"
              value={profile.operatingIncomeM}
              onChange={(value) => updateProfile("operatingIncomeM", value)}
            />
            <Field
              label="Cash ($M)"
              type="number"
              value={profile.cashM}
              onChange={(value) => updateProfile("cashM", value)}
            />
            <Field
              label="Liabilities ($M)"
              type="number"
              value={profile.liabilitiesM}
              onChange={(value) => updateProfile("liabilitiesM", value)}
            />
            <Field
              label="Market Cap ($B)"
              type="number"
              value={profile.marketCapB}
              onChange={(value) => updateProfile("marketCapB", value)}
            />
          </div>
        </aside>

        <div className="defense-output-panel">
          <div className="defense-score-strip">
            <div>
              <span>AI Copy Risk</span>
              <strong className={`risk-${defensibility.copyRisk.toLowerCase()}`}>
                {defensibility.copyRisk}
              </strong>
            </div>
            <div>
              <span>Defensibility Score</span>
              <strong>{defensibility.score.toFixed(1)} / 10</strong>
            </div>
            <p>{defensibility.summary}</p>
          </div>

          <div className="defense-readout-grid">
            <article>
              <span>Strongest moat</span>
              <strong>{defensibility.topStrength.name}</strong>
              <p>{defensibility.topStrength.note}</p>
            </article>
            <article>
              <span>Weakest point</span>
              <strong>{defensibility.keyWeakness.name}</strong>
              <p>{defensibility.keyWeakness.note}</p>
            </article>
            <article>
              <span>Valuation read</span>
              <strong>{defensibility.copyRisk} AI risk</strong>
              <p>{defensibility.valuationImpact}</p>
            </article>
          </div>

          <div className="defense-priority-table">
            <div className="defense-table-header">
              <span>Priority Factors</span>
              <strong>What buyers should care about first</strong>
            </div>
            {priorityFactors.map((factor) => (
              <button
                type="button"
                className={`defense-factor-row ${
                  selectedFactor.name === factor.name ? "selected" : ""
                }`}
                key={factor.name}
                onClick={() => setSelectedFactorName(factor.name)}
              >
                <div>
                  <strong>{factor.name}</strong>
                  <p>{factor.note}</p>
                </div>
                <span>{factor.score.toFixed(1)}</span>
              </button>
            ))}
          </div>

          <div className="defense-factor-detail">
            <div>
              <span>Clicked Factor</span>
              <strong>
                {selectedFactor.name} - {selectedFactor.score.toFixed(1)} / 10
              </strong>
            </div>
            <p>{selectedGuide.meaning}</p>
            <div className="defense-detail-grid">
              <article>
                <span>Higher score means</span>
                <p>{selectedGuide.high}</p>
              </article>
              <article>
                <span>Lower score means</span>
                <p>{selectedGuide.low}</p>
              </article>
              <article>
                <span>Ask in diligence</span>
                <p>{selectedGuide.ask}</p>
              </article>
            </div>
          </div>

          <div className="defense-factor-grid">
            {defensibility.categories.map((factor) => (
              <button
                type="button"
                key={factor.name}
                className={selectedFactor.name === factor.name ? "selected" : ""}
                onClick={() => setSelectedFactorName(factor.name)}
              >
                <div>
                  <strong>{factor.name}</strong>
                  <span>{factor.score.toFixed(1)}</span>
                </div>
                <div className="defense-meter" aria-hidden="true">
                  <i style={{ width: `${factor.score * 10}%` }} />
                </div>
              </button>
            ))}
          </div>

          <div className="defense-questions">
            <h2>Buyer Diligence Questions</h2>
            {defensibility.questions.map((question) => (
              <p key={question}>{question}</p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
