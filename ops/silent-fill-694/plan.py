#!/usr/bin/env python3
"""READ-ONLY (cs #694·AI). Empty audio slots on PLAYED rows (new LEGO; lego_debut/build/use phrases; same definition as
#482's empty.py), from live script-view dumps (dump-course.py), cross-checked against every REAL row of the #447 slice
reports in a text-changing family. Usage: plan.py <dumpdir> <reportsdir> <out.json>
Holds: eng_for_pan / eng_for_guj (Kai, D3) are not in scope at all. ara_eg/ara_lb known slots are classified later by the
render dry run (a clip in ANOTHER English voice = held by Kai, the 575)."""
import json, glob, sys, os, re, unicodedata, collections
exec(open(os.path.join(os.path.dirname(__file__), 'fam_rules.py')).read())
D, R, OUT = sys.argv[1:4]
COURSES = ['eng_for_hin','eng_for_sin','eng_for_urd','eng_for_ara','eng_for_deu','eng_for_spa','deu_at_for_eng','ara_for_eng',
           'por_for_eng','jpn_for_eng','zho_for_jpn','ara_eg_for_eng','ara_lb_for_eng','eng_for_tel','eng_for_mar']
# Families whose fix does not change this row's words: a flag flip, or the seed sentence copied in elsewhere.
NON_TEXT = {'FLAGS', 'P26', 'EMPTY'}
def norm(t):
    t = unicodedata.normalize('NFC', str(t or '')).strip().lower(); t = re.sub(r'\s+', ' ', t)
    return re.sub(r'[。？！、，.!?,;:¿¡؟،"“”«»…]+', '', t).strip()
def fam_of(sl, r):
    fam = str(r.get('family')); key = f'{sl}|{r.get("course")}|{fam}'
    if fam.startswith('B LEGO drifted'): return 'L26'
    return next((k for k, rx in RULES if re.search(rx, key, re.I)), 'OTHER')
by_id = collections.defaultdict(set); by_text = collections.defaultdict(set); lego_fix = collections.defaultdict(set)
for f in sorted(glob.glob(R + '/*.json')):
    sl = os.path.basename(f)[:-5]
    for r in json.load(open(f)):
        if not isinstance(r, dict) or not str(r.get('verdict', '')).upper().startswith('REAL'): continue
        k = fam_of(sl, r)
        if k in NON_TEXT: continue
        c = r.get('course'); rid = str(r.get('row') or r.get('row_id') or '').replace(f'{c}:', '')
        by_id[(c, rid)].add(k)
        if r.get('known') or r.get('target'): by_text[(c, norm(r.get('known')), norm(r.get('target')))].add(k)
        if re.fullmatch(r'S\d{4}L\d{2}', rid) and k in ('L26', 'ZUT', 'GAPPED', 'LONG', 'FORMAL', 'TGRAM', 'ENGRAM', 'CARRY', 'GENDER'):
            lego_fix[(c, rid)].add(k)
slots = []
for c in COURSES:
    d = json.load(open(f'{D}/{c}.json'))
    for s in d['seeds']:
        for l in s['legos']:
            if not l['is_new']: continue
            for p in l['phrases']:
                if p['type'] not in ('lego_debut', 'build', 'use'): continue
                pid = p['id'].replace(c + ':', '')
                for sl, role in (('ka', 'known'), ('t1', 'target1'), ('t2', 'target2')):
                    if p.get(sl): continue
                    fams = by_id.get((c, pid), set()) | by_text.get((c, norm(p['known']), norm(p['target'])), set())
                    lf = lego_fix.get((c, l['id']), set())
                    slots.append({'course': c, 'phraseId': p['id'], 'row': pid, 'lego': l['id'], 'type': p['type'], 'role': role,
                                  'text': p['known'] if role == 'known' else p['target'], 'known': p['known'], 'target': p['target'],
                                  'held_text_fix': sorted(fams), 'lego_fix_pending': sorted(lf)})
json.dump(slots, open(OUT, 'w'), ensure_ascii=False, indent=0)
t = collections.defaultdict(lambda: collections.Counter())
for s in slots:
    t[s['course']]['slots'] += 1; t[s['course']][s['role']] += 1
    if s['held_text_fix']: t[s['course']]['held_row'] += 1; [t[s['course']].update({'row:' + f: 1}) for f in s['held_text_fix']]
    elif s['lego_fix_pending']: t[s['course']]['held_lego'] += 1; [t[s['course']].update({'lego:' + f: 1}) for f in s['lego_fix_pending']]
    else: t[s['course']]['chars_free_of_holds'] += len(s['text'] or '')
for c in COURSES: print(c, dict(t[c]))
print('TOTAL slots', len(slots))
