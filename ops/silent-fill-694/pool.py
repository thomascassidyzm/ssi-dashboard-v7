#!/usr/bin/env python3
"""READ-ONLY (cs #694·AI). For ara_eg_for_eng / ara_lb_for_eng empty known slots: does the same English already have a clip
on some other played slot in any dumped course (any voice)? Writes live/ara-candidates.json {phraseId: [clip ids]}.
Those slots are Kai's HELD set (the 575, words recorded only in another English voice) unless link-clip accepts one of the
candidates as the slot's own cast voice (then it is one of the ~11 free same-voice links). Slots with NO candidate are the
~92 to render. Popty's render route did not refuse these on a dry run (no EXISTS_IN_LANGUAGE), so this check is ours.
Usage: pool.py <dumpdir>"""
import json, glob, sys, re, unicodedata, collections
def norm(t):
    t = unicodedata.normalize('NFC', str(t or '')).strip().lower(); t = re.sub(r'\s+', ' ', t)
    return re.sub(r'[。？！、，.!?,;:¿¡؟،"“”«»…]+', '', t).strip()
pool = collections.defaultdict(list)
for f in glob.glob(sys.argv[1] + '/*.json'):
    d = json.load(open(f)); c = d['course']; tl, kl = c.split('_for_'); tl = tl.split('_')[0]
    for s in d['seeds']:
        for l in s['legos']:
            for p in l['phrases']:
                if kl == 'eng' and p.get('ka'): pool[norm(p['known'])].append(p['ka'])
                if tl == 'eng':
                    for sl in ('t1', 't2'):
                        if p.get(sl): pool[norm(p['target'])].append(p[sl])
S = json.load(open('live/slots.json')); out = {}; n = collections.Counter()
for s in S:
    if s['course'] in ('ara_eg_for_eng', 'ara_lb_for_eng') and s['role'] == 'known':
        c = list(dict.fromkeys(pool.get(norm(s['text']), [])))
        out[s['phraseId']] = c; n[(s['course'], 'has_clip' if c else 'none')] += 1
json.dump(out, open('live/ara-candidates.json', 'w'), indent=0)
print(dict(n))
