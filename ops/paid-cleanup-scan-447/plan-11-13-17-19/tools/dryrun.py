#!/usr/bin/env python3
"""item10 dry run (cs #714·AI): sends plans/<course>.json "ops" to Popty's edit door as a DRY RUN
(POST /api/production/<course>/edit-batch WITHOUT "apply" — the real transaction, rolled back) and stores the answer in
the plan under "dryRun". Never sends "apply": true; refuses to run if any op list carries it.
usage (cs #784 copy): python3 -I dryrun.py <fam-dir> <course> [--chunk 50]"""
# cs #968·AI: live gate. Every urlopen to a Popty port (:347x) is refused (exit 77) unless --live-ok '<why>' is given
# (put it last) AND it is 22:00-07:00 Europe/London. ops/paid_cleanup_livegate.py.
import os as _lg_os, sys as _lg_sys
_lg_d = _lg_os.path.dirname(_lg_os.path.realpath(__file__))
while not _lg_os.path.exists(_lg_os.path.join(_lg_d, 'paid_cleanup_livegate.py')) and _lg_d != '/':
    _lg_d = _lg_os.path.dirname(_lg_d)
_lg_sys.path.insert(0, _lg_d)
import paid_cleanup_livegate as livegate
livegate.install()
livegate.require_live(f'{_lg_os.path.basename(__file__)}: edit-batch dry run')
import json, os, sys, urllib.request, urllib.error, time

FAM = sys.argv[1]; del sys.argv[1]
ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), FAM)
course = sys.argv[1]
chunk = int(sys.argv[sys.argv.index('--chunk') + 1]) if '--chunk' in sys.argv else 10
chunk = livegate.clamp_chunk(chunk)  # cs #968·AI: dry runs in chunks of <= 10
pf = os.path.join(ROOT, 'plans', f'{course}.json')
plan = json.load(open(pf))
ops = plan['ops']
results = []
for i in range(0, max(1, len(ops)), chunk):
    part = ops[i:i + chunk]
    body = {'ops': part}
    assert 'apply' not in body
    req = urllib.request.Request(f'http://localhost:3470/api/production/{course}/edit-batch', data=json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json', 'x-agent-id': 'cs-plan-11-13-17-19', 'x-agent-role': 'planner'}, method='POST')
    t = time.time()
    try:
        r = urllib.request.urlopen(req, timeout=600)
        status, ans = r.status, json.load(r)
    except urllib.error.HTTPError as e:
        status, ans = e.code, json.loads(e.read() or b'{}')
    results.append({'from': i, 'n': len(part), 'status': status, 'secs': round(time.time() - t, 1), 'answer': ans})
    time.sleep(1.5)
    print(course, f'ops {i}-{i + len(part) - 1}', status, json.dumps(ans, ensure_ascii=False)[:600])
plan['dryRun'] = {'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'chunks': results}
json.dump(plan, open(pf, 'w'), ensure_ascii=False, indent=1)
