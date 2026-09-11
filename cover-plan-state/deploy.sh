#!/usr/bin/env bash
# Re-deploy the cover-plan state script (weekSlots/cellNotes/sportsSchedule
# GET+POST key-value store) to the live web app.
# Usage: ./deploy.sh "optional description"
#
# This project ("WFA Cover Plan State", scriptId
# 1C1KwanbrGx7EDUHQpXS6Ymd3SWnyg8TCnPy1ve5HduyKZiJxyOnCb5DI) was never
# clasp-tracked before 11.09.26 — it existed only in the Apps Script web
# editor. Cloned into this repo so it's finally under version control; see
# project_shared_gateway_apps_script_ceiling in Claude's memory for why it
# was tracked down (auditing every Apps Script backend for the same
# concurrent-load ceiling found in shared-sync and spelling-games).
#
# appsscript.json MUST say "access": "ANYONE_ANONYMOUS" (not "ANYONE") — see
# feedback_apps_script_deploy_anyone_anonymous in Claude's memory.

set -e
cd "$(dirname "$0")"

DEPLOYMENT_ID="AKfycbz-w7hGrqjEnfXNKkhzfaGFWhOk0QMhzigsPTJXY2YgHYcYPjC2QroFk8x_Q5j0E_fisg"
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
echo "  GET  -> current state JSON (or the literal string \"null\" if never saved)"
echo "  POST -> body replaces the whole state; no partial update, no auth of any kind"

echo ""
echo "→ Verifying deployment is publicly reachable..."
sleep 3
RESPONSE=$(curl -sL "${BASE_URL}" 2>/dev/null)
if echo "$RESPONSE" | grep -q "accounts.google.com"; then
  echo "  ⚠️  BROKEN — the deployment is redirecting to Google sign-in, not serving JSON."
  echo "      Fix: confirm appsscript.json says ANYONE_ANONYMOUS, then re-run this script."
elif echo "$RESPONSE" | grep -q '"weekSlots"\|^null$'; then
  echo "  ✓ Live and reachable."
else
  echo "  ⚠️  Unexpected response — check manually: ${BASE_URL}"
fi
