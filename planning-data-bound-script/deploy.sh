#!/usr/bin/env bash
# Re-deploy the WFA Planning Data bound script (Activity Exceptions) to its
# one still-live deployment — the URL teaching-schedule calls as
# EXCEPTIONS_URL. This project has 12+ other old, dead deployments left
# over from its previous lives (a Release Schedule emailer, an even older
# PlannerState store); this script only ever touches the one that matters.
# Usage: ./deploy.sh "optional description"

set -e
cd "$(dirname "$0")"

DEPLOYMENT_ID="AKfycbwRTXlq_kqfstCk_lF6qVdoBBZeXdlWV2Gvja1d0H3rYEyCZvPPi2XNhCp3spOsXn3W"
DESC="${1:-Deploy $(date '+%d %b %Y %H:%M')}"
BASE_URL="https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec"

grep -q '"access": "ANYONE_ANONYMOUS"' appsscript.json || {
  echo "✗ appsscript.json does not say ANYONE_ANONYMOUS — refusing to deploy (would break anonymous callers). Fix it first."
  exit 1
}

echo "→ Pushing to HEAD..."
clasp push --force

echo "→ Creating version snapshot..."
VERSION=$(clasp version "$DESC" | grep -o '[0-9]\+$')
echo "  Created version $VERSION"

echo "→ Updating live deployment to version $VERSION..."
clasp deploy -V "$VERSION" -d "$DESC" -i "$DEPLOYMENT_ID"

echo "✓ Done. Live deployment is now at version $VERSION."
echo "  Base URL: $BASE_URL"
