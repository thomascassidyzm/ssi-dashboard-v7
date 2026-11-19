#!/usr/bin/env python3
"""Builds a dump in ../dump-course.py's format for plan.py/validate.py, with NO network: the whole course from the
QA-copy snapshot ($CS_SCRATCH/snap/<course>.json, last night's copy) and every seed in data/live/<course>.json
OVERLAID from today's live read (live_seeds.py). "live_seeds" lists the overlaid seeds; plan.py refuses a decision on
any other seed. usage: python3 -I mkdump.py <course>  ->  $CS_SCRATCH/dumps/<course>.json"""
import json, os, sys, collections, time
HERE = os.path.dirname(os.path.abspath(__file__))
course = sys.argv[1]
S = os.environ['CS_SCRATCH']
sn = json.load(open(f'{S}/snap/{course}.json'))
lf = os.path.join(HERE, '..', 'data', 'live', f'{course}.json')
live = json.load(open(lf)) if os.path.exists(lf) else {}
ph = collections.defaultdict(list)
for p in sn['phrases']:
    ph[(p['seed_number'], p['lego_index'])].append({'id': p['id'], 'pos': p['position'], 'type': p['phrase_role'], 'known': p['known_text'],
                                                  'target': p['target_text'], 'ka': p['ka'], 't1': p['t1'], 't2': p['t2']})
lg = collections.defaultdict(list)
for l in sn['legos']:
    lg[l['seed_number']].append({'id': l['lego_id'], 'idx': l['lego_index'], 'type': l['type'], 'is_new': l['is_new'], 'known': l['known_text'],
                                 'target': l['target_text'], 'phrases': ph[(l['seed_number'], l['lego_index'])]})
seeds = []
for s in sn['seeds']:
    n = s['seed_number']
    if str(n) in live:
        v = live[str(n)]
        seeds.append({'n': n, 'known': v['known'], 'target': v['target'], 'status': v['status'], 'legos': v['legos'], 'live_at': v['at']})
    else:
        seeds.append({'n': n, 'known': s['known_text'], 'target': s['target_text'], 'status': s['status'], 'legos': lg[n]})
os.makedirs(f'{S}/dumps', exist_ok=True)
json.dump({'course': course, 'dumped': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'qa_copy': sn.get('db'),
           'live_seeds': sorted(int(k) for k in live), 'seeds': seeds}, open(f'{S}/dumps/{course}.json', 'w'), ensure_ascii=False)
print(course, 'seeds', len(seeds), 'live-overlaid', len(live))
