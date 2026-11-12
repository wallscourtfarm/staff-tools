"""Glue for the print page: workbook rows (sent from the page as JSON) -> the old sheet code -> PDF bytes.

The page reads the workbook in the browser and passes the same shapes the old print screen got from the database
(load = children + active targets, catalogue = areas), so _targets_to_sheets and build_week_pdf run unchanged.
"""
import datetime as _dt
import json

import data
import pt_render

# The area "kind" each catalogue area had (precision-teaching/scripts/build_catalogue.py). Not in the workbook.
AREA_KIND = {"times_tables": "maths", "number_bonds": "maths", "doubles_halves": "maths", "addition_facts": "maths",
             "calc": "calc", "phonics": "recognition", "cew_spell": "fade", "cew": "cloze", "homophones": "cloze",
             "spelling": "dictation", "hw_letters": "hw_letters", "hw_joins": "hw_joins"}
# Parts whose id the sheet code looks at (names as in build_catalogue.py).
PART_ID = {("calc", "Mixed (choose any)"): "calc_mix", ("phonics", "Graphemes you choose"): "ph_own",
           ("hw_letters", "Any letters"): "hw_any", ("hw_joins", "Joins you choose"): "hj_own"}


def _set_print_date(iso):
    d = _dt.date.fromisoformat(iso)

    class _Date(_dt.date):
        @classmethod
        def today(cls):
            return d

    pt_render.date = _Date        # the sheet headers print date.today(); this is the date the teacher chose


def build(payload_json):
    """payload: {areas: [{id, name}], children: [...], targets: [...], groups: [[label, [codes]]], names: {code: name},
    answers, cover, duplex, share, hw_font, print_date}. Returns [{label, children, sheets, pdf}]."""
    P = json.loads(payload_json)
    _set_print_date(P["print_date"])
    if P.get("hw_font"):
        pt_render.st.session_state["hw_font"] = P["hw_font"]
    cat = {"areas": [{"id": a["id"], "name": a["name"], "kind": AREA_KIND.get(a["id"], "maths")} for a in P["areas"]]}
    targets = []
    for t in P["targets"]:
        t = dict(t)
        t["part"] = PART_ID.get((t["area"], t["partName"]), t["partName"])
        targets.append(t)
    load = {"children": P["children"], "targets": targets}
    kids, rows, plan, L = pt_render._targets_to_sheets(load, cat, data.load_ladders())
    names = P.get("names") or {}
    for p in kids:                 # where the old tool's Name Stamper wrote the full name over the initials
        if names.get(p["pupilCode"]):
            p["label"] = names[p["pupilCode"]]
    out = []
    for label, codes in P["groups"]:
        want = set(codes)
        kids_ = [p for p in kids if p["pupilCode"] in want]
        if not kids_:
            continue
        ids_ = {p["id"] for p in kids_}
        r_ = [r for r in rows if r[0]["id"] in ids_]
        pdf_, n_ = pt_render.build_week_pdf(kids_, r_, plan, L, P["answers"], P["cover"], False,
                                            day_per_paper=P["duplex"], share_paper=P["share"])
        out.append({"label": label, "children": len(kids_), "sheets": n_, "pdf": pdf_})
    return out
