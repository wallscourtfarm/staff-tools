#!/usr/bin/env bash
# Deploy sync-script.gs to the live web app.
# Usage: ./deploy.sh "optional description"
# Always run this instead of plain `clasp push` so the live deployment is updated.

set -e
cd "$(dirname "$0")"

# Paste your deployment ID here after running `clasp create` for the first time:
DEPLOYMENT_ID=""
DESC="${1:-Deploy $(date '+%d %b %Y %H:%M')}"

if [ -z "$DEPLOYMENT_ID" ]; then
  echo "⚠ DEPLOYMENT_ID not set. Run 'clasp create' first, then paste the ID into this script."
  exit 1
fi

echo "→ Pushing to HEAD..."
clasp push --force

echo "→ Creating version snapshot..."
VERSION=$(clasp version "$DESC" | grep -o '[0-9]\+$')
echo "  Created version $VERSION"

echo "→ Updating live deployment to version $VERSION..."
clasp deploy -V "$VERSION" -d "$DESC" -i "$DEPLOYMENT_ID"

echo "✓ Done. Live deployment is now at version $VERSION."
echo "  Paste the web app URL into lunch-cover/index.html as SYNC_URL."
