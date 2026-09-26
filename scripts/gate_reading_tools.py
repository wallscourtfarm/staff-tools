"""
Put the three teacher tools on the reading site behind staff sign-in (Cloudflare Access):

    reading.wallscourt-farm-academy.co.uk/fluency
    reading.wallscourt-farm-academy.co.uk/phonics
    reading.wallscourt-farm-academy.co.uk/comprehension

The pupil pages on the same site (login, assessment, home) stay open. Each tool gets its own
path-scoped self-hosted Access app on the reusable "WFA Staff" policy (all staff), using the
one-time-PIN identity provider, the same as the other staff tools.

Usage:
    # token: a Cloudflare API token with the "Zero Trust" permissions (Access: Apps and Policies edit,
    # Access: Identity Providers read). Save it as one line in ~/cloudflare_access_token.txt, or export CF_API_TOKEN.
    python3 gate_reading_tools.py            # dry run: shows what it found and what it would create
    python3 gate_reading_tools.py --apply    # creates the apps, then checks each URL now asks for sign-in

Safe to re-run: an app that already exists for a path is left alone.
"""
import json
import os
import sys
import urllib.request

HOST = 'reading.wallscourt-farm-academy.co.uk'
TOOLS = {'fluency': 'Reading fluency (teacher tool)',
         'phonics': 'Phonics comprehension (teacher tool)',
         'comprehension': 'Reading comprehension by level (teacher tool)'}
POLICY_NAME = 'WFA Staff'
API = 'https://api.cloudflare.com/client/v4'


def token():
    t = os.environ.get('CF_API_TOKEN')
    if not t:
        p = os.path.expanduser('~/cloudflare_access_token.txt')
        if os.path.exists(p):
            t = open(p).read().strip()
    if not t:
        sys.exit('No token found. Save it in ~/cloudflare_access_token.txt (one line) or set CF_API_TOKEN.')
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


def must(d, what):
    if not d.get('success'):
        sys.exit(f'{what} failed: {d.get("errors")}')
    return d['result']


def anonymous_redirects_to_access(url):
    """True if an anonymous request to the URL is sent to the Cloudflare Access login."""
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None
    opener = urllib.request.build_opener(NoRedirect)
    try:
        # Cloudflare answers the default Python user agent with 403, so use a browser-like one
        r = opener.open(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/605 Safari/605'}))
        return False, r.status
    except urllib.error.HTTPError as e:
        loc = e.headers.get('Location', '')
        return ('cloudflareaccess.com' in loc), e.code


def main():
    apply = '--apply' in sys.argv
    print('APPLY MODE' if apply else 'DRY RUN (pass --apply to create the apps)')
    # The token may not be allowed to list accounts, so the account id (not a secret) can be given directly.
    acct = os.environ.get('CF_ACCOUNT_ID') or next((a.split('=', 1)[1] for a in sys.argv if a.startswith('--account=')), None)
    if not acct:
        accounts = must(call('GET', '/accounts'), 'Listing accounts')
        if len(accounts) != 1:
            sys.exit(f'Expected exactly one account on this token, found {len(accounts)}. Pass --account=<id> or set CF_ACCOUNT_ID.')
        acct = accounts[0]['id']
    base = f'/accounts/{acct}'
    print('Account:', acct[:6] + '...')

    policies = must(call('GET', base + '/access/policies'), 'Listing reusable policies')
    pol = [p for p in policies if p.get('name') == POLICY_NAME]
    if len(pol) != 1:
        sys.exit(f'Expected one reusable policy named "{POLICY_NAME}", found {len(pol)}.')
    policy_id = pol[0]['id']
    print('Policy:', POLICY_NAME)

    idps = must(call('GET', base + '/access/identity_providers'), 'Listing identity providers')
    pin = [i for i in idps if i.get('type') == 'onetimepin']
    if len(pin) != 1:
        sys.exit(f'Expected one one-time-PIN identity provider, found {len(pin)}.')
    idp_id = pin[0]['id']
    print('Identity provider: one-time PIN')

    apps = must(call('GET', base + '/access/apps'), 'Listing Access apps')
    existing = {(a.get('domain') or '').rstrip('/') for a in apps}

    for path, name in TOOLS.items():
        domain = f'{HOST}/{path}'
        if domain in existing:
            print(f'  {path:14s} already gated - leaving it alone')
            continue
        print(f'  {path:14s} would create app "{name}" for {domain}')
        if apply:
            body = {'name': name, 'type': 'self_hosted', 'domain': domain, 'session_duration': '24h',
                    'allowed_idps': [idp_id], 'auto_redirect_to_identity': True,
                    'app_launcher_visible': False, 'policies': [{'id': policy_id, 'precedence': 1}]}
            d = call('POST', base + '/access/apps', body)
            print('    ', 'created' if d.get('success') else f'FAILED: {d.get("errors")}')

    if apply:
        print('\nChecking an anonymous visitor is now sent to the staff sign-in:')
        bad = 0
        for path in TOOLS:
            for u in (f'https://{HOST}/{path}/', f'https://{HOST}/{path}/index.html'):
                ok, status = anonymous_redirects_to_access(u)
                print(f'  {"OK  " if ok else "OPEN"} {status} {u}')
                bad += (not ok)
        print('\nAll gated.' if not bad else f'\n{bad} URL(s) still open - check the app paths in Cloudflare Zero Trust.')
    else:
        print('\nNothing changed - re-run with --apply.')


if __name__ == '__main__':
    main()
