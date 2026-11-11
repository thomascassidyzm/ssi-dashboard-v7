#!/usr/bin/env python3
"""Job #177: v4 missing-LEGO draft (#173, d/11d06f02) + this job's independent check -> decisions.json.

#164 already PASSed 155 v2 rows; #177 checked the other 68 (46 redrafted rewrites, 9 newly deleted rows, 13 new phrases)
against the canon (P1/P2/P9/P16/P17), Spanish grammar and naturalness, faithful English and course-wide clashes.
65 PASS. Two changes from v4, recorded here so the tool never has to know about them:
  - S0622L01U05 'Nobody knew that the children had broken it': only the subject differs from U01 'I knew that the
    children had broken it' (P9, a USE row must buy a new frame) -> DELETE instead of rewrite; basket keeps 3 B + 4 U.
  - S0532L02 (all 5 v4 rows + NEW-B1): job #170 (mood apply, event c84bbc90, 11 Nov 14:07Z) rewrote this basket live
    after v4 read it; the v4 rows have drifted and NEW-B1 would duplicate live B01 exactly -> SKIP the whole LEGO.
"""
import json, os
D = os.path.dirname(os.path.abspath(__file__))
v4 = json.load(open(os.path.join(D, 'v4-draft.json')))
SKIP_LEGOS = {'S0532L02': 'drifted: rewritten live by #170 (mood apply, event c84bbc90) after v4 read it; NEW-B1 would twin live B01'}
TO_DELETE = {'S0622L01U05': 'P9: only the subject differs from U01 (I knew / Nobody knew that the children had broken it)'}
out = {'source': 'http://localhost:4317/d/11d06f02', 'skipped': [], 'rows': []}
for r in v4['rows']:
    if r['lego_id'] in SKIP_LEGOS:
        out['skipped'].append({'row_id': r['row_id'], 'action': r['action'], 'why': SKIP_LEGOS[r['lego_id']]}); continue
    rid = r['row_id'].split(':')[-1]
    d = {'lego_id': r['lego_id'], 'action': r['action'], 'row_id': rid if not rid.startswith('NEW') else None,
         'new_key': r['row_id'] if rid.startswith('NEW') else None, 'live': r.get('live'), 'proposed': r.get('proposed'),
         'reason': r.get('reason'), 'checked_by': '#164' if r.get('check_164') == 'PASS' and r['action'] in ('REWRITE', 'DELETE') else '#177'}
    if rid in TO_DELETE:
        d['action'] = 'DELETE'; d['proposed'] = None; d['reason'] = '#177 check: ' + TO_DELETE[rid]
    out['rows'].append(d)
# placement: v4 asks the three S0145L01 'ya no' builds to sit after B02 and before B03; the rest go after the last build.
out['place_after'] = {'S0145L01': 'S0145L01B02'}
json.dump(out, open(os.path.join(D, 'decisions.json'), 'w'), indent=1, ensure_ascii=False)
from collections import Counter
print(Counter(x['action'] for x in out['rows']), 'skipped', len(out['skipped']))
