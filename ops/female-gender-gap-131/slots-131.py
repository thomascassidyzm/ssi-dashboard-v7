#!/usr/bin/env python3
"""cs #131·AI step 1 — every target1 (female) slot whose row text has a female reading that differs from it.
Inputs: GET /api/production/<course>/seeds snapshot and the course's course_gender_expansions dump
(tools/course-optimization/gender-pairs-dump-readonly-2026-10-29.cjs). Phase8 keys the reading on the exact
clip text (gender-haiku-service.cjs genderMapKey), so the match is exact; a case/space-only match is kept but marked.
Writes <out>.slots.json (one entry per slot) and <out>.ids.txt (the served target1 clips + the target2 clips
that share them, for tools/audio/clip-provenance-readonly.cjs).
  python3 slots-131.py <seeds.json> <gender.json> <out-prefix>"""
import json, sys, collections
seeds = json.load(open(sys.argv[1]))['seeds']; gender = json.load(open(sys.argv[2])); out = sys.argv[3]
fem = {r['original_text']: r['expanded_f'] for r in gender if r['expanded_f'] and r['expanded_f'] != r['original_text']}
norm = {r.strip().lower(): r for r in fem}
rows = []
for s in seeds:
    rows.append(('seed', f"S{s['seed_number']:04d}", s['seed_number'], s))
    for l in s.get('legos') or []:
        rows.append(('lego', l['lego_id'], s['seed_number'], l))
        for p in l.get('basket_phrases') or []:
            rows.append(('phrase', p['id'].split(':', 1)[-1], s['seed_number'], p))
t1_users = collections.defaultdict(set); t2_users = collections.defaultdict(set)
for kind, sid, n, r in rows:
    if r.get('target1_audio_id'): t1_users[r['target1_audio_id']].add(sid)
    if r.get('target2_audio_id'): t2_users[r['target2_audio_id']].add(sid)
slots = []
for kind, sid, n, r in rows:
    t = r.get('target_text') or ''
    match = 'exact' if t in fem else ('loose' if t.strip().lower() in norm else None)
    if not match: continue
    key = t if match == 'exact' else norm[t.strip().lower()]
    slots.append({'kind': kind, 'slot': sid, 'seed': n, 'known': r.get('known_text'), 'text': t, 'female': fem[key],
                  'match': match, 'clip': r.get('target1_audio_id'), 'status': r.get('status'),
                  'clip_t1_users': sorted(t1_users.get(r.get('target1_audio_id'), ())),
                  'clip_t2_users': sorted(t2_users.get(r.get('target1_audio_id'), ()))})
json.dump(slots, open(out + '.slots.json', 'w'))
open(out + '.ids.txt', 'w').write('\n'.join(sorted({s['clip'] for s in slots if s['clip']})) + '\n')
print(len(fem), 'differing readings;', len(slots), 'target1 slots;', sum(1 for s in slots if not s['clip']), 'silent;',
      len({s['clip'] for s in slots if s['clip']}), 'distinct clips;', sum(1 for s in slots if s['match'] == 'loose'), 'loose')
