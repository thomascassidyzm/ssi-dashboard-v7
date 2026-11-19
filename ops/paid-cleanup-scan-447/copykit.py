"""copykit (cs #931·AI): the only ways the paid-cleanup planning kits (item10/, plan-11-13-17-19/) reach data.

READS go to the nightly restored copy, through copy-read.cjs (which refuses any DATABASE_URL that is not the local
ssi_copy login). No Python here opens a database connection, and nothing here GETs a Popty read route: every one of
those (script-view, lego basket, seed baskets, course-builder /v2/validate) reads LIVE, which is what had the planners
cancelled on 19 Nov.

DRY RUNS go to Popty's edit door, POST /api/production/<course>/edit-batch WITHOUT "apply" (the real transaction,
rolled back), in chunks of at most 100 ops (the door refuses more: BULK_EDIT), paced, and only while GET /health shows
dbLoadGate governed and green. That is the one call these kits make towards live, and it applies nothing.
"""
import json, os, subprocess, sys, time, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
CR = os.path.join(HERE, 'copy-read.cjs')
POPTY = 'http://localhost:3470'
MAX_CHUNK = 100


def copy_read(*args):
    subprocess.run(['node', CR, *[str(a) for a in args]], check=True)


def where():
    return json.loads(subprocess.run(['node', CR, 'where'], check=True, capture_output=True, text=True).stdout)


def load_dump(path):
    d = json.load(open(path))
    if d.get('source') != 'qa-copy':
        sys.exit(f'REFUSED: {path} is not a nightly-copy dump (source={d.get("source")}); make it with '
                 f'node ops/paid-cleanup-scan-447/copy-read.cjs dump <course> <out.json>')
    return d


def stamp(plan, dump):
    """carry the copy's identity onto a plan (the changeset writer refuses a plan without it)"""
    plan['source'] = 'qa-copy'
    plan['copy_db'] = dump.get('copy_db')
    plan['copy_built'] = dump.get('copy_built')
    return plan


def components(course, seed, cache_dir):
    f = os.path.join(cache_dir, f'{seed}.json')
    if not os.path.exists(f):
        copy_read('components', course, cache_dir, seed)
    return json.load(open(f))


def gate(max_wait=1800):
    """wait until Popty's load gate is governed and green; back off 30 s, 60 s, ... (cap 300 s)."""
    t0, back = time.time(), 30
    while True:
        try:
            g = (json.load(urllib.request.urlopen(f'{POPTY}/health', timeout=10)).get('dbLoadGate') or {})
        except Exception as e:
            g = {'error': str(e)}
        if g.get('governed') is True and g.get('level') == 'green':
            return g
        if time.time() - t0 > max_wait:
            print(f'gate: load gate not green for {max_wait}s ({g}); stopping, re-run later', file=sys.stderr)
            sys.exit(75)
        print(f'gate: dbLoadGate {g.get("level")} governed={g.get("governed")}; waiting {back}s', file=sys.stderr)
        time.sleep(back)
        back = min(back * 2, 300)


def dryrun(course, plan_file, agent, chunk=50, pause=2.0):
    """dry-run a plan's ops through the edit door; store every chunk's answer in the plan under "dryRun"."""
    if not (1 <= chunk <= MAX_CHUNK):
        sys.exit(f'--chunk must be 1..{MAX_CHUNK} (the edit door refuses more)')
    plan = json.load(open(plan_file))
    ops = plan['ops']
    results = []
    for i in range(0, max(1, len(ops)), chunk):
        part = ops[i:i + chunk]
        if any('apply' in o for o in part):
            sys.exit('an op carries "apply"; refused')
        body = {'ops': part}
        g = gate()
        req = urllib.request.Request(f'{POPTY}/api/production/{course}/edit-batch', data=json.dumps(body).encode(),
                                     headers={'Content-Type': 'application/json', 'x-agent-id': agent, 'x-agent-role': 'planner'},
                                     method='POST')
        t = time.time()
        try:
            r = urllib.request.urlopen(req, timeout=600)
            status, ans = r.status, json.load(r)
        except urllib.error.HTTPError as e:
            status, ans = e.code, json.loads(e.read() or b'{}')
        results.append({'from': i, 'n': len(part), 'status': status, 'secs': round(time.time() - t, 1),
                        'gate': g.get('level'), 'answer': ans})
        print(course, f'ops {i}-{i + len(part) - 1}', status, json.dumps(ans, ensure_ascii=False)[:300])
        time.sleep(pause)
    plan['dryRun'] = {'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'route': 'POST /api/production/<course>/edit-batch (no apply)',
                      'agent': agent, 'chunk': chunk, 'chunks': results}
    json.dump(plan, open(plan_file, 'w'), ensure_ascii=False, indent=1)
    ok = bool(results) and all(c['status'] == 200 for c in results)
    print(course, 'dry run', 'OK' if ok else 'NOT OK', f'{len(results)} chunk(s) of <= {chunk}')
    return ok


def write_changeset(plan_file, out, job):
    """the plan's ops as an ssi-changeset/1 file, then the applier's own offline --check (zero DB)."""
    copy_read('changeset', plan_file, out, job)
    repo = os.path.dirname(os.path.dirname(HERE))
    subprocess.run(['node', os.path.join(repo, 'tools', 'changeset', 'apply-changeset.cjs'), out, '--check'], check=True)


def seed_override(course, s, ops, C):
    """one touched seed AS PLANNED, in /v2/validate's override shape (s = dump seed, C = {lego_id: components})"""
    import collections
    n = s['n']
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
            if not str(p['id']).startswith(course + ':'):
                continue
            if any(o['op'] == 'phrase.delete' and o['phrase_id'] == p['id'] for o in ops):
                continue
            k, t = p['known'], p['target']
            for o in ops:
                if o['op'] == 'phrase.update' and o['phrase_id'] == p['id']:
                    k, t = o['set'].get('known_text', k), o['set'].get('target_text', t)
            phrases[key].append({'known_text': k, 'target_text': t, 'phrase_role': p['type']})
    for o in ops:  # cs #784: a planned NEW LEGO (lego.insert) joins the seed as planned
        if o['op'] == 'lego.insert' and o['row']['seed_number'] == n:
            r = o['row']
            legos.append({'lego_index': r['lego_index'], 'known_text': r['known_text'], 'target_text': r['target_text'], 'type': r['type'],
                          'components': r.get('components'), 'is_new': r.get('is_new', True)})
    legos.sort(key=lambda x: x['lego_index'])
    for o in ops:
        if o['op'] == 'phrase.insert' and o['row']['seed_number'] == n:
            r = o['row']
            phrases[f"{n}:{r['lego_index']}"].append({'known_text': r['known_text'], 'target_text': r['target_text'], 'phrase_role': r['phrase_role']})
    seed_known = next((o['set']['known_text'] for o in ops if o['op'] == 'seed.update' and o['seed_number'] == n and 'known_text' in o['set']), s['known'])
    return {'seed_number': n, 'known_text': seed_known, 'target_text': s['target'], 'legos': legos, 'phrases': dict(phrases)}


def validate_plan(course, plan, dump):
    """validate every seed the plan touches, on the copy, and store the answer in plan['validator']"""
    SD = {s['n']: s for s in dump['seeds']}
    cache = os.path.join(os.environ.get('CS_SCRATCH', '/tmp'), 'components', course)
    seeds = [n for n in plan['touched_seeds'] if n in SD]
    missing = [n for n in seeds if not os.path.exists(os.path.join(cache, f'{n}.json'))]
    if missing:
        copy_read('components', course, cache, ','.join(map(str, missing)))
    req = [(n, seed_override(course, SD[n], plan['ops'], json.load(open(os.path.join(cache, f'{n}.json'))))) for n in seeds]
    return validate(course, plan, dump, req)


def validate(course, plan, dump, seeds_req, out_key='validator'):
    """the course-builder's validator sweep, on the copy: a baseline request plus one override request per touched
    seed (seeds_req = [(seed, override_body)]); NEW failures under the plan are reported per seed."""
    S = os.environ.get('CS_SCRATCH', '/tmp')
    rq = os.path.join(S, f'validate-{course}-req.json')
    ans = os.path.join(S, f'validate-{course}-ans.json')
    json.dump([{'fromSeed': 0}] + [{'fromSeed': n, 'override': ov} for n, ov in seeds_req], open(rq, 'w'), ensure_ascii=False)
    copy_read('validate', course, rq, ans)
    A = json.load(open(ans))
    basefail = {f['seed']: f['issues'] for f in A[0]['failures']}
    results = {}
    for (n, _), a in zip(seeds_req, A[1:]):
        fails = {f['seed']: f['issues'] for f in a['failures']}
        new = {}
        for sd, iss in fails.items():
            extra = [i for i in iss if i not in basefail.get(sd, [])]
            if extra:
                new[sd] = extra
        results[n] = {'seed_issues_planned': fails.get(n, []), 'seed_issues_live': basefail.get(n, []), 'new_issues_anywhere': new, 'error': None}
        print(n, 'NEW' if new else 'ok', json.dumps(new, ensure_ascii=False)[:400])
    plan[out_key] = {'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'on': f'nightly copy {dump.get("copy_db")}',
                     'baseline_failing_seeds': len(basefail), 'per_seed': results,
                     'seeds_with_new_issues': sorted(k for k, v in results.items() if v['new_issues_anywhere'])}
    print('baseline failing seeds', len(basefail), '| seeds with NEW issues', plan[out_key]['seeds_with_new_issues'])
    return plan
