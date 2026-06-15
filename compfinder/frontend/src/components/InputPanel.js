import React, { useState } from 'react';
import './InputPanel.css';

const SECTORS = [
  "Enterprise SaaS / Tech",
  "Healthcare / Biotech",
  "Financial Services",
  "Consumer / Retail",
  "Industrials / Manufacturing",
];

const SUB_SECTORS = {
  "Enterprise SaaS / Tech": ["CRM / Sales","IT Service Mgmt","HR / Finance SaaS","Data Analytics","DevOps / Monitoring","Data Platform","Cybersecurity","Identity / Security","Collaboration / Productivity","Cloud Infrastructure","Vertical SaaS","Other SaaS"],
  "Healthcare / Biotech": ["Medical Devices","Digital Health","Diagnostics","Genomics","Health IT","Pharma SaaS","AI Drug Discovery","Specialty Pharma","Other Healthcare"],
  "Financial Services": ["Fintech / Payments","Digital Banking","Online Brokerage","Wealth Management","Insurance Tech","Lending / Credit","Crypto / DeFi","Other Fintech"],
  "Consumer / Retail": ["E-commerce","DTC / Brand","Restaurant / QSR","Fitness / Wellness","Subscription","Resale / Marketplace","Other Consumer"],
  "Industrials / Manufacturing": ["Industrial Tech","Clean Energy","Water / Fluid Systems","Building Materials","Specialty Vehicles","Power Electronics","Smart Grid / IoT","Other Industrials"],
};

const GEOS = ["North America","Europe","Asia Pacific","Latin America","Global"];
const STAGES = ["Early Stage","Growth","Late Stage / Pre-IPO","Mature"];

const Field = ({ label, hint, error, children }) => (
  <div className="field">
    <label>{label}{hint && <span className="hint">{hint}</span>}</label>
    {children}
    {error && <span className="err">{error}</span>}
  </div>
);

export default function InputPanel({ onSubmit, loading }) {
  const [form, setForm] = useState({
    company_name: '', sector: '', sub_sector: '', geo: 'North America', stage: 'Growth',
    revenue_m: '', ebitda_m: '', gross_margin_pct: '', net_income_m: '', rev_growth_pct: '', employees: '', max_comps: 5,
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v, ...(k === 'sector' ? { sub_sector: '' } : {}) }));
    setErrors(e => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.company_name.trim()) e.company_name = 'Required';
    if (!form.sector) e.sector = 'Please select a sector';
    if (!form.revenue_m || Number(form.revenue_m) <= 0) e.revenue_m = 'Enter revenue > 0';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSubmit({
      ...form,
      revenue_m:        parseFloat(form.revenue_m),
      ebitda_m:         form.ebitda_m         ? parseFloat(form.ebitda_m)         : null,
      gross_margin_pct: form.gross_margin_pct  ? parseFloat(form.gross_margin_pct) : null,
      net_income_m:     form.net_income_m      ? parseFloat(form.net_income_m)     : null,
      rev_growth_pct:   form.rev_growth_pct    ? parseFloat(form.rev_growth_pct)   : null,
      employees:        form.employees         ? parseInt(form.employees)           : null,
      max_comps:        parseInt(form.max_comps),
    });
  };

  const subs = SUB_SECTORS[form.sector] || [];

  return (
    <aside className="input-panel">
      <div className="section-label">Company info</div>

      <Field label="Company name" error={errors.company_name}>
        <input placeholder="e.g. Apex Analytics Inc." value={form.company_name} onChange={e => set('company_name', e.target.value)} className={errors.company_name ? 'err-inp' : ''} />
      </Field>

      <Field label="Sector" error={errors.sector}>
        <select value={form.sector} onChange={e => set('sector', e.target.value)} className={errors.sector ? 'err-inp' : ''}>
          <option value="">Select a sector…</option>
          {SECTORS.map(s => <option key={s}>{s}</option>)}
        </select>
      </Field>

      {subs.length > 0 && (
        <Field label="Sub-sector" hint=" (optional)">
          <select value={form.sub_sector} onChange={e => set('sub_sector', e.target.value)}>
            <option value="">Select sub-sector…</option>
            {subs.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
      )}

      <div className="row2">
        <Field label="Geography">
          <select value={form.geo} onChange={e => set('geo', e.target.value)}>
            {GEOS.map(g => <option key={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Stage">
          <select value={form.stage} onChange={e => set('stage', e.target.value)}>
            {STAGES.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      <div className="section-label" style={{ marginTop: '1.25rem' }}>Financials — TTM ($M)</div>

      <Field label="Revenue ($M)" error={errors.revenue_m}>
        <input type="number" placeholder="e.g. 42" min="0" value={form.revenue_m} onChange={e => set('revenue_m', e.target.value)} className={errors.revenue_m ? 'err-inp' : ''} />
      </Field>

      <div className="row2">
        <Field label="EBITDA ($M)" hint=" (opt)">
          <input type="number" placeholder="e.g. 6.3" value={form.ebitda_m} onChange={e => set('ebitda_m', e.target.value)} />
        </Field>
        <Field label="Gross margin %" hint=" (opt)">
          <input type="number" placeholder="e.g. 74" value={form.gross_margin_pct} onChange={e => set('gross_margin_pct', e.target.value)} />
        </Field>
      </div>

      <div className="row2">
        <Field label="Net income ($M)" hint=" (opt)">
          <input type="number" placeholder="e.g. 2.1" value={form.net_income_m} onChange={e => set('net_income_m', e.target.value)} />
        </Field>
        <Field label="Rev growth %" hint=" (opt)">
          <input type="number" placeholder="e.g. 28" value={form.rev_growth_pct} onChange={e => set('rev_growth_pct', e.target.value)} />
        </Field>
      </div>

      <Field label="Employees" hint=" (optional)">
        <input type="number" placeholder="e.g. 210" value={form.employees} onChange={e => set('employees', e.target.value)} />
      </Field>

      <div className="section-label" style={{ marginTop: '1.25rem' }}>Settings</div>

      <Field label="Max comps to return">
        <select value={form.max_comps} onChange={e => set('max_comps', e.target.value)}>
          {[3, 5, 7, 10].map(n => <option key={n} value={n}>{n} companies</option>)}
        </select>
      </Field>

      <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
        {loading ? '⏳  Finding comps…' : '🔍  Find comps & value'}
      </button>
    </aside>
  );
}