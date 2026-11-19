#!/usr/bin/env python3
"""CONTROL pass for item11 (cs #805). tools/validate.py compares each planned seed with the LIVE course baseline, but an
in-memory override run differs from that baseline even when NOTHING is changed (seed 587: one vocabulary flag appears in
a basket the plan does not touch). So for every seed validate.py flagged, this re-runs the same read-only validator call
twice — with the plan's ops, and with no ops — and stores what the PLAN adds over the no-change run under
plan["validator"]["control"]. It runs tools/validate.py's own code (loaded and re-pointed, not copied), same route, same
override, nothing written.   usage: python3 -I item11/control.py item11 <course> <dump.json>"""
import os, re, sys
T = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools', 'validate.py')
src = open(T).read().replace('__file__', repr(T))
head, rest = src.split("base = post({'fromSeed': 0})", 1)
loop, tail = rest.split("    fails = {f['seed']", 1)
loop = loop.replace("for n in plan['touched_seeds']:", "for n, ops in [(int(x), o) for x in FLAG for o in ([], ALLOPS)]:")
code = head + "base = {'failures': []}\nALLOPS = plan['ops']\nFLAG = plan['validator']['seeds_with_new_issues']\nCTRL = {}\n" + loop + \
    "    CTRL.setdefault(n, []).append({f['seed']: f['issues'] for f in ans.get('failures', [])}.get(n, []))\n"
g = {'__name__': 'control'}
exec(compile(code, 'control', 'exec'), g)
import json, time
plan, CTRL = g['plan'], g['CTRL']
plan['ops'] = g['ALLOPS']


def num(i):
    m = re.match(r'(L\d+: )(.*?)(\d+)', i)
    return (m.group(1) + m.group(2), int(m.group(3))) if m else (i, None)


ctl = {}
for n, (none, planned) in CTRL.items():
    base = dict(num(j) for j in none)
    real = []
    for i in planned:
        if i in none:
            continue
        k, v = num(i)
        if k in base and v is not None and base[k] is not None:
            if 'need' in i:  # "BUILD: need 3+, got N" — the count after "got" must not fall
                gi, gj = [int(re.search(r'got (\d+)', z).group(1)) for z in (i, [j for j in none if num(j)[0] == k][0])]
                if gi >= gj:
                    continue
            elif v <= base[k]:
                continue
        # "need 3+, got N" where the no-change run hid the count behind a containment failure: new only if N is under the floor
        real.append(i)
    ctl[n] = {'no_change': none, 'planned': planned, 'added_by_plan': real}
    print(n, 'REAL' if real else 'ok', real)
plan['validator']['control'] = {'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'per_seed': ctl,
                                'seeds_with_issues_added_by_plan': sorted(k for k, v in ctl.items() if v['added_by_plan'])}
json.dump(plan, open(os.path.join(g['ROOT'], 'plans', f"{g['course']}.json"), 'w'), ensure_ascii=False, indent=1)
print('issues added by the plan in seeds', plan['validator']['control']['seeds_with_issues_added_by_plan'])
