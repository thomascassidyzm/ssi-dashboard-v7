#!/usr/bin/env python3
"""cs #251·AL extras table + sample, OFFLINE over a whole-course plan (plan 1-668 against a /seeds read), assign.json,
the ko/ files and checks/clip-voices.json.

  python3 ops/cym-for-kor/rebuild-251/report.py <plan-1-668.json> <assign.json> <out.json>

Kai's costing rule (24 Nov 17:39Z, verbatim): "Of the originals are in the v2 course, they're on route to get recorded
anyway, so no need to count those. We're minimizing the extras - what is added by the new Korean medium course."
So EXTRAS for a voice = every kept door top-up (new Welsh, needs both voices) + every reused original that is NOT
played in v2 (under no is_new LEGO there) and lacks that voice's clip. target1 = Catrin, target2 = Aran (clip-voices
check: every named booth target1 clip is human_catrinlliar_cym_n, every target2 human_aran_cym_n).
Sample: 20 kept top-ups spread evenly across the course (one per ~33 seeds), deterministic.
"""
import json, sys, os
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    P = json.load(open(sys.argv[1]))
    A = json.load(open(sys.argv[2]))
    out_path = sys.argv[3]
    held = {h['lego'] for h in P['held']}
    inserted = {(r['seed_number'], r['lego_index'], r['target_text']) for r in P['inserts']}
    deleted = {d['id'] for d in P['deletes']}
    fixes = {f['id']: f['to'] for f in P['korean_fixes']}
    refused = {(r['lego'], r['target']) for r in P['refused_originals']}
    zut = {(r['lego'], r['target']) for r in P['zut_refused']}
    c = Counter()
    not_route = []
    topups = []
    for g in A['legos']:
        if g['lego'] in held:
            continue
        for o in g['originals']:
            if (g['lego'], o['target']) in refused or (g['lego'], o['target']) in zut:
                continue
            c['originals_reused'] += 1
            c['originals_on_v2_route' if o['on_v2_route'] else 'originals_not_on_v2_route'] += 1
            if not o['on_v2_route']:
                miss = [v for v, k in (('Catrin', 't1'), ('Aran', 't2')) if not o.get(k)]
                not_route.append({'lego': g['lego'], 'welsh': o['target'], 'source_seed': o['src_seed'], 'source_pool': o['src_pool'], 'needs': miss})
                for v in miss:
                    c[f'extra_{v}_from_originals'] += 1
            if o['voiced']:
                c['originals_voiced_both'] += 1
            for v, k in (('Catrin', 't1'), ('Aran', 't2')):
                if not o.get(k):
                    c[f'originals_missing_{v}'] += 1
        ko = None
        f = os.path.join(HERE, 'ko', f"S{g['seed']:04d}.json")
        if os.path.exists(f):
            ko = json.load(open(f))['legos'].get(g['lego'])
        for d in g['door']:
            if d['protected'] or d['id'] in deleted:
                if d['protected'] and not any(w.startswith('same Welsh') for w in d['protected']):
                    c['door_protected_kept'] += 1  # override baskets + seed sentences: new Welsh, counted as extras
                continue
            c['door_topups_kept'] += 1
            topups.append({'seed': g['seed'], 'lego': g['lego'], 'lego_ko': g['known'], 'lego_cy': g['target'], 'id': d['id'],
                           'role': d['role'], 'ko': fixes.get(d['id'], d['known']), 'cy': d['target'], 'ko_fixed': d['id'] in fixes})
    c['new_welsh_written'] = 0
    for v in ('Catrin', 'Aran'):
        c[f'EXTRAS_{v}'] = c['door_topups_kept'] + c['door_protected_kept'] + c[f'extra_{v}_from_originals']
    c['course_played_total'] = c['originals_reused'] + c['door_topups_kept'] + c['door_protected_kept']
    c['v2_played_total'] = 12867
    topups.sort(key=lambda t: (t['seed'], t['id']))
    sample = []
    for i in range(20):
        lo, hi = 1 + i * 668 // 20, (i + 1) * 668 // 20
        pool = [t for t in topups if lo <= t['seed'] <= hi and t['role'] == ('use' if i % 3 else 'build')] or [t for t in topups if lo <= t['seed'] <= hi]
        if pool:
            sample.append(pool[len(pool) // 2])
    json.dump({'counts': c, 'held_legos': len(held), 'not_on_v2_route': not_route, 'sample': sample, 'thin': P['thin']},
              open(out_path, 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(c, indent=0))


if __name__ == '__main__':
    main()
