#!/usr/bin/env python3
"""data/copy/<course>.json: the seeds a proposal touches, as the NIGHTLY COPY holds them (cs #931·AI; replaces
live_seeds.py and data/live/, which read Popty's script-view on live). Shape per seed, keyed by seed number:
{known,target,status,at,copy_db,legos:[{id,idx,type,is_new,known,target,phrases:[{id,pos,type,known,target,ka,t1,t2}]}]}.
Reads $CS_SCRATCH/dumps/<course>.json (make it with mkdump.py). usage: python3 -I copy_seeds.py <course> <seed>... | --same"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__)))))  # ops/paid-cleanup-scan-447 (copykit), through symlinked shard dirs too
import copykit
course = sys.argv[1]
f = os.path.join(HERE, '..', 'data', 'copy', f'{course}.json')
old = json.load(open(f)) if os.path.exists(f) else {}
seeds = sorted({int(k) for k in old}) if '--same' in sys.argv else sorted({int(x) for x in sys.argv[2:] if x.isdigit()})
d = copykit.load_dump(os.path.join(os.environ['CS_SCRATCH'], 'dumps', f'{course}.json'))
SD = {s['n']: s for s in d['seeds']}
out = {}
for n in seeds:
    s = SD.get(n)
    if not s:
        print(f'GAP {course} S{n:04d}: not in the copy dump', file=sys.stderr); continue
    out[str(n)] = {'known': s['known'], 'target': s['target'], 'status': s['status'], 'at': d['dumped'], 'copy_db': d.get('copy_db'), 'legos': s['legos']}
os.makedirs(os.path.dirname(f), exist_ok=True)
json.dump(out, open(f, 'w'), ensure_ascii=False, indent=0, sort_keys=True)
print(course, 'seeds', len(out), 'from', d.get('copy_db'))
