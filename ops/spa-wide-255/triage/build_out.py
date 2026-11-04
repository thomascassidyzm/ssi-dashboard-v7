#!/usr/bin/env python3
"""build_out.py <BAND> <decide_X.py> — turns a hand-decision table into triage/out/<BAND>.jsonl:
runs gates.py on every CLEAR, checks basket floors for deletes (>=4 USE, >=1 BUILD left), and lists
input ids with no decision and CLEAR rows that fail a gate."""
import json, sys, os, subprocess, collections, importlib.util
band, dec = sys.argv[1], sys.argv[2]
H = os.path.dirname(os.path.abspath(__file__)); W = os.path.expanduser('~/ssi-evidence/ssi-dashboard-v7/ops/spa-wide-255')
S = f'{W}/snap/spa-post.json'
spec = importlib.util.spec_from_file_location('d', dec); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); D = m.D
inp = {json.loads(l)['id']: json.loads(l) for l in open(f'{H}/input/{band}.jsonl')}
missing = [i for i in inp if i not in D]
props = []
for i, (b, ak, at, *_r) in D.items():
    x = _r[2] if len(_r) > 2 else {}
    if b == 'CLEAR': props.append({'id': i, 'after_known': ak, 'after_target': at, 'pattern_target': x.get('pattern_target'), 'pattern_known': x.get('pattern_known')})
pf = f'{W}/triage/{band}-props.jsonl'; os.makedirs(f'{W}/triage/out', exist_ok=True)
open(pf, 'w').write(''.join(json.dumps(p, ensure_ascii=False) + '\n' for p in props))
gated = {json.loads(l)['id']: json.loads(l) for l in subprocess.run(['python3', f'{H}/../gates.py', S, pf], capture_output=True, text=True, check=True).stdout.splitlines() if l.strip()}
snap = json.load(open(S)); basket = {}
for s in snap['seeds']:
    for l in s['legos']:
        if l['is_new']:
            for p in l.get('basket_phrases') or []:
                basket[p['id'].split(':')[-1]] = (l['lego_id'], p['phrase_role'])
left = collections.Counter((v[0], v[1]) for v in basket.values())
for i, (b, ak, at, *_r) in D.items():
    if b == 'CLEAR' and at == 'DELETE' and i in basket: left[basket[i]] -= 1
fails = []; out = []
for i, (b, ak, at, reason, rule, x) in D.items():
    src = inp.get(i, {}); g = gated.get(i)
    before = g['before'] if g else [src.get('known'), src.get('target')]
    r = {'id': i, 'bucket': b, 'type': (src.get('second_read') or {}).get('type'), 'before': before,
         'after': g['after'] if g and b == 'CLEAR' else None, 'reason': reason, 'rule': rule,
         'knock_on': [], 'knock_on_of': x.get('knock_on_of'), 'proposal': x.get('proposal'), 'question': x.get('question')}
    if g and b == 'CLEAR':
        r['gates'] = {k: g.get(k) for k in ('untaught', 'contains_lego', 'zut', 'dup_before', 'pattern_rows')}
        bad = []
        if g.get('error'): bad.append(g['error'])
        if at != 'DELETE':
            if g.get('untaught'): bad.append('untaught ' + ','.join(g['untaught']))
            if g.get('contains_lego') is False: bad.append('loses LEGO')
            if g.get('zut') and basket.get(i, (0, ''))[1] == 'use': bad.append('zut ' + ','.join(g['zut']))
        else:
            lg = basket.get(i, ('?',))[0]
            if left[(lg, 'use')] < 4 or left[(lg, 'build')] < 1: bad.append(f'floor {lg} use={left[(lg,"use")]} build={left[(lg,"build")]}')
        if bad: fails.append((i, bad, r['after'], g.get('pattern_rows')))
        r['gate_fail'] = bad or None
    out.append(r)
open(f'{H}/out/{band}.jsonl' if os.path.isdir(f'{H}/out') else os.makedirs(f'{H}/out') or f'{H}/out/{band}.jsonl', 'w').write(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in out))
print(band, collections.Counter(r['bucket'] for r in out), 'missing decisions', missing)
for f in fails: print('GATE', f[0], f[1], f[2])
print('pattern rows to read:')
for i, g in gated.items():
    if g.get('pattern_rows'): print(' ', i, g['pattern_count'], g['pattern_rows'][:15])
