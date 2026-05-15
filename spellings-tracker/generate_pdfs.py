"""Generate PDFs from HTML app exported JSON.

Usage:
    python generate_pdfs.py wfa-spellings-2026-05-15.json

Outputs:
    home-learning.pdf
    tt-sheets.pdf
    spelling-lists.pdf
    handout-order.pdf
"""

import argparse
import json
import os
import sys

# Ensure pdf_gen.py can be imported
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from pdf_gen import generate_hl_pdf, generate_tt_pdf, generate_bee_pdf, generate_handout_pdf


def main():
    parser = argparse.ArgumentParser(description="Generate WFA spelling tracker PDFs from JSON export")
    parser.add_argument("json_file", help="Path to the JSON file exported from the HTML app")
    parser.add_argument("--output-dir", "-o", default=".", help="Directory to write PDFs (default: current directory)")
    parser.add_argument("--hl-class", default="All", choices=["All", "IM", "WU"], help="Filter Home Learning by class")
    parser.add_argument("--tt-class", default="All", choices=["All", "IM", "WU"], help="Filter TT sheets by class")
    parser.add_argument("--bee-class", default="All", choices=["All", "IM", "WU"], help="Filter Bee sheets by class")
    parser.add_argument("--bee-sort", default="name", choices=["name", "pair"], help="Sort bee sheets by")
    parser.add_argument("--bee-writing", action="store_true", default=True, help="Include writing sheets")
    parser.add_argument("--no-bee-writing", dest="bee_writing", action="store_false", help="Exclude writing sheets")
    args = parser.parse_args()

    with open(args.json_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    pupils = data.get("pupils", [])
    rules = data.get("rules", [])
    weeks = data.get("weeks", [])
    current_week = data.get("currentWeek")
    hl_content = data.get("hlContent", {})
    adapted_pupils = data.get("adaptedPupils", [])

    os.makedirs(args.output_dir, exist_ok=True)

    # --- Home Learning ---
    hl_pupils = pupils if args.hl_class == "All" else [p for p in pupils if p.get("class") == args.hl_class]
    if hl_pupils and current_week:
        print(f"Generating Home Learning PDF for {len(hl_pupils)} pupil(s)...")
        buf = generate_hl_pdf(hl_pupils, rules, weeks, current_week, hl_content, adapted_pupils)
        out = os.path.join(args.output_dir, "home-learning.pdf")
        with open(out, "wb") as f:
            f.write(buf.getvalue())
        print(f"  -> {out}")
    else:
        print("Skipping Home Learning (no pupils or no current week selected).")

    # --- TT Sheets ---
    tt_pupils = pupils if args.tt_class == "All" else [p for p in pupils if p.get("class") == args.tt_class]
    if tt_pupils:
        print(f"Generating TT Sheets PDF for {len(tt_pupils)} pupil(s)...")
        buf = generate_tt_pdf(tt_pupils)
        out = os.path.join(args.output_dir, "tt-sheets.pdf")
        with open(out, "wb") as f:
            f.write(buf.getvalue())
        print(f"  -> {out}")
    else:
        print("Skipping TT Sheets (no pupils).")

    # --- Spelling Bee ---
    bee_pupils = pupils if args.bee_class == "All" else [p for p in pupils if p.get("class") == args.bee_class]
    if bee_pupils and current_week:
        print(f"Generating Spelling Bee PDF for {len(bee_pupils)} pupil(s)...")
        buf = generate_bee_pdf(bee_pupils, rules, weeks, current_week, args.bee_writing, args.bee_sort)
        out = os.path.join(args.output_dir, "spelling-lists.pdf")
        with open(out, "wb") as f:
            f.write(buf.getvalue())
        print(f"  -> {out}")
    else:
        print("Skipping Spelling Bee (no pupils or no current week selected).")

    # --- Handout ---
    if pupils:
        print(f"Generating Handout Order PDF for {len(pupils)} pupil(s)...")
        buf = generate_handout_pdf(pupils)
        out = os.path.join(args.output_dir, "handout-order.pdf")
        with open(out, "wb") as f:
            f.write(buf.getvalue())
        print(f"  -> {out}")
    else:
        print("Skipping Handout (no pupils).")

    print("\nDone.")


if __name__ == "__main__":
    main()
