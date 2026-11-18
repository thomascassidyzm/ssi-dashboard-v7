#!/usr/bin/env python3
"""Romanisation for changed/new TARGET text (the edit door answers ROMAN_STALE without it). No network.
Courses whose rows carry target_text_roman (ara*, zho_for_eng, jpn_for_eng, kor_for_eng): run AFTER decisions/<course>.py,
BEFORE plan.py:      python3 -I item11/tools/mkroman.py <course>
 1. writes $CS_SCRATCH/baskets-<course>.json (rows with id + target_text_roman, from the QA-copy snapshot) — plan.py reads it;
 2. harvests the course's OWN word readings (rows whose target and roman have the same number of words; zho: item10's
    char lexicon) and writes decisions/<course>.json "roman": {new target text: roman} for every target text the
    decisions change or add (LEGO targets, rebuilt rows, add rows, extra ops). A hand value already in "roman" wins.
 3. prints every word it could NOT read from the course (marked ??) — supply those by hand in the decisions .py as
    ROMAN = {text: roman} (dumped under "roman"), then re-run. Read the printed lines back by hand (R0.13)."""
import json, os, re, sys, collections, unicodedata
HERE = os.path.dirname(os.path.abspath(__file__)); FAM = os.path.dirname(HERE); P = os.path.dirname(FAM)
course = sys.argv[1]; S = os.environ['CS_SCRATCH']
sn = json.load(open(f'{S}/snap/{course}.json'))
B = collections.defaultdict(list)
for p in sn['phrases']:
    B[f"S{p['seed_number']:04d}L{p['lego_index']:02d}"].append({'id': p['id'], 'target_text_roman': p.get('target_text_roman')})
json.dump(B, open(f'{S}/baskets-{course}.json', 'w'), ensure_ascii=False)
PUN = r"[\.,!?¿¡;:\"“”«»。，！？、；：（）()\[\]…—–؟،]+"
def toks(t): return [w for w in re.sub(PUN, ' ', unicodedata.normalize('NFC', t or '')).split() if w]
W = collections.defaultdict(collections.Counter)
for p in sn['phrases'] + sn['seeds']:
    a, b = toks(p.get('target_text')), toks((p.get('target_text_roman') or '').lower())
    if a and len(a) == len(b):
        for x, y in zip(a, b): W[x][y] += 1
zh = None
if course.startswith('zho'):
    sys.path.insert(0, os.path.join(P, '..', 'item10', 'tools'))
    import roman as zh
def rom(t):
    if zh:
        r, fl = zh.roman(course, t)
        return r, fl
    out, fl = [], []
    for w in toks(t):
        if w in W: out.append(W[w].most_common(1)[0][0])
        else: out.append('??' + w); fl.append(w)
    r = ' '.join(out)
    if re.search(r'[?？؟]\s*$', t): r += '?'
    return r, fl
df = os.path.join(FAM, 'decisions', f'{course}.json')
dec = json.load(open(df)); R = dec.get('roman', {}); texts = []
for d in dec['legos']:
    if d.get('target'): texts.append(d['target'])
    for v in (d.get('basket') or {}).values():
        if isinstance(v, list): texts.append(v[1])
    for a in d.get('add', []): texts.append(a[2])
    for e in d.get('extra', []):
        t = (e.get('row') or e.get('set') or {}).get('target_text')
        if t: texts.append(t)
bad = 0
for t in texts:
    if t in R: continue
    r, fl = rom(t)
    R[t] = r
    if fl: bad += 1
    print(('?? ' if fl else 'ok ') + t + ' -> ' + str(r) + (' | ' + '; '.join(fl) if fl else ''))
dec['roman'] = R
json.dump(dec, open(df, 'w'), ensure_ascii=False, indent=1)
print(course, len(texts), 'target texts,', bad, 'need a hand reading')
