#!/usr/bin/env python3
"""cs #233 read-back: every touched seed as Popty serves it NOW; each planned update/insert must be present (exact known|target)
in its LEGO's basket, each deleted pair absent from it, each LEGO/seed edit visible. usage: python3 -I readback.py <dump> <plan>..."""
import json, re, sys, urllib.request
d = json.load(open(sys.argv[1])); P = {p['id']: p for p in d['phrases']}; L = {l['lego_id']: l for l in d['legos']}; S = {s['seed_number']: s for s in d['seeds']}
live = {}; bad = checks = 0
def basket(n, idx):
    if n not in live: live[n] = json.load(urllib.request.urlopen(f'http://localhost:3470/api/production/{d["course"]}/seed/{n}/baskets'))
    b = live[n]['baskets'].get(f'S{n:04d}L{idx:02d}') or {'practice_phrases': [], 'lego': {}}
    return b
for pf in sys.argv[2:]:
    plan = json.load(open(pf))
    for o in plan['ops']:
        checks += 1
        if o['op'] in ('phrase.update', 'phrase.delete'):
            p = P[o['phrase_id']]; b = basket(p['seed_number'], p['lego_index']); pairs = {(x['known'], x['target']) for x in b['practice_phrases']}
            want = (o.get('set', {}).get('known_text', p['known_text']), o.get('set', {}).get('target_text', p['target_text']))
            if o['op'] == 'phrase.update' and want not in pairs: bad += 1; print('MISSING', o['phrase_id'], want)
            if o['op'] == 'phrase.delete' and (p['known_text'], p['target_text']) in pairs:
                # still present only if another row carries the same pair
                if sum(1 for x in d['phrases'] if x['seed_number'] == p['seed_number'] and x['lego_index'] == p['lego_index'] and (x['known_text'], x['target_text']) == (p['known_text'], p['target_text'])) < 2:
                    bad += 1; print('NOT DELETED', o['phrase_id'])
        elif o['op'] == 'phrase.insert':
            r = o['row']; b = basket(r['seed_number'], r['lego_index'])
            if (r['known_text'], r['target_text']) not in {(x['known'], x['target']) for x in b['practice_phrases']}: bad += 1; print('MISSING insert', r['id'])
        elif o['op'] == 'lego.update':
            l = L[o['lego_id']]; b = basket(l['seed_number'], l['lego_index'])
            want = (o['set'].get('known_text', l['known_text']), o['set'].get('target_text', l['target_text']))
            if (b['lego'].get('known'), b['lego'].get('target')) != want: bad += 1; print('LEGO', o['lego_id'], b['lego'])
        elif o['op'] == 'seed.update':
            s = S[o['seed_number']]; basket(o['seed_number'], 1); sp = live[o['seed_number']]['seed_pair']
            want = (o['set'].get('known_text', s['known_text']), o['set'].get('target_text', s['target_text']))
            if (sp['known'], sp['target']) != want: bad += 1; print('SEED', o['seed_number'], sp)
print(len(live), 'seeds read live;', checks, 'ops checked;', bad, 'mismatches')
