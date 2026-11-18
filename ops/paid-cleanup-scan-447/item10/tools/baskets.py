#!/usr/bin/env python3
"""READ-ONLY (cs #714·AI): full phrase rows (incl. target_text_roman) for the LEGOs a plan touches, via Popty's
GET /api/production/<course>/lego/<id>/basket. Writes $CS_SCRATCH/baskets-<course>.json {lego_id: [rows]} for plan.py
(romanisation of changed rows) and lexicon_zho.py. usage: python3 -I baskets.py <course> <dump.json> [--all]"""
import json, os, sys, urllib.request, concurrent.futures as cf
course, dumpf = sys.argv[1], sys.argv[2]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dump = json.load(open(dumpf))
out_f = os.path.join(os.environ['CS_SCRATCH'], f'baskets-{course}.json')
B = json.load(open(out_f)) if os.path.exists(out_f) else {}
if '--all' in sys.argv:
    seeds = {s['n'] for s in dump['seeds']}
else:
    dec = json.load(open(os.path.join(ROOT, 'decisions', f'{course}.json')))
    seeds = {int(d['id'][1:5]) for d in dec['legos']}
ids = [l['id'] for s in dump['seeds'] if s['n'] in seeds for l in s['legos'] if l['id'] not in B]
def get(i):
    u = f'http://localhost:3470/api/production/{course}/lego/{i}/basket'
    return i, json.load(urllib.request.urlopen(u, timeout=60)).get('phrases')
with cf.ThreadPoolExecutor(4) as ex:
    for i, ph in ex.map(get, ids):
        B[i] = ph
json.dump(B, open(out_f, 'w'), ensure_ascii=False)
print(course, 'baskets', len(B), 'fetched', len(ids))
