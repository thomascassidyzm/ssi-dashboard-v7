#!/usr/bin/env python3
"""item10 dry run (cs #714·AI): sends plans/<course>.json "ops" to Popty's edit door as a DRY RUN
(POST /api/production/<course>/edit-batch WITHOUT "apply" — the real transaction, rolled back) and stores the answer in
the plan under "dryRun". Never sends "apply": true; refuses to run if any op list carries it.
usage: python3 -I dryrun.py <course> [--chunk 1500]"""
import json, os, sys, urllib.request, urllib.error, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
course = sys.argv[1]
chunk = int(sys.argv[sys.argv.index('--chunk') + 1]) if '--chunk' in sys.argv else 100  # the edit door refuses >100 ops (BULK_EDIT)
only = {int(x) for x in sys.argv[sys.argv.index('--only') + 1].split(',')} if '--only' in sys.argv else None  # re-run just these chunk starts
pf = os.path.join(ROOT, 'plans', f'{course}.json')
plan = json.load(open(pf))
ops = plan['ops']
prev = {c['from']: c for c in (plan.get('dryRun') or {}).get('chunks', [])} if only else {}
results = []
for i in range(0, max(1, len(ops)), chunk):
    if only is not None and i not in only:
        if i in prev:
            results.append(prev[i])
        continue
    part = ops[i:i + chunk]
    body = {'ops': part}
    assert 'apply' not in body
    req = urllib.request.Request(f'http://localhost:3470/api/production/{course}/edit-batch', data=json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json', 'x-agent-id': 'cs-714-item10-plan (dry run only)', 'x-agent-role': 'planner'}, method='POST')
    t = time.time()
    try:
        r = urllib.request.urlopen(req, timeout=600)
        status, ans = r.status, json.load(r)
    except urllib.error.HTTPError as e:
        status, ans = e.code, json.loads(e.read() or b'{}')
    except Exception as e:  # a timed-out chunk is recorded and re-run with --only, never silently lost
        status, ans = 'timeout', {'error': str(e)}
    results.append({'from': i, 'n': len(part), 'status': status, 'secs': round(time.time() - t, 1), 'answer': ans})
    print(course, f'ops {i}-{i + len(part) - 1}', status, json.dumps(ans, ensure_ascii=False)[:600], flush=True)
    plan['dryRun'] = {'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'chunks': results, 'partial': True}
    json.dump(plan, open(pf, 'w'), ensure_ascii=False, indent=1)
plan['dryRun'] = {'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'chunks': results}
json.dump(plan, open(pf, 'w'), ensure_ascii=False, indent=1)
