#!/usr/bin/env python3
"""Thin-basket work list for one course (cs #718·AI), from the live fetch.py JSON and ../<course>/collide.json.
A REAL build = a build row whose target is not the bare LEGO (isBareLegoPhrase-equivalent: normalised target equal)
and not a repeat of an earlier row. The player skips a bare row (cycles.ts debutKey) and fills empty build slots
from USE rows, so `uses` is reported too. Need = 3 - real builds. Worst first: real builds, then playable rows.
usage: worklist.py <course>  -> ../<course>/worklist.json + summary"""
import json, os, re, sys
c = sys.argv[1]; H = os.path.dirname(os.path.abspath(__file__))
live = json.load(open(os.path.expanduser(f'~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-item20/live/{c}.json')))
cdir = os.path.join(H, '..', c)
held = set(json.load(open(os.path.join(cdir, 'collide.json')))) if os.path.exists(os.path.join(cdir, 'collide.json')) else set()
norm = lambda s: re.sub(r'[\s\.\?\!,;:।؟۔"\']+', ' ', (s or '').lower()).strip()
rows, skipped = [], []
for s in live['seeds']:
    for l in s['legos']:
        if l.get('is_new') is False: continue
        seen = {norm(l['known_text']) + '|' + norm(l['target_text'])}; rb = ub = 0; bare = []
        for p in l['basket_phrases']:
            r = p['phrase_role']
            if r not in ('build', 'use', 'practice'): continue
            if norm(p['target_text']) == norm(l['target_text']):
                if r != 'use': bare.append(p['id'].split(':')[-1][8:])
                continue
            k = norm(p['known_text']) + '|' + norm(p['target_text'])
            if k in seen: continue
            seen.add(k)
            if r == 'use': ub += 1
            else: rb += 1
        if rb >= 3: continue
        e = {'lego': l['lego_id'], 'seed': s['seed_number'], 'known': l['known_text'], 'target': l['target_text'], 'type': l['type'],
             'real_builds': rb, 'uses': ub, 'playable': min(7, rb + ub), 'bare': bare, 'need': 3 - rb}
        if l['lego_id'] in held or f"SEED{s['seed_number']:04d}" in held: skipped.append(e)
        else: rows.append(e)
rows.sort(key=lambda e: (e['real_builds'], e['playable'], e['seed']))
json.dump({'course': c, 'at': live['at'], 'todo': rows, 'held': skipped}, open(os.path.join(cdir, 'worklist.json'), 'w'), ensure_ascii=False, indent=0)
from collections import Counter
print(c, 'thin', len(rows) + len(skipped), 'todo', len(rows), 'held', len(skipped), 'todo by real builds', dict(sorted(Counter(e['real_builds'] for e in rows).items())),
      'rows needed', sum(e['need'] for e in rows), 'of which rewordable bare', sum(min(e['need'], len(e['bare'])) for e in rows))
