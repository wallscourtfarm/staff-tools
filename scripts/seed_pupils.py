#!/usr/bin/env python3
"""
seed_pupils.py — seed the hub planning sheet's Pupils tab from the
spelling-homelearning data repo (data/classes/4CK.json etc).

Usage:  python3 scripts/seed_pupils.py

Requires: gh CLI signed in as an account that can read the private data repo.
Reads the shared-sync deployment URL + token from scripts/seed_pupils.config.json
(or the defaults below are used when the config file is absent).
"""
import base64
import json
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

DATA_REPO = 'wallscourtfarm/spelling-homelearning'
CLASSES = ['1ER', '1JS', '2JH', '2MY', '3JW', '3WU', '4CK', '4RB',
           '5IM', '5LS', '6JM', '6SD']

SHARED_SYNC_URL = ('https://script.google.com/macros/s/'
                   'AKfycbxsgnaxr9iuvw6_SDA5XRXS7OafQqNJeAjmYdILWICsy2ai0088pkY1YSjHV6_MevTSqw/exec')
TOKEN = '2013'


def fetch_class(class_id: str) -> dict:
    """Fetch one class roster via the gh CLI (handles the private repo)."""
    proc = subprocess.run(
        ['gh', 'api', f'repos/{DATA_REPO}/contents/data/classes/{class_id}.json',
         '--jq', '.content'],
        capture_output=True, text=True, check=True)
    return json.loads(base64.b64decode(proc.stdout.strip()))


def build_pupil(p: dict, class_id: str, year_group: str) -> dict:
    return {
        'id': p.get('id', ''),
        'first': p.get('first', ''),
        'last': p.get('last', ''),
        'class': class_id,
        'yearGroup': year_group,
        'sex': p.get('sex', ''),
        'eal': bool(p.get('eal', False)),
        'pp': bool(p.get('pp', False)),
        'sen': p.get('sen') or '',
    }


def main() -> int:
    pupils = []
    for class_id in CLASSES:
        data = fetch_class(class_id)
        year_group = data.get('year_group', 'Y' + re.sub(r'\D', '', class_id))
        roster = data.get('pupils', [])
        for p in roster:
            pupils.append(build_pupil(p, class_id, year_group))
        print(f'  {class_id}: {len(roster)} pupils ({year_group})')

    print(f'Total: {len(pupils)} pupils across {len(CLASSES)} classes')

    body = json.dumps({'pupils': pupils}).encode()
    url = f'{SHARED_SYNC_URL}?action=seedPupils&token={TOKEN}'
    req = urllib.request.Request(url, data=body, method='POST',
                                 headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode())
    except Exception as exc:  # noqa: BLE001 — report any POST failure plainly
        print(f'POST failed: {exc}')
        return 1

    print(f'Backend response: {result}')
    ok = result.get('status') == 'ok'
    print('SEED OK' if ok else 'SEED FAILED')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())