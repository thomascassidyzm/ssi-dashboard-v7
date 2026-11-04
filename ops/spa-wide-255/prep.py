#!/usr/bin/env python3
"""prep.py <course.json> <outdir> [--seeds a-b] [--inject before.json] [--presentations pres.json]
Writes <outdir>/units.jsonl: one unit per PLAYED basket (is_new LEGO, phrase_role != component),
plus one 'seedset' unit per 8 seeds carrying each seed pair and its is_new LEGO pairs.
--inject: {phrase_id: [known, target]} overrides phrase texts (calibration: re-inject known past defects)."""
import json, sys, re, unicodedata, os
def norm(s): return unicodedata.normalize('NFKC', (s or '')).lower()
def words(s): return [w for w in re.split(r"[^\w']+", norm(s)) if w]
def stems(s):
    ws = words(s); return {w for w in ws if len(w) > 2} | {w[:5] for w in ws if len(w) >= 6}
a = sys.argv[1:]; src, outdir = a[0], a[1]
rng = tuple(map(int, a[a.index('--seeds')+1].split('-'))) if '--seeds' in a else None
pres = json.load(open(a[a.index('--presentations')+1]))['all'] if '--presentations' in a else {}
inj = json.load(open(a[a.index('--inject')+1])) if '--inject' in a else {}
d = json.load(open(src)); course = d['courseCode']
seeds = sorted(d['seeds'], key=lambda s: s['seed_number'])
taught, units, seedset = [], [], []
def inrange(n): return not rng or rng[0] <= n <= rng[1]
for s in seeds:
    legos = sorted(s['legos'], key=lambda l: l['lego_index'])
    if inrange(s['seed_number']):
        seedset.append({'seed': s['seed_number'], 'id': s['seed_id'], 'known': s['known_text'], 'target': s['target_text'],
                        'legos': [{'id': l['lego_id'], 'known': l['known_text'], 'target': l['target_text'],
                                   'intro': re.sub(r'<[^>]+>', '', (pres.get(l['lego_id']) or {}).get('text') or '').strip() or None} for l in legos if l['is_new']]})
    for l in legos:
        taught.append({'id': l['lego_id'], 'known': l['known_text'], 'target': l['target_text']})
        if not l['is_new'] or not inrange(s['seed_number']): continue
        phr = [p for p in (l.get('basket_phrases') or []) if p['phrase_role'] != 'component']
        if not phr: continue
        phr.sort(key=lambda p: (p['phrase_role'] != 'build', p['position'] or 0))
        out = []
        for p in phr:
            pid = p['id'].split(':')[-1]; k, t = inj.get(pid, (p['known_text'], p['target_text']))
            out.append({'id': pid, 'role': p['phrase_role'], 'known': k, 'target': t})
        bag = set()
        for p in out: bag |= stems(p['known']) | stems(p['target'])
        ctx = [x for x in taught[:-1] if (stems(x['known']) & bag) or (stems(x['target']) & bag)][-40:]
        units.append({'kind': 'basket', 'course': course, 'key': l['lego_id'], 'seed': s['seed_number'],
                      'seed_pair': {'known': s['known_text'], 'target': s['target_text']},
                      'lego_pair': {'known': l['known_text'], 'target': l['target_text']},
                      'phrases': out, 'ctx': ctx})
for i in range(0, len(seedset), 8):
    grp = seedset[i:i+8]
    units.append({'kind': 'seedset', 'course': course, 'key': f"SEEDS{grp[0]['seed']:04d}-{grp[-1]['seed']:04d}",
                  'seed': grp[0]['seed'], 'seeds': grp})
os.makedirs(outdir, exist_ok=True)
with open(os.path.join(outdir, 'units.jsonl'), 'w') as f:
    for u in units: f.write(json.dumps(u, ensure_ascii=False) + '\n')
print(course, 'baskets', sum(u['kind'] == 'basket' for u in units), 'phrases',
      sum(len(u.get('phrases', [])) for u in units), 'seedsets', sum(u['kind'] == 'seedset' for u in units))
