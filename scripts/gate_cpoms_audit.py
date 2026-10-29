"""
Put the DSL's CPOMS audit page behind its own sign-in (29.10.26):

    staff.wallscourt-farm-academy.co.uk/cpoms-audit

1. A reusable Access policy "WFA Access — CPOMS Audit" allowing only Helen Rea (DSL) and Innes.
2. A path-scoped Access app "CPOMS Audit" on that policy (one-time PIN), more specific than the staff hub app,
   so other staff are refused at the door even though they can sign in to staff.*.
3. The app's AUD appended to the wfa-api-proxy Worker's AUDS, so the page's /_api calls are accepted.
   Every other Worker binding is re-sent unchanged (the settings PATCH replaces the whole list), HUB_TOKEN as
   "inherit". The old AUDS value is printed first for roll-back.

The API route (/planning/cpomsaudit-db) also checks the signed-in email itself, so this gate is the first of two.

Usage:
    python3 gate_cpoms_audit.py            # dry run
    python3 gate_cpoms_audit.py --apply    # makes the changes, then checks an anonymous visitor is sent to sign-in
Safe to re-run: anything that already exists is left alone.
"""
import json
import os
import sys
import uuid
import urllib.request

API = 'https://api.cloudflare.com/client/v4'
WORKER = 'wfa-api-proxy'
DOMAIN = 'staff.wallscourt-farm-academy.co.uk/cpoms-audit'
APP_NAME = 'CPOMS Audit'
POLICY_NAME = 'WFA Access — CPOMS Audit'
EMAILS = ['helen.rea@clf.uk', 'innes.mclean@clf.uk']

T = os.environ.get('CF_API_TOKEN') or open(os.path.expanduser('~/cloudflare_access_token.txt')).read().strip()


def call(method, path, body=None, raw=None, ctype='application/json'):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(API + path, method=method, data=data,
                                 headers={'Authorization': 'Bearer ' + T, 'Content-Type': ctype})
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        try:
            return json.load(e)
        except Exception:
            return {'success': False, 'errors': [str(e)]}


def must(d, what):
    if not d.get('success'):
        sys.exit(f'{what} failed: {d.get("errors")}')
    return d['result']


def anonymous(url, extra=None):
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None
    h = {'User-Agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/605 Safari/605', **(extra or {})}
    try:
        r = urllib.request.build_opener(NoRedirect).open(urllib.request.Request(url, headers=h))
        return r.status, r.headers.get('Location', '')
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get('Location', '')


def main():
    apply = '--apply' in sys.argv
    print('APPLY MODE' if apply else 'DRY RUN (pass --apply to make the changes)')
    acct = must(call('GET', '/accounts'), 'Listing accounts')
    if len(acct) != 1:
        sys.exit('Expected exactly one account on this token.')
    base = f'/accounts/{acct[0]["id"]}'

    # 1. policy
    pols = must(call('GET', base + '/access/policies?per_page=100'), 'Listing policies')
    pol = next((p for p in pols if p['name'] == POLICY_NAME), None)
    if pol:
        print('Policy exists:', POLICY_NAME, [i['email']['email'] for i in pol['include'] if 'email' in i])
    else:
        print('Would create policy', POLICY_NAME, 'for', EMAILS)
        if apply:
            pol = must(call('POST', base + '/access/policies', {
                'name': POLICY_NAME, 'decision': 'allow',
                'include': [{'email': {'email': e}} for e in EMAILS]}), 'Creating policy')
            print('  created')

    # 2. app
    idps = must(call('GET', base + '/access/identity_providers'), 'Listing identity providers')
    pin = [i for i in idps if i.get('type') == 'onetimepin']
    if len(pin) != 1:
        sys.exit('Expected one one-time-PIN identity provider.')
    apps = must(call('GET', base + '/access/apps?per_page=200'), 'Listing apps')
    app = next((a for a in apps if (a.get('domain') or '').rstrip('/') == DOMAIN), None)
    if app:
        print('App exists:', app['name'])
    else:
        print('Would create app', APP_NAME, 'on', DOMAIN)
        if apply:
            app = must(call('POST', base + '/access/apps', {
                'name': APP_NAME, 'type': 'self_hosted', 'domain': DOMAIN, 'session_duration': '8h',
                'allowed_idps': [pin[0]['id']], 'auto_redirect_to_identity': True, 'app_launcher_visible': False,
                'policies': [{'id': pol['id'], 'precedence': 1}]}), 'Creating app')
            print('  created')
    if not app:
        print('\nNothing changed - re-run with --apply.')
        return

    # 3. Worker AUDS
    aud = app['aud']
    settings = must(call('GET', f'{base}/workers/scripts/{WORKER}/settings'), 'Reading Worker settings')
    bindings = settings.get('bindings', [])
    auds = next((b for b in bindings if b['name'] == 'AUDS'), None)
    if not auds:
        sys.exit('No AUDS binding - stop and check by hand.')
    old = auds['text']
    others = [b['name'] for b in bindings if b['name'] != 'AUDS']
    print('\n*** OLD AUDS (paste back in the dashboard to roll back) ***\n' + old + '\n***')
    print('Other bindings that must survive:', others)
    if aud in [a.strip() for a in old.split(',')]:
        print('AUDS already has this app.')
    elif apply:
        send = []
        for b in bindings:
            if b['name'] == 'AUDS':
                send.append({'name': 'AUDS', 'type': 'plain_text', 'text': old + ',' + aud})
            elif b['type'] == 'plain_text':
                send.append({'name': b['name'], 'type': 'plain_text', 'text': b['text']})
            else:
                send.append({'name': b['name'], 'type': 'inherit'})
        boundary = uuid.uuid4().hex
        body = (f'--{boundary}\r\nContent-Disposition: form-data; name="settings"\r\n'
                f'Content-Type: application/json\r\n\r\n{json.dumps({"bindings": send})}\r\n--{boundary}--\r\n').encode()
        r = call('PATCH', f'{base}/workers/scripts/{WORKER}/settings', raw=body,
                 ctype=f'multipart/form-data; boundary={boundary}')
        print('AUDS update:', 'OK' if r.get('success') else f'FAILED: {r.get("errors")}')
    else:
        print('Would append this app to AUDS.')

    if apply:
        after = {b['name']: b for b in must(call('GET', f'{base}/workers/scripts/{WORKER}/settings'), 'Re-reading')['bindings']}
        for n in others:
            print(f'  {n}: {"still present" if n in after else "*** MISSING - STOP AND CHECK ***"}')
        print('  AUDS has the CPOMS app:', aud in after['AUDS']['text'])
        st, loc = anonymous(f'https://{DOMAIN}/')
        print(f'  anonymous visit to the page: {st} -> {"Access sign-in" if "cloudflareaccess.com" in loc else loc}')
        st, _ = anonymous('https://staff.wallscourt-farm-academy.co.uk/_api/_session', {'X-WFA-Proxy': '1'})
        print(f'  anonymous call to the proxy: {st}')


if __name__ == '__main__':
    main()
