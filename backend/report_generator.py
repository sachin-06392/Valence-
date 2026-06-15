from io import BytesIO
from datetime import datetime
from statistics import median
import re

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.graphics.shapes import Drawing, String
from reportlab.graphics.charts.barcharts import VerticalBarChart


PAGE_W, PAGE_H = letter


def pick(d, *keys, default=None):
    if not isinstance(d, dict):
        return default
    for key in keys:
        if key in d and d[key] not in (None, ""):
            return d[key]
    return default


def num(value):
    if value is None or value == "":
        return None

    if isinstance(value, (int, float)):
        return float(value)

    if isinstance(value, str):
        clean = value.strip()

        if clean in ("—", "-", "N/A", "NA", "n/a", "na"):
            return None

        clean = (
            clean.replace("$", "")
            .replace(",", "")
            .replace("x", "")
            .replace("X", "")
            .replace("%", "")
            .strip()
        )

        multiplier = 1.0

        if clean.upper().endswith("B"):
            multiplier = 1000.0
            clean = clean[:-1]
        elif clean.upper().endswith("M"):
            multiplier = 1.0
            clean = clean[:-1]

        try:
            return float(clean) * multiplier
        except ValueError:
            return None

    return None


def fmt_m(value):
    n = num(value)
    if n is None:
        return "N/A"
    if abs(n) >= 1000:
        return f"${n / 1000:,.2f}B"
    return f"${n:,.1f}M"


def fmt_pct(value):
    n = num(value)
    if n is None:
        return "N/A"
    return f"{n:.1f}%"


def fmt_x(value):
    n = num(value)
    if n is None:
        return "N/A"
    return f"{n:.1f}x"


def safe_div(a, b):
    a = num(a)
    b = num(b)

    if a is None or b is None or b == 0:
        return None

    return a / b


def safe_report_filename(text):
    text = str(text or "report")
    text = re.sub(r"[^A-Za-z0-9_-]+", "-", text).strip("-")
    return text or "report"


def normalize_company(row):
    row = row or {}

    revenue = num(pick(row, "revenue", "Revenue", "totalRevenue", "sales"))
    ebitda = num(pick(row, "ebitda", "EBITDA"))

    ebitda_margin = num(pick(row, "ebitda_margin", "ebitdaMargin", "margin"))

    if ebitda_margin is None and revenue not in (None, 0) and ebitda is not None:
        ebitda_margin = ebitda / revenue * 100

    enterprise_value = num(
        pick(row, "enterprise_value", "enterpriseValue", "ev", "EV")
    )

    market_cap = num(
        pick(row, "market_cap", "marketCap", "market_capitalization")
    )

    ev_revenue = num(
        pick(row, "ev_revenue", "evRevenue", "ev_rev", "evToRevenue", "EV/Revenue")
    )

    ev_ebitda = num(
        pick(row, "ev_ebitda", "evEbitda", "ev_ebitda", "evToEbitda", "EV/EBITDA")
    )

    if ev_revenue is None:
        ev_revenue = safe_div(enterprise_value, revenue)

    if ev_ebitda is None:
        ev_ebitda = safe_div(enterprise_value, ebitda)

    return {
        "company": pick(row, "company", "name", "company_name", "Company", default="N/A"),
        "ticker": pick(row, "ticker", "symbol", "Ticker", default="N/A"),
        "industry": pick(row, "industry", "sector", "Industry", default="N/A"),
        "revenue": revenue,
        "ebitda": ebitda,
        "ebitda_margin": ebitda_margin,
        "market_cap": market_cap,
        "enterprise_value": enterprise_value,
        "ev_revenue": ev_revenue,
        "ev_ebitda": ev_ebitda,
        "match_score": num(pick(row, "match_score", "matchScore", "score", "match")),
    }


def styles():
    s = getSampleStyleSheet()

    s.add(
        ParagraphStyle(
            name="TitlePurple",
            parent=s["Title"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#2E1065"),
            spaceAfter=10,
        )
    )

    s.add(
        ParagraphStyle(
            name="Section",
            parent=s["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#2E1065"),
            spaceBefore=12,
            spaceAfter=7,
        )
    )

    s.add(
        ParagraphStyle(
            name="BodySmall",
            parent=s["BodyText"],
            fontSize=8.5,
            leading=11,
        )
    )

    s.add(
        ParagraphStyle(
            name="BodyClean",
            parent=s["BodyText"],
            fontSize=9.5,
            leading=13,
        )
    )

    return s


def make_table(data, col_widths=None, header=True):
    t = Table(data, colWidths=col_widths, hAlign="LEFT", repeatRows=1 if header else 0)

    table_style = [
        ("FONT", (0, 0), (-1, -1), "Helvetica", 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#D1D5DB")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]

    if header:
        table_style += [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2E1065")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8),
        ]

    t.setStyle(TableStyle(table_style))
    return t


def chart(title, labels, values, y_label):
    clean = []

    for label, value in zip(labels, values):
        value = num(value)
        if value is not None:
            clean.append((str(label), value))

    if not clean:
        s = styles()
        return Paragraph(f"<b>{title}</b><br/>No usable data available for this chart.", s["BodySmall"])

    labels, values = zip(*clean)

    drawing = Drawing(500, 235)

    bar = VerticalBarChart()
    bar.x = 55
    bar.y = 45
    bar.height = 135
    bar.width = 385
    bar.data = [list(values)]
    bar.categoryAxis.categoryNames = list(labels)

    bar.categoryAxis.labels.boxAnchor = "ne"
    bar.categoryAxis.labels.dx = 8
    bar.categoryAxis.labels.dy = -2
    bar.categoryAxis.labels.angle = 35

    bar.valueAxis.valueMin = 0
    max_value = max(values)
    bar.valueAxis.valueMax = max_value * 1.25 if max_value > 0 else 1
    bar.valueAxis.valueStep = bar.valueAxis.valueMax / 4

    bar.bars[0].fillColor = colors.HexColor("#4C1D95")
    bar.bars[0].strokeColor = colors.HexColor("#4C1D95")

    drawing.add(bar)

    drawing.add(
        String(
            180,
            210,
            title,
            fontSize=12,
            fontName="Helvetica-Bold",
            fillColor=colors.HexColor("#111827"),
        )
    )

    drawing.add(
        String(
            0,
            105,
            y_label,
            fontSize=8,
            fillColor=colors.HexColor("#374151"),
            transform=[0, 1, -1, 0, 20, 15],
        )
    )

    return drawing


def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#6B7280"))
    canvas.drawString(0.55 * inch, 0.35 * inch, "Generated by Valence")
    canvas.drawRightString(PAGE_W - 0.55 * inch, 0.35 * inch, f"Page {doc.page}")
    canvas.restoreState()


def build_valence_report_pdf(payload: dict) -> bytes:
    payload = payload or {}

    comps_raw = pick(payload, "comparables", "comps", "results", "matches", default=[])

    if isinstance(comps_raw, dict):
        comps_raw = pick(comps_raw, "comparables", "results", "matches", default=[])

    comps = [normalize_company(row) for row in comps_raw if isinstance(row, dict)]

    selected_raw = pick(
        payload,
        "selectedComparable",
        "selected",
        "selected_comparable",
        default=None,
    )

    if isinstance(selected_raw, dict):
        selected = normalize_company(selected_raw)
    elif comps:
        selected = comps[0]
    else:
        selected = normalize_company({})

    target_raw = pick(payload, "target", "privateCompany", "inputs", default={})

    if not isinstance(target_raw, dict):
        target_raw = {}

    target_name = pick(
        target_raw,
        "name",
        "company",
        "targetCompany",
        default=pick(payload, "targetCompany", "companyName", default="Private Company"),
    )

    target_industry = pick(
        target_raw,
        "industry",
        "sector",
        default=pick(payload, "industry", default="N/A"),
    )

    target_revenue = num(
        pick(
            target_raw,
            "revenue",
            "targetRevenue",
            "Revenue",
            default=pick(payload, "revenue", "targetRevenue", default=None),
        )
    )

    target_ebitda = num(
        pick(
            target_raw,
            "ebitda",
            "targetEbitda",
            "EBITDA",
            default=pick(payload, "ebitda", "targetEbitda", default=None),
        )
    )

    target_margin = num(
        pick(
            target_raw,
            "ebitda_margin",
            "ebitdaMargin",
            "margin",
            default=pick(payload, "ebitdaMargin", default=None),
        )
    )

    if target_ebitda is None and target_revenue not in (None, 0) and target_margin is not None:
        target_ebitda = target_revenue * target_margin / 100

    if target_margin is None and target_revenue not in (None, 0) and target_ebitda is not None:
        target_margin = target_ebitda / target_revenue * 100

    valid_ev_rev = [
        c["ev_revenue"]
        for c in comps
        if c["ev_revenue"] is not None and c["ev_revenue"] > 0
    ]

    valid_ev_ebitda = [
        c["ev_ebitda"]
        for c in comps
        if c["ev_ebitda"] is not None and c["ev_ebitda"] > 0
    ]

    median_ev_rev = median(valid_ev_rev) if valid_ev_rev else None
    median_ev_ebitda = median(valid_ev_ebitda) if valid_ev_ebitda else None

    selected_ev_rev_value = (
        target_revenue * selected["ev_revenue"]
        if target_revenue is not None and selected["ev_revenue"] is not None
        else None
    )

    selected_ev_ebitda_value = (
        target_ebitda * selected["ev_ebitda"]
        if target_ebitda is not None and selected["ev_ebitda"] is not None
        else None
    )

    median_ev_rev_value = (
        target_revenue * median_ev_rev
        if target_revenue is not None and median_ev_rev is not None
        else None
    )

    median_ev_ebitda_value = (
        target_ebitda * median_ev_ebitda
        if target_ebitda is not None and median_ev_ebitda is not None
        else None
    )

    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.45 * inch,
        leftMargin=0.45 * inch,
        topMargin=0.45 * inch,
        bottomMargin=0.55 * inch,
    )

    s = styles()
    story = []

    story.append(Paragraph("Valence Comparable Company Report", s["TitlePurple"]))
    story.append(Paragraph(f"<b>Target Company:</b> {target_name}", s["BodyClean"]))
    story.append(
        Paragraph(
            f"<b>Selected Public Comparable:</b> {selected['company']} ({selected['ticker']})",
            s["BodyClean"],
        )
    )
    story.append(Paragraph(f"<b>Generated:</b> {datetime.now().strftime('%B %d, %Y')}", s["BodySmall"]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Executive Summary", s["Section"]))
    story.append(
        Paragraph(
            f"This report presents a comparable company analysis for <b>{target_name}</b> using "
            f"<b>{selected['company']}</b> as the selected public comparable. The analysis reviews "
            f"target inputs, peer-company financial metrics, trading multiples, match quality, and "
            f"implied enterprise-value calculations. Values are shown as N/A when the underlying "
            f"application data is missing, so missing information does not turn into fake zeroes.",
            s["BodyClean"],
        )
    )

    story.append(Paragraph("Target Company Inputs", s["Section"]))
    story.append(
        make_table(
            [
                ["Metric", "Value"],
                ["Target Company", str(target_name)],
                ["Industry / Sector", str(target_industry)],
                ["Revenue", fmt_m(target_revenue)],
                ["EBITDA", fmt_m(target_ebitda)],
                ["EBITDA Margin", fmt_pct(target_margin)],
            ],
            [1.7 * inch, 4.8 * inch],
        )
    )

    story.append(Paragraph("Selected Comparable Company Overview", s["Section"]))
    story.append(
        make_table(
            [
                ["Metric", "Value"],
                ["Company", selected["company"]],
                ["Ticker", selected["ticker"]],
                ["Industry", selected["industry"]],
                ["Revenue", fmt_m(selected["revenue"])],
                ["EBITDA", fmt_m(selected["ebitda"])],
                ["EBITDA Margin", fmt_pct(selected["ebitda_margin"])],
                ["Market Cap", fmt_m(selected["market_cap"])],
                ["Enterprise Value", fmt_m(selected["enterprise_value"])],
                ["EV / Revenue", fmt_x(selected["ev_revenue"])],
                ["EV / EBITDA", fmt_x(selected["ev_ebitda"])],
                ["Match Score", fmt_pct(selected["match_score"])],
            ],
            [1.7 * inch, 4.8 * inch],
        )
    )

    story.append(Paragraph("Comparable Company Set", s["Section"]))

    if comps:
        comp_table = [["Ticker", "Company", "Revenue", "EBITDA", "EV/Rev", "EV/EBITDA", "Match"]]

        for c in comps[:12]:
            comp_table.append(
                [
                    c["ticker"],
                    c["company"],
                    fmt_m(c["revenue"]),
                    fmt_m(c["ebitda"]),
                    fmt_x(c["ev_revenue"]),
                    fmt_x(c["ev_ebitda"]),
                    fmt_pct(c["match_score"]),
                ]
            )

        story.append(
            make_table(
                comp_table,
                [
                    0.65 * inch,
                    1.65 * inch,
                    0.9 * inch,
                    0.9 * inch,
                    0.75 * inch,
                    0.85 * inch,
                    0.65 * inch,
                ],
            )
        )
    else:
        story.append(Paragraph("No comparable-company rows were passed from the application.", s["BodyClean"]))

    story.append(PageBreak())

    story.append(Paragraph("Charts", s["Section"]))

    labels = [c["ticker"] for c in comps[:8]]

    story.append(chart("Revenue Comparison", labels, [c["revenue"] for c in comps[:8]], "Revenue ($M)"))
    story.append(Spacer(1, 14))

    story.append(
        chart(
            "EBITDA Margin Comparison",
            labels,
            [c["ebitda_margin"] for c in comps[:8]],
            "EBITDA Margin (%)",
        )
    )
    story.append(Spacer(1, 14))

    story.append(
        chart(
            "EV / EBITDA Multiple Comparison",
            labels,
            [c["ev_ebitda"] for c in comps[:8]],
            "EV / EBITDA (x)",
        )
    )

    story.append(PageBreak())

    story.append(Paragraph("Valuation Analysis", s["Section"]))

    valuation_table = [
        [
            "Method",
            "Private Company Metric",
            "Selected Multiple",
            "Selected-Comp Implied EV",
            "Peer Median Implied EV",
        ],
        [
            "EV / Revenue",
            fmt_m(target_revenue),
            fmt_x(selected["ev_revenue"]),
            fmt_m(selected_ev_rev_value),
            fmt_m(median_ev_rev_value),
        ],
        [
            "EV / EBITDA",
            fmt_m(target_ebitda),
            fmt_x(selected["ev_ebitda"]),
            fmt_m(selected_ev_ebitda_value),
            fmt_m(median_ev_ebitda_value),
        ],
    ]

    story.append(
        make_table(
            valuation_table,
            [
                1.1 * inch,
                1.25 * inch,
                1.05 * inch,
                1.45 * inch,
                1.45 * inch,
            ],
        )
    )

    story.append(Paragraph("Calculation Walkthrough", s["Section"]))

    story.append(
        Paragraph(
            f"<b>EV / Revenue Method:</b> {fmt_m(target_revenue)} of private-company revenue "
            f"multiplied by {fmt_x(selected['ev_revenue'])} selected-company EV / Revenue implies "
            f"{fmt_m(selected_ev_rev_value)} of enterprise value. Using the peer median multiple of "
            f"{fmt_x(median_ev_rev)} implies {fmt_m(median_ev_rev_value)}.",
            s["BodyClean"],
        )
    )

    story.append(Spacer(1, 4))

    story.append(
        Paragraph(
            f"<b>EV / EBITDA Method:</b> {fmt_m(target_ebitda)} of private-company EBITDA "
            f"multiplied by {fmt_x(selected['ev_ebitda'])} selected-company EV / EBITDA implies "
            f"{fmt_m(selected_ev_ebitda_value)} of enterprise value. Using the peer median multiple of "
            f"{fmt_x(median_ev_ebitda)} implies {fmt_m(median_ev_ebitda_value)}.",
            s["BodyClean"],
        )
    )

    story.append(Paragraph("Methodology and Important Notes", s["Section"]))

    story.append(
        Paragraph(
            "Comparable-company valuation depends on business similarity, scale, growth, margins, "
            "capital structure, and the quality of the selected peer set. This automated report should "
            "be used as a clean analytical starting point, not as investment advice. Missing values are "
            "shown as N/A instead of $0.0M unless the input data is actually zero.",
            s["BodyClean"],
        )
    )

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)

    return buffer.getvalue()