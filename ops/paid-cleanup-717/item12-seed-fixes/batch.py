#!/usr/bin/env python3
"""cs #964·AI — build one edit-batch per course: plan.json text ops (with expect) + audio.link ops from renders.json
(new clips) or from the copy (an existing clip already speaking the words). Writes batches/<course>.json. No DB."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
SNAP = os.path.expanduser('~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-717/snap')
plan = json.load(open(f'{HERE}/plan.json')); rend = json.load(open(f'{HERE}/renders.json'))
os.makedirs(f'{HERE}/batches', exist_ok=True)
gaps = []
def clip(c, role, text):
    r = rend.get(f'{c}|{role}|{text}', {})
    return (r.get('real') or {}).get('audioId') or (r.get('linked_existing') or {}).get('audioId')
for c, p in plan.items():
    s = json.load(open(f'{SNAP}/{c}.json'))
    seeds = {x['seed_number']: x for x in s['seeds']}; phr = {x['id'].split(':')[1]: x for x in s['phrases']}
    ops = list(p['ops']); links = []
    # texts as they will be after the text ops
    after = {}
    for o in p['ops']:
        if o['op'] == 'seed.update': after[('seed', o['seed_number'])] = {**{k: seeds[o['seed_number']][k] for k in ('known_text', 'target_text')}, **o['set']}
        if o['op'] == 'phrase.update': after[('phrase', o['phrase_id'].split(':')[1])] = {**{k: phr[o['phrase_id'].split(':')[1]][k] for k in ('known_text', 'target_text')}, **o['set']}
        if o['op'] == 'phrase.insert': after[('phrase', o['row']['id'].split(':')[1])] = o['row']
    seed_of = {}
    for o in p['ops']:
        if o['op'] == 'seed.update': seed_of.setdefault('last', o['seed_number'])
    for n in p['clips']:
        kind, key = n['kind'], n['key']
        ids = {}
        if n.get('known'): ids['known'] = clip(c, 'known', n['known'])
        if n.get('target'): ids['target1'] = clip(c, 'target1', n['target']); ids['target2'] = clip(c, 'target2', n['target'])
        reuse = n.get('reuse')
        if reuse:
            if reuse.startswith('phrase:'):
                src = reuse.split(':')[1]
                if src in phr and kind != 'lego':      # an existing row's clip already speaking the words
                    slot = 'known' if n.get('known') or kind == 'seed' else None
                    if n.get('known'): ids['known'] = phr[src]['ka']
                else:                                  # a LEGO takes its B01 build's clips, rendered here
                    b = after[('phrase', src)]
                    ids = {'known': clip(c, 'known', b['known_text']), 'target1': clip(c, 'target1', b['target_text']), 'target2': clip(c, 'target2', b['target_text'])}
            else:                                      # 'seed' / 'seed:N' — the seed's own clips (new where its text changed)
                sn = int(reuse.split(':')[1]) if ':' in reuse else (key if kind == 'seed' else int(key[1:5]))
                row = after[(kind, key)]; sa = after.get(('seed', sn)); so = seeds[sn]
                norm = lambda t: ''.join(ch for ch in (t or '').lower() if ch.isalnum())
                for side, roles in (('known_text', ['known']), ('target_text', ['target1', 'target2'])):
                    if ids.get(roles[0]): continue
                    if norm(row[side]) != norm((sa or so)[side]): continue   # this row's words differ from the seed's: keep its own clip
                    if sa and sa[side] != so[side]:
                        for r_ in roles: ids[r_] = clip(c, r_, sa[side])
                    else:
                        for r_ in roles: ids[r_] = so[{'known': 'ka', 'target1': 't1', 'target2': 't2'}[r_]]
        for slot, aid in ids.items():
            if not aid: gaps.append(f'{c} {kind} {key} {slot}: no clip'); continue
            o = {'op': 'audio.link', 'target': kind, 'slot': slot, 'audio_id': aid}
            o[{'seed': 'seed_number', 'lego': 'lego_id', 'phrase': 'phrase_id'}[kind]] = key if kind == 'lego' else (f'{c}:{key}' if kind == 'phrase' else key)
            links.append(o)
    json.dump({'ops': ops + links}, open(f'{HERE}/batches/{c}.json', 'w'), ensure_ascii=False, indent=1)
    print(c, len(ops), 'text ops', len(links), 'links')
print('GAPS', gaps)
