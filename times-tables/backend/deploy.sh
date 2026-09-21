#!/usr/bin/env bash
# Re-deploy the times-tables MTC results backend after editing Code.js.
# Usage: ./deploy.sh "optional description"
#
# appsscript.json MUST say "access": "ANYONE_ANONYMOUS" (not "ANYONE") —
# every `clasp deploy` re-derives the deployment's actual access tier from
# this file, and "ANYONE" silently requires a Google sign-in for every
# caller, breaking every iPad's save.

set -e
cd "$(dirname "$0")"

DEPLOYMENT_ID="AKfycbwRLnz_jXJcyLVZvjMq65fmcaxDi0og07oLpGCW8B6fGuTZcRNLIzaiif4ejaJp1ETP"
DESC="${1:-Deploy $(date '+%d %b %Y %H:%M')}"
BASE_URL="https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec"

grep -q '"access": "ANYONE_ANONYMOUS"' appsscript.json || {
  echo "✗ appsscript.json does not say ANYONE_ANONYMOUS — refusing to deploy (would break every iPad's save). Fix it first."
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
echo "  Web app URL: $BASE_URL"

echo ""
echo "→ Verifying doGet is still publicly reachable (no sign-in wall)..."
sleep 3
RESPONSE=$(curl -sL "${BASE_URL}?token=nope&v=verify$RANDOM" 2>/dev/null)
if echo "$RESPONSE" | grep -q "accounts.google.com"; then
  echo "  ⚠️  BROKEN — redirecting to Google sign-in, not serving JSON. Fix appsscript.json and re-run."
elif echo "$RESPONSE" | grep -q '"error":"unauthorised"'; then
  echo "  ✓ Live and responding correctly (rejected the deliberately-wrong token as expected)."
else
  echo "  ⚠️  Unexpected response — check manually: ${BASE_URL}"
fi
