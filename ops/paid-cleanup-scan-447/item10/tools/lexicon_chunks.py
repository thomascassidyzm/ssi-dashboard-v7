#!/usr/bin/env python3
"""Romanisation lexicon for jpn/kor courses (cs #808·AI): every (target_text -> target_text_roman) pair the course itself
already carries, harvested from $CS_SCRATCH/baskets-<course>.json (tools/baskets.py --all). roman.py tiles NEW target text
with these chunks (longest first) and joins their readings with spaces; anything it cannot tile is flagged for a hand
reading (decisions ROMAN override). Writes lexicon/lex-<course>.json {"chunks": {target: roman}}.
usage: python3 -I lexicon_chunks.py <course>"""
import json, os, re, sys, collections
course = sys.argv[1]
B = json.load(open(os.path.join(os.environ['CS_SCRATCH'], f'baskets-{course}.json')))
PUNCT = re.compile(r'[\s、。，,！!？?「」…\.]+')
votes = collections.defaultdict(collections.Counter)
for ph in B.values():
    for p in ph or []:
        t, r = (p.get('target_text') or ''), (p.get('target_text_roman') or '')
        t2 = PUNCT.sub('', t)
        r2 = re.sub(r'[\.,!?、。？！]+', ' ', r).strip().lower()
        r2 = re.sub(r'\s+', ' ', r2)
        if t2 and r2:
            votes[t2][r2] += 1
chunks = {t: c.most_common(1)[0][0] for t, c in votes.items()}
out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lexicon', f'lex-{course}.json')
json.dump({'chunks': chunks}, open(out, 'w'), ensure_ascii=False, indent=0)
print(course, len(chunks), 'chunks ->', out)
