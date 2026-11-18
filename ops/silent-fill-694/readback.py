#!/usr/bin/env python3
"""READ-ONLY readback (cs #694·AI). Re-dump the courses with dump-course.py into <newdumpdir> first, then:
  readback.py <newdumpdir> → live/readback.json + a per-course table on stdout.
Every slot in live/slots.json is looked up in the new dump: filled (with the clip id now there) or still empty, and an
empty slot gets its reason from results/<course>.jsonl: held_text_fix / held_lego_fix (the #447 families, not approved),
held_kai_crossvoice (ara_eg/lb, Kai's 575), refused:<code>, link_failed:<code>, not_sent (tel/mar known: VOICE_NOT_CAST
answered once per language by the probe), or UNEXPLAINED. Slots that went empty since 17 Nov's list are NEW_EMPTY."""
import json, sys, os, collections, glob
ND = sys.argv[1]; H = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(f'{H}/live/slots.json'))
logs = {}
for f in glob.glob(f'{H}/results/*.jsonl'):
    c = os.path.basename(f)[:-6]
    for l in open(f):
        r = json.loads(l)
        if 'key' in r: logs[(c, r['key'])] = r
        if 'relink' in r and r.get('ok'): logs[(c, r['relink'])]['relinked'] = True
now = {}
for c in {s['course'] for s in S}:
    d = json.load(open(f'{ND}/{c}.json'))
    for sd in d['seeds']:
        for l in sd['legos']:
            for p in l['phrases']:
                now[p['id']] = p
SL = {'known': 'ka', 'target1': 't1', 'target2': 't2'}
out = []; t = collections.defaultdict(collections.Counter)
for s in S:
    c = s['course']; p = now.get(s['phraseId']); clip = p and p.get(SL[s['role']])
    r = logs.get((c, f"{s['phraseId']}|{s['role']}"))
    if p is None: why = 'ROW_GONE'
    elif clip: why = 'filled'
    elif s['held_text_fix']: why = 'held_text_fix:' + '+'.join(s['held_text_fix'])
    elif s['lego_fix_pending']: why = 'held_lego_fix:' + '+'.join(s['lego_fix_pending'])
    elif r and r.get('held') == 'kai_crossvoice': why = 'held_kai_crossvoice'
    elif r and r.get('render') and not r['render'].get('ok'): why = 'refused:' + str(r['render'].get('code') or r['render'].get('status'))
    elif r and r.get('link') and not r['link'].get('ok'): why = 'link_failed:' + str(r['link'].get('code'))
    elif c in ('eng_for_tel', 'eng_for_mar') and s['role'] == 'known': why = 'refused:VOICE_NOT_CAST (language draft-cast only; probe)'
    else: why = 'UNEXPLAINED'
    src = (r or {}).get('render', {}) or {}
    out.append({**s, 'now_clip': clip, 'result': why, 'source': src.get('source'), 'charsSpent': src.get('charsSpent')})
    k = 'filled:' + (src.get('source') or 'by-someone-else') if why == 'filled' else why
    t[c][k] += 1
json.dump(out, open(f'{H}/live/readback.json', 'w'), ensure_ascii=False, indent=0)
for c in sorted(t): print(c, dict(t[c]))
tot = collections.Counter(); [tot.update(v) for v in t.values()]; print('TOTAL', dict(tot))
spent = sum(r['render'].get('charsSpent') or 0 for r in logs.values() if r.get('render')); print('chars spent', spent)
