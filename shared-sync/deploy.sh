#!/usr/bin/env bash
# Re-deploy the shared sync script to the live web app.
# Usage: ./deploy.sh "optional description"

set -e
cd "$(dirname "$0")"

DEPLOYMENT_ID="AKfycbxsgnaxr9iuvw6_SDA5XRXS7OafQqNJeAjmYdILWICsy2ai0088pkY1YSjHV6_MevTSqw"
DESC="${1:-Deploy $(date '+%d %b %Y %H:%M')}"

echo "→ Pushing to HEAD..."
clasp push --force

echo "→ Creating version snapshot..."
VERSION=$(clasp version "$DESC" | grep -o '[0-9]\+$')
echo "  Created version $VERSION"

echo "→ Updating live deployment to version $VERSION..."
clasp deploy -V "$VERSION" -d "$DESC" -i "$DEPLOYMENT_ID"

echo "✓ Done. Live deployment is now at version $VERSION."
echo "  Base URL: https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec"
echo "  SLT Schedule:  ...?key=wfa_slt"
echo "  Lunch Cover:   ...?key=wfa_lc"
echo "  Lunch Leaders: ...?key=wfa_ll"
echo "  Roster API:    ...?action=getPupils&token=…&yeargroup=Y4"
echo ""
echo "  Secrets (set once via clasp run or the script editor):"
echo "    SHARED_TOKEN  — random 32 chars; write-gate ON when set"
echo "    STAFF_PIN     — 2013; also accepted as token during transition"
