"""WFA Precision Teaching Grids — Streamlit app for fluency assessment and tracking."""

import json
from datetime import date
import streamlit as st
import time
from data import (
    ensure_data_files, load_pupils, save_pupils, load_ladders, save_ladders,
    load_probes, add_probe, load_all_probes_for_pupil, get_all_steps, get_step,
    get_next_step, check_aim_met, add_pupil, get_pupil, git_pull, git_add_commit_push,
    git_pending_commits, PROBES_DIR, get_baseline, get_item_mastery, get_progress_summary,
    get_skill_status, set_skill_status, pass_review, fail_review, get_reviews_due,
    migrate_skills_format, skill_status, active_skills_for, count_by_status,
    generate_sheet, get_answer, get_review_items,
)

st.set_page_config(page_title="WFA Precision Teaching", page_icon="📊", layout="wide")

# ── Custom CSS ──────────────────────────────────────────────────────────────

st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');

    .main { font-family: 'Nunito', sans-serif; }
    h1, h2, h3, h4 { font-family: 'Nunito', sans-serif !important; font-weight: 700 !important; }
    .block-container { padding-top: 2rem !important; padding-bottom: 2rem !important; }

    .stButton>button {
        background-color: #1798d3 !important; color: white !important;
        border: none !important; border-radius: 8px !important;
        font-weight: 600 !important; padding: 0.5rem 1.5rem !important;
        transition: all 0.2s !important;
    }
    .stButton>button:hover {
        background-color: #0d7bb8 !important;
        box-shadow: 0 4px 12px rgba(23, 152, 211, 0.3) !important;
    }

    .metric-card {
        background: linear-gradient(135deg, #1798d3 0%, #0d7bb8 100%);
        color: white; padding: 1.5rem; border-radius: 12px; text-align: center;
        box-shadow: 0 4px 12px rgba(23, 152, 211, 0.2);
    }
    .metric-card h2 { color: white !important; margin: 0 !important; font-size: 2.5rem !important; font-weight: 800 !important; }
    .metric-card p { margin: 0.5rem 0 0 0 !important; font-size: 1rem !important; opacity: 0.9; }

    .status-mastered { color: #43A047; font-weight: 700; }
    .status-active { color: #1798d3; font-weight: 600; }
    .status-upcoming { color: #757575; }
    .status-below-aim { color: #E53935; font-weight: 600; }

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
        sheet = generate_sheet(pupil, skill_id, ladders_data)

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
            st.markdown(f"**Aim:** {aim['correctPerMin']} correct per minute, max {aim['maxErrors']} errors")
            st.caption(f"You'll have {aim['timedSec']} seconds. Type your answer for each question.")

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
                        st.success(f"🎯 Well done {pupil['firstName']}! Aim achieved!")
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
                        git_add_commit_push(filepath, f"Maths probe: {pupil['firstName']} {step['name']}")
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
            st.markdown(f"**Aim:** {aim['correctPerMin']} correct per minute, max {aim['maxErrors']} errors")
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
                        st.success(f"🎯 Well done {pupil['firstName']}! Aim achieved!")
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
                        git_add_commit_push(filepath, f"Phonics probe: {pupil['firstName']} {step['name']}")
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
    st.image("https://wallscourtfarm.github.io/staff-tools/logo.png", width=120)
    st.markdown("### Precision Teaching Grids")
    st.caption("Wallscourt Farm Academy")

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

# ── Tabs ────────────────────────────────────────────────────────────────────

tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
    "Dashboard", "Pupils", "Skill Ladders", "Probe Entry", "Progress", "Print Grids"
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

    add_mode = st.radio("Add pupils:", ["One at a time", "Bulk import"], horizontal=True, key="add_mode")

    if add_mode == "One at a time":
        col1, col2, col3 = st.columns(3)
        with col1:
            first = st.text_input("First name", key="new_first")
        with col2:
            last = st.text_input("Last name", key="new_last")
        with col3:
            cls = st.text_input("Class", key="new_class")

        if st.button("Add Pupil", disabled=not first):
            pupil = add_pupil(pupils_data, first, last, cls)
            save_pupils(pupils_data)
            git_add_commit_push("data/pupils.json", f"Add pupil: {first} {last}")
            st.success(f"Added {first} {last} (token: **{pupil['token']}**)")
            st.rerun()

    else:  # Bulk import
        st.markdown("**Paste pupil names below** — one per line as `FirstName LastName [Class]`")
        bulk_text = st.text_area("Pupil list", placeholder="Aaliyah Rehman IM\nBen Smith IM\nCharlotte Jones WU", height=150, key="bulk_pupils")
        default_class = st.text_input("Default class (if not specified per line)", value="IM", key="bulk_class")

        if st.button("Import All", disabled=not bulk_text.strip(), type="primary"):
            lines = [l.strip() for l in bulk_text.strip().split("\n") if l.strip()]
            added = 0
            for line in lines:
                parts = line.split()
                if len(parts) >= 2:
                    first_name = parts[0]
                    last_name = parts[1]
                    cls = parts[2] if len(parts) >= 3 else default_class
                    add_pupil(pupils_data, first_name, last_name, cls)
                    added += 1
            if added:
                save_pupils(pupils_data)
                git_add_commit_push("data/pupils.json", f"Bulk import {added} pupils")
                st.success(f"Added {added} pupil{'s' if added != 1 else ''}!")
                st.rerun()

    # ── Set Starting Points ──────────────────────────────────────────────

    st.divider()
    st.subheader("Set Starting Points")
    st.caption("Choose where each pupil is working. Prior steps are marked mastered automatically. Mark which individual items they already know within their current skill.")

    if not pupils_data["pupils"]:
        st.info("Add pupils first, then set their starting points.")
    else:
        pupil_options = [(p["id"], f"{p['firstName']} {p['lastName']}") for p in pupils_data["pupils"]]
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

                        if selected_step_data:
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

                            # Save a baseline probe for this skill with per-item data
                            step_data = None
                            for s in ladder["steps"]:
                                if s["id"] == selected_step_id:
                                    step_data = s
                                    break
                            if step_data:
                                known_set = set(known_items) if selected_step_id != "none" else set()
                                item_results = {item: (item in known_set) for item in step_data["items"]}
                                correct = sum(1 for v in item_results.values() if v)
                                errors = sum(1 for v in item_results.values() if not v)
                                add_probe(sp_pupil_id, selected_step_id, "baseline", correct, errors, len(step_data["items"]), 0, "", item_results)

                        save_pupils(pupils_data)
                        # Commit both pupils.json and any probe files
                        git_add_commit_push("data/pupils.json", f"Set starting point for {sp_pupil_data['firstName']}: {ladder['name']}")
                        if selected_step_id != "none":
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

                # Remove pupil
                if st.button(f"Remove {p['firstName']}", key=f"remove_{p['id']}"):
                    pupils_data["pupils"] = [pp for pp in pupils_data["pupils"] if pp["id"] != p["id"]]
                    save_pupils(pupils_data)
                    git_add_commit_push("data/pupils.json", f"Remove pupil {p['firstName']} {p['lastName']}")
                    st.rerun()

# ── Tab 3: Skill Ladders ───────────────────────────────────────────────────

with tab3:
    ladders_data = st.session_state.ladders_data

    for ladder in ladders_data["ladders"]:
        with st.expander(f"{ladder['name']} ({ladder['subject']})"):
            for i, step in enumerate(ladder["steps"]):
                aim = step["aim"]
                status_emoji = "✅" if i == 0 else "🔵"
                st.markdown(f"**{step['name']}** — Aim: {aim['correctPerMin']}/min, max {aim['maxErrors']} errors, {aim['timedSec']}s")
                st.caption(f"{len(step['items'])} items: {', '.join(step['items'][:8])}{'...' if len(step['items']) > 8 else ''}")
                if i < len(ladder["steps"]) - 1:
                    st.markdown("↓")

# ── Tab 4: Probe Entry ─────────────────────────────────────────────────────

with tab4:
    pupils_data = st.session_state.pupils_data
    ladders_data = st.session_state.ladders_data

    if not pupils_data["pupils"]:
        st.info("Add pupils first in the Pupils tab.")
    else:
        pupil_options = [(p["id"], f"{p['firstName']} {p['lastName']}") for p in pupils_data["pupils"]]
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
                        st.markdown(f"**Aim:** {aim['correctPerMin']} correct/min, max {aim['maxErrors']} errors, {aim['timedSec']}s")

                        # Check if baseline exists
                        probes_data = load_probes(pupil_id, skill_id)
                        has_baseline = any(p.get("mode") == "baseline" for p in probes_data.get("probes", []))

                        mode = st.radio("Assessment mode:", ["Timed Probe", "Untimed Check", "Baseline Assessment"], horizontal=True)

                        if mode == "Baseline Assessment":
                            if has_baseline:
                                st.warning("A baseline already exists for this skill. Recording a new baseline will replace the old one's position.")
                            st.markdown(f"**Items ({len(step['items'])}):** Mark each item the pupil already knows.")
                            st.caption("This records their starting point. Only items they can do confidently and quickly should be marked correct.")

                            if "baseline_results" not in st.session_state:
                                st.session_state.baseline_results = {item: None for item in step["items"]}

                            results = st.session_state.baseline_results
                            for item in step["items"]:
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
                                st.metric("Known items", f"{correct}/{len(step['items'])}", f"{correct}/{total} assessed")

                            if st.button("Save Baseline", use_container_width=True, type="primary"):
                                answered = {k: v for k, v in results.items() if v is not None}
                                correct = sum(1 for v in answered.values() if v)
                                errors = sum(1 for v in answered.values() if not v)
                                item_results = {k: v for k, v in results.items() if v is not None}
                                add_probe(pupil_id, skill_id, "baseline", correct, errors, len(step["items"]), 0, "", item_results)
                                filepath = str(PROBES_DIR / pupil_id / f"{skill_id}.json")
                                git_add_commit_push(filepath, f"Baseline: {pupil['firstName']} {step['name']}")
                                if "baseline_results" in st.session_state:
                                    del st.session_state.baseline_results
                                st.success("Baseline saved!")
                                st.rerun()

                        elif mode == "Timed Probe":
                            st.markdown(f"**Items ({len(step['items'])}):** {', '.join(step['items'][:12])}{'...' if len(step['items']) > 12 else ''}")

                            if "probe_active" not in st.session_state:
                                if st.button("Start Probe", use_container_width=True, type="primary"):
                                    st.session_state.probe_active = True
                                    st.session_state.probe_start = time.time()
                                    st.session_state.probe_results = {}
                                    for item in step["items"]:
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

                                    st.markdown(f"### Probe Complete!")
                                    st.metric("Correct per minute", f"{cpm}", f"{correct} correct, {errors} errors")

                                    if aim_met:
                                        st.markdown('<div class="aim-met">🎯 <strong>Aim met!</strong> Consider progressing to the next skill.</div>', unsafe_allow_html=True)
                                    else:
                                        st.markdown('<div class="aim-not-met">Keep practising — not at aim yet.</div>', unsafe_allow_html=True)

                                    notes = st.text_input("Notes (optional)", key="probe_notes")
                                    if st.button("Save Probe", use_container_width=True, type="primary"):
                                        item_results = {k: v for k, v in st.session_state.probe_results.items() if v is not None}
                                        add_probe(pupil_id, skill_id, "timed", correct, errors, len(step["items"]), duration, notes, item_results)
                                        filepath = str(PROBES_DIR / pupil_id / f"{skill_id}.json")
                                        git_add_commit_push(filepath, f"Timed probe: {pupil['firstName']} {step['name']}")

                                        if aim_met:
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

                                    for item in step["items"]:
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

                                    if st.button("End Probe Early", type="secondary"):
                                        st.session_state.probe_start = time.time() - aim["timedSec"]
                                        st.rerun()

                        else:  # Untimed Check
                            if "untimed_results" not in st.session_state:
                                st.session_state.untimed_results = {item: None for item in step["items"]}

                            st.markdown(f"**Items ({len(step['items'])}):** Mark each as correct or incorrect.")

                            results = st.session_state.untimed_results
                            for item in step["items"]:
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
                                add_probe(pupil_id, skill_id, "untimed", correct, errors, len(step["items"]), 0, "", item_results)
                                filepath = str(PROBES_DIR / pupil_id / f"{skill_id}.json")
                                git_add_commit_push(filepath, f"Untimed check: {pupil['firstName']} {step['name']}")
                                if "untimed_results" in st.session_state:
                                    del st.session_state.untimed_results
                                st.success("Check saved!")
                                st.rerun()

# ── Tab 5: Progress ────────────────────────────────────────────────────────

with tab5:
    pupils_data = st.session_state.pupils_data
    ladders_data = st.session_state.ladders_data

    if not pupils_data["pupils"]:
        st.info("Add pupils first.")
    else:
        pupil_options = [(p["id"], f"{p['firstName']} {p['lastName']}") for p in pupils_data["pupils"]]
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
                        "Probes": summary["probesCount"],
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
                        col1, col2, col3, col4, col5 = st.columns(5)
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
                            st.markdown(f"**Aim:** {aim['correctPerMin']}/min, max {aim['maxErrors']} errors")

                            try:
                                from charts import celeration_chart
                                fig = celeration_chart(probes, aim, step["name"], pupil["firstName"])
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
                                st.success(f"🎯 {step['name']} — Aim achieved!")
                        else:
                            st.info("No probes recorded yet. Run a baseline assessment to set the starting point.")

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
                col_opt1, col_opt2, col_opt3 = st.columns(3)
                with col_opt1:
                    num_questions = st.selectbox("Questions per grid", [20, 25, 30, 35, 40], index=2, key="print_numq")
                with col_opt2:
                    grids_per_page = st.selectbox("Grids per page", [1, 2], index=1, key="print_grids")
                with col_opt3:
                    include_answers = st.checkbox("Include answer key", value=True, key="print_answers")

                st.markdown(f"**{len(sheets_to_generate)} sheet{'s' if len(sheets_to_generate) != 1 else ''}:**")
                for p, skill_id, step in sheets_to_generate:
                    st.markdown(f"- {p['firstName']} {p['lastName']} — {step['ladder_name']}: {step['name']}")

                if st.button("Generate PDF", type="primary", use_container_width=True):
                    try:
                        from reportlab.lib.pagesizes import A4
                        from reportlab.lib.units import mm, cm
                        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Frame, PageTemplate
                        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
                        from reportlab.lib import colors
                        from reportlab.pdfgen import canvas as pdfcanvas
                        from io import BytesIO

                        buf = BytesIO()
                        # Tight margins for maximum space
                        margin = 10*mm
                        page_w, page_h = A4
                        usable_w = page_w - 2 * margin
                        usable_h = page_h - 2 * margin

                        doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=margin, bottomMargin=margin, leftMargin=margin, rightMargin=margin)
                        styles = getSampleStyleSheet()

                        # Compact styles
                        title_style = ParagraphStyle('GridTitle', parent=styles['Normal'], fontSize=11, fontName='Helvetica-Bold', spaceAfter=1, spaceBefore=0, leading=13)
                        info_style = ParagraphStyle('GridInfo', parent=styles['Normal'], fontSize=8, textColor=colors.Color(0.4, 0.4, 0.4), spaceAfter=2, spaceBefore=0, leading=10)
                        answer_style = ParagraphStyle('GridAnswer', parent=styles['Normal'], fontSize=6, textColor=colors.Color(0.6, 0.6, 0.6), spaceAfter=0, spaceBefore=0, leading=8)

                        elements = []

                        # Build grids, pair them 2-up on a page
                        grids = []
                        for p, skill_id, step in sheets_to_generate:
                            # Generate sheet with desired number of questions
                            sheet = generate_sheet(p, skill_id, ladders_data)
                            if not sheet:
                                continue
                            # Adjust question count
                            if len(sheet["questions"]) > num_questions:
                                sheet["questions"] = sheet["questions"][:num_questions]
                                sheet["total_questions"] = num_questions

                            grids.append((p, sheet))

                        # Layout grids
                        if grids_per_page == 2:
                            # Two grids per page
                            for i in range(0, len(grids), 2):
                                pair = grids[i:i+2]
                                grid_elements = []

                                for j, (p, sheet) in enumerate(pair):
                                    grid_elements.extend(_build_grid_elements(p, sheet, styles, title_style, info_style, answer_style, include_answers, usable_w))

                                # Add spacer between the two grids
                                if len(pair) == 2:
                                    # Insert a divider between the two grids
                                    # We'll use a table layout: top grid and bottom grid
                                    grid_elements.insert(len(grid_elements) // 2 if len(grid_elements) > 1 else 0, Spacer(1, 4*mm))

                                elements.extend(grid_elements)
                                if i + 2 < len(grids):
                                    elements.append(PageBreak())
                        else:
                            # One grid per page (full size)
                            for p, sheet in grids:
                                elements.extend(_build_grid_elements(p, sheet, styles, title_style, info_style, answer_style, include_answers, usable_w))
                                if grids.index((p, sheet)) < len(grids) - 1:
                                    elements.append(PageBreak())

                        doc.build(elements)
                        buf.seek(0)

                        st.success("PDF generated!")
                        st.download_button(
                            "Download PDF", buf.getvalue(),
                            file_name=f"precision-teach-sheets-{date.today().isoformat()}.pdf",
                            mime="application/pdf",
                            use_container_width=True,
                            type="primary",
                        )
                    except ImportError:
                        st.error("Install reportlab for PDF generation: pip install reportlab")


def _build_grid_elements(p, sheet, styles, title_style, info_style, answer_style, include_answers, usable_w):
    """Build PDF elements for a single grid."""
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, Spacer, Table, TableStyle
    from reportlab.lib import colors

    elements = []

    # Title line: Name | Skill | Date
    title = f"{p['firstName']} {p['lastName']} &nbsp;&nbsp;|&nbsp;&nbsp; {sheet['skill_name']} &nbsp;&nbsp;|&nbsp;&nbsp; {date.today().strftime('%d/%m/%y')}"
    elements.append(Paragraph(title, title_style))

    aim = sheet["aim"]
    info = f"Aim: {aim['correctPerMin']}/min &nbsp;&bull;&nbsp; Max {aim['maxErrors']} errors &nbsp;&bull;&nbsp; {aim['timedSec']}s"
    elements.append(Paragraph(info, info_style))
    elements.append(Spacer(1, 2*mm))

    questions = sheet["questions"]

    if sheet["subject"] == "maths":
        # Two-column layout: question | answer box
        # Compact: number + question + = _____
        table_data = []
        for i, q in enumerate(questions):
            num = i + 1
            review_mark = " *" if q.get("is_review") else ""
            table_data.append([f"{num}.", f"{q['question']} ={review_mark}", ""])

        # Split into two columns side by side
        half = (len(table_data) + 1) // 2
        left_rows = table_data[:half]
        right_rows = table_data[half:]

        # Build a combined table: left_col | gap | right_col
        combined = []
        for row_i in range(half):
            left = left_rows[row_i] if row_i < len(left_rows) else ["", "", ""]
            right = right_rows[row_i] if row_i < len(right_rows) else ["", "", ""]
            combined.append(left + right)

        col_w = usable_w / 2 - 2*mm
        t = Table(combined, colWidths=[8*mm, col_w - 28*mm, 20*mm, 8*mm, col_w - 28*mm, 20*mm])
        t.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), 'Helvetica', 9),
            ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 9),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LINEBELOW', (2, 0), (2, -1), 0.5, colors.Color(0.8, 0.8, 0.8)),
            ('LINEBELOW', (5, 0), (5, -1), 0.5, colors.Color(0.8, 0.8, 0.8)),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ('ROWBACKGROUNDS', (0, 0), (2, -1), [colors.white, colors.Color(0.97, 0.97, 0.97)]),
            ('ROWBACKGROUNDS', (3, 0), (5, -1), [colors.white, colors.Color(0.97, 0.97, 0.97)]),
        ]))
        elements.append(t)

        if include_answers:
            # Compact answer key
            answers_left = ", ".join(f"{q['question']}={q['answer']}" for q in questions[:half])
            answers_right = ", ".join(f"{q['question']}={q['answer']}" for q in questions[half:])
            elements.append(Spacer(1, 1*mm))
            elements.append(Paragraph(f"Answers: {answers_left}", answer_style))
            elements.append(Paragraph(f"Answers: {answers_right}", answer_style))

    elif sheet["subject"] == "phonics":
        # Grid of GPCs in a compact table
        cols = 8
        gpcs = [q["question"] for q in questions]
        # Pad to fill grid
        while len(gpcs) % cols != 0:
            gpcs.append("")

        table_data = []
        for i in range(0, len(gpcs), cols):
            table_data.append(gpcs[i:i+cols])

        col_w = usable_w / cols
        t = Table(table_data, colWidths=[col_w]*cols)
        t.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), 'Helvetica', 14),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.Color(0.7, 0.7, 0.7)),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.Color(0.85, 0.85, 0.85)),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.Color(0.96, 0.96, 0.96)]),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(t)

    else:  # spellings
        # Compact list: number + word (TTS reminder) + writing line
        table_data = []
        for i, q in enumerate(questions):
            review_mark = " *" if q.get("is_review") else ""
            table_data.append([f"{i+1}.", f"____{review_mark}", ""])

        t = Table(table_data, colWidths=[10*mm, usable_w - 60*mm, 50*mm])
        t.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LINEBELOW', (1, 0), (2, -1), 0.5, colors.Color(0.75, 0.75, 0.75)),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(t)

    return elements