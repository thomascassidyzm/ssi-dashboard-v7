#!/usr/bin/env python3
"""cs #375 readback: every touched row read back live through Popty dry runs (nothing written).
Deleted/moved-away rows must be gone; moved rows must sit in the new basket with the same texts
and the same three clip ids; the new LEGO must exist. Usage: python3 readback.py"""
import json, glob, os
from apply import post, PLAN, NV, SV
HERE = os.path.dirname(os.path.abspath(__file__))
problems, lines = [], []
for course in (NV, SV):
    applied = json.load(open(sorted(glob.glob(f'{HERE}/undo/{course}-apply-*.json'))[-1]))
    inserted = {o['row']['id']: o['row'] for o in applied['request']['ops'] if o['op'] == 'phrase.insert'}
    gone = [f'{course}:{i}' for i in PLAN[course]['delete'] + list(PLAN[course]['move'])]
    for pid in gone:
        r = post(course, {'ops': [{'op': 'phrase.delete', 'phrase_id': pid}]})
        res = (r.get('results') or [{}])[0]
        ok = (not r.get('ok')) or res.get('before') is None or res.get('changed') is False
        lines.append(f'{pid} gone: {ok}')
        if not ok: problems.append(f'{pid} still present')
    for pid, want in inserted.items():
        r = post(course, {'ops': [{'op': 'phrase.delete', 'phrase_id': pid}]})
        b = (r.get('results') or [{}])[0].get('before') or {}
        diffs = [k for k in ('seed_number', 'lego_index', 'known_text', 'target_text', 'known_audio_id', 'target1_audio_id', 'target2_audio_id') if b.get(k) != want.get(k)]
        silent = [k for k in ('known_audio_id', 'target1_audio_id', 'target2_audio_id') if not b.get(k)]
        lines.append(f'{pid} present, diffs={diffs}, silent={silent}, clips={[b.get(k) for k in ("target1_audio_id","target2_audio_id","known_audio_id")]}')
        if diffs or silent: problems.append(f'{pid} diffs {diffs} silent {silent}')
r = post(SV, {'ops': [{'op': 'lego.update', 'lego_id': 'S0117L03', 'set': {'is_new': True}}]})
b = (r.get('results') or [{}])[0]
lines.append(f"S0117L03: {json.dumps(b.get('before'), ensure_ascii=False)} is_new={not b.get('changed')}")
print('\n'.join(lines)); print('PROBLEMS:', problems or 'none')
