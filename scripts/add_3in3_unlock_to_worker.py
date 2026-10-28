"""
Let the wfa-api-proxy Worker trust the sign-in for the 3 in 3 unlock page (28.10.26).

Every staff page behind the Worker has its own Cloudflare Access app, and the Worker only accepts a sign-in
whose app AUD tag is in its AUDS variable. The unlock page's app (reading.*/3in3/unlock.html, made by
gate_3in3_unlock.py) is new, so without this the page loads but its code request is answered "sign-in expired".

Append-only in effect: AUDS gains one entry; every other binding is re-sent unchanged (the PATCH replaces the
whole list, so leaving one out deletes it). HUB_TOKEN is sent as "inherit" so its secret value is kept.
Prints the exact old AUDS value first so it can be pasted back in the dashboard (Workers & Pages ->
wfa-api-proxy -> Settings -> Variables) to roll back, and checks the other bindings are still there afterwards.

Usage:
    python3 add_3in3_unlock_to_worker.py            # dry run
    python3 add_3in3_unlock_to_worker.py --apply    # makes the change
"""
import json
import os
import sys
import uuid
import urllib.request

API = 'https://api.cloudflare.com/client/v4'
WORKER_SCRIPT_NAME = 'wfa-api-proxy'


def token():
    t = os.environ.get('CF_API_TOKEN')
    if not t:
        p = os.path.expanduser('~/cloudflare_access_token.txt')
        if os.path.exists(p):
            t = open(p).read().strip()
    if not t:
        sys.exit('No token found.')
    return t


TOKEN = token()


def call(method, path, body=None):
    req = urllib.request.Request(API + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        try:
            return json.load(e)
        except Exception:
            return {'success': False, 'errors': [str(e)]}


def call_multipart_metadata(method, path, metadata_obj):
    """Cloudflare's Worker script settings endpoint requires multipart/form-data
    with a single 'settings' part, even for a JSON-only body."""
    boundary = uuid.uuid4().hex
    metadata = json.dumps(metadata_obj)
    body = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="settings"\r\n'
        f'Content-Type: application/json\r\n\r\n'
        f'{metadata}\r\n'
        f'--{boundary}--\r\n'
    ).encode()
    req = urllib.request.Request(API + path, method=method, data=body,
                                 headers={'Authorization': 'Bearer ' + TOKEN,
                                          'Content-Type': f'multipart/form-data; boundary={boundary}'})
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        try:
            return json.load(e)
        except Exception:
            return {'success': False, 'errors': [str(e)]}


def anonymous_check(url):
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None
    opener = urllib.request.build_opener(NoRedirect)
    try:
        r = opener.open(urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/605 Safari/605',
            'X-WFA-Proxy': '1',
        }))
        return r.status, r.read().decode(errors='replace')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors='replace')


APP_DOMAIN = 'reading.wallscourt-farm-academy.co.uk/3in3/unlock.html'


def main():
    apply = '--apply' in sys.argv
    print('APPLY MODE' if apply else 'DRY RUN (pass --apply to make the change)')
    acct = next((a.split('=', 1)[1] for a in sys.argv if a.startswith('--account=')), None) or os.environ.get('CF_ACCOUNT_ID')
    if not acct:
        accounts = call('GET', '/accounts')
        if not accounts.get('success') or len(accounts['result']) != 1:
            sys.exit('Pass --account=<id>.')
        acct = accounts['result'][0]['id']

    apps = call('GET', f'/accounts/{acct}/access/apps?per_page=100')
    if not apps.get('success'):
        sys.exit(f'Could not list Access apps: {apps.get("errors")}')
    mine = [a for a in apps['result'] if (a.get('domain') or '').rstrip('/') == APP_DOMAIN]
    if len(mine) != 1:
        sys.exit(f'Expected one Access app for {APP_DOMAIN}, found {len(mine)}. Run gate_3in3_unlock.py --apply first.')
    new_aud = mine[0]['aud']
    print('Unlock page app AUD:', new_aud)

    settings = call('GET', f'/accounts/{acct}/workers/scripts/{WORKER_SCRIPT_NAME}/settings')
    if not settings.get('success'):
        sys.exit(f'Could not read Worker settings: {settings.get("errors")}')
    bindings = settings['result'].get('bindings', [])
    auds_binding = next((b for b in bindings if b.get('name') == 'AUDS'), None)
    if not auds_binding:
        sys.exit('No AUDS binding found - stopping, this needs a human to look at it.')
    old_auds = auds_binding['text']
    already = new_aud in [a.strip() for a in old_auds.split(',')]
    new_auds = old_auds if already else old_auds + ',' + new_aud

    print('\n*** OLD AUDS VALUE (save this - paste back into the dashboard to roll back) ***')
    print(old_auds)
    print('*** end old value ***\n')
    print('AUDS: ' + ('already includes the unlock page AUD' if already else 'would append the unlock page AUD'))
    other_bindings = [b.get('name') for b in bindings if b.get('name') != 'AUDS']
    print('Other bindings present (must still be there after):', other_bindings)

    if not apply:
        print('\nNothing changed - re-run with --apply.')
        return
    if not already:
        # The settings PATCH REPLACES the whole binding list (28.10.26: sending AUDS alone dropped TEAM and
        # API_ORIGIN and broke every staff tool for a few minutes). So send every binding: plain text as it is,
        # AUDS with the new value, secrets (HUB_TOKEN) as "inherit" so they keep their stored value.
        send = []
        for b in bindings:
            if b['name'] == 'AUDS':
                send.append({'name': 'AUDS', 'type': 'plain_text', 'text': new_auds})
            elif b['type'] == 'plain_text':
                send.append({'name': b['name'], 'type': 'plain_text', 'text': b['text']})
            else:
                send.append({'name': b['name'], 'type': 'inherit'})
        p = call_multipart_metadata('PATCH', f'/accounts/{acct}/workers/scripts/{WORKER_SCRIPT_NAME}/settings',
                                    {'bindings': send})
        print('AUDS update:', 'OK' if p.get('success') else f'FAILED: {p.get("errors")}')

    after = call('GET', f'/accounts/{acct}/workers/scripts/{WORKER_SCRIPT_NAME}/settings')
    after_bindings = {b.get('name'): b for b in after['result'].get('bindings', [])} if after.get('success') else {}
    for name in other_bindings:
        print(f'  {name}: {"still present" if name in after_bindings else "*** MISSING - STOP AND CHECK ***"}')
    print('  AUDS now includes the unlock page:', new_aud in after_bindings.get('AUDS', {}).get('text', ''))
    status, body = anonymous_check('https://reading.wallscourt-farm-academy.co.uk/_api/_session')
    print(f'  anonymous request to the Worker: status={status} body={body[:120]}')


if __name__ == '__main__':
    main()
