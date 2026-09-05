#!/usr/bin/env bash
# Deploy notify-script.gs to the live web app.
# Usage: ./deploy.sh "optional description"
# Always run this instead of plain `clasp push` so the live deployment is updated.

set -e
cd "$(dirname "$0")"

# This must always match the deployment ID in notify-config.json's URL — the relay
# reads that file to know which Apps Script web app to call. If you change this ID,
# update notify-config.json too, or every notification will fail with a 400.
DEPLOYMENT_ID="AKfycbyVWhEyo2vaiD2TsePRMoMzUj535_hdxyw-JAYoqJIVcQEG7cC8HsJEo-Um27VS1EZm"
DESC="${1:-Deploy $(date '+%d %b %Y %H:%M')}"

echo "→ Pushing to HEAD..."
clasp push --force

echo "→ Creating version snapshot..."
VERSION=$(clasp version "$DESC" | grep -o '[0-9]\+$')
echo "  Created version $VERSION"

echo "→ Updating live deployment to version $VERSION..."
clasp deploy -V "$VERSION" -d "$DESC" -i "$DEPLOYMENT_ID"

echo "✓ Done. Live deployment is now at version $VERSION."
