#!/usr/bin/env python3
"""cs #964·AI — voice every new/changed text in plan.json through Popty's one audio door (POST :3470/api/audio/render).
Per text and role: dryRun first; a refusal is recorded and NOT retried; otherwise one real call (library-first, else one render).
Resumable: renders.json keeps every answer, keyed course|role|text. No DB access; HTTP to Popty only."""
import json, os, sys, time, urllib.request, urllib.error
HERE = os.path.dirname(os.path.abspath(__file__))
plan = json.load(open(f'{HERE}/plan.json'))
OUT = f'{HERE}/renders.json'
done = json.load(open(OUT)) if os.path.exists(OUT) else {}
def post(body):
    req = urllib.request.Request('http://localhost:3470/api/audio/render', json.dumps(body).encode(), {'Content-Type': 'application/json', 'x-agent-id': 'kai-964'})
    try:
        with urllib.request.urlopen(req, timeout=600) as r: return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except Exception: return e.code, {}
    except Exception as e: return 0, {'error': str(e)}
jobs = []
for c, p in plan.items():
    for n in p['clips']:
        if n.get('known'): jobs.append((c, 'known', n['known']))
        if n.get('target'): jobs += [(c, 'target1', n['target']), (c, 'target2', n['target'])]
seen = set(); jobs = [j for j in jobs if not (j in seen or seen.add(j))]
print(len(jobs), 'texts x roles', flush=True)
for c, role, text in jobs:
    k = f'{c}|{role}|{text}'
    if k in done and (done[k].get('real') or done[k].get('refused')): continue
    base = {'courseCode': c, 'role': role, 'text': text, 'purpose': f'cs #964·AI held seed fix (item 12 spot-check), Kai 19 Nov'}
    t0 = time.time(); s, d = post({**base, 'dryRun': True})
    if s == 0: print('POPTY UNREACHABLE (not a refusal) - stopping; re-run resumes', d, flush=True); sys.exit(3)
    rec = {'dry': d, 'dry_status': s}
    if s != 200 or not d.get('ok'):
        rec['refused'] = True
    else:
        s2, d2 = post(base)
        if s2 == 0: print('POPTY UNREACHABLE on the real call - stopping; re-run resumes (library-first links any clip it stored)', d2, flush=True); sys.exit(3)
        rec.update(real=d2, real_status=s2)
        if s2 != 200 or not d2.get('ok'): rec['refused'] = True; rec.pop('real')
    done[k] = rec
    json.dump(done, open(OUT, 'w'), ensure_ascii=False, indent=1)
    r = rec.get('real') or {}
    print(f"{time.time()-t0:5.0f}s {c} {role} {text[:30]!r} -> {r.get('source') or 'REFUSED '+str(rec.get('dry_status'))+' '+json.dumps(d)[:200]} {r.get('audioId','')} {r.get('charsSpent','')}", flush=True)
print('ALL DONE', sum((v.get('real') or {}).get('charsSpent', 0) or 0 for v in done.values()), 'chars;', sum(1 for v in done.values() if v.get('refused')), 'refused', flush=True)
