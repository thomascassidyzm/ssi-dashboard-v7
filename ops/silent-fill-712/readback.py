#!/usr/bin/env python3
"""READ-ONLY readback (cs #712·AI). Files only: compares live/slots.json + results/<course>.jsonl with fresh script-view
dumps (../silent-fill-694/dump-course.py) in <dumpdir>. Per slot: filled with the clip the render route returned for the
named voice (MATCH), filled with a different clip (OTHER — someone else filled it), still empty (with its hold/refusal
reason), or ROW_GONE. Writes live/readback.json; prints a per-course table.  Usage: readback.py <dumpdir>"""
import json, sys, os, collections
D = sys.argv[1]; H = os.path.dirname(os.path.abspath(__file__))
S = [s for s in json.load(open(f'{H}/live/slots.json')) if s['role'] == 'known']
res = {}
for c in {s['course'] for s in S}:
    f = f'{H}/results/{c}.jsonl'
    if os.path.exists(f):
        for l in open(f):
            r = json.loads(l); res[(c, r['key'])] = r
now = {}
for c in {s['course'] for s in S}:
    for sd in json.load(open(f'{D}/{c}.json'))['seeds']:
        for l in sd['legos']:
            for p in l['phrases']: now[p['id']] = p
out = []; t = collections.defaultdict(collections.Counter)
for s in S:
    c = s['course']; p = now.get(s['phraseId']); clip = p and p.get('ka'); r = res.get((c, f"{s['phraseId']}|known")) or {}
    rd = r.get('render') or {}
    if s.get('held_job'): why = 'held:' + '+'.join(s['held_job'])
    elif s['held_text_fix']: why = 'held:#447 row fix ' + '+'.join(s['held_text_fix'])
    elif s['lego_fix_pending']: why = 'held:#447 LEGO fix ' + '+'.join(s['lego_fix_pending'])
    elif rd and not rd.get('ok'): why = 'refused:' + str(rd.get('code') or rd.get('status'))
    else: why = 'sent'
    if p is None: state = 'ROW_GONE'
    elif not clip: state = 'EMPTY'
    elif rd.get('audioId') == clip: state = 'MATCH:' + str(rd.get('source'))
    else: state = 'OTHER'
    out.append({**s, 'now_clip': clip, 'why': why, 'state': state, 'voiceAsked': r.get('voiceAsked'),
                'source': rd.get('source'), 'charsSpent': rd.get('charsSpent')})
    t[c][f'{why} → {state}'] += 1; t[c]['chars'] += rd.get('charsSpent') or 0
json.dump(out, open(f'{H}/live/readback.json', 'w'), ensure_ascii=False, indent=0)
for c in sorted(t): print(c, json.dumps(dict(t[c]), ensure_ascii=False))
