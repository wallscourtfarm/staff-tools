"""Build the Precision Teaching catalogue (areas -> parts -> items) for the WFA API.

Reads the current ladders (built-in ones from data.py, the private ladders file, and the private ULS spelling
ladders) and writes ONE JSON file into the PRIVATE wfa-data repo: backend/precision_catalogue.json.
The ULS word lists are licensed, so the output must never be written into this public repo.

    python3 scripts/build_catalogue.py ~/projects/wfa-data/backend/precision_catalogue.json
"""
import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import data  # noqa: E402

out = Path(sys.argv[1]).expanduser()
L = data.load_ladders()
by = {l["id"]: l for l in L["ladders"]}


def part(s, group=""):
    p = {"id": s["id"], "name": s["name"].replace("x table", "× table"), "items": list(s["items"])}
    if group:
        p["group"] = group
    return p


areas = []


def add(aid, name, section, kind, pick, parts, free=False, hint=""):
    if parts:
        areas.append({"id": aid, "name": name, "section": section, "kind": kind, "pick": pick,
                      "free": free, "hint": hint, "parts": parts})


add("times_tables", "Times tables", "Maths", "maths", 5, [part(s) for s in by["times_tables"]["steps"]],
    hint="Pick about five facts, e.g. 9×2 to 9×6.")
add("number_bonds", "Number bonds", "Maths", "maths", 5, [part(s) for s in by["number_bonds"]["steps"]])
add("doubles_halves", "Doubles and halves", "Maths", "maths", 5, [part(s) for s in by["doubles_halves"]["steps"]])
add("addition_facts", "Addition facts", "Maths", "maths", 5, [part(s) for s in by["addition_facts"]["steps"]])
add("phonics", "Phonics sounds", "Reading", "recognition", 4, [part(s) for s in by["phonics_gpcs"]["steps"]] +
    [{"id": "ph_own", "name": "Graphemes you choose", "items": []}], free=True,
    hint="Pick a few graphemes. You can type others.")
cew = [part(s, "Reception and Year 1") for s in by["common_exception_words_y1"]["steps"]] + \
      [part(s, "Year 2") for s in by["common_exception_words_y2"]["steps"]]
add("cew", "Common exception words", "Spelling", "cloze", 6, cew, hint="The sheet gives sentences with a gap and a word bank.")
add("homophones", "Homophones", "Spelling", "cloze", 0, [part(s) for s in by["homophones"]["steps"]],
    hint="The sheet gives sentences with a gap and the homophones in a word bank.")
uls = []
for lid, grp in [("uls_phase5_spelling", "Phase 5"), ("uls_spelling_y2", "Year 2"), ("uls_spelling_y3", "Year 3"),
                 ("uls_spelling_y4", "Year 4"), ("uls_spelling_y5", "Year 5"), ("uls_spelling_y6", "Year 6")]:
    if lid in by:
        uls += [part(s, grp) for s in by[lid]["steps"]]
add("spelling", "Spelling rules (Unlocking Letters and Sounds)", "Spelling", "dictation", 6, uls,
    hint="An adult reads the words out; the child writes them.")
letters = [part(s) for s in by["handwriting_letters"]["steps"]] + \
          [{"id": "hw_any", "name": "Any letters", "items": list("abcdefghijklmnopqrstuvwxyz")}]
add("hw_letters", "Handwriting: letters", "Handwriting", "hw_letters", 2, letters, hint="One or two letters at a time.")
add("hw_joins", "Handwriting: joins", "Handwriting", "hw_joins", 2,
    [{"id": "hj_own", "name": "Joins you choose", "items": []}] + [part(s) for s in by["handwriting_joins"]["steps"]],
    free=True, hint="One or two joins at a time. You can type your own, e.g. rt eo.")

cat = {"version": date.today().strftime("%d.%m.%y"), "areas": areas}
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(cat, indent=1, ensure_ascii=False))
print(out, [(a["id"], len(a["parts"])) for a in areas])
