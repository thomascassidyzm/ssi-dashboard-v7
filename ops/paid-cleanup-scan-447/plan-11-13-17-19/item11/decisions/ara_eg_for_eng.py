#!/usr/bin/env python3
"""ara_eg_for_eng item-11 decisions (basket does not drill its own LEGO), hand-authored per LEGO. PLAN ONLY.
Writes ara_eg_for_eng.json for tools/plan.py. Verdicts: recut-small (LEGO shrinks to the piece its basket drills) ·
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

SEEDCOPY = ' The row is the seed sentence, still in the wording the seed had before it was changed; it is brought to the seed\'s live words, English unchanged.'
# ---- seed 65 "It's important to take time to test yourself | مهم إنك تاخد وقت تختبر نفسك"
D('S0065L03', 'rebuild-rows',
  why=P17 + ' Two rows use the noun الاختبار / اختبار ("testing"), never taught, under the verb LEGO "test | تختبر". Both are reworded to the verb.',
  b={'U05': ("it's useful to test", 'مفيد تختبر'), 'U06': ("it's important to test more", 'مهم إنك تختبر أكتر')})
# ---- seed 105 "That is why he didn't know the answer | ده السبب ليه ماكانش عارف الإجابة"
D('S0105L01', 'rebuild-rows', ack=['known'],
  why=P17 + ' Two rows say علشان كده ("that is why"), the seed\'s OLD wording, under the LEGO "the reason | السبب".' + SEEDCOPY + ' U01 becomes the seed\'s opening "that is why | ده السبب ليه". Their English is the seed\'s own ("that is why"), which is why it does not literally say "the reason".',
  b={'U01': ('that is why', 'ده السبب ليه'), 'U05': ("that is why he didn't know the answer", 'ده السبب ليه ماكانش عارف الإجابة')})
# ---- seed 110 "We're friends, and after we finish I'd like to relax | إحنا أصحاب، و بعد ما نخلص أنا حابب نرتاح"
D('S0110L03', 'rebuild-rows', ack=['known'],
  why=P17 + ' One row says أرتاح ("I relax") under the LEGO "we relax | نرتاح", a different verb form. It is reworded to the seed\'s own ending, which says نرتاح (the seed\'s English there is "I\'d like to relax"). One use row is added to reach five.',
  b={'U03': ("after we finish I'd like to relax", 'بعد ما نخلص أنا حابب نرتاح')},
  add=[('u', 'we relax here today', 'نرتاح هنا النهارده')])
# ---- seed 124 "I thought that was a good idea | أنا فكرت إن دي فكرة كويسة"
D('S0124L01', 'rebuild-rows',
  why=P17 + ' Two rows say افتكرت (a different verb: "remembered / reckoned") under the LEGO "I thought | فكرت".' + SEEDCOPY + ' The other row takes فكرت in the same sentence.',
  b={'U01': ('I thought it was good', 'فكرت إنه كويس'), 'U05': ('I thought that was a good idea', 'أنا فكرت إن دي فكرة كويسة')})
# ---- seed 133 "You get to know someone very well when you work together"
D('S0133L04', 'rebuild-rows', ack=['known'],
  why=P17 + ' One row is "get to know him | تتعرف عليه", which belongs to another LEGO and has no معاه ("with him"); it is replaced by a phrase that holds the LEGO.',
  b={'U03': ('you work with him today', 'تشتغل معاه النهارده')})
# ---- seed 143 "It's the same thing as we were talking about earlier"
D('S0143L01', 'kai',
  why='HOLD: this LEGO "same | نفس" is an exact copy, both sides, of the earlier LEGO S0062L03, so it belongs to the duplicate-LEGO plan: a LEGO is introduced once and the later copy becomes not-new, whose basket is never played. The one bad row here (U05 "same as before | زي قبل كده", which has no نفس) goes with that decision; if the LEGO is kept as new instead, U05 is reworded to hold نفس.')
# ---- seed 150 "Can you tell me what your name is? | ممكن تقول لي اسمك إيه؟"
D('S0150L01', 'rebuild-rows', ack=['known'],
  why=P17 + ' One row says "can you | تقدر", a different word, under the LEGO "may | ممكن". It is replaced by a ممكن phrase. (U03 and U05 hold ممكن with the English "can", the seed\'s own word for it, and stay.)',
  b={'U01': ('may I speak', 'ممكن أتكلم'), 'U03': 'k', 'U05': 'k'})

# ---- second pass after the builder validator: one row added where a basket was still short of 3 builds / 5 uses
def ADD(id, *rows):
    d = next(x for x in OUT if x['id'] == id)
    d.setdefault('add', []).extend([list(r) for r in rows])
    if THIN not in d['why']:
        d['why'] += ' ' + THIN


ADD('S0065L03', ('b', "it's useful to test more", 'مفيد تختبر أكتر'))
ADD('S0110L03', ('u', 'after we finish we relax', 'بعد ما نخلص نرتاح'))
ADD('S0124L01', ('b', 'I thought about it today', 'فكرت في ده النهارده'))
ADD('S0133L04', ('b', 'with him here today', 'معاه هنا النهارده'))
ADD('S0150L01', ('b', 'may I speak today', 'ممكن أتكلم النهارده'))
ADD('S0150L01', ('u', 'may I try today', 'ممكن أحاول النهارده'))
next(x for x in OUT if x['id'] == 'S0150L01')['basket']['U02'] = ['may I speak here', 'ممكن أتكلم هنا']
next(x for x in OUT if x['id'] == 'S0150L01')['why'] += ' U02 "may I | ممكن" was the bare LEGO a second time (the builder counts it as a duplicate of B01) and becomes a phrase.'

json.dump({'course': 'ara_eg_for_eng', 'legos': OUT}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ara_eg_for_eng.json'), 'w'), ensure_ascii=False, indent=1)
print(len(OUT), 'decisions')
