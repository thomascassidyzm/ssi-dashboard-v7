#!/usr/bin/env python3
"""cs #877·AK item 8 step 1 — NO database. Reads the JSON the committed copy readers wrote:
  course-dump-readonly-2026-10-14.cjs  -> <dir>/<course>.dump.json
  gender-pairs-dump-readonly-2026-10-29.cjs -> <dir>/<course>.pairs.json
8A (target courses): every seed/LEGO/phrase target slot whose target_text has a stored target-side pair with a
different female reading (expanded_f != text). Writes <dir>/<course>.cand.json and <dir>/<course>.cand-ids.txt
(the target1 AND target2 clips on those slots, for tools/audio/clip-provenance-readonly.cjs).
  python3 candidates.py <dir> <course>"""
import json, sys
d, course = sys.argv[1], sys.argv[2]
dump = json.load(open(f'{d}/{course}.dump.json')); pairs = json.load(open(f'{d}/{course}.pairs.json'))
fem = {p['original_text']: p for p in pairs if p.get('text_side') == 'target' and p.get('expanded_f') and p['expanded_f'].strip() != p['original_text'].strip()}
rows = [('seed', s['seed_number'], s['seed_number'], s) for s in dump['seeds']]
rows += [('lego', l['lego_id'], l['seed_number'], l) for l in dump['legos']]
rows += [('phrase', p['id'], p['seed_number'], p) for p in dump['phrases']]
cand, ids = [], set()
for kind, rid, seed, r in rows:
    t = r.get('target_text') or ''
    p = fem.get(t)
    if not p: continue
    cand.append({'kind': kind, 'id': rid, 'seed': seed, 'text': t, 'female': p['expanded_f'], 'pair_created': p.get('created_at'),
                 't1': r.get('target1_audio_id'), 't2': r.get('target2_audio_id'), 'known': r.get('known_text')})
    ids.update(x for x in (r.get('target1_audio_id'), r.get('target2_audio_id')) if x)
json.dump(cand, open(f'{d}/{course}.cand.json', 'w'))
open(f'{d}/{course}.cand-ids.txt', 'w').write('\n'.join(sorted(ids)) + '\n')
print(course, len(fem), 'female readings;', len(cand), 'slots;', len(ids), 'clips')
