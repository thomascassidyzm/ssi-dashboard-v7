#!/usr/bin/env python3
"""cs #420·AK: re-check the #942 plan (ops/942-ita-own-lego, 19 Nov copy) against the LATEST nightly copy and write
the surviving re-words/deletes as rows for mkchangesets.cjs. Reads only the copy dumps made by the committed reader:
  node ops/paid-cleanup-scan-447/copy-read.cjs dump <course> $CS_SCRATCH/<eng|jpn>.json 700
Per planned row (RE-WORD / DELETE; the 50 component rows stay LEAVE):
  HELD unless the row is still there with the 19 Nov text (plan.tsv phrase_now), its LEGO text is the 19 Nov text
  (lego_now), it is not seed 108 (tonight's C0108 run owns that seed), the fix is still needed (the phrase still lacks
  its LEGO), and the re-word still passes #942's learner checks on today's copy: contains the whole LEGO, every target
  (and, for English, known) word taught at or before the LEGO, no ZUT clash (same known prompt -> other target) anywhere
  in the course, no duplicate in its basket.
usage: python3 rebuild.py <out.json>"""
import sys, os, csv, json, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__)); PLAN = os.path.join(HERE, '..', '942-ita-own-lego')
sys.path.insert(0, PLAN)
from lib import C, norm, contains
spec = importlib.util.spec_from_file_location('plan', os.path.join(PLAN, 'plan-rows.py')); plan = importlib.util.module_from_spec(spec); spec.loader.exec_module(plan)
P, E_, J = plan.P, plan.E_, plan.J
base = {(r['course'], r['phrase_id']): r for r in csv.DictReader(open(os.path.join(PLAN, 'plan.tsv')), delimiter='\t')}
cs = {E_: C(E_), J: C(J)}
out = {'copy_db': cs[E_].d.get('copy_db'), 'copy_built': cs[E_].d.get('copy_built'), 'rows': []}
def sp(s): a, b = s.split(' | ', 1); return a, b
for (c, pid), (act, nk, nt, fam, why) in sorted(P.items()):
    co = cs[c]; b = base[(c, pid)]; held = []
    hit = co.ph.get(f'{c}:{pid}')
    if not hit: out['rows'].append({'course': c, 'pid': pid, 'act': act, 'held': ['row gone from the copy']}); continue
    sd, l, p = hit
    k0, t0 = sp(b['phrase_now (known | target)']); lk0, lt0 = sp(b['lego_now (known | target)'])
    if (p['known'].strip(), p['target'].strip()) != (k0.strip(), t0.strip()): held.append(f'row text changed since 19 Nov: "{p["known"]} | {p["target"]}"')
    if (l['known'].strip(), l['target'].strip()) != (lk0.strip(), lt0.strip()): held.append(f'LEGO text changed since 19 Nov: "{l["known"]} | {l["target"]}"')
    if l['id'] != b['lego_id']: held.append(f'row now under {l["id"]}')
    if sd['n'] == 108: held.append('seed 108: left to tonight\'s C0108 run')
    if contains(p['target'], l['target']): held.append('fix no longer needed: the row already contains its LEGO')
    if act == 'RE-WORD':
        if not contains(nt, l['target']): held.append('re-word lacks the LEGO')
        un = [w for w in norm(nt) if w not in co.vocab(l['id'], 'target')]
        if un: held.append('untaught target: ' + ','.join(un))
        if c == E_:
            unk = [w for w in norm(nk) if w not in co.vocab(l['id'], 'known')]
            # #942's one accepted residue: "play" in the LEGO "playing something else" (seed 98's L04 rows already say "to play")
            unk = [w for w in unk if not (w == 'play' and l['id'] == 'S0098L03')]
            if unk: held.append('untaught known: ' + ','.join(unk))
        for sd2, l2, p2 in co.all():
            if p2['id'] == p['id'] or p2['type'] == 'component': continue
            if ':' in p2['id'] and (c, p2['id'].split(':')[1]) in P: continue  # judged by the in-plan check below
            if norm(p2['known']) == norm(nk) and norm(p2['target']) != norm(nt): held.append(f"ZUT clash {p2['id'].split(':')[-1]}: {p2['target']}")
            if l2['id'] == l['id'] and norm(p2['target']) == norm(nt): held.append(f"duplicate in basket {p2['id'].split(':')[-1]}")
        for (c2, q), v in P.items():
            if c2 == c and q != pid and v[0] == 'RE-WORD':
                if norm(v[1]) == norm(nk) and norm(v[2]) != norm(nt): held.append('ZUT clash in plan ' + q)
                if norm(v[2]) == norm(nt): held.append('duplicate in plan ' + q)
    out['rows'].append({'course': c, 'pid': pid, 'id': f'{c}:{pid}', 'act': act, 'held': held, 'family': fam, 'why': why,
        'seed': sd['n'], 'seed_known': sd['known'], 'seed_target': sd['target'], 'lego_id': l['id'], 'lego_known': l['known'], 'lego_target': l['target'],
        'known': p['known'], 'target': p['target'], 'new_known': nk, 'new_target': nt, 'type': p['type'],
        'slots': {'known': p.get('ka'), 'target1': p.get('t1'), 'target2': p.get('t2')}})
json.dump(out, open(sys.argv[1], 'w'), ensure_ascii=False, indent=1)
import collections
cnt = collections.Counter((r['course'], r['act'], 'HELD' if r['held'] else 'ok') for r in out['rows'])
for k in sorted(cnt): print(k, cnt[k])
for r in out['rows']:
    if r['held']: print('HELD', r['course'], r['pid'], r['held'])
