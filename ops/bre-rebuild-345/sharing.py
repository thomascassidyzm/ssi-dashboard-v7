#!/usr/bin/env python3
"""Projected Breton sharing per known language, from the pilot (cs #345·AL). Judgement inputs are the two tables below;
everything else is counted from pilot-1-30.json and pairs-1-300.json.  usage: python3 -I sharing.py"""
import json, os, re
H = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(H + '/pilot-1-30.json')); pairs = json.load(open(H + '/pairs-1-300.json'))
norm = lambda s: re.sub(r'[.,?!]', '', s.lower()).strip()
# JUDGEMENT 1: where a Welsh- or Cornish-known course would take a BIGGER Breton chunk (seed -> new chunk(s), LEGOs it replaces)
BIGGER = {1: (["komz brezhoneg"], ['S0001L02', 'S0001L03']), 8: (["ar pezh a fell din lavarout"], ['S0008L03']),
          10: (["n'on ket sur hag-eñ", "e c'hallan"], ['S0010L01', 'S0010L02']), 15: (["fellout a ra din e komzfes"], ['S0015L02']),
          17: (["petra eo ar respont"], ['S0017L03', 'S0017L04']), 22: (["tud a gomz"], ['S0022L03', 'S0022L04']), 26: (["prest da vont kuit"], ['S0026L02', 'S0026L03'])}
# JUDGEMENT 2: seeds 1-300 whose proposed Breton follows the French where the English seed says something else; an English twin
# shares them only if its English prompt moves to match (K25: the known side moves)
ENG_DIVERGE = [12, 16, 26, 41, 73, 75, 94, 98, 118, 128, 132, 174, 198, 251, 270, 272, 284]
legos = [l for s in P for l in s['legos']]; rows = [(l['id'], p) for l in legos for p in l['build'] + l['use']]
replaced = {i for _, (_, ids) in BIGGER.items() for i in ids}
stay = moved = 0
for lid, p in rows:
    if lid not in replaced: stay += 1; continue
    chunks = BIGGER[int(lid[1:5])][0]
    if any((' ' + c + ' ') in (' ' + norm(p['target']) + ' ') for c in chunks): stay += 1
    else: moved += 1
n_l, n_p = len(legos), len(rows)
pilot_eng_div = [n for n in ENG_DIVERGE if n <= 30]
eng_rows_div = sum(len(l['build']) + len(l['use']) for s in P if s['n'] in pilot_eng_div for l in s['legos'])
out = {
 'method': "Unit = a Breton LEGO text or a Breton phrase text (what an artist records once). fra is the baseline. eng: a LEGO or phrase is shared unless its seed's Breton follows the French against the English seed (list ENG_DIVERGE, read by hand over all 300 proposals); 'if the English prompt moves' counts those as shared too. cym/cor: a LEGO is shared unless a Welsh/Cornish course would take a bigger chunk there (table BIGGER, judged per pilot seed); a phrase under a replaced LEGO is shared in place if it contains the bigger chunk, otherwise it keeps its Breton text but needs a new home LEGO. All eng/cym/cor figures are judgement: no such course exists.",
 'pilot': {'legos': n_l, 'phrases': n_p,
   'fra': {'lego_share': 1.0, 'phrase_share': 1.0},
   'eng': {'lego_share_if_english_prompt_moves': 1.0, 'phrase_share_if_english_prompt_moves': 1.0,
           'lego_share_if_english_seed_kept': round(1 - sum(len(s['legos']) for s in P if s['n'] in pilot_eng_div) / n_l, 3),
           'phrase_share_if_english_seed_kept': round(1 - eng_rows_div / n_p, 3), 'diverging_pilot_seeds': pilot_eng_div},
   'cym': {'lego_share': round(1 - len(replaced) / n_l, 3), 'legos_replaced_by_bigger_chunks': len(replaced), 'phrase_text_share': 1.0,
           'phrases_shared_in_place': stay, 'phrases_needing_a_new_home_lego': moved, 'phrase_share_in_place': round(stay / n_p, 3)},
   'cor': 'same figures as cym: no evidence separates them; Cornish is the closer relative, so if anything it shares more'},
 'extrapolated_1_300': {
   'basis': 'pilot rates applied to the whole course; the old course has 596 new LEGOs over 300 seeds and the pilot runs 3.2 LEGOs a seed against its 2.6 for seeds 1-100, so the rebuilt course is projected at about 650 to 750 LEGOs and 5,000 to 5,600 phrases',
   'eng': {'seeds_where_breton_follows_french_against_english': len(ENG_DIVERGE), 'share_if_english_seed_kept': round(1 - len(ENG_DIVERGE) / 300, 3), 'share_if_english_prompt_moves': 1.0},
   'cym_cor': {'lego_share': round(1 - len(replaced) / n_l, 3), 'phrase_share_in_place': round(stay / n_p, 3), 'phrase_text_share': 1.0}},
}
json.dump(out, open(H + '/sharing.json', 'w'), ensure_ascii=False, indent=1); print(json.dumps(out['pilot'], ensure_ascii=False)); print(json.dumps(out['extrapolated_1_300'], ensure_ascii=False))
