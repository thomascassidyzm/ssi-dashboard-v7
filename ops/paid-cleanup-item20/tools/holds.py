#!/usr/bin/env python3
"""Baskets item 20 must NOT touch today (cs #718·AI): their LEGO, seed or rows belong to another cleanup job.
Inputs (tracked in ../inputs): scan447-other-families.json (the #447 slice rows for the five courses, minus the
bare-row/empty-audio/female-voice families, which are row-level and do not move a basket), item10-recount.json
(#714's item-10 plan), and every phrase/LEGO id in ../../paid-cleanup-item4/<course> (#700·AI item 4).
Writes ../<course>/collide.json (LEGO ids) and ../<course>/holds.json (id -> reasons).
usage: holds.py <course>"""
import json, os, re, sys, glob
c = sys.argv[1]; H = os.path.dirname(os.path.abspath(__file__)); I = os.path.join(H, '..', 'inputs')
SKIP_LEGO = ('LEGO English not in its seed', 'LEGO over 8 syllables', 'gapped LEGO', 'one prompt, two answers', 'same pair taught as NEW twice',
             'not-new LEGO', 'broken LEGO English', 'known-side', 'duplicate row in one basket', 'phrase does not contain its LEGO',
             'target word used before it is taught', 'filler tag', 'tag-glue', "'in English' tag", 'question on one side only')
SKIP_SEED = ('seed with no LEGO at all', 'seed word no LEGO teaches')
holds = {}
def hold(k, why): holds.setdefault(k, set()).add(why)
lego = lambda rid: (re.match(r'(S\d{4}L\d{2})', rid or '') or [None])[0] if re.match(r'S\d{4}L\d{2}', rid or '') else None
for r in json.load(open(os.path.join(I, 'scan447-other-families.json'))):
    if r['course'] != c: continue
    rid = r.get('row_id') or r.get('row') or ''
    fam = r.get('family', '')
    if fam.startswith(SKIP_LEGO) and lego(rid): hold(lego(rid), '#447 ' + fam[:50])
    elif fam.startswith(SKIP_SEED):
        m = re.match(r'S(\d{4})', rid); 
        if m: hold('SEED' + m.group(1), '#447 ' + fam[:50])
rc = json.load(open(os.path.join(I, 'item10-recount.json')))
for r in rc.get('rows', []):
    if r.get('course') == c:
        rid = r.get('row_id') or r.get('lego_id') or r.get('row') or ''
        if lego(rid): hold(lego(rid), 'item 10 plan (#714)')
for f in glob.glob(os.path.join(H, '..', '..', 'paid-cleanup-item4', c, '**', '*.json'), recursive=True):
    for m in set(re.findall(r'S\d{4}L\d{2}', open(f).read())): hold(m, 'item 4 (#700·AI)')
out = os.path.join(H, '..', c); os.makedirs(out, exist_ok=True)
json.dump(sorted(holds), open(os.path.join(out, 'collide.json'), 'w'), indent=0)
json.dump({k: sorted(v) for k, v in sorted(holds.items())}, open(os.path.join(out, 'holds.json'), 'w'), ensure_ascii=False, indent=1)
print(c, 'held', len(holds))
