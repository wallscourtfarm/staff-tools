"""WFA Precision Teaching Grids — Streamlit app for fluency assessment and tracking."""

import json
import streamlit as st
import time
from data import (
    ensure_data_files, load_pupils, save_pupils, load_ladders, save_ladders,
    load_probes, add_probe, load_all_probes_for_pupil, get_all_steps, get_step,
    get_next_step, check_aim_met, add_pupil, get_pupil, git_pull, git_add_commit_push,
    git_pending_commits, PROBES_DIR, get_baseline, get_item_mastery, get_progress_summary,
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

    active_skills = {k: v for k, v in pupil.get("currentSkills", {}).items() if v == "active"}
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
        st.subheader(step["name"])

        mode = st.radio("Choose your activity:", ["Timed Probe", "Accuracy Check"], horizontal=True)

        if mode == "Timed Probe":
            aim = step["aim"]
            st.markdown(f"**Aim:** {aim['correctPerMin']} correct per minute, max {aim['maxErrors']} errors")

            if "self_assess_start" not in st.session_state:
                if st.button("Start! 🚀", use_container_width=True):
                    st.session_state.self_assess_start = time.time()
                    st.session_state.self_assess_items = step["items"][:]
                    st.session_state.self_assess_results = []
                    st.session_state.self_assess_idx = 0
                    st.rerun()

            if "self_assess_start" in st.session_state:
                elapsed = time.time() - st.session_state.self_assess_start
                remaining = max(0, aim["timedSec"] - elapsed)

                if remaining <= 0:
                    results = st.session_state.self_assess_results
                    correct = sum(1 for r in results if r)
                    errors = sum(1 for r in results if not r)
                    duration = aim["timedSec"]
                    cpm = round(correct / (duration / 60), 1) if duration > 0 else 0
                    aim_met = correct / (duration / 60) >= aim["correctPerMin"] and errors <= aim["maxErrors"] if duration > 0 else False

                    if aim_met:
                        st.balloons()
                        st.success(f"Well done {pupil['firstName']}! You got {correct} correct ({cpm}/min)! Aim achieved! 🎉")
                    else:
                        st.info(f"You got {correct} correct ({cpm}/min). Keep practising — you'll get there!")

                    if st.button("Save my result", use_container_width=True):
                        probes_data = add_probe(
                            pupil["id"], skill_id, "timed",
                            correct, errors, len(results), duration
                        )
                        filepath = str(PROBES_DIR / pupil["id"] / f"{skill_id}.json")
                        git_add_commit_push(filepath, f"Self-assess probe: {pupil['firstName']} {step['name']}")
                        del st.session_state.self_assess_start
                        if "self_assess_items" in st.session_state:
                            del st.session_state.self_assess_items
                        if "self_assess_results" in st.session_state:
                            del st.session_state.self_assess_results
                        if "self_assess_idx" in st.session_state:
                            del st.session_state.self_assess_idx
                        st.rerun()
                else:
                    idx = st.session_state.get("self_assess_idx", 0)
                    items = st.session_state.get("self_assess_items", [])
                    if idx < len(items):
                        progress = int((1 - remaining / aim["timedSec"]) * 100)
                        st.progress(progress)
                        st.markdown(f"### ⏱️ {int(remaining)}s remaining")
                        st.markdown(f"## {items[idx]}")
                        col1, col2 = st.columns(2)
                        with col1:
                            if st.button("✅ Got it!", key=f"correct_{idx}", use_container_width=True):
                                st.session_state.self_assess_results.append(True)
                                st.session_state.self_assess_idx = idx + 1
                                st.rerun()
                        with col2:
                            if st.button("❌ Not yet", key=f"incorrect_{idx}", use_container_width=True):
                                st.session_state.self_assess_results.append(False)
                                st.session_state.self_assess_idx = idx + 1
                                st.rerun()
                    else:
                        st.info("All items attempted! Waiting for timer...")
                        st.progress(int((1 - remaining / aim["timedSec"]) * 100))

        else:  # Accuracy Check
            items = step["items"]
            if "untimed_results" not in st.session_state:
                st.session_state.untimed_results = {item: None for item in items}

            for item in items:
                col1, col2, col3 = st.columns([3, 1, 1])
                with col1:
                    st.markdown(f"**{item}**")
                with col2:
                    if st.button("✅", key=f"u_correct_{item}"):
                        st.session_state.untimed_results[item] = True
                        st.rerun()
                with col3:
                    if st.button("❌", key=f"u_incorrect_{item}"):
                        st.session_state.untimed_results[item] = False
                        st.rerun()

            results = st.session_state.untimed_results
            answered = {k: v for k, v in results.items() if v is not None}
            if answered:
                correct = sum(1 for v in answered.values() if v)
                total = len(answered)
                accuracy = round(correct / total * 100, 1) if total > 0 else 0
                st.metric("Accuracy", f"{accuracy}%", f"{correct}/{total} correct")

            if st.button("Save check", use_container_width=True):
                results = st.session_state.untimed_results
                answered = {k: v for k, v in results.items() if v is not None}
                correct = sum(1 for v in answered.values() if v)
                errors = sum(1 for v in answered.values() if not v)
                probes_data = add_probe(
                    pupil["id"], skill_id, "untimed",
                    correct, errors, len(step["items"]), 0
                )
                filepath = str(PROBES_DIR / pupil["id"] / f"{skill_id}.json")
                git_add_commit_push(filepath, f"Self-assess check: {pupil['firstName']} {step['name']}")
                if "untimed_results" in st.session_state:
                    del st.session_state.untimed_results
                st.success("Saved! Great effort! 🌟")
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

    col1, col2, col3, col4 = st.columns(4)
    total_pupils = len(pupils_data["pupils"])
    active_skills = sum(
        sum(1 for s in p.get("currentSkills", {}).values() if s == "active")
        for p in pupils_data["pupils"]
    )
    mastered = sum(
        sum(1 for s in p.get("currentSkills", {}).values() if s == "mastered")
        for p in pupils_data["pupils"]
    )

    with col1:
        st.markdown(f'<div class="metric-card"><h2>{total_pupils}</h2><p>Pupils</p></div>', unsafe_allow_html=True)
    with col2:
        st.markdown(f'<div class="metric-card"><h2>{active_skills}</h2><p>Active Skills</p></div>', unsafe_allow_html=True)
    with col3:
        st.markdown(f'<div class="metric-card"><h2>{mastered}</h2><p>Mastered</p></div>', unsafe_allow_html=True)
    with col4:
        st.markdown(f'<div class="metric-card"><h2>—</h2><p>Avg Celeration</p></div>', unsafe_allow_html=True)

    st.divider()

    if not pupils_data["pupils"]:
        st.info("No pupils yet. Go to the **Pupils** tab to add your class.")
    else:
        rows = []
        for p in pupils_data["pupils"]:
            skills = p.get("currentSkills", {})
            active = [s for s, v in skills.items() if v == "active"]
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
                "Mastered": sum(1 for v in skills.values() if v == "mastered"),
                "Latest": latest,
            })
        st.dataframe(rows, use_container_width=True, hide_index=True)

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
    st.caption("Mark what each pupil has already mastered and where they're currently working.")

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
                    # Find current position in this ladder
                    current_active = None
                    for step in ladder["steps"]:
                        if skills.get(step["id"]) == "active":
                            current_active = step

                    if current_active:
                        st.info(f"Currently working on: **{current_active['name']}**")
                    elif any(skills.get(s["id"]) == "mastered" for s in ladder["steps"]):
                        st.info("All mastered steps complete. Assign a new active skill below.")
                    else:
                        st.info("No skills assigned from this ladder yet.")

                    # Visual ladder progression
                    cols = st.columns(min(len(ladder["steps"]), 6))
                    for i, step in enumerate(ladder["steps"]):
                        with cols[i % len(cols)]:
                            sid = step["id"]
                            status = skills.get(sid)
                            if status == "mastered":
                                st.markdown(f"✅ **{step['name']}**")
                            elif status == "active":
                                st.markdown(f"🔵 **{step['name']}**")
                            elif status == "upcoming":
                                st.markdown(f"⬜ {step['name']}")
                            else:
                                st.markdown(f"— {step['name']}")

                    # Quick set: "Mastered up to X" and "Currently working on Y"
                    step_options = [(s["id"], s["name"]) for s in ladder["steps"]]
                    step_options.insert(0, ("none", "— not assigned —"))

                    # Pre-select current values
                    current_mastered_id = "none"
                    current_active_id = "none"
                    for s in ladder["steps"]:
                        if skills.get(s["id"]) == "mastered":
                            current_mastered_id = s["id"]
                        if skills.get(s["id"]) == "active":
                            current_active_id = s["id"]

                    col_a, col_b = st.columns(3)
                    with col_a:
                        mastered_up_to = st.selectbox(
                            "Mastered up to",
                            options=step_options,
                            format_func=lambda x: x[1],
                            key=f"mastered_{sp_pupil_id}_{ladder['id']}"
                        )
                    with col_b:
                        active_skill = st.selectbox(
                            "Currently working on",
                            options=step_options,
                            format_func=lambda x: x[1],
                            key=f"active_{sp_pupil_id}_{ladder['id']}"
                        )

                    if st.button(f"Set starting point", key=f"set_sp_{sp_pupil_id}_{ladder['id']}"):
                        # Clear all skills in this ladder first
                        for step in ladder["steps"]:
                            sp_pupil_data.setdefault("currentSkills", {}).pop(step["id"], None)

                        # Set mastered steps (everything up to and including mastered_up_to)
                        if mastered_up_to[0] != "none":
                            for step in ladder["steps"]:
                                sp_pupil_data["currentSkills"][step["id"]] = "mastered"
                                if step["id"] == mastered_up_to[0]:
                                    break

                        # Set active skill
                        if active_skill[0] != "none":
                            sp_pupil_data["currentSkills"][active_skill[0]] = "active"

                        save_pupils(pupils_data)
                        git_add_commit_push("data/pupils.json", f"Set starting point for {sp_pupil_data['firstName']}: {ladder['name']}")
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
            active_count = sum(1 for v in skills.values() if v == "active")
            mastered_count = sum(1 for v in skills.values() if v == "mastered")
            label = f"{p['firstName']} {p['lastName']} ({p.get('class', '—')}) — {active_count} active, {mastered_count} mastered — Token: `{p['token']}`"

            with st.expander(label):
                if skills:
                    st.markdown("**Current skills:**")
                    for ladder in ladders_data["ladders"]:
                        ladder_steps = []
                        for step in ladder["steps"]:
                            sid = step["id"]
                            if sid in skills:
                                status = skills[sid]
                                icon = {"mastered": "✅", "active": "🔵", "upcoming": "⬜"}[status]
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
            active_skills = {k: v for k, v in pupil.get("currentSkills", {}).items() if v == "active"}

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
                                                pupil["currentSkills"][skill_id] = "mastered"
                                                pupil["currentSkills"][next_step["id"]] = "active"
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
                    status = skills.get(skill_id, "—")
                    status_icon = {"mastered": "✅", "active": "🔵", "upcoming": "⬜", "—": "—"}.get(status, "—")
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
                        status = skills.get(skill_id, "—")
                        status_icon = {"mastered": "✅", "active": "🔵", "upcoming": "⬜", "—": "—"}.get(status, "—")
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
    st.info("Print grid PDF generation coming soon. Use the Progress tab to view and export data.")