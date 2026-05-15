"""ReportLab PDF generation for Spelling Tracker sheets.

Uses Sassoon Infant TTF font for words, Helvetica/Times for other text.
Produces properly formatted HL, TT, Bee, and Handout sheets.
"""

import os
import random
from io import BytesIO

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, black, white, Color
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Table, TableStyle, Paragraph, SimpleDocTemplate
from reportlab.platypus.flowables import Flowable
from reportlab.pdfgen import canvas

FONT_DIR = os.path.join(os.path.dirname(__file__), 'fonts')

def register_fonts():
    pdfmetrics.registerFont(TTFont('Sassoon', os.path.join(FONT_DIR, 'SassoonInfant.ttf')))
    pdfmetrics.registerFont(TTFont('SassoonLine', os.path.join(FONT_DIR, 'SassoonInfantLine.ttf')))

register_fonts()

BRAND = HexColor('#1798d3')
PAIR_COLORS = [
    '#E53935','#FB8C00','#FDD835','#43A047','#1E88E5',
    '#8E24AA','#00ACC1','#C0CA33','#3949AB','#D81B60',
    '#6D4C41','#546E7A','#00897B','#7CB342','#5E35B1',
]

def pair_color(n):
    return HexColor(PAIR_COLORS[(int(n) - 1) % len(PAIR_COLORS)])

def contrast_color(hex_color):
    r = int(hex_color.red * 255)
    g = int(hex_color.green * 255)
    b = int(hex_color.blue * 255)
    return black if (r*0.299 + g*0.587 + b*0.114) > 150 else white


# ─── HL SHEET ────────────────────────────────────────────────────────────

def generate_hl_pdf(pupils, rules, weeks, current_week_id, hl_content, adapted_pupils=None):
    """Generate Home Learning PDF (landscape A4, 2 pages per pupil)."""
    buf = BytesIO()
    doc = canvas.Canvas(buf, pagesize=landscape(A4))
    PW, PH = landscape(A4)
    # Sheet: 277mm x 190mm, padding 12mm L/R 8mm T/B
    ML = (PW - 277*mm) / 2 + 12*mm  # centre + pad
    MT = (PH - 190*mm) / 2 + 8*mm
    CW = 277*mm - 24*mm  # content width

    current_week = next((w for w in weeks if w['id'] == current_week_id), None) if current_week_id else None
    current_rule = next((r for r in rules if r['id'] == current_week['ruleId']), None) if current_week else None

    for pi, p in enumerate(pupils):
        if pi > 0:
            doc.showPage()

        is_adapted = (adapted_pupils or []) and p['id'] in adapted_pupils
        maths = (hl_content.get('mathsAdapted','') if is_adapted and hl_content.get('mathsAdapted') else '') or hl_content.get('maths','') or '[Maths content]'
        reading = (hl_content.get('readingAdapted','') if is_adapted and hl_content.get('readingAdapted') else '') or hl_content.get('reading','') or '[Reading content]'
        tt = p.get('ttSet') or 'All'
        label = hl_content.get('label','') or 'Home Learning'

        # Get words for this pupil
        rule_title = 'Spelling Rule'
        explanation = ''
        all_words = []
        if current_rule:
            rule_title = f"{current_rule['year']} Step {current_rule['step']}: {current_rule['title']}"
            explanation = current_rule.get('explanation','')
            all_words = list(current_rule.get('words', [])[:5])
        # Add key spellings if available
        ks_words = _pick_key_spellings(p, rules, weeks, current_week_id)
        if ks_words:
            all_words = ks_words + all_words

        # ── PAGE 1 ──
        y = MT
        # Header
        doc.setFont('Times-Bold', 11)
        doc.drawCentredString(PW/2, PH - y + 2, f'{label} — {p["firstName"]} {p["lastName"]}')
        y += 5
        doc.setStrokeColor(BRAND)
        doc.setLineWidth(1.5)
        doc.line(ML, PH - y, PW - ML + 12*mm, PH - y)
        doc.setStrokeColor(black)
        doc.setLineWidth(0.5)
        y += 8

        # Two columns (8mm gap)
        gap = 8*mm
        col_w = (CW - gap) / 2
        col1_x = ML
        col2_x = ML + col_w + gap
        content_top = y + 3
        content_h = PH - MT - 8*mm - content_top - 12*mm  # leave room for footer

        # Left column: Being a Mathematician
        doc.setFont('Times-Bold', 9)
        doc.drawString(col1_x, PH - y, 'BEING A MATHEMATICIAN')
        doc.setLineWidth(0.5)
        doc.line(col1_x, PH - y - 2, col1_x + col_w, PH - y - 2)
        # Bordered content area
        doc.rect(col1_x, PH - content_top - content_h, col_w, content_h)
        doc.setFont('Times-Roman', 7.5)
        _draw_text_block(doc, maths, col1_x + 3*mm, PH - content_top - 3*mm, col_w - 6*mm, content_h - 6*mm, 'Times-Roman', 7.5, 1.45)

        # Right column: Being a Reader
        doc.setFont('Times-Bold', 9)
        doc.drawString(col2_x, PH - y, 'BEING A READER')
        doc.line(col2_x, PH - y - 2, col2_x + col_w, PH - y - 2)
        doc.rect(col2_x, PH - content_top - content_h, col_w, content_h)
        doc.setFont('Times-Roman', 7.5)
        _draw_text_block(doc, reading, col2_x + 3*mm, PH - content_top - 3*mm, col_w - 6*mm, content_h - 6*mm, 'Times-Roman', 7.5, 1.45)

        # Footer
        doc.setFont('Times-Italic', 7.5)
        doc.drawString(ML, MT + 4*mm, f'This week, please practise {tt} times table(s).')

        # ── PAGE 2 ──
        doc.showPage()
        y = MT
        # Title + login
        doc.setFont('Times-Bold', 10)
        doc.drawString(ML, PH - y, 'Personal Key Spellings and Weekly Spelling Rule Words')
        doc.setFont('Times-Roman', 7.5)
        doc.drawRightString(PW - ML + 12*mm, PH - y, f'Spelling Shed — {p.get("ssUser","-")} / {p.get("ssPassword","-")}')
        y += 3
        doc.setStrokeColor(BRAND)
        doc.setLineWidth(1.5)
        doc.line(ML, PH - y, PW - ML + 12*mm, PH - y)
        doc.setStrokeColor(black)
        doc.setLineWidth(0.5)
        y += 6

        # Instruction
        doc.setFont('Times-Roman', 7.5)
        instr = f'The first 5 words below are your Key Spellings. This week\'s spelling rule – {rule_title}. {explanation} Practise spelling these words. Write each word within a sentence in the space below.'
        _draw_text_block(doc, instr, ML, PH - y, CW, 20*mm, 'Times-Roman', 7.5, 1.3)
        y += 16

        # Word table
        if all_words:
            word_col_w = CW * 0.22
            space_col_w = CW * 0.78
            avail_h = PH - MT - 8*mm - y - 5*mm
            row_h = min(14*mm, max(10*mm, avail_h / len(all_words)))

            for i, word in enumerate(all_words):
                row_y = PH - y - row_h
                # Row border
                doc.setStrokeColor(HexColor('#333333'))
                doc.setLineWidth(0.3)
                doc.rect(ML, row_y, CW, row_h)
                # Vertical divider
                doc.line(ML + word_col_w, row_y, ML + word_col_w, row_y + row_h)
                # Word
                doc.setFont('Sassoon', 9.5)
                doc.drawString(ML + 2*mm, row_y + row_h * 0.55, f'{i+1}. {word}')
                # Writing lines
                doc.setStrokeColor(HexColor('#bbbbbb'))
                doc.setLineWidth(0.2)
                lx1 = ML + word_col_w + 2*mm
                lx2 = ML + CW - 2*mm
                doc.line(lx1, row_y + row_h * 0.4, lx2, row_y + row_h * 0.4)
                doc.line(lx1, row_y + row_h * 0.75, lx2, row_y + row_h * 0.75)
                doc.setStrokeColor(black)
                y += row_h

    doc.save()
    buf.seek(0)
    return buf


def _pick_key_spellings(pupil, rules, weeks, current_week_id):
    """Pick 5 key spelling words for a pupil based on their pair."""
    pair_id = pupil.get('pairId') or 1
    pair_index = (int(pair_id) - 1) % 15
    # Use pair index to select from appropriate rule
    current_week = next((w for w in weeks if w['id'] == current_week_id), None) if current_week_id else None
    if not current_week:
        return []
    rule = next((r for r in rules if r['id'] == current_week['ruleId']), None)
    if not rule:
        return []
    words = rule.get('words', [])
    if len(words) <= 5:
        return words
    # Rotate selection based on pair index
    start = (pair_index * 3) % len(words)
    selected = []
    for j in range(5):
        idx = (start + j) % len(words)
        if words[idx] not in selected:
            selected.append(words[idx])
        if len(selected) >= 5:
            break
    return selected[:5]


def _draw_text_block(canvas, text, x, y, max_width, max_height, font_name, font_size, line_height):
    """Draw wrapped text within a bounding box. y is top-left."""
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import Paragraph
    style = ParagraphStyle('tb', fontName=font_name, fontSize=font_size,
                            leading=font_size * line_height)
    p = Paragraph(text.replace('\n', '<br/>'), style)
    w, h = p.wrap(max_width, max_height)
    p.drawOn(canvas, x, y - h)


# ─── TT SHEET ────────────────────────────────────────────────────────────

def generate_tt_pdf(pupils):
    """Generate Times Table PDF (landscape A4, 2 pupils per page)."""
    buf = BytesIO()
    doc = canvas.Canvas(buf, pagesize=landscape(A4))
    PW, PH = landscape(A4)
    # Sheet: 277mm x 190mm, padding 8mm L/R 5mm T/B
    ML = (PW - 277*mm) / 2 + 8*mm
    MT = (PH - 190*mm) / 2 + 5*mm
    IW = 277*mm - 16*mm  # inner width
    IH = 190*mm - 10*mm  # inner height
    GAP = 8*mm
    COL_W = (IW - GAP) / 2

    for i in range(0, len(pupils), 2):
        if i > 0:
            doc.showPage()
        pair = [pupils[i], pupils[i+1] if i+1 < len(pupils) else None]

        for col, p in enumerate(pair):
            if not p:
                continue
            x = ML + col * (COL_W + GAP)
            w = COL_W
            y_top = PH - MT

            # Outer border (2px ≈ 0.5mm)
            doc.setStrokeColor(black)
            doc.setLineWidth(1.0)
            doc.rect(x, PH - MT - IH, w, IH)

            # Inner padding: 4mm T/B, 5mm L/R
            px = x + 5*mm
            pw = w - 10*mm
            cy = y_top - 4*mm

            # Name line
            doc.setFont('Helvetica-Bold', 10)
            name_y = cy - 3*mm
            doc.drawString(px, PH - name_y - 3*mm, f'{p["firstName"]} {p["lastName"]}')
            # Underline
            doc.setLineWidth(0.5)
            doc.line(px, PH - name_y - 4.5*mm, px + pw - 26*mm, PH - name_y - 4.5*mm)
            # Score box
            doc.setLineWidth(0.3)
            doc.rect(px + pw - 24*mm, PH - name_y, 24*mm, 8*mm)
            doc.setFont('Helvetica', 6)
            doc.drawCentredString(px + pw - 12*mm, PH - name_y + 5.5*mm, 'Score / Time')
            doc.drawCentredString(px + pw - 12*mm, PH - name_y + 1*mm, '___ / ___')

            cy = name_y + 10*mm
            # Set label
            set_val = p.get('ttSet') or 'All'
            set_label = '2,5,3,4,6,8,7,9,11,12 x' if set_val == 'All' else f'{set_val} x'
            doc.setFont('Helvetica-Bold', 9)
            label_w = doc.stringWidth(set_label, 'Helvetica-Bold', 9) + 4*mm
            label_x = x + (w - label_w) / 2
            label_y = PH - cy - 6*mm
            doc.rect(label_x, label_y, label_w, 6*mm)
            doc.drawCentredString(x + w/2, label_y + 1.5*mm, set_label)

            cy += 14*mm

            # Questions
            nums = [2,3,4,5,6,7,8,9,10,11,12] if set_val == 'All' else [int(set_val) or 2]
            qs = []
            for _ in range(40):
                n = random.choice(nums)
                m = random.randint(1, 12)
                qs.append((m, n))

            # Draw 2-column question grid
            col1_x = px
            col2_x = px + pw/2 + 2*mm
            q_area_top = cy
            q_area_h = IH - (cy - 4*mm) - 4*mm
            row_h = q_area_h / 20

            # Table grid
            doc.setFont('Helvetica', 7)
            doc.setLineWidth(0.2)

            for r in range(20):
                ry = PH - cy - r * row_h
                # Left column question
                q1 = qs[r]
                q2 = qs[r + 20]
                # Row line
                doc.line(px, ry - row_h, px + pw, ry - row_h)
                if r == 0:
                    doc.line(px, ry, px + pw, ry)
                # Left col
                doc.drawString(col1_x, ry - row_h + row_h*0.65, f'{r+1}.')
                doc.drawString(col1_x + 4*mm, ry - row_h + row_h*0.65, f'{q1[0]} × {q1[1]} =')
                # Right col
                if q2:
                    doc.drawString(col2_x, ry - row_h + row_h*0.65, f'{r+21}.')
                    doc.drawString(col2_x + 4*mm, ry - row_h + row_h*0.65, f'{q2[0]} × {q2[1]} =')
                # Column dividers in answer area
                ans_x1 = col1_x + pw * 0.3
                ans_x2 = col2_x + pw * 0.3
                doc.setLineWidth(0.1)
                doc.line(ans_x1, ry - row_h, ans_x1, ry)
                doc.line(ans_x2, ry - row_h, ans_x2, ry)
                doc.setLineWidth(0.2)

            # Centre vertical line
            mid_x = px + pw / 2 + 1*mm
            doc.line(mid_x, PH - cy, mid_x, PH - cy - q_area_h + row_h)

    doc.save()
    buf.seek(0)
    return buf


# ─── BEE SHEET ────────────────────────────────────────────────────────────

def generate_bee_pdf(pupils, rules, weeks, current_week_id, include_writing=False, sort_by='name'):
    """Generate Spelling Bee PDF (portrait A4, 9 strips per page)."""
    buf = BytesIO()
    doc = canvas.Canvas(buf, pagesize=A4)
    PW, PH = A4
    # Sheet: 190mm x 277mm, padding 6mm L/R 4mm T/B
    ML = (PW - 190*mm) / 2 + 6*mm
    MT = (PH - 277*mm) / 2 + 4*mm
    IW = 190*mm - 12*mm  # inner width
    IH = 277*mm - 8*mm   # inner height
    COLS, ROWS = 3, 3
    GAP_H, GAP_V = 3*mm, 2*mm
    SW = (IW - (COLS-1)*GAP_H) / COLS
    SH = (IH - (ROWS-1)*GAP_V) / ROWS

    # Sort pupils
    if sort_by == 'pair':
        pupils = sorted(pupils, key=lambda p: (p.get('pairId',99) or 99, p['firstName']))
    else:
        pupils = sorted(pupils, key=lambda p: p['firstName'])

    per_page = 9

    # Reader sheets
    for page_idx in range(0, len(pupils), per_page):
        if page_idx > 0:
            doc.showPage()
        page_pupils = pupils[page_idx:page_idx+per_page]

        for idx, p in enumerate(page_pupils):
            row, col = divmod(idx, COLS)
            row, col = row, idx % COLS
            # Wait, idx goes 0-8, so:
            row = idx // COLS
            col = idx % COLS

            x0 = ML + col * (SW + GAP_H)
            y0 = MT + (ROWS - 1 - row) * (SH + GAP_V)  # bottom-up for ReportLab

            all_words = _get_pupil_words(p, rules, weeks, current_week_id)
            colour = pair_color(p.get('pairId', 1))
            is_light = contrast_color(colour) == black

            # Coloured name header
            doc.setFillColor(colour)
            doc.roundRect(x0, y0 + SH - 7*mm, SW, 7*mm, 1.5*mm, stroke=0, fill=1)
            doc.setFillColor(white if not is_light else black)
            doc.setFont('Helvetica-Bold', 10)
            doc.drawCentredString(x0 + SW/2, y0 + SH - 4.5*mm, f'{p["firstName"]} {p["lastName"]}')
            doc.setFillColor(black)

            # Word list
            wy = y0 + SH - 9*mm
            doc.setFont('Sassoon', 9)
            row_h = min(5.5*mm, (SH - 9*mm) / max(len(all_words), 1))
            for wi, word in enumerate(all_words):
                if wy < y0 + 2*mm:
                    break
                doc.setFont('Helvetica', 6.5)
                doc.setFillColor(HexColor('#888888'))
                doc.drawString(x0 + 1.5*mm, wy - row_h*0.3, f'{wi+1}.')
                doc.setFillColor(black)
                doc.setFont('Sassoon', 9)
                doc.drawString(x0 + 7*mm, wy - row_h*0.3, word)
                # Row separator
                doc.setStrokeColor(HexColor('#e5e7eb'))
                doc.setLineWidth(0.15)
                doc.line(x0 + 1*mm, wy - row_h, x0 + SW - 1*mm, wy - row_h)
                wy -= row_h

            # Border around word area (below name header)
            doc.setStrokeColor(HexColor('#d1d5db'))
            doc.setLineWidth(0.3)
            doc.rect(x0, y0, SW, SH - 7*mm, fill=0, stroke=1)

            # Dashed cut lines
            doc.setStrokeColor(HexColor('#bbbbbb'))
            doc.setLineWidth(0.2)
            doc.setDash(2, 1.5)
            if row < 2:
                doc.line(x0, y0 - 1*mm, x0 + SW, y0 - 1*mm)
            if col < 2:
                doc.line(x0 + SW + 1.5*mm, y0, x0 + SW + 1.5*mm, y0 + SH)
            doc.setDash()
            doc.setStrokeColor(black)
            doc.setLineWidth(0.5)

    # Writing sheets
    if include_writing:
        for page_idx in range(0, len(pupils), per_page):
            doc.showPage()
            page_pupils = pupils[page_idx:page_idx+per_page]

            for idx in range(len(page_pupils)):
                p = page_pupils[idx]
                row = idx // COLS
                col = idx % COLS
                x0 = ML + col * (SW + GAP_H)
                y0 = MT + (ROWS - 1 - row) * (SH + GAP_V)

                # Blank name header
                doc.setStrokeColor(HexColor('#d1d5db'))
                doc.setLineWidth(0.3)
                doc.roundRect(x0, y0 + SH - 7*mm, SW, 7*mm, 1.5*mm, stroke=1, fill=0)
                doc.setFont('Helvetica', 10)
                doc.drawCentredString(x0 + SW/2, y0 + SH - 4.5*mm, 'Name: ________________')

                # Blank lines
                wy = y0 + SH - 9*mm
                row_h = (SH - 9*mm) / 10
                for wi in range(10):
                    if wy < y0 + 2*mm:
                        break
                    doc.setFont('Helvetica', 6.5)
                    doc.setFillColor(HexColor('#888888'))
                    doc.drawString(x0 + 1.5*mm, wy - row_h*0.3, f'{wi+1}.')
                    doc.setFillColor(black)
                    doc.setStrokeColor(HexColor('#999999'))
                    doc.setLineWidth(0.2)
                    doc.line(x0 + 7*mm, wy - row_h*0.65, x0 + SW - 2*mm, wy - row_h*0.65)
                    wy -= row_h

                # Dashed cut lines
                doc.setStrokeColor(HexColor('#bbbbbb'))
                doc.setLineWidth(0.2)
                doc.setDash(2, 1.5)
                if row < 2:
                    doc.line(x0, y0 - 1*mm, x0 + SW, y0 - 1*mm)
                if col < 2:
                    doc.line(x0 + SW + 1.5*mm, y0, x0 + SW + 1.5*mm, y0 + SH)
                doc.setDash()
                doc.setStrokeColor(black)
                doc.setLineWidth(0.5)

    doc.save()
    buf.seek(0)
    return buf


def _get_pupil_words(pupil, rules, weeks, current_week_id):
    """Get all words for a pupil (key spellings + rule words)."""
    current_week = next((w for w in weeks if w['id'] == current_week_id), None) if current_week_id else None
    if not current_week:
        return []
    rule = next((r for r in rules if r['id'] == current_week['ruleId']), None)
    if not rule:
        return []
    ks = _pick_key_spellings(pupil, rules, weeks, current_week_id)
    rw = rule.get('words', [])[:5]
    return ks + rw


# ─── HANDOUT ──────────────────────────────────────────────────────────────

def generate_handout_pdf(pupils):
    """Generate Hand-Out Order PDF (portrait A4)."""
    buf = BytesIO()
    doc = canvas.Canvas(buf, pagesize=A4)
    PW, PH = A4
    ML, MR, MT, MB = 10*mm, 10*mm, 8*mm, 8*mm

    sorted_pupils = sorted(pupils, key=lambda p: (p.get('tableNum', 999) or 999, p['firstName']))
    groups = {}
    for p in sorted_pupils:
        key = f'Table {p.get("tableNum")}' if p.get('tableNum') else 'Unassigned'
        groups.setdefault(key, []).append(p)

    y = PH - MT
    doc.setFont('Helvetica-Bold', 14)
    doc.drawCentredString(PW/2, y - 4*mm, 'Hand-Out Order')
    doc.setStrokeColor(BRAND)
    doc.setLineWidth(1.5)
    doc.line(PW/2 - 40*mm, y - 6*mm, PW/2 + 40*mm, y - 6*mm)
    doc.setStrokeColor(black)
    doc.setLineWidth(0.5)
    y -= 14*mm

    for group_name in sorted(groups.keys()):
        if y < MB + 15*mm:
            doc.showPage()
            y = PH - MT
        doc.setFont('Helvetica-Bold', 11)
        doc.drawString(ML, y, group_name)
        y -= 5*mm

        for p in groups[group_name]:
            if y < MB + 8*mm:
                doc.showPage()
                y = PH - MT
            colour = pair_color(p.get('pairId', 1))
            doc.setFillColor(colour)
            doc.circle(ML + 2*mm, y - 1*mm, 2*mm, fill=1, stroke=0)
            doc.setFillColor(black)
            doc.setFont('Helvetica', 9)
            doc.drawString(ML + 6*mm, y, f'{p["firstName"]} {p["lastName"]}')
            doc.setFillColor(HexColor('#666666'))
            doc.drawRightString(PW - MR - 5*mm, y, p.get('class',''))
            doc.setFillColor(black)
            y -= 5*mm
        y -= 4*mm

    doc.save()
    buf.seek(0)
    return buf