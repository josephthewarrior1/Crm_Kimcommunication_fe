from __future__ import annotations

import re
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "BRD_CRM_Kimcommunication_v7.md"
OUTPUT = ROOT / "output" / "pdf" / "BRD_CRM_Kimcommunication_v7.pdf"

PAGE_W, PAGE_H = A4
NAVY = colors.HexColor("#0F2744")
BLUE = colors.HexColor("#1F5FAF")
CYAN = colors.HexColor("#17A2B8")
INK = colors.HexColor("#172033")
MUTED = colors.HexColor("#64748B")
LINE = colors.HexColor("#D8E1EC")
PALE = colors.HexColor("#F3F7FB")
PALE_BLUE = colors.HexColor("#EAF2FC")
WHITE = colors.white


def rich(text: str) -> str:
    text = escape(text.strip())
    text = re.sub(r"`([^`]+)`", r'<font name="Courier">\1</font>', text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"\*([^*]+)\*", r"<i>\1</i>", text)
    return text


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        "BodyBRD",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.8,
        leading=12.5,
        textColor=INK,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        "BulletBRD",
        parent=styles["BodyBRD"],
        leftIndent=13,
        firstLineIndent=-7,
        bulletIndent=2,
        spaceAfter=3,
    )
)
styles.add(
    ParagraphStyle(
        "H1BRD",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=17,
        leading=21,
        textColor=NAVY,
        spaceBefore=12,
        spaceAfter=8,
        keepWithNext=True,
    )
)
styles.add(
    ParagraphStyle(
        "H2BRD",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12.5,
        leading=16,
        textColor=BLUE,
        spaceBefore=9,
        spaceAfter=5,
        keepWithNext=True,
    )
)
styles.add(
    ParagraphStyle(
        "H3BRD",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=10.3,
        leading=13,
        textColor=NAVY,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True,
    )
)
styles.add(
    ParagraphStyle(
        "TableBRD",
        parent=styles["BodyBRD"],
        fontSize=7.4,
        leading=9.8,
        spaceAfter=0,
    )
)
styles.add(
    ParagraphStyle(
        "TableHeadBRD",
        parent=styles["TableBRD"],
        fontName="Helvetica-Bold",
        textColor=WHITE,
        alignment=TA_LEFT,
    )
)
styles.add(
    ParagraphStyle(
        "Kicker",
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=CYAN,
        alignment=TA_CENTER,
        tracking=1.2,
    )
)
styles.add(
    ParagraphStyle(
        "TitleBRD",
        fontName="Helvetica-Bold",
        fontSize=28,
        leading=32,
        textColor=NAVY,
        alignment=TA_CENTER,
    )
)
styles.add(
    ParagraphStyle(
        "SubtitleBRD",
        fontName="Helvetica",
        fontSize=13,
        leading=18,
        textColor=MUTED,
        alignment=TA_CENTER,
    )
)
styles.add(
    ParagraphStyle(
        "MetaBRD",
        fontName="Helvetica",
        fontSize=9.3,
        leading=14,
        textColor=INK,
        alignment=TA_CENTER,
    )
)


def cover_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, PAGE_H - 34 * mm, PAGE_W, 34 * mm, stroke=0, fill=1)
    canvas.setFillColor(CYAN)
    canvas.rect(0, PAGE_H - 36.5 * mm, PAGE_W, 2.5 * mm, stroke=0, fill=1)
    canvas.setFillColor(PALE)
    canvas.rect(0, 0, PAGE_W, 20 * mm, stroke=0, fill=1)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(PAGE_W / 2, 8 * mm, "Kim Communication | CRM System Development")
    canvas.restoreState()


def body_page(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(19 * mm, PAGE_H - 14 * mm, PAGE_W - 19 * mm, PAGE_H - 14 * mm)
    canvas.setFillColor(NAVY)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(19 * mm, PAGE_H - 10.5 * mm, "CRM KIM COMMUNICATION")
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawRightString(PAGE_W - 19 * mm, PAGE_H - 10.5 * mm, "BUSINESS REQUIREMENTS DOCUMENT | V7.0")
    canvas.line(19 * mm, 14 * mm, PAGE_W - 19 * mm, 14 * mm)
    canvas.drawString(19 * mm, 9 * mm, "Revision date: July 28, 2026")
    canvas.drawRightString(PAGE_W - 19 * mm, 9 * mm, f"Page {doc.page}")
    canvas.restoreState()


frame_cover = Frame(24 * mm, 24 * mm, PAGE_W - 48 * mm, PAGE_H - 65 * mm, id="cover")
frame_body = Frame(19 * mm, 17 * mm, PAGE_W - 38 * mm, PAGE_H - 34 * mm, id="body")

doc = BaseDocTemplate(
    str(OUTPUT),
    pagesize=A4,
    leftMargin=19 * mm,
    rightMargin=19 * mm,
    topMargin=18 * mm,
    bottomMargin=17 * mm,
    title="BRD CRM Kimcommunication v7",
    author="Kim Communication",
    subject="EMS Integration, 5-Tab Participant Lifecycle, Engagement Logging, and PIC Operations",
)
doc.addPageTemplates(
    [
        PageTemplate(id="Cover", frames=[frame_cover], onPage=cover_page),
        PageTemplate(id="Body", frames=[frame_body], onPage=body_page),
    ]
)


def title_story():
    return [
        Spacer(1, 45 * mm),
        Paragraph("BUSINESS REQUIREMENTS DOCUMENT", styles["Kicker"]),
        Spacer(1, 7 * mm),
        Paragraph("CRM System<br/>Development", styles["TitleBRD"]),
        Spacer(1, 6 * mm),
        HRFlowable(width="34%", thickness=2, color=CYAN, spaceBefore=2, spaceAfter=10),
        Paragraph("Kim Communication", styles["SubtitleBRD"]),
        Spacer(1, 21 * mm),
        Table(
            [
                [Paragraph("<b>Document Version</b><br/>7.0", styles["MetaBRD"]),
                 Paragraph("<b>Revision Date</b><br/>July 28, 2026", styles["MetaBRD"])],
                [Paragraph("<b>Revision Theme</b><br/>EMS Integration, 5-Tab Lifecycle,<br/>Engagement Logging &amp; PIC Operations", styles["MetaBRD"]),
                 Paragraph("<b>Status</b><br/>Prepared for Stakeholder Review", styles["MetaBRD"])],
            ],
            colWidths=[72 * mm, 72 * mm],
            rowHeights=[19 * mm, 29 * mm],
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), WHITE),
                    ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ]
            ),
        ),
        NextPageTemplate("Body"),
        PageBreak(),
    ]


def table_from_lines(lines: list[str]) -> Table:
    rows = []
    for line in lines:
        parts = [part.strip() for part in line.strip().strip("|").split("|")]
        rows.append(parts)
    if len(rows) >= 2 and all(re.fullmatch(r":?-{3,}:?", p) for p in rows[1]):
        rows.pop(1)
    cols = max(len(row) for row in rows)
    rows = [row + [""] * (cols - len(row)) for row in rows]
    usable = PAGE_W - 38 * mm
    if cols == 2:
        widths = [usable * 0.29, usable * 0.71]
    elif cols == 3:
        widths = [usable * 0.20, usable * 0.20, usable * 0.60]
    else:
        widths = [usable / cols] * cols
    data = []
    for r_idx, row in enumerate(rows):
        style = styles["TableHeadBRD"] if r_idx == 0 else styles["TableBRD"]
        data.append([Paragraph(rich(cell), style) for cell in row])
    return Table(
        data,
        colWidths=widths,
        repeatRows=1,
        hAlign="LEFT",
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("BACKGROUND", (0, 1), (-1, -1), WHITE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, PALE]),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        ),
    )


def markdown_story(source: str):
    lines = source.splitlines()
    story = []
    i = 0
    # Skip the source title and metadata; the PDF cover owns them.
    while i < len(lines) and not lines[i].startswith("## Document Control"):
        i += 1
    while i < len(lines):
        raw = lines[i].rstrip()
        line = raw.strip()
        if not line:
            i += 1
            continue
        if line == "## Approval":
            block = [
                Paragraph("Approval", styles["H1BRD"]),
                HRFlowable(width="100%", thickness=0.8, color=LINE, spaceAfter=5),
            ]
            i += 1
            while i < len(lines) and not lines[i].strip():
                i += 1
            if i < len(lines) and not lines[i].strip().startswith("|"):
                block.append(Paragraph(rich(lines[i]), styles["BodyBRD"]))
                i += 1
            while i < len(lines) and not lines[i].strip():
                i += 1
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                table_lines.append(lines[i].strip())
                i += 1
            if table_lines:
                block.extend([Spacer(1, 2), table_from_lines(table_lines)])
            story.append(KeepTogether(block))
            continue
        if line.startswith("|"):
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                table_lines.append(lines[i].strip())
                i += 1
            story.extend([Spacer(1, 2), table_from_lines(table_lines), Spacer(1, 7)])
            continue
        if line.startswith("### "):
            story.append(Paragraph(rich(line[4:]), styles["H3BRD"]))
        elif line.startswith("## "):
            story.append(Paragraph(rich(line[3:]), styles["H1BRD"]))
            story.append(HRFlowable(width="100%", thickness=0.8, color=LINE, spaceAfter=5))
        elif line.startswith("# "):
            story.append(Paragraph(rich(line[2:]), styles["H1BRD"]))
        elif re.match(r"^\d+\.\s+", line):
            text = re.sub(r"^\d+\.\s+", "", line)
            num = re.match(r"^(\d+)\.", line).group(1)
            story.append(Paragraph(rich(text), styles["BulletBRD"], bulletText=f"{num}."))
        elif line.startswith("- "):
            story.append(Paragraph(rich(line[2:]), styles["BulletBRD"], bulletText="-"))
        else:
            paras = [line]
            j = i + 1
            while (
                j < len(lines)
                and lines[j].strip()
                and not lines[j].strip().startswith(("#", "-", "|"))
                and not re.match(r"^\d+\.\s+", lines[j].strip())
            ):
                paras.append(lines[j].strip())
                j += 1
            story.append(Paragraph(rich(" ".join(paras)), styles["BodyBRD"]))
            i = j - 1
        i += 1
    return story


OUTPUT.parent.mkdir(parents=True, exist_ok=True)
story = title_story() + markdown_story(SOURCE.read_text(encoding="utf-8"))
doc.build(story)
print(OUTPUT)
