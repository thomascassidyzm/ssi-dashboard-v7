#!/usr/bin/env python3
"""cs #377·AL — live pre-check (Kai 19 Nov rule) before any re-record: through Popty's edit-batch DRY RUN only
(no writes), read each planned clip row and every slot that serves it, plus each slot's seed, and compare with the plan
(sister-plan-377.tsv, built from the #131 sweep on the 25 Nov QA copy). A row is OK only if: the clip's revision is
still 1 (never re-recorded), its role is target1, every planned slot still serves it, and the slot text equals the plan.
  python3 precheck-377.py <plan.tsv> <seeds-dir> <out.tsv>"""
import csv, json, sys, urllib.request, re
plan, seeds_dir, out = sys.argv[1:4]
rows = [r for r in csv.DictReader(open(plan), delimiter='\t') if r['decision'] == 'rerecord']
def batch(course, ops):
    req = urllib.request.Request(f'http://localhost:3470/api/production/{course}/edit-batch', data=json.dumps({'ops': ops}).encode(),
        headers={'Content-Type': 'application/json', 'x-agent-id': 'kai-377-precheck'})
    d = json.load(urllib.request.urlopen(req, timeout=60))
    assert d.get('dryRun') is True and not d.get('applied'), d
    return d['results']
def slot_op(course, slot, clip):
    if re.fullmatch(r'S\d{4}', slot): return {'op': 'seed.update', 'seed_number': int(slot[1:]), 'set': {'target1_audio_id': clip}}
    if re.fullmatch(r'S\d{4}L\d{2}', slot): return {'op': 'lego.update', 'lego_id': slot, 'set': {'target1_audio_id': clip}}
    return {'op': 'phrase.update', 'phrase_id': f'{course}:{slot}', 'set': {'target1_audio_id': clip}}
seeds = {}
o = open(out, 'w'); o.write('course\tclip\tok\tclip_text\trevision\tvoice\tproblems\n')
for r in rows:
    c, clip = r['course'], r['clip']
    if c not in seeds: seeds[c] = {s['seed_number']: s['target_text'] for s in json.load(open(f'{seeds_dir}/{c}.seeds.json'))['seeds']}
    slots = r['slots'].split(',')
    seednums = sorted({int(s[1:5]) for s in slots})
    ops = [{'op': 'audio.update', 'audio_id': clip, 'set': {'veracity_reason': 'probe'}}] + [slot_op(c, s, clip) for s in slots] \
        + [{'op': 'seed.update', 'seed_number': n, 'set': {'target_text': seeds[c][n]}} for n in seednums]
    res = batch(c, ops)
    a = res[0]['before']; probs = []
    if a.get('audio_revision') != 1: probs.append(f"revision {a.get('audio_revision')}")
    if a.get('role') != 'target1': probs.append(f"role {a.get('role')}")
    if a.get('origin') != 'tts': probs.append(f"origin {a.get('origin')}")
    for s, x in zip(slots, res[1:1 + len(slots)]):
        b = x.get('before') or {}
        if x.get('changed') is not False: probs.append(f'{s} no longer serves it ({b.get("target1_audio_id")})')
        if (b.get('target_text') or '').strip().lower() != r['stored_text'].strip().lower(): probs.append(f'{s} text now {b.get("target_text")!r}')
    for n, x in zip(seednums, res[1 + len(slots):]):
        if x.get('changed') is not False: probs.append(f'seed {n} text moved since snapshot')
    o.write('\t'.join([c, clip, 'OK' if not probs else 'HOLD', a.get('text') or '', str(a.get('audio_revision')), a.get('voice_id') or '', '; '.join(probs)]) + '\n')
print('done', len(rows))
