#!/usr/bin/env python3
"""cym_for_kor reuse (cs #232): band table + option costs from match.cjs output. Offline.

  python3 ops/cym-for-kor/reuse/bands.py <match.json> <cym_nv2_for_eng.json> [target_per_new_lego]

Target default = source S1001-S1668 build/use phrases per NEW LEGO (only new LEGOs are played, P25).
"""
import json, sys, math
from collections import Counter

BANDS = [(1, 100), (101, 200), (201, 300), (301, 467), (468, 668)]
VOICES = 2  # target1 + target2


def norm(t):
    import re
    return ' '.join(re.sub(r'[.,!?;:]+', ' ', t.replace('’', "'").replace('‘', "'").lower()).split())


m = json.load(open(sys.argv[1]))
src = json.load(open(sys.argv[2]))['seeds']

# every voiced Welsh text (t1+t2 ids) anywhere in the source course: a generated phrase with that text
# can link an existing clip even if the phrase itself could not be placed as a reuse.
voiced = {}
for s in src:
    for l in s['legos']:
        for p in l['basket_phrases']:
            if p.get('target1_audio_id') and p.get('target2_audio_id'):
                voiced[norm(p['target_text'])] = True
        if l.get('target1_audio_id') and l.get('target2_audio_id'):
            voiced[norm(l['target_text'])] = True
    if s.get('target1_audio_id') and s.get('target2_audio_id'):
        voiced[norm(s['target_text'])] = True

hc = [s for s in src if 1001 <= s['seed_number'] <= 1668]
hc_new = sum(1 for s in hc for l in s['legos'] if l['is_new'])
hc_ph = sum(1 for s in hc for l in s['legos'] for p in l['basket_phrases'] if p['phrase_role'] in ('build', 'use'))
TARGET = float(sys.argv[3]) if len(sys.argv) > 3 else hc_ph / hc_new
T = math.ceil(TARGET - 1e-9)  # whole phrases per basket

new = [l for l in m['legos'] if l['is_new']]
band = lambda n: next(f'{a}-{b}' for a, b in BANDS if a <= n <= b)
rows = {f'{a}-{b}': Counter() for a, b in BANDS}
opt = {k: Counter() for k in 'abc'}
optb = {k: {f'{a}-{b}': Counter() for a, b in BANDS} for k in 'abc'}
drift = Counter()

for l in new:
    B = band(l['seed'])
    r = rows[B]
    reuse = l['reuse']
    gen = l['gen']
    gk = {g['k'] for g in gen}
    rk = {x['k'] for x in reuse}
    r['legos'] += 1
    r['gen'] += len(gen)
    r['gen_eq_reuse'] += sum(1 for g in gen if g['k'] in rk)
    r['gen_voiced_anywhere'] += sum(1 for g in gen if g['k'] in voiced)
    r['reuse'] += len(reuse)
    r['reuse_hc'] += sum(1 for x in reuse if x['pool'] == 'hc')
    r['reuse_old'] += sum(1 for x in reuse if x['pool'] == 'old')
    r['reuse_t12'] += sum(1 for x in reuse if x['t12'])
    r['reuse_t12_hc'] += sum(1 for x in reuse if x['t12'] and x['pool'] == 'hc')
    r['reuse_build'] += sum(1 for x in reuse if x['role'] == 'build')
    for x in reuse:
        if x['pool'] == 'hc':
            d = l['seed'] - x['srcSeed']
            drift['same seed' if d == 0 else ('earlier in kor' if d < 0 else 'later in kor')] += 1
    voiced_reuse = [x for x in reuse if x['t12']]
    unvoiced_reuse = [x for x in reuse if not x['t12']]
    if len(voiced_reuse) >= T:
        r['full_from_voiced_reuse'] += 1
    # generated phrases that need NEW Welsh audio = not identical to any voiced source text
    gen_new = [g for g in gen if g['k'] not in voiced]
    gen_free = [g for g in gen if g['k'] in voiced]

    def charge(o, phrases_new, kept_free, kept_reuse, short, ko=0):
        for C in (opt[o], optb[o][B]):
            C['phrases'] += kept_free + kept_reuse + len(phrases_new)
            C['free'] += kept_free + kept_reuse
            C['new_phrases'] += len(phrases_new)
            C['chars'] += sum(len(t) for t in phrases_new) * VOICES
            C['short_baskets'] += 1 if short > 0 else 0
            C['short_by'] += short
            C['korean_prompts_to_write'] += ko

    # (a) source rebuild: voiced reusable source first, then unvoiced reusable source, top up with
    #     generated (not already in the basket) only to T.
    basket_free = len(voiced_reuse)
    need = max(0, T - basket_free)
    rec = [x['text'] for x in unvoiced_reuse][:need]
    need -= len(rec)
    topup = [g['text'] for g in gen if g['k'] not in rk and g['k'] not in voiced][:need]
    free_top = [g for g in gen if g['k'] not in rk and g['k'] in voiced][:max(0, need - len(topup))]
    need -= len(topup) + len(free_top)
    charge('a', rec + topup, basket_free + len(free_top), 0, max(0, need), ko=basket_free + len(rec))
    # (b) keep the generated basket exactly as it is.
    charge('b', [g['text'] for g in gen_new], len(gen_free), 0, max(0, T - len(gen)))
    # (c) hybrid: keep the basket at its CURRENT size (or T if larger): voiced reusable source first,
    #     generated phrases that already have a voiced clip, then generated, then unvoiced source.
    size = max(len(gen), T)
    free = len(voiced_reuse)
    free += len([g for g in gen_free if g['k'] not in rk][:max(0, size - free)])
    need = max(0, size - free)
    take = [g['text'] for g in gen_new if g['k'] not in rk][:need]
    need -= len(take)
    take += [x['text'] for x in unvoiced_reuse][:need]
    need = max(0, size - free - len(take))
    n_unv = max(0, len(take) - len([g for g in gen_new if g['k'] not in rk][:max(0, size - free)]))
    charge('c', take, min(free, size), 0, need, ko=len(voiced_reuse) + n_unv)

tot = Counter()
for B in rows:
    tot.update(rows[B])

out = {'target_per_new_lego': TARGET, 'T': T, 'hc_new_legos': hc_new, 'hc_phrases': hc_ph,
       'bands': rows, 'total': tot, 'options': opt, 'options_by_band': optb, 'drift': drift,
       'unplaced': Counter(f"{u['pool']}|t12={u['t12']}" for u in m['unplaced']), 'unplaced_n': len(m['unplaced']),
       'placed_n': sum(len(l['reuse']) for l in m['legos']), 'srcDistinct': m['srcDistinct'],
       'genVocabFails': len(m['genVocabFails']), 'voiced_texts': len(voiced)}
print(json.dumps(out, indent=1, default=lambda c: dict(c)))
