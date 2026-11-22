#!/usr/bin/env python3
"""cs #233 live pre-check (Kai 19 Nov 10:38Z): immediately before an apply, read every touched seed through Popty
(GET /api/production/fra_for_eng/seed/<n>/baskets, one small read per seed) and confirm the seed pair and EVERY LEGO of it
still read as in the copy the plan was built on. Row texts are guarded by the ops' own "expect".
usage: python3 -I precheck.py <course-dump.json> <plan.json>   (exit 1 on any drift)"""
import json, sys, urllib.request
d = json.load(open(sys.argv[1])); plan = json.load(open(sys.argv[2]))
S = {s['seed_number']: s for s in d['seeds']}
bad = 0
for n in plan['touched_seeds']:
    live = json.load(urllib.request.urlopen(f'http://localhost:3470/api/production/{d["course"]}/seed/{n}/baskets'))
    s = S[n]
    if (live['seed_pair']['known'], live['seed_pair']['target']) != (s['known_text'], s['target_text']):
        bad += 1; print('SEED DRIFT', n, live['seed_pair'])
    for l in [l for l in d['legos'] if l['seed_number'] == n]:
        b = live['baskets'].get(l['lego_id'])
        if b is None:
            if any(p['seed_number'] == n and p['lego_index'] == l['lego_index'] for p in d['phrases']):
                bad += 1; print('LEGO GONE/EMPTY', l['lego_id'])
            continue
        if (b['lego']['known'], b['lego']['target']) != (l['known_text'], l['target_text']):
            bad += 1; print('LEGO DRIFT', l['lego_id'], b['lego'])
        live_rows = sorted((p['known'], p['target']) for p in b['practice_phrases'])
        copy_rows = sorted((p['known_text'], p['target_text']) for p in d['phrases'] if p['seed_number'] == n and p['lego_index'] == l['lego_index'])
        if live_rows != copy_rows:
            print('BASKET CHANGED', l['lego_id'], 'live', len(live_rows), 'copy', len(copy_rows), set(live_rows) ^ set(copy_rows))
            bad += 1
print(plan['family'], len(plan['touched_seeds']), 'seeds read live;', bad, 'drift')
sys.exit(1 if bad else 0)
