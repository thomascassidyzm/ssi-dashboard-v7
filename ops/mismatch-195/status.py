#!/usr/bin/env python3
"""status.py <units.jsonl> <run.jsonl> — is a course run complete? Every unit basket must have one parsed verdict
row whose ids cover every phrase in the unit. Prints counts and exits 0 only when complete."""
import json, sys
units={}
for l in open(sys.argv[1]):
    u=json.loads(l); units[u['basket']]={p['id'] for p in u['phrases']}
got={}
try:
    for l in open(sys.argv[2]):
        r=json.loads(l)
        if r.get('verdicts') is not None: got[r['basket']]=r
except FileNotFoundError: pass
missing=[b for b in units if b not in got]
short=[b for b,r in got.items() if b in units and not units[b] <= {v.get('id') for v in r['verdicts'] if isinstance(v,dict)}]
flags=[(v.get('id'),v.get('confidence')) for r in got.values() for v in r['verdicts'] if isinstance(v,dict) and v.get('verdict')=='DEFECT']
print(f"units {len(units)} judged {len(got)} missing {len(missing)} incomplete-verdict-sets {len(short)} "
      f"DEFECT flags {len(flags)} (conf>=4: {sum(1 for _,c in flags if (c or 0)>=4)})")
if missing: print('missing:', ' '.join(missing[:40]))
sys.exit(0 if not missing else 1)
