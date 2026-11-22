#!/usr/bin/env python3
"""cs #233: plan.json -> batch body {ops: text ops + one audio.link per slot}, so text and sound change in ONE transaction
(make-before-break: every clip linked here already exists; the old clip is only unlinked, never deleted).
A slot with no resolved clip is NOT linked and is listed in plan['unvoiced'] — the batch is refused by run.py if any exist.
usage: python3 -I compose.py <plan.json> <out-body.json>"""
import json, sys
plan = json.load(open(sys.argv[1]))
links, unvoiced = [], []
def tgt(kind, key):
    return {'target': 'seed', 'seed_number': key} if kind == 'seed' else {'target': 'lego', 'lego_id': key} if kind == 'lego' else {'target': 'phrase', 'phrase_id': key}
for x in plan['need']:
    a = plan.get('audio', {}).get(f"{x['slot']}|{x['text']}")
    if not a or not a.get('audioId'):
        unvoiced.append(x); continue
    links.append({'op': 'audio.link', **tgt(x['kind'], x['id']), 'slot': x['slot'], 'audio_id': a['audioId']})
for x in plan['links']:
    links.append({'op': 'audio.link', **tgt(x['kind'], x['id']), 'slot': x['slot'], 'audio_id': x['audio_id'], **({'allow_text_mismatch': True} if x.get('allow_text_mismatch') else {})})
plan['unvoiced'] = unvoiced
json.dump(plan, open(sys.argv[1], 'w'), ensure_ascii=False, indent=1)
json.dump({'ops': plan['ops'] + links}, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
print(plan['family'], len(plan['ops']), 'text ops +', len(links), 'links;', len(unvoiced), 'slots unvoiced')
