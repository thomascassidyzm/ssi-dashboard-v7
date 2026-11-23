#!/usr/bin/env python3
"""cs #770·AK: build Popty edit-batch ops for Doug's settled word fixes in pdc_for_eng seeds 530-668.
Reads ONLY files fetched from Popty read routes (dir given as argv[1]): seeds.json (3471 /api/seeds),
ph_*.json (3471 /api/phrases), legos/<n>.json (3471 /api/legos), baskets/<lego>.json (3470 lego basket).
Writes ops.json (batches) and holds.json. Every op carries expect:{target_text: <live text>}."""
import json, glob, re, sys, os
D = sys.argv[1]; OUT = sys.argv[2]
WILL = re.compile(r"\bwill\b|'ll\b|won't", re.I)

def fam_rules():
    # (family, pattern, replacement-callable)
    return [
        ('A1 sette>sedde', r'\bsette\b', lambda m: 'sedde'),
        ('A2 schtill>ruhich', r'\bschtill\b', lambda m: 'ruhich'),
        ('A4 dieweil>deweil', r'\bdieweil\b', lambda m: 'deweil'),
        ('A4 verleicht>velleicht', r'\b([Vv])erleicht\b', lambda m: m.group(1) + 'elleicht'),
        ('A4 krank>grank', r'\b([Kk])rank\b', lambda m: ('G' if m.group(1) == 'K' else 'g') + 'rank'),
        ('A4 Kupp>Koppche', r'\bKupp\b', lambda m: 'Koppche'),
        ('A4 gleddere>graddle', r'\bgleddere\b', lambda m: 'graddle'),
        ('A4 Excuse>Ausrett', r'\bExcuse\b', lambda m: 'Ausrett'),
        ("A4 will's>will es", r"\bwill's\b", lambda m: 'will es'),
        ('A4 nei Bett>neies Bett', r'\bnei Bett\b', lambda m: 'neies Bett'),
        ('A4 traue>verdraue', r'\btraue\b', lambda m: 'verdraue'),
        # Feierdaage is plural: Doug writes "vun de Feierdaage" (S0477); "der Vacation" takes the plural article with it.
        ('A4 Vacation>Feierdaage', r'\bder Vacation\b', lambda m: 'de Feierdaage'),
        ('A3 zeele>waerre (will only)', r'\bzeele\b', lambda m: 'waerre'),
    ]
RULES = fam_rules()
GUARD_ONLY = {'A4 Vacation>Feierdaage': r'\bVacation\b'}  # a Vacation not after "der" is held

def apply(text, known, holds_ctx):
    fams = []; new = text
    for fam, rx, rep in RULES:
        if fam.startswith('A3') and re.search(rx, new) and not WILL.search(known or ''):
            continue  # zeele = "count" here
        if fam in GUARD_ONLY and re.search(GUARD_ONLY[fam], new) and not re.search(rx, new):
            holds_ctx.append((fam, 'Vacation not preceded by "der": article unknown')); continue
        if re.search(rx, new):
            new = re.sub(rx, rep, new); fams.append(fam)
    return new, fams

norm = lambda s: re.sub(r'\s+', ' ', re.sub(r"[^\w' -]", ' ', (s or '').lower())).strip()
def holds_lego(lego_text, text):
    # A LEGO tiles onto a phrase when its words appear in the phrase IN ORDER; gapped frames
    # ("dihr zeele nau kenne geh" under LEGO "dihr zeele kenne geh") are legitimate.
    want, have = norm(lego_text).split(), norm(text).split()
    i = 0
    for w in have:
        if i < len(want) and w == want[i]: i += 1
    return i == len(want)

seeds = {s['seed_number']: s for s in json.load(open(f'{D}/seeds.json'))['seeds']}
legos = {}
for f in glob.glob(f'{D}/legos/*.json'):
    for l in json.load(open(f)).get('legos', []): legos[l['lego_id']] = l
rows = {}
for f in glob.glob(f'{D}/baskets/*.json'):
    for p in json.load(open(f))['phrases']: rows[p['id']] = p
ph = []
for f in sorted(glob.glob(f'{D}/ph_*.json')): ph += json.load(open(f))['phrases']

ops, holds, lego_new = [], [], {}
# LEGOs first (their new text is what phrases must contain)
for lid, l in sorted(legos.items()):
    if not (530 <= l['seed_number'] <= 668): continue
    hc = []
    new, fams = apply(l['target_text'], l['known_text'], hc)
    comps = l.get('components') or []
    ncomps = []
    for c in comps:
        ct, cf = apply(c['target'], c['known'], hc)
        ncomps.append({**c, 'target': ct}); fams += [x for x in cf if x not in fams]
    for h in hc: holds.append({'row': lid, 'family': h[0], 'reason': h[1]})
    if fams:
        set_ = {'target_text': new}
        if ncomps != comps: set_['components'] = ncomps
        ops.append({'op': 'lego.update', 'lego_id': lid, 'set': set_, 'expect': {'target_text': l['target_text']},
                    '_fam': fams, '_seed': l['seed_number'], '_before': l['target_text']})
        lego_new[lid] = new
for n, s in sorted(seeds.items()):
    hc = []
    new, fams = apply(s['target_text'], s['known_text'], hc)
    for h in hc: holds.append({'row': f'seed {n}', 'family': h[0], 'reason': h[1]})
    if fams:
        # seed must still contain every one of its LEGOs (post-change)
        bad = [lid for lid, l in legos.items() if l['seed_number'] == n and not holds_lego(lego_new.get(lid, l['target_text']), new)]
        if bad: holds.append({'row': f'seed {n}', 'family': fams, 'reason': f'seed would not contain LEGO(s) {bad}'}); continue
        ops.append({'op': 'seed.update', 'seed_number': n, 'set': {'target_text': new}, 'expect': {'target_text': s['target_text']},
                    '_fam': fams, '_seed': n, '_before': s['target_text']})
for p in ph:
    hc = []
    new, fams = apply(p['target_text'], p['known_text'], hc)
    for h in hc: holds.append({'row': p['id'], 'family': h[0], 'reason': h[1]})
    if not fams: continue
    full = rows.get(p['id'])
    if not full or full['target_text'] != p['target_text']:
        holds.append({'row': p['id'], 'family': fams, 'reason': 'basket read disagrees with phrase read (drift)'}); continue
    if full.get('decomposition'):
        holds.append({'row': p['id'], 'family': fams, 'reason': 'phrase carries tiles; not handled here'}); continue
    lid = p['id'].split(':')[1][:8]
    if p['phrase_role'] != 'component':
        l = legos.get(lid)
        if not l: holds.append({'row': p['id'], 'family': fams, 'reason': f'own LEGO {lid} not read'}); continue
        if not holds_lego(l['target_text'], p['target_text']):
            holds.append({'row': p['id'], 'family': fams, 'reason': f'pre-existing: does not contain its LEGO "{l["target_text"]}"'}); continue
        if not holds_lego(lego_new.get(lid, l['target_text']), new):
            holds.append({'row': p['id'], 'family': fams, 'reason': f'after change would not contain its LEGO'}); continue
    audio = {c: full.get(c) for c in ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id'] if full.get(c)}
    ops.append({'op': 'phrase.update', 'phrase_id': p['id'], 'set': {'target_text': new}, 'expect': {'target_text': p['target_text']},
                '_fam': fams, '_seed': p['seed_number'], '_before': p['target_text'], '_audio': audio})

# batches: by the row's first family group; LEGO + its seed + its basket go together
def group(op):
    f = op['_fam'][0]
    if f.startswith('A1'): return '1-A1'
    if f.startswith('A2'): return '2-A2'
    if f.startswith('A3'): return '5-A3'
    if any(k in f for k in ['dieweil', 'verleicht', 'krank', 'Kupp', 'gleddere']): return '3-A4a'
    return '4-A4b'
batches = {}
for o in ops: batches.setdefault(group(o), []).append(o)
json.dump({'batches': dict(sorted(batches.items())), 'holds': holds}, open(OUT, 'w'), ensure_ascii=False, indent=1)
from collections import Counter
fc = Counter(f for o in ops for f in o['_fam'])
for k, v in sorted(batches.items()): print(k, len(v))
print('per family rows:', dict(fc)); print('holds:', len(holds))
for h in holds: print('  HOLD', h)
