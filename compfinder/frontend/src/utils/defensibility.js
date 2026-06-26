function isValidNumber(value) {
  return value !== null && value !== undefined && !Number.isNaN(Number(value));
}

function safeDivide(numerator, denominator) {
  if (!isValidNumber(numerator) || !isValidNumber(denominator)) return null;
  if (Number(denominator) === 0) return null;
  return Number(numerator) / Number(denominator);
}

function clampScore(value) {
  return Math.max(1, Math.min(10, Math.round(value * 10) / 10));
}

function textIncludes(text, words) {
  const normalized = String(text || "").toLowerCase();
  return words.some((word) => normalized.includes(word));
}

export function buildDefensibilityTest({
  company = {},
  stock = {},
  revenueM,
  operatingIncomeM,
  cashM,
  totalLiabilitiesM,
}) {
  const industryText = `${company.name || ""} ${company.sicDescription || ""} ${
    company.description || ""
  } ${company.sector || ""} ${company.industry || ""}`;
  const marketCapB = isValidNumber(stock.marketCap) ? Number(stock.marketCap) / 1e9 : 0;
  const operatingMargin = safeDivide(operatingIncomeM, revenueM);
  const cashToLiabilities = safeDivide(cashM, totalLiabilitiesM);

  const isEnterprise = textIncludes(industryText, [
    "software",
    "cloud",
    "data",
    "systems",
    "services",
    "security",
    "application",
    "platform",
  ]);
  const isRegulated = textIncludes(industryText, [
    "bank",
    "financial",
    "insurance",
    "health",
    "medical",
    "pharmaceutical",
    "government",
    "defense",
    "security",
  ]);
  const isDataHeavy = textIncludes(industryText, [
    "data",
    "analytics",
    "information",
    "financial",
    "payments",
    "health",
    "security",
    "cloud",
    "database",
  ]);
  const isNetworkBusiness = textIncludes(industryText, [
    "marketplace",
    "payments",
    "exchange",
    "network",
    "social",
    "developer",
    "commerce",
  ]);
  const isDeepTech = textIncludes(industryText, [
    "semiconductor",
    "biotechnology",
    "medical device",
    "infrastructure",
    "security",
    "artificial intelligence",
    "machine learning",
    "database",
  ]);
  const isCrowded = textIncludes(industryText, [
    "software",
    "application",
    "commerce",
    "media",
    "marketing",
    "consulting",
  ]);

  const scaleBoost = marketCapB >= 100 ? 2 : marketCapB >= 25 ? 1.2 : marketCapB >= 5 ? 0.6 : 0;
  const marginBoost = isValidNumber(operatingMargin)
    ? Number(operatingMargin) >= 0.25
      ? 1.5
      : Number(operatingMargin) >= 0.1
        ? 0.8
        : Number(operatingMargin) < 0
          ? -0.8
          : 0
    : 0;

  const categories = [
    {
      name: "Proprietary Data",
      score: clampScore(4.5 + (isDataHeavy ? 2.2 : 0) + scaleBoost),
      note: isDataHeavy
        ? "Likely benefits from customer, transaction, usage, or industry-specific data that can improve AI models."
        : "Needs proof that the company owns unique data competitors cannot easily access.",
    },
    {
      name: "Product Differentiation",
      score: clampScore(5 + (isEnterprise ? 1.2 : 0) + (isDeepTech ? 1.5 : 0) + marginBoost),
      note: isDeepTech
        ? "Specialized technology or performance requirements make the product harder to clone."
        : "The product must show clear speed, accuracy, cost, workflow, or feature advantages versus competitors.",
    },
    {
      name: "Switching Costs",
      score: clampScore(4.8 + (isEnterprise ? 2 : 0) + (isRegulated ? 1 : 0) + scaleBoost * 0.7),
      note: isEnterprise
        ? "Enterprise workflows, integrations, training, and stored customer data can make replacement painful."
        : "Switching-cost strength depends on contract length, implementation work, and workflow dependency.",
    },
    {
      name: "Network Effects",
      score: clampScore(3.5 + (isNetworkBusiness ? 3 : 0) + scaleBoost * 0.6),
      note: isNetworkBusiness
        ? "The product may become more useful as more users, partners, developers, or transactions join the network."
        : "Network effects look limited unless customers, partners, or shared data make each additional user more valuable.",
    },
    {
      name: "Brand and Trust",
      score: clampScore(5 + (isRegulated ? 1.4 : 0) + scaleBoost),
      note: isRegulated
        ? "Trust matters more in regulated, security-sensitive, or high-stakes markets."
        : "Brand strength depends on market recognition and whether customers trust the company for important work.",
    },
    {
      name: "Distribution Advantage",
      score: clampScore(4.8 + scaleBoost + (marketCapB >= 10 ? 1 : 0)),
      note: "Larger companies often have stronger enterprise relationships, sales coverage, partner channels, and installed bases.",
    },
    {
      name: "Technology Moat",
      score: clampScore(4.6 + (isDeepTech ? 2.3 : 0) + (isDataHeavy ? 0.8 : 0)),
      note: isDeepTech
        ? "Specialized engineering, infrastructure, accuracy, or security requirements may be difficult to replicate."
        : "Using AI is not enough; the key question is whether the technology is actually hard to rebuild.",
    },
    {
      name: "Regulatory Barriers",
      score: clampScore(3.8 + (isRegulated ? 3 : 0)),
      note: isRegulated
        ? "Compliance requirements, certifications, approvals, and customer risk controls can slow new entrants."
        : "Regulation does not appear to be the primary moat from the available company profile.",
    },
    {
      name: "Customer Stickiness",
      score: clampScore(5 + (isEnterprise ? 1.7 : 0) + (isRegulated ? 0.9 : 0)),
      note: "Best confirmed with net revenue retention, churn, contract length, repeat purchase, and renewal data.",
    },
    {
      name: "Scale Advantage",
      score: clampScore(4.5 + scaleBoost + (revenueM >= 10000 ? 1.2 : revenueM >= 1000 ? 0.7 : 0)),
      note: "Scale can create more data, lower unit costs, better pricing power, deeper integrations, and a larger R&D budget.",
    },
    {
      name: "Competitive Landscape",
      score: clampScore(6.2 + (isDeepTech || isRegulated ? 1 : 0) - (isCrowded ? 0.8 : 0)),
      note: isCrowded
        ? "The market may be crowded, so buyers should test whether larger competitors can copy the same functionality."
        : "A less crowded or more specialized market can support stronger defensibility.",
    },
    {
      name: "Financial Strength",
      score: clampScore(4.5 + marginBoost + (cashToLiabilities >= 0.4 ? 1 : 0) + scaleBoost * 0.8),
      note: "Strong growth, margins, free cash flow, cash balance, and unit economics give the company room to defend its lead.",
    },
  ];

  const priorityNames = [
    "Proprietary Data",
    "Switching Costs",
    "Customer Stickiness",
    "Product Differentiation",
    "Competitive Landscape",
    "Financial Strength",
  ];
  const weightedCategories = categories.filter((category) => priorityNames.includes(category.name));
  const weightedAverage =
    weightedCategories.reduce((sum, category) => sum + category.score, 0) /
    weightedCategories.length;
  const supportingAverage =
    categories.reduce((sum, category) => sum + category.score, 0) / categories.length;
  const score = clampScore(weightedAverage * 0.68 + supportingAverage * 0.32);
  const copyRisk = score >= 7.6 ? "Low" : score >= 5.7 ? "Medium" : "High";
  const topStrength = [...categories].sort((a, b) => b.score - a.score)[0];
  const keyWeakness = [...categories].sort((a, b) => a.score - b.score)[0];

  return {
    score,
    copyRisk,
    categories,
    topStrength,
    keyWeakness,
    summary:
      copyRisk === "Low"
        ? "AI may copy pieces of the product, but the business appears protected by stronger data, customer lock-in, trust, or scale."
        : copyRisk === "Medium"
          ? "AI could recreate parts of the product, so a buyer should prove the moat before paying a premium."
          : "The visible product may be easier to replicate, so valuation depends heavily on proving real data, retention, or distribution advantages.",
    valuationImpact:
      copyRisk === "Low"
        ? "Premium multiple can be supported if retention, proprietary data, and market leadership are confirmed."
        : copyRisk === "Medium"
          ? "Valuation should be tied to proof of proprietary data, switching costs, and durable customer retention."
          : "Multiple may compress if diligence shows the product is mostly a copyable feature set.",
    questions: [
      "What data does the company own that competitors cannot access?",
      "How hard would it be for customers to switch away?",
      "Which product features could a large platform copy quickly?",
      "Are customers staying because of the product, the workflow, the data, or the brand?",
      "Do retention, churn, contract length, and renewal metrics prove real stickiness?",
      "Does the company have enough margin, cash flow, and scale to keep investing ahead of competitors?",
    ],
  };
}
