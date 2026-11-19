#!/usr/bin/env python3
"""cs #784: Popty's edit door refuses a changed target on a row that carries a romanisation (ROMAN_STALE). This fills
target_text_roman on every planned op that sets/inserts a target, from the course's OWN readings: a word -> reading table
harvested from the QA-copy snapshot rows (space-separated tokens, used only when the token counts match). No network.
A word the course never spelled is listed under plan['roman_missing'] for a hand reading (decisions 'roman' map wins).
usage: python3 -I roman_fill.py <fam-dir> <course>"""
import json, os, sys, collections, re
HERE = os.path.dirname(os.path.abspath(__file__))
fam, course = sys.argv[1], sys.argv[2]
sn = json.load(open(os.path.join(os.environ['CS_SCRATCH'], 'snap', f'{course}.json')))
lex = collections.defaultdict(collections.Counter)
strip = lambda w: re.sub(r'[\.,!?。，！？…]+', '', w)
for p in sn['phrases']:
    t, r = p.get('target_text') or '', p.get('target_text_roman') or ''
    tw, rw = [strip(x) for x in t.split()], [strip(x) for x in r.split()]
    if r and len(tw) == len(rw):
        for a, b in zip(tw, rw):
            if a and b: lex[a][b.lower()] += 1
pf = os.path.join(HERE, '..', fam, 'plans', f'{course}.json')
plan = json.load(open(pf))
dec = json.load(open(os.path.join(HERE, '..', fam, 'decisions', f'{course}.json')))
ovr = dec.get('roman', {})
missing, n = set(), 0
def rom(text):
    if text in ovr: return ovr[text]
    out = []
    for w in text.split():
        k = strip(w)
        if not k: continue
        if k in ovr: out.append(ovr[k])
        elif k in lex: out.append(lex[k].most_common(1)[0][0])
        else: missing.add(k); out.append('?')
    return ' '.join(out)
if not lex:
    print(course, 'carries no romanisation: nothing to fill'); sys.exit(0)
for o in plan['ops']:
    tgt = o.get('set') if o['op'] in ('lego.update', 'phrase.update') else o.get('row') if o['op'] in ('phrase.insert', 'lego.insert') else None
    if tgt and 'target_text' in tgt:
        tgt['target_text_roman'] = rom(tgt['target_text']); n += 1
plan['roman_missing'] = sorted(missing)
json.dump(plan, open(pf, 'w'), ensure_ascii=False, indent=1)
print(course, 'romanised', n, 'targets; words with no reading in the course:', sorted(missing))
