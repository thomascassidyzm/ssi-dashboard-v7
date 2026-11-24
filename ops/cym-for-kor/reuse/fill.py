#!/usr/bin/env python3
"""cym_for_kor reuse (cs #232): the MINIMUM new Welsh, by max-flow. Offline, reads match.cjs output.

  python3 ops/cym-for-kor/reuse/fill.py <match.json> > fill.json

Each played (is_new) cym_for_kor LEGO is a basket with a target size. Supply, cheapest first:
  - a source phrase that already has target1+target2 clip ids, placed under ANY new LEGO it is valid
    under (its first valid home or a later new LEGO it contains: match.cjs `reuse` / `alsoHome`);
  - a generated phrase in that basket whose Welsh text equals a voiced source text (links a clip).
Max-flow assigns voiced phrases to baskets (each phrase once, each basket up to its target) so the
number of empty slots is as small as possible. Every slot left is a NEW Welsh phrase to record
(2 clips: target1 + target2), filled first by the basket's own generated phrases (their Welsh exists,
their Korean exists), then by voiced-less source phrases. Cartesia characters = Welsh length x 2.
"""
import json, sys
from collections import deque, Counter

import re
norm = lambda t: ' '.join(re.sub(r'[.,!?;:]+', ' ', t.replace('’', "'").replace('‘', "'").lower()).split())
BANDS = [(1, 100), (101, 200), (201, 300), (301, 467), (468, 668)]
band = lambda n: next(f'{a}-{b}' for a, b in BANDS if a <= n <= b)


class Dinic:
    def __init__(self, n):
        self.n, self.g = n, [[] for _ in range(n)]

    def add(self, u, v, c):
        self.g[u].append([v, c, len(self.g[v])]); self.g[v].append([u, 0, len(self.g[u]) - 1])

    def flow(self, s, t):
        tot = 0
        while True:
            lvl = [-1] * self.n; lvl[s] = 0; q = deque([s])
            while q:
                u = q.popleft()
                for v, c, _ in self.g[u]:
                    if c > 0 and lvl[v] < 0: lvl[v] = lvl[u] + 1; q.append(v)
            if lvl[t] < 0: return tot
            it = [0] * self.n
            def dfs(u, f):
                if u == t: return f
                while it[u] < len(self.g[u]):
                    e = self.g[u][it[u]]; v, c, r = e
                    if c > 0 and lvl[v] == lvl[u] + 1:
                        d = dfs(v, min(f, c))
                        if d: e[1] -= d; self.g[v][r][1] += d; return d
                    it[u] += 1
                return 0
            while True:
                f = dfs(s, 1 << 30)
                if not f: break
                tot += f


def run(m, target_of, label):
    new = [l for l in m['legos'] if l['is_new']]
    rows = {}
    for l in m['legos']:
        for r in l['reuse']: rows[r['k']] = r
    # candidate baskets per voiced source phrase
    # P3: the bare LEGO on its own is not a BUILD phrase, so a phrase whose Welsh IS the basket's
    # LEGO is not offered to that basket.
    homes = {}
    bare = Counter()
    for i, l in enumerate(new):
        lk = norm(l['target'])
        for k in [r['k'] for r in l['reuse'] if r['t12']] + [k for k in l.get('alsoHome', []) if rows[k]['t12']]:
            if k == lk: bare[k] += 1; continue
            homes.setdefault(k, []).append(i)
    keys = list(homes)
    voicedtexts = {k for k, r in rows.items() if r['t12']}
    S, Tt = 0, 1
    P0, L0 = 2, 2 + len(keys)
    D = Dinic(L0 + len(new))
    freegen = []
    for j, k in enumerate(keys):
        D.add(S, P0 + j, 1)
        for i in homes[k]: D.add(P0 + j, L0 + i, 1)
    for i, l in enumerate(new):
        # generated phrases already voiced (same Welsh as a voiced source text) but not themselves a
        # placed source phrase: free, own basket only
        fg = [g for g in l['gen'] if g['k'] in m['voiced_all'] and g['k'] not in homes]
        freegen.append(fg)
        D.add(L0 + i, Tt, max(0, target_of(l) - len(fg)))
    D.flow(S, Tt)
    got = [0] * len(new)
    used = set()
    for j, k in enumerate(keys):
        for v, c, _ in D.g[P0 + j]:
            if v >= L0 and c == 0:
                got[v - L0] += 1; used.add(k)
    C = Counter(); CB = {f'{a}-{b}': Counter() for a, b in BANDS}
    for i, l in enumerate(new):
        tgt = target_of(l)
        free = got[i] + min(len(freegen[i]), tgt)
        short = max(0, tgt - free)
        fill_gen = [g for g in l['gen'] if g['k'] not in m['voiced_all']][:short]
        rest = short - len(fill_gen)
        avg = 30
        chars = 2 * (sum(len(g['text']) for g in fill_gen) + rest * avg)
        for X in (C, CB[band(l['seed'])]):
            X['baskets'] += 1; X['target_phrases'] += tgt
            X['voiced_source_used'] += got[i]; X['voiced_generated_used'] += min(len(freegen[i]), tgt)
            X['new_welsh_phrases'] += short; X['new_from_generated'] += len(fill_gen); X['new_to_write'] += rest
            X['new_clips'] += 2 * short; X['cartesia_chars'] += chars
            X['baskets_needing_recording'] += 1 if short else 0
            X['baskets_fully_voiced'] += 0 if short else 1
            X['korean_prompts_to_write'] += got[i] + 0  # generated rows already carry Korean
    return {'label': label, 'bare_lego_rows_refused': len(bare), 'total': C, 'by_band': CB, 'voiced_source_unused': len(keys) - len(used)}


if __name__ == '__main__':
    m = json.load(open(sys.argv[1]))
    m['voiced_all'] = {r['k'] for l in m['legos'] for r in l['reuse'] if r['t12']} | {u['k'] for u in m['unplaced'] if u['t12']}
    out = []
    out.append(run(m, lambda l: 11, 'a: v2 size, 11 per played LEGO (source S1001-S1668 = 10.50)'))
    out.append(run(m, lambda l: 8, 'a8: live cym_n_for_eng size, 8 per played LEGO (7.94)'))
    out.append(run(m, lambda l: max(11, len(l['gen'])), 'c: keep every basket at least as big as today (max(11, current))'))
    # option b: keep generated as is
    b = Counter(); bb = {f'{a}-{b_}': Counter() for a, b_ in BANDS}
    for l in m['legos']:
        if not l['is_new']: continue
        for g in l['gen']:
            for X in (b, bb[band(l['seed'])]):
                X['phrases'] += 1
                if g['k'] in m['voiced_all']: X['already_voiced'] += 1
                else: X['new_welsh_phrases'] += 1; X['new_clips'] += 2; X['cartesia_chars'] += 2 * len(g['text'])
    out.append({'label': 'b: keep the 15,238 generated phrases', 'total': b, 'by_band': bb})
    print(json.dumps(out, indent=1, default=dict))
