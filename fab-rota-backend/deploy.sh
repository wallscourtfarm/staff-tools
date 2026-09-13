#!/usr/bin/env bash
# Re-deploy this backend after editing Code.js.
# Usage: ./deploy.sh "optional description"
#
# appsscript.json MUST say "access": "ANYONE_ANONYMOUS" (not "ANYONE") —
# every `clasp deploy` re-derives the deployment's actual access tier from
# this file, and "ANYONE" silently requires a Google sign-in for every
# caller, breaking every device's sync.

set -e
cd "$(dirname "$0")"

DEPLOYMENT_ID="AKfycbxRdjTeRZGHw2ZUI8J9dtv1H41B4DKxvR7IDGVjzz_yjN_0dz4ZLn_ucQ5jtqMGCBVMgw"
DESC="${1:-Deploy $(date '+%d %b %Y %H:%M')}"
BASE_URL="https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec"

grep -q '"access": "ANYONE_ANONYMOUS"' appsscript.json || {
  echo "✗ appsscript.json does not say ANYONE_ANONYMOUS — refusing to deploy (would break every device's sync). Fix it first."
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
