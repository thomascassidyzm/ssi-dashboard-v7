#!/usr/bin/env python3
"""ara_lb_for_eng item-11 decisions (basket does not drill its own LEGO), hand-authored per LEGO. PLAN ONLY.
Writes ara_lb_for_eng.json for tools/plan.py. Verdicts: recut-small (LEGO shrinks to the piece its basket drills) ·
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


P17 = 'Rule: every practice phrase under a LEGO contains the whole LEGO, in exactly the taught form.'
THIN = 'The builder wants 3 build rows that put the LEGO inside a phrase and 5 use rows; this basket was short once its broken rows were fixed, so rows are added from words already taught.'

# ---- seed 77 "I'm surprised at how quickly I'm starting to understand | مندهش كيف صرت أفهم بسرعة"
D('S0077L02', 'keep',
  why='ALREADY-FIXED: the scan named two rows that said بلشت (B03, U04) under this LEGO; another cleanup job deleted both after 18:45Z on 18 Nov (re-read live 19 Nov 11:38Z), so every remaining row holds the LEGO. Nothing to do for this family. The basket is now short for the builder (2 builds that put the LEGO in a phrase, 4 uses) and is owed a back-fill by the job that deleted the rows.')

# ---- seed 78 "I don't understand what you said | ما فهمت شو قلت"
D('S0078L01', 'rebuild-rows', ack=['known'],
  why=P17 + ' The seed sentence was changed to ما فهمت شو قلت, but its copy in this basket (U01) still says the old مش فاهم, which does not hold the LEGO "I understood | فهمت". U01 is brought to the seed\'s live words (its English is the seed\'s own, "I don\'t understand", which is why it does not literally say "I understood"). ' + THIN,
  b={'U01': ("I don't understand what you said", 'ما فهمت شو قلت'), 'B01': 'k'},
  add=[('b', 'I understood now', 'فهمت هلق'), ('b', 'I understood more', 'فهمت أكتر')])

# ---- seed 83 "I agree with what you said about your friend"
D('S0083L01', 'rebuild-rows',
  why=P17 + ' One row says من ("surprised FROM what happened", which is the natural Lebanese after مندهش) under the LEGO "about | عن". Forcing عن into that sentence would be unnatural, so the row is replaced by one where عن is the natural word.',
  b={'U03': ('I want to know about what happened', 'بدي أعرف عن شو صار')},
  add=[('u', 'I want to know more about what happened', 'بدي أعرف أكتر عن شو صار')])

# ---- seed 90 "If you can speak more slowly that would be great | إذا فيك تحكي بشوي أكتر كان أحلى"
D('S0090L01', 'kai',
  why='HOLD: KAI: the seed and its LEGO disagree, and no row fix is safe until one of them moves. The seed\'s Lebanese now ends كان أحلى; the LEGO is "nicer | بيكون أحلى" and the seed\'s own copy in the basket (U01) still says بيكون أحلى. Four rows drill أحلى alone or كان أحلى. Evidence: in Lebanese the b- form بيكون is the ordinary "it will/would be" after an open "if you can…" condition, while كان أحلى reads as past ("it was / would have been nicer"), so the likely right fix is the SEED back to بيكون أحلى (a seed edit, your call), after which the LEGO is the seed\'s words again and only B01, B03, U02, U04 need rewording to say بيكون أحلى. The LEGO\'s English "nicer" also does not match the seed\'s "that would be great".')

# ---- seed 94 "This is the only way it will work | هيدا هو الطريق الوحيد اللي رح يشتغل"
D('S0094L03', 'kai',
  why='HOLD: KAI: the LEGO was changed to "the way | الطريقة" but the seed still says الطريق and all 7 rows say الطريق. The scan expected a seed fix to الطريقة (the usual Lebanese word for "way = method"; الطريق is "road") that has not landed. If the seed becomes الطريقة الوحيدة اللي رح تشتغل, all 7 rows change الطريق → الطريقة with feminine agreement (اللي بتشتغل, منيحة); if the seed stays, the LEGO goes back to الطريق and nothing else moves (zero audio). Note "a method | الطريقة" is also a LEGO at seed 153.')

# ---- seed 98 "I should consider playing something else | لازم أفكر بشي تاني ألعبو"
D('S0098L01', 'rebuild-rows', ack=['known'],
  why=P17 + ' Two rows do not say بشي at all ("something good | شي منيح", "I know it now | بعرفو هلق"); they are reworded onto the frame the basket already uses in U04 ("I\'m thinking of something"). SEPARATE PROBLEM, not fixed here: this LEGO\'s English is "in it", but بشي means "of/about something"; the English of every row under it is built on that wrong gloss. That is the "LEGO says what its seed does not" family, which has no plan for this course yet; the two reworded rows carry correct English and will read oddly beside "good in it | بشي منيح" until the gloss is fixed.',
  b={'U01': ("I'm thinking of something good", 'عم بفكر بشي منيح'),
     'U02': ("I'm thinking of something else", 'عم بفكر بشي تاني'), 'U03': 'k', 'U04': 'k'})

# ---- seed 126 "This work is changing the shape of my brain | هالشغل عم يغير شكل دماغي"
D('S0126L03', 'rebuild-rows', ack=['known'],
  why=P17 + ' Two rows say عم يتغير ("it is changing", by itself), a different verb form from the LEGO "he changes | يغير" (changes something). They are reworded to the taught form with the seed\'s own "shape".',
  b={'B03': ('he is changing shape', 'عم يغير شكل'), 'U02': ('he is changing shape now', 'عم يغير شكل هلق')})

# ---- seed 144 "I woke earlier than I wanted to this morning | صحيت أبكر مما كنت بدي هالصبح"
D('S0144L03', 'rebuild-rows', known='than', ack=['known'],
  why=P17 + ' One row says من اللي, another way to say "than what", under the LEGO مما; it is reworded to مما. ALSO: the LEGO\'s English is the broken text "th" (and its three build rows say "th", "earlier th", "more th"). That is damage, already there in last night\'s copy; the plan restores "than" on the LEGO and those rows, since the seed\'s own English is "earlier than". No other LEGO in the course is glossed "than".',
  b={'B01': 'k', 'B02': ('earlier than', 'أبكر مما'), 'B03': ('more than', 'أكتر مما'),
     'U02': ('I know more than what I need', 'بعرف أكتر مما بدي'), 'U01': 'k', 'U03': 'k', 'U04': 'k', 'U05': 'k'})

# ---- seed 145 "Why are you not happy any more? | ليش مش مبسوط بعد؟"
D('S0145L01', 'rebuild-rows', ack=['known'],
  why=P17 + ' One build row says "not happy now | مش مبسوط هلق" and drops the LEGO\'s بعد ("anymore"); it is reworded to hold the whole LEGO.',
  b={'B03': ('not happy anymore here', 'مش مبسوط بعد هون'), 'U01': 'k', 'U05': 'k'})

# ---- second pass after the builder validator: one row added where a basket was still short of 3 builds / 5 uses
def ADD(id, *rows):
    d = next(x for x in OUT if x['id'] == id)
    d.setdefault('add', []).extend([list(r) for r in rows])
    if THIN not in d['why']:
        d['why'] += ' ' + THIN


ADD('S0083L01', ('b', 'more about this', 'أكتر عن هيك'))
ADD('S0126L03', ('b', 'he changes shape here', 'يغير شكل هون'))
ADD('S0144L03', ('b', 'more than I want', 'أكتر مما بدي'))
ADD('S0145L01', ('b', 'not happy anymore now', 'مش مبسوط بعد هلق'))
next(x for x in OUT if x['id'] == 'S0126L03')['basket']['U01'] = ['he changes shape a lot here', 'يغير شكل كتير هون']
next(x for x in OUT if x['id'] == 'S0126L03')['why'] += ' U01 said الشكل ("the shape"), a form not taught by this seed (the LEGO is شكل), and is reworded too.'
next(x for x in OUT if x['id'] == 'S0098L01')['why'] += ' The basket stays one build row short for the builder; no row is added while the English gloss is wrong.'

json.dump({'course': 'ara_lb_for_eng', 'legos': OUT}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ara_lb_for_eng.json'), 'w'), ensure_ascii=False, indent=1)
print(len(OUT), 'decisions')
