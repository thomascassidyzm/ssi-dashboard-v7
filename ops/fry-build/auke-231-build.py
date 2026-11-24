# cs #231 (24 Nov 2026): texts for Kai's two 24 Nov rulings on #180·AL's held items (fry_for_eng).
# ITEM 1 (Kai Y, 16:48Z): "it is fun" = Auke's "it is moai", replacing "it is wol moai om te dwaan" everywhere it is
#   taught or used: seed 64, LEGO S0064L03 (components it is + moai; C02 wol / C04 om te dwaan deleted), its basket,
#   S0151L02U01, and (O12: every phrase using the old chunk, else wol/om te dwaan go untaught, P1) S0067L02U05,
#   S0098L01U04, S0115L02U06. English unchanged on every row. S0206L01 (ik fyn it moai = I like) needs nothing.
# ITEM 2 (Kai "B is good", 16:53Z): S0234L02B02 -> "I met someone and he's my friend | ik haw ien moete en hy is myn freon".
#   The brief's before-value was "se is myn freondinne"; live has been "she's my friend | se is myn freon" since
#   17 Nov (event 0735bde9). Pre-check mismatch -> HELD (Kai's 19 Nov apply rule), not written here.
# Reads live through Popty, writes auke-231-item1-texts.json in the auke-24nov-apply.py shape. No database access.
import json, os, sys, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
d = json.load(urllib.request.urlopen('http://localhost:3470/api/production/fry_for_eng/seeds'))
L = {}
for s in d['seeds']:
    L[f"SEED{s['seed_number']}"] = (s['known_text'], s['target_text'])
    for l in s['legos']:
        L['LEGO:' + l['lego_id']] = (l['known_text'], l['target_text'])
        for p in l['basket_phrases']:
            L[p['id'].split(':')[-1]] = (p['known_text'], p['target_text'])
OLD, NEW = 'it is wol moai om te dwaan', 'it is moai'
rows = []
for key, (k, t) in sorted(L.items()):
    if OLD not in t: continue
    if 'it is fun' not in k: sys.exit(f'{key}: old chunk without "it is fun": {k!r}')
    r = {'key': key, 'old': [k, t], 'new': [k, t.replace(OLD, NEW)], 'why': 'item 1: it is fun = it is moai (Auke, Kai Y 24 Nov)'}
    if key == 'LEGO:S0064L03':
        r['components'] = [{'known': 'it is', 'target': 'it is'}, {'known': 'nice', 'target': 'moai'}]
    rows.append(r)
for key in ['S0064L03C02', 'S0064L03C04']:
    rows.append({'key': key, 'old': list(L[key]), 'new': 'DELETE', 'why': 'item 1: component no longer in the LEGO'})
want = {'SEED64', 'LEGO:S0064L03', 'S0151L02U01', 'S0067L02U05', 'S0098L01U04', 'S0115L02U06'} | {f'S0064L03{x}' for x in
        ['B01', 'B02', 'B03', 'U01', 'U02', 'U03', 'U04', 'U05', 'C02', 'C04']}
got = {r['key'] for r in rows}
if got != want: sys.exit(f'scope drift: extra {got - want}, missing {want - got}')
json.dump({'family': 'item1', 'rows': rows}, open(os.path.join(HERE, 'auke-231-item1-texts.json'), 'w'), ensure_ascii=False, indent=1)
print('item1', len(rows))
