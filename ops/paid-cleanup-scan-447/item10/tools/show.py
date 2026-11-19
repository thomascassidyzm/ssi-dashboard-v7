#!/usr/bin/env python3
"""print item-10 candidates of one course in a seed range with the seed's LEGOs and the candidate's basket (read aid).
usage: python3 -I show.py <course> <dump.json> <from> <to> [--rows]"""
import json, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
c, df, a, b = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
rows = [r for r in json.load(open(os.path.join(ROOT, 'recount.json')))['rows'] if r['course'] == c and a <= int(r['row'][1:5]) <= b]
D = {s['n']: s for s in json.load(open(df))['seeds']}
seen = set()
for r in rows:
    n = int(r['row'][1:5]); s = D.get(n)
    if not s: print('NO SEED', r['row']); continue
    if n not in seen:
        seen.add(n)
        print(f"\n## {n} {s['target']} = {s['known']}")
        print('   ' + ' · '.join(f"{l['id'][-3:]} {l['target']}={l['known']}{'' if l['is_new'] else '*'}{'[M]' if l['type']=='M' else ''}" for l in s['legos']))
    print(f"  > {r['row']} [{r.get('fam')}] {r.get('live_known')} | {r.get('live_target')}  notInSeed={r.get('known_not_in_seed')} tgtInSeed={r.get('target_in_seed')} st={r.get('status')}")
    print(f"    scan: {(r.get('scan_fix') or '')[:220]}")
    if '--rows' in sys.argv:
        l = next((l for l in s['legos'] if l['id'] == r['row']), None)
        for p in (l or {}).get('phrases', []):
            print(f"      {p['id'][-3:]} {p['type'][:1]} {p['known']} | {p['target']}")
