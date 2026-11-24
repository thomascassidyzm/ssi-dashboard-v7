#!/usr/bin/env python3
"""cym_for_kor reuse RE-COST (cs #248): minimum NEW Welsh on Kai's terms. Offline: reads match.cjs
output and the cym_nv2_for_eng snapshot only (no DB, no network).

  python3 ops/cym-for-kor/reuse/recost.py <match.json> <cym_nv2_for_eng.json> > recost.json

Kai's terms (24 Nov): reuse EVERY fitting original that has both Welsh voices; no per-LEGO cap; aim
at the v2 course's real played total, not "11 per LEGO"; top up only baskets below the floor.
Korean is generated and never costed here.

Floor = phraseFloor() in services/course-builder/lib/phrase-structure.cjs (canon P30: S1L1 none,
S1-S3 1 BUILD + 1 USE, S4+ 3 BUILD + 5 USE). Variant "b3" = the lighter P5 reading, 3 BUILD only.
Roles are kept as the source gave them (P18: never demote USE to BUILD; P7: a BUILD fragment is never
promoted to USE), so BUILD and USE slots are filled separately.

Placement: a phrase may sit under its first valid new LEGO or any later new LEGO it contains
(match.cjs reuse/alsoHome), never under a LEGO it merely IS (P3 bare LEGO). Max-flow (per role) puts
voiced originals where they cover the most floor slots; voiced originals left over still go in, under
their first valid home: every voiced original is reused, none is capped away.

Options (new Welsh = every phrase that needs recording, whatever its source):
  A  voiced originals + generated top-ups to the floor
  B  A, plus every fitting UNVOICED original recorded (they also fill floor slots before generated)
  C  same course size as B, but generated phrases recorded instead of the unvoiced originals
  D  fewest clips: unvoiced originals only where they fill a floor slot (one-voice ones first)
"""
import json, sys, re
from collections import Counter, deque

norm = lambda t: ' '.join(re.sub(r'[.,!?;:]+', ' ', t.replace('’', "'").replace('‘', "'").lower()).split())


def phrase_floor(seed, idx, variant):
    if seed == 1 and idx == 1:
        return {'build': 0, 'use': 0}
    if variant == 'b3':
        return {'build': 1 if seed <= 3 else 3, 'use': 0}
    if seed <= 3:
        return {'build': 1, 'use': 1}
    return {'build': 3, 'use': 5}


def maxflow_assign(items, homes_of, cap):
    """items: keys; homes_of[k]: basket idx list; cap[i]: slots. Returns {k: basket} for assigned."""
    keys = [k for k in items if homes_of.get(k)]
    n = 2 + len(keys) + len(cap)
    g = [[] for _ in range(n)]
    def add(u, v, c):
        g[u].append([v, c, len(g[v])]); g[v].append([u, 0, len(g[u]) - 1])
    S, T, P0, L0 = 0, 1, 2, 2 + len(keys)
    for j, k in enumerate(keys):
        add(S, P0 + j, 1)
        for i in homes_of[k]: add(P0 + j, L0 + i, 1)
    for i, c in enumerate(cap):
        if c > 0: add(L0 + i, T, c)
    while True:  # Dinic
        lvl = [-1] * n; lvl[S] = 0; q = deque([S])
        while q:
            u = q.popleft()
            for v, c, _ in g[u]:
                if c > 0 and lvl[v] < 0: lvl[v] = lvl[u] + 1; q.append(v)
        if lvl[T] < 0: break
        it = [0] * n
        def dfs(u, f):
            if u == T: return f
            while it[u] < len(g[u]):
                e = g[u][it[u]]; v, c, r = e
                if c > 0 and lvl[v] == lvl[u] + 1:
                    d = dfs(v, min(f, c))
                    if d: e[1] -= d; g[v][r][1] += d; return d
                it[u] += 1
            return 0
        while dfs(S, 1 << 30): pass
    out = {}
    for j, k in enumerate(keys):
        for v, c, _ in g[P0 + j]:
            if v >= L0 and c == 0: out[k] = v - L0
    return out


def main():
    m = json.load(open(sys.argv[1]))
    src = json.load(open(sys.argv[2]))['seeds']

    # v2 played total: build/use rows under is_new LEGOs, whole course (S0001-S0316 + S1001-S1668).
    v2 = Counter()
    for s in src:
        for l in s['legos']:
            if l['is_new']: v2['played_legos'] += 1
            for p in l['basket_phrases']:
                if p['phrase_role'] in ('build', 'use'):
                    v2['played_rows' if l['is_new'] else 'dark_rows'] += 1
    v2_total = v2['played_rows']

    new = [l for l in m['legos'] if l['is_new']]
    rows = {}
    first = {}
    for i, l in enumerate(new):
        for r in l['reuse']: rows[r['k']] = r; first[r['k']] = i
    homes = {}
    bare_only = []
    for i, l in enumerate(new):
        lk = norm(l['target'])
        for k in [r['k'] for r in l['reuse']] + list(l.get('alsoHome', [])):
            if k != lk: homes.setdefault(k, []).append(i)
    for k in rows:
        if k not in homes: bare_only.append(k)
    voiced = [k for k, r in rows.items() if r['t12'] and k in homes]
    unvoiced = [k for k, r in rows.items() if not r['t12'] and k in homes]
    all_voiced_texts = {k for k, r in rows.items() if r['t12']} | {u['k'] for u in m['unplaced'] if u['t12']}
    gen_avg = {}
    for role in ('build', 'use'):
        L = [len(g['text']) for l in new for g in l['gen'] if g['role'] == role]
        gen_avg[role] = sum(L) / len(L)

    def run(variant):
        floors = [phrase_floor(l['seed'], l['idx'], variant) for l in new]
        res = {}
        # step 1: voiced originals, per role, into floor slots
        have = [Counter() for _ in new]
        placed_v = {}
        for role in ('build', 'use'):
            ks = [k for k in voiced if rows[k]['role'] == role]
            a = maxflow_assign(ks, homes, [f[role] for f in floors])
            for k in ks:
                i = a.get(k, first[k] if first[k] in homes[k] else homes[k][0])
                placed_v[k] = i; have[i][role] += 1
        short_A = [{r: max(0, floors[i][r] - have[i][r]) for r in ('build', 'use')} for i in range(len(new))]

        def topup(short, exclude):
            """generated phrases of the right role from the basket's own set; estimated where it runs out."""
            C = Counter()
            for i, l in enumerate(new):
                for role in ('build', 'use'):
                    need = short[i][role]
                    if not need: continue
                    cand = [g for g in l['gen'] if g['role'] == role and g['k'] not in all_voiced_texts and g['k'] not in exclude]
                    take = cand[:need]
                    C['phrases'] += need; C['from_generated'] += len(take); C['estimated'] += need - len(take)
                    C['chars1'] += sum(len(g['text']) for g in take) + round((need - len(take)) * gen_avg[role])
                    C['baskets'] += 0  # counted below
                if short[i]['build'] or short[i]['use']: C['baskets'] += 1
            return C

        # A
        tA = topup(short_A, set(rows))
        A = {'voiced_originals_reused': len(placed_v), 'new_phrases': tA['phrases'],
             'new_from_generated_text': tA['from_generated'], 'new_text_estimated': tA['estimated'],
             'clips': 2 * tA['phrases'], 'cartesia_chars': 2 * tA['chars1'], 'baskets_topped_up': tA['baskets'],
             'course_size': len(placed_v) + tA['phrases']}
        # B: unvoiced originals into the remaining floor slots, then the rest as extras; top up the remainder
        have_b = [Counter(h) for h in have]
        placed_u = {}
        for role in ('build', 'use'):
            ks = [k for k in unvoiced if rows[k]['role'] == role]
            a = maxflow_assign(ks, homes, [short_A[i][role] for i in range(len(new))])
            for k in ks:
                i = a.get(k, first[k] if first[k] in homes[k] else homes[k][0])
                placed_u[k] = i; have_b[i][role] += 1
        short_B = [{r: max(0, floors[i][r] - have_b[i][r]) for r in ('build', 'use')} for i in range(len(new))]
        tB = topup(short_B, set(rows))
        one_voice = sum(1 for k in placed_u if rows[k]['any'])
        u_chars1 = sum(len(rows[k]['text']) for k in placed_u)
        u_chars_needed = sum(len(rows[k]['text']) * (1 if rows[k]['any'] else 2) for k in placed_u)
        B = {'voiced_originals_reused': len(placed_v), 'unvoiced_originals_recorded': len(placed_u),
             'unvoiced_with_one_voice_already': one_voice, 'generated_topups': tB['phrases'],
             'new_phrases': len(placed_u) + tB['phrases'],
             'clips': 2 * len(placed_u) - one_voice + 2 * tB['phrases'],
             'cartesia_chars': u_chars_needed + 2 * tB['chars1'],
             'course_size': len(placed_v) + len(placed_u) + tB['phrases']}
        # C: same size as B, generated instead of unvoiced originals
        extra = B['course_size'] - A['course_size']
        pool = []  # (len) of generated phrases not used as A top-ups, not voiced, not an original's text
        used_A = Counter()
        for i, l in enumerate(new):
            for role in ('build', 'use'):
                cand = [g for g in l['gen'] if g['role'] == role and g['k'] not in all_voiced_texts and g['k'] not in rows]
                pool += [len(g['text']) for g in cand[short_A[i][role]:]]
        take = pool[:extra]
        C = {'voiced_originals_reused': len(placed_v), 'new_phrases': A['new_phrases'] + extra,
             'generated_extra_available': len(pool),
             'clips': 2 * (A['new_phrases'] + extra),
             'cartesia_chars': A['cartesia_chars'] + 2 * (sum(take) + round(max(0, extra - len(take)) * gen_avg['use'])),
             'course_size': A['course_size'] + extra}
        # D (fewest clips): unvoiced originals ONLY where they fill a floor slot, those with one voice
        # already first (1 clip each, vs 2 for anything else); the rest are left out, not recorded.
        have_d = [Counter(h) for h in have]
        placed_d = {}
        for tier in (True, False):
            for role in ('build', 'use'):
                ks = [k for k in unvoiced if rows[k]['role'] == role and bool(rows[k]['any']) == tier]
                a = maxflow_assign(ks, homes, [max(0, floors[i][role] - have_d[i][role]) for i in range(len(new))])
                for k, i in a.items():
                    placed_d[k] = i; have_d[i][role] += 1
        short_D = [{r: max(0, floors[i][r] - have_d[i][r]) for r in ('build', 'use')} for i in range(len(new))]
        tD = topup(short_D, set(rows))
        d1 = sum(1 for k in placed_d if rows[k]['any'])
        D = {'voiced_originals_reused': len(placed_v), 'unvoiced_originals_recorded': len(placed_d),
             'unvoiced_with_one_voice_already': d1, 'generated_topups': tD['phrases'],
             'new_phrases': len(placed_d) + tD['phrases'],
             'clips': 2 * len(placed_d) - d1 + 2 * tD['phrases'],
             'cartesia_chars': sum(len(rows[k]['text']) * (1 if rows[k]['any'] else 2) for k in placed_d) + 2 * tD['chars1'],
             'course_size': len(placed_v) + len(placed_d) + tD['phrases']}
        for o in (A, B, C, D):
            o['short_of_v2_total'] = max(0, v2_total - o['course_size'])
            o['extra_cost_to_v2_total_clips'] = 2 * o['short_of_v2_total']
            o['extra_cost_to_v2_total_chars_est'] = round(2 * o['short_of_v2_total'] * (gen_avg['build'] + gen_avg['use']) / 2)
        return {'A': A, 'B': B, 'C': C, 'D': D}

    out = {'v2': dict(v2), 'v2_total_used': v2_total, 'played_legos_kor': len(new),
           'fitting_originals': len(rows), 'voiced_fitting': sum(1 for r in rows.values() if r['t12']),
           'voiced_usable': len(voiced), 'unvoiced_usable': len(unvoiced), 'bare_only': len(bare_only),
           'bare_only_voiced': sum(1 for k in bare_only if rows[k]['t12']),
           'gen_avg_chars': gen_avg,
           'floor_phraseFloor_3B5U': run('p30'), 'floor_3B_only': run('b3')}
    print(json.dumps(out, indent=1))


if __name__ == '__main__':
    main()
