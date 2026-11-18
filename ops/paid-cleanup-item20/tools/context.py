#!/usr/bin/env python3
"""Planner context for thin baskets (cs #718·AI). For each todo basket in ../<course>/worklist.json within a seed range:
seed line, LEGO (+components), every current row (b=build u=use c=component; BARE = the row to reword), what is needed,
and SISTER rows: real builds for the same English LEGO in the same seed in eng_for_hin and the other four sister courses
(English + that course's known text). Reusing a sister's English means its English clips link for free (same cast voices).
usage: context.py <course> <fromSeed> <toSeed> [--worst]   (--worst: only baskets with 0-1 real builds)"""
import json, os, re, sys
c, lo, hi = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]); worst = '--worst' in sys.argv
H = os.path.dirname(os.path.abspath(__file__)); LV = os.path.expanduser('~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-item20/live')
norm = lambda s: re.sub(r'[\s\.\?\!,;:।؟۔"\']+', ' ', (s or '').lower()).strip()
wl = json.load(open(os.path.join(H, '..', c, 'worklist.json')))
todo = {e['lego']: e for e in wl['todo'] if lo <= e['seed'] <= hi and (not worst or e['real_builds'] <= 1)}
live = json.load(open(f'{LV}/{c}.json'))
sis = {}
for sc in ['eng_for_hin', 'eng_for_urd', 'eng_for_pan', 'eng_for_ben', 'eng_for_mar', 'eng_for_guj']:
    if sc == c or not os.path.exists(f'{LV}/{sc}.json'): continue
    for s in json.load(open(f'{LV}/{sc}.json'))['seeds']:
        if not lo <= s['seed_number'] <= hi: continue
        for l in s['legos']:
            for p in l['basket_phrases']:
                if p['phrase_role'] == 'build' and norm(p['target_text']) != norm(l['target_text']):
                    sis.setdefault((s['seed_number'], norm(l['target_text'])), []).append((sc[8:], p['target_text'], p['known_text']))
for s in live['seeds']:
    hits = [l for l in s['legos'] if l['lego_id'] in todo]
    if not hits: continue
    print(f"\n=== SEED {s['seed_number']}: {s['known_text']} | {s['target_text']}")
    for l in s['legos']:
        mark = '>>' if l['lego_id'] in todo else '  '
        comps = '; '.join(f"{x['known']}={x['target']}" for x in (l.get('components') or []))
        print(f"{mark}{l['lego_id'][5:]} {l['type']} {l['known_text']} | {l['target_text']}" + (f"  [{comps}]" if comps else ''))
        if l['lego_id'] not in todo: continue
        e = todo[l['lego_id']]
        for p in l['basket_phrases']:
            if p['phrase_role'] == 'component': continue
            sfx = p['id'].split(':')[-1][8:]
            tag = 'BARE' if norm(p['target_text']) == norm(l['target_text']) and p['phrase_role'] != 'use' else ''
            print(f"     {sfx:4} {p['phrase_role'][0]} {tag:4} {p['known_text']} | {p['target_text']}")
        print(f"     NEED {e['need']} real build(s): reword {', '.join(e['bare'][:e['need']]) or '-'}" + (f" + insert {e['need'] - len(e['bare'])}" if e['need'] > len(e['bare']) else ''))
        seen = set()
        for x in sis.get((s['seed_number'], norm(l['target_text'])), []):
            if norm(x[1]) in seen: continue
            seen.add(norm(x[1])); print(f"     sister {x[0]}: {x[1]}  ({x[2]})")
