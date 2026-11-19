#!/usr/bin/env python3
"""item10 validator pass (cs #714·AI): for every seed the plan touches, asks the course-builder's deterministic validator
(POST :3471/api/v2/validate/<course>, no model calls, nothing written) to check the seed AS PLANNED, via its documented
in-memory "override" (that seed's proposed LEGOs + phrases) with fromSeed = that seed, and compares the failures against
a baseline of the live course. A failure that is NEW under the plan is reported; pre-existing ones are counted, not blamed.
usage (cs #784 copy): python3 -I validate.py <fam-dir> <course> <dump.json>"""
# cs #968·AI: live gate. Every urlopen to a Popty port (:347x) is refused (exit 77) unless --live-ok '<why>' is given
# (put it last) AND it is 22:00-07:00 Europe/London. ops/paid_cleanup_livegate.py.
import os as _lg_os, sys as _lg_sys
_lg_d = _lg_os.path.dirname(_lg_os.path.realpath(__file__))
while not _lg_os.path.exists(_lg_os.path.join(_lg_d, 'paid_cleanup_livegate.py')) and _lg_d != '/':
    _lg_d = _lg_os.path.dirname(_lg_d)
_lg_sys.path.insert(0, _lg_d)
import paid_cleanup_livegate as livegate
livegate.install()
import json, os, sys, urllib.request, collections, time

FAM = sys.argv[1]; del sys.argv[1]
ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), FAM)
course, dumpf = sys.argv[1], sys.argv[2]
plan = json.load(open(os.path.join(ROOT, 'plans', f'{course}.json')))
dump = json.load(open(dumpf))
SD = {s['n']: s for s in dump['seeds']}
cache = os.path.join(os.environ.get('CS_SCRATCH', '/tmp'), 'components', course)


def post(body):
    req = urllib.request.Request(f'http://localhost:3471/api/v2/validate/{course}', data=json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json', 'x-agent-id': 'cs-plan-11-13-17-19 (validate, read-only)'}, method='POST')
    for a in range(3):
        try:
            return json.load(urllib.request.urlopen(req, timeout=300))
        except Exception as e:
            err = e
            time.sleep(5)
    return {'error': str(err)}


def comps(seed):
    f = os.path.join(cache, f'{seed}.json')
    if not os.path.exists(f):
        d = json.load(urllib.request.urlopen(f'http://localhost:3470/api/production/{course}/seed/S{seed:04d}/baskets', timeout=60))
        os.makedirs(cache, exist_ok=True)
        json.dump({k: v.get('components') for k, v in (d.get('baskets') or {}).items()}, open(f, 'w'), ensure_ascii=False)
    return json.load(open(f))


base = post({'fromSeed': 0})
basefail = {f['seed']: f['issues'] for f in base.get('failures', [])}
ops = plan['ops']
results = {}
for n in plan['touched_seeds']:
    s = SD[n]
    C = comps(n)
    legos, phrases = [], collections.defaultdict(list)
    dele = {o['lego_id'] for o in ops if o['op'] == 'lego.delete'}
    for l in s['legos']:
        if l['id'] in dele:
            continue
        up = {}
        for o in ops:
            if o['op'] == 'lego.update' and o['lego_id'] == l['id']:
                up.update(o['set'])
        legos.append({'lego_index': l['idx'], 'known_text': up.get('known_text', l['known']), 'target_text': up.get('target_text', l['target']),
                      'type': up.get('type', l['type']), 'components': up.get('components', C.get(l['id'])), 'is_new': up.get('is_new', l['is_new'])})
        key = f"{n}:{l['idx']}"
        for p in l['phrases']:
            if not p['id'].startswith(course + ':'):
                continue
            if any(o['op'] == 'phrase.delete' and o['phrase_id'] == p['id'] for o in ops):
                continue
            k, t = p['known'], p['target']
            for o in ops:
                if o['op'] == 'phrase.update' and o['phrase_id'] == p['id']:
                    k, t = o['set'].get('known_text', k), o['set'].get('target_text', t)
            role = {'build': 'build', 'use': 'use', 'component': 'component'}.get(p['type'], p['type'])
            phrases[key].append({'known_text': k, 'target_text': t, 'phrase_role': role})
    for o in ops:  # cs #784: a planned NEW LEGO (lego.insert) joins the seed as planned
        if o['op'] == 'lego.insert' and o['row']['seed_number'] == n:
            r = o['row']
            legos.append({'lego_index': r['lego_index'], 'known_text': r['known_text'], 'target_text': r['target_text'], 'type': r['type'], 'components': r.get('components'), 'is_new': r.get('is_new', True)})
    legos.sort(key=lambda x: x['lego_index'])
    for o in ops:
        if o['op'] == 'phrase.insert' and o['row']['seed_number'] == n:
            r = o['row']
            phrases[f"{n}:{r['lego_index']}"].append({'known_text': r['known_text'], 'target_text': r['target_text'], 'phrase_role': r['phrase_role']})
    seed_known = next((o['set']['known_text'] for o in ops if o['op'] == 'seed.update' and o['seed_number'] == n and 'known_text' in o['set']), s['known'])
    time.sleep(1)
    ans = post({'fromSeed': n, 'override': {'seed_number': n, 'known_text': seed_known, 'target_text': s['target'], 'legos': legos, 'phrases': dict(phrases)}})
    fails = {f['seed']: f['issues'] for f in ans.get('failures', [])}
    new = {}
    for sd, iss in fails.items():
        extra = [i for i in iss if i not in basefail.get(sd, [])]
        if extra:
            new[sd] = extra
    results[n] = {'seed_issues_planned': fails.get(n, []), 'seed_issues_live': basefail.get(n, []), 'new_issues_anywhere': new, 'error': ans.get('error')}
    print(n, 'NEW' if new else 'ok', json.dumps(new, ensure_ascii=False)[:400])
plan['validator'] = {'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'baseline_failing_seeds': len(basefail),
                     'per_seed': results, 'seeds_with_new_issues': sorted(k for k, v in results.items() if v['new_issues_anywhere'])}
json.dump(plan, open(os.path.join(ROOT, 'plans', f'{course}.json'), 'w'), ensure_ascii=False, indent=1)
print('baseline failing seeds', len(basefail), '| seeds with NEW issues', plan['validator']['seeds_with_new_issues'])
