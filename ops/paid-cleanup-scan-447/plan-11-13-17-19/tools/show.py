#!/usr/bin/env python3
"""cs #784 read helper (no network): print LEGOs (and optionally rows) of seeds from the live cache, falling back to the
QA-copy snapshot. usage: python3 -I show.py <course> <S0012L03|12> [...] [--rows]"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from snap import live, seed, seed_legos, phrases
course = sys.argv[1]; rows = '--rows' in sys.argv
L = live(course)
for a in [x for x in sys.argv[2:] if not x.startswith('--')]:
    n = int(a[1:5]) if a.startswith('S') else int(a); want = a if a.startswith('S') else None
    if str(n) in L:
        s = L[str(n)]; print(f"## {course} S{n:04d} LIVE {s['at'][:16]} | {s['known']} | {s['target']}")
        for l in s['legos']:
            ph = [p for p in l['phrases'] if p['type'] in ('build', 'use')]
            print(f"  {'>>' if l['id'] == want else '  '}{l['id']} {'NEW' if l['is_new'] else 'old'} {l['type']} | {l['known']} | {l['target']} | {len(ph)} rows")
            if rows and (want is None or l['id'] == want):
                for p in ph: print(f"        {p['id'][-3:]} | {p['known']} | {p['target']}")
    else:
        s = seed(course, n); print(f"## {course} S{n:04d} QA-COPY | {s['known_text']} | {s['target_text']}")
        for l in seed_legos(course, n):
            print(f"  {'>>' if l['lego_id'] == want else '  '}{l['lego_id']} {'NEW' if l['is_new'] else 'old'} {l['type']} | {l['known_text']} | {l['target_text']}")
            if rows and (want is None or l['lego_id'] == want):
                for p in phrases(course, l['lego_id']):
                    if p['phrase_role'] in ('build', 'use'): print(f"        {p['id'][-3:]} | {p['known_text']} | {p['target_text']}")
