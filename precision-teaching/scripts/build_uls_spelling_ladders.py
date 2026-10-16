"""One-off: build the Unlocking Letters and Sounds spelling ladders for Precision Teaching.

Reads the ULS lesson data already extracted in the wfa-app repo (private) and writes
<private data repo>/data/uls-spelling-ladders.json. The ULS word lists are licensed material, so the
output goes ONLY into the private precision-teaching-data repo, never into this public one.

    python3 scripts/build_uls_spelling_ladders.py ~/projects/wfa-app
"""
import ast
import json
import re
import sys
from pathlib import Path

wfa_app = Path(sys.argv[1] if len(sys.argv) > 1 else "~/projects/wfa-app").expanduser()
sys.path.insert(0, str(wfa_app))
import phonics_weeks  # noqa: E402
import uls_lessons  # noqa: E402

AIM = {"correctPerMin": 20, "maxErrors": 1, "timedSec": 60}
UNTIMED = {"accuracyPct": 100, "minTrials": 3}
MAX_ITEMS = 30


def step(sid, name, items):
    return {"id": sid, "name": name, "aim": dict(AIM), "items": items[:MAX_ITEMS], "untimedAim": dict(UNTIMED)}


def words_of(lesson):
    w = lesson.get("hlWords")
    if isinstance(w, str):
        try:
            w = ast.literal_eval(w)
        except Exception:
            w = []
    return [x for x in (w or []) if isinstance(x, str)]


ladders = []

# Reception / Year 1: Phase 5 spelling words by teaching week (standard track only)
p5 = []
for w in phonics_weeks.PHONICS_WEEKS:
    if w["phase"] not in ("Phase 5a", "Phase 5b", "Phase 5c"):
        continue
    items = list(dict.fromkeys(w["spelling"]))
    if items:
        p5.append(step(f"uls5_{w['id']}", f"{w['phase']} week {w['week']}: {w['gpcs_label']}", items))
if p5:
    ladders.append({"id": "uls_phase5_spelling", "name": "ULS Spelling: Phase 5", "subject": "spellings", "independent": True,
                    "description": "Unlocking Letters and Sounds Phase 5 spelling words, by teaching week", "steps": p5})

# Year 2 to Year 6: one step per spelling rule (focus), in teaching order
for yr in ("Y2", "Y3", "Y4", "Y5", "Y6"):
    order, words = [], {}
    for l in uls_lessons.ULS_LESSONS:
        if l["year"] != yr:
            continue
        focus = l["focus"].strip()
        if focus not in words:
            order.append(focus)
            words[focus] = []
        for w in words_of(l):
            if w not in words[focus]:
                words[focus].append(w)
    steps = []
    for i, f in enumerate(order, 1):
        if words[f]:
            sid = f"uls_{yr.lower()}_{i:02d}_" + re.sub(r"[^a-z0-9]+", "", f.lower())[:14]
            steps.append(step(sid, f, words[f]))
    ladders.append({"id": f"uls_spelling_{yr.lower()}", "name": f"ULS Spelling: {yr}", "subject": "spellings",
                    "independent": True, "description": f"Unlocking Letters and Sounds {yr} spelling rules", "steps": steps})

out = Path(__file__).resolve().parent.parent / "private-data" / "data" / "uls-spelling-ladders.json"
out.write_text(json.dumps({"ladders": ladders}, indent=1, ensure_ascii=False))
print(out, [(l["id"], len(l["steps"])) for l in ladders])
