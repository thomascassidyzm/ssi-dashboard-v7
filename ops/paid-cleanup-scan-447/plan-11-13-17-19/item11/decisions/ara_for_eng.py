#!/usr/bin/env python3
"""ara_for_eng item-11 decisions (basket does not drill its own LEGO), hand-authored per LEGO. PLAN ONLY.
Writes ara_for_eng.json for tools/plan.py. Verdicts: recut-small (LEGO shrinks to the piece its basket drills) ·
rebuild-rows (LEGO right; rows rewritten/deleted/back-filled) · keep (NOT-A-DEFECT or ALREADY-FIXED, said in why) ·
kai (HOLD, reason in why). Basket: 'k' keep, 'd' delete, (known, target) rebuild. add: ('b'|'u', known, target)."""
import json, os
OUT = []


def D(id, verdict, **kw):
    kw['id'] = id
    kw['verdict'] = verdict
    b = kw.pop('b', None)
    if b:
        kw['basket'] = {k: ('keep' if v == 'k' else 'del' if v == 'd' else list(v)) for k, v in b.items()}
    if 'comps' in kw:
        kw['components'] = kw.pop('comps')
    OUT.append(kw)


P17 = 'Every practice phrase under a LEGO contains the whole LEGO (P17).'

# ---- seed 109 "we must work hard to learn a lot of new words | … كَلِماتٍ جَديدَةً كَثيرَة"
D('S0109L02', 'rebuild-rows',
  why=P17 + ' The LEGO "new words | كَلِماتٍ جَديدَةً" is the seed\'s own words and 5 of 7 rows drill it; two rows use the singular كَلِمَةً جَديدَةً ("a new word"), a different form the seed does not say. Those two are reworded to the plural; nothing else moves.',
  b={'B01': ('new words in Arabic', 'كَلِماتٍ جَديدَةً بِالعَرَبِيَّةِ'),
     'U03': ('I want to learn new words in Arabic', 'أُريدُ أَنْ أَتَعَلَّمَ كَلِماتٍ جَديدَةً بِالعَرَبِيَّةِ')})

json.dump({'course': 'ara_for_eng', 'legos': OUT}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ara_for_eng.json'), 'w'), ensure_ascii=False, indent=1)
print(len(OUT), 'decisions')
