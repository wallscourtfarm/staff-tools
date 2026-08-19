#!/usr/bin/env bash
# One-time bootstrap: creates a new bound Google Sheet + Apps Script project
# for the Spelling Games score backend, pushes Code.gs, and makes the first
# deployment. Run this once; after that, use deploy.sh for updates.
#
# Requires: `npm install -g @google/clasp` and `clasp login` once, using the
# same Google account the school's other Apps Script tools (SLT Schedule,
# Lunch Cover, Spelling Assessment) already use.
#
# Usage: ./setup.sh
set -e
cd "$(dirname "$0")"

if [ -f .clasp.json ]; then
  echo "→ .clasp.json already exists — a project has already been created here."
  echo "  Delete .clasp.json first if you really want to start over."
  exit 1
fi

echo "→ Creating new bound Google Sheet + Apps Script project..."
clasp create --type sheets --title "Spelling Games — Scores" --rootDir .

echo "→ Pushing Code.gs..."
clasp push --force

echo "→ Creating first deployment..."
DEPLOY_OUTPUT=$(clasp deploy -d "Initial deploy $(date '+%d %b %Y %H:%M')")
echo "$DEPLOY_OUTPUT"
DEPLOYMENT_ID=$(echo "$DEPLOY_OUTPUT" | grep -oE '[A-Za-z0-9_-]{25,}' | tail -1)

echo ""
echo "✓ Done."
echo "  Web app URL: https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec"
echo ""
echo "Next steps:"
echo "  1. Edit deploy.sh and set DEPLOYMENT_ID=\"${DEPLOYMENT_ID}\" (for future redeploys after editing Code.gs)."
echo "  2. Paste the Web app URL into BACKEND_URL near the top of spelling-pop/index.html's <script> block."
echo "  3. Find the new Google Sheet in Drive ('Spelling Games — Scores') — a 'Scores' tab is created automatically the first time a score is submitted."
