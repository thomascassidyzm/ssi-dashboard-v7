#!/usr/bin/env python3
"""fold.py <fresh seeds.json> — merges triage/out/*.jsonl into triage/final/: clear.jsonl (apply-ready), kai.jsonl,
native.jsonl, false.jsonl, stats.json. Re-checks every CLEAR against a FRESH course read (drift), re-runs gates.py on the
merged set, re-counts basket floors over ALL deletes together, and inverts knock_on_of into knock_on lists."""
import json, glob, sys, os, subprocess, collections
H = os.path.dirname(os.path.abspath(__file__)); S = sys.argv[1]
rows = {}; conflicts = []
for f in sorted(glob.glob(f'{H}/out/*.jsonl')):
    for l in open(f):
        if not l.strip(): continue
        r = json.loads(l); r['band'] = os.path.basename(f)[:1]
        if r['id'] in rows:
            o = rows[r['id']]
            if (o['bucket'], o.get('after')) != (r['bucket'], r.get('after')): conflicts.append((r['id'], o['band'], o['bucket'], o.get('after'), r['band'], r['bucket'], r.get('after')))
            own = lambda x: {'A': (1, 149), 'B': (150, 215), 'C': (216, 280), 'D': (281, 420), 'E': (421, 545), 'F': (546, 668)}[x['band']]
            n = int(r['id'][1:5]); lo, hi = own(r)
            if lo <= n <= hi: rows[r['id']] = r
        else: rows[r['id']] = r
snap = json.load(open(S)); live = {}; basket = {}; played = collections.Counter()
for s in snap['seeds']:
    live[s['seed_id']] = (s['known_text'], s['target_text'])
    for l in s['legos']:
        live[l['lego_id']] = (l['known_text'], l['target_text'])
        for p in l.get('basket_phrases') or []:
            i = p['id'].split(':')[-1]; live[i] = (p['known_text'], p['target_text'])
            if l['is_new'] and p['phrase_role'] != 'component':
                basket[i] = (l['lego_id'], p['phrase_role']); played[s['seed_number']] += 1
clear = [r for r in rows.values() if r['bucket'] == 'CLEAR']
drift = [r['id'] for r in clear if r['id'] not in live or list(live[r['id']]) != list(r['before'])]
props = [{'id': r['id'], 'after_known': (r['after'] or [None, None])[0] if (r['after'] or [None])[0] != (r['before'] or [None])[0] else None,
          'after_target': (r['after'] or [None, None])[1] if (r['after'] or [None, None])[1] != (r['before'] or [None, None])[1] else None} for r in clear]
pf = f'{H}/final-props.jsonl'; open(pf, 'w').write(''.join(json.dumps(p, ensure_ascii=False) + '\n' for p in props))
g = {json.loads(l)['id']: json.loads(l) for l in subprocess.run(['python3', f'{H}/../gates.py', S, pf], capture_output=True, text=True, check=True).stdout.splitlines() if l.strip()}
os.remove(pf)
left = collections.Counter(basket.values())
for r in clear:
    if (r['after'] or [None, None])[1] == 'DELETE' and r['id'] in basket: left[basket[r['id']]] -= 1
fails = []
for r in clear:
    x = g.get(r['id'], {}); bad = []
    if (r['after'] or [None, None])[1] == 'DELETE':
        lg = basket.get(r['id'], ('?',))[0]
        if left[(lg, 'use')] < 4 or left[(lg, 'build')] < 1: bad.append(f"floor {lg}")
    else:
        if x.get('untaught') and not r.get('gate_override'): bad.append('untaught ' + ','.join(x['untaught']))
        if x.get('contains_lego') is False and not r.get('gate_override'): bad.append('loses LEGO')
        if x.get('zut') and basket.get(r['id'], ('', ''))[1] == 'use': bad.append('zut ' + ','.join(x['zut'][:3]))
    r['recheck'] = bad or None
    if bad: fails.append((r['id'], r['band'], bad))
kids = collections.defaultdict(list)
for r in rows.values():
    if r.get('knock_on_of'): kids[r['knock_on_of']].append(r['id'])
for r in rows.values(): r['knock_on'] = sorted(set((r.get('knock_on') or []) + kids.get(r['id'], [])))
os.makedirs(f'{H}/final', exist_ok=True)
for b, name in (('CLEAR', 'clear'), ('NEEDS-KAI', 'kai'), ('NEEDS-NATIVE', 'native'), ('FALSE', 'false')):
    sel = sorted((r for r in rows.values() if r['bucket'] == b), key=lambda r: r['id'])
    open(f'{H}/final/{name}.jsonl', 'w').write(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in sel))
def belt(n): return '1-39' if n < 40 else 'Green 40-79' if n < 80 else 'Blue 80-149' if n < 150 else 'Purple 150-280' if n <= 280 else 'Purple+ 281-668'
pb = collections.Counter(); 
for n, c in played.items(): pb[belt(n)] += c
real = collections.Counter(); after = collections.Counter(); bytype = collections.defaultdict(collections.Counter)
for r in rows.values():
    if r['id'] not in basket or r['bucket'] == 'FALSE': continue
    b = belt(int(r['id'][1:5])); real[b] += 1; bytype[b][r.get('type') or '?'] += 1
    if r['bucket'] != 'CLEAR' or r.get('recheck'): after[b] += 1
stats = {'played_phrases': dict(pb), 'defective_played_rows': dict(real), 'left_after_clear': dict(after),
         'per100_before': {b: round(100 * real[b] / pb[b], 2) for b in pb}, 'per100_after': {b: round(100 * after[b] / pb[b], 2) for b in pb},
         'by_type': {b: dict(c) for b, c in bytype.items()}, 'buckets': dict(collections.Counter(r['bucket'] for r in rows.values())),
         'drift': drift, 'recheck_fail': fails, 'conflicts': conflicts}
json.dump(stats, open(f'{H}/final/stats.json', 'w'), ensure_ascii=False, indent=1)
print(json.dumps({k: v for k, v in stats.items() if k not in ('by_type',)}, ensure_ascii=False, indent=1)[:4000])
