#!/usr/bin/env python3
"""score.py <positives.json> <run.jsonl>... [--minconf N] [--quiet] — recall of known positives over the UNION of runs; flag count on the rest."""
import json, sys, collections
A = sys.argv[1:]; mc = int(A[A.index('--minconf')+1]) if '--minconf' in A else 1
quiet = '--quiet' in A; runs = [x for x in A[1:] if x.endswith('.jsonl')]
pos = json.load(open(A[0]))
flags = {}; nph = 0; fail = 0
for l in (l for fn in runs for l in open(fn)):
    r = json.loads(l)
    if r['flags'] is None: fail += 1; continue
    for f in r['flags']:
        try: c = int(f.get('confidence') or 0)
        except Exception: c = 0
        if c >= mc: flags[f.get('id')] = f
hit = collections.Counter(); tot = collections.Counter(); miss = []
for k, v in pos.items():
    tot[v['cls']] += 1
    if k in flags: hit[v['cls']] += 1
    else: miss.append((k, v))
print(f"minconf {mc}: recall {sum(hit.values())}/{len(pos)}  failed units {fail}  total flags {len(flags)}  non-positive flags {len(set(flags)-set(pos))}")
for c in tot: print(f"  {c}: {hit[c]}/{tot[c]}")
for k, v in ([] if quiet else miss): print('MISS', k, v['cls'], v['before'], '|', v.get('why'))
