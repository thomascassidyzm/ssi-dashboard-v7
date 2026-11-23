#!/usr/bin/env python3
"""cym_for_kor (cs #813·AK) — drive Popty's own builder path, seed by seed, HTTP only.

For each seed N in FROM..TO, in order (vocabulary is incremental, so never in parallel):
  1. skip it if Popty already has it (GET :3471/api/stats seeds_with_legos covers it — seeds go in order);
  2. wait while Popty's DB load gate (GET :3470/health dbLoadGate.level) is not green;
  3. for every LEGO the plan marks NEW at this seed, ask the phrase door
     (POST :3471/api/phrases/v3/generate/cym_for_kor — Welsh stays on v3, r-2026-09-27),
     up to DOOR_PAR LEGOs of one seed at once, as the builder brief says;
  4. assemble the builder's markdown (the full LEGO tiling; reused LEGOs carry no phrases and
     the route dedups them) and POST it to :3471/api/seed/complete;
  5. on any rejection, a held/blocked door answer, or a missing plan entry: write the
     evidence and STOP (exit 2) — a seed that is not in stops every later seed's vocabulary.

The LEGO plan (the judgement: splits and Korean glosses) lives in plan/*.json — this tool makes
no language decisions. Logs go to ~/ssi-evidence/ssi-dashboard-v7/ops/cym-for-kor/build/.
Writes nothing to the DB except through /api/seed/complete. No audio, ever.

Usage: run-builder.py FROM TO [--stop-at HH:MM]   (stop-at = UTC wall-clock; stops at a seed boundary)
"""
import json, sys, time, pathlib, datetime, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

COURSE = 'cym_for_kor'
AGENT = 'kai-813-cym-for-kor'
CB = 'http://localhost:3471/api'
HERE = pathlib.Path(__file__).resolve().parent
EVID = pathlib.Path.home() / 'ssi-evidence/ssi-dashboard-v7/ops/cym-for-kor/build'
EVID.mkdir(parents=True, exist_ok=True)
DOOR_PAR = 4


def http(method, url, body=None, ctype='application/json', timeout=900):
    data = None
    if body is not None:
        data = body.encode() if isinstance(body, str) else json.dumps(body, ensure_ascii=False).encode()
    req = urllib.request.Request(url, method=method, data=data,
                                 headers={'Content-Type': ctype, 'x-agent-id': AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.load(e)
        except Exception:
            return e.code, {'error': str(e)}


def log(rec):
    rec['at'] = datetime.datetime.utcnow().isoformat(timespec='seconds') + 'Z'
    with open(EVID / 'run.jsonl', 'a') as f:
        f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    print(json.dumps(rec, ensure_ascii=False)[:400], flush=True)


def gate():
    while True:
        try:
            lvl = json.load(urllib.request.urlopen('http://localhost:3470/health', timeout=30))['dbLoadGate']['level']
        except Exception as e:
            lvl = f'unreadable ({e})'
        if lvl == 'green':
            return
        log({'gate': lvl, 'note': 'waiting 60s'})
        time.sleep(60)


def load_plan():
    plan = {}
    for p in sorted((HERE / 'plan').glob('*.json')):
        for k, v in json.load(open(p))['seeds'].items():
            plan[int(k)] = v
    return plan


def norm(s):
    return ' '.join(s.replace('’', "'").lower().split())


def taught_before(plan, n):
    """Korean glosses taught by plan seeds < n. The plan keeps ZUT (one gloss, one Welsh LEGO, a
    soft-mutated form counting as the same LEGO — Popty links it as a duplicate), so a gloss seen
    before means the LEGO is already taught and needs no phrase-door call."""
    return {l['ko'] for m in plan if m < n for l in plan[m]['legos']}


def door(n, idx, l):
    body = {'seed': n, 'lego': idx, 'lego_known': l['ko'], 'lego_target': l['cy'], 'lego_type': l.get('type', 'A')}
    for attempt in (1, 2):
        code, r = http('POST', f'{CB}/phrases/v3/generate/{COURSE}', body)
        if code == 200 and r.get('ok'):
            return r
        if r.get('held') or r.get('blocked'):
            return r
    return r


def line(p):
    # The phrase door sometimes writes Welsh with a straight apostrophe (dw i'n) while every seed and
    # LEGO in this course uses ’ (dw i’n). One spelling per word keeps clip matching and dedup honest.
    return f"- {p['known']} → {p['target'].replace(chr(39), chr(0x2019))}"


def markdown(n, seed, legos, sets):
    out = [f'# Seed {n}', f"Known: {seed['ko']}", f"Target: {seed['cy']}", '']
    for i, l in enumerate(legos, 1):
        out.append(f'## L{i} [{l.get("type", "A")}] "{l["ko"]}" → "{l["cy"]}"')
        if l.get('type') == 'M' and l.get('comp'):
            out.append('Components: ' + ', '.join(f'{k} → {c}' for k, c in l['comp']))
        s = sets.get(i)
        out.append('BUILD:')
        if s:
            out += [line(p) for p in s.get('build', [])]
        out.append('USE:')
        if s:
            out += [line(p) + ' [7]' for p in s.get('use', [])]
        out.append('')
    return '\n'.join(out)


def main():
    lo, hi = int(sys.argv[1]), int(sys.argv[2])
    stop_at = None
    if '--stop-at' in sys.argv:
        hh, mm = sys.argv[sys.argv.index('--stop-at') + 1].split(':')
        now = datetime.datetime.utcnow()
        stop_at = now.replace(hour=int(hh), minute=int(mm), second=0, microsecond=0)
    plan = load_plan()
    seeds = {s['seed_number']: s for s in json.load(open(HERE.parent / 'seeds-ko-draft.json'))['seeds']}
    for n in range(lo, hi + 1):
        if stop_at and datetime.datetime.utcnow() >= stop_at:
            log({'stop': 'time', 'next_seed': n}); return 3
        plan = load_plan()  # re-read every seed: planners keep pushing fixes while the build runs
        _, st = http('GET', f'{CB}/stats/{COURSE}')
        if n <= (st.get('seeds_with_legos') or 0):  # built in order, so a contiguous prefix is done
            continue
        if n not in plan:
            log({'seed': n, 'stop': 'no plan entry'}); return 2
        legos = plan[n]['legos']
        seen = taught_before(plan, n)
        new_idx = [i for i, l in enumerate(legos, 1) if l['ko'] not in seen]
        gate()
        t0 = time.time()
        sets = {}
        with ThreadPoolExecutor(DOOR_PAR) as ex:
            futs = {i: ex.submit(door, n, i, legos[i - 1]) for i in new_idx}
            for i, f in futs.items():
                sets[i] = f.result()
        with open(EVID / f'door-s{n:03d}.json', 'w') as f:
            json.dump({str(k): {kk: v.get(kk) for kk in ('ok', 'held', 'blocked', 'code', 'error', 'build', 'use', 'attempts')} for k, v in sets.items()}, f, ensure_ascii=False)
        bad = {i: s for i, s in sets.items() if not s.get('ok')}
        if bad:
            log({'seed': n, 'stop': 'door', 'legos': {i: (s.get('code') or s.get('error') or 'not ok') for i, s in bad.items()}})
            return 2
        md = markdown(n, {'ko': seeds[n]['korean'], 'cy': seeds[n]['welsh']}, legos, sets)
        (EVID / f'seed-{n:03d}.md').write_text(md)
        code, r = http('POST', f'{CB}/seed/complete?course={COURSE}', md, ctype='text/markdown; charset=utf-8')
        if not r.get('ok'):
            r.pop('introduced_vocab', None)
            (EVID / f'reject-{n:03d}.json').write_text(json.dumps(r, ensure_ascii=False, indent=1))
            log({'seed': n, 'stop': 'rejected', 'http': code,
                 'errors': [e.get('message') for e in r.get('errors', [])][:8] or r.get('error')})
            return 2
        log({'seed': n, 'ok': True, 'legos': r.get('legos'), 'dups': r.get('duplicates_skipped'),
             'phrases': r.get('phrases'), 'held_out': r.get('zut_held_out') or r.get('held_out'),
             'secs': round(time.time() - t0)})
    log({'done': [lo, hi]})
    return 0


if __name__ == '__main__':
    sys.exit(main())
