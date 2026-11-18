#!/usr/bin/env python3
"""cs #130·AI — build the re-record list for ita_for_eng female (target1) clips that say the male form.

Inputs: a live snapshot of GET /api/production/ita_for_eng/seeds (seeds + legos + basket phrases, with audio ids)
and #126·AI's quote (ops/ita-sicura-126/audio-quote.json: groups A-sicura + B-other; C-we is deliberately left out,
#126 kept those masculine). Output, one line per CLIP (a re-record fixes every slot that points at that clip):
  clip  stored_text  female_text  slots  note
Every slot is re-checked against the live snapshot: still pointing at the quoted clip, row text unchanged.
A clip that is also served by a target1 slot NOT on the list, or by any target2 slot, is held (note says why).
  python3 ops/ita-sicura/plan-130.py <seeds.json> <out.tsv>
"""
import json, sys, collections
seeds = json.load(open(sys.argv[1]))['seeds']
quote = json.load(open('ops/ita-sicura-126/audio-quote.json'))['by']
rows = quote['A-sicura'] + quote['B-other']

slot = {}          # quote-style id -> (target_text, target1, target2)
t1_users = collections.defaultdict(set); t2_users = collections.defaultdict(set)
def add(key, r):
    slot[key] = (r['target_text'], r.get('target1_audio_id'), r.get('target2_audio_id'))
    if r.get('target1_audio_id'): t1_users[r['target1_audio_id']].add(key)
    if r.get('target2_audio_id'): t2_users[r['target2_audio_id']].add(key)
for s in seeds:
    add(f"seed{s['seed_number']}", s)
    for l in s.get('legos') or []:
        add(l['lego_id'], l)
        for p in l.get('basket_phrases') or []:
            add(p['id'].split(':', 1)[-1], p)

by_clip = collections.defaultdict(list)
for r in rows: by_clip[r['clip']].append(r)
listed = {r['id'] for r in rows}
out = ['clip\tstored_text\tfemale_text\tslots\tnote']
for clip, rs in by_clip.items():
    notes = []
    for r in rs:
        live = slot.get(r['id'])
        if not live: notes.append(f"{r['id']}:gone")
        elif live[0] != r['text']: notes.append(f"{r['id']}:text-changed")
        elif live[1] != clip: notes.append(f"{r['id']}:now-{live[1]}")
    extra = t1_users[clip] - listed
    if extra: notes.append('also-target1:' + ','.join(sorted(extra)))
    if t2_users[clip]: notes.append('ALSO-TARGET2:' + ','.join(sorted(t2_users[clip])))
    out.append('\t'.join([clip, rs[0]['text'], rs[0]['female'], ','.join(r['id'] for r in rs), ';'.join(notes)]))
open(sys.argv[2], 'w').write('\n'.join(out) + '\n')
print(len(by_clip), 'clips,', len(rows), 'slots,', sum(1 for l in out[1:] if l.split('\t')[4]), 'with notes')
