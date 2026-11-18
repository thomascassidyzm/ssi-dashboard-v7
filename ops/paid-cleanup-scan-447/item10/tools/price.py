#!/usr/bin/env python3
"""item10 audio price (cs #739·AI). READ-ONLY, no network: reads plans/*.json "ops" and estimates the characters the
audio pass would render after an apply, UPPER BOUND (Popty's render route is library-first, so a clip that already exists
for the exact words costs 0 — this tool cannot see the library).
Rule per op: phrase.insert = known + 2*target (known voice + target1 + target2);
phrase.update = known if known_text changes, + 2*target if target_text changes; lego.update = same as phrase.update on
the LEGO's own slots, + the new known text again for its presentation intro if either side changes (intro wording is
rebuilt from it); seed.update = the changed side(s) the same way; deletes = 0.
usage: python3 -I price.py [course ...]   (default: every plan) -> prints a table, writes ../audio-price.json"""
import json, os, sys, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def cost(o):
    s, e = o.get('set', {}), o.get('expect', {})
    kc = 'known_text' in s and s['known_text'] != e.get('known_text')
    tc = 'target_text' in s and s['target_text'] != e.get('target_text')
    c = (len(s['known_text']) if kc else 0) + (2 * len(s['target_text']) if tc else 0)
    return c, kc, tc


def price(plan):
    t = {'insert': 0, 'update': 0, 'lego': 0, 'intro': 0, 'seed': 0, 'rows_new': 0, 'rows_changed': 0, 'rows_deleted': 0, 'legos_changed': 0}
    for o in plan.get('ops', []):
        op = o['op']
        if op == 'phrase.insert':
            r = o['row']; t['insert'] += len(r['known_text']) + 2 * len(r['target_text']); t['rows_new'] += 1
        elif op == 'phrase.update':
            c, kc, tc = cost(o); t['update'] += c; t['rows_changed'] += bool(kc or tc)
        elif op == 'phrase.delete':
            t['rows_deleted'] += 1
        elif op == 'lego.update':
            c, kc, tc = cost(o); t['lego'] += c
            if kc or tc:
                t['intro'] += len(o['set'].get('known_text') or o['expect'].get('known_text', '')) + 40; t['legos_changed'] += 1
        elif op == 'seed.update':
            t['seed'] += cost(o)[0]
    t['chars'] = t['insert'] + t['update'] + t['lego'] + t['intro'] + t['seed']
    return t


files = [os.path.join(ROOT, 'plans', f'{c}.json') for c in sys.argv[1:]] or sorted(glob.glob(os.path.join(ROOT, 'plans', '*.json')))
out, tot = {}, 0
for f in files:
    p = json.load(open(f)); c = p.get('course') or os.path.basename(f)[:-5]
    out[c] = price(p); tot += out[c]['chars']
    print(f"{c:22} chars≈{out[c]['chars']:>7}  new {out[c]['rows_new']:>4}  changed {out[c]['rows_changed']:>4}  del {out[c]['rows_deleted']:>4}  legos {out[c]['legos_changed']:>4}")
print('TOTAL chars ≈', tot, '(upper bound; library hits cost 0)')
if not sys.argv[1:]:
    json.dump({'note': 'upper bound, see tools/price.py docstring', 'total_chars': tot, 'courses': out}, open(os.path.join(ROOT, 'audio-price.json'), 'w'), indent=1)
