# cs #696·AI — zho_for_eng "last time | 上次" was taught NEW twice: S0117L01 (seed 117, right since #431·AI) and S0572L02.
# Kai approved (18 Nov 2026): seed 117 keeps the debut, S0572L02 stops being a debut.
# Canon L17 (a same-meaning restatement may be not-new) + P25 (a not-new LEGO's basket is never played, and a seed with
# no new LEGO is never played at all — S0572L01 忘 is already not-new, so seed 572 goes dark) + P26 (a seed sentence
# with no clean home is LISTED, never given an invented one). So: S0572L02 -> is_new false, intro detached (clip kept,
# the #667·I precedent), and the rows worth drilling that contain a NEW LEGO on both sides with every word available
# at that LEGO's seed are MOVED there (insert a copy with the same clips, delete the original; 0 characters):
#   U04 what happened last time? | 上次发生了什么？  -> S0117L01 (发生 S0012L04, 什么 S0012L03)
#   U05 last time was great | 上次很好            -> S0117L01 (很 S0013L02, 好 S0013L03)
#   U03 nobody came last time | 上次没有人来       -> S0367L01 nobody (没有人 is only taught at 367)
# Listed, left dark under S0572L02: B01 (exact twin of S0117L01B01), B02/U01 (来 / 他们 untaught at 117 as a word),
# B03 (known lacks "us"), U02 (见到: 'to see' at S0182L01, 'saw' not the LEGO's form), U06 (the seed sentence: no
# new LEGO it contains on both sides with its words taught — 'have you forgotten' is not S0464L01 'forgot').
# Usage: python3 plan.py <zho seeds.json> -> batch.ops.json
import json, sys, re
S = json.load(open(sys.argv[1]))['seeds']
LEGO = {l['lego_id']: l for s in S for l in s['legos']}
PH = {p['id']: p for l in LEGO.values() for p in l['basket_phrases']}
l2 = LEGO['S0572L02']; assert l2['is_new'] is True and l2['target_text'] == '上次'
assert LEGO['S0117L01']['is_new'] is True and LEGO['S0117L01']['target_text'] == '上次'
ops = [{'op': 'lego.update', 'lego_id': 'S0572L02', 'set': {'is_new': False}, 'expect': {'is_new': True, 'target_text': '上次'}},
       {'op': 'audio.link', 'target': 'lego', 'lego_id': 'S0572L02', 'slot': 'presentation', 'audio_id': None}]
MOVES = [('S0572L02U04', 'S0117L01'), ('S0572L02U05', 'S0117L01'), ('S0572L02U03', 'S0367L01')]
nextu = {}
for src, dst in MOVES:
    p = PH['zho_for_eng:' + src]; d = LEGO[dst]
    us = [int(x['id'][-2:]) for x in d['basket_phrases'] if x['id'].split(':')[1][8] == 'U']
    n = nextu.get(dst, max(us) + 1); nextu[dst] = n + 1
    pos = max(x['position'] or 0 for x in d['basket_phrases']) + (n - max(us))
    row = {k: v for k, v in p.items() if k not in ('lego_id',)}
    row.update({'id': f'zho_for_eng:{dst}U{n:02d}', 'seed_number': d['seed_number'], 'lego_index': d['lego_index'], 'position': pos,
                'connected_lego_ids': [], 'display_tiling': None, 'display_tiling_version': None})
    # the 上次 tile now names the debut that still plays
    row['decomposition'] = json.loads(json.dumps(p['decomposition'] or None, ensure_ascii=False).replace('"S0572L02"', '"S0117L01"')) if p.get('decomposition') else None
    for k in ('target1_duration_ms', 'target2_duration_ms'): row.pop(k, None)
    ops.append({'op': 'phrase.insert', 'row': row})
    ops.append({'op': 'phrase.delete', 'phrase_id': p['id'], 'expect': {'known_text': p['known_text'], 'target_text': p['target_text']}})
json.dump(ops, open('batch.ops.json', 'w'), ensure_ascii=False, indent=1)
print(len(ops), 'ops'); [print(' ', o['op'], o.get('lego_id') or o.get('phrase_id') or o['row']['id'], (o.get('row') or {}).get('known_text', '')) for o in ops]
