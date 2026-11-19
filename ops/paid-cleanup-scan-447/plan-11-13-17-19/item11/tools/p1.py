#!/usr/bin/env python3
"""P1 read-back for a decisions file (no network): every NEW target text (rebuilt rows, add rows) is checked word by
word against the LEGO targets taught at or before its LEGO (exact written form) and, failing that, against any phrase
row of an EARLIER seed (a form the learner has already been given in practice). Prints only the misses.
usage: python3 -I item11/tools/p1.py <course>"""
import json, os, re, sys, unicodedata
FAM = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
course = sys.argv[1]
def norm(t):
    t = unicodedata.normalize('NFC', t or '').lower(); t = re.sub(r"[’‘`]", "'", t)
    t = re.sub(r"[\.,!?¿¡;:\"“”«»。，！？、；：（）()\[\]…—–\-।॥؟،۔]+", " ", t); return re.sub(r'\s+', ' ', t).strip()
D = json.load(open(os.environ['CS_SCRATCH'] + f'/dumps/{course}.json'))
dec = json.load(open(os.path.join(FAM, 'decisions', f'{course}.json')))
L = [(s['n'], l) for s in D['seeds'] for l in s['legos']]
miss = 0
for d in dec['legos']:
    n0, i0 = int(d['id'][1:5]), int(d['id'][6:8])
    lego, rows = set(), set()
    for n, l in L:
        if n < n0 or (n == n0 and l['idx'] <= i0): lego.update(norm(l['target']).split())
        if n < n0:
            for p in l['phrases']: rows.update(norm(p['target']).split())
    lego.update(norm(d.get('target') or '').split())
    new = [(k, v[1]) for k, v in (d.get('basket') or {}).items() if isinstance(v, list)] + [(a[0] + '+', a[2]) for a in d.get('add', [])]
    for k, t in new:
        a = [w for w in norm(t).split() if w not in lego]
        b = [w for w in a if w not in rows]
        if a:
            miss += 1
            print(d['id'], k, '|', t, '| not in a LEGO by here:', a, '| of those never in an earlier row:', b)
print(course, 'rows with a miss:', miss)
