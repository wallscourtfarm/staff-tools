#!/usr/bin/env bash
# Re-deploy the shared sync script to the live web app.
# Usage: ./deploy.sh "optional description"
# Always run this instead of plain `clasp push` so the live deployment is updated.
#
# appsscript.json MUST say "access": "ANYONE_ANONYMOUS" (not "ANYONE") — every
# `clasp deploy` re-derives the deployment's actual access tier from this file,
# and "ANYONE" silently requires a Google sign-in for every caller, breaking
# every tool's unauthenticated fetch(). Checked before deploying (below) and
# verified against the live URL after (further below) — see
# feedback_apps_script_deploy_anyone_anonymous in Claude's memory for how this
# was diagnosed (2026-09-08 incident; hit again mid-fix the same day because
# this file was overwritten without reading the version that already caught it
# via the post-deploy check — restored here, both checks now kept).

set -e
cd "$(dirname "$0")"

DEPLOYMENT_ID="AKfycbxHg89VK1uqbWAJcqruqJFjEaavdWN74eB1KS-U_cMr75oVsBVZSi2X38l018oOYW7-4w"
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
echo "  SLT Schedule:  ...?key=wfa_slt"
echo "  Lunch Cover:   ...?key=wfa_lc"
echo "  Lunch Leaders: ...?key=wfa_ll"
echo "  Roster API:    ...?action=getPupils&token=…&yeargroup=Y4"
echo "  Hub tab reader: ...?action=getSheetTab&tab=<TermDates|Staff|...>&token=…"
echo ""
echo "  Secrets (Script Properties — Apps Script editor → Project Settings, or"
echo "  the bootstrap pattern in feedback_apps_script_deploy_anyone_anonymous):"
echo "    SHARED_TOKEN  — required, no hardcoded fallback; unset = every request rejected"
echo "    STAFF_PIN     — required, no hardcoded fallback; same fail-closed behaviour"

# ── Verify the live deployment actually serves the app, not a Google
# sign-in redirect. Redeploying an *existing* deployment via the API
# (clasp deploy -i) reliably updates which code version it runs, but the
# pre-deploy manifest check above can't catch every way this drifts — so
# also check the real, live behaviour after deploying.
echo ""
echo "→ Verifying deployment is publicly reachable..."
sleep 3
RESPONSE=$(curl -sL "${BASE_URL}?action=getClasses&v=verify$RANDOM" 2>/dev/null)
if echo "$RESPONSE" | grep -q "accounts.google.com"; then
  echo "  ⚠️  BROKEN — the deployment is redirecting to Google sign-in, not serving JSON."
  echo "      This means every tool reading from the hub will fail right now."
  echo "      Fix: confirm appsscript.json says ANYONE_ANONYMOUS, then re-run this script —"
  echo "      or Apps Script editor → Deploy → Manage deployments → pencil icon on this"
  echo "      deployment → 'Who has access' → Anyone → Deploy, as a manual fallback."
elif echo "$RESPONSE" | grep -q '"error":"unauthorised"'; then
  echo "  ✓ Live and reachable (rejected the missing token as expected — auth gate intact)."
else
  echo "  ⚠️  Unexpected response — check manually:"
  echo "  ${BASE_URL}?action=getClasses&token=<current SHARED_TOKEN>"
fi
