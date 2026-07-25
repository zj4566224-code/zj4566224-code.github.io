#!/usr/bin/env python3
"""Render the report's Markdown subset to a polished, Chinese-capable PDF."""

from __future__ import annotations

import argparse
import html
import re
import sys
from pathlib import Path

try:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.cidfonts import UnicodeCIDFont
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import (
        BaseDocTemplate,
        Frame,
        HRFlowable,
        ListFlowable,
        ListItem,
        PageBreak,
        PageTemplate,
        Paragraph,
        Spacer,
    )
except ImportError as exc:
    raise SystemExit(
        "ReportLab is required. Use the Codex bundled Python runtime or install reportlab."
    ) from exc


INK = colors.HexColor("#202124")
MUTED = colors.HexColor("#5F6368")
ACCENT = colors.HexColor("#8B2E2E")
RULE = colors.HexColor("#DADCE0")
PAPER = colors.HexColor("#FFFFFF")
FONT_NAME = "STSong-Light"


def register_chinese_font() -> str:
    """Prefer an embedded Unicode font; CID fallback can render blank in some Poppler builds."""
    global FONT_NAME
    candidates = [
        Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
        Path("/Library/Fonts/Arial Unicode.ttf"),
        Path("/System/Library/Fonts/Hiragino Sans GB.ttc"),
        Path("/System/Library/Fonts/STHeiti Medium.ttc"),
    ]
    for candidate in candidates:
        if not candidate.exists():
            continue
        try:
            pdfmetrics.registerFont(TTFont("ScholarCN", str(candidate)))
            pdfmetrics.registerFontFamily(
                "ScholarCN", normal="ScholarCN", bold="ScholarCN", italic="ScholarCN", boldItalic="ScholarCN"
            )
            FONT_NAME = "ScholarCN"
            return FONT_NAME
        except Exception:
            continue
    pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))
    pdfmetrics.registerFontFamily(
        "STSong-Light",
        normal="STSong-Light",
        bold="STSong-Light",
        italic="STSong-Light",
        boldItalic="STSong-Light",
    )
    print("WARN: no embeddable Unicode font found; CID fallback may render blank in some PDF viewers", file=sys.stderr)
    return FONT_NAME


def inline_markup(text: str) -> str:
    """Escape XML and support bold/code without accepting arbitrary HTML."""
    tokens = re.split(r"(\*\*.+?\*\*|`.+?`)", text)
    rendered = []
    for token in tokens:
        if token.startswith("**") and token.endswith("**"):
            rendered.append(f"<b>{html.escape(token[2:-2])}</b>")
        elif token.startswith("`") and token.endswith("`"):
            rendered.append(f"<font color='#8B2E2E'>{html.escape(token[1:-1])}</font>")
        else:
            rendered.append(html.escape(token))
    return "".join(rendered)


def make_styles() -> dict[str, ParagraphStyle]:
    font_name = register_chinese_font()
    base = getSampleStyleSheet()
    return {
        "cover": ParagraphStyle(
            "Cover",
            parent=base["Title"],
            fontName=font_name,
            fontSize=27,
            leading=39,
            textColor=INK,
            alignment=TA_LEFT,
            spaceAfter=18,
            wordWrap="CJK",
        ),
        "cover_meta": ParagraphStyle(
            "CoverMeta",
            parent=base["BodyText"],
            fontName=font_name,
            fontSize=11,
            leading=22,
            textColor=MUTED,
            wordWrap="CJK",
        ),
        "h1": ParagraphStyle(
            "Heading1CN",
            parent=base["Heading1"],
            fontName=font_name,
            fontSize=21,
            leading=30,
            textColor=INK,
            spaceBefore=10,
            spaceAfter=12,
            keepWithNext=True,
            wordWrap="CJK",
        ),
        "h2": ParagraphStyle(
            "Heading2CN",
            parent=base["Heading2"],
            fontName=font_name,
            fontSize=16,
            leading=24,
            textColor=ACCENT,
            spaceBefore=16,
            spaceAfter=9,
            keepWithNext=True,
            wordWrap="CJK",
        ),
        "h3": ParagraphStyle(
            "Heading3CN",
            parent=base["Heading3"],
            fontName=font_name,
            fontSize=13,
            leading=20,
            textColor=INK,
            spaceBefore=13,
            spaceAfter=7,
            keepWithNext=True,
            wordWrap="CJK",
        ),
        "body": ParagraphStyle(
            "BodyCN",
            parent=base["BodyText"],
            fontName=font_name,
            fontSize=10.5,
            leading=18,
            textColor=INK,
            alignment=TA_JUSTIFY,
            firstLineIndent=21,
            spaceAfter=7,
            wordWrap="CJK",
            allowWidows=0,
            allowOrphans=0,
        ),
        "compact": ParagraphStyle(
            "CompactCN",
            parent=base["BodyText"],
            fontName=font_name,
            fontSize=9.7,
            leading=16,
            textColor=INK,
            alignment=TA_LEFT,
            spaceAfter=3,
            wordWrap="CJK",
        ),
        "quote": ParagraphStyle(
            "QuoteCN",
            parent=base["BodyText"],
            fontName=font_name,
            fontSize=9.5,
            leading=16,
            leftIndent=12,
            borderColor=ACCENT,
            borderWidth=1.5,
            borderPadding=(2, 0, 2, 8),
            textColor=MUTED,
            wordWrap="CJK",
        ),
    }


class ReportDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str, title: str):
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=22 * mm,
            rightMargin=20 * mm,
            topMargin=21 * mm,
            bottomMargin=19 * mm,
            title=title,
            author="Researcher Portrait Agent",
            subject="Scholar research portrait and paper cards",
        )
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="body")
        self.addPageTemplates(PageTemplate(id="report", frames=[frame], onPage=self.decorate_page))
        self.report_title = title

    def decorate_page(self, canvas, doc) -> None:
        canvas.saveState()
        canvas.setFillColor(PAPER)
        canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        if doc.page > 1:
            canvas.setFont(FONT_NAME, 8)
            canvas.setFillColor(MUTED)
            canvas.drawString(doc.leftMargin, A4[1] - 12 * mm, self.report_title[:42])
            canvas.setStrokeColor(RULE)
            canvas.line(doc.leftMargin, 15 * mm, A4[0] - doc.rightMargin, 15 * mm)
            canvas.drawRightString(A4[0] - doc.rightMargin, 10 * mm, str(doc.page))
        canvas.restoreState()


def list_flowable(items: list[str], ordered: bool, styles: dict[str, ParagraphStyle]):
    flow_items = [ListItem(Paragraph(inline_markup(item), styles["compact"]), leftIndent=8) for item in items]
    return ListFlowable(
        flow_items,
        bulletType="1" if ordered else "bullet",
        start="1",
        leftIndent=20,
        bulletFontName=FONT_NAME,
        bulletFontSize=9,
        spaceAfter=7,
    )


def markdown_story(markdown: str, styles: dict[str, ParagraphStyle]) -> tuple[str, list]:
    lines = markdown.splitlines()
    story = []
    title = "学者研究画像"
    index = 0

    while index < len(lines) and not lines[index].strip():
        index += 1
    if index < len(lines) and lines[index].startswith("# "):
        title = lines[index][2:].strip()
        index += 1
        meta = []
        while index < len(lines) and lines[index].strip() != "---":
            if lines[index].strip():
                meta.append(lines[index].strip().rstrip("  "))
            index += 1
        if index < len(lines) and lines[index].strip() == "---":
            index += 1
        story += [
            Spacer(1, 46 * mm),
            HRFlowable(width="18%", thickness=3, color=ACCENT, hAlign="LEFT", spaceAfter=14),
            Paragraph(inline_markup(title), styles["cover"]),
            Spacer(1, 7 * mm),
            Paragraph("<br/>".join(inline_markup(item) for item in meta), styles["cover_meta"]),
            PageBreak(),
        ]

    paragraph: list[str] = []

    def flush_paragraph() -> None:
        if paragraph:
            joined = " ".join(part.strip().rstrip("  ") for part in paragraph)
            story.append(Paragraph(inline_markup(joined), styles["body"]))
            paragraph.clear()

    while index < len(lines):
        line = lines[index]
        stripped = line.strip()
        if not stripped:
            flush_paragraph()
            index += 1
            continue
        if stripped == "---":
            flush_paragraph()
            story.append(HRFlowable(width="100%", thickness=0.6, color=RULE, spaceBefore=6, spaceAfter=9))
            index += 1
            continue
        heading = re.match(r"^(#{1,3})\s+(.+)$", stripped)
        if heading:
            flush_paragraph()
            level = len(heading.group(1))
            heading_text = heading.group(2)
            if heading_text.startswith("第二部分"):
                story.append(PageBreak())
            story.append(Paragraph(inline_markup(heading_text), styles[f"h{level}"]))
            index += 1
            continue
        if stripped.startswith("> "):
            flush_paragraph()
            story.append(Paragraph(inline_markup(stripped[2:]), styles["quote"]))
            index += 1
            continue
        bullet = re.match(r"^[-*]\s+(.+)$", stripped)
        numbered = re.match(r"^\d+\.\s+(.+)$", stripped)
        if bullet or numbered:
            flush_paragraph()
            ordered = bool(numbered)
            items = []
            while index < len(lines):
                candidate = lines[index].strip()
                match = re.match(r"^\d+\.\s+(.+)$", candidate) if ordered else re.match(r"^[-*]\s+(.+)$", candidate)
                if not match:
                    break
                items.append(match.group(1).rstrip("  "))
                index += 1
                while index < len(lines) and lines[index].startswith("  ") and lines[index].strip():
                    items[-1] += " " + lines[index].strip()
                    index += 1
            story.append(list_flowable(items, ordered, styles))
            continue
        paragraph.append(stripped)
        index += 1

    flush_paragraph()
    return title, story


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    input_path = Path(args.input).expanduser().resolve()
    output_path = Path(args.output).expanduser().resolve()
    if not input_path.exists():
        raise SystemExit(f"Input not found: {input_path}")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    styles = make_styles()
    title, story = markdown_story(input_path.read_text(encoding="utf-8"), styles)
    document = ReportDocTemplate(str(output_path), title)
    document.build(story)
    print(output_path)


if __name__ == "__main__":
    main()
