"""WFA Precision Teaching Grids — Streamlit app for fluency assessment and tracking."""

import json
import os
from datetime import date
import streamlit as st
import time
from reportlab.lib.units import mm as _mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from wfa_shared.logo import logo_html
from wfa_shared.streamlit_css import inject_wfa_css

# Sassoon Infant is the house font for child-facing reading content across
# WFA tools (handwriting sheets, being-a-reader-web, etc.) — used here for
# the actual items a child reads (maths terms, GPCs, CEW words), never for
# admin/teacher text (headers, answer keys), per that convention.
_WORD_FONT = "Helvetica-Bold"
try:
    pdfmetrics.registerFont(TTFont("SassoonInfant", os.path.join(os.path.dirname(__file__), "fonts", "SassoonInfant.ttf")))
    _WORD_FONT = "SassoonInfant"
except Exception:
    pass
from data import (
    ensure_data_files, load_pupils, save_pupils, load_ladders, save_ladders,
    load_probes, add_probe, load_all_probes_for_pupil, get_all_steps, get_step,
    get_next_step, check_aim_met, add_pupil, get_pupil, git_pull, git_add_commit_push,
    git_pending_commits, PROBES_DIR, get_baseline, get_item_mastery, get_progress_summary,
    get_skill_status, set_skill_status, pass_review, fail_review, get_reviews_due,
    migrate_skills_format, skill_status, active_skills_for, count_by_status,
    generate_sheet, get_answer, get_review_items,
    fetch_hub_pupils, sync_pupils_from_roster,
    is_windowed, get_active_window, get_window_frontier, set_active_window, suggest_next_window,
)

# ── PDF Renderer — "Clean Cards" ──────────────────────────────────────────
#
# Canvas-based (not platypus) — needed for precise inline "N)  A + [box] = C"
# layout and for the fixed 5-day-bands-on-one-page week view. WFA brand blue
# header band; boxes/borders carry structure so it survives B&W printing.

_WFA_BLUE = (0x17 / 255, 0x98 / 255, 0xd3 / 255)
_WFA_DARK = (0x0a / 255, 0x01 / 255, 0x01 / 255)
_GREY = (0.55, 0.55, 0.55)


def _split_cloze(question):
    """'3 + ? = 5' -> ('3 + ', ' = 5'); '7×3 =' -> ('7×3 =', '') — the '?'
    (if any) is where the answer box goes; box goes at the end otherwise."""
    if "?" in question:
        left, _, right = question.partition("?")
        return left, right
    return question, ""


def _draw_maths_item(c, x, y_top, row_h, number, question, font_size, box_w, box_h):
    ascender = font_size * 0.72
    baseline = y_top - row_h / 2 - ascender * 0.10
    num_gutter = max(26, font_size * 2)
    c.setFont("Helvetica", font_size)
    c.setFillColorRGB(*_GREY)
    c.drawString(x, baseline, f"{number})")

    left, right = _split_cloze(question)
    if "?" not in question:
        left = left + " ="  # e.g. "10×2" -> "10×2 =" so the box has a "=" before it
    c.setFont(_WORD_FONT, font_size)
    c.setFillColorRGB(*_WFA_DARK)
    lx = x + num_gutter
    c.drawString(lx, baseline, left)
    box_x = lx + c.stringWidth(left, _WORD_FONT, font_size) + 4

    # Anchor the box to the text baseline (not the row's geometric middle)
    # so it visually lines up with "+" and "=" instead of floating relative
    # to them when the row is taller than the text itself.
    box_y = baseline - box_h * 0.22
    c.setFillColorRGB(1, 1, 1)
    c.setStrokeColorRGB(*_WFA_DARK)
    c.setLineWidth(1)
    c.rect(box_x, box_y, box_w, box_h, fill=1, stroke=1)

    if right:
        c.setFont(_WORD_FONT, font_size)
        c.setFillColorRGB(*_WFA_DARK)
        c.drawString(box_x + box_w + 4, baseline, right)


def _draw_recognition_item(c, x, y_top, w, h, text, font_size):
    c.setFillColorRGB(1, 1, 1)
    c.setStrokeColorRGB(0.82, 0.82, 0.82)
    c.setLineWidth(0.6)
    c.rect(x, y_top - h, w, h, fill=1, stroke=1)
    # Per-item safety net: a longer word than the sheet's font size was
    # sized for (e.g. "different" mixed in with short CEW words) shrinks
    # itself rather than overflowing into the next cell.
    pad = w * 0.9
    if c.stringWidth(text, _WORD_FONT, font_size) > pad:
        font_size = max(5, pad / max(c.stringWidth(text, _WORD_FONT, 1.0), 0.01))
    c.setFont(_WORD_FONT, font_size)
    c.setFillColorRGB(*_WFA_DARK)
    ascender = font_size * 0.72
    baseline = y_top - h / 2 - ascender * 0.10
    c.drawCentredString(x + w / 2, baseline, text)


def _draw_dictation_item(c, x, y_top, w, row_h, number, font_size):
    ascender = font_size * 0.72
    baseline = y_top - row_h / 2 - ascender * 0.10
    c.setFont("Helvetica", font_size)
    c.setFillColorRGB(*_GREY)
    c.drawString(x, baseline, f"{number}.")
    line_y = y_top - row_h / 2 - 3
    c.setStrokeColorRGB(0.65, 0.65, 0.65)
    c.setLineWidth(0.8)
    c.line(x + 22, line_y, x + w - 4, line_y)


def _fit_font_for_width(c, texts, font, max_w, min_size=6, max_size=20):
    """Largest font size at which every string in texts fits within max_w —
    takes the longest/widest word as the limiting case so a whole sheet of
    mixed-length words (e.g. CEW: 'to' next to 'different') shares one
    consistent, non-overflowing size."""
    if not texts:
        return max_size
    limiting = min(max_w / max(c.stringWidth(t, font, 1.0), 0.01) for t in texts)
    return max(min_size, min(max_size, limiting))


def _wrap_line(c, text, font, size, max_w):
    words = text.split(" ")
    lines, cur = [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if c.stringWidth(trial, font, size) > max_w and cur:
            lines.append(cur)
            cur = w
        else:
            cur = trial
    if cur:
        lines.append(cur)
    return lines


def _pdf_footer_answers(c, margin, usable_w, y_top, questions, subject, display_mode, max_lines=3):
    if subject == "maths":
        label = "Answers: "
        body = ", ".join(
            q["question"].replace("?", q["answer"]) if "?" in q["question"] else f"{q['question']} = {q['answer']}"
            for q in questions
        )
    elif subject == "spellings" and display_mode == "dictation":
        label = "Words to read aloud: "
        body = ", ".join(q["question"] for q in questions)
    else:
        # Recognition items (phonics, CEW) ARE their own answer — list once.
        label = "Items: "
        body = ", ".join(q["question"] for q in questions)

    lines = _wrap_line(c, label + body, "Helvetica", 6.5, usable_w)
    c.setFont("Helvetica", 6.5)
    c.setFillColorRGB(*_GREY)
    for i, line in enumerate(lines[:max_lines]):
        c.drawString(margin, y_top - i * 8, line)


def _draw_band_content(c, margin, usable_w, grid_top, grid_bottom, sheet, maths_cols=5, recog_cols=8, dict_cols=5):
    """Draw one sheet's items into an arbitrary (grid_top, grid_bottom)
    region — font/box sizes scale with row height, so this works equally
    for a thin week-band or a tall half-page slot. Shared by every sheet
    layout so density stays consistent across single/week/2-per-page."""
    questions = sheet["questions"]
    n = len(questions)
    if n == 0 or grid_top <= grid_bottom:
        return

    if sheet["subject"] == "maths":
        cols = maths_cols
        rows = -(-n // cols)
        gap_x = 4
        col_w = (usable_w - gap_x * (cols - 1)) / cols
        row_h = (grid_top - grid_bottom) / rows
        # Font must be bound by column WIDTH, not just row height — a maths
        # item ("N)  A + [box] = C") needs real horizontal room, and capping
        # only by height let columns overlap when rows were tall but narrow.
        # Measured against the actual text (not an estimate), so it also
        # copes with longer strings (e.g. bonds-to-20's "16 + ? = 20").
        term_texts = []
        for q in questions:
            l, r = _split_cloze(q["question"])
            if "?" not in q["question"]:
                l = l + " ="
            term_texts.append(l + r)
        font_by_width = _fit_font_for_width(c, term_texts, _WORD_FONT, max(col_w - 52, 10))
        font_size = max(6.5, min(14, row_h * 0.40, font_by_width))
        box_h = max(8, min(row_h * 0.62, font_size * 1.15))
        box_w = box_h * 1.5
        for i, q in enumerate(questions):
            row, col = divmod(i, cols)
            x = margin + col * (col_w + gap_x)
            y_top = grid_top - row * row_h
            _draw_maths_item(c, x, y_top, row_h, i + 1, q["question"], font_size, box_w, box_h)

    elif sheet["subject"] == "phonics" or sheet.get("display_mode") == "recognition":
        texts = [q["question"] for q in questions]
        max_len = max((len(t) for t in texts), default=1)
        # Phonics items are single letters/digraphs — the caller's column
        # count is fine. CEW words vary a lot in length ("to" vs
        # "different"), so narrow the columns as the longest word in this
        # set grows, rather than squeezing everything to fit 8 columns.
        cols = recog_cols if sheet["subject"] == "phonics" else max(3, min(recog_cols, 10 - max_len))
        rows = -(-n // cols)
        gap = 3
        col_w = (usable_w - gap * (cols - 1)) / cols
        row_h = (grid_top - grid_bottom) / rows
        # Each word gets its own size, capped by row height — NOT a single
        # size fit to the sheet's longest word, which made short words
        # ("do", "to") needlessly tiny just because one long outlier
        # ("different") shared the sheet. _draw_recognition_item shrinks
        # only the individual item that actually needs it.
        base_font_size = max(7, min(20, row_h * 0.42))
        for i, q in enumerate(questions):
            row, col = divmod(i, cols)
            x = margin + col * (col_w + gap)
            y_top = grid_top - row * row_h
            _draw_recognition_item(c, x, y_top, col_w, row_h - 1, q["question"], base_font_size)

    else:  # dictation
        cols = dict_cols
        rows = -(-n // cols)
        gap_x = 6
        col_w = (usable_w - gap_x * (cols - 1)) / cols
        row_h = (grid_top - grid_bottom) / rows
        font_size = max(6.5, min(12, row_h * 0.35))
        for i, q in enumerate(questions):
            row, col = divmod(i, cols)
            x = margin + col * (col_w + gap_x)
            y_top = grid_top - row * row_h
            _draw_dictation_item(c, x, y_top, col_w, row_h, i + 1, font_size)


def _compact_header(c, margin, usable_w, y_top, title_bits, right_text, h):
    """Slim single-line header (name/skill + Time:/Score: fields to fill
    in by hand) instead of a big banner — the point is paper density, not
    branding. A thin blue rule is the only WFA touch."""
    c.setFont("Helvetica-Bold", min(11, h * 0.5))
    c.setFillColorRGB(*_WFA_DARK)
    baseline = y_top - h * 0.62
    c.drawString(margin, baseline, "  |  ".join(title_bits))
    if right_text:
        c.setFont("Helvetica", min(9, h * 0.42))
        c.setFillColorRGB(*_GREY)
        rw = c.stringWidth(right_text, "Helvetica", min(9, h * 0.42))
        c.drawString(margin + usable_w - rw, baseline, right_text)
    c.setStrokeColorRGB(*_WFA_BLUE)
    c.setLineWidth(1.3)
    c.line(margin, y_top - h, margin + usable_w, y_top - h)
    return y_top - h


def render_compact_sheet_slot(c, margin, usable_w, slot_top, slot_bottom, pupil, sheet, include_answers):
    """One sheet drawn into a given vertical slot (a whole page, or half a
    page when two are stacked) — the density Innes's old Excel sheets had."""
    bits = [f"{pupil['firstName']} {pupil['lastName']}", sheet["skill_name"]]
    if sheet.get("day_label"):
        bits.append(sheet["day_label"])
    header_h = min(9 * _mm, (slot_top - slot_bottom) * 0.12)
    right_text = f"Time: _______   Score: _______   {date.today().strftime('%d/%m/%y')}"
    header_bottom = _compact_header(c, margin, usable_w, slot_top, bits, right_text, header_h)

    footer_h = (14 * _mm if include_answers else 2 * _mm)
    grid_top = header_bottom - 2
    grid_bottom = slot_bottom + footer_h
    _draw_band_content(c, margin, usable_w, grid_top, grid_bottom, sheet, maths_cols=4)

    if include_answers:
        _pdf_footer_answers(c, margin, usable_w, grid_bottom - 10, sheet["questions"], sheet["subject"], sheet.get("display_mode"), max_lines=2)


def render_two_per_page_pdf(c, page_w, page_h, margin, usable_w, slot_entries, include_answers=True):
    """slot_entries: 1 or 2 (pupil, sheet) pairs — stacked top/bottom on
    one page with a dashed cut line between, same as printing 2-up used to
    work in the old Excel sheets. Caller does showPage()."""
    usable_h = page_h - 2 * margin
    cut_gap = 6 * _mm
    half_h = (usable_h - cut_gap) / 2
    top_top = page_h - margin
    top_bottom = top_top - half_h
    bottom_top = top_bottom - cut_gap
    bottom_bottom = bottom_top - half_h

    render_compact_sheet_slot(c, margin, usable_w, top_top, top_bottom, *slot_entries[0], include_answers)

    cut_y = (top_bottom + bottom_top) / 2
    c.setDash([4, 3], 0)
    c.setStrokeColorRGB(0.55, 0.55, 0.55)
    c.setLineWidth(0.8)
    c.line(margin, cut_y, margin + usable_w, cut_y)
    c.setDash()

    if len(slot_entries) > 1:
        render_compact_sheet_slot(c, margin, usable_w, bottom_top, bottom_bottom, *slot_entries[1], include_answers)


# ── Year Group Filter ────────────────────────────────────────────────────────

def year_group_filtered_pupils(pupils_data, key):
    """Render a 'Year group' selectbox and return (pupil_options, year_group)
    filtered to it. pupil_options is the usual [(id, "First Last"), ...] list
    used to build the pupil selectbox right below it. Pupils with no stored
    yearGroup (added before this field existed) fall under 'Unknown'."""
    year_groups = sorted({p.get("yearGroup") or "Unknown" for p in pupils_data["pupils"]})
    selected = st.selectbox("Year group", ["All"] + year_groups, key=f"yg_{key}")
    if selected == "All":
        filtered = pupils_data["pupils"]
    else:
        filtered = [p for p in pupils_data["pupils"] if (p.get("yearGroup") or "Unknown") == selected]
    return [(p["id"], f"{p['firstName']} {p['lastName']}") for p in filtered], selected


st.set_page_config(page_title="WFA Precision Teaching", page_icon="📊", layout="wide")

# ── WFA-branded styling ──────────────────────────────────────────────────────
# Same shared CSS injector every other WFA Streamlit tool uses (buttons,
# inputs, download buttons), plus this app's own extras that aren't part of
# the shared package's scope (dashboard metric cards, the aim-met banners).

inject_wfa_css(buttons=True, inputs=True, download=True)

st.markdown("""
<style>
    .metric-card {
        background: linear-gradient(135deg, #1798d3 0%, #0d7bb8 100%);
        color: white; padding: 1.5rem; border-radius: 12px; text-align: center;
        box-shadow: 0 4px 12px rgba(23, 152, 211, 0.2);
    }
    .metric-card h2 { color: white !important; margin: 0 !important; font-size: 2.5rem !important; font-weight: 800 !important; }
    .metric-card p { margin: 0.5rem 0 0 0 !important; font-size: 1rem !important; opacity: 0.9; }

    .aim-met { background: #E8F5E9; border-left: 4px solid #43A047; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
    .aim-not-met { background: #FFF3E0; border-left: 4px solid #FF9800; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
</style>
""", unsafe_allow_html=True)

# ── Initialise ──────────────────────────────────────────────────────────────

ensure_data_files()

if "pupils_data" not in st.session_state:
    git_pull()
    st.session_state.pupils_data = load_pupils()
    st.session_state.ladders_data = load_ladders()
    # Migrate old string-format currentSkills to new object format
    migrated = False
    for p in st.session_state.pupils_data["pupils"]:
        if migrate_skills_format(p):
            migrated = True
    if migrated:
        save_pupils(st.session_state.pupils_data)
        git_add_commit_push("data/pupils.json", "Migrate skills to new review format")


# ── Self-Assessment Mode ───────────────────────────────────────────────────

query_params = st.query_params
if query_params.get("mode") == "self_assess":
    token = query_params.get("token", "")
    pupils_data = st.session_state.pupils_data
    pupil = None
    for p in pupils_data["pupils"]:
        if p["token"] == token:
            pupil = p
            break

    if not pupil:
        st.error("Invalid token. Please check with your teacher.")
        st.stop()

    st.title(f"Hi {pupil['firstName']}! 👋")

    active_skills = active_skills_for(pupil)
    if not active_skills:
        st.info("No skills assigned yet. Ask your teacher to set up your practice.")
        st.stop()

    ladders_data = st.session_state.ladders_data
    skill_options = []
    for skill_id in active_skills:
        step = get_step(ladders_data, skill_id)
        if step:
            skill_options.append((skill_id, f"{step['ladder_name']}: {step['name']}"))

    selected = st.selectbox("What are you practising today?", skill_options, format_func=lambda x: x[1])
    skill_id = selected[0] if selected else None

    if skill_id:
        step = get_step(ladders_data, skill_id)
        sa_item_pool = get_active_window(pupil, skill_id, step) if is_windowed(step) else None
        sheet = generate_sheet(pupil, skill_id, ladders_data, item_pool=sa_item_pool)

        # Determine subject for mode-specific UI
        ladder = None
        for l in ladders_data["ladders"]:
            if l["id"] == step["ladder_id"]:
                ladder = l
                break
        subject = ladder["subject"] if ladder else "maths"

        # ── MATHS MODE: Auto-marking timed probe ──────────────────────────
        if subject == "maths":
            st.subheader(f"🔢 {step['name']}")
            aim = step["aim"]
            st.caption("Type your answer for each question.")

            if "maths_start" not in st.session_state:
                if st.button("Start! 🚀", use_container_width=True, type="primary"):
                    st.session_state.maths_start = time.time()
                    st.session_state.maths_questions = sheet["questions"]
                    st.session_state.maths_answers = {}
                    st.session_state.maths_idx = 0
                    st.rerun()

            if "maths_start" in st.session_state:
                elapsed = time.time() - st.session_state.maths_start
                remaining = max(0, aim["timedSec"] - elapsed)
                questions = st.session_state.maths_questions

                if remaining <= 0:
                    # Time's up — auto-mark
                    answers = st.session_state.maths_answers
                    correct = 0
                    errors = 0
                    item_results = {}
                    for q in questions:
                        user_answer = str(answers.get(q["question"], "")).strip().lower()
                        expected = str(q["answer"]).strip().lower()
                        is_correct = user_answer == expected
                        if is_correct:
                            correct += 1
                        else:
                            errors += 1
                        item_results[q["question"]] = is_correct

                    duration = aim["timedSec"]
                    cpm = round(correct / (duration / 60), 1) if duration > 0 else 0
                    aim_met = cpm >= aim["correctPerMin"] and errors <= aim["maxErrors"]

                    st.markdown("### Time's up!")
                    st.metric("Correct per minute", cpm)
                    st.metric("Correct", correct)
                    st.metric("Errors", errors)

                    if aim_met:
                        st.balloons()
                        st.success(f"🎯 Well done {pupil['firstName']}! Target hit!")
                    else:
                        st.info(f"Keep practising — you got {correct} right. You'll get there!")

                    # Show which ones were wrong
                    wrong = [q for q in questions if not item_results.get(q["question"], False)]
                    if wrong:
                        with st.expander("Questions to practise"):
                            for q in wrong:
                                st.markdown(f"❌ **{q['question']}** = {q['answer']} (you said: {answers.get(q['question'], '—')})")

                    if st.button("Save my result", use_container_width=True, type="primary"):
                        add_probe(pupil["id"], skill_id, "timed", correct, errors, len(questions), duration, "", item_results)
                        filepath = str(PROBES_DIR / pupil["id"] / f"{skill_id}.json")
                        git_add_commit_push(filepath, f"Maths check: {pupil['firstName']} {step['name']}")
                        # Clean up session state
                        for key in ["maths_start", "maths_questions", "maths_answers", "maths_idx"]:
                            st.session_state.pop(key, None)
                        st.rerun()

                else:
                    # Active probe — show question and answer input
                    idx = st.session_state.get("maths_idx", 0)
                    if idx < len(questions):
                        q = questions[idx]
                        progress_pct = int((1 - remaining / aim["timedSec"]) * 100)
                        st.progress(progress_pct)
                        st.markdown(f"## ⏱️ {int(remaining)}s")

                        # Review item indicator
                        if q.get("is_review"):
                            st.caption("🔄 Review question")

                        st.markdown(f"# {q['question']}")

                        # Number input for answer
                        user_answer = st.text_input(
                            "Your answer:", key=f"maths_ans_{idx}",
                            placeholder="Type your answer...",
                        )

                        col1, col2 = st.columns(2)
                        with col1:
                            if st.button("Next →", key=f"maths_next_{idx}", use_container_width=True, type="primary"):
                                if user_answer:
                                    st.session_state.maths_answers[q["question"]] = user_answer
                                st.session_state.maths_idx = idx + 1
                                st.rerun()
                        with col2:
                            if st.button("Skip", key=f"maths_skip_{idx}", use_container_width=True):
                                st.session_state.maths_idx = idx + 1
                                st.rerun()

                        # Show progress
                        answered = len(st.session_state.maths_answers)
                        st.caption(f"Question {idx + 1} of {len(questions)} · {answered} answered")
                    else:
                        # All questions answered but time remaining
                        st.progress(int((1 - remaining / aim["timedSec"]) * 100))
                        st.info(f"All questions attempted! {int(remaining)}s remaining — wait for the timer or end early.")
                        if st.button("End Early", type="secondary"):
                            st.session_state.maths_start = time.time() - aim["timedSec"]
                            st.rerun()

        # ── PHONICS MODE: Adult-led timed reading ─────────────────────────
        elif subject == "phonics":
            st.subheader(f"📖 {step['name']}")
            aim = step["aim"]
            st.caption("Adult: listen to the child read each grapheme and mark correct or incorrect.")

            if "phonics_start" not in st.session_state:
                if st.button("Start! 🚀", use_container_width=True, type="primary"):
                    st.session_state.phonics_start = time.time()
                    st.session_state.phonics_questions = sheet["questions"]
                    st.session_state.phonics_results = []
                    st.session_state.phonics_idx = 0
                    st.rerun()

            if "phonics_start" in st.session_state:
                elapsed = time.time() - st.session_state.phonics_start
                remaining = max(0, aim["timedSec"] - elapsed)
                questions = st.session_state.phonics_questions

                if remaining <= 0:
                    # Time's up
                    results = st.session_state.phonics_results
                    correct = sum(1 for r in results if r)
                    errors = sum(1 for r in results if not r)
                    duration = aim["timedSec"]
                    cpm = round(correct / (duration / 60), 1) if duration > 0 else 0
                    aim_met = cpm >= aim["correctPerMin"] and errors <= aim["maxErrors"]

                    st.markdown("### Time's up!")
                    st.metric("Correct per minute", cpm)
                    st.metric("Correct", correct)
                    st.metric("Errors", errors)

                    if aim_met:
                        st.balloons()
                        st.success(f"🎯 Well done {pupil['firstName']}! Target hit!")
                    else:
                        st.info(f"Keep practising — you got {correct} right!")

                    if st.button("Save result", use_container_width=True, type="primary"):
                        item_results = {}
                        idx = 0
                        for q in questions:
                            if idx < len(results):
                                item_results[q["question"]] = results[idx]
                            idx += 1
                        add_probe(pupil["id"], skill_id, "timed", correct, errors, len(results), duration, "", item_results)
                        filepath = str(PROBES_DIR / pupil["id"] / f"{skill_id}.json")
                        git_add_commit_push(filepath, f"Phonics check: {pupil['firstName']} {step['name']}")
                        for key in ["phonics_start", "phonics_questions", "phonics_results", "phonics_idx"]:
                            st.session_state.pop(key, None)
                        st.rerun()

                else:
                    idx = st.session_state.get("phonics_idx", 0)
                    if idx < len(questions):
                        q = questions[idx]
                        progress_pct = int((1 - remaining / aim["timedSec"]) * 100)
                        st.progress(progress_pct)
                        st.markdown(f"## ⏱️ {int(remaining)}s remaining")

                        if q.get("is_review"):
                            st.caption("🔄 Review")

                        st.markdown(f"# {q['question']}")

                        col1, col2 = st.columns(2)
                        with col1:
                            if st.button("✅ Correct", key=f"ph_correct_{idx}", use_container_width=True, type="primary"):
                                st.session_state.phonics_results.append(True)
                                st.session_state.phonics_idx = idx + 1
                                st.rerun()
                        with col2:
                            if st.button("❌ Not yet", key=f"ph_incorrect_{idx}", use_container_width=True):
                                st.session_state.phonics_results.append(False)
                                st.session_state.phonics_idx = idx + 1
                                st.rerun()

                        st.caption(f"Sound {idx + 1} of {len(questions)}")
                    else:
                        st.progress(int((1 - remaining / aim["timedSec"]) * 100))
                        st.info(f"All sounds attempted! {int(remaining)}s remaining.")
                        if st.button("End Early", type="secondary"):
                            st.session_state.phonics_start = time.time() - aim["timedSec"]
                            st.rerun()

        # ── SPELLING MODE: TTS + auto-marking weekly check ────────────────
        elif subject == "spellings":
            st.subheader(f"✏️ {step['name']}")
            st.caption("Listen to each word, then type it. The app will check your spelling.")
            items = sheet["questions"]

            if "spell_idx" not in st.session_state:
                st.session_state.spell_idx = 0
                st.session_state.spell_answers = {}

            idx = st.session_state.spell_idx
            total = len(items)

            if idx < total:
                q = items[idx]
                word = q["question"]

                if q.get("is_review"):
                    st.caption("🔄 Review word")

                st.markdown(f"### Word {idx + 1} of {total}")

                # TTS button using JavaScript Web Speech API
                st.markdown(f"""
                <div style="text-align: center; margin: 1rem 0;">
                    <button onclick="sayWord('{word}')" style="
                        background-color: #1798d3; color: white; border: none; border-radius: 50%;
                        width: 80px; height: 80px; font-size: 2rem; cursor: pointer;
                        box-shadow: 0 4px 12px rgba(23,152,211,0.3);
                    ">🔊</button>
                    <p style="margin-top: 0.5rem; color: #666;">Tap to hear the word</p>
                </div>
                <script>
                function sayWord(word) {{
                    var u = new SpeechSynthesisUtterance(word);
                    u.lang = 'en-GB';
                    u.rate = 0.8;
                    speechSynthesis.speak(u);
                }}
                </script>
                """, unsafe_allow_html=True)

                user_answer = st.text_input(
                    "Type the word:", key=f"spell_ans_{idx}",
                    placeholder="Spell the word...",
                    autocomplete="off",
                )

                col1, col2 = st.columns(2)
                with col1:
                    if st.button("Check →", key=f"spell_next_{idx}", use_container_width=True, type="primary"):
                        if user_answer:
                            st.session_state.spell_answers[word] = user_answer.strip()
                        else:
                            st.session_state.spell_answers[word] = ""
                        st.session_state.spell_idx = idx + 1
                        st.rerun()
                with col2:
                    if st.button("Skip", key=f"spell_skip_{idx}", use_container_width=True):
                        st.session_state.spell_answers[word] = ""
                        st.session_state.spell_idx = idx + 1
                        st.rerun()

                # Progress bar
                st.progress(idx / total)

            else:
                # All words answered — show results
                answers = st.session_state.spell_answers
                correct = 0
                errors = 0
                item_results = {}
                for q in items:
                    word = q["question"]
                    user_ans = str(answers.get(word, "")).strip().lower()
                    expected = word.lower()
                    is_correct = user_ans == expected
                    item_results[word] = is_correct
                    if is_correct:
                        correct += 1
                    else:
                        errors += 1

                accuracy = round(correct / total * 100, 1) if total > 0 else 0

                st.markdown("### Spelling Check Complete!")
                st.metric("Accuracy", f"{accuracy}%", f"{correct}/{total} correct")

                if accuracy == 100:
                    st.balloons()
                    st.success(f"🌟 Amazing {pupil['firstName']}! All words correct!")
                elif accuracy >= 80:
                    st.success(f"Good effort {pupil['firstName']}! {correct} out of {total} correct.")
                else:
                    st.info(f"You got {correct} out of {total}. Keep practising!")

                # Show each word with result
                with st.expander("See your answers"):
                    for q in items:
                        word = q["question"]
                        result = item_results.get(word, False)
                        user_ans = answers.get(word, "—")
                        icon = "✅" if result else "❌"
                        if result:
                            st.markdown(f"{icon} **{word}**")
                        else:
                            st.markdown(f"{icon} ~~{user_ans}~~ → **{word}**")

                if st.button("Save my result", use_container_width=True, type="primary"):
                    add_probe(pupil["id"], skill_id, "untimed", correct, errors, total, 0, "", item_results)
                    filepath = str(PROBES_DIR / pupil["id"] / f"{skill_id}.json")
                    git_add_commit_push(filepath, f"Spelling check: {pupil['firstName']} {step['name']}")
                    for key in ["spell_idx", "spell_answers"]:
                        st.session_state.pop(key, None)
                    st.rerun()

    st.stop()

# ── Main Teacher App ────────────────────────────────────────────────────────

# Sidebar
with st.sidebar:
    pending = git_pending_commits()
    if pending > 0:
        st.warning(f"{pending} unsynced change{'s' if pending != 1 else ''}")
        if st.button("Sync now", use_container_width=True):
            git_pull()
            st.session_state.pupils_data = load_pupils()
            st.session_state.ladders_data = load_ladders()
            st.rerun()
    else:
        st.success("All synced ✓")

    st.divider()

    # Import/export
    with st.expander("Import / Export"):
        uploaded = st.file_uploader("Import JSON", type=["json"], key="import_json")
        if uploaded:
            import json
            data = json.load(uploaded)
            if "pupils" in data:
                st.session_state.pupils_data = data
                save_pupils(data)
                st.success("Pupils data imported!")
                st.rerun()
            elif "ladders" in data:
                st.session_state.ladders_data = data
                save_ladders(data)
                st.success("Ladders data imported!")
                st.rerun()

        pupils_json = json.dumps(st.session_state.pupils_data, indent=2)
        st.download_button("Download pupils JSON", pupils_json, "pupils.json", "application/json")

st.markdown(logo_html("Precision Teaching"), unsafe_allow_html=True)
st.caption("Wallscourt Farm Academy")
st.divider()

# ── Tabs ────────────────────────────────────────────────────────────────────

tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
    "Dashboard", "Pupils", "Skill Ladders", "Daily Check", "Progress", "Print Grids"
])

# ── Tab 1: Dashboard ───────────────────────────────────────────────────────

with tab1:
    pupils_data = st.session_state.pupils_data
    ladders_data = st.session_state.ladders_data

    col1, col2, col3, col4, col5 = st.columns(5)
    total_pupils = len(pupils_data["pupils"])
    active_count = count_by_status(pupils_data, "active")
    mastered_count = count_by_status(pupils_data, "mastered") + count_by_status(pupils_data, "secure")
    reviews_due = get_reviews_due(pupils_data, ladders_data)

    with col1:
        st.markdown(f'<div class="metric-card"><h2>{total_pupils}</h2><p>Pupils</p></div>', unsafe_allow_html=True)
    with col2:
        st.markdown(f'<div class="metric-card"><h2>{active_count}</h2><p>Active Skills</p></div>', unsafe_allow_html=True)
    with col3:
        st.markdown(f'<div class="metric-card"><h2>{mastered_count}</h2><p>Mastered</p></div>', unsafe_allow_html=True)
    with col4:
        st.markdown(f'<div class="metric-card"><h2>{len(reviews_due)}</h2><p>Reviews Due</p></div>', unsafe_allow_html=True)
    with col5:
        st.markdown(f'<div class="metric-card"><h2>—</h2><p>Avg Celeration</p></div>', unsafe_allow_html=True)

    st.divider()

    if not pupils_data["pupils"]:
        st.info("No pupils yet. Go to the **Pupils** tab to add your class.")
    else:
        rows = []
        for p in pupils_data["pupils"]:
            skills = p.get("currentSkills", {})
            active = [s for s, entry in skills.items()
                      if (isinstance(entry, dict) and entry.get("status") == "active") or
                         (isinstance(entry, str) and entry == "active")]
            latest = ""
            if active:
                skill_id = active[0]
                probes_data = load_probes(p["id"], skill_id)
                if probes_data["probes"]:
                    last = probes_data["probes"][-1]
                    step = get_step(ladders_data, skill_id)
                    cpm = round(last["correct"] / (last["durationSec"] / 60), 1) if last.get("durationSec", 0) > 0 else "—"
                    latest = f"{cpm}/min" if last["mode"] == "timed" else f"{last['correct']}/{last['correct']+last['errors']}"
                    if step:
                        status = "✅ Mastered" if skills.get(skill_id) == "mastered" else f"{cpm}/min" if isinstance(cpm, (int, float)) else latest
            rows.append({
                "Name": f"{p['firstName']} {p['lastName']}",
                "Class": p.get("class", ""),
                "Active Skills": len(active),
                "Mastered": sum(1 for entry in skills.values()
                               if (isinstance(entry, dict) and entry.get("status") in ("mastered", "secure")) or
                                  (isinstance(entry, str) and entry == "mastered")),
                "Latest": latest,
            })
        st.dataframe(rows, use_container_width=True, hide_index=True)

    # ── Today's Activity ─────────────────────────────────────────────────────

    st.divider()
    st.subheader("Today's Activity")

    # Count sheets to print by subject
    maths_sheets = []
    phonics_sheets = []
    spelling_checks = []
    for p in pupils_data["pupils"]:
        active = active_skills_for(p)
        for skill_id in active:
            step = get_step(ladders_data, skill_id)
            if not step:
                continue
            ladder = None
            for l in ladders_data["ladders"]:
                if l["id"] == step["ladder_id"]:
                    ladder = l
                    break
            subject = ladder["subject"] if ladder else "maths"
            if subject == "maths":
                maths_sheets.append((p, step))
            elif subject == "phonics":
                phonics_sheets.append((p, step))
            elif subject == "spellings":
                spelling_checks.append((p, step))

    col_a, col_b, col_c = st.columns(3)
    with col_a:
        st.metric("Maths sheets to print", len(maths_sheets))
        if maths_sheets:
            with st.expander("Who needs maths"):
                for p, step in maths_sheets:
                    st.markdown(f"- {p['firstName']} {p['lastName']}: {step['name']}")
    with col_b:
        st.metric("Phonics (adult needed)", len(phonics_sheets))
        if phonics_sheets:
            with st.expander("Who needs reading"):
                for p, step in phonics_sheets:
                    st.markdown(f"- {p['firstName']} {p['lastName']}: {step['name']}")
    with col_c:
        st.metric("Spelling checks due", len(spelling_checks))
        if spelling_checks:
            with st.expander("Who needs spelling check"):
                for p, step in spelling_checks:
                    st.markdown(f"- {p['firstName']} {p['lastName']}: {step['name']}")

    # ── Reviews Due ──────────────────────────────────────────────────────────

    st.divider()
    st.subheader("Reviews Due")
    if reviews_due:
        for review in reviews_due:
            p = review["pupil"]
            step = review["step"]
            stage = review["reviewStage"]
            stage_labels = {0: "1 week", 1: "2 weeks", 2: "1 month"}
            overdue = review["overdue"]
            overdue_text = f" ({overdue}d overdue)" if overdue > 0 else ""
            col1, col2, col3 = st.columns([3, 2, 1])
            with col1:
                st.markdown(f"**{p['firstName']} {p['lastName']}** — {step['ladder_name']}: {step['name']}")
            with col2:
                stage_label = stage_labels.get(stage, "?")
                if overdue > 0:
                    st.warning(f"{stage_label} review{overdue_text}")
                else:
                    st.info(f"{stage_label} review")
            with col3:
                if st.button("Review", key=f"review_{p['id']}_{review['skill_id']}"):
                    st.session_state.review_pupil_id = p["id"]
                    st.session_state.review_skill_id = review["skill_id"]
                    st.rerun()
    else:
        st.success("No reviews due today ✓")

# ── Tab 2: Pupils ──────────────────────────────────────────────────────────

with tab2:
    pupils_data = st.session_state.pupils_data
    ladders_data = st.session_state.ladders_data

    st.markdown("**Add a pupil to track** — search the school roster, no typing a name")
    tracked_upns = {p.get("upn") for p in pupils_data["pupils"] if p.get("upn")}

    search_col, refresh_col = st.columns([4, 1])
    with search_col:
        roster_query = st.text_input("Search by name", key="roster_search", label_visibility="collapsed", placeholder="Type a name…")
    with refresh_col:
        if st.button("🔄 Refresh names", help="Refresh names/classes of already-tracked pupils from the roster"):
            result = sync_pupils_from_roster(pupils_data)
            if result.get("error"):
                st.warning("Could not reach the roster right now — try again shortly.")
            else:
                save_pupils(pupils_data)
                git_add_commit_push("data/pupils.json", "Refresh pupil names/classes from roster")
                msg = f"{result['updated']} refreshed"
                if result["upnAttached"]:
                    msg += f", {result['upnAttached']} matched to the roster for the first time"
                if result["unmatched"]:
                    msg += f". Not found on the roster: {', '.join(result['unmatched'])}"
                st.success(msg)
                st.rerun()

    if roster_query.strip():
        hub_pupils = fetch_hub_pupils()
        if not hub_pupils:
            st.warning("Could not reach the roster right now — try again shortly.")
        else:
            q = roster_query.strip().lower()
            matches = [p for p in hub_pupils
                       if q in f"{p.get('first','')} {p.get('last','')}".lower()
                       and p.get("upn") not in tracked_upns][:10]
            if not matches:
                st.info("No match on the active roster (or they're already being tracked).")
            for p in matches:
                label = f"{p.get('first','')} {p.get('last','')} — {p.get('yearGroup','')} {p.get('class','')}"
                if st.button(f"+ {label}", key=f"addroster_{p.get('upn')}"):
                    pupil = add_pupil(pupils_data, p.get("upn"), p.get("first", ""), p.get("last", ""), p.get("class", ""), p.get("yearGroup", ""))
                    save_pupils(pupils_data)
                    git_add_commit_push("data/pupils.json", f"Track pupil: {p.get('first')} {p.get('last')}")
                    st.success(f"Now tracking {p.get('first')} {p.get('last')} (token: **{pupil['token']}**)")
                    st.rerun()

    # ── Set Starting Points ──────────────────────────────────────────────

    st.divider()
    st.subheader("Set Starting Points")
    st.caption("Choose where each pupil is working. Prior steps are marked mastered automatically. Mark which individual items they already know within their current skill.")

    if not pupils_data["pupils"]:
        st.info("Add pupils first, then set their starting points.")
    else:
        pupil_options, _ = year_group_filtered_pupils(pupils_data, "sp")
        if not pupil_options:
            st.info("No pupils in this year group.")
            sp_pupil_id = None
        else:
            sp_pupil = st.selectbox("Select pupil", pupil_options, format_func=lambda x: x[1], key="sp_pupil")
            sp_pupil_id = sp_pupil[0] if sp_pupil else None

        if sp_pupil_id:
            sp_pupil_data = get_pupil(pupils_data, sp_pupil_id)
            skills = sp_pupil_data.get("currentSkills", {})

            for ladder in ladders_data["ladders"]:
                with st.expander(f"{ladder['name']} ({ladder['subject']})"):
                    # Visual ladder progression
                    cols = st.columns(min(len(ladder["steps"]), 6))
                    for i, step in enumerate(ladder["steps"]):
                        with cols[i % len(cols)]:
                            sid = step["id"]
                            status = skill_status(skills.get(sid, ""))
                            if status == "mastered":
                                st.markdown(f"✅ **{step['name']}**")
                            elif status == "active":
                                st.markdown(f"🔵 **{step['name']}**")
                            elif status == "secure":
                                st.markdown(f"🟢 **{step['name']}**")
                            else:
                                st.markdown(f"⬜ {step['name']}")

                    # One dropdown: "Where is this pupil working?"
                    # Selecting a step marks all prior steps as mastered, this one as active
                    step_options = [(s["id"], s["name"]) for s in ladder["steps"]]
                    step_options.insert(0, ("none", "— not assigned —"))

                    current_step_id = "none"
                    for s in ladder["steps"]:
                        if skills.get(s["id"]) == "active":
                            current_step_id = s["id"]

                    selected_step = st.selectbox(
                        "Currently working on",
                        options=step_options,
                        index=[o[0] for o in step_options].index(current_step_id) if current_step_id in [o[0] for o in step_options] else 0,
                        format_func=lambda x: x[1],
                        key=f"active_{sp_pupil_id}_{ladder['id']}"
                    )

                    # Per-item baseline within the selected skill
                    selected_step_id = selected_step[0]
                    item_defaults = {}
                    if selected_step_id != "none":
                        selected_step_data = None
                        for s in ladder["steps"]:
                            if s["id"] == selected_step_id:
                                selected_step_data = s
                                break

                        if selected_step_data and is_windowed(selected_step_data):
                            window_size = selected_step_data["windowSize"]
                            st.info(
                                f"This is a rolling-list skill — {sp_pupil_data['firstName']} will start with the "
                                f"first {window_size} items ({', '.join(selected_step_data['items'][:window_size])}). "
                                f"Run a Baseline in Daily Check to record what they already know, then use "
                                f"'Update rolling list' there as they master items."
                            )
                        elif selected_step_data:
                            st.markdown(f"**Items in {selected_step_data['name']}:** Tick the ones {sp_pupil_data['firstName']} already knows confidently.")
                            # Load any existing baseline for this skill
                            existing_probes = load_probes(sp_pupil_id, selected_step_id)
                            existing_baseline = get_baseline(existing_probes)
                            if existing_baseline and "itemResults" in existing_baseline:
                                item_defaults = existing_baseline["itemResults"]

                            known_items = st.multiselect(
                                "Known items",
                                options=selected_step_data["items"],
                                default=[k for k, v in item_defaults.items() if v] if item_defaults else [],
                                key=f"known_items_{sp_pupil_id}_{selected_step_id}"
                            )

                        existing_entry = skills.get(selected_step_id)
                        default_items_per_sheet = existing_entry.get("itemsPerSheet", 25) if isinstance(existing_entry, dict) else 25
                        items_per_sheet = st.number_input(
                            "Items per sheet",
                            min_value=20, max_value=30, value=default_items_per_sheet, step=1,
                            help="How many questions fill one practice sheet — aim for about a minute's worth.",
                            key=f"items_per_sheet_{sp_pupil_id}_{selected_step_id}",
                        )

                    if st.button(f"Set starting point", key=f"set_sp_{sp_pupil_id}_{ladder['id']}"):
                        # Clear all skills in this ladder
                        for step in ladder["steps"]:
                            sp_pupil_data.setdefault("currentSkills", {}).pop(step["id"], None)

                        if selected_step_id != "none":
                            # Mark all steps before the selected one as mastered
                            for step in ladder["steps"]:
                                if step["id"] == selected_step_id:
                                    break
                                set_skill_status(sp_pupil_data, step["id"], "mastered")

                            # Set selected step as active
                            set_skill_status(sp_pupil_data, selected_step_id, "active")
                            sp_pupil_data["currentSkills"][selected_step_id]["itemsPerSheet"] = items_per_sheet

                            step_data = None
                            for s in ladder["steps"]:
                                if s["id"] == selected_step_id:
                                    step_data = s
                                    break

                            if step_data and is_windowed(step_data):
                                # Rolling-list skill — initialise the window, real
                                # per-item baseline happens in Daily Check.
                                window_size = step_data["windowSize"]
                                initial_window = step_data["items"][:window_size]
                                set_active_window(sp_pupil_data, selected_step_id, initial_window, window_size - 1)
                            elif step_data:
                                # Save a baseline probe for this skill with per-item data
                                known_set = set(known_items) if selected_step_id != "none" else set()
                                item_results = {item: (item in known_set) for item in step_data["items"]}
                                correct = sum(1 for v in item_results.values() if v)
                                errors = sum(1 for v in item_results.values() if not v)
                                add_probe(sp_pupil_id, selected_step_id, "baseline", correct, errors, len(step_data["items"]), 0, "", item_results)

                        save_pupils(pupils_data)
                        # Commit both pupils.json and any probe files
                        git_add_commit_push("data/pupils.json", f"Set starting point for {sp_pupil_data['firstName']}: {ladder['name']}")
                        if selected_step_id != "none" and step_data and not is_windowed(step_data):
                            filepath = str(PROBES_DIR / sp_pupil_id / f"{selected_step_id}.json")
                            git_add_commit_push(filepath, f"Baseline for {sp_pupil_data['firstName']}: {selected_step_id}")
                        st.success(f"Updated {ladder['name']} for {sp_pupil_data['firstName']}!")
                        st.rerun()

    # ── Pupil List ─────────────────────────────────────────────────────────

    st.divider()
    st.subheader("Pupils")

    if not pupils_data["pupils"]:
        st.info("No pupils added yet.")
    else:
        for p in pupils_data["pupils"]:
            skills = p.get("currentSkills", {})
            active_count = sum(1 for v in skills.values() if skill_status(v) == "active")
            mastered_count = sum(1 for v in skills.values() if skill_status(v) in ("mastered", "secure"))
            label = f"{p['firstName']} {p['lastName']} ({p.get('class', '—')}) — {active_count} active, {mastered_count} mastered — Token: `{p['token']}`"

            with st.expander(label):
                if skills:
                    st.markdown("**Current skills:**")
                    for ladder in ladders_data["ladders"]:
                        ladder_steps = []
                        for step in ladder["steps"]:
                            sid = step["id"]
                            if sid in skills:
                                s = skill_status(skills[sid])
                                icon = {"mastered": "✅", "active": "🔵", "secure": "🟢", "upcoming": "⬜"}.get(s, "—")
                                ladder_steps.append(f"{icon} {step['name']}")
                        if ladder_steps:
                            st.markdown(f"**{ladder['name']}:** {' → '.join(ladder_steps)}")
                else:
                    st.info("No skills assigned yet. Use 'Set Starting Points' above.")

                # Stop tracking — only removes them from this tool's list, not
                # from the school roster or any other WFA tool.
                if st.button(f"Stop tracking {p['firstName']}", key=f"remove_{p['id']}"):
                    pupils_data["pupils"] = [pp for pp in pupils_data["pupils"] if pp["id"] != p["id"]]
                    save_pupils(pupils_data)
                    git_add_commit_push("data/pupils.json", f"Stop tracking {p['firstName']} {p['lastName']}")
                    st.rerun()

# ── Tab 3: Skill Ladders ───────────────────────────────────────────────────

with tab3:
    ladders_data = st.session_state.ladders_data

    for ladder in ladders_data["ladders"]:
        with st.expander(f"{ladder['name']} ({ladder['subject']})"):
            for i, step in enumerate(ladder["steps"]):
                status_emoji = "✅" if i == 0 else "🔵"
                st.markdown(f"**{step['name']}**")
                st.caption(f"{len(step['items'])} items: {', '.join(step['items'][:8])}{'...' if len(step['items']) > 8 else ''}")
                if i < len(ladder["steps"]) - 1:
                    st.markdown("↓")

# ── Tab 4: Daily Check ──────────────────────────────────────────────────────

with tab4:
    pupils_data = st.session_state.pupils_data
    ladders_data = st.session_state.ladders_data

    if not pupils_data["pupils"]:
        st.info("Add pupils first in the Pupils tab.")
    else:
        pupil_options, _ = year_group_filtered_pupils(pupils_data, "pe")
        if not pupil_options:
            st.info("No pupils in this year group.")
            pupil_id = None
        else:
            selected_pupil = st.selectbox("Select pupil", pupil_options, format_func=lambda x: x[1])
            pupil_id = selected_pupil[0] if selected_pupil else None

        if pupil_id:
            pupil = get_pupil(pupils_data, pupil_id)
            active_skills = active_skills_for(pupil)

            if not active_skills:
                st.info(f"No active skills for {pupil['firstName']}. Assign skills in the Pupils tab.")
            else:
                skill_options = []
                for skill_id in active_skills:
                    step = get_step(ladders_data, skill_id)
                    if step:
                        skill_options.append((skill_id, f"{step['ladder_name']}: {step['name']}"))

                if not skill_options:
                    st.info("No matching skills found in ladders.")
                else:
                    selected_skill = st.selectbox("Select skill", skill_options, format_func=lambda x: x[1])
                    skill_id = selected_skill[0] if selected_skill else None

                    if skill_id:
                        step = get_step(ladders_data, skill_id)
                        aim = step["aim"]

                        windowed = is_windowed(step)
                        # Rolling-list skills only ever drill the pupil's current
                        # window, not the whole step — the window moves forward
                        # via "Update rolling list" below, not by acing it all at once.
                        probe_items = get_active_window(pupil, skill_id, step) if windowed else step["items"]
                        if windowed:
                            st.caption(f"🔁 Rolling list — currently: {', '.join(probe_items)}")

                        # Check if baseline exists
                        probes_data = load_probes(pupil_id, skill_id)
                        has_baseline = any(p.get("mode") == "baseline" for p in probes_data.get("probes", []))

                        mode = st.radio("Check type:", ["Timed Check", "Untimed Check", "Baseline"], horizontal=True)

                        if mode == "Baseline":
                            if has_baseline:
                                st.warning("A baseline already exists for this skill. Recording a new baseline will replace the old one's position.")
                            st.markdown(f"**Items ({len(probe_items)}):** Mark each item the pupil already knows.")
                            st.caption("This records their starting point. Only items they can do confidently and quickly should be marked correct.")

                            if "baseline_results" not in st.session_state:
                                st.session_state.baseline_results = {item: None for item in probe_items}

                            results = st.session_state.baseline_results
                            for item in probe_items:
                                current = results.get(item)
                                col1, col2, col3 = st.columns([4, 1, 1])
                                with col1:
                                    emoji = "✅" if current is True else ("❌" if current is False else "⬜")
                                    st.markdown(f"{emoji} **{item}**")
                                with col2:
                                    if st.button("✓", key=f"bl_correct_{item}"):
                                        st.session_state.baseline_results[item] = True
                                        st.rerun()
                                with col3:
                                    if st.button("✗", key=f"bl_incorrect_{item}"):
                                        st.session_state.baseline_results[item] = False
                                        st.rerun()

                            answered = {k: v for k, v in results.items() if v is not None}
                            if answered:
                                correct = sum(1 for v in answered.values() if v)
                                total = len(answered)
                                st.metric("Known items", f"{correct}/{len(probe_items)}", f"{correct}/{total} assessed")

                            if st.button("Save Baseline", use_container_width=True, type="primary"):
                                answered = {k: v for k, v in results.items() if v is not None}
                                correct = sum(1 for v in answered.values() if v)
                                errors = sum(1 for v in answered.values() if not v)
                                item_results = {k: v for k, v in results.items() if v is not None}
                                add_probe(pupil_id, skill_id, "baseline", correct, errors, len(probe_items), 0, "", item_results)
                                filepath = str(PROBES_DIR / pupil_id / f"{skill_id}.json")
                                git_add_commit_push(filepath, f"Baseline: {pupil['firstName']} {step['name']}")
                                if "baseline_results" in st.session_state:
                                    del st.session_state.baseline_results
                                st.success("Baseline saved!")
                                st.rerun()

                        elif mode == "Timed Check":
                            st.markdown(f"**Items ({len(probe_items)}):** {', '.join(probe_items[:12])}{'...' if len(probe_items) > 12 else ''}")

                            if "probe_active" not in st.session_state:
                                if st.button("Start Check", use_container_width=True, type="primary"):
                                    st.session_state.probe_active = True
                                    st.session_state.probe_start = time.time()
                                    st.session_state.probe_results = {}
                                    for item in probe_items:
                                        st.session_state.probe_results[item] = None
                                    st.rerun()

                            if st.session_state.get("probe_active"):
                                elapsed = time.time() - st.session_state.probe_start
                                remaining = max(0, aim["timedSec"] - elapsed)

                                if remaining <= 0:
                                    results = st.session_state.probe_results
                                    answered = {k: v for k, v in results.items() if v is not None}
                                    correct = sum(1 for v in answered.values() if v)
                                    errors = sum(1 for v in answered.values() if not v)
                                    duration = aim["timedSec"]
                                    cpm = round(correct / (duration / 60), 1) if duration > 0 else 0
                                    aim_met = cpm >= aim["correctPerMin"] and errors <= aim["maxErrors"]

                                    st.markdown(f"### Check Complete!")
                                    st.metric("Correct per minute", f"{cpm}", f"{correct} correct, {errors} errors")

                                    if aim_met:
                                        st.markdown('<div class="aim-met">🎯 <strong>Target hit!</strong> Consider progressing to the next skill.</div>', unsafe_allow_html=True)
                                    else:
                                        st.markdown('<div class="aim-not-met">Keep practising — not quite there yet.</div>', unsafe_allow_html=True)

                                    notes = st.text_input("Notes (optional)", key="probe_notes")
                                    if st.button("Save Check", use_container_width=True, type="primary"):
                                        item_results = {k: v for k, v in st.session_state.probe_results.items() if v is not None}
                                        add_probe(pupil_id, skill_id, "timed", correct, errors, len(probe_items), duration, notes, item_results)
                                        filepath = str(PROBES_DIR / pupil_id / f"{skill_id}.json")
                                        git_add_commit_push(filepath, f"Timed check: {pupil['firstName']} {step['name']}")

                                        # Rolling-list skills graduate via "Update rolling list"
                                        # below (once the whole step is known), not from
                                        # acing a single window's probe.
                                        if aim_met and not windowed:
                                            next_step = get_next_step(ladders_data, skill_id)
                                            if next_step:
                                                set_skill_status(pupil, skill_id, "mastered")
                                                set_skill_status(pupil, next_step["id"], "active")
                                                save_pupils(pupils_data)
                                                git_add_commit_push("data/pupils.json", f"Progress {pupil['firstName']}: {step['name']} → {next_step['name']}")

                                        del st.session_state.probe_active
                                        del st.session_state.probe_start
                                        del st.session_state.probe_results
                                        if "probe_notes" in st.session_state:
                                            del st.session_state.probe_notes
                                        st.rerun()

                                    if st.button("Discard", key="discard_probe"):
                                        del st.session_state.probe_active
                                        del st.session_state.probe_start
                                        del st.session_state.probe_results
                                        st.rerun()

                                else:
                                    progress_pct = int((1 - remaining / aim["timedSec"]) * 100)
                                    st.progress(progress_pct)
                                    st.markdown(f"## ⏱️ {int(remaining)}s remaining")
                                    st.markdown(f"**{step['name']}**")

                                    results = st.session_state.probe_results
                                    answered_count = sum(1 for v in results.values() if v is not None)
                                    correct_count = sum(1 for v in results.values() if v is True)
                                    error_count = sum(1 for v in results.values() if v is False)

                                    col_info1, col_info2 = st.columns(2)
                                    with col_info1:
                                        st.metric("Correct", correct_count)
                                    with col_info2:
                                        st.metric("Errors", error_count)

                                    for item in probe_items:
                                        current = results.get(item)
                                        col1, col2, col3 = st.columns([4, 1, 1])
                                        with col1:
                                            emoji = "✅" if current is True else ("❌" if current is False else "⬜")
                                            st.markdown(f"{emoji} **{item}**")
                                        with col2:
                                            if st.button("✓", key=f"p_correct_{item}"):
                                                st.session_state.probe_results[item] = True
                                                st.rerun()
                                        with col3:
                                            if st.button("✗", key=f"p_incorrect_{item}"):
                                                st.session_state.probe_results[item] = False
                                                st.rerun()

                                    if st.button("End Check Early", type="secondary"):
                                        st.session_state.probe_start = time.time() - aim["timedSec"]
                                        st.rerun()

                        else:  # Untimed Check
                            if "untimed_results" not in st.session_state:
                                st.session_state.untimed_results = {item: None for item in probe_items}

                            st.markdown(f"**Items ({len(probe_items)}):** Mark each as correct or incorrect.")

                            results = st.session_state.untimed_results
                            for item in probe_items:
                                current = results.get(item)
                                col1, col2, col3 = st.columns([4, 1, 1])
                                with col1:
                                    emoji = "✅" if current is True else ("❌" if current is False else "⬜")
                                    st.markdown(f"{emoji} **{item}**")
                                with col2:
                                    if st.button("✓", key=f"u_correct_{item}"):
                                        st.session_state.untimed_results[item] = True
                                        st.rerun()
                                with col3:
                                    if st.button("✗", key=f"u_incorrect_{item}"):
                                        st.session_state.untimed_results[item] = False
                                        st.rerun()

                            answered = {k: v for k, v in results.items() if v is not None}
                            if answered:
                                correct = sum(1 for v in answered.values() if v)
                                total = len(answered)
                                accuracy = round(correct / total * 100, 1)
                                st.metric("Accuracy", f"{accuracy}%", f"{correct}/{total}")

                            if st.button("Save Check", use_container_width=True, type="primary"):
                                answered = {k: v for k, v in results.items() if v is not None}
                                correct = sum(1 for v in answered.values() if v)
                                errors = sum(1 for v in answered.values() if not v)
                                item_results = dict(answered)
                                add_probe(pupil_id, skill_id, "untimed", correct, errors, len(probe_items), 0, "", item_results)
                                filepath = str(PROBES_DIR / pupil_id / f"{skill_id}.json")
                                git_add_commit_push(filepath, f"Untimed check: {pupil['firstName']} {step['name']}")
                                if "untimed_results" in st.session_state:
                                    del st.session_state.untimed_results
                                st.success("Check saved!")
                                st.rerun()

                        if windowed:
                            st.divider()
                            st.markdown("#### Update rolling list")
                            wprobes_data = load_probes(pupil_id, skill_id)
                            if not wprobes_data.get("probes"):
                                st.caption("Record a check above first, then come back here to move the list on.")
                            else:
                                current_window = get_active_window(pupil, skill_id, step)
                                frontier = get_window_frontier(pupil, skill_id, step)
                                suggested, _, _ = suggest_next_window(pupil, skill_id, step, wprobes_data)
                                mastery = get_item_mastery(wprobes_data, current_window)

                                st.caption("Tick which items should stay in the list — pre-ticked from the latest results. Untick to keep practising an item, or tick a known one to keep reviewing it.")
                                chosen = []
                                for item in current_window:
                                    known = mastery.get(item, {}).get("known", False)
                                    keep = st.checkbox(
                                        f"{item}{' — known' if known else ''}",
                                        value=(item in suggested),
                                        key=f"keep_{pupil_id}_{skill_id}_{item}",
                                    )
                                    if keep:
                                        chosen.append(item)

                                drop_count = len(current_window) - len(chosen)
                                backfill = step["items"][frontier + 1: frontier + 1 + drop_count]
                                next_window = chosen + backfill
                                next_frontier = frontier + len(backfill)
                                full_mastery = get_item_mastery(wprobes_data, step["items"])
                                step_complete = (
                                    next_frontier >= len(step["items"]) - 1
                                    and all(full_mastery.get(i, {}).get("known") for i in step["items"])
                                )

                                st.markdown(f"**Next list:** {', '.join(next_window) if next_window else '— nothing left, step complete —'}")
                                if step_complete:
                                    st.success("Every item in this step is known — confirming will mark it mastered and move on to the next step.")

                                if st.button("Confirm list", type="primary", key=f"confirm_window_{pupil_id}_{skill_id}"):
                                    set_active_window(pupil, skill_id, next_window, next_frontier)
                                    if step_complete:
                                        set_skill_status(pupil, skill_id, "mastered")
                                        next_step = get_next_step(ladders_data, skill_id)
                                        if next_step:
                                            set_skill_status(pupil, next_step["id"], "active")
                                    save_pupils(pupils_data)
                                    git_add_commit_push("data/pupils.json", f"Update rolling list for {pupil['firstName']}: {step['name']}")
                                    st.success("List updated!")
                                    st.rerun()

# ── Tab 5: Progress ────────────────────────────────────────────────────────

with tab5:
    pupils_data = st.session_state.pupils_data
    ladders_data = st.session_state.ladders_data

    if not pupils_data["pupils"]:
        st.info("Add pupils first.")
    else:
        pupil_options, _ = year_group_filtered_pupils(pupils_data, "progress")
        if not pupil_options:
            st.info("No pupils in this year group.")
            pupil_id = None
        else:
            selected_pupil = st.selectbox("Select pupil", pupil_options, format_func=lambda x: x[1], key="progress_pupil")
            pupil_id = selected_pupil[0] if selected_pupil else None

        if pupil_id:
            pupil = get_pupil(pupils_data, pupil_id)
            all_probes = load_all_probes_for_pupil(pupil_id)
            skills = pupil.get("currentSkills", {})

            # Show all skills (mastered, active, upcoming) that have any data
            skill_ids_with_data = set(all_probes.keys())
            skill_ids_assigned = set(skills.keys())
            all_skill_ids = skill_ids_with_data | skill_ids_assigned

            if not all_skill_ids:
                st.info("No skills assigned yet. Use the Pupils tab to set starting points, then run a baseline.")
            else:
                # Overview: all skills with progress summaries
                st.subheader("Progress Overview")
                overview_rows = []
                for skill_id in sorted(all_skill_ids):
                    step = get_step(ladders_data, skill_id)
                    if not step:
                        continue
                    status = skill_status(skills.get(skill_id, ""))
                    status_icon = {"mastered": "✅", "active": "🔵", "secure": "🟢", "upcoming": "⬜"}.get(status, "—")
                    probes_data = all_probes.get(skill_id, {"pupilId": pupil_id, "skillId": skill_id, "probes": []})
                    summary = get_progress_summary(probes_data, step)
                    overview_rows.append({
                        "Skill": f"{status_icon} {step['name']}",
                        "Ladder": step["ladder_name"],
                        "Baseline": f"{summary['baselineCorrect']}/{summary['baselineTotal']}" if summary["baselineDate"] else "—",
                        "Latest": f"{summary['latestCorrect']}/{summary['latestTotal']}" if summary["latestDate"] else "—",
                        "Known": f"{summary['totalFactsKnown']}/{summary['totalFacts']}",
                        "New facts": f"+{summary['newFactsLearned']}" if summary["newFactsLearned"] > 0 else "—",
                        "Progress %": f"{summary['progressPct']}%" if summary["baselineDate"] else "—",
                        "Checks": summary["probesCount"],
                    })
                st.dataframe(overview_rows, use_container_width=True, hide_index=True)

                st.divider()

                # Detailed view for one skill
                skill_options = []
                for skill_id in sorted(all_skill_ids):
                    step = get_step(ladders_data, skill_id)
                    if step:
                        status = skill_status(skills.get(skill_id, ""))
                        status_icon = {"mastered": "✅", "active": "🔵", "secure": "🟢", "upcoming": "⬜"}.get(status, "—")
                        skill_options.append((skill_id, f"{status_icon} {step['ladder_name']}: {step['name']}"))

                if not skill_options:
                    st.info("No matching skill data.")
                else:
                    selected_skill = st.selectbox("View skill detail", skill_options, format_func=lambda x: x[1], key="progress_skill")
                    skill_id = selected_skill[0] if selected_skill else None

                    if skill_id:
                        step = get_step(ladders_data, skill_id)
                        probes_data = all_probes.get(skill_id, {"pupilId": pupil_id, "skillId": skill_id, "probes": []})
                        probes = probes_data.get("probes", [])
                        summary = get_progress_summary(probes_data, step)

                        # Progress metrics
                        col1, col2, col3, col4, col5, col6 = st.columns(6)
                        with col1:
                            st.metric("Total facts", f"{summary['totalFactsKnown']}/{summary['totalFacts']}")
                        with col2:
                            st.metric("New facts learned", f"+{summary['newFactsLearned']}" if summary["newFactsLearned"] > 0 else "0")
                        with col3:
                            st.metric("Baseline", summary["baselineCpm"] or f"{summary['baselineCorrect']}/{summary['baselineTotal']}")
                        with col4:
                            st.metric("Latest", summary["latestCpm"] or f"{summary['latestCorrect']}/{summary['latestTotal']}")
                        with col5:
                            improvement = summary["improvementPct"]
                            st.metric("Improvement", f"+{improvement}%" if improvement > 0 else f"{improvement}%")
                        with col6:
                            progress = summary["progressPct"]
                            progress_label = "Progress vs baseline"
                            progress_help = (
                                "Started knowing 0, so this is new facts as a % of the whole set instead."
                                if summary["progressPctIsFallback"] else
                                "New facts learned, as a % of how many they knew at baseline (100% = learned as many new facts as they started with)."
                            )
                            st.metric(progress_label, f"+{progress}%" if progress > 0 else f"{progress}%", help=progress_help)

                        # Item-level mastery
                        if probes:
                            mastery = get_item_mastery(probes_data, step["items"])
                            baseline = get_baseline(probes_data)

                            st.markdown("#### Item Mastery")
                            known_new = []
                            known_baseline = []
                            unknown = []

                            for item in step["items"]:
                                m = mastery[item]
                                if m["known"]:
                                    if m["baselineKnown"]:
                                        known_baseline.append(item)
                                    else:
                                        known_new.append((item, m.get("firstKnown", "?")))
                                else:
                                    unknown.append(item)

                            if known_baseline:
                                st.markdown(f"**Already known at baseline ({len(known_baseline)}):** {', '.join(known_baseline)}")
                            if known_new:
                                new_strs = [f"{item} (since {date})" for item, date in known_new]
                                st.markdown(f"**Newly learned ({len(known_new)}):** {', '.join(new_strs)}")
                            if unknown:
                                st.markdown(f"**Still learning ({len(unknown)}):** {', '.join(unknown)}")

                            # Review schedule
                            skill_entry = skills.get(skill_id, {})
                            if isinstance(skill_entry, dict):
                                review_date = skill_entry.get("nextReview")
                                review_stage = skill_entry.get("reviewStage")
                                s_status = skill_entry.get("status", "")
                                if s_status == "secure":
                                    st.success("Fully secure — no more reviews needed")
                                elif s_status == "mastered" and review_date:
                                    stage_labels = {0: "1 week", 1: "2 weeks", 2: "1 month"}
                                    review_label = stage_labels.get(review_stage, "?")
                                    overdue = (date.today() - date.fromisoformat(review_date)).days
                                    if overdue > 0:
                                        st.warning(f"Review overdue! ({review_label} review was due {overdue}d ago)")
                                    elif overdue == 0:
                                        st.info(f"Review due today ({review_label} review)")
                                    else:
                                        st.caption(f"Next review: {review_date} ({review_label})")

                            # Progress bar
                            known_pct = summary["totalFactsKnown"] / summary["totalFacts"] * 100 if summary["totalFacts"] > 0 else 0
                            baseline_pct = len(known_baseline) / summary["totalFacts"] * 100 if summary["totalFacts"] > 0 else 0
                            st.progress(known_pct / 100)
                            st.caption(f"{known_pct:.0f}% known ({baseline_pct:.0f}% at baseline)")

                            # Celeration chart
                            aim = step["aim"]

                            try:
                                from charts import celeration_chart
                                fig = celeration_chart(probes, aim, step["name"], pupil['firstName'])
                                st.plotly_chart(fig, use_container_width=True)
                            except ImportError:
                                st.warning("Install plotly for charts: pip install plotly")

                            # Probe history table
                            rows = []
                            for p in reversed(probes):
                                duration_min = p["durationSec"] / 60 if p.get("durationSec", 0) > 0 else None
                                cpm = round(p["correct"] / duration_min, 1) if duration_min else "—"
                                mode_label = {"timed": "Timed", "untimed": "Untimed", "baseline": "Baseline"}.get(p["mode"], p["mode"])
                                rows.append({
                                    "Date": p["date"],
                                    "Mode": mode_label,
                                    "Correct": p["correct"],
                                    "Errors": p["errors"],
                                    "CPM": cpm,
                                    "Notes": p.get("notes", ""),
                                })
                            st.dataframe(rows, use_container_width=True, hide_index=True)

                            if check_aim_met(step, probes_data):
                                st.success(f"🎯 {step['name']} — Target reached!")
                        else:
                            st.info("No checks recorded yet. Run a Baseline to set where they begin.")

# ── Tab 6: Print Grids ─────────────────────────────────────────────────────

with tab6:
    pupils_data = st.session_state.pupils_data
    ladders_data = st.session_state.ladders_data

    if not pupils_data["pupils"]:
        st.info("Add pupils first.")
    else:
        st.subheader("Generate Activity Sheets")

        # Select pupil(s)
        pupil_options = [(p["id"], f"{p['firstName']} {p['lastName']}") for p in pupils_data["pupils"]]
        pupil_options.insert(0, ("all", "Whole class"))
        selected = st.selectbox("Select pupil", pupil_options, format_func=lambda x: x[1], key="print_pupil")
        selected_id = selected[0] if selected else None

        if selected_id:
            # Determine which pupils to generate sheets for
            if selected_id == "all":
                target_pupils = pupils_data["pupils"]
            else:
                target_pupils = [get_pupil(pupils_data, selected_id)]

            # Collect all active skills across selected pupils
            sheets_to_generate = []
            for p in target_pupils:
                active = active_skills_for(p)
                for skill_id in active:
                    step = get_step(ladders_data, skill_id)
                    if step:
                        sheets_to_generate.append((p, skill_id, step))

            if not sheets_to_generate:
                st.info("No active skills to generate sheets for.")
            else:
                # Options
                col_opt1, col_opt2 = st.columns(2)
                with col_opt1:
                    week_mode = st.radio("Sheets", ["Single sheet", "Whole week (5 days, same set)"], key="print_mode") == "Whole week (5 days, same set)"
                with col_opt2:
                    include_answers = st.checkbox("Include answer key", value=True, key="print_answers")

                st.caption(
                    "Item count per sheet comes from what was set for each pupil/skill in Set Starting Points. "
                    + "2 sheets per page, top/bottom with a cut line."
                    + (" A week is 5 day-sheets, so ~3 pages per skill." if week_mode else "")
                )
                st.markdown(f"**{len(sheets_to_generate)} skill{'s' if len(sheets_to_generate) != 1 else ''}{' × 5 days' if week_mode else ''}:**")
                for p, skill_id, step in sheets_to_generate:
                    entry = p.get("currentSkills", {}).get(skill_id)
                    count = entry.get("itemsPerSheet", 25) if isinstance(entry, dict) else 25
                    st.markdown(f"- {p['firstName']} {p['lastName']} — {step['ladder_name']}: {step['name']} ({count} items)")

                if st.button("Generate PDF", type="primary", use_container_width=True):
                    from reportlab.lib.pagesizes import A4
                    from reportlab.pdfgen import canvas as pdfcanvas
                    from io import BytesIO

                    buf = BytesIO()
                    margin = 15 * _mm
                    page_w, page_h = A4
                    usable_w = page_w - 2 * margin

                    c = pdfcanvas.Canvas(buf, pagesize=A4)
                    # Every sheet — single or one per day of a week — goes
                    # through the same 2-per-page compact layout (top/bottom,
                    # cut line between). A cramped 5-in-a-page week view
                    # left boxes too small to write in, so week mode is now
                    # just "5 day-labelled sheets" fed into the same pipeline
                    # single-sheet mode uses, just spanning more pages.
                    all_sheets = []
                    for p, skill_id, step in sheets_to_generate:
                        # Windowed skills only ever practise their current
                        # window, not the whole step — same set all week.
                        grid_item_pool = get_active_window(p, skill_id, step) if is_windowed(step) else None
                        day_count = 5 if week_mode else 1
                        for day_n in range(1, day_count + 1):
                            # Each call reshuffles independently — same
                            # item content, different order per day.
                            sheet = generate_sheet(p, skill_id, ladders_data, item_pool=grid_item_pool)
                            if sheet:
                                if week_mode:
                                    sheet["day_label"] = f"Day {day_n}"
                                all_sheets.append((p, sheet))

                    # Recognition sheets (phonics/CEW — read it, say it, no
                    # box to write in) get a full page each: at the item
                    # counts these actually run (20-30 words), squeezing them
                    # into a half-page made every word small regardless of
                    # per-word sizing — there just isn't the room. Maths and
                    # spelling dictation keep 2-per-page since those have a
                    # real minimum writable-box size to hit, not a text-size
                    # one.
                    recognition_sheets, boxed_sheets = [], []
                    for p, sheet in all_sheets:
                        is_recognition = sheet["subject"] == "phonics" or sheet.get("display_mode") == "recognition"
                        (recognition_sheets if is_recognition else boxed_sheets).append((p, sheet))

                    for p, sheet in recognition_sheets:
                        render_compact_sheet_slot(c, margin, usable_w, page_h - margin, margin, p, sheet, include_answers)
                        c.showPage()

                    for i in range(0, len(boxed_sheets), 2):
                        render_two_per_page_pdf(c, page_w, page_h, margin, usable_w, boxed_sheets[i:i + 2], include_answers)
                        c.showPage()

                    c.save()
                    buf.seek(0)

                    st.success("PDF generated!")
                    st.download_button(
                        "Download PDF", buf.getvalue(),
                        file_name=f"precision-teach-sheets-{date.today().isoformat()}.pdf",
                        mime="application/pdf",
                        use_container_width=True,
                        type="primary",
                    )