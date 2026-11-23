"""cs #703·AI: fold shard-A review (#722·AI, cs/722-item-6-plan-review-shard-a-adver) outcomes into plan.json.
Every outcome is recorded on its entry ('review', 'plan_before_review'); review.md carries the reasoning.
Usage: python3 build/review_a.py <live jpn_for_eng dump.json>   (dump from ops/paid-cleanup-scan-447/dump-course.py)
"""
import json, os, sys
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = json.load(open(f'{HERE}/plan.json'))
dump = json.load(open(sys.argv[1]))
idx = {}
for s in dump['seeds']:
    idx[f"SEED{s['n']}"] = ('seed', s)
    for l in s['legos']:
        idx[l['id']] = ('lego', l)
        for p in l['phrases']:
            if ':' in p['id']: idx[p['id'].split(':')[-1]] = ('phrase', p)

PAST = 'DBJG (Makino & Tsutsui) -tai Note 1 exception: past -takatta may report a third person; course precedent SEED52 書きたかった'
REVERT = {  # plan edit withdrawn: current row is grammatical; any untaught form in it is pre-existing (item 9), not item 6
    'SEED212', 'S0212L01U10', 'S0212L01B03', 'S0212L01U01', 'S0212L01U04', 'S0212L01U05', 'S0212L01U08',
    'S0052L01U04', 'S0052L01U08', 'S0214L01U07', 'S0215L01U07', 'S0215L02U07', 'S0216L01U07', 'S0212L01B04',
    'S0040L01'}
DELETE = {  # the plan's gloss-only fix left an untaught target/known form; K15: delete the phrase instead
    'S0211L02U02': 'known "method" untaught before S0327L01',
    'S0265L01U05': '助けたい is taught nowhere',
    'S0269L02U01': '二日間 is taught nowhere',
    'S0113L03B02': 'exact duplicate of B01 after the re-gloss',
    'S0113L03U01': '疲れた untaught', 'S0113L03U05': 'しようとしてた untaught',
    'S0113L03U06': '言った first taught at SEED296', 'S0113L03U07': '話そうとすると untaught',
    'S0113L03U08': 'standalone したかった untaught'}
REPLACE = {
    'S0016L03U04': {'known': "he'll go back with everyone later", 'target': '彼はあとでみんなと戻る'},
    'S0282L01U07': {'known': 'no, I want to go tomorrow', 'target': 'ううん、明日行きたい'}}
ADD = {  # held seeds 34/35 repaired the reviewer's way: first person, drop the untaught-here 彼は/彼女は
    'SEED34': {'known': "I don't want to be quiet when other people are here", 'target': '他の人がいると、静かにしたくない'},
    'S0034L01': {'known': "don't want to be quiet"},
    'S0034L01B01': {'known': "don't want to be quiet"},
    'S0034L01B04': {'known': "don't want to be quiet now"},
    'S0034L02U04': {'known': "I don't want to be quiet when other people are here", 'target': '他の人がいると、静かにしたくない'},
    'SEED35': {'known': "I don't want to read anything this afternoon", 'target': '今日の午後、何も読みたくない'},
    'S0035L01': {'known': "don't want to read"},
    'S0035L01B01': {'known': "don't want to read"},
    'S0035L01B02': {'known': "don't want to read now"},
    'S0035L01B03': {'known': "don't want to read the sentence"},
    'S0035L01B04': {'known': "don't want to read more"},
    'S0035L03U08': {'known': "I don't want to read anything this afternoon", 'target': '今日の午後、何も読みたくない'},
    'S0113L03U09': {'known': "why don't I remember what you said?"}}

seen = set()
for e in P['entries']:
    if e['course'] != 'jpn_for_eng': continue
    r = e['row']; seen.add(r)
    if r in REVERT:
        e['plan_before_review'] = {'action': e['action'], 'new': e.get('new')}
        e['action'] = 'keep'; e['new'] = None
        e['review'] = '#722 DISPUTE accepted: plan edit withdrawn, current row kept (' + (PAST if r != 'S0040L01' else 're-gloss "how do you feel" clashes with S0657L02 いかがですか') + ')'
    elif r in DELETE:
        e['plan_before_review'] = {'action': e['action'], 'new': e.get('new')}
        e['action'] = 'delete'; e['new'] = None
        e['review'] = '#722 DISPUTE accepted: ' + DELETE[r] + '; deleted (K15) rather than left with the defect'
    elif r in REPLACE:
        e['plan_before_review'] = {'action': e['action'], 'new': e.get('new')}
        e['new'] = REPLACE[r]; e['review'] = "#722 DISPUTE accepted: reviewer's proposal taken"
    elif r in ADD:
        kind, o = idx[r]
        e['plan_before_review'] = {'action': e['action'], 'new': e.get('new')}
        e['action'] = 'edit'; e['new'] = {'known': ADD[r]['known'], 'target': ADD[r].get('target', o['target'])}
        e['review'] = '#722 DISPUTE accepted: held seed repaired the reviewer\'s way'
for r, nw in ADD.items():
    if r in seen: continue
    kind, o = idx[r]
    P['entries'].append({'course': 'jpn_for_eng', 'row': r, 'kind': kind, 'scope_n': None,
        'current': {'known': o['known'], 'target': o['target']},
        'defect': 'knock-on of the seed 34/35/113 repair (seed copy / LEGO gloss in step with the seed, O12/L26)',
        'action': 'edit', 'new': {'known': nw['known'], 'target': nw.get('target', o['target'])},
        'source': 'review #722·AI; DBJG -tai Note 1 (present -tai is first person)', 'confidence': 'sure',
        'note': 'added after review', 'checks': '', 'review': '#722: added'})
KOR_SKIP = {('kor_for_hin', 'S0655L02U02'): 'bare श्रीमती is a pre-name title, not a stand-alone madam (Hindwi)'}
for e in P['entries']:
    k = (e['course'], e['row'])
    if k in KOR_SKIP:
        e['plan_before_review'] = {'action': e['action'], 'new': e.get('new')}
        e['action'] = 'hold'; e['new'] = None; e['review'] = '#722 DISPUTE accepted, left out: ' + KOR_SKIP[k]
    if k in (('kor_for_tam', 'S0227L02U05'), ('kor_for_tam', 'S0227L03U05')):
        e['review'] = '#722 DISPUTE rejected for item 6: the 저에게 register fix is right and independent; the missing அவரும்/도 is a pre-existing prompt mismatch (item 3 family), recorded as residual'
    if e['course'] == 'kor_for_hin' and e['row'].startswith('S0021L02') and e['action'] == 'hold':
        e['review'] = '#722 DISPUTE: stays held — the K23(e)(2) route needs a hand-written presentation plus a course-wide audit of every later 그녀의/그의 USE prompt (reviewer: "prerequisites, not already verified fixes"); bigger than item 6'
json.dump(P, open(f'{HERE}/plan.json', 'w'), ensure_ascii=False, indent=1)
print('ok', len(P['entries']))
