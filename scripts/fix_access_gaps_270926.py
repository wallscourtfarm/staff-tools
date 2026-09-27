"""
Close the remaining Cloudflare Access gaps found in the 27.09.26 audit (see
transfer_2026-09-27_security-hardening-and-reading-assessment.md section 3).

Two things, both additive (nothing existing is touched or removed):

1. app.wallscourt-farm-academy.co.uk/api/live — the pupil iPad "Live session" pages already
   got a bypass app (Pupil - Live Sessions, path /live) built by hand in the dashboard today.
   The API endpoint those pages call, /api/live, needs the same bypass or the page loads but
   answers never save.

2. reading.wallscourt-farm-academy.co.uk — only the three newer teacher tools (fluency, phonics,
   comprehension) are gated. Two older staff-only pages have no Access app at all and are
   currently open to anyone with the URL:
       admin.html       (Teacher Marking Panel)
       setup.html        (Assessment Setup)
       3in3/setup.html   (3 in 3 Setup)
   Every pupil-facing page on that site (home.html, login.html, the on-screen papers, 3in3/*)
   is left exactly as it is — those must stay open, pupils have no staff login.

Usage:
    # token: a Cloudflare API token with Zero Trust "Access: Apps and Policies" edit permission.
    # Already saved at ~/cloudflare_access_token.txt (used by gate_reading_tools.py earlier).
    python3 fix_access_gaps_270926.py             # dry run: shows what it found and would create
    python3 fix_access_gaps_270926.py --apply     # creates the apps, then verifies each URL

Safe to re-run: an app that already exists for a path is left alone.
"""
import json
import os
import sys
import urllib.request

API = 'https://api.cloudflare.com/client/v4'
STAFF_POLICY_NAME = 'WFA Staff'

# path -> (application name, host)
STAFF_GATED = {
    'reading.wallscourt-farm-academy.co.uk/admin.html': 'Reading Assessment Marking Panel (teacher tool)',
    'reading.wallscourt-farm-academy.co.uk/setup.html': 'Reading Assessment Setup (teacher tool)',
    'reading.wallscourt-farm-academy.co.uk/3in3/setup.html': '3 in 3 Setup (teacher tool)',
}

BYPASS = {
    'app.wallscourt-farm-academy.co.uk/api/live': 'Pupil - Live Submit API',
}


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
        r = opener.open(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/605 Safari/605'}))
        return False, r.status
    except urllib.error.HTTPError as e:
        loc = e.headers.get('Location', '')
        return ('cloudflareaccess.com' in loc), e.code


def main():
    apply = '--apply' in sys.argv
    print('APPLY MODE' if apply else 'DRY RUN (pass --apply to create the apps)')
    acct = os.environ.get('CF_ACCOUNT_ID') or next((a.split('=', 1)[1] for a in sys.argv if a.startswith('--account=')), None)
    if not acct:
        accounts = must(call('GET', '/accounts'), 'Listing accounts')
        if len(accounts) != 1:
            sys.exit(f'Expected exactly one account on this token, found {len(accounts)}. Pass --account=<id> or set CF_ACCOUNT_ID.')
        acct = accounts[0]['id']
    base = f'/accounts/{acct}'
    print('Account:', acct[:6] + '...')

    policies = must(call('GET', base + '/access/policies'), 'Listing reusable policies')
    pol = [p for p in policies if p.get('name') == STAFF_POLICY_NAME]
    if len(pol) != 1:
        sys.exit(f'Expected one reusable policy named "{STAFF_POLICY_NAME}", found {len(pol)}.')
    staff_policy_id = pol[0]['id']
    print('Staff policy:', STAFF_POLICY_NAME)

    idps = must(call('GET', base + '/access/identity_providers'), 'Listing identity providers')
    pin = [i for i in idps if i.get('type') == 'onetimepin']
    if len(pin) != 1:
        sys.exit(f'Expected one one-time-PIN identity provider, found {len(pin)}.')
    idp_id = pin[0]['id']

    apps = must(call('GET', base + '/access/apps'), 'Listing Access apps')
    existing = {(a.get('domain') or '').rstrip('/') for a in apps}

    print('\n--- Staff-only gates to add (reading.*) ---')
    for domain, name in STAFF_GATED.items():
        if domain in existing:
            print(f'  {domain:55s} already gated - leaving it alone')
            continue
        print(f'  {domain:55s} would create "{name}" on policy "{STAFF_POLICY_NAME}"')
        if apply:
            body = {'name': name, 'type': 'self_hosted', 'domain': domain, 'session_duration': '24h',
                    'allowed_idps': [idp_id], 'auto_redirect_to_identity': True,
                    'app_launcher_visible': False,
                    'policies': [{'id': staff_policy_id, 'precedence': 1}]}
            d = call('POST', base + '/access/apps', body)
            print('    ', 'created' if d.get('success') else f'FAILED: {d.get("errors")}')

    print('\n--- Pupil bypass apps to add (app.*) ---')
    for domain, name in BYPASS.items():
        if domain in existing:
            print(f'  {domain:55s} already exists - leaving it alone')
            continue
        print(f'  {domain:55s} would create "{name}" with an inline Bypass policy')
        if apply:
            body = {'name': name, 'type': 'self_hosted', 'domain': domain, 'session_duration': '24h',
                    'app_launcher_visible': False,
                    'policies': [{'precedence': 1, 'decision': 'bypass',
                                  'name': 'Bypass - pupil facing',
                                  'include': [{'everyone': {}}]}]}
            d = call('POST', base + '/access/apps', body)
            print('    ', 'created' if d.get('success') else f'FAILED: {d.get("errors")}')

    if apply:
        print('\nVerifying:')
        checks = [
            ('should be GATED (staff)', [f'https://{d}' for d in STAFF_GATED]),
            ('should be OPEN (pupil bypass)', [f'https://{d}' for d in BYPASS]),
        ]
        for label, urls in checks:
            print(f' {label}:')
            for u in urls:
                gated, status = anonymous_redirects_to_access(u)
                print(f'   {"GATED" if gated else "OPEN "} {status} {u}')
    else:
        print('\nNothing changed - re-run with --apply.')


if __name__ == '__main__':
    main()
