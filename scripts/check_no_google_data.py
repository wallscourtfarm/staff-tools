#!/usr/bin/env python3
"""Fail if live code reads, writes or links to a Google Sheet / Apps Script.

WFA reference data has ONE source of truth: the Postgres database behind
https://api.wallscourt-farm-academy.co.uk (see docs/SYSTEM.md section 3.4 in the
wfa-data repo). The old Google Sheets and Apps Scripts are retired, frozen copies.
A new tool that points at one would show stale data, so this check stops it.

Ignored on purpose: comment lines (old rollback notes), the retired Apps Script
source files (Code.js, *.gs, deploy.sh), minified libraries, and data folders.
Run:  python3 scripts/check_no_google_data.py          (from the repo root)
"""
import os
import re
import sys

SKIP_DIRS = {".git", "node_modules", "dist", "vendor", "lib", "__pycache__", ".github"}
SKIP_FILES = {"Code.js", "check_no_google_data.py"}
SKIP_SUFFIXES = (".gs", ".sh", ".md", ".png", ".jpg", ".webp", ".pdf", ".svg", ".ttf", ".mp3", ".json")
CHECK_SUFFIXES = (".html", ".js", ".jsx", ".py")
PATTERNS = [
    re.compile(r"script\.google\.com/macros"),
    re.compile(r"docs\.google\.com/spreadsheets"),
    re.compile(r"gviz/tq"),
    re.compile(r"\bSpreadsheetApp\b"),
    re.compile(r"^\s*(import|from)\s+gspread\b"),
]


def code_lines(path):
    """Yield (line_number, text) for lines that are not comments."""
    in_block = False
    in_html_comment = False
    with open(path, encoding="utf-8", errors="ignore") as fh:
        for n, raw in enumerate(fh, 1):
            line = raw.strip()
            if in_block:
                if "*/" in line:
                    in_block = False
                continue
            if in_html_comment:
                if "-->" in line:
                    in_html_comment = False
                continue
            if line.startswith("/*"):
                if "*/" not in line:
                    in_block = True
                continue
            if line.startswith("<!--"):
                if "-->" not in line:
                    in_html_comment = True
                continue
            if line.startswith(("//", "*", "#")):
                continue
            yield n, raw.rstrip("\n")


def main():
    bad = []
    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in files:
            if name in SKIP_FILES or name.endswith(SKIP_SUFFIXES) or not name.endswith(CHECK_SUFFIXES):
                continue
            path = os.path.join(root, name)
            for n, text in code_lines(path):
                if any(p.search(text) for p in PATTERNS):
                    bad.append((path[2:], n, text.strip()[:110]))
    if bad:
        print("Live code refers to a Google Sheet / Apps Script. Reference data now lives in the")
        print("WFA database (see docs/SYSTEM.md section 3.4 in wfa-data). Use the API instead:\n")
        for path, n, text in bad:
            print(f"  {path}:{n}: {text}")
        return 1
    print("OK: no live Google Sheet / Apps Script references.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
