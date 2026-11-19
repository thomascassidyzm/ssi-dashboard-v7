#!/usr/bin/env python3
"""cs #976·AI — voice every new/changed text in plan.json through Popty's one audio door (POST :3470/api/audio/render),
adapted from #964·AI's render.py. PHASE=dry: dryRun every (course, role, text) and total wouldSpendChars; nothing is
spent. PHASE=real: one real call per text whose dry run was ok (library-first, else one render); a refusal is recorded,
never retried. Intros carry legoId, so a real presentation render binds its LEGO. Resumable via renders.json. HTTP only."""
import json, os, sys, time, urllib.request, urllib.error
HERE = os.path.dirname(os.path.abspath(__file__)); PHASE = os.environ.get('PHASE', 'dry'); CAP = 5000
plan = json.load(open(f'{HERE}/plan.json')); OUT = f'{HERE}/renders.json'
done = json.load(open(OUT)) if os.path.exists(OUT) else {}
def post(body):
    req = urllib.request.Request('http://localhost:3470/api/audio/render', json.dumps(body).encode(), {'Content-Type': 'application/json', 'x-agent-id': 'kai-976'})
    try:
        with urllib.request.urlopen(req, timeout=600) as r: return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except Exception: return e.code, {}
    except Exception as e: return 0, {'error': str(e)}
jobs = []
for c, p in plan.items():
    if c == '_intros': continue
    for n in p['clips']: jobs.append((c, n['role'], n['text'], None))
jobs += [(i['course'], 'presentation', i['text'], i['lego']) for i in plan['_intros']]
seen = set(); jobs = [j for j in jobs if not (j in seen or seen.add(j))]
spent = sum((v.get('real') or {}).get('charsSpent', 0) or 0 for v in done.values())
for c, role, text, lid in jobs:
    k = f'{c}|{role}|{text}'; rec = done.setdefault(k, {})
    base = {'courseCode': c, 'role': role, 'text': text, 'purpose': 'cs #976·AI item 12 held-seed follow-up (Kai 19 Nov)', **({'legoId': lid} if lid else {})}
    if PHASE == 'dry':
        s, d = post({**base, 'dryRun': True})
        if s == 0: print('POPTY UNREACHABLE', d); sys.exit(3)
        rec.update(dry=d, dry_status=s)
        print(f"DRY {c} {role} {text[:40]!r} -> {s} {d.get('source') or d.get('code')} would={d.get('wouldSpendChars')} {d.get('audioId','')} {str(d.get('error') or d.get('message') or '')[:160]}", flush=True)
    else:
        if rec.get('real') or rec.get('refused') or not (rec.get('dry_status') == 200 and (rec.get('dry') or {}).get('ok')): continue
        w = (rec['dry'] or {}).get('wouldSpendChars') or 0
        if spent + w > CAP: print('CAP REACHED - stop', spent, w); break
        s, d = post(base)
        if s == 0: print('POPTY UNREACHABLE on real call - stop; re-run resumes', d); sys.exit(3)
        if s == 200 and d.get('ok'): rec['real'] = d; spent += d.get('charsSpent', 0) or 0
        else: rec['refused'] = True; rec['real_error'] = {'status': s, **d}
        print(f"REAL {c} {role} {text[:40]!r} -> {s} {d.get('source') or d.get('code')} {d.get('audioId','')} chars={d.get('charsSpent')} legoLinked={d.get('legoLinked')}", flush=True)
    json.dump(done, open(OUT, 'w'), ensure_ascii=False, indent=1)
print('PHASE', PHASE, 'spent so far', spent, 'would (dry total)', sum((v.get('dry') or {}).get('wouldSpendChars', 0) or 0 for v in done.values()))
