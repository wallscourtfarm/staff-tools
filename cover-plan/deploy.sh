#!/usr/bin/env bash
# Deploy notify-script.gs to the live web app.
# Usage: ./deploy.sh "optional description"
# Always run this instead of plain `clasp push` so the live deployment is updated.

set -e
cd "$(dirname "$0")"

# This must always match the deployment ID in notify-config.json's URL — planner.html
# fetches that file at load time to know which Apps Script web app to call for
# CalendarEvents CRUD (event_write). The Railway relay (api.wallscourt-farm-academy.co.uk/notify)
# does NOT read this file — it only handles staff SMS notifications and has no
# Apps Script forwarding logic. If you change this ID, update notify-config.json
# too, or CalendarEvents add/update/delete will silently fail.
#
# IMPORTANT: `clasp deploy -i <ID>` only ever updates an EXISTING deployment's
# code/version — it cannot add a Web App entry point to a deployment that was
# never created as one. If this ID ever stops responding as a web app (a plain
# GET to the /exec URL should return {"status":"ok",...}, not a 404), the fix is
# to create a brand new deployment (`clasp deploy -V <version>`, no -i flag) —
# which requires appsscript.json to have a "webapp" block — and update both
# DEPLOYMENT_ID here and notify-config.json to the new ID.
DEPLOYMENT_ID="AKfycbyP4GDIFJ4wClMfb0bNiO6Qo4oad9wsGrM2AbmMg0l_KxHdHz-R01MCm7mGexve0V5G"
DESC="${1:-Deploy $(date '+%d %b %Y %H:%M')}"

echo "→ Pushing to HEAD..."
clasp push --force

echo "→ Creating version snapshot..."
VERSION=$(clasp version "$DESC" | grep -o '[0-9]\+$')
echo "  Created version $VERSION"

echo "→ Updating live deployment to version $VERSION..."
clasp deploy -V "$VERSION" -d "$DESC" -i "$DEPLOYMENT_ID"

echo "✓ Done. Live deployment is now at version $VERSION."
