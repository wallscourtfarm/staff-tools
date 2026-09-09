"""
Swap the 11 pupil-data / admin-risk Cloudflare Access apps from the broad
"WFA Staff" (all-41) policy to their individually-reviewed narrow policy —
built from Innes's Access Register decisions, 2026-09-09.

Run this ONCE, on a low-traffic weekend (target: Sat-Sun 12-13 Sep 2026),
not mid-week -- narrowing a policy takes effect immediately and would lock
staff out of tools they use daily if run while school is in session.

Usage:
    export CF_API_TOKEN=<the Cloudflare Access API token>
    python3 weekend_access_swap.py            # dry run, shows what would change
    python3 weekend_access_swap.py --apply    # actually swaps the policies

access_build_result.json (same directory) has the app-id / target-policy-id
map this script reads. Both were created 2026-09-09; see
security-audit-2026-09/04-role-based-access-plan.md for the full decision
matrix behind these emails.
"""
import json
import os
import sys
import requests

ACCOUNT_ID = '7aa5591348b029ecdf744f36a063abb7'
TOKEN = os.environ.get('CF_API_TOKEN')
BASE = f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}'

if not TOKEN:
    print('Set CF_API_TOKEN in your environment first.')
    sys.exit(1)

HEADERS = {'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'}

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, 'access_build_result.json')) as f:
    plan = json.load(f)

TOOL_NAMES = {
    'ROS': 'Roster Import', 'CUR': 'Curriculum Planner', 'SUP': 'Supply Booking',
    'MEN': 'WFA Menu Admin', 'BOK': 'Reading Challenge Log', 'WRI': 'Writing Tracker',
    'PTR': 'WFA Pupil Tracker', 'CHT': 'Cohort Trajectories',
    'RCC': 'Reading Challenge Certificates', 'RNP': 'RNP Certificate Generator',
    'DSH': 'WFA App Dashboard',
}


def swap_app_policy(app_id, new_policy_id):
    r = requests.get(f'{BASE}/access/apps/{app_id}', headers=HEADERS)
    d = r.json()
    if not d.get('success'):
        return False, d.get('errors')
    app = d['result']
    app.pop('id', None)
    app.pop('created_at', None)
    app.pop('updated_at', None)
    app.pop('aud', None)
    app['policies'] = [{'id': new_policy_id}]
    r2 = requests.put(f'{BASE}/access/apps/{app_id}', headers=HEADERS, json=app)
    d2 = r2.json()
    return d2.get('success'), d2.get('errors')


def main():
    apply = '--apply' in sys.argv
    print('APPLY MODE' if apply else 'DRY RUN (pass --apply to actually swap)')
    print()
    for code, app_id in plan['app_for_tool'].items():
        target_policy = plan['target_policy_for_tool'][code]
        print(f'{code:4s} {TOOL_NAMES[code]:32s} app={app_id}  ->  policy={target_policy}')
        if apply:
            ok, errors = swap_app_policy(app_id, target_policy)
            print('   ', 'OK' if ok else f'FAILED: {errors}')
    print()
    print('Done.' if apply else 'Nothing changed -- re-run with --apply when ready.')


if __name__ == '__main__':
    main()
