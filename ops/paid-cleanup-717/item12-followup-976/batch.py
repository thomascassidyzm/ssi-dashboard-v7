#!/usr/bin/env python3
"""cs #976·AI — one edit-batch per course: plan.json text ops (with expect) + audio.link ops for every clip need, from
renders.json (a rendered or library clip) or, on EXISTS_IN_LANGUAGE, the existing clip the refusal names (as #964 did).
A need with no clip is listed as a GAP and the course is NOT batched (no row is left silent by this job). No DB."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
plan = json.load(open(f'{HERE}/plan.json')); rend = json.load(open(f'{HERE}/renders.json'))
def clip(c, role, text):
    r = rend.get(f'{c}|{role}|{text}', {})
    if (r.get('real') or {}).get('audioId'): return r['real']['audioId']
    ex = (r.get('dry') or {}).get('existing') or []
    return ex[0]['audioId'] if (r.get('dry') or {}).get('code') == 'EXISTS_IN_LANGUAGE' and len(ex) == 1 else None
for c, p in plan.items():
    if c == '_intros': continue
    links, gaps = [], []
    for n in p['clips']:
        aid = clip(c, n['role'], n['text'])
        if not aid: gaps.append(f"{n['kind']} {n['key']} {n['role']}"); continue
        o = {'op': 'audio.link', 'target': n['kind'], 'slot': n['role'], 'audio_id': aid}
        o[{'seed': 'seed_number', 'lego': 'lego_id', 'phrase': 'phrase_id'}[n['kind']]] = n['key']; links.append(o)
    if gaps: print(c, 'HELD - no clip for', gaps); continue
    json.dump({'ops': p['ops'] + links}, open(f'{HERE}/batches/{c}.json', 'w'), ensure_ascii=False, indent=1)
    print(c, len(p['ops']), 'text ops', len(links), 'links')
