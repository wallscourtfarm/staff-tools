#!/usr/bin/env python3
"""QR sticker labels sized to fit real label sheets Innes already owns.

Geometry ported EXACTLY from staff-tools/drawer-peg-labels/index.html's
LABEL_CONFIG (its jsPDF renderer, lines ~242-345 and the per-cell position
formula at ~905-920) so these print in alignment on the same physical
stock that tool's pupil-name labels already use. Do not hand-tune these
numbers — if the drawer-peg-labels calibration ever changes, re-copy it
from there rather than re-deriving from scratch.

Two sizes:
  avery       — 38x21mm, 65/sheet (5 cols x 13 rows). Very little room:
                QR code only, no text (a QR that small can't also carry
                readable text).
  label64x34  — 64x34mm, 24/sheet (3 cols x 8 rows). Room for a one-line
                title + QR + "Scan me!" caption.
"""
import json
import io
import urllib.request
import urllib.parse
import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib.units import mm

API_URL = "https://script.google.com/macros/s/AKfycbyXw7lwvL5O1xJApGdKGM_R-zQDfbC_kWZcAf9yUS0VwOjmVWnigAsDEcfxbwjoAe1B/exec"
TOKEN = "2013"
BASE_URL = "https://staff.wallscourt-farm-academy.co.uk/reading-quiz/"

# ── Geometry ported from drawer-peg-labels/index.html LABEL_CONFIG (mm) ──
AVERY = dict(
    border=1.5, cols=5, rows=13, perSheet=65,
    nameimageW=35, nameimageH=17, nameimageLeft=9, nameimageGapX=5,
    colOffsets=[-4, -2, 0, 1, 4],
    nameimageTop=11, nameimageGapY=3,
    rowOffsets=[-3, -1, 1, 2, 4, 7, 10, 12, 14, 16, 18, 20, 22],
)
LABEL64x34 = dict(
    width=63.5, height=34, border=2, cols=3, rows=8, perSheet=24, gap=2.52,
    fixedMarginLeft=9.4, fixedMarginTop=5.05,
    colOffsets=[-4, -1, 1],
    rowOffsets=[2, 1, 0, -1, -2.5, -3, -4, -6],
    insetY=1,
)


def fetch_books():
    payload = urllib.parse.quote(json.dumps({"action": "getAll"}))
    url = f"{API_URL}?payload={payload}&token={TOKEN}"
    with urllib.request.urlopen(url) as r:
        data = json.load(r)
    if data.get("error"):
        raise RuntimeError(data["error"])
    return data["books"]


def make_qr_reader(book_id, box_size=6):
    url = BASE_URL + "?book=" + book_id
    img = qrcode.make(url, box_size=box_size, border=1)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return ImageReader(buf)


def draw_avery_sheet(c, books):
    """65 QR-only labels per A4 portrait sheet, 5x13, exact drawer-peg-labels geometry."""
    cfg = AVERY
    per_sheet = cfg["perSheet"]
    for sheet_start in range(0, len(books), per_sheet):
        sheet_books = books[sheet_start:sheet_start + per_sheet]
        for i, book in enumerate(sheet_books):
            row, col = divmod(i, cfg["cols"])
            lx = (cfg["nameimageLeft"] + col * (cfg["nameimageW"] + cfg["nameimageGapX"])
                  + cfg["colOffsets"][col]) * mm
            ly_top_mm = (cfg["nameimageTop"] + row * (cfg["nameimageH"] + cfg["nameimageGapY"])
                         + cfg["rowOffsets"][row])
            lw = cfg["nameimageW"] * mm
            lh = cfg["nameimageH"] * mm
            border = cfg["border"] * mm
            # jsPDF y is measured from the TOP of a portrait A4 page; reportlab's
            # origin is bottom-left, so convert: pdf_y_from_bottom = pageH - ly_top - lh
            page_h = 297 * mm
            ly = page_h - (ly_top_mm * mm) - lh

            # Coloured border box (brand blue) + white inner, same visual language
            # as drawer-peg-labels' coloured-border-plus-white-inner pattern.
            c.setFillColorRGB(0.09, 0.6, 0.83)
            c.rect(lx, ly, lw, lh, fill=1, stroke=0)
            c.setFillColorRGB(1, 1, 1)
            c.rect(lx + border, ly + border, lw - 2 * border, lh - 2 * border, fill=1, stroke=0)

            inner_w = lw - 2 * border
            inner_h = lh - 2 * border
            qr_size = min(inner_w, inner_h) - 2  # 2pt breathing room
            qr_x = lx + border + (inner_w - qr_size) / 2
            qr_y = ly + border + (inner_h - qr_size) / 2
            c.drawImage(make_qr_reader(book["id"], box_size=4), qr_x, qr_y,
                        width=qr_size, height=qr_size, mask='auto')
        c.showPage()


def wrap_or_shrink_one_line(c, text, font, size, max_width, min_size=6):
    """Shrink font until text fits on one line; truncate with … if still too wide at min_size."""
    for try_size in range(int(size), min_size - 1, -1):
        if c.stringWidth(text, font, try_size) <= max_width:
            return text, try_size
    # Truncate at min_size
    s = text
    while c.stringWidth(s + "…", font, min_size) > max_width and len(s) > 1:
        s = s[:-1]
    return s + "…", min_size


def draw_label64_sheet(c, books):
    """24 labels/sheet, 3x8, title + QR + caption — exact drawer-peg-labels geometry."""
    cfg = LABEL64x34
    per_sheet = cfg["perSheet"]
    page_h = 297 * mm
    for sheet_start in range(0, len(books), per_sheet):
        sheet_books = books[sheet_start:sheet_start + per_sheet]
        for i, book in enumerate(sheet_books):
            row, col = divmod(i, cfg["cols"])
            x_mm = cfg["fixedMarginLeft"] + col * (cfg["width"] + cfg["gap"])
            y_top_mm = cfg["fixedMarginTop"] + row * (cfg["height"] + cfg["gap"])
            lx = (x_mm + cfg["colOffsets"][col]) * mm
            ly_top_mm = y_top_mm + cfg["insetY"] + cfg["rowOffsets"][row]
            lw = cfg["width"] * mm
            lh = (cfg["height"] - 2 * cfg["insetY"]) * mm
            ly = page_h - (ly_top_mm * mm) - lh
            border = cfg["border"] * mm

            c.setFillColorRGB(0.09, 0.6, 0.83)
            c.rect(lx, ly, lw, lh, fill=1, stroke=0)
            c.setFillColorRGB(1, 1, 1)
            inner_w = lw - 2 * border
            inner_h = lh - 2 * border
            inner_x = lx + border
            inner_y = ly + border
            c.rect(inner_x, inner_y, inner_w, inner_h, fill=1, stroke=0)

            pad = 3
            usable_w = inner_w - 2 * pad
            content_top = inner_y + inner_h - pad

            # Title — one line, auto-shrink, truncate if still too long.
            title, title_size = wrap_or_shrink_one_line(c, book["title"], "Helvetica-Bold", 9, usable_w)
            title_ascender = title_size * 0.72
            title_baseline = content_top - title_ascender
            c.setFont("Helvetica-Bold", title_size)
            c.setFillColorRGB(0.06, 0.06, 0.06)
            c.drawCentredString(inner_x + inner_w / 2, title_baseline, title)
            title_bottom = title_baseline - title_size * 0.15

            # Caption at the very bottom.
            caption_size = 6.5
            caption_ascender = caption_size * 0.72
            caption_baseline = inner_y + pad
            c.setFont("Helvetica-Bold", caption_size)
            c.setFillColorRGB(0.09, 0.6, 0.83)
            c.drawCentredString(inner_x + inner_w / 2, caption_baseline, "SCAN WHEN FINISHED")
            caption_top = caption_baseline + caption_ascender + 2

            # QR fills the remaining vertical space between title and caption.
            qr_avail_h = title_bottom - caption_top
            qr_avail_w = usable_w
            qr_size = min(qr_avail_h, qr_avail_w)
            qr_x = inner_x + (inner_w - qr_size) / 2
            qr_y = caption_top + (qr_avail_h - qr_size) / 2
            c.drawImage(make_qr_reader(book["id"], box_size=5), qr_x, qr_y,
                        width=qr_size, height=qr_size, mask='auto')

            assert qr_y >= inner_y - 0.5, f"QR overflows bottom for {book['title']!r}"
            assert qr_y + qr_size <= inner_y + inner_h + 0.5, f"QR overflows top for {book['title']!r}"
        c.showPage()


def main():
    import sys
    books = fetch_books()
    books.sort(key=lambda b: (b["phase"], b["title"]))

    out_dir = sys.argv[1] if len(sys.argv) > 1 else "."

    c1 = canvas.Canvas(f"{out_dir}/reading-quiz-labels-avery-38x21mm.pdf", pagesize=A4)
    draw_avery_sheet(c1, books)
    c1.save()

    c2 = canvas.Canvas(f"{out_dir}/reading-quiz-labels-64x34mm.pdf", pagesize=A4)
    draw_label64_sheet(c2, books)
    c2.save()

    print(f"{len(books)} books -> avery (65/sheet): {(len(books)+64)//65} sheet(s); "
          f"64x34mm (24/sheet): {(len(books)+23)//24} sheet(s)")


if __name__ == "__main__":
    main()
