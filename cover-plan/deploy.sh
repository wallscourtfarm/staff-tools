#!/usr/bin/env bash
# Deploy notify-script.gs to the live web app.
# Usage: ./deploy.sh "optional description"
# Always run this instead of plain `clasp push` so the live deployment is updated.

set -e
cd "$(dirname "$0")"

DEPLOYMENT_ID="AKfycbyB-lU6nnGGT_0xoQ10YxVegEW5tm9dKF7Jl6MQDJQ0DI_YJ47zyQ3rIo3mfHJvmSn6"
DESC="${1:-Deploy $(date '+%d %b %Y %H:%M')}"

echo "→ Pushing to HEAD..."
clasp push --force

echo "→ Creating version snapshot..."
VERSION=$(clasp version "$DESC" | grep -o '[0-9]\+$')
echo "  Created version $VERSION"

echo "→ Updating live deployment to version $VERSION..."
clasp deploy -V "$VERSION" -d "$DESC" -i "$DEPLOYMENT_ID"

echo "✓ Done. Live deployment is now at version $VERSION."
