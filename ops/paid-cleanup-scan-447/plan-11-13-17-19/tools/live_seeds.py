#!/usr/bin/env python3
"""READ-ONLY live refresh for the 11/13/17/19 plan (cs #784·AI). Reads single seeds through Popty's own route
GET /api/production/<course>/script-view?seedStart=Sxxxx&seedEnd=Sxxxx (one small GET per seed, 0.4 s apart, serial)
and caches them in data/live/<course>.json as {seed_number: {known,target,status,at,legos:[{id,idx,type,is_new,known,target,
phrases:[{id,pos,type,known,target,ka,t1,t2}]}]}}. No database access of its own. Already-cached seeds are skipped
unless --force.   usage: python3 -I live_seeds.py <course> <seed> [<seed>...] [--force]"""
import json, os, sys, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
course = sys.argv[1]
force = '--force' in sys.argv
seeds = sorted({int(x) for x in sys.argv[2:] if x.isdigit()})
f = os.path.join(HERE, '..', 'data', 'live', f'{course}.json')
os.makedirs(os.path.dirname(f), exist_ok=True)
cache = json.load(open(f)) if os.path.exists(f) else {}
got = fail = 0
for n in seeds:
    if str(n) in cache and not force:
        continue
    url = f'http://localhost:3470/api/production/{course}/script-view?seedStart=S{n:04d}&seedEnd=S{n:04d}'
    d = None
    for a in range(3):
        try:
            d = json.load(urllib.request.urlopen(url, timeout=60)); break
        except Exception as e:
            err = e; time.sleep(4 + 4 * a)
    if d is None or not d.get('seeds'):
        fail += 1; print(f'GAP {course} S{n:04d}: {err if d is None else "no seed returned"}', file=sys.stderr); continue
    s = d['seeds'][0]
    cache[str(n)] = {'known': s.get('known_text'), 'target': s.get('target_text'), 'status': s.get('status'),
        'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'legos': [{'id': l['lego_id'], 'idx': l['lego_index'], 'type': l.get('type'), 'is_new': l.get('is_new'),
                   'known': l.get('known_text'), 'target': l.get('target_text'),
                   'phrases': [{'id': p['id'], 'pos': p.get('position'), 'type': p.get('type'), 'known': p.get('known_text'),
                                'target': p.get('target_text'), 'ka': p.get('known_audio_uuid'), 't1': p.get('target1_audio_uuid'),
                                't2': p.get('target2_audio_uuid')} for p in l.get('phrases', [])]} for l in s.get('legos', [])]}
    got += 1; time.sleep(0.4)
json.dump(cache, open(f, 'w'), ensure_ascii=False, indent=0, sort_keys=True)
print(course, 'fetched', got, 'cached', len(cache), 'gaps', fail)
