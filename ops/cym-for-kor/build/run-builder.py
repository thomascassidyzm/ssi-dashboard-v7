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
import json, re, sys, time, pathlib, datetime, urllib.request, urllib.error
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
    except (urllib.error.URLError, ConnectionError, TimeoutError, OSError) as e:
        # Popty restarting (a deploy): not a content failure. The caller waits for /health and decides.
        return 0, {'error': f'unreachable: {e}', 'unreachable': True}


def wait_up(max_min=40):
    """Wait (bounded) for Popty to answer /health again after a restart."""
    for _ in range(max_min * 2):
        try:
            urllib.request.urlopen('http://localhost:3470/health', timeout=10)
            urllib.request.urlopen(f'{CB}/stats/{COURSE}', timeout=30)
            return True
        except Exception:
            time.sleep(30)
    return False


def call(method, url, body=None, ctype='application/json'):
    """http() that rides out a Popty restart: an unreachable answer waits for /health and asks again."""
    for _ in range(3):
        code, r = http(method, url, body, ctype)
        if not r.get('unreachable'):
            return code, r
        log({'unreachable': url.split('/api/')[-1][:60], 'note': 'waiting for Popty'})
        if not wait_up():
            break
    return code, r


def log(rec):
    rec['at'] = datetime.datetime.now(datetime.UTC).replace(tzinfo=None).isoformat(timespec='seconds') + 'Z'
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
        code, r = call('POST', f'{CB}/phrases/v3/generate/{COURSE}', body)
        if code == 200 and r.get('ok'):
            return r
        if r.get('held') or r.get('blocked'):
            return r
    return r


# A 너 prompt takes the plain 반말 ending: 너는 배우고 싶어, never 싶어해 — the -어하다 form reports someone
# ELSE's wish (그는 … 싶어해). The phrase door carries 싶어해 over from an -어하다 gloss (S0016L02 "~고
# 싶어하다"), so the builder puts it right before it submits (Kai's settled ruling, 24 Nov), and logs each.
YOU_FIRST = re.compile(r'^(?:\S+\s+)*?(너는|너도|너|네가)\s')
OTHER_SUBJ = re.compile(r'(나는|내가|그는|그가|그녀는|그녀가|그들은|그들이|우리는|우리가)\s')
WELSH_3P = re.compile(r"\b(mae|oedd|dydy|doedd|ydy|fydd|fasai|wnaeth|ydyn|dydyn|maen|oeddan) (o|hi|nhw)\b")
AGREE = [('싶어해', '싶어'), ('싶어했', '싶었'), ('싶어하지', '싶지')]


def agree(known, target, n=None):
    m = YOU_FIRST.match(known)
    if not m or OTHER_SUBJ.search(known[:m.start(1)]) or WELSH_3P.search(target):
        return known
    fixed = known
    for a, b in AGREE:
        fixed = fixed.replace(a, b)
    if fixed != known:
        log({'seed': n, 'agreement_fix': known, 'now': fixed, 'target': target})
    return fixed


# A held LEGO whose ONLY refusal is the comma-tag rule ("na, heno": the LEGO + a short tag after a comma,
# services/course-builder/lib/validation.cjs classifyBuildPhrase) loses exactly the rows that rule rejects.
# The rule stays a hard rejection (Kai, 23 Nov: "We definitely don't want tags"). If 3 BUILD rows are left the
# seed goes on; otherwise the seed is HELD (run stops, a person writes new BUILD rows in overrides/).
# NEVER top BUILD up from USE: canon P18 (HARD, Kai 2026-08-28) — "we don't move phrases from use to build
# just to have build phrases". A '<LEGO>, <clause of taught LEGOs>' row is the seed's own shape for an
# interjection LEGO (na / dim diolch / byddwn) and is recombination (P3, P19), not a tag.
TAG_RE = re.compile(r',\s*¿?[^,]{1,18}$')


def comma_tag(target, lego):
    t = target.strip()
    return bool(TAG_RE.search(t)) and norm(re.sub(r',[^,]*$', '', t)) == norm(lego)


def settle_comma_tag(r, lego):
    # A fresh refusal carries attempts[].reasons; a re-asked held LEGO carries them in hold.reasons.
    reasons = [x for a in (r.get('attempts') or []) for x in (a.get('reasons') or [])] or list((r.get('hold') or {}).get('reasons') or [])
    gates = set((r.get('gate') or {}).get('failingGates') or [])
    if not r.get('held') or not reasons or gates - {'buildRecombination'} or any(not x.startswith('buildRecombination') for x in reasons):
        return None
    build = [p for p in r.get('build') or [] if not comma_tag(p['target'], lego['cy'])]
    use = list(r.get('use') or [])
    dropped = len(r.get('build') or []) - len(build)
    if not dropped:
        return None
    if len(build) < 3:
        return None
    return {'ok': True, 'build': build, 'use': use, 'settled': {'dropped': dropped}}


def line(p, n=None):
    # The phrase door sometimes writes Welsh with a straight apostrophe (dw i'n) while every seed and
    # LEGO in this course uses ’ (dw i’n). One spelling per word keeps clip matching and dedup honest.
    return f"- {agree(p['known'], p['target'], n)} → {p['target'].replace(chr(39), chr(0x2019))}"


def markdown(n, seed, legos, sets):
    out = [f'# Seed {n}', f"Known: {seed['ko']}", f"Target: {seed['cy']}", '']
    for i, l in enumerate(legos, 1):
        out.append(f'## L{i} [{l.get("type", "A")}] "{l["ko"]}" → "{l["cy"]}"')
        if l.get('type') == 'M' and l.get('comp'):
            out.append('Components: ' + ', '.join(f'{k} → {c}' for k, c in l['comp']))
        s = sets.get(i)
        out.append('BUILD:')
        if s:
            out += [line(p, n) for p in s.get('build', [])]
        out.append('USE:')
        if s:
            out += [line(p, n) + ' [7]' for p in s.get('use', [])]
        out.append('')
    return '\n'.join(out)


def main():
    lo, hi = int(sys.argv[1]), int(sys.argv[2])
    stop_at = None
    if '--stop-at' in sys.argv:
        hh, mm = sys.argv[sys.argv.index('--stop-at') + 1].split(':')
        now = datetime.datetime.now(datetime.UTC).replace(tzinfo=None)
        stop_at = now.replace(hour=int(hh), minute=int(mm), second=0, microsecond=0)
    plan = load_plan()
    seeds = {s['seed_number']: s for s in json.load(open(HERE.parent / 'seeds-ko-draft.json'))['seeds']}
    for n in range(lo, hi + 1):
        if stop_at and datetime.datetime.now(datetime.UTC).replace(tzinfo=None) >= stop_at:
            log({'stop': 'time', 'next_seed': n}); return 3
        plan = load_plan()  # re-read every seed: planners keep pushing fixes while the build runs
        _, st = call('GET', f'{CB}/stats/{COURSE}')
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
        # A LEGO the door held is settled by a committed override (overrides/sNNN.json, with its reason)
        # rather than by clearing the hold; /api/seed/complete still validates the whole seed.
        ov_file = HERE / 'overrides' / f's{n:03d}.json'
        if ov_file.exists():
            sets.update({int(k): v for k, v in json.load(open(ov_file))['legos'].items()})
        with ThreadPoolExecutor(DOOR_PAR) as ex:
            futs = {i: ex.submit(door, n, i, legos[i - 1]) for i in new_idx if i not in sets}
            for i, f in futs.items():
                sets[i] = f.result()
        with open(EVID / f'door-s{n:03d}.json', 'w') as f:
            json.dump({str(k): {kk: v.get(kk) for kk in ('ok', 'held', 'blocked', 'code', 'error', 'build', 'use', 'attempts')} for k, v in sets.items()}, f, ensure_ascii=False)
        for i, st_ in list(sets.items()):
            if not st_.get('ok'):
                fixed = settle_comma_tag(st_, legos[i - 1])
                if fixed:
                    log({'seed': n, 'lego': i, 'comma_tag_settled': fixed['settled'],
                         'build': [p['target'] for p in fixed['build']]})
                    sets[i] = fixed
        bad = {i: s for i, s in sets.items() if not s.get('ok')}
        if bad:
            log({'seed': n, 'stop': 'door', 'legos': {i: (s.get('code') or s.get('error') or 'not ok') for i, s in bad.items()}})
            return 2
        md = markdown(n, {'ko': seeds[n]['korean'], 'cy': seeds[n]['welsh']}, legos, sets)
        (EVID / f'seed-{n:03d}.md').write_text(md)
        code, r = http('POST', f'{CB}/seed/complete?course={COURSE}', md, ctype='text/markdown; charset=utf-8')
        if r.get('unreachable'):
            # Cut off mid-submit by a restart: the write may or may not have landed. Ask Popty, never re-post blind.
            log({'seed': n, 'unreachable': 'seed/complete', 'note': 'waiting for Popty, then checking'})
            wait_up()
            _, st = call('GET', f'{CB}/stats/{COURSE}')
            if n <= (st.get('seeds_with_legos') or 0):
                log({'seed': n, 'ok': True, 'note': 'landed before the restart'}); continue
            code, r = call('POST', f'{CB}/seed/complete?course={COURSE}', md, ctype='text/markdown; charset=utf-8')
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
