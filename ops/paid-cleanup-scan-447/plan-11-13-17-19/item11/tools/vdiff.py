#!/usr/bin/env python3
"""validate.py compares the planned seed against a whole-course baseline whose wording differs from the per-seed
override answer, so untouched defects show as NEW. This runs validate.py a second time on the SAME seeds with NO ops
(the seed as it is live, through the same override door; nothing written) and prints, per seed, only the issues the
plan really adds and the ones it removes. Run after tools/validate.py.  usage: python3 -I item11/tools/vdiff.py <course>
Writes plans/<course>.json "validator_vs_unchanged"."""
import json, os, re, subprocess, sys
FAM = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); P = os.path.dirname(FAM)
course = sys.argv[1]; S = os.environ['CS_SCRATCH']
pf = os.path.join(FAM, 'plans', f'{course}.json'); plan = json.load(open(pf))
os.makedirs(os.path.join(FAM, 'base', 'plans'), exist_ok=True)
bf = os.path.join(FAM, 'base', 'plans', f'{course}.json')
json.dump({'course': course, 'touched_seeds': plan['touched_seeds'], 'ops': []}, open(bf, 'w'))
subprocess.run(['python3', '-I', os.path.join(P, 'tools', 'validate.py'), 'item11/base', course, f'{S}/dumps/{course}.json'], capture_output=True, text=True, cwd=P)
base = json.load(open(bf))['validator']['per_seed']; os.remove(bf)
out = {}
for n, r in plan['validator']['per_seed'].items():
    # compare like with like: drop the "(N component phrases excluded)" aside, and treat a "need N+, got M" shortfall
    # as added only when M went DOWN (the same shortfall, or a smaller one, was already there)
    def key(i): return re.sub(r' \(\d+ component phrases excluded\)', '', i)
    def short(i):
        m = re.match(r'(L\d+: (?:BUILD|USE)): need \d+\+, got (\d+)', i); return (m.group(1), int(m.group(2))) if m else None
    was = dict(filter(None, (short(i) for i in base[n]['seed_issues_planned'])))
    a = {key(i) for i in r['seed_issues_planned'] if not (short(i) and short(i)[0] in was and short(i)[1] >= was[short(i)[0]])}
    b = {key(i) for i in base[n]['seed_issues_planned']}
    other = {k: v for k, v in r['new_issues_anywhere'].items() if str(k) != str(n)}
    out[n] = {'added': sorted(a - b), 'removed': sorted(b - a), 'other_seeds': other, 'error': r.get('error') or base[n].get('error')}
    if a - b or other or out[n]['error']:
        print(n, 'ADDED', json.dumps(sorted(a - b), ensure_ascii=False), '| was', json.dumps(sorted(b - a), ensure_ascii=False), other or '', out[n]['error'] or '')
plan['validator_vs_unchanged'] = out
json.dump(plan, open(pf, 'w'), ensure_ascii=False, indent=1)
print(course, 'seeds', len(out), '| seeds where the plan adds an issue:', sorted(k for k, v in out.items() if v['added'] or v['other_seeds']), '| seeds where it removes one:', len([1 for v in out.values() if v['removed']]))
