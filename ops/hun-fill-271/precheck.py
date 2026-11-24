#!/usr/bin/env python3
"""cs #271·AL — live pre-check of #259's 44 EXISTS_IN_LANGUAGE hun_for_eng target slots against a fresh script-view dump
(ops/silent-fill-694/dump-course.py). Reads files only. Kai's rule: mismatch held, never forced; filled since = skipped.
Usage: python3 -I precheck.py <results259.jsonl> <dump.json> <out slots.json>"""
import json, sys
res, dump, out = sys.argv[1:4]
recs = [json.loads(l) for l in open(res) if l.strip()]
recs = [r for r in recs if (r.get('render') or {}).get('code') == 'EXISTS_IN_LANGUAGE']
d = json.load(open(dump))
byid = {}
for s in d['seeds']:
    for l in s['legos']:
        for p in l['phrases']:
            byid.setdefault(p['id'], []).append((s, l, p))
slots, tally = [], {'ok': 0, 'filled_since': 0, 'held': 0}
for r in recs:
    seed = int(r['lego'][1:5])
    hits = byid.get(r['phraseId'], [])
    s = {'course': 'hun_for_eng', 'phraseId': r['phraseId'], 'row': r['row'], 'lego': r['lego'], 'role': r['role'], 'text': r['text'], 'seed': seed}
    if len(hits) != 1:
        s['status'], s['why'] = 'held', f'{len(hits)} live rows with this id'
    else:
        sd, l, p = hits[0]
        live = p['target']; audio = p['t1' if r['role'] == 'target1' else 't2']
        if l['id'] != r['lego'] or sd['n'] != seed: s['status'], s['why'] = 'held', f"moved: lego {l['id']} seed {sd['n']}"
        elif live != r['text']: s['status'], s['why'] = 'held', f'text changed: live {live!r}'
        elif audio: s['status'], s['why'], s['liveAudio'] = 'filled_since', 'slot no longer silent', audio
        else: s['status'] = 'ok'
        s['seedText'], s['legoText'] = sd['target'], l['target']
    tally[s['status']] += 1; slots.append(s)
json.dump(slots, open(out, 'w'), ensure_ascii=False, indent=1)
print(len(recs), 'refused records;', tally, '; distinct texts', len({x['text'] for x in slots}))
for x in slots:
    if x['status'] != 'ok': print(x['status'], x['row'], x['role'], x.get('why'))
