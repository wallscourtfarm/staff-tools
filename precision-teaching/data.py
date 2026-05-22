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