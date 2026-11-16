#!/usr/bin/env python3
"""Turn the WFA pupil-data pause on or off (Cloudflare Worker routes).

  CLOUDFLARE_TOKEN=... python3 scripts/pause_routes.py on      # add every route below
  CLOUDFLARE_TOKEN=... python3 scripts/pause_routes.py off     # remove them, put tracker /_api back
  CLOUDFLARE_TOKEN=... python3 scripts/pause_routes.py status

PAUSE routes send the request to the `wfa-paused` Worker (paused page, or JSON 503 for API calls).
KEEP routes have no Worker, so the normal site answers (more specific pattern wins in Cloudflare).
The token needs Zone > Workers Routes > Edit. No token is stored here.
"""
import json, os, sys, urllib.request

ZONE = "f6099495d00d79342dfae896b45c4b3e"
D = "wallscourt-farm-academy.co.uk"
PAUSED = "wfa-paused"

# API routes that read or write children's data (pause 16.11.26).
API = """pupils attainment milestones bromcom arithmetic evidence reading-score suggested-dooya learner-plans
reading-tracker writing-tracker book-tracker planning/pupils planning/pupilroster-db planning/readingtracker-db
planning/writingtracker-db planning/writingtargets-db planning/precision-db planning/phonics-db planning/cpomsaudit-db
planning/rtptracker-db planning/bktracker-db planning/rnpcerts-db planning/mtcresults-db planning/readingresults-db
planning/readingscan-db planning/classtable planning/spellinggames-db planning/readassess-db""".split()

STAFF_DIRS = """book-tracker cpoms-audit learner-plans phonics-assessment precision reading-challenge-certificates
reading-login-cards reading-score reading-tracker rnp-certificates roster-import rtp-tracker writing-targets
writing-tracker-new writing-tracker""".split()

PAUSE = []
for p in API:
    PAUSE += [f"api.{D}/{p}*", f"staff.{D}/_api/{p}*", f"reading.{D}/_api/{p}*"]
PAUSE += [f"staff.{D}/{d}/*" for d in STAFF_DIRS]
# Tools with an open (no pupil data) version next door: pause only the logged-in page.
for d in ["times-tables", "reading-quiz", "fsm-lunch"]:
    PAUSE += [f"staff.{D}/{d}/", f"staff.{D}/{d}/index.html"]
PAUSE += [f"tracker.{D}/*", f"precision-teaching.{D}/*", f"reading.{D}/*", f"app.{D}/*"]

KEEP = [f"staff.{D}/phonics-assessment/open-card.html"]
KEEP += [f"reading.{D}/3in3/y{n}/open.html" for n in (3, 4, 5, 6)]
KEEP += [f"reading.{D}/show/*"]
# app.*: keep the handwriting, lunch menu and puzzle generators (no pupil data).
KEEP += [f"app.{D}/{p}" for p in ["handwriting*", "menu*", "puzzles*", "static/*", "ping", "api/claude*", "api/print/handwriting*"]]

# tracker.*/_api/* already exists (wfa-api-proxy): it is re-pointed, not added.
REPOINT = {f"tracker.{D}/_api/*": ("wfa-api-proxy", PAUSED)}


def api(method, path, body=None):
    tok = os.environ.get("CLOUDFLARE_TOKEN") or os.environ.get("CF_API_TOKEN")
    req = urllib.request.Request(f"https://api.cloudflare.com/client/v4/zones/{ZONE}/workers/routes{path}",
                                 method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        d = json.load(r)
    if not d.get("success"):
        raise SystemExit(f"{method} {path}: {d.get('errors')}")
    return d.get("result")


def current():
    return {r["pattern"]: r for r in api("GET", "")}


def main(cmd):
    have = current()
    if cmd == "status":
        mine = set(PAUSE) | set(KEEP) | set(REPOINT)
        for p, r in sorted(have.items()):
            if p in mine:
                print(f"{r.get('script') or '(none)':16} {p}")
        print(f"{sum(p in have for p in PAUSE)}/{len(PAUSE)} pause, {sum(p in have for p in KEEP)}/{len(KEEP)} keep")
        return
    if cmd == "on":
        for p in PAUSE:
            if p not in have:
                api("POST", "", {"pattern": p, "script": PAUSED})
        for p in KEEP:
            if p not in have:
                api("POST", "", {"pattern": p})
        for p, (_, new) in REPOINT.items():
            if p in have:
                api("PUT", f"/{have[p]['id']}", {"pattern": p, "script": new})
    elif cmd == "off":
        for p in PAUSE + KEEP:
            if p in have:
                api("DELETE", f"/{have[p]['id']}")
        for p, (old, _) in REPOINT.items():
            if p in have:
                api("PUT", f"/{have[p]['id']}", {"pattern": p, "script": old})
    else:
        raise SystemExit(__doc__)
    main("status")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "status")
