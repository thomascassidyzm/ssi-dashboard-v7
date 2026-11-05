#!/usr/bin/env python3
# Job #641·AD: build the judging worklist from read-only dumps (course-dump-readonly, gender-pairs-dump-readonly,
# clip-voices) held in $CS_SCRATCH. One unit = one distinct target text (one clip per text per voice in these courses).
# Units = texts of pre-July target1 clips  ∪  texts with a course_gender_expansions row.
import json, sys, os, collections
S = sys.argv[1]; OUT = os.path.dirname(os.path.abspath(__file__))
VOICE = {'ara_eg_for_eng': ('azure_ar-EG-SalmaNeural', 'azure_ar-EG-ShakirNeural'), 'ara_lb_for_eng': ('azure_ar-LB-LaylaNeural', 'azure_ar-LB-RamiNeural')}
CHUNK = int(sys.argv[2]) if len(sys.argv) > 2 else 700
for c, (fv, mv) in VOICE.items():
    d = json.load(open(f'{S}/{c}.course.json')); g = json.load(open(f'{S}/{c}.gender.json'))
    clips = {x['id']: dict(x, voice_id=vk) for vk, v in json.load(open(f'{S}/{c}.clips.json'))['voices'].items() for x in v}
    seedEng = {s['seed_number']: (s['known_text'], s['target_text']) for s in d['seeds']}
    units = collections.OrderedDict()
    def unit(text):
        t = text.strip()
        return units.setdefault(t, {'text': t, 'slots': [], 't1': set(), 't2': set()})
    def add(label, sn, known, target, a1, a2):
        if not target: return
        u = unit(target); u['slots'].append({'slot': label, 'en': known, 'seed_en': seedEng.get(sn, ('', ''))[0]})
        if a1: u['t1'].add(a1)
        if a2: u['t2'].add(a2)
    for s in d['seeds']: add(f"S{s['seed_number']:04d}", s['seed_number'], s['known_text'], s['target_text'], s['target1_audio_id'], s['target2_audio_id'])
    for l in d['legos']: add(l['lego_id'], l['seed_number'], l['known_text'], l['target_text'], l['target1_audio_id'], l['target2_audio_id'])
    cnt = collections.Counter()
    for p in d['phrases']:
        base = f"S{p['seed_number']:04d}L{p['lego_index']:02d}"; r = {'build': 'B', 'use': 'U', 'component': 'C'}[p['phrase_role']]
        cnt[(base, r)] += 1
        add(f"{base}{r}{cnt[(base, r)]:02d}", p['seed_number'], p['known_text'], p['target_text'], p['target1_audio_id'], p['target2_audio_id'])
    rows = {}
    for r in g:
        if r['text_side'] != 'target': continue
        rows[r['original_text'].strip()] = r
    out = []
    for t, u in units.items():
        pre = [i for i in u['t1'] if i in clips and clips[i]['voice_id'] == fv and clips[i]['created_at'] < '2026-07-01']
        row = rows.get(t)
        if not pre and not row: continue
        out.append({'n': len(out), 'text': t, 'row': ({'id': row['id'], 'f': row['expanded_f'], 'm': row['expanded_m']} if row else None),
                    'slots': u['slots'][:6], 'nslots': len(u['slots'])})
    for t, r in rows.items():
        if t not in units: out.append({'n': len(out), 'text': t, 'row': {'id': r['id'], 'f': r['expanded_f'], 'm': r['expanded_m']}, 'slots': [], 'nslots': 0})
    # units file for the apply/render step (all clip ids, not only pre-July)
    json.dump({t: {'t1': sorted(u['t1']), 't2': sorted(u['t2'])} for t, u in units.items()}, open(f'{S}/{c}.units.json', 'w'), ensure_ascii=False)
    n = 0
    for i in range(0, len(out), CHUNK):
        n += 1
        with open(f'{OUT}/work/{c[:6]}-{n:02d}.jsonl', 'w') as f:
            for x in out[i:i + CHUNK]: f.write(json.dumps(x, ensure_ascii=False) + '\n')
    print(c, 'units', len(out), 'with row', sum(1 for x in out if x['row']), 'chunks', n)
