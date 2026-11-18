#!/usr/bin/env python3
"""Job #557: has one of Aran's real takes replaced a clone stand-in yet? Read-only, through Popty's GET seeds route.
Exit 0 (and print the slot) when any linked clone SEED slot of the fill now holds a different clip; exit 1 otherwise.
  swap-watch.py <evidence dir>   (reads plan.json + render.jsonl + link.jsonl written by tools/audio/aran-clone-english-fill.cjs)
"""
import json, sys, urllib.request

d = sys.argv[1]
plan = json.load(open(f'{d}/plan.json'))['entries']
renders = [json.loads(l) for l in open(f'{d}/render.jsonl') if l.strip()]
linked = set()
for l in open(f'{d}/link.jsonl'):
    if l.strip():
        linked.update(json.loads(l).get('okKeys') or [])
clip = {(r['courseCode'], r['text']): r['body']['audioId'] for r in renders if not r.get('dry') and 200 <= r['status'] < 300 and r['body'].get('audioId')}
want = {}
for e in plan:
    a = clip.get((e['courseCode'], e['text']))
    for s in e['slots']:
        if a and s['target'] == 'seed' and f"{e['courseCode']}|{s['seedNumber']}" in linked:
            want[(e['courseCode'], s['seedNumber'])] = (a, e['text'])
for course in sorted({c for c, _ in want}):
    seeds = json.load(urllib.request.urlopen(f'http://localhost:3470/api/production/{course}/seeds', timeout=280))['seeds']
    for s in seeds:
        k = (course, s['seed_number'])
        if k in want and s.get('known_audio_id') and s['known_audio_id'] != want[k][0]:
            print(f"{course} S{s['seed_number']:04d} \"{want[k][1]}\": clone {want[k][0]} -> {s['known_audio_id']}")
            sys.exit(0)
print(f'no swap yet across {len(want)} linked clone seed slots')
sys.exit(1)
