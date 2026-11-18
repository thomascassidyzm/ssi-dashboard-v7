#!/usr/bin/env python3
"""Compact read of kor_for_eng seeds from Popty's GET /api/production/kor_for_eng/seeds dump.
usage: show.py <seeds.json> <seed numbers...>   |  show.py <seeds.json> grep <regex>"""
import json, sys, re
d = json.load(open(sys.argv[1]))['seeds']
by = {s['seed_number']: s for s in d}
def a(r):
    return ''.join('k' if r.get('known_audio_id') else '-' for _ in [0]) + ('1' if r.get('target1_audio_id') else '-') + ('2' if r.get('target2_audio_id') else '-')
if sys.argv[2] == 'grep':
    rx = re.compile(sys.argv[3])
    for s in d:
        for l in s.get('legos') or []:
            if rx.search(l['target_text'] or '') or rx.search(l['known_text'] or ''):
                print(f"LEGO {l['lego_id']} new={l['is_new']} {l['known_text']} | {l['target_text']}")
            for p in l.get('basket_phrases') or []:
                if rx.search(p['target_text'] or '') or rx.search(p['known_text'] or ''):
                    print(f"  PH {p['id'].split(':')[1]} {p['phrase_role']} {p['known_text']} | {p['target_text']}")
    sys.exit()
for n in map(int, sys.argv[2:]):
    s = by[n]
    print(f"=== SEED {n} [{s['status']}] {s['known_text']} | {s['target_text']}  audio={a(s)}")
    for l in s.get('legos') or []:
        comps = '; '.join(f"{c.get('known')}={c.get('target')}" for c in (l.get('components') or []))
        print(f" {l['lego_id']} {l['type']} new={l['is_new']} {l['known_text']} | {l['target_text']}  audio={a(l)} pres={'P' if l.get('presentation_audio_id') else '-'} [{comps}]")
        for p in l.get('basket_phrases') or []:
            print(f"    {p['id'].split(':')[1]:16} {p['phrase_role'][:5]:5} pos={p.get('position')} {p["known_text"]} | {p["target_text"]}")
