#!/usr/bin/env python3
"""item10 (cs #742·AI): READ-ONLY. Writes $CS_SCRATCH/baskets-<course>.json = {lego_id: [phrase rows]} for every LEGO a
decisions file names, from Popty's GET /api/production/<course>/lego/<id>/basket (the rows carry target_text_roman, which
plan.py needs to send a fresh romanisation with every changed target, or the door answers ROMAN_STALE).
Run it inside tools/dbslot.sh. usage: python3 -I fetch_baskets.py <course> [--tag b]"""
import json, os, sys, time, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
course = sys.argv[1]
tag = ('-' + sys.argv[sys.argv.index('--tag') + 1]) if '--tag' in sys.argv else ''
dec = json.load(open(os.path.join(ROOT, 'decisions', f'{course}{tag}.json')))
out = os.path.join(os.environ['CS_SCRATCH'], f'baskets-{course}.json')
B = json.load(open(out)) if os.path.exists(out) else {}
for d in dec['legos']:
    if d['id'] in B:
        continue
    r = json.load(urllib.request.urlopen(f'http://localhost:3470/api/production/{course}/lego/{d["id"]}/basket', timeout=60))
    B[d['id']] = r.get('phrases') or []
    time.sleep(0.3)
json.dump(B, open(out, 'w'), ensure_ascii=False)
print(course, len(B), 'baskets', sum(len(v) for v in B.values()), 'rows',
      sum(1 for v in B.values() for p in v if (p.get('target_text_roman') or '').strip()), 'with roman')
