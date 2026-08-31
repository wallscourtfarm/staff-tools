#!/usr/bin/env bash
# Re-deploy the shared sync script to the live web app.
# Usage: ./deploy.sh "optional description"

set -e
cd "$(dirname "$0")"

DEPLOYMENT_ID="AKfycbxHg89VK1uqbWAJcqruqJFjEaavdWN74eB1KS-U_cMr75oVsBVZSi2X38l018oOYW7-4w"
DESC="${1:-Deploy $(date '+%d %b %Y %H:%M')}"

echo "→ Pushing to HEAD..."
clasp push --force

echo "→ Creating version snapshot..."
VERSION=$(clasp version "$DESC" | grep -o '[0-9]\+$')
echo "  Created version $VERSION"

echo "→ Updating live deployment to version $VERSION..."
clasp deploy -V "$VERSION" -d "$DESC" -i "$DEPLOYMENT_ID"

echo "✓ Done. Live deployment is now at version $VERSION."
BASE_URL="https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec"
echo "  Base URL: $BASE_URL"
echo "  SLT Schedule:  ...?key=wfa_slt"
echo "  Lunch Cover:   ...?key=wfa_lc"
echo "  Lunch Leaders: ...?key=wfa_ll"
echo "  Roster API:    ...?action=getPupils&token=…&yeargroup=Y4"
echo ""
echo "  Secrets (set once via clasp run or the script editor):"
echo "    SHARED_TOKEN  — random 32 chars; write-gate ON when set"
echo "    STAFF_PIN     — 2013; also accepted as token during transition"

# ── Verify the live deployment actually serves the app, not a Google
# sign-in redirect. Redeploying an *existing* deployment via the API
# (clasp deploy -i) reliably updates which code version it runs, but does
# NOT reliably reapply the manifest's webapp access settings to that
# deployment record — so "Who has access" can silently drift back to
# requiring sign-in even though appsscript.json still says ANYONE. Give
# it a moment to propagate, then check.
echo ""
echo "→ Verifying deployment is publicly reachable..."
sleep 3
RESPONSE=$(curl -sL "${BASE_URL}?action=getPupils&token=2013&v=verify$RANDOM" 2>/dev/null)
if echo "$RESPONSE" | grep -q "accounts.google.com"; then
  echo "  ⚠️  BROKEN — the deployment is redirecting to Google sign-in, not serving JSON."
  echo "      This means every tool reading from the hub will fail right now."
  echo "      Fix: Apps Script editor → Deploy → Manage deployments → pencil icon"
  echo "      on this deployment → 'Who has access' → Anyone → Deploy."
elif echo "$RESPONSE" | grep -q '"pupils"'; then
  echo "  ✓ Live and serving JSON correctly."
else
  echo "  ⚠️  Unexpected response — check manually:"
  echo "  ${BASE_URL}?action=getPupils&token=2013"
fi
