#!/usr/bin/env python3
"""READ-ONLY (cs #712·AI). Marks slots another live cleanup job is changing, so fill.cjs never renders wording that is
about to change. Reads live/slots.json (plan.py output) and the item row lists, writes `held_job` onto each slot it holds.
  hold.py <slots.json> <item>=<rows.json> [...]     e.g. item4#700=scan-rows.json item5#701=item5-rows.json
A row id that is a LEGO id (S####L##) holds every row of that LEGO; a phrase id holds that row; a known text that matches
a listed row's known text (same course) holds it too. No database access; files only."""
import json, re, sys, collections
out = sys.argv[1]; S = json.load(open(out)); hold = collections.defaultdict(list)
for spec in sys.argv[2:]:
    tag, f = spec.split('=', 1)
    for r in json.load(open(f)):
        c = r.get('course'); rid = str(r.get('row') or r.get('row_id') or '').replace(f'{c}:', '')
        for s in S:
            if s['course'] != c: continue
            if (re.fullmatch(r'S\d{4}L\d{2}', rid) and s['lego'] == rid) or s['row'] == rid or \
               (r.get('known') and s.get('known') == r['known']):
                if tag not in hold[id(s)]: hold[id(s)].append(tag)
n = collections.Counter()
for s in S:
    s['held_job'] = hold.get(id(s), [])
    if s['held_job']: n[(s['course'], s['role'], '+'.join(s['held_job']))] += 1
json.dump(S, open(out, 'w'), ensure_ascii=False, indent=0)
for k, v in sorted(n.items()): print(*k, v)
