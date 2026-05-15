"""ReportLab PDF generation for Spelling Tracker sheets.

Uses Sassoon Infant TTF font for words, Helvetica/Times for other text.
Produces properly formatted HL, TT, Bee, and Handout sheets.

Coordinate convention: y = distance from top of page (increases downward).
Canvas drawing uses PH - y to convert to ReportLab's bottom-up system.
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

def _find_rule(current_week_id, rules, weeks):
    """Resolve a currentWeek ID to a rule dict.

    current_week_id can be either:
    - A rule ID directly (e.g. 'y1s1') — used when no weeks array exists
    - A week ID that maps to a rule via weeks[].ruleId
    """
    if not current_week_id:
        return None
    # Direct rule ID match
    rule = next((r for r in rules if r['id'] == current_week_id), None)
    if rule:
        return rule
    # Week ID match
    week = next((w for w in (weeks or []) if w['id'] == current_week_id), None)
    if week:
        return next((r for r in rules if r['id'] == week.get('ruleId')), None)
    return None


# ─── HL SHEET ────────────────────────────────────────────────────────────

def generate_hl_pdf(pupils, rules, weeks, current_week_id, hl_content, adapted_pupils=None):
    """Generate Home Learning PDF (landscape A4, 2 pages per pupil)."""
    buf = BytesIO()
    doc = canvas.Canvas(buf, pagesize=landscape(A4))
    PW, PH = landscape(A4)
    # Sheet: 277mm x 190mm, padding 12mm L/R 8mm T/B
    ML = (PW - 277*mm) / 2 + 12*mm
    MT = (PH - 190*mm) / 2 + 8*mm
    CW = 277*mm - 24*mm  # content width

    current_rule = _find_rule(current_week_id, rules, weeks)

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
        doc.drawCentredString(PW/2, PH - y + 2*mm, f'{label} — {p["firstName"]} {p["lastName"]}')
        y += 5*mm
        doc.setStrokeColor(BRAND)
        doc.setLineWidth(1.5)
        doc.line(ML, PH - y, PW - ML + 12*mm, PH - y)
        doc.setStrokeColor(black)
        doc.setLineWidth(0.5)
        y += 8*mm

        # Two columns (8mm gap)
        gap = 8*mm
        col_w = (CW - gap) / 2
        col1_x = ML
        col2_x = ML + col_w + gap
        content_top = y + 3*mm
        content_h = PH - MT - 8*mm - content_top - 12*mm

        # Left column: Being a Mathematician
        doc.setFont('Times-Bold', 9)
        doc.drawString(col1_x, PH - y, 'BEING A MATHEMATICIAN')
        doc.setLineWidth(0.5)
        doc.line(col1_x, PH - y - 2*mm, col1_x + col_w, PH - y - 2*mm)
        # Bordered content area
        doc.rect(col1_x, PH - content_top - content_h, col_w, content_h)
        doc.setFont('Times-Roman', 7.5)
        _draw_text_block(doc, maths, col1_x + 3*mm, PH - content_top - 3*mm, col_w - 6*mm, content_h - 6*mm, 'Times-Roman', 7.5, 1.45)

        # Right column: Being a Reader
        doc.setFont('Times-Bold', 9)
        doc.drawString(col2_x, PH - y, 'BEING A READER')
        doc.line(col2_x, PH - y - 2*mm, col2_x + col_w, PH - y - 2*mm)
        doc.rect(col2_x, PH - content_top - content_h, col_w, content_h)
        doc.setFont('Times-Roman', 7.5)
        _draw_text_block(doc, reading, col2_x + 3*mm, PH - content_top - 3*mm, col_w - 6*mm, content_h - 6*mm, 'Times-Roman', 7.5, 1.45)

        # Footer
        doc.setFont('Times-Italic', 7.5)
        doc.drawString(ML, PH - (PH - MT + 4*mm), f'This week, please practise {tt} times table(s).')

        # ── PAGE 2 ──
        doc.showPage()
        y = MT
        # Title + login
        doc.setFont('Times-Bold', 10)
        doc.drawString(ML, PH - y, 'Personal Key Spellings and Weekly Spelling Rule Words')
        doc.setFont('Times-Roman', 7.5)
        doc.drawRightString(PW - ML + 12*mm, PH - y, f'Spelling Shed — {p.get("ssUser","-")} / {p.get("ssPassword","-")}')
        y += 3*mm
        doc.setStrokeColor(BRAND)
        doc.setLineWidth(1.5)
        doc.line(ML, PH - y, PW - ML + 12*mm, PH - y)
        doc.setStrokeColor(black)
        doc.setLineWidth(0.5)
        y += 6*mm

        # Instruction
        doc.setFont('Times-Roman', 7.5)
        instr = f'The first 5 words below are your Key Spellings. This week\'s spelling rule – {rule_title}. {explanation} Practise spelling these words. Write each word within a sentence in the space below.'
        _draw_text_block(doc, instr, ML, PH - y, CW, 20*mm, 'Times-Roman', 7.5, 1.3)
        y += 16*mm

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
    rule = _find_rule(current_week_id, rules, weeks)
    if not rule:
        return []
    words = rule.get('words', [])
    if len(words) <= 5:
        return words
    pair_id = pupil.get('pairId') or 1
    pair_index = (int(pair_id) - 1) % 15
    start = (pair_index * 3) % len(words)
    selected = []
    for j in range(5):
        idx = (start + j) % len(words)
        if words[idx] not in selected:
            selected.append(words[idx])
        if len(selected) >= 5:
            break
    return selected[:5]


def _draw_text_block(canvas_obj, text, x, y, max_width, max_height, font_name, font_size, line_height):
    """Draw wrapped text within a bounding box. y is canvas coordinate (top)."""
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import Paragraph
    style = ParagraphStyle('tb', fontName=font_name, fontSize=font_size,
                            leading=font_size * line_height)
    p = Paragraph(text.replace('\n', '<br/>'), style)
    w, h = p.wrap(max_width, max_height)
    p.drawOn(canvas_obj, x, y - h)


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
            # Top-left corner of this pupil's box (canvas coords)
            box_x = ML + col * (COL_W + GAP)
            box_y = PH - MT - IH  # bottom of box
            box_w = COL_W
            box_h = IH

            # Outer border
            doc.setStrokeColor(black)
            doc.setLineWidth(1.0)
            doc.rect(box_x, box_y, box_w, box_h)

            # Inner padding: 5mm L/R, 4mm T/B
            px = box_x + 5*mm
            pw = box_w - 10*mm
            # y tracks distance from top of box, in canvas coords (top of box = PH - MT)
            top_y = PH - MT  # canvas y of top of box

            # Name line — 3mm down from top padding
            name_y = top_y - 4*mm - 3*mm
            doc.setFont('Helvetica-Bold', 10)
            doc.drawString(px, name_y, f'{p["firstName"]} {p["lastName"]}')
            # Underline
            doc.setLineWidth(0.5)
            doc.line(px, name_y - 1.5*mm, px + pw - 26*mm, name_y - 1.5*mm)
            # Score box
            doc.setLineWidth(0.3)
            doc.rect(px + pw - 24*mm, name_y - 1*mm, 24*mm, 8*mm)
            doc.setFont('Helvetica', 6)
            doc.drawCentredString(px + pw - 12*mm, name_y + 4.5*mm, 'Score / Time')
            doc.drawCentredString(px + pw - 12*mm, name_y + 0.5*mm, '___ / ___')

            # Set label — 10mm below name
            label_y = name_y - 10*mm
            set_val = p.get('ttSet') or 'All'
            set_label = '2,5,3,4,6,8,7,9,11,12 x' if set_val == 'All' else f'{set_val} x'
            doc.setFont('Helvetica-Bold', 9)
            label_w = doc.stringWidth(set_label, 'Helvetica-Bold', 9) + 4*mm
            label_x = box_x + (box_w - label_w) / 2
            doc.rect(label_x, label_y - 2*mm, label_w, 6*mm)
            doc.drawCentredString(box_x + box_w/2, label_y + 0.5*mm, set_label)

            # Questions grid — starts 6mm below set label
            q_top_y = label_y - 8*mm
            q_bottom_y = box_y + 4*mm  # 4mm bottom padding
            q_area_h = q_top_y - q_bottom_y

            # Generate questions
            nums = [2,3,4,5,6,7,8,9,10,11,12] if set_val == 'All' else [int(set_val) or 2]
            qs = []
            for _ in range(40):
                n = random.choice(nums)
                m = random.randint(1, 12)
                qs.append((m, n))

            # 2 columns of 20 rows
            row_h = q_area_h / 20
            col1_x = px
            col2_x = px + pw/2 + 2*mm

            doc.setFont('Helvetica', 7)
            doc.setLineWidth(0.2)

            for r in range(20):
                ry = q_top_y - r * row_h  # canvas y of row top
                q1 = qs[r]
                q2 = qs[r + 20]
                # Row separator lines
                if r == 0:
                    doc.line(col1_x, ry, col1_x + pw, ry)
                doc.line(col1_x, ry - row_h, col1_x + pw, ry - row_h)
                # Left column: question number + sum
                doc.drawString(col1_x, ry - row_h + row_h*0.65, f'{r+1}.')
                doc.drawString(col1_x + 4*mm, ry - row_h + row_h*0.65, f'{q1[0]} × {q1[1]} =')
                # Right column
                doc.drawString(col2_x, ry - row_h + row_h*0.65, f'{r+21}.')
                doc.drawString(col2_x + 4*mm, ry - row_h + row_h*0.65, f'{q2[0]} × {q2[1]} =')
                # Column dividers in answer area
                ans_x1 = col1_x + pw * 0.3
                ans_x2 = col2_x + pw * 0.3
                doc.setLineWidth(0.1)
                doc.line(ans_x1, ry - row_h, ans_x1, ry)
                doc.line(ans_x2, ry - row_h, ans_x2, ry)
                doc.setLineWidth(0.2)

            # Centre vertical line between columns
            mid_x = px + pw / 2 + 1*mm
            doc.line(mid_x, q_top_y, mid_x, q_top_y - q_area_h)

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
        pupils = sorted(pupils, key=lambda p: (int(p.get('pairId',99) or 99), p['firstName']))
    else:
        pupils = sorted(pupils, key=lambda p: p['firstName'])

    per_page = 9

    # Resolve the current rule once
    current_rule = _find_rule(current_week_id, rules, weeks)

    # ── Reader sheets ──
    for page_idx in range(0, len(pupils), per_page):
        if page_idx > 0:
            doc.showPage()
        page_pupils = pupils[page_idx:page_idx+per_page]

        for idx, p in enumerate(page_pupils):
            row = idx // COLS
            col = idx % COLS

            # x, y are top-left of strip (canvas coords)
            x0 = ML + col * (SW + GAP_H)
            # Top of this strip row, in canvas coords
            strip_top_y = PH - MT - row * (SH + GAP_V)
            strip_bottom_y = strip_top_y - SH

            all_words = _get_pupil_words(p, rules, weeks, current_week_id)
            colour = pair_color(p.get('pairId', 1))
            is_light = contrast_color(colour) == black

            # Coloured name header (top 7mm of strip)
            header_bottom_y = strip_top_y - 7*mm
            doc.setFillColor(colour)
            doc.roundRect(x0, header_bottom_y, SW, 7*mm, 1.5*mm, stroke=0, fill=1)
            doc.setFillColor(black if is_light else white)
            doc.setFont('Helvetica-Bold', 10)
            doc.drawCentredString(x0 + SW/2, header_bottom_y + 2.5*mm, f'{p["firstName"]} {p["lastName"]}')
            doc.setFillColor(black)

            # Word list area below header
            word_area_top = header_bottom_y - 1*mm
            word_area_bottom = strip_bottom_y + 1*mm
            word_area_h = word_area_top - word_area_bottom
            row_h = min(5.5*mm, word_area_h / max(len(all_words), 1))

            doc.setFont('Sassoon', 9)
            wy = word_area_top  # canvas y, moves downward
            for wi, word in enumerate(all_words):
                if wy - row_h < word_area_bottom:
                    break
                doc.setFont('Helvetica', 6.5)
                doc.setFillColor(HexColor('#888888'))
                doc.drawString(x0 + 1.5*mm, wy - row_h*0.7, f'{wi+1}.')
                doc.setFillColor(black)
                doc.setFont('Sassoon', 9)
                doc.drawString(x0 + 7*mm, wy - row_h*0.7, word)
                # Row separator
                doc.setStrokeColor(HexColor('#e5e7eb'))
                doc.setLineWidth(0.15)
                doc.line(x0 + 1*mm, wy - row_h, x0 + SW - 1*mm, wy - row_h)
                wy -= row_h

            # Border around word area
            doc.setStrokeColor(HexColor('#d1d5db'))
            doc.setLineWidth(0.3)
            doc.rect(x0, strip_bottom_y, SW, word_area_top - strip_bottom_y, fill=0, stroke=1)

            # Dashed cut lines between strips
            doc.setStrokeColor(HexColor('#bbbbbb'))
            doc.setLineWidth(0.2)
            doc.setDash(2, 1.5)
            if row < 2:  # horizontal cut line below this row
                doc.line(x0, strip_bottom_y - GAP_V/2, x0 + SW, strip_bottom_y - GAP_V/2)
            if col < 2:  # vertical cut line right of this col
                doc.line(x0 + SW + GAP_H/2, strip_bottom_y, x0 + SW + GAP_H/2, strip_top_y)
            doc.setDash()
            doc.setStrokeColor(black)
            doc.setLineWidth(0.5)

    # ── Writing sheets ──
    if include_writing:
        for page_idx in range(0, len(pupils), per_page):
            doc.showPage()
            page_pupils = pupils[page_idx:page_idx+per_page]

            for idx in range(len(page_pupils)):
                p = page_pupils[idx]
                row = idx // COLS
                col = idx % COLS

                x0 = ML + col * (SW + GAP_H)
                strip_top_y = PH - MT - row * (SH + GAP_V)
                strip_bottom_y = strip_top_y - SH

                # Blank name header (outline rect)
                doc.setStrokeColor(HexColor('#d1d5db'))
                doc.setLineWidth(0.3)
                header_bottom_y = strip_top_y - 7*mm
                doc.roundRect(x0, header_bottom_y, SW, 7*mm, 1.5*mm, stroke=1, fill=0)
                doc.setFont('Helvetica', 10)
                doc.drawCentredString(x0 + SW/2, header_bottom_y + 2.5*mm, 'Name: ________________')

                # Blank lines for writing
                word_area_top = header_bottom_y - 1*mm
                word_area_bottom = strip_bottom_y + 1*mm
                word_area_h = word_area_top - word_area_bottom
                row_h = word_area_h / 10

                wy = word_area_top
                for wi in range(10):
                    if wy - row_h < word_area_bottom:
                        break
                    doc.setFont('Helvetica', 6.5)
                    doc.setFillColor(HexColor('#888888'))
                    doc.drawString(x0 + 1.5*mm, wy - row_h*0.7, f'{wi+1}.')
                    doc.setFillColor(black)
                    # Writing line
                    doc.setStrokeColor(HexColor('#999999'))
                    doc.setLineWidth(0.2)
                    doc.line(x0 + 7*mm, wy - row_h*0.55, x0 + SW - 2*mm, wy - row_h*0.55)
                    wy -= row_h

                # Dashed cut lines
                doc.setStrokeColor(HexColor('#bbbbbb'))
                doc.setLineWidth(0.2)
                doc.setDash(2, 1.5)
                if row < 2:
                    doc.line(x0, strip_bottom_y - GAP_V/2, x0 + SW, strip_bottom_y - GAP_V/2)
                if col < 2:
                    doc.line(x0 + SW + GAP_H/2, strip_bottom_y, x0 + SW + GAP_H/2, strip_top_y)
                doc.setDash()
                doc.setStrokeColor(black)
                doc.setLineWidth(0.5)

    doc.save()
    buf.seek(0)
    return buf


def _get_pupil_words(pupil, rules, weeks, current_week_id):
    """Get all words for a pupil (key spellings + rule words)."""
    rule = _find_rule(current_week_id, rules, weeks)
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

    sorted_pupils = sorted(pupils, key=lambda p: (int(p.get('tableNum', 999) or 999), p['firstName']))
    groups = {}
    for p in sorted_pupils:
        key = f'Table {p.get("tableNum")}' if p.get('tableNum') else 'Unassigned'
        groups.setdefault(key, []).append(p)

    y = MT
    doc.setFont('Helvetica-Bold', 14)
    doc.drawCentredString(PW/2, PH - y - 4*mm, 'Hand-Out Order')
    doc.setStrokeColor(BRAND)
    doc.setLineWidth(1.5)
    doc.line(PW/2 - 40*mm, PH - y - 6*mm, PW/2 + 40*mm, PH - y - 6*mm)
    doc.setStrokeColor(black)
    doc.setLineWidth(0.5)
    y += 14*mm

    for group_name in sorted(groups.keys()):
        if PH - y < MB + 15*mm:
            doc.showPage()
            y = MT
        doc.setFont('Helvetica-Bold', 11)
        doc.drawString(ML, PH - y, group_name)
        y += 5*mm

        for p in groups[group_name]:
            if PH - y < MB + 8*mm:
                doc.showPage()
                y = MT
            colour = pair_color(p.get('pairId', 1))
            doc.setFillColor(colour)
            doc.circle(ML + 2*mm, PH - y - 1*mm, 2*mm, fill=1, stroke=0)
            doc.setFillColor(black)
            doc.setFont('Helvetica', 9)
            doc.drawString(ML + 6*mm, PH - y, f'{p["firstName"]} {p["lastName"]}')
            doc.setFillColor(HexColor('#666666'))
            doc.drawRightString(PW - MR - 5*mm, PH - y, p.get('class',''))
            doc.setFillColor(black)
            y += 5*mm
        y += 4*mm

    doc.save()
    buf.seek(0)
    return buf