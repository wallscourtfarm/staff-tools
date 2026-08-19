#!/usr/bin/env bash
# Re-deploy the Spelling Games backend after editing Code.gs.
# Run setup.sh once first — it creates the project and prints the
# DEPLOYMENT_ID to paste in below.
#
# Usage: ./deploy.sh "optional description"
set -e
cd "$(dirname "$0")"

DEPLOYMENT_ID="PASTE_DEPLOYMENT_ID_HERE"   # from setup.sh's first run
DESC="${1:-Deploy $(date '+%d %b %Y %H:%M')}"

if [ "$DEPLOYMENT_ID" = "PASTE_DEPLOYMENT_ID_HERE" ]; then
  echo "Edit deploy.sh and set DEPLOYMENT_ID first — see setup.sh's output, or" >&2
  echo "run 'clasp deployments' to list it." >&2
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
echo "  Web app URL: https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec"
