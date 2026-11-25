#!/usr/bin/env python3
"""Deploy the wfa-ai-proxy Worker (api-proxy/ai-worker.js) and its route.

    CLOUDFLARE_TOKEN=$(cat ~/cloudflare_workers_token.txt) python3 scripts/deploy_ai_worker.py

- Uploads the script with TEAM and AUDS copied from wfa-api-proxy (same staff
  logins allowed), and ANTHROPIC_API_KEY copied from the Railway `web` service
  (spelling HL app) on the first deploy; later deploys keep the secret.
- Turns off the workers.dev address, so the only way in is the staff site.
- Adds the route staff.wallscourt-farm-academy.co.uk/_api/ai/* (more specific
  than wfa-api-proxy's /_api/*, so it wins for these paths only).
Never prints a secret.
"""
import json, os, pathlib, subprocess, sys, urllib.request

ACCOUNT = "7aa5591348b029ecdf744f36a063abb7"
ZONE = "f6099495d00d79342dfae896b45c4b3e"
NAME = "wfa-ai-proxy"
ROUTE = "staff.wallscourt-farm-academy.co.uk/_api/ai/*"
RAILWAY = ["-p", "36ee081d-e9a6-4044-948f-e3a407f040cc", "-s", "web", "-e", "production"]
TOKEN = os.environ.get("CLOUDFLARE_TOKEN") or sys.exit("set CLOUDFLARE_TOKEN")
API = "https://api.cloudflare.com/client/v4"
SRC = pathlib.Path(__file__).resolve().parent.parent / "api-proxy" / "ai-worker.js"


def cf(method, path, body=None, ctype="application/json"):
    data = body if isinstance(body, bytes) or body is None else json.dumps(body).encode()
    req = urllib.request.Request(API + path, data=data, method=method,
                                 headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": ctype})
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        return json.load(e)


def main():
    proxy = cf("GET", f"/accounts/{ACCOUNT}/workers/scripts/wfa-api-proxy/settings")["result"]["bindings"]
    plain = {b["name"]: b["text"] for b in proxy if b["type"] == "plain_text"}
    bindings = [{"type": "plain_text", "name": "TEAM", "text": plain["TEAM"]},
                {"type": "plain_text", "name": "AUDS", "text": plain["AUDS"]}]

    existing = cf("GET", f"/accounts/{ACCOUNT}/workers/scripts/{NAME}/settings")
    has_key = existing.get("success") and any(b["name"] == "ANTHROPIC_API_KEY" for b in existing["result"]["bindings"])
    if has_key:
        keep = ["secret_text"]
    else:
        out = subprocess.run(["railway", "variables", "--json", *RAILWAY], capture_output=True, text=True, check=True)
        key = json.loads(out.stdout).get("ANTHROPIC_API_KEY") or sys.exit("no ANTHROPIC_API_KEY on Railway web")
        bindings.append({"type": "secret_text", "name": "ANTHROPIC_API_KEY", "text": key})
        keep = []

    meta = {"main_module": "worker.js", "compatibility_date": "2025-01-01", "bindings": bindings, "keep_bindings": keep}
    boundary = "----wfaaiproxy"
    parts = [
        f'--{boundary}\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n{json.dumps(meta)}\r\n',
        f'--{boundary}\r\nContent-Disposition: form-data; name="worker.js"; filename="worker.js"\r\nContent-Type: application/javascript+module\r\n\r\n',
    ]
    payload = parts[0].encode() + parts[1].encode() + SRC.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
    r = cf("PUT", f"/accounts/{ACCOUNT}/workers/scripts/{NAME}", payload, f"multipart/form-data; boundary={boundary}")
    print("upload:", r.get("success"), r.get("errors"))
    if not r.get("success"):
        sys.exit(1)

    r = cf("POST", f"/accounts/{ACCOUNT}/workers/scripts/{NAME}/subdomain", {"enabled": False})
    print("workers.dev off:", r.get("success"), r.get("errors"))

    routes = cf("GET", f"/zones/{ZONE}/workers/routes")["result"]
    if any(x["pattern"] == ROUTE for x in routes):
        print("route: already there")
    else:
        r = cf("POST", f"/zones/{ZONE}/workers/routes", {"pattern": ROUTE, "script": NAME})
        print("route:", r.get("success"), r.get("errors"))

    names = [b["name"] for b in cf("GET", f"/accounts/{ACCOUNT}/workers/scripts/{NAME}/settings")["result"]["bindings"]]
    print("bindings now:", names)


if __name__ == "__main__":
    main()
