import os
import math
import html
import tempfile
from datetime import datetime
from statistics import mean, median

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    Image,
)


# Valence terminal-inspired report palette.
INK = colors.HexColor("#0F172A")
NAVY = colors.HexColor("#020617")
PANEL = colors.HexColor("#0B1120")
PANEL_SOFT = colors.HexColor("#111827")
CYAN = colors.HexColor("#22D3EE")
CYAN_DARK = colors.HexColor("#0891B2")
CYAN_SOFT = colors.HexColor("#ECFEFF")
PURPLE = colors.HexColor("#4C1D95")
PURPLE_DARK = colors.HexColor("#2B124C")
PURPLE_SOFT = colors.HexColor("#7C3AED")
SLATE = colors.HexColor("#334155")
GRAY = colors.HexColor("#64748B")
MUTED = colors.HexColor("#94A3B8")
LIGHT_GRAY = colors.HexColor("#F8FAFC")
BORDER = colors.HexColor("#CBD5E1")
BORDER_SOFT = colors.HexColor("#E2E8F0")
WARNING_BG = colors.HexColor("#FFF7D6")
WARNING_BORDER = colors.HexColor("#F59E0B")
DARK = INK

CHART_CYAN = "#0891B2"
CHART_CYAN_SOFT = "#67E8F9"
CHART_PURPLE = "#7C3AED"
CHART_PURPLE_DARK = "#4C1D95"
CHART_DARK = "#0F172A"
CHART_GRID = "#E2E8F0"
PAGE_WIDTH = 7.1 * inch


def safe_get(d, *keys, default=None):
    if not isinstance(d, dict):
        return default

    for key in keys:
        val = d.get(key)
        if val not in [None, "", "N/A", "NA", "-", "—"]:
            return val

    return default


def to_float(value):
    if value in [None, "", "N/A", "NA", "-", "—"]:
        return None

    if isinstance(value, (int, float)):
        if math.isnan(value) or math.isinf(value):
            return None
        return float(value)

    if isinstance(value, str):
        s = value.strip()
        s = s.replace("$", "").replace(",", "").replace("x", "").replace("X", "")
        s = s.replace("%", "").strip()

        multiplier = 1
        if s.lower().endswith("b"):
            multiplier = 1000
            s = s[:-1]
        elif s.lower().endswith("m"):
            multiplier = 1
            s = s[:-1]

        try:
            return float(s) * multiplier
        except ValueError:
            return None

    return None


def normalize_money_to_millions(value):
    n = to_float(value)
    if n is None:
        return None

    if abs(n) > 100000:
        return n / 1_000_000

    return n


def normalize_percent(value):
    n = to_float(value)
    if n is None:
        return None

    if abs(n) <= 1:
        return n * 100

    return n


def fmt_m(value):
    n = normalize_money_to_millions(value)
    if n is None:
        return "N/A"
    return f"${n:,.0f}M"


def fmt_b(value_m):
    n = normalize_money_to_millions(value_m)
    if n is None:
        return "N/A"
    return f"${n / 1000:,.2f}B"


def fmt_x(value):
    n = to_float(value)
    if n is None:
        return "N/A"
    return f"{n:.1f}x"


def fmt_pct(value):
    n = normalize_percent(value)
    if n is None:
        return "N/A"
    return f"{n:.1f}%"


def fmt_plain(value):
    if value in [None, "", "N/A", "NA"]:
        return "Not provided"
    return str(value)


def company_name(c):
    return safe_get(c, "companyName", "name", "company", "Company", default="Company")


def ticker(c):
    return safe_get(c, "ticker", "symbol", "Ticker", "Symbol", default="N/A")


def revenue_m(c):
    return normalize_money_to_millions(
        safe_get(
            c,
            "revenue",
            "revenue_m",
            "revenueM",
            "totalRevenue",
            "total_revenue",
            "sales",
            "Revenue",
        )
    )


def enterprise_value_m(c):
    return normalize_money_to_millions(
        safe_get(
            c,
            "enterpriseValue",
            "enterprise_value",
            "ev",
            "EV",
            "marketEnterpriseValue",
        )
    )


def ebitda_m(c):
    direct = normalize_money_to_millions(
        safe_get(c, "ebitda", "EBITDA", "adjustedEbitda", "adjusted_ebitda")
    )

    if direct is not None:
        return direct

    margin = ebitda_margin_pct(c)
    rev = revenue_m(c)

    if margin is not None and rev is not None:
        return rev * margin / 100

    return None


def ev_revenue(c):
    direct = to_float(
        safe_get(c, "evRevenue", "ev_revenue", "evToRevenue", "EVRevenue", "ev_rev")
    )

    if direct is not None:
        return direct

    ev = enterprise_value_m(c)
    rev = revenue_m(c)

    if ev is not None and rev not in [None, 0]:
        return ev / rev

    return None


def ev_ebitda(c):
    direct = to_float(
        safe_get(c, "evEbitda", "ev_ebitda", "evToEbitda", "EVEBITDA")
    )

    if direct is not None:
        return direct

    ev = enterprise_value_m(c)
    ebitda = ebitda_m(c)

    if ev is not None and ebitda not in [None, 0]:
        return ev / ebitda

    return None


def ebitda_margin_pct(c):
    return normalize_percent(
        safe_get(c, "ebitdaMargin", "ebitda_margin", "EBITDAMargin")
    )


def gross_margin_pct(c):
    return normalize_percent(
        safe_get(c, "grossMargin", "gross_margin", "GrossMargin")
    )


def revenue_growth_pct(c):
    return normalize_percent(
        safe_get(
            c,
            "revenueGrowth",
            "revenue_growth",
            "growth",
            "RevenueGrowth",
            "yoyGrowth",
        )
    )


def fcf_margin_pct(c):
    return normalize_percent(
        safe_get(c, "fcfMargin", "freeCashFlowMargin", "free_cash_flow_margin")
    )


def rule_of_40(c):
    direct = normalize_percent(safe_get(c, "ruleOf40", "rule_of_40"))

    if direct is not None:
        return direct

    growth = revenue_growth_pct(c)
    fcf = fcf_margin_pct(c)

    if growth is not None and fcf is not None:
        return growth + fcf

    return None


def valid_number(x):
    return (
        x is not None
        and isinstance(x, (int, float))
        and not math.isnan(x)
        and not math.isinf(x)
    )


def percentile(values, pct):
    clean = sorted([float(v) for v in values if valid_number(v)])

    if not clean:
        return None

    if len(clean) == 1:
        return clean[0]

    k = (len(clean) - 1) * pct / 100
    f = math.floor(k)
    c = math.ceil(k)

    if f == c:
        return clean[int(k)]

    return clean[f] * (c - k) + clean[c] * (k - f)


def peer_stats(values):
    clean = [float(v) for v in values if valid_number(v)]

    if not clean:
        return {
            "mean": None,
            "median": None,
            "min": None,
            "max": None,
            "p25": None,
            "p75": None,
        }

    return {
        "mean": mean(clean),
        "median": median(clean),
        "min": min(clean),
        "max": max(clean),
        "p25": percentile(clean, 25),
        "p75": percentile(clean, 75),
    }


def esc(text):
    return html.escape(str(text))


def make_para(text, style):
    return Paragraph(esc(text), style)


def make_bullet(text, style):
    return Paragraph(f"- {esc(text)}", style)


def get_styles():
    base = getSampleStyleSheet()

    styles = {
        "title": ParagraphStyle(
            "ValenceTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=25,
            leading=28,
            textColor=colors.white,
            alignment=0,
            spaceAfter=6,
        ),
        "subtitle": ParagraphStyle(
            "ValenceSubtitle",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.2,
            leading=12,
            textColor=colors.HexColor("#CFFAFE"),
            spaceAfter=0,
        ),
        "eyebrow": ParagraphStyle(
            "ValenceEyebrow",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.2,
            leading=9,
            textColor=CYAN,
            spaceAfter=5,
        ),
        "hero_label": ParagraphStyle(
            "ValenceHeroLabel",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9,
            textColor=MUTED,
            spaceAfter=2,
        ),
        "hero_value": ParagraphStyle(
            "ValenceHeroValue",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=12.5,
            leading=15,
            textColor=colors.white,
            spaceAfter=0,
        ),
        "h1": ParagraphStyle(
            "ValenceH1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=13.2,
            leading=16,
            textColor=INK,
            spaceBefore=10,
            spaceAfter=7,
        ),
        "h2": ParagraphStyle(
            "ValenceH2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            textColor=DARK,
            spaceBefore=6,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "ValenceBody",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.2,
            leading=13.4,
            textColor=INK,
            spaceAfter=6,
        ),
        "body_emphasis": ParagraphStyle(
            "ValenceBodyEmphasis",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=14,
            textColor=INK,
            spaceAfter=0,
        ),
        "small": ParagraphStyle(
            "ValenceSmall",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.8,
            leading=10,
            textColor=SLATE,
        ),
        "kpi_label": ParagraphStyle(
            "ValenceKpiLabel",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=6.8,
            leading=8,
            textColor=GRAY,
            spaceAfter=3,
        ),
        "kpi_value": ParagraphStyle(
            "ValenceKpiValue",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=16,
            textColor=INK,
            spaceAfter=2,
        ),
        "kpi_note": ParagraphStyle(
            "ValenceKpiNote",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7,
            leading=9,
            textColor=GRAY,
        ),
        "table_header": ParagraphStyle(
            "ValenceTableHeader",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.4,
            leading=10,
            textColor=colors.white,
        ),
        "table_cell": ParagraphStyle(
            "ValenceTableCell",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.45,
            leading=9.6,
            textColor=INK,
        ),
        "table_cell_bold": ParagraphStyle(
            "ValenceTableCellBold",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.45,
            leading=9.6,
            textColor=INK,
        ),
        "warning": ParagraphStyle(
            "ValenceWarning",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            textColor=DARK,
        ),
    }

    return styles


def build_section_title(title, kicker=None):
    styles = get_styles()
    rows = []

    if kicker:
        rows.append([Paragraph(esc(kicker.upper()), styles["eyebrow"])])

    rows.append([Paragraph(esc(title), styles["h1"])])
    table = Table(rows, colWidths=[PAGE_WIDTH])
    table.setStyle(
        TableStyle(
            [
                ("LINEBELOW", (0, -1), (-1, -1), 1.0, CYAN),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def build_table(data, col_widths=None, font_size=8, header=True, compact=False):
    table_data = []
    styles = get_styles()

    for row_idx, row in enumerate(data):
        formatted_row = []

        for cell in row:
            if header and row_idx == 0:
                formatted_row.append(Paragraph(esc(cell), styles["table_header"]))
            elif row_idx > 0 and len(row) == 2 and cell == row[0]:
                formatted_row.append(Paragraph(esc(cell), styles["table_cell_bold"]))
            else:
                formatted_row.append(Paragraph(esc(cell), styles["table_cell"]))

        table_data.append(formatted_row)

    table = Table(table_data, colWidths=col_widths, repeatRows=1 if header else 0)

    table_style = [
        ("BOX", (0, 0), (-1, -1), 0.55, BORDER_SOFT),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, BORDER_SOFT),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4 if compact else 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4 if compact else 6),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), font_size),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
    ]

    if header:
        table_style.extend(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PANEL),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("LINEBELOW", (0, 0), (-1, 0), 1.15, CYAN),
                ("TOPPADDING", (0, 0), (-1, 0), 6),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
            ]
        )

    table.setStyle(TableStyle(table_style))
    return table


def build_hero(target_name, selected_name, selected_ticker, generated_at):
    styles = get_styles()

    meta = Table(
        [
            [
                Paragraph("TARGET", styles["hero_label"]),
                Paragraph("SELECTED COMP", styles["hero_label"]),
                Paragraph("GENERATED", styles["hero_label"]),
            ],
            [
                Paragraph(esc(target_name), styles["hero_value"]),
                Paragraph(esc(f"{selected_name} ({selected_ticker})"), styles["hero_value"]),
                Paragraph(esc(generated_at), styles["hero_value"]),
            ],
        ],
        colWidths=[2.05 * inch, 2.85 * inch, 1.9 * inch],
    )
    meta.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PANEL_SOFT),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#1E293B")),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#1E293B")),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )

    hero = Table(
        [
            [Paragraph("VALENCE MARKET INTELLIGENCE", styles["eyebrow"])],
            [Paragraph("Comparable Company Report", styles["title"])],
            [Paragraph("Banker-style comp set, valuation range, and data quality review.", styles["subtitle"])],
            [meta],
        ],
        colWidths=[PAGE_WIDTH],
    )
    hero.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), NAVY),
                ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#1E293B")),
                ("LINEABOVE", (0, 0), (-1, 0), 2.0, CYAN),
                ("LEFTPADDING", (0, 0), (-1, -1), 18),
                ("RIGHTPADDING", (0, 0), (-1, -1), 18),
                ("TOPPADDING", (0, 0), (-1, 0), 16),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 3),
                ("TOPPADDING", (0, 1), (-1, 1), 0),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 4),
                ("TOPPADDING", (0, 2), (-1, 2), 0),
                ("BOTTOMPADDING", (0, 2), (-1, 2), 14),
                ("TOPPADDING", (0, 3), (-1, 3), 0),
                ("BOTTOMPADDING", (0, 3), (-1, 3), 16),
            ]
        )
    )
    return hero


def build_kpi_cards(cards):
    styles = get_styles()
    cells = []

    for label, value, note in cards:
        card = Table(
            [
                [Paragraph(esc(label.upper()), styles["kpi_label"])],
                [Paragraph(esc(value), styles["kpi_value"])],
                [Paragraph(esc(note), styles["kpi_note"])],
            ],
            colWidths=[1.65 * inch],
        )
        card.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
                    ("BOX", (0, 0), (-1, -1), 0.6, BORDER_SOFT),
                    ("LINEABOVE", (0, 0), (-1, 0), 1.25, CYAN),
                    ("LEFTPADDING", (0, 0), (-1, -1), 9),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                    ("TOPPADDING", (0, 0), (-1, 0), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
                    ("TOPPADDING", (0, 1), (-1, 1), 0),
                    ("BOTTOMPADDING", (0, 1), (-1, 1), 2),
                    ("TOPPADDING", (0, 2), (-1, 2), 0),
                    ("BOTTOMPADDING", (0, 2), (-1, 2), 8),
                ]
            )
        )
        cells.append(card)

    table = Table([cells], colWidths=[1.775 * inch] * len(cells))
    table.setStyle(
        TableStyle(
            [
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return table


def get_business_model_text(c):
    return str(
        safe_get(
            c,
            "businessModel",
            "business_model",
            "revenueModel",
            "revenue_model",
            "model",
            default="",
        )
    ).lower()


def get_description_text(c):
    return str(
        safe_get(
            c,
            "description",
            "businessDescription",
            "business_description",
            default="",
        )
    ).lower()


def calculate_match_breakdown(target, selected):
    target_sector = str(
        safe_get(
            target,
            "sector",
            "industry",
            "subSector",
            "sub_sector",
            default="",
        )
    ).lower()

    comp_sector = str(
        safe_get(
            selected,
            "sector",
            "industry",
            "subSector",
            "sub_sector",
            default="",
        )
    ).lower()

    target_rev = revenue_m(target)
    comp_rev = revenue_m(selected)

    target_margin = ebitda_margin_pct(target)
    comp_margin = ebitda_margin_pct(selected)

    target_growth = revenue_growth_pct(target)
    comp_growth = revenue_growth_pct(selected)

    target_model = get_business_model_text(target) + " " + get_description_text(target)
    comp_model = get_business_model_text(selected) + " " + get_description_text(selected)

    breakdown = []

    if target_sector and comp_sector:
        if target_sector == comp_sector:
            score = 100
            comment = "Target and selected comp share the same sector / industry label."
        elif any(word in comp_sector for word in target_sector.split() if len(word) > 3):
            score = 80
            comment = "Target and selected comp have overlapping industry language."
        else:
            score = 55
            comment = "Industry match is partial based on available labels."
    else:
        score = 65
        comment = "Industry detail is missing, so score uses a neutral assumption."

    breakdown.append(["Industry similarity", "30%", f"{score:.0f}%", comment])

    if target_rev and comp_rev:
        ratio = max(target_rev, comp_rev) / max(min(target_rev, comp_rev), 1)

        if ratio <= 1.5:
            score = 100
        elif ratio <= 2.5:
            score = 85
        elif ratio <= 4.0:
            score = 70
        else:
            score = 50

        comment = (
            f"Selected comp revenue of {fmt_m(comp_rev)} compared with "
            f"target revenue of {fmt_m(target_rev)}."
        )
    else:
        score = 60
        comment = "Revenue scale comparison is limited because one revenue figure is missing."

    breakdown.append(["Revenue scale", "20%", f"{score:.0f}%", comment])

    if target_margin is not None and comp_margin is not None:
        diff = abs(target_margin - comp_margin)

        if diff <= 5:
            score = 100
        elif diff <= 10:
            score = 85
        elif diff <= 20:
            score = 65
        else:
            score = 45

        comment = (
            f"Target EBITDA margin is {fmt_pct(target_margin)} vs. "
            f"selected comp at {fmt_pct(comp_margin)}."
        )
    else:
        score = 55
        comment = "Margin comparison is limited because target or comp EBITDA margin is missing."

    breakdown.append(["Margin similarity", "15%", f"{score:.0f}%", comment])

    if target_growth is not None and comp_growth is not None:
        diff = abs(target_growth - comp_growth)

        if diff <= 5:
            score = 100
        elif diff <= 10:
            score = 85
        elif diff <= 20:
            score = 65
        else:
            score = 45

        comment = (
            f"Target revenue growth is {fmt_pct(target_growth)} vs. "
            f"selected comp at {fmt_pct(comp_growth)}."
        )
    else:
        score = 55
        comment = "Growth comparison is limited because revenue growth data is missing."

    breakdown.append(["Growth similarity", "20%", f"{score:.0f}%", comment])

    keywords = ["saas", "subscription", "cloud", "software", "collaboration", "storage"]
    target_hits = [k for k in keywords if k in target_model]
    comp_hits = [k for k in keywords if k in comp_model]

    if target_hits and comp_hits:
        overlap = set(target_hits).intersection(set(comp_hits))

        if overlap:
            score = 100
            comment = f"Both businesses reference {', '.join(sorted(overlap))}."
        else:
            score = 75
            comment = "Both businesses appear software/subscription-oriented, but exact overlap is limited."
    else:
        score = 65
        comment = "Business model detail is limited, so score uses available description fields."

    breakdown.append(["Business model similarity", "15%", f"{score:.0f}%", comment])

    return breakdown


def selected_comp_rationale(target, selected, comps):
    reasons = []

    selected_ticker = ticker(selected)
    selected_name = company_name(selected)

    match_score = to_float(safe_get(selected, "matchScore", "match_score", "score"))

    if match_score is not None:
        reasons.append(
            f"{selected_name} ({selected_ticker}) has the highest or strongest "
            f"available match score at {match_score:.1f}%."
        )

    target_rev = revenue_m(target)
    comp_rev = revenue_m(selected)

    if target_rev is not None and comp_rev is not None:
        reasons.append(
            f"Revenue scale is comparable: target revenue of {fmt_m(target_rev)} "
            f"versus {selected_name} revenue of {fmt_m(comp_rev)}."
        )

    target_sector = safe_get(target, "sector", "industry", "subSector", "sub_sector")
    comp_sector = safe_get(selected, "sector", "industry", "subSector", "sub_sector")

    if target_sector or comp_sector:
        reasons.append(
            f"Business exposure is directionally similar based on sector / industry labels: "
            f"target = {fmt_plain(target_sector)}, selected comp = {fmt_plain(comp_sector)}."
        )

    comp_desc = get_description_text(selected)

    if any(
        word in comp_desc
        for word in ["saas", "subscription", "cloud", "collaboration", "storage", "software"]
    ):
        reasons.append(
            f"{selected_name} has relevant software, cloud, collaboration, storage, "
            f"or subscription exposure based on available description fields."
        )

    if ev_revenue(selected) is not None:
        reasons.append(
            f"{selected_name} provides a usable public-market EV/Revenue multiple of "
            f"{fmt_x(ev_revenue(selected))}, which can be applied to the target revenue base."
        )

    if not reasons:
        reasons.append(
            "Selected comp appears to be the closest available public comparable based on "
            "the current matching output, but more target detail is needed to fully support "
            "the selection."
        )

    return reasons[:5]


def data_quality_flags(target, selected, comps):
    flags = []

    if ebitda_m(target) is None:
        flags.append(
            "Target EBITDA was not provided, so EV/EBITDA valuation is hidden instead "
            "of showing an unhelpful N/A output."
        )

    if revenue_growth_pct(target) is None:
        flags.append(
            "Target revenue growth was not provided. For SaaS businesses, growth is a "
            "major driver of valuation multiples."
        )

    if gross_margin_pct(target) is None:
        flags.append(
            "Target gross margin was not provided. SaaS valuation should include gross "
            "margin where available."
        )

    all_comps = comps or []

    for c in all_comps:
        name = company_name(c)
        t = ticker(c)
        margin = ebitda_margin_pct(c)
        multiple = ev_ebitda(c)

        if margin is not None and margin > 60:
            flags.append(
                f"{name} ({t}) shows EBITDA margin of {fmt_pct(margin)}, which appears "
                f"unusually high and should be source-checked. It may be gross margin or "
                f"an adjusted metric."
            )

        if multiple is not None and multiple > 50:
            flags.append(
                f"{name} ({t}) shows EV/EBITDA of {fmt_x(multiple)}, which appears to be "
                f"an outlier and may distort peer statistics."
            )

    if not flags:
        flags.append("No major data quality warnings were detected from the available fields.")

    return flags


def create_bar_chart(labels, values, title, y_label, output_path, suffix="x"):
    clean_labels = []
    clean_values = []

    for label, value in zip(labels, values):
        if valid_number(value):
            clean_labels.append(label)
            clean_values.append(value)

    if not clean_values:
        return None

    plt.figure(figsize=(7.2, 3.2), facecolor="white")

    bars = plt.bar(
        clean_labels,
        clean_values,
        color=CHART_CYAN,
        edgecolor=CHART_PURPLE_DARK,
        linewidth=0.4,
        width=0.58,
    )

    plt.title(title, fontsize=12, fontweight="bold", color=CHART_DARK)
    plt.ylabel(y_label, fontsize=9, color="#334155")
    plt.xticks(rotation=25, ha="right", fontsize=8)
    plt.yticks(fontsize=8, color="#334155")
    plt.grid(axis="y", color=CHART_GRID, linewidth=0.8)

    ax = plt.gca()
    ax.set_facecolor("#F8FAFC")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("#CBD5E1")
    ax.spines["bottom"].set_color("#CBD5E1")

    max_val = max(clean_values)

    for bar, value in zip(bars, clean_values):
        if suffix == "%":
            label = f"{value:.1f}%"
        elif suffix == "$B":
            label = f"${value:.1f}B"
        else:
            label = f"{value:.1f}x"

        plt.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + max_val * 0.025,
            label,
            ha="center",
            va="bottom",
            fontsize=8,
            color=CHART_DARK,
        )

    plt.tight_layout()
    plt.savefig(output_path, dpi=180)
    plt.close()

    return output_path


def create_football_field_chart(ranges, output_path):
    clean = []

    for label, low, high, midpoint in ranges:
        if valid_number(low) and valid_number(high) and high >= low:
            clean.append((label, low, high, midpoint))

    if not clean:
        return None

    plt.figure(figsize=(7.2, 3.4), facecolor="white")
    y_positions = list(range(len(clean)))

    for i, (label, low, high, midpoint) in enumerate(clean):
        bar_color = CHART_CYAN if "Selected" in label else CHART_PURPLE
        plt.barh(
            i,
            high - low,
            left=low,
            height=0.35,
            color=bar_color,
            alpha=0.92,
        )

        if valid_number(midpoint):
            plt.scatter(
                midpoint,
                i,
                s=34,
                zorder=3,
                color=CHART_PURPLE_DARK,
                edgecolor="white",
                linewidth=0.6,
            )

        plt.text(
            high + 0.03,
            i,
            f"${low:.2f}B - ${high:.2f}B",
            va="center",
            fontsize=8,
            color=CHART_DARK,
        )

    plt.yticks(y_positions, [x[0] for x in clean], fontsize=8, color="#334155")
    plt.xlabel("Implied Enterprise Value ($B)", fontsize=9, color="#334155")
    plt.title("Valuation Football Field", fontsize=12, fontweight="bold", color=CHART_DARK)
    plt.grid(axis="x", color=CHART_GRID, linewidth=0.8)

    ax = plt.gca()
    ax.set_facecolor("#F8FAFC")
    ax.spines["top"].set_color("#CBD5E1")
    ax.spines["right"].set_color("#CBD5E1")
    ax.spines["left"].set_color("#CBD5E1")
    ax.spines["bottom"].set_color("#CBD5E1")

    plt.tight_layout()
    plt.savefig(output_path, dpi=180)
    plt.close()

    return output_path


def footer(canvas, doc, generated_at):
    canvas.saveState()
    width, height = letter

    canvas.setFillColor(NAVY)
    canvas.rect(0, height - 0.22 * inch, width, 0.22 * inch, stroke=0, fill=1)
    canvas.setFillColor(CYAN)
    canvas.rect(0.55 * inch, height - 0.22 * inch, 1.15 * inch, 0.035 * inch, stroke=0, fill=1)

    canvas.setStrokeColor(BORDER_SOFT)
    canvas.setLineWidth(0.5)
    canvas.line(0.55 * inch, 0.58 * inch, 7.95 * inch, 0.58 * inch)

    canvas.setFont("Helvetica-Bold", 7.2)
    canvas.setFillColor(SLATE)
    canvas.drawString(0.55 * inch, 0.36 * inch, "VALENCE")
    canvas.setFont("Helvetica", 7.2)
    canvas.setFillColor(GRAY)
    canvas.drawString(
        1.08 * inch,
        0.35 * inch,
        f"Banker Report v2 | Generated {generated_at}",
    )
    canvas.setFont("Helvetica", 7.2)
    canvas.drawRightString(7.95 * inch, 0.35 * inch, f"Page {doc.page}")
    canvas.restoreState()


def generate_banker_report(selected_company, comps, private_company, output_path):
    styles = get_styles()

    selected = selected_company or {}
    target = private_company or {}
    peer_comps = comps or []

    selected_ticker = ticker(selected)

    existing_tickers = {ticker(c) for c in peer_comps}

    if selected and selected_ticker not in existing_tickers:
        peer_comps = [selected] + peer_comps

    generated_at = datetime.now().strftime("%b %d, %Y %I:%M %p")

    target_name = safe_get(
        target,
        "companyName",
        "name",
        "targetName",
        "privateCompanyName",
        default="Private Company",
    )

    selected_name = company_name(selected)

    target_rev = revenue_m(target)
    target_ebitda = ebitda_m(target)

    ev_rev_values = [
        ev_revenue(c)
        for c in peer_comps
        if valid_number(ev_revenue(c)) and ev_revenue(c) > 0
    ]

    ev_ebitda_values = [
        ev_ebitda(c)
        for c in peer_comps
        if valid_number(ev_ebitda(c)) and ev_ebitda(c) > 0 and ev_ebitda(c) < 100
    ]

    ev_rev_stats = peer_stats(ev_rev_values)
    ev_ebitda_stats = peer_stats(ev_ebitda_values)

    selected_ev_rev = ev_revenue(selected)

    p25_value = None
    median_value = None
    p75_value = None
    selected_value = None
    average_value = None

    if target_rev is not None:
        if ev_rev_stats["p25"] is not None:
            p25_value = target_rev * ev_rev_stats["p25"] / 1000

        if ev_rev_stats["median"] is not None:
            median_value = target_rev * ev_rev_stats["median"] / 1000

        if ev_rev_stats["p75"] is not None:
            p75_value = target_rev * ev_rev_stats["p75"] / 1000

        if selected_ev_rev is not None:
            selected_value = target_rev * selected_ev_rev / 1000

        if ev_rev_stats["mean"] is not None:
            average_value = target_rev * ev_rev_stats["mean"] / 1000

    if p25_value is not None and p75_value is not None:
        conclusion = (
            f"Based on the peer 25th to 75th percentile EV/Revenue range, "
            f"{target_name}'s implied enterprise value is approximately "
            f"${p25_value:.2f}B to ${p75_value:.2f}B, with a peer median case of "
            f"${median_value:.2f}B."
        )
    elif selected_value is not None:
        conclusion = (
            f"Based on the selected comparable company's EV/Revenue multiple, "
            f"{target_name}'s implied enterprise value is approximately "
            f"${selected_value:.2f}B."
        )
    else:
        conclusion = (
            "A valuation conclusion could not be fully calculated because target revenue "
            "or usable EV/Revenue multiples are missing."
        )

    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=0.55 * inch,
        leftMargin=0.55 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
    )

    source_date = safe_get(
        selected,
        "marketDataDate",
        "asOfDate",
        "sourceDate",
        default=generated_at,
    )

    financial_period = safe_get(
        selected,
        "financialPeriod",
        "period",
        "fiscalYear",
        "latestFiscalYear",
        default="Latest available fiscal year / LTM, where available",
    )

    story = []

    story.append(build_hero(target_name, selected_name, selected_ticker, generated_at))
    story.append(Spacer(1, 14))

    story.append(build_section_title("Executive Summary", "01 / Investment readout"))
    story.append(Spacer(1, 7))
    story.append(make_para(conclusion, styles["body_emphasis"]))
    story.append(Spacer(1, 9))

    implied_range = (
        f"${p25_value:.2f}B - ${p75_value:.2f}B"
        if p25_value is not None and p75_value is not None
        else "N/A"
    )
    kpi_cards = [
        ("Implied EV range", implied_range, "Peer 25th to 75th percentile"),
        ("Peer median", fmt_x(ev_rev_stats["median"]), "EV/Revenue multiple"),
        ("Selected comp", fmt_x(selected_ev_rev), f"{selected_ticker} EV/Revenue"),
        ("Target revenue", fmt_m(target_rev), "Provided operating metric"),
    ]
    story.append(build_kpi_cards(kpi_cards))
    story.append(Spacer(1, 10))

    summary_table = [
        ["Item", "Conclusion"],
        ["Selected Comparable", f"{selected_name} ({selected_ticker})"],
        ["Selected EV/Revenue", fmt_x(selected_ev_rev)],
        ["Peer Median EV/Revenue", fmt_x(ev_rev_stats["median"])],
        [
            "Peer 25th / 75th EV/Revenue",
            f"{fmt_x(ev_rev_stats['p25'])} / {fmt_x(ev_rev_stats['p75'])}",
        ],
        [
            "Implied EV Range",
            f"${p25_value:.2f}B - ${p75_value:.2f}B"
            if p25_value is not None and p75_value is not None
            else "N/A",
        ],
        ["Market Data Date", str(source_date)],
        ["Financials", str(financial_period)],
    ]

    story.append(build_table(summary_table, col_widths=[2.0 * inch, 5.1 * inch], compact=True))
    story.append(Spacer(1, 12))

    story.append(build_section_title("Target Company Profile", "02 / Operating profile"))
    story.append(Spacer(1, 7))

    target_profile = [
        ["Field", "Value"],
        ["Company Name", fmt_plain(target_name)],
        [
            "Business Description",
            fmt_plain(
                safe_get(target, "description", "businessDescription", "business_description")
            ),
        ],
        ["Sector", fmt_plain(safe_get(target, "sector"))],
        [
            "Sub-Sector / Industry",
            fmt_plain(safe_get(target, "subSector", "sub_sector", "industry")),
        ],
        [
            "Geography",
            fmt_plain(safe_get(target, "geography", "hq", "headquarters", "location")),
        ],
        [
            "Revenue Model",
            fmt_plain(
                safe_get(target, "revenueModel", "revenue_model", "businessModel", "business_model")
            ),
        ],
        ["Customer Type", fmt_plain(safe_get(target, "customerType", "customer_type"))],
        ["Revenue", fmt_m(target_rev)],
        ["Revenue Growth", fmt_pct(revenue_growth_pct(target))],
        ["Gross Margin", fmt_pct(gross_margin_pct(target))],
        ["EBITDA Margin", fmt_pct(ebitda_margin_pct(target))],
        ["Employee Count", fmt_plain(safe_get(target, "employees", "employeeCount", "employee_count"))],
    ]

    story.append(build_table(target_profile, col_widths=[2.0 * inch, 5.1 * inch], compact=True))
    story.append(Spacer(1, 12))

    story.append(build_section_title("Comparable Selection Rationale", "03 / Why this comp"))
    story.append(Spacer(1, 7))

    for reason in selected_comp_rationale(target, selected, peer_comps):
        story.append(make_bullet(reason, styles["body"]))

    story.append(Spacer(1, 11))

    story.append(build_section_title("Peer Comparable Company Set", "04 / Public market screen"))
    story.append(Spacer(1, 7))

    peer_rows = [
        [
            "Company",
            "Ticker",
            "Revenue",
            "EV",
            "EV/Revenue",
            "EV/EBITDA",
            "EBITDA Margin",
            "Revenue Growth",
            "Match",
        ]
    ]

    for c in peer_comps:
        score = safe_get(c, "matchScore", "match_score", "score")
        score_text = f"{to_float(score):.1f}%" if to_float(score) is not None else "N/A"

        peer_rows.append(
            [
                company_name(c),
                ticker(c),
                fmt_m(revenue_m(c)),
                fmt_m(enterprise_value_m(c)),
                fmt_x(ev_revenue(c)),
                fmt_x(ev_ebitda(c)),
                fmt_pct(ebitda_margin_pct(c)),
                fmt_pct(revenue_growth_pct(c)),
                score_text,
            ]
        )

    story.append(
        build_table(
            peer_rows,
            col_widths=[
                1.25 * inch,
                0.55 * inch,
                0.75 * inch,
                0.75 * inch,
                0.75 * inch,
                0.75 * inch,
                0.8 * inch,
                0.8 * inch,
                0.6 * inch,
            ],
            font_size=6.9,
            compact=True,
        )
    )

    story.append(Spacer(1, 12))
    story.append(build_section_title("Full Peer Statistics", "05 / Multiple distribution"))
    story.append(Spacer(1, 7))

    stats_table = [
        ["Metric", "Mean", "Median", "Min", "25th Percentile", "75th Percentile", "Max"],
        [
            "EV/Revenue",
            fmt_x(ev_rev_stats["mean"]),
            fmt_x(ev_rev_stats["median"]),
            fmt_x(ev_rev_stats["min"]),
            fmt_x(ev_rev_stats["p25"]),
            fmt_x(ev_rev_stats["p75"]),
            fmt_x(ev_rev_stats["max"]),
        ],
        [
            "EV/EBITDA",
            fmt_x(ev_ebitda_stats["mean"]),
            fmt_x(ev_ebitda_stats["median"]),
            fmt_x(ev_ebitda_stats["min"]),
            fmt_x(ev_ebitda_stats["p25"]),
            fmt_x(ev_ebitda_stats["p75"]),
            fmt_x(ev_ebitda_stats["max"]),
        ],
    ]

    story.append(
        build_table(
            stats_table,
            col_widths=[
                1.2 * inch,
                0.9 * inch,
                0.9 * inch,
                0.9 * inch,
                1.1 * inch,
                1.1 * inch,
                0.9 * inch,
            ],
            compact=True,
        )
    )

    story.append(PageBreak())
    story.append(build_section_title("Match Score Breakdown", "06 / Similarity drivers"))
    story.append(Spacer(1, 7))

    breakdown_rows = [["Category", "Weight", "Score", "Comment"]]
    breakdown_rows.extend(calculate_match_breakdown(target, selected))

    story.append(
        build_table(
            breakdown_rows,
            col_widths=[1.4 * inch, 0.7 * inch, 0.7 * inch, 4.3 * inch],
            compact=True,
        )
    )

    story.append(build_section_title("Valuation Summary", "07 / Enterprise value output"))
    story.append(Spacer(1, 7))

    valuation_rows = [
        ["Method", "Selected Multiple / Range", "Target Metric", "Implied Enterprise Value"],
        [
            "Selected Comp EV/Revenue",
            fmt_x(selected_ev_rev),
            fmt_m(target_rev),
            f"${selected_value:.2f}B" if selected_value is not None else "N/A",
        ],
        [
            "Peer Median EV/Revenue",
            fmt_x(ev_rev_stats["median"]),
            fmt_m(target_rev),
            f"${median_value:.2f}B" if median_value is not None else "N/A",
        ],
        [
            "Peer 25th - 75th EV/Revenue",
            f"{fmt_x(ev_rev_stats['p25'])} - {fmt_x(ev_rev_stats['p75'])}",
            fmt_m(target_rev),
            f"${p25_value:.2f}B - ${p75_value:.2f}B"
            if p25_value is not None and p75_value is not None
            else "N/A",
        ],
    ]

    if target_ebitda is not None and ev_ebitda_stats["median"] is not None:
        implied_ebitda_value = target_ebitda * ev_ebitda_stats["median"] / 1000

        valuation_rows.append(
            [
                "Peer Median EV/EBITDA",
                fmt_x(ev_ebitda_stats["median"]),
                fmt_m(target_ebitda),
                f"${implied_ebitda_value:.2f}B",
            ]
        )

    story.append(
        build_table(
            valuation_rows,
            col_widths=[2.0 * inch, 1.7 * inch, 1.6 * inch, 1.8 * inch],
            compact=True,
        )
    )

    story.append(Spacer(1, 12))
    story.append(build_section_title("EV/Revenue Sensitivity", "08 / Revenue multiple cases"))
    story.append(Spacer(1, 7))

    base_multiples = [3.5, 4.0, 4.5, 5.0]
    sensitivity_rows = [["EV/Revenue Multiple", "Target Revenue", "Implied Enterprise Value"]]

    for multiple in base_multiples:
        if target_rev is not None:
            implied = target_rev * multiple / 1000
            implied_text = f"${implied:.2f}B"
        else:
            implied_text = "N/A"

        sensitivity_rows.append([fmt_x(multiple), fmt_m(target_rev), implied_text])

    story.append(
        build_table(
            sensitivity_rows,
            col_widths=[2.2 * inch, 2.2 * inch, 2.7 * inch],
            compact=True,
        )
    )

    temp_dir = tempfile.mkdtemp()

    football_ranges = []

    if selected_value is not None:
        football_ranges.append(
            (
                "Selected Comp",
                max(selected_value * 0.9, 0),
                selected_value * 1.1,
                selected_value,
            )
        )

    if median_value is not None:
        football_ranges.append(
            (
                "Peer Median",
                max(median_value * 0.9, 0),
                median_value * 1.1,
                median_value,
            )
        )

    if average_value is not None:
        football_ranges.append(
            (
                "Peer Average",
                max(average_value * 0.9, 0),
                average_value * 1.1,
                average_value,
            )
        )

    if p25_value is not None and p75_value is not None:
        football_ranges.append(
            (
                "Peer Quartile Range",
                p25_value,
                p75_value,
                median_value,
            )
        )

    football_path = os.path.join(temp_dir, "football_field.png")
    football_chart = create_football_field_chart(football_ranges, football_path)

    if football_chart:
        story.append(Spacer(1, 12))
        story.append(Image(football_chart, width=7.1 * inch, height=3.35 * inch))

    story.append(PageBreak())

    story.append(build_section_title("Charts and Data Quality Review", "09 / Multiple visuals"))
    story.append(Spacer(1, 8))

    labels = [ticker(c) for c in peer_comps]

    ev_rev_chart_path = os.path.join(temp_dir, "ev_revenue_chart.png")
    ev_rev_chart = create_bar_chart(
        labels,
        [ev_revenue(c) for c in peer_comps],
        "EV/Revenue Multiples",
        "EV/Revenue",
        ev_rev_chart_path,
        suffix="x",
    )

    if ev_rev_chart:
        story.append(Image(ev_rev_chart, width=7.1 * inch, height=3.15 * inch))
        story.append(Spacer(1, 10))

    ev_ebitda_chart_path = os.path.join(temp_dir, "ev_ebitda_chart.png")
    ev_ebitda_chart = create_bar_chart(
        labels,
        [ev_ebitda(c) for c in peer_comps],
        "EV/EBITDA Multiples",
        "EV/EBITDA",
        ev_ebitda_chart_path,
        suffix="x",
    )

    if ev_ebitda_chart:
        story.append(Image(ev_ebitda_chart, width=7.1 * inch, height=3.15 * inch))
        story.append(Spacer(1, 10))

    story.append(build_section_title("Red Flag / Data Quality Section", "10 / Review notes"))
    story.append(Spacer(1, 7))

    warning_rows = [["Issue"]]

    for flag in data_quality_flags(target, selected, peer_comps):
        warning_rows.append([flag])

    warning_table = build_table(warning_rows, col_widths=[7.1 * inch], compact=True)

    warning_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 1), (-1, -1), WARNING_BG),
                ("BOX", (0, 1), (-1, -1), 0.6, WARNING_BORDER),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ]
        )
    )

    story.append(warning_table)
    story.append(Spacer(1, 12))

    story.append(build_section_title("Metric Definitions", "11 / Appendix"))
    story.append(Spacer(1, 7))

    definitions = [
        "EV/Revenue = Enterprise Value divided by revenue.",
        "EV/EBITDA = Enterprise Value divided by EBITDA. This is hidden from valuation output when target EBITDA is missing.",
        "Gross Margin = Gross profit divided by revenue.",
        "EBITDA Margin = EBITDA divided by revenue.",
        "Rule of 40 = Revenue growth plus free cash flow margin, where both data points are available.",
        "All financial metrics should be checked against source filings, market data providers, or company disclosures before using the report externally.",
    ]

    for definition in definitions:
        story.append(make_bullet(definition, styles["body"]))

    doc.build(
        story,
        onFirstPage=lambda canvas, doc: footer(canvas, doc, generated_at),
        onLaterPages=lambda canvas, doc: footer(canvas, doc, generated_at),
    )

    return output_path
