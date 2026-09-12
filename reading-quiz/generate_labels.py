#!/usr/bin/env python3
"""Generate a printable sheet of QR-code labels, one per Reading Challenge
book, to stick inside the front cover. Scanning the QR takes the child to
staff.wallscourt-farm-academy.co.uk/reading-quiz/?book=<bookId>.

Layout: A4 portrait, 2 columns x 3 rows = 6 labels/page. Coordinates are
computed top-down from content needs (per reportlab-pdf-creation rules),
not eyeballed.
"""
import json
import io
import urllib.request
import urllib.parse
import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

API_URL = "https://script.google.com/macros/s/AKfycbyXw7lwvL5O1xJApGdKGM_R-zQDfbC_kWZcAf9yUS0VwOjmVWnigAsDEcfxbwjoAe1B/exec"
TOKEN = "2013"

PAGE_W, PAGE_H = A4  # 595.27, 841.89
MARGIN = 36
COLS, ROWS = 2, 3
GAP_X, GAP_Y = 16, 16

USABLE_W = PAGE_W - 2 * MARGIN
USABLE_H = PAGE_H - 2 * MARGIN
CELL_W = (USABLE_W - (COLS - 1) * GAP_X) / COLS
CELL_H = (USABLE_H - (ROWS - 1) * GAP_Y) / ROWS

QR_SIZE = 120
PAD = 12
TITLE_SIZE = 13
TITLE_LEADING = 16
AUTHOR_SIZE = 9.5
CAPTION_SIZE = 9.5

BASE_URL = "https://staff.wallscourt-farm-academy.co.uk/reading-quiz/"


def wrap_to_width(c, text, font, size, max_width, max_lines):
    """Greedy word-wrap; if it still doesn't fit in max_lines, shrink font
    size in 1pt steps (down to size-3) before truncating with an ellipsis."""
    for try_size in [size, size - 1, size - 2, size - 3]:
        words = text.split()
        lines, cur = [], ""
        for w in words:
            test = (cur + " " + w).strip()
            if c.stringWidth(test, font, try_size) <= max_width:
                cur = test
            else:
                if cur:
                    lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        if len(lines) <= max_lines:
            return lines, try_size
    # Still too long at smallest size — truncate last allowed line
    lines = lines[:max_lines]
    last = lines[-1]
    while c.stringWidth(last + "…", font, try_size) > max_width and len(last) > 1:
        last = last[:-1]
    lines[-1] = last + "…"
    return lines, try_size


def draw_label(c, x, y_top, book):
    """x, y_top = top-left corner of this label's cell."""
    # Cut-line border, fully containing everything drawn inside.
    c.setStrokeColorRGB(0.75, 0.75, 0.75)
    c.setLineWidth(0.75)
    c.setDash([3, 3], 0)
    c.rect(x, y_top - CELL_H, CELL_W, CELL_H, fill=0, stroke=1)
    c.setDash()

    inner_w = CELL_W - 2 * PAD
    cx = x + CELL_W / 2  # horizontal center of the cell

    # ---- Title (up to 2 lines, auto-shrinks to fit) ----
    font = "Helvetica-Bold"
    title_lines, title_size = wrap_to_width(c, book["title"], font, TITLE_SIZE, inner_w, 2)
    ascender = title_size * 0.72
    content_top = y_top - PAD
    baseline = content_top - ascender
    c.setFont(font, title_size)
    c.setFillColorRGB(0.06, 0.06, 0.06)
    for i, line in enumerate(title_lines):
        ly = baseline - i * TITLE_LEADING
        c.drawCentredString(cx, ly, line)
    title_block_bottom = baseline - (len(title_lines) - 1) * TITLE_LEADING - (title_size * 0.12)

    # ---- Author ----
    author_gap = 6
    author_ascender = AUTHOR_SIZE * 0.72
    author_baseline = title_block_bottom - author_gap - author_ascender
    c.setFont("Helvetica-Oblique", AUTHOR_SIZE)
    c.setFillColorRGB(0.4, 0.4, 0.4)
    c.drawCentredString(cx, author_baseline, book["author"] or " ")
    author_block_bottom = author_baseline - (AUTHOR_SIZE * 0.2)

    # ---- QR code ----
    qr_gap_above = 10
    qr_top = author_block_bottom - qr_gap_above
    qr_x = cx - QR_SIZE / 2
    qr_y = qr_top - QR_SIZE  # bottom-left corner for drawImage
    url = BASE_URL + "?book=" + book["id"]
    qr_img = qrcode.make(url, box_size=8, border=1)
    buf = io.BytesIO()
    qr_img.save(buf, format="PNG")
    buf.seek(0)
    c.drawImage(ImageReader(buf), qr_x, qr_y, width=QR_SIZE, height=QR_SIZE,
                preserveAspectRatio=True, mask='auto')

    # ---- Caption ----
    caption_gap = 8
    caption_ascender = CAPTION_SIZE * 0.72
    caption_baseline = qr_y - caption_gap - caption_ascender
    c.setFont("Helvetica-Bold", CAPTION_SIZE)
    c.setFillColorRGB(0.09, 0.6, 0.83)  # brand blue
    c.drawCentredString(cx, caption_baseline, "FINISHED? SCAN ME!")

    # Containment check (per skill rule 3/verification): caption baseline
    # descender must stay above the cell's bottom edge with margin.
    cell_bottom = y_top - CELL_H
    assert caption_baseline - (CAPTION_SIZE * 0.3) > cell_bottom + 4, \
        f"label for {book['title']!r} overflows its cell"


def fetch_books():
    payload = urllib.parse.quote(json.dumps({"action": "getAll"}))
    url = f"{API_URL}?payload={payload}&token={TOKEN}"
    with urllib.request.urlopen(url) as r:
        data = json.load(r)
    if data.get("error"):
        raise RuntimeError(data["error"])
    return data["books"]


def main():
    import sys
    books = fetch_books()
    books = sorted(books, key=lambda b: (b["phase"], b["title"]))

    out_path = sys.argv[1] if len(sys.argv) > 1 else "reading-quiz-qr-labels.pdf"
    c = canvas.Canvas(out_path, pagesize=A4)

    per_page = COLS * ROWS
    for page_start in range(0, len(books), per_page):
        page_books = books[page_start:page_start + per_page]
        for i, book in enumerate(page_books):
            row, col = divmod(i, COLS)
            x = MARGIN + col * (CELL_W + GAP_X)
            y_top = PAGE_H - MARGIN - row * (CELL_H + GAP_Y)
            draw_label(c, x, y_top, book)
        # Footer with cut instructions + page count
        c.setFont("Helvetica", 8)
        c.setFillColorRGB(0.6, 0.6, 0.6)
        c.drawCentredString(PAGE_W / 2, 14, "WFA Reading Challenge — cut along dotted lines and stick inside the book's front cover")
        c.showPage()

    c.save()
    print(f"Wrote {out_path} — {len(books)} labels across {(len(books) + per_page - 1)//per_page} pages")


if __name__ == "__main__":
    main()
