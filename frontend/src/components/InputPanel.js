import React, { useState } from 'react';
import './InputPanel.css';

const SECTORS = [
  "AI / Machine Learning",
  "Enterprise Software / SaaS",
  "Cloud / Data Infrastructure",
  "Cybersecurity",
  "Developer Tools / DevOps",
  "Data Analytics / Observability",
  "FinTech / Payments",
  "E-Commerce / Marketplaces",
  "Consumer Internet / Digital Ads",
  "Media / Communications",
  "Semiconductors / AI Hardware",
  "IT Services / Consulting",
  "Healthcare Technology",
  "Life Sciences Software",
  "HR / Payroll / Workforce Software",
  "Vertical Software",
  "Consumer / SMB Software",
  "Real Estate / PropTech",
  "Education Technology",
  "Energy / Climate Tech",
];

const SUB_SECTORS = {
  "AI / Machine Learning": [
    "Foundation Models / LLMs",
    "Generative AI Applications",
    "AI Infrastructure",
    "AI Agents / Automation",
    "Computer Vision",
    "AI Data / Labeling",
    "Enterprise AI",
    "Other AI / ML",
  ],
  "Enterprise Software / SaaS": [
    "CRM / Sales",
    "ERP / Finance",
    "Workflow Automation",
    "Productivity / Collaboration",
    "Enterprise Applications",
    "Office of the CFO",
    "Other Enterprise SaaS",
  ],
  "Cloud / Data Infrastructure": [
    "Data Warehousing",
    "Database",
    "Cloud Infrastructure",
    "API Infrastructure",
    "Data Streaming",
    "Edge / Network Infrastructure",
    "Other Cloud / Data Infra",
  ],
  "Cybersecurity": [
    "Endpoint Security",
    "Identity / Access Management",
    "Zero Trust",
    "Cloud Security",
    "Network Security",
    "Vulnerability Management",
    "Security Operations",
    "Other Cybersecurity",
  ],
  "Developer Tools / DevOps": [
    "Source Code / Git",
    "CI/CD",
    "DevOps Automation",
    "Testing / QA",
    "Application Performance",
    "Engineering Workflow",
    "Other Developer Tools",
  ],
  "Data Analytics / Observability": [
    "Observability / Monitoring",
    "Business Intelligence",
    "Log Analytics",
    "Data Analytics",
    "Search / Indexing",
    "Data Operations",
    "Other Analytics",
  ],
  "FinTech / Payments": [
    "Payments",
    "Digital Banking",
    "Lending / Credit",
    "Consumer Finance",
    "Merchant Services",
    "Wealth / Brokerage",
    "Insurance Tech",
    "Other FinTech",
  ],
  "E-Commerce / Marketplaces": [
    "E-Commerce Enablement",
    "Online Marketplace",
    "Food / Local Delivery",
    "Travel Marketplace",
    "DTC / Consumer Brand",
    "Retail Platform",
    "Other E-Commerce",
  ],
  "Consumer Internet / Digital Ads": [
    "Social Media",
    "Digital Advertising",
    "Search / Discovery",
    "Creator Economy",
    "Dating / Social Apps",
    "Streaming / Subscription",
    "Other Consumer Internet",
  ],
  "Media / Communications": [
    "Video Communications",
    "Contact Center",
    "Messaging / CPaaS",
    "Streaming Media",
    "Entertainment",
    "Traditional Media",
    "Other Media / Comms",
  ],
  "Semiconductors / AI Hardware": [
    "GPU / AI Accelerators",
    "CPU / General Compute",
    "Networking Chips",
    "Memory",
    "Semiconductor Equipment",
    "Foundry",
    "Other Semiconductors",
  ],
  "IT Services / Consulting": [
    "Digital Transformation",
    "IT Consulting",
    "Systems Integration",
    "Outsourcing",
    "Managed Services",
    "Cloud Migration",
    "Other IT Services",
  ],
  "Healthcare Technology": [
    "Digital Health",
    "Telehealth",
    "Provider Software",
    "Payer / Insurance Tech",
    "Healthcare Marketplace",
    "Pharmacy / Consumer Health",
    "Other Health Tech",
  ],
  "Life Sciences Software": [
    "Clinical Trial Software",
    "Pharma / Biotech Software",
    "Lab Software",
    "Drug Development",
    "Life Sciences Data",
    "Research Tools",
    "Other Life Sciences",
  ],
  "HR / Payroll / Workforce Software": [
    "Payroll",
    "HCM / HRIS",
    "Benefits",
    "Workforce Management",
    "Recruiting / Talent",
    "Employee Engagement",
    "Other HR Software",
  ],
  "Vertical Software": [
    "Restaurant Software",
    "Real Estate Software",
    "Financial Services Software",
    "Legal Software",
    "Construction Software",
    "Healthcare Vertical SaaS",
    "Other Vertical SaaS",
  ],
  "Consumer / SMB Software": [
    "Small Business Software",
    "Productivity",
    "Document Management",
    "Accounting / Invoicing",
    "Collaboration",
    "Storage / File Sharing",
    "Other Consumer / SMB Software",
  ],
  "Real Estate / PropTech": [
    "Residential Real Estate",
    "Commercial Real Estate",
    "Property Management",
    "Brokerage / Listings",
    "iBuying",
    "Real Estate Data",
    "Other PropTech",
  ],
  "Education Technology": [
    "Online Learning",
    "Language Learning",
    "Higher Education",
    "K-12",
    "Workforce Learning",
    "Tutoring / Test Prep",
    "Other EdTech",
  ],
  "Energy / Climate Tech": [
    "Solar",
    "Renewable Energy",
    "EV / Mobility",
    "Battery / Storage",
    "Hydrogen / Fuel Cell",
    "Utilities / Grid",
    "Other Climate Tech",
  ],
};

const GEOS = ["North America", "Europe", "Asia Pacific", "Latin America", "Global"];

const STAGES = [
  "Early Stage",
  "Growth",
  "Late Stage / Pre-IPO",
  "Mature",
];

const REVENUE_MODELS = [
  "Subscription / SaaS",
  "Usage-Based",
  "Transaction / Take Rate",
  "Advertising",
  "Marketplace Commission",
  "Services / Consulting",
  "Hardware Sales",
  "Licensing",
  "Mixed",
];

const CUSTOMER_TYPES = [
  "Enterprise",
  "Mid-Market",
  "SMB",
  "Consumer",
  "Government",
  "Developers",
  "Healthcare Providers",
  "Financial Institutions",
  "Mixed",
];

const Field = ({ label, hint, error, children }) => (
  <div className="field">
    <label>
      {label}
      {hint && <span className="hint">{hint}</span>}
    </label>
    {children}
    {error && <span className="err">{error}</span>}
  </div>
);

export default function InputPanel({ onSubmit, loading }) {
  const [form, setForm] = useState({
    company_name: "",
    sector: "",
    sub_sector: "",
    geo: "North America",
    stage: "Growth",

    business_description: "",
    revenue_model: "",
    customer_type: "",

    revenue_m: "",
    ebitda_m: "",
    gross_margin_pct: "",
    net_income_m: "",
    rev_growth_pct: "",
    employees: "",

    arr_m: "",
    net_revenue_retention_pct: "",
    free_cash_flow_margin_pct: "",
    sales_efficiency: "",
    cac_payback_months: "",

    max_comps: 8,
    include_historical_comps: false,
  });

  const [errors, setErrors] = useState({});

  const set = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "sector" ? { sub_sector: "" } : {}),
    }));

    setErrors((prev) => ({
      ...prev,
      [key]: undefined,
    }));
  };

  const validate = () => {
    const e = {};

    if (!form.company_name.trim()) {
      e.company_name = "Required";
    }

    if (!form.sector) {
      e.sector = "Please select a sector";
    }

    if (!form.revenue_m || Number(form.revenue_m) <= 0) {
      e.revenue_m = "Enter revenue > 0";
    }

    return e;
  };

  const toFloatOrNull = (value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    const num = parseFloat(value);
    return Number.isNaN(num) ? null : num;
  };

  const toIntOrNull = (value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    const num = parseInt(value, 10);
    return Number.isNaN(num) ? null : num;
  };

  const handleSubmit = () => {
    const e = validate();

    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    onSubmit({
      ...form,

      revenue_m: toFloatOrNull(form.revenue_m),
      ebitda_m: toFloatOrNull(form.ebitda_m),
      gross_margin_pct: toFloatOrNull(form.gross_margin_pct),
      net_income_m: toFloatOrNull(form.net_income_m),
      rev_growth_pct: toFloatOrNull(form.rev_growth_pct),
      employees: toIntOrNull(form.employees),

      arr_m: toFloatOrNull(form.arr_m),
      net_revenue_retention_pct: toFloatOrNull(form.net_revenue_retention_pct),
      free_cash_flow_margin_pct: toFloatOrNull(form.free_cash_flow_margin_pct),
      sales_efficiency: toFloatOrNull(form.sales_efficiency),
      cac_payback_months: toFloatOrNull(form.cac_payback_months),

      max_comps: parseInt(form.max_comps, 10),

      // Sending both names keeps it compatible with either backend style.
      include_historical_comps: !!form.include_historical_comps,
      includeHistoricalComps: !!form.include_historical_comps,
    });
  };

  const subs = SUB_SECTORS[form.sector] || [];

  return (
    <aside className="input-panel">
      <div className="section-label">Company info</div>

      <Field label="Company name" error={errors.company_name}>
        <input
          placeholder="e.g. Anthropic"
          value={form.company_name}
          onChange={(e) => set("company_name", e.target.value)}
          className={errors.company_name ? "err-inp" : ""}
        />
      </Field>

      <Field label="Sector" error={errors.sector}>
        <select
          value={form.sector}
          onChange={(e) => set("sector", e.target.value)}
          className={errors.sector ? "err-inp" : ""}
        >
          <option value="">Select a sector…</option>
          {SECTORS.map((sector) => (
            <option key={sector} value={sector}>
              {sector}
            </option>
          ))}
        </select>
      </Field>

      {subs.length > 0 && (
        <Field label="Sub-sector" hint=" (optional)">
          <select
            value={form.sub_sector}
            onChange={(e) => set("sub_sector", e.target.value)}
          >
            <option value="">Select sub-sector…</option>
            {subs.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Business description" hint=" (optional but helps matching)">
        <textarea
          placeholder="e.g. Builds frontier AI models and enterprise AI assistants for businesses."
          value={form.business_description}
          onChange={(e) => set("business_description", e.target.value)}
          rows={3}
        />
      </Field>

      <div className="row2">
        <Field label="Revenue model" hint=" (optional)">
          <select
            value={form.revenue_model}
            onChange={(e) => set("revenue_model", e.target.value)}
          >
            <option value="">Select model…</option>
            {REVENUE_MODELS.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Customer type" hint=" (optional)">
          <select
            value={form.customer_type}
            onChange={(e) => set("customer_type", e.target.value)}
          >
            <option value="">Select type…</option>
            {CUSTOMER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="row2">
        <Field label="Geography">
          <select value={form.geo} onChange={(e) => set("geo", e.target.value)}>
            {GEOS.map((geo) => (
              <option key={geo} value={geo}>
                {geo}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Stage">
          <select
            value={form.stage}
            onChange={(e) => set("stage", e.target.value)}
          >
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="section-label" style={{ marginTop: "1.25rem" }}>
        Financials — TTM ($M)
      </div>

      <Field label="Revenue ($M)" error={errors.revenue_m}>
        <input
          type="number"
          placeholder="e.g. 500"
          min="0"
          value={form.revenue_m}
          onChange={(e) => set("revenue_m", e.target.value)}
          className={errors.revenue_m ? "err-inp" : ""}
        />
      </Field>

      <div className="row2">
        <Field label="EBITDA ($M)" hint=" (optional)">
          <input
            type="number"
            placeholder="e.g. -150"
            value={form.ebitda_m}
            onChange={(e) => set("ebitda_m", e.target.value)}
          />
        </Field>

        <Field label="Gross margin %" hint=" (optional)">
          <input
            type="number"
            placeholder="e.g. 78"
            value={form.gross_margin_pct}
            onChange={(e) => set("gross_margin_pct", e.target.value)}
          />
        </Field>
      </div>

      <div className="row2">
        <Field label="Net income ($M)" hint=" (optional)">
          <input
            type="number"
            placeholder="e.g. -220"
            value={form.net_income_m}
            onChange={(e) => set("net_income_m", e.target.value)}
          />
        </Field>

        <Field label="Rev growth %" hint=" (optional)">
          <input
            type="number"
            placeholder="e.g. 85"
            value={form.rev_growth_pct}
            onChange={(e) => set("rev_growth_pct", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Employees" hint=" (optional)">
        <input
          type="number"
          placeholder="e.g. 1200"
          value={form.employees}
          onChange={(e) => set("employees", e.target.value)}
        />
      </Field>

      <div className="section-label" style={{ marginTop: "1.25rem" }}>
        SaaS / Software metrics — optional
      </div>

      <div className="row2">
        <Field label="ARR ($M)" hint=" (optional)">
          <input
            type="number"
            placeholder="e.g. 450"
            value={form.arr_m}
            onChange={(e) => set("arr_m", e.target.value)}
          />
        </Field>

        <Field label="NRR %" hint=" (optional)">
          <input
            type="number"
            placeholder="e.g. 125"
            value={form.net_revenue_retention_pct}
            onChange={(e) => set("net_revenue_retention_pct", e.target.value)}
          />
        </Field>
      </div>

      <div className="row2">
        <Field label="FCF margin %" hint=" (optional)">
          <input
            type="number"
            placeholder="e.g. 12"
            value={form.free_cash_flow_margin_pct}
            onChange={(e) => set("free_cash_flow_margin_pct", e.target.value)}
          />
        </Field>

        <Field label="Sales efficiency" hint=" (optional)">
          <input
            type="number"
            placeholder="e.g. 0.9"
            value={form.sales_efficiency}
            onChange={(e) => set("sales_efficiency", e.target.value)}
          />
        </Field>
      </div>

      <Field label="CAC payback months" hint=" (optional)">
        <input
          type="number"
          placeholder="e.g. 14"
          value={form.cac_payback_months}
          onChange={(e) => set("cac_payback_months", e.target.value)}
        />
      </Field>

      <div className="section-label" style={{ marginTop: "1.25rem" }}>
        Settings
      </div>

      <Field label="Max comps to return">
        <select
          value={form.max_comps}
          onChange={(e) => set("max_comps", e.target.value)}
        >
          {[5, 8, 10, 13, 15].map((num) => (
            <option key={num} value={num}>
              {num} companies
            </option>
          ))}
        </select>
      </Field>

      <label className="field" style={{ display: "flex", gap: "0.6rem" }}>
        <input
          type="checkbox"
          checked={form.include_historical_comps}
          onChange={(e) => set("include_historical_comps", e.target.checked)}
          style={{ width: "auto" }}
        />
        <span>
          Include historical / acquired comps
          <span className="hint"> (optional)</span>
        </span>
      </label>

      <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
        {loading ? "⏳  Finding comps…" : "🔍  Find comps & value"}
      </button>
    </aside>
  );
}