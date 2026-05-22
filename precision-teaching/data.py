"""Data model for Precision Teaching Grids — pupils, ladders, probes, git sync."""

import json
import os
import random
import string
import subprocess
from datetime import date, datetime
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
PROBES_DIR = DATA_DIR / "probes"
REPO_DIR = Path(__file__).parent

# ── Skill Ladders ──────────────────────────────────────────────────────────

DEFAULT_LADDERS = [
    {
        "id": "number_bonds",
        "name": "Number Bonds",
        "subject": "maths",
        "description": "Number bonds progression from 5 to 20",
        "steps": [
            {
                "id": "bonds_5",
                "name": "Number bonds to 5",
                "aim": {"correctPerMin": 40, "maxErrors": 1, "timedSec": 60},
                "items": ["0+5", "1+4", "2+3", "3+2", "4+1", "5+0"],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "bonds_10",
                "name": "Number bonds to 10",
                "aim": {"correctPerMin": 40, "maxErrors": 1, "timedSec": 60},
                "items": [
                    "0+10", "1+9", "2+8", "3+7", "4+6", "5+5",
                    "6+4", "7+3", "8+2", "9+1", "10+0",
                ],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "bonds_20",
                "name": "Number bonds to 20",
                "aim": {"correctPerMin": 40, "maxErrors": 2, "timedSec": 60},
                "items": [
                    "0+20", "1+19", "2+18", "3+17", "4+16", "5+15",
                    "6+14", "7+13", "8+12", "9+11", "10+10",
                    "11+9", "12+8", "13+7", "14+6", "15+5",
                    "16+4", "17+3", "18+2", "19+1", "20+0",
                ],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
        ],
    },
    {
        "id": "times_tables",
        "name": "Times Tables",
        "subject": "maths",
        "description": "Times tables progression from 2x to 12x",
        "steps": [
            {
                "id": "tt_2",
                "name": "2x table",
                "aim": {"correctPerMin": 40, "maxErrors": 2, "timedSec": 60},
                "items": [f"2×{i}" for i in range(1, 13)],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "tt_5",
                "name": "5x table",
                "aim": {"correctPerMin": 40, "maxErrors": 2, "timedSec": 60},
                "items": [f"5×{i}" for i in range(1, 13)],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "tt_10",
                "name": "10x table",
                "aim": {"correctPerMin": 40, "maxErrors": 2, "timedSec": 60},
                "items": [f"10×{i}" for i in range(1, 13)],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "tt_3",
                "name": "3x table",
                "aim": {"correctPerMin": 40, "maxErrors": 2, "timedSec": 60},
                "items": [f"3×{i}" for i in range(1, 13)],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "tt_4",
                "name": "4x table",
                "aim": {"correctPerMin": 40, "maxErrors": 2, "timedSec": 60},
                "items": [f"4×{i}" for i in range(1, 13)],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "tt_8",
                "name": "8x table",
                "aim": {"correctPerMin": 40, "maxErrors": 2, "timedSec": 60},
                "items": [f"8×{i}" for i in range(1, 13)],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "tt_6",
                "name": "6x table",
                "aim": {"correctPerMin": 40, "maxErrors": 2, "timedSec": 60},
                "items": [f"6×{i}" for i in range(1, 13)],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "tt_7",
                "name": "7x table",
                "aim": {"correctPerMin": 40, "maxErrors": 2, "timedSec": 60},
                "items": [f"7×{i}" for i in range(1, 13)],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "tt_9",
                "name": "9x table",
                "aim": {"correctPerMin": 40, "maxErrors": 2, "timedSec": 60},
                "items": [f"9×{i}" for i in range(1, 13)],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "tt_11",
                "name": "11x table",
                "aim": {"correctPerMin": 40, "maxErrors": 2, "timedSec": 60},
                "items": [f"11×{i}" for i in range(1, 13)],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "tt_12",
                "name": "12x table",
                "aim": {"correctPerMin": 40, "maxErrors": 2, "timedSec": 60},
                "items": [f"12×{i}" for i in range(1, 13)],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
        ],
    },
    {
        "id": "doubles_halves",
        "name": "Doubles & Halves",
        "subject": "maths",
        "description": "Doubling and halving facts",
        "steps": [
            {
                "id": "doubles_10",
                "name": "Doubles to 10",
                "aim": {"correctPerMin": 40, "maxErrors": 1, "timedSec": 60},
                "items": ["double 1", "double 2", "double 3", "double 4", "double 5"],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "doubles_20",
                "name": "Doubles to 20",
                "aim": {"correctPerMin": 40, "maxErrors": 2, "timedSec": 60},
                "items": [f"double {i}" for i in range(1, 11)],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "halves_20",
                "name": "Halves of numbers to 20",
                "aim": {"correctPerMin": 40, "maxErrors": 2, "timedSec": 60},
                "items": ["half of 2", "half of 4", "half of 6", "half of 8", "half of 10",
                           "half of 12", "half of 14", "half of 16", "half of 18", "half of 20"],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
        ],
    },
    {
        "id": "addition_facts",
        "name": "Addition Facts",
        "subject": "maths",
        "description": "Quick recall of addition facts to 20",
        "steps": [
            {
                "id": "add_1d",
                "name": "Single-digit addition",
                "aim": {"correctPerMin": 40, "maxErrors": 2, "timedSec": 60},
                "items": [f"{a}+{b}" for a in range(1, 10) for b in range(1, 10) if a + b <= 10][:20],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
        ],
    },
    {
        "id": "phonics_gpcs",
        "name": "Phonics GPCs",
        "subject": "phonics",
        "description": "Grapheme-phoneme correspondences by phase",
        "steps": [
            {
                "id": "phase2_gpcs",
                "name": "Phase 2 GPCs",
                "aim": {"correctPerMin": 20, "maxErrors": 2, "timedSec": 60},
                "items": list("satpinmdgockeurhbflfllsss"),
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "phase3_gpcs",
                "name": "Phase 3 GPCs",
                "aim": {"correctPerMin": 20, "maxErrors": 2, "timedSec": 60},
                "items": [
                    "j", "v", "w", "x", "y", "z", "zz", "qu",
                    "ch", "sh", "th", "ng", "ai", "ee", "igh", "oa",
                    "oo", "ar", "or", "ur", "ow", "oi", "ear", "air",
                    "ure", "er",
                ],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "phase5_gpcs",
                "name": "Phase 5 GPCs",
                "aim": {"correctPerMin": 15, "maxErrors": 3, "timedSec": 60},
                "items": [
                    "ay", "ou", "ie", "ea", "oy", "ir", "ue", "aw",
                    "wh", "ph", "ew", "oe", "au", "ey",
                    "a_e", "e_e", "i_e", "o_e", "u_e",
                ],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
        ],
    },
    {
        "id": "common_exception_words_y1",
        "name": "Common Exception Words (Y1)",
        "subject": "spellings",
        "description": "Year 1 common exception words — read/spell fluency",
        "steps": [
            {
                "id": "cew_y1_a",
                "name": "CEW Y1: the, a, do, to, today, of, said, says, are, was",
                "aim": {"correctPerMin": 10, "maxErrors": 1, "timedSec": 60},
                "items": ["the", "a", "do", "to", "today", "of", "said", "says", "are", "was"],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "cew_y1_b",
                "name": "CEW Y1: is, his, has, I, you, they, were, we, be, he",
                "aim": {"correctPerMin": 10, "maxErrors": 1, "timedSec": 60},
                "items": ["is", "his", "has", "I", "you", "they", "were", "we", "be", "he"],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "cew_y1_c",
                "name": "CEW Y1: me, she, no, go, so, by, my, all, call, want",
                "aim": {"correctPerMin": 10, "maxErrors": 1, "timedSec": 60},
                "items": ["me", "she", "no", "go", "so", "by", "my", "all", "call", "want"],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
        ],
    },
    {
        "id": "common_exception_words_y2",
        "name": "Common Exception Words (Y2)",
        "subject": "spellings",
        "description": "Year 2 common exception words — read/spell fluency",
        "steps": [
            {
                "id": "cew_y2_door_floor",
                "name": "CEW Y2: door, floor, poor, because, find, kind",
                "aim": {"correctPerMin": 8, "maxErrors": 1, "timedSec": 60},
                "items": ["door", "floor", "poor", "because", "find", "kind"],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "cew_y2_behind_child",
                "name": "CEW Y2: behind, child, children, wild, climb, most",
                "aim": {"correctPerMin": 8, "maxErrors": 1, "timedSec": 60},
                "items": ["behind", "child", "children", "wild", "climb", "most"],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "cew_y2_both_old",
                "name": "CEW Y2: both, old, cold, gold, told, every",
                "aim": {"correctPerMin": 8, "maxErrors": 1, "timedSec": 60},
                "items": ["both", "old", "cold", "gold", "told", "every"],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
        ],
    },
    {
        "id": "spelling_rules_y1",
        "name": "Spelling Rules (Y1)",
        "subject": "spellings",
        "description": "Year 1 spelling patterns — grouped by rule, 5 words per step",
        "steps": [
            {
                "id": "spell_y1s1",
                "name": "Y1: Words ending in ff, ll, ss, zz, ck",
                "aim": {"correctPerMin": 8, "maxErrors": 1, "timedSec": 60},
                "items": ["bell", "kiss", "clock", "puff", "buzz"],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "spell_y1s2",
                "name": "Y1: Words with k and nk",
                "aim": {"correctPerMin": 8, "maxErrors": 1, "timedSec": 60},
                "items": ["kit", "mask", "bank", "pink", "skin"],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "spell_y1s3",
                "name": "Y1: Words with tch",
                "aim": {"correctPerMin": 8, "maxErrors": 1, "timedSec": 60},
                "items": ["catch", "fetch", "hutch", "match", "patch"],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
        ],
    },
    {
        "id": "spelling_rules_y2",
        "name": "Spelling Rules (Y2)",
        "subject": "spellings",
        "description": "Year 2 spelling patterns — grouped by rule, 5 words per step",
        "steps": [
            {
                "id": "spell_y2s1",
                "name": "Y2: Words with dge",
                "aim": {"correctPerMin": 8, "maxErrors": 1, "timedSec": 60},
                "items": ["badge", "edge", "bridge", "dodge", "fudge"],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "spell_y2s2",
                "name": "Y2: Words with ge (j sound)",
                "aim": {"correctPerMin": 8, "maxErrors": 1, "timedSec": 60},
                "items": ["change", "strange", "range", "hinge", "fringe"],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "spell_y2s5",
                "name": "Y2: Words with kn and gn",
                "aim": {"correctPerMin": 8, "maxErrors": 1, "timedSec": 60},
                "items": ["knock", "know", "knee", "gnome", "gnat"],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
        ],
    },
    {
        "id": "spelling_rules_y4",
        "name": "Spelling Rules (Y4)",
        "subject": "spellings",
        "description": "Year 4 spelling patterns — grouped by rule, 10 words per step",
        "steps": [
            {
                "id": "spell_y4s1",
                "name": "Y4: Homophones (accept/except, knot/not, peace/piece)",
                "aim": {"correctPerMin": 8, "maxErrors": 1, "timedSec": 60},
                "items": ["accept", "except", "knot", "not", "peace", "piece", "plain", "plane", "weather", "whether"],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "spell_y4s2",
                "name": "Y4: Prefix in- (inability, inactive, incorrect...)",
                "aim": {"correctPerMin": 8, "maxErrors": 1, "timedSec": 60},
                "items": ["inability", "inactive", "inadequate", "incorrect", "incurable", "indefinite", "inelegant", "inflexible", "insecure", "invisible"],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
            {
                "id": "spell_y4s6",
                "name": "Y4: Key Spellings (strength, grammar, calendar...)",
                "aim": {"correctPerMin": 8, "maxErrors": 1, "timedSec": 60},
                "items": ["strength", "grammar", "calendar", "women", "appear", "straight", "interest", "opposite", "increase", "believe"],
                "untimedAim": {"accuracyPct": 100, "minTrials": 3},
            },
        ],
    },
]


def _generate_token():
    """Generate a random 4-letter token for iPad self-assessment."""
    consonants = "bcdfghjklmnpqrstvwxyz"
    vowels = "aeiou"
    return random.choice(consonants) + random.choice(vowels) + random.choice(consonants) + random.choice(vowels)


def default_pupils():
    return {"pupils": []}


def default_skill_ladders():
    return {"ladders": DEFAULT_LADDERS}


# ── JSON I/O ────────────────────────────────────────────────────────────────

def read_json(path):
    p = Path(path)
    if not p.exists():
        return None
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path, data):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# ── Git Sync ────────────────────────────────────────────────────────────────

def git_pull():
    try:
        subprocess.run(["git", "pull", "--rebase"], cwd=REPO_DIR, capture_output=True, timeout=15)
        return True
    except Exception:
        return False


def git_add_commit_push(filepath, message):
    try:
        subprocess.run(["git", "add", filepath], cwd=REPO_DIR, capture_output=True, timeout=10)
        subprocess.run(["git", "commit", "-m", message], cwd=REPO_DIR, capture_output=True, timeout=10)
        result = subprocess.run(["git", "push"], cwd=REPO_DIR, capture_output=True, timeout=30)
        if result.returncode != 0:
            subprocess.run(["git", "pull", "--rebase"], cwd=REPO_DIR, capture_output=True, timeout=15)
            subprocess.run(["git", "push"], cwd=REPO_DIR, capture_output=True, timeout=30)
        return True
    except Exception:
        return False


def git_pending_commits():
    try:
        result = subprocess.run(
            ["git", "log", "--oneline", "origin/main..HEAD"],
            cwd=REPO_DIR, capture_output=True, text=True, timeout=5
        )
        lines = [l for l in result.stdout.strip().split("\n") if l]
        return len(lines)
    except Exception:
        return 0


# ── Data Access ─────────────────────────────────────────────────────────────

def load_pupils():
    data = read_json(DATA_DIR / "pupils.json")
    return data if data else default_pupils()


def save_pupils(pupils_data):
    write_json(DATA_DIR / "pupils.json", pupils_data)


def load_ladders():
    data = read_json(DATA_DIR / "skill-ladders.json")
    return data if data else default_skill_ladders()


def save_ladders(ladders_data):
    write_json(DATA_DIR / "skill-ladders.json", ladders_data)


def load_probes(pupil_id, skill_id):
    path = PROBES_DIR / pupil_id / f"{skill_id}.json"
    data = read_json(path)
    return data if data else {"pupilId": pupil_id, "skillId": skill_id, "probes": []}


def save_probes(pupil_id, skill_id, probes_data):
    path = PROBES_DIR / pupil_id / f"{skill_id}.json"
    write_json(path, probes_data)


def add_probe(pupil_id, skill_id, mode, correct, errors, items_shown, duration_sec, notes="", item_results=None):
    """Add a probe record. item_results is a dict of {item: True/False} for per-item tracking."""
    probes_data = load_probes(pupil_id, skill_id)
    probe = {
        "date": date.today().isoformat(),
        "mode": mode,
        "durationSec": duration_sec,
        "correct": correct,
        "errors": errors,
        "itemsShown": items_shown,
        "notes": notes,
    }
    if item_results:
        probe["itemResults"] = item_results
    probes_data["probes"].append(probe)
    save_probes(pupil_id, skill_id, probes_data)
    return probes_data


def load_all_probes_for_pupil(pupil_id):
    results = {}
    pupil_dir = PROBES_DIR / pupil_id
    if pupil_dir.exists():
        for f in pupil_dir.glob("*.json"):
            data = read_json(f)
            if data:
                results[data["skillId"]] = data
    return results


# ── Ladder Helpers ──────────────────────────────────────────────────────────

def get_all_steps(ladders_data):
    steps = []
    for ladder in ladders_data["ladders"]:
        for i, step in enumerate(ladder["steps"]):
            steps.append({**step, "ladder_id": ladder["id"], "ladder_name": ladder["name"], "step_index": i})
    return steps


def get_step(ladders_data, step_id):
    for step in get_all_steps(ladders_data):
        if step["id"] == step_id:
            return step
    return None


def get_next_step(ladders_data, step_id):
    steps = get_all_steps(ladders_data)
    for i, s in enumerate(steps):
        if s["id"] == step_id and i + 1 < len(steps) and steps[i + 1]["ladder_id"] == s["ladder_id"]:
            return steps[i + 1]
    return None


def check_aim_met(step, probes_data):
    if not probes_data["probes"]:
        return False
    aim = step["aim"]
    recent_timed = [p for p in probes_data["probes"] if p["mode"] == "timed"]
    if not recent_timed:
        return False
    last = recent_timed[-1]
    duration_min = last["durationSec"] / 60
    cpm = last["correct"] / duration_min if duration_min > 0 else 0
    return cpm >= aim["correctPerMin"] and last["errors"] <= aim["maxErrors"]


# ── Pupil Helpers ───────────────────────────────────────────────────────────

def add_pupil(pupils_data, first_name, last_name, class_name=""):
    pupil_id = f"p{len(pupils_data['pupils']) + 1:03d}"
    while any(p["id"] == pupil_id for p in pupils_data["pupils"]):
        num = int(pupil_id[1:]) + 1
        pupil_id = f"p{num:03d}"
    pupil = {
        "id": pupil_id,
        "firstName": first_name,
        "lastName": last_name,
        "class": class_name,
        "token": _generate_token(),
        "currentSkills": {},
        "notes": "",
    }
    pupils_data["pupils"].append(pupil)
    return pupil


def get_pupil(pupils_data, pupil_id):
    for p in pupils_data["pupils"]:
        if p["id"] == pupil_id:
            return p
    return None


# ── Skill Status Helpers ─────────────────────────────────────────────────────

# currentSkills maps skill_id → {"status": "mastered"|"active"|"upcoming",
#   "masteredDate": "2026-05-22"|None, "nextReview": "2026-05-29"|None,
#   "reviewStage": 0|1|2|None}
#
# Review stages:
#   0 = review 1 week after mastery
#   1 = review 2 weeks after stage 0 passes
#   2 = review 1 month after stage 1 passes
#   After stage 2 passes → status becomes "secure" (no more reviews)

REVIEW_DELTAS = {
    0: 7,   # 1 week
    1: 14,  # 2 weeks
    2: 28,  # 4 weeks (1 month)
}

def migrate_skills_format(pupil):
    """Convert old string-format currentSkills to new object format."""
    skills = pupil.get("currentSkills", {})
    if not skills:
        return False
    changed = False
    for skill_id, value in list(skills.items()):
        if isinstance(value, str):
            # Old format: "mastered", "active", "upcoming"
            skills[skill_id] = {
                "status": value,
                "masteredDate": date.today().isoformat() if value == "mastered" else None,
                "nextReview": None,
                "reviewStage": None,
            }
            # Schedule review for newly migrated mastered skills
            if value == "mastered":
                skills[skill_id]["nextReview"] = (date.today()).isoformat()
                skills[skill_id]["reviewStage"] = 0
            changed = True
    return changed


def get_skill_status(pupil, skill_id):
    """Get the status string for a skill, handling both old and new formats."""
    skills = pupil.get("currentSkills", {})
    entry = skills.get(skill_id)
    if entry is None:
        return None
    if isinstance(entry, str):
        return entry
    return entry.get("status")


def set_skill_status(pupil, skill_id, status, mastered_date=None):
    """Set a skill status with review scheduling.

    When marking as mastered, automatically schedules the first review (1 week).
    When marking as active, clears review data.
    """
    skills = pupil.setdefault("currentSkills", {})
    if status == "mastered":
        m_date = mastered_date or date.today().isoformat()
        skills[skill_id] = {
            "status": "mastered",
            "masteredDate": m_date,
            "nextReview": (date.today() + __import__("datetime").timedelta(days=7)).isoformat(),
            "reviewStage": 0,
        }
    elif status == "active":
        skills[skill_id] = {
            "status": "active",
            "masteredDate": None,
            "nextReview": None,
            "reviewStage": None,
        }
    elif status == "secure":
        skills[skill_id] = {
            "status": "secure",
            "masteredDate": skills.get(skill_id, {}).get("masteredDate") if isinstance(skills.get(skill_id), dict) else None,
            "nextReview": None,
            "reviewStage": None,
        }
    else:  # upcoming or other
        skills[skill_id] = {
            "status": status,
            "masteredDate": None,
            "nextReview": None,
            "reviewStage": None,
        }


def pass_review(pupil, skill_id):
    """Mark a review as passed. Schedules the next review or marks as secure."""
    entry = pupil["currentSkills"].get(skill_id)
    if not entry or not isinstance(entry, dict):
        return

    stage = entry.get("reviewStage", 0)
    if stage is None:
        stage = 0

    next_stage = stage + 1
    if next_stage >= len(REVIEW_DELTAS):
        # Completed all review stages — mark as secure
        entry["status"] = "secure"
        entry["nextReview"] = None
        entry["reviewStage"] = None
    else:
        # Schedule next review
        delta_days = REVIEW_DELTAS[next_stage]
        entry["status"] = "mastered"
        entry["nextReview"] = (date.today() + __import__("datetime").timedelta(days=delta_days)).isoformat()
        entry["reviewStage"] = next_stage


def fail_review(pupil, skill_id):
    """Mark a review as failed. Resets to active for re-practice."""
    entry = pupil["currentSkills"].get(skill_id)
    if not entry or not isinstance(entry, dict):
        return
    entry["status"] = "active"
    entry["nextReview"] = None
    entry["reviewStage"] = None


def get_reviews_due(pupils_data, ladders_data, as_of_date=None):
    """Get a list of reviews due today or overdue for all pupils.

    Returns: [{pupil, skill_id, step, reviewStage, nextReview, overdue}]
    """
    as_of = as_of_date or date.today()
    reviews = []
    for p in pupils_data["pupils"]:
        skills = p.get("currentSkills", {})
        for skill_id, entry in skills.items():
            if not isinstance(entry, dict):
                continue
            if entry.get("nextReview"):
                next_review = date.fromisoformat(entry["nextReview"])
                if next_review <= as_of:
                    step = get_step(ladders_data, skill_id)
                    if step:
                        reviews.append({
                            "pupil": p,
                            "skill_id": skill_id,
                            "step": step,
                            "reviewStage": entry.get("reviewStage", 0),
                            "nextReview": entry["nextReview"],
                            "overdue": (as_of - next_review).days,
                        })
    return reviews


def skill_status(entry):
    """Get the status string from a currentSkills entry, handling both old (str) and new (dict) formats."""
    if isinstance(entry, str):
        return entry
    if isinstance(entry, dict):
        return entry.get("status", "")
    return ""


def active_skills_for(pupil):
    """Get dict of skill_id → entry for all active skills of a pupil."""
    return {k: v for k, v in pupil.get("currentSkills", {}).items()
            if skill_status(v) == "active"}


def count_by_status(pupils_data, status):
    """Count total skills with a given status across all pupils."""
    count = 0
    for p in pupils_data["pupils"]:
        for entry in p.get("currentSkills", {}).values():
            if skill_status(entry) == status:
                count += 1
    return count


def ensure_data_files():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    PROBES_DIR.mkdir(parents=True, exist_ok=True)
    if not (DATA_DIR / "pupils.json").exists():
        save_pupils(default_pupils())
    if not (DATA_DIR / "skill-ladders.json").exists():
        save_ladders(default_skill_ladders())


# ── Progress Calculation ────────────────────────────────────────────────────

def get_baseline(probes_data):
    """Return the first baseline probe, or None."""
    baselines = [p for p in probes_data.get("probes", []) if p.get("mode") == "baseline"]
    return baselines[0] if baselines else None


def get_item_mastery(probes_data, step_items):
    """Calculate per-item mastery from all probes.

    Returns dict: {item: {"known": True/False, "firstKnown": "date"|None, "baselineKnown": bool}}
    An item is 'known' if it was correct in the most recent probe it appeared in.
    """
    mastery = {}
    for item in step_items:
        mastery[item] = {"known": False, "firstKnown": None, "baselineKnown": False}

    baseline = get_baseline(probes_data)
    if baseline and "itemResults" in baseline:
        for item, correct in baseline["itemResults"].items():
            if item in mastery:
                mastery[item]["baselineKnown"] = correct
                mastery[item]["known"] = correct
                if correct:
                    mastery[item]["firstKnown"] = baseline["date"]

    # Process all probes in order — most recent result wins
    for probe in probes_data.get("probes", []):
        if "itemResults" not in probe:
            continue
        for item, correct in probe["itemResults"].items():
            if item in mastery:
                mastery[item]["known"] = correct
                if correct and mastery[item]["firstKnown"] is None:
                    mastery[item]["firstKnown"] = probe["date"]

    return mastery


def get_progress_summary(probes_data, step):
    """Get a progress summary for a pupil on a skill.

    Returns: {
        "baselineDate": str|None,
        "baselineCorrect": int,
        "baselineTotal": int,
        "baselineCpm": float|None,
        "latestDate": str|None,
        "latestCorrect": int,
        "latestTotal": int,
        "latestCpm": float|None,
        "newFactsLearned": int,   # items known now but not at baseline
        "totalFactsKnown": int,   # items known now
        "totalFacts": int,        # total items in skill
        "improvementPct": float,  # % improvement from baseline to latest
        "probesCount": int,
        "timedProbesCount": int,
    }
    """
    items = step["items"]
    total_items = len(items)
    probes = probes_data.get("probes", [])

    baseline = get_baseline(probes_data)
    timed_probes = [p for p in probes if p.get("mode") == "timed"]

    # Baseline stats
    baseline_date = baseline["date"] if baseline else None
    baseline_correct = baseline["correct"] if baseline else 0
    baseline_total = baseline["correct"] + baseline["errors"] if baseline else 0
    baseline_cpm = None
    if baseline and baseline.get("durationSec", 0) > 0:
        baseline_cpm = round(baseline["correct"] / (baseline["durationSec"] / 60), 1)

    # Baseline item-level
    baseline_known_items = set()
    if baseline and "itemResults" in baseline:
        baseline_known_items = {item for item, correct in baseline["itemResults"].items() if correct}

    # Latest probe stats
    latest = probes[-1] if probes else None
    latest_date = latest["date"] if latest else None
    latest_correct = latest["correct"] if latest else 0
    latest_total = (latest["correct"] + latest["errors"]) if latest else 0
    latest_cpm = None
    if latest and latest.get("durationSec", 0) > 0 and latest["mode"] == "timed":
        latest_cpm = round(latest["correct"] / (latest["durationSec"] / 60), 1)

    # Current item-level mastery
    mastery = get_item_mastery(probes_data, items)
    current_known = sum(1 for m in mastery.values() if m["known"])

    # New facts = known now but not at baseline
    new_facts = 0
    for item in items:
        if mastery[item]["known"] and item not in baseline_known_items:
            new_facts += 1

    # Improvement percentage
    if baseline_cpm is not None and latest_cpm is not None and baseline_cpm > 0:
        improvement_pct = round((latest_cpm - baseline_cpm) / baseline_cpm * 100, 1)
    elif baseline_total > 0 and latest_total > 0:
        baseline_acc = baseline_correct / baseline_total * 100 if baseline_total else 0
        latest_acc = latest_correct / latest_total * 100 if latest_total else 0
        improvement_pct = round(latest_acc - baseline_acc, 1)
    else:
        improvement_pct = 0

    return {
        "baselineDate": baseline_date,
        "baselineCorrect": baseline_correct,
        "baselineTotal": baseline_total,
        "baselineCpm": baseline_cpm,
        "latestDate": latest_date,
        "latestCorrect": latest_correct,
        "latestTotal": latest_total,
        "latestCpm": latest_cpm,
        "newFactsLearned": new_facts,
        "totalFactsKnown": current_known,
        "totalFacts": total_items,
        "improvementPct": improvement_pct,
        "probesCount": len(probes),
        "timedProbesCount": len(timed_probes),
    }


# ── Answer Parsing ──────────────────────────────────────────────────────────

def get_answer(item: str, step_id: str = "") -> str:
    """Convert an item string to its expected answer for auto-marking.

    Handles maths items like '7×3', '7 × 3', '0+5', 'double 5', 'half of 10'.
    For spelling and phonics items, returns the item itself (for comparison).
    """
    item = item.strip()

    # Doubles: "double 5" → "10"
    if item.lower().startswith("double "):
        try:
            n = int(item.split()[-1])
            return str(n * 2)
        except (ValueError, IndexError):
            return item

    # Halves: "half of 10" → "5"
    if item.lower().startswith("half of "):
        try:
            n = int(item.split()[-1])
            return str(n // 2)
        except (ValueError, IndexError):
            return item

    # Multiplication: "7×3" or "7 × 3"
    if "×" in item:
        try:
            parts = item.replace(" ", "").split("×")
            a, b = int(parts[0]), int(parts[1])
            return str(a * b)
        except (ValueError, IndexError):
            return item

    # Addition: "0+5" or "3 + 7"
    if "+" in item:
        try:
            parts = item.replace(" ", "").split("+")
            a, b = int(parts[0]), int(parts[1])
            return str(a + b)
        except (ValueError, IndexError):
            return item

    # Subtraction: "10-3"
    if "-" in item and not item.startswith("-"):
        try:
            parts = item.replace(" ", "").split("-")
            a, b = int(parts[0]), int(parts[1])
            return str(a - b)
        except (ValueError, IndexError):
            return item

    # Default: the item itself (spelling words, phonics GPCs)
    return item.lower()


# ── Distributed Review Items ─────────────────────────────────────────────────

def get_review_items(pupil, current_skill_id, ladders_data, max_items=2):
    """Select 1-2 items from previously mastered skills in the same ladder for distributed practice.

    Prioritises skills closest to their review due date.
    Returns a list of dicts: {"item": "...", "question": "...", "answer": "...", "from_skill": "...", "from_skill_name": "..."}
    """
    # Find which ladder the current skill is in
    current_step = get_step(ladders_data, current_skill_id)
    if not current_step:
        return []

    ladder_id = current_step["ladder_id"]
    ladder = None
    for l in ladders_data["ladders"]:
        if l["id"] == ladder_id:
            ladder = l
            break
    if not ladder:
        return []

    # Find mastered skills in this ladder that have review dates
    skills = pupil.get("currentSkills", {})
    candidates = []
    for step in ladder["steps"]:
        if step["id"] == current_skill_id:
            continue
        entry = skills.get(step["id"])
        if not entry or not isinstance(entry, dict):
            continue
        if entry.get("status") not in ("mastered", "secure"):
            continue
        # Pick items from this step
        for item in step["items"]:
            candidates.append({
                "item": item,
                "question": item,
                "answer": get_answer(item, step["id"]),
                "from_skill": step["id"],
                "from_skill_name": step["name"],
                "review_due": entry.get("nextReview", ""),
            })

    if not candidates:
        return []

    # Sort by review due date (closest first)
    candidates.sort(key=lambda c: c.get("review_due") or "9999-99-99")

    # Pick random items, preferring those closest to review
    random.shuffle(candidates[:4])  # shuffle among the most due
    return candidates[:max_items]


# ── Sheet Generator ───────────────────────────────────────────────────────────

def generate_sheet(pupil, skill_id, ladders_data, probes_data=None, include_review=True):
    """Generate a practice sheet for a pupil on a given skill.

    Returns a dict with:
      - "pupil_name": str
      - "skill_name": str
      - "ladder_name": str
      - "subject": str ("maths", "phonics", "spellings")
      - "aim": dict (correctPerMin, maxErrors, timedSec)
      - "items": list of question dicts for the current skill
      - "review_items": list of review item dicts from mastered skills
      - "questions": list of all question dicts (skill items + review, shuffled appropriately)
      - "total_questions": int
    """
    step = get_step(ladders_data, skill_id)
    if not step:
        return None

    ladder = None
    for l in ladders_data["ladders"]:
        if step["ladder_id"] == l["id"]:
            ladder = l
            break

    subject = ladder["subject"] if ladder else "maths"

    # Build items with question format and answers
    skill_items = []
    for item in step["items"]:
        answer = get_answer(item, skill_id)
        if subject == "maths":
            # For maths, the question IS the item (e.g. "7×3") and the answer is the result
            skill_items.append({
                "item": item,
                "question": item,
                "answer": answer,
                "is_review": False,
                "from_skill": skill_id,
                "from_skill_name": step["name"],
            })
        elif subject == "phonics":
            # GPCs: show the grapheme, answer is the grapheme itself (for display)
            skill_items.append({
                "item": item,
                "question": item,
                "answer": answer,
                "is_review": False,
                "from_skill": skill_id,
                "from_skill_name": step["name"],
            })
        else:  # spellings
            # Spelling: question is the word spoken aloud, answer is the spelling
            skill_items.append({
                "item": item,
                "question": item,
                "answer": item.lower(),
                "is_review": False,
                "from_skill": skill_id,
                "from_skill_name": step["name"],
            })

    # Get distributed review items
    review_items = []
    if include_review:
        review_items = get_review_items(pupil, skill_id, ladders_data, max_items=2)

    # Build the question list based on subject
    if subject == "maths":
        # Maths: repeat items to fill ~25 questions, shuffle
        all_unique = skill_items + review_items
        questions = []
        while len(questions) < 25:
            shuffled_batch = skill_items[:]
            random.shuffle(shuffled_batch)
            questions.extend(shuffled_batch)
        # Insert review items at random positions
        for ri in review_items:
            ri_copy = {**ri, "is_review": True}
            pos = random.randint(0, min(len(questions), 24))
            questions.insert(pos, ri_copy)
        questions = questions[:25]
        random.shuffle(questions)

    elif subject == "phonics":
        # Phonics: show all GPCs, repeat 2-3 times for a 1-min probe, shuffle each batch
        all_unique = skill_items + review_items
        questions = []
        for _ in range(3):
            batch = skill_items[:]
            random.shuffle(batch)
            questions.extend(batch)
        # Insert review items
        for ri in review_items:
            ri_copy = {**ri, "is_review": True}
            pos = random.randint(0, len(questions))
            questions.insert(pos, ri_copy)
        # Trim to ~25
        questions = questions[:25]

    else:  # spellings
        # Spelling: just the 3-5 words, no repetition, plus review items
        questions = list(skill_items)
        for ri in review_items:
            ri_copy = {**ri, "is_review": True}
            questions.append(ri_copy)
        random.shuffle(questions)

    return {
        "pupil_name": f"{pupil['firstName']} {pupil['lastName']}",
        "skill_name": step["name"],
        "ladder_name": step["ladder_name"] if "ladder_name" in step else ladder["name"],
        "subject": subject,
        "aim": step["aim"],
        "untimedAim": step.get("untimedAim"),
        "items": skill_items,
        "review_items": review_items,
        "questions": questions,
        "total_questions": len(questions),
    }