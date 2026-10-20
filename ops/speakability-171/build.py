#!/usr/bin/env python3
"""Build the Speakability grid doc from inputs/ + tags/ + the metagraph store (job #171).

Run from the repo root:  python3 ops/speakability-171/build.py > out.md
Reads only files; no DB, no network. Pod-1 shapes/moves come from the store first
(services/shared/metagraph, walk set pod-1, rows g1..g231 = global_order) and from
tags/pod1-shapes-unplaced.tsv for the rows the store leaves unplaced.
"""
import collections, difflib, json, os, re, sys

D = 'ops/speakability-171/'
MG = 'services/shared/metagraph/'
L = ['0', '1', '2', '3', '4', '5', '6']
LN = {'0': 'Meta', '1': 'Basic needs', '2': 'Contributing', '3': 'Self & perspectives',
      '4': 'Involving others', '5': 'Sophisticated', '6': 'Register'}
Q = ['Q', 'R', 'S']


def tsv(p):
    rows = [l.rstrip('\n').split('\t') for l in open(p, encoding='utf8') if l.strip()]
    h = rows[0]
    return [dict(zip(h, r + [''] * (len(h) - len(r)))) for r in rows[1:]]


def clean_layer(v):
    v = (v or '').strip()
    return v if v in L else '?'


# ---------- inputs + tags ----------
seeds_in = {r['seed_id']: r['text'] for r in tsv(D + 'inputs/seeds.tsv')}
seed_tags = {}
for f in ('seeds-a.tsv', 'seeds-b.tsv'):
    p = D + 'tags/' + f
    if os.path.exists(p):
        for r in tsv(p):
            seed_tags[r['seed_id']] = r

pod_in = tsv(D + 'inputs/pod1-moveframe.tsv')          # the live 231-row pod-1 (Sarah's day)
pod_tag = {r['row']: r for r in tsv(D + 'tags/pod1-moveframe.tsv')}
env_in = tsv(D + 'inputs/environment.tsv')
env_tag = {r['row']: r for r in tsv(D + 'tags/environment.tsv')} if os.path.exists(D + 'tags/environment.tsv') else {}

# ---------- store shapes for pod-1 ----------
nodes = json.load(open(MG + 'nodes.json'))
moves = json.load(open(MG + 'moves.json'))
walk = json.load(open(MG + 'walks/pod-1.json'))
NODE = {x['id']: x for x in nodes['nodes'] + nodes['bound_pairs']}
FAM = {x['id']: x for x in moves['moves']}
shape = collections.defaultdict(set); fm = collections.defaultdict(set)


def step(st):
    rows = ([st['row']] if st.get('row') else []) + [v['row'] for v in st.get('surface_variants') or []]
    for r in rows:
        g = int(r[1:])
        if st.get('node'): shape[g].add(f"{st['node']}.{st.get('position')}")
        if st.get('composed_in'): shape[g].add(f"{st['composed_in']['node']}.{st['composed_in']['position']}")
        if st.get('move'): fm[g].add(st['move'])
    for b in st.get('branches') or []:
        if b.get('row'):
            g = int(b['row'][1:]); shape[g].add(f"{st['node']}.{st.get('position')}")
            if b.get('move'): fm[g].add(b['move'])


for wk in walk.get('walks', []):
    for st in wk.get('steps', []): step(st)
for x in NODE.values():
    for a in x.get('attestations', {}).get('corpus', []):
        gs = re.findall(r'g(\d+)', a)
        for i, g in enumerate(gs):
            shape[int(g)].add(f"{x['id']}.{i + 1}" if len(gs) == len(x['positions']) else f"{x['id']}.?")
for x in moves['moves']:
    for g in x['rows']: fm[int(g[1:])].add(x['id'])
codas = {int(c['row'][1:]) for c in walk.get('codas', [])}
for r in tsv(D + 'tags/pod1-shapes-unplaced.tsv'):
    g = int(r['row'])
    if r['shape'] != 'none': shape[g].add(r['shape'])
    else: shape[g].add('none')
    if r['fmove'] != 'none': fm[g].add(r['fmove'])
for g in codas: shape[g].add('coda')


def nodes_of(shapes):
    out = sorted({s.split('.')[0] for s in shapes})
    if len(out) > 1 and 'none' in out: out.remove('none')
    return out


# ---------- unit lists ----------
pod_rows = []  # modal rows only
for r in pod_in:
    if r['row'].endswith('v'): continue
    g = int(r['row'][1:]); t = pod_tag.get(r['row'], {})
    pod_rows.append(dict(id=f'g{g}', scene=int(r['scene']), speaker=r['speaker'], text=r['known_text'],
                         layer=clean_layer(t.get('layer')), layer2=t.get('layer2', ''), qrs=t.get('qrs', '?'),
                         move=t.get('move', ''), shapes=nodes_of(shape.get(g, {'none'})),
                         pos=sorted(shape.get(g, [])), fmove=sorted(fm.get(g, []))))
env_rows = []
for r in env_in:
    t = env_tag.get(r['row'], {})
    sh = (t.get('shape') or 'none').replace(' ', '')
    env_rows.append(dict(id=r['row'], scene=r['turn'], speaker=r['speaker'], text=r['known_text'],
                         layer=clean_layer(t.get('layer')), layer2=t.get('layer2', ''), qrs=t.get('qrs', '?'),
                         move=t.get('move', ''), shapes=nodes_of(re.split(r'[,+/]', sh)),
                         pos=re.split(r'[,+/]', sh), fmove=[x for x in re.split(r'[,+/ ]', t.get('fmove', '')) if x and x != 'none']))
seed_rows = [dict(id=k, text=v, layer=clean_layer(seed_tags.get(k, {}).get('layer')),
                  layer2=seed_tags.get(k, {}).get('layer2', ''), qrs=seed_tags.get(k, {}).get('qrs', '?').strip())
             for k, v in seeds_in.items()]

# ---------- variant check: does a per-language variant change a cell? ----------
var_changes = []
for r in pod_in:
    if not r['row'].endswith('v'): continue
    a, b = pod_tag.get(r['row'], {}), pod_tag.get(r['variant_of_row'], {})
    if (a.get('layer'), a.get('qrs')) != (b.get('layer'), b.get('qrs')):
        var_changes.append((r['variant_of_row'], r['known_text'], r['courses'], a.get('layer'), a.get('qrs'), b.get('layer'), b.get('qrs')))


# ---------- helpers ----------
def grid(rows):
    c = collections.Counter((r['layer'], r['qrs']) for r in rows)
    return c


def thin(n, total):
    return n == 0 or n <= max(2, round(total * 0.01))


out = []
P = out.append
total_s, total_p, total_e = len(seed_rows), len(pod_rows), len(env_rows)
gs, gp, ge = grid(seed_rows), grid(pod_rows), grid(env_rows)

P('# Speakability layers × Questions / Responses / Statements — and the metagraph\n')
P(f'Seeds: the {total_s} canonical seeds (canonical English, live from Popty). Pods: the live canonical pod-1 '
  f'(Sarah\'s day, {total_p} lines — the slate the metagraph\'s pod-1 walk indexes as g1–g{total_p}) and the '
  f'environment conversation (Tom and Aran, {total_e} lines). Every count below is from a tag on a real line; '
  'every example is quoted verbatim.\n')

P('## 1. The grid: layer × Q / R / S\n')
P('Each cell: **seeds · pod-1 · environment**. ⚠ marks a cell that is empty or thin (≤1% of its column, minimum 2) in the seeds.\n')
P('| Layer | Q (asks) | R (responds) | S (states) |')
P('|---|---|---|---|')
for l in L:
    cells = []
    for q in Q:
        s, p, e = gs[(l, q)], gp[(l, q)], ge[(l, q)]
        mark = ' ⚠' if thin(s, total_s) else ''
        cells.append(f'{s} · {p} · {e}{mark}')
    P(f'| {l} {LN[l]} | ' + ' | '.join(cells) + ' |')
tot = lambda g, q: sum(g[(l, q)] for l in L)
P('| **All** | ' + ' | '.join(f'{tot(gs, q)} · {tot(gp, q)} · {tot(ge, q)}' for q in Q) + ' |\n')
unk = [r['id'] for r in seed_rows if r['layer'] == '?' or r['qrs'] not in Q]
if unk: P(f'*Untagged or malformed seed rows: {len(unk)} ({", ".join(unk[:10])}…).*\n')

# empty/thin cells with verbatim examples
P('### The empty and thin cells, with what the seeds DO give and what the pods show is missing\n')
for l in L:
    for q in Q:
        s = gs[(l, q)]
        if not thin(s, total_s): continue
        se = [r for r in seed_rows if r['layer'] == l and r['qrs'] == q][:3]
        pe = [r for r in pod_rows + env_rows if r['layer'] == l and r['qrs'] == q][:3]
        P(f'- **L{l} {LN[l]} × {q}** — seeds {s}, pod-1 {gp[(l, q)]}, environment {ge[(l, q)]}.')
        if se: P('  - seeds: ' + ' / '.join(f'"{r["text"]}" ({r["id"]})' for r in se))
        if pe: P('  - pods: ' + ' / '.join(f'"{r["text"]}" ({r["id"]})' for r in pe))
P('')

# early-course availability
P('### When each cell first opens in the seed order\n')
P('The first seed that fills each cell — the earliest point a learner could produce that kind of turn from seed material.\n')
P('| Layer | Q | R | S |'); P('|---|---|---|---|')
for l in L:
    row = []
    for q in Q:
        hit = [r for r in seed_rows if r['layer'] == l and r['qrs'] == q]
        hit.sort(key=lambda r: r['id'])
        row.append(f'{hit[0]["id"]} (+{len(hit) - 1})' if hit else '—')
    P(f'| {l} {LN[l]} | ' + ' | '.join(row) + ' |')
P('')
by_band = collections.OrderedDict()
for lo, hi in ((1, 30), (31, 100), (101, 200), (201, 400), (401, 668)):
    b = [r for r in seed_rows if lo <= int(r['id'][1:]) <= hi]
    by_band[f'S{lo:04d}–S{hi:04d}'] = collections.Counter(r['qrs'] for r in b)
P('Q / R / S share by seed band: ' + '; '.join(f'{k}: Q {v["Q"]}, R {v["R"]}, S {v["S"]}' for k, v in by_band.items()) + '.\n')

# ---------- layer x shape ----------
P('## 2. Layer × shape (pod turns, against the metagraph store)\n')
P('Shape = the store\'s exchange node or bound pair the line is a position in (pod-1: read off the store\'s pod-1 walk set and attestations, '
  'the rows it leaves unplaced tagged against it; environment: tagged against the store). A line in two nodes (composition) counts in both. '
  '"none" = no node in the store fits.\n')
allrows = [('pod-1', r) for r in pod_rows] + [('env', r) for r in env_rows]
ls = collections.Counter(); shape_tot = collections.Counter(); layer_tot = collections.Counter()
for src, r in allrows:
    for n in r['shapes']:
        if n == 'coda': continue
        ls[(r['layer'], n)] += 1; shape_tot[n] += 1
    layer_tot[r['layer']] += 1
shapes_seen = [n for n, _ in shape_tot.most_common()]


def sname(n):
    return 'no shape' if n == 'none' else f"{n} {NODE[n]['name']}" if n in NODE else n


P('| Shape | ' + ' | '.join(f'L{l}' for l in L) + ' | lines | layers it spans |')
P('|---|' + '---|' * (len(L) + 2))
for n in shapes_seen:
    cnts = [ls[(l, n)] for l in L]
    span = sum(1 for c in cnts if c)
    P(f'| {sname(n)} | ' + ' | '.join(str(c) if c else '·' for c in cnts) + f' | {shape_tot[n]} | {span} |')
P('')
unused = [n for n in NODE if n not in shape_tot]
P(f'**Shapes in the store that no pod line occupies ({len(unused)}):** ' + ', '.join(sname(n) for n in unused) + '.\n')
P('**Layer with no shape** — share of each layer\'s pod lines that sit in no node:\n')
for l in L:
    t = sum(1 for _, r in allrows if r['layer'] == l)
    if not t: P(f'- L{l} {LN[l]}: no pod lines at all.'); continue
    nn = sum(1 for _, r in allrows if r['layer'] == l and r['shapes'] == ['none'])
    ex = [r for _, r in allrows if r['layer'] == l and r['shapes'] == ['none']][:3]
    P(f'- L{l} {LN[l]}: {nn}/{t} unshaped' + (' — e.g. ' + ' / '.join(f'"{r["text"]}" ({r["id"]})' for r in ex) if ex else ''))
P('')
P('**Shape that is a layer** — a shape whose lines fall ≥80% in one layer (the layer is just a coordinate on it):\n')
for n in shapes_seen:
    if n == 'none' or shape_tot[n] < 3: continue
    best = max(L, key=lambda l: ls[(l, n)])
    if ls[(best, n)] / shape_tot[n] >= 0.8:
        P(f'- {sname(n)} → L{best} {LN[best]} ({ls[(best, n)]}/{shape_tot[n]})')
P('')
P('**Response moves (F-families) by layer** (pod lines that fill a response position):\n')
fl = collections.Counter(); ftot = collections.Counter()
for _, r in allrows:
    for f in r['fmove']:
        fl[(f, r['layer'])] += 1; ftot[f] += 1
P('| Move | ' + ' | '.join(f'L{l}' for l in L) + ' | lines |'); P('|---|' + '---|' * (len(L) + 1))
for f, c in ftot.most_common():
    nm = FAM[f]['name'] if f in FAM else f
    P(f'| {f} {nm} | ' + ' | '.join(str(fl[(f, l)]) if fl[(f, l)] else '·' for l in L) + f' | {c} |')
unusedF = [f for f in FAM if f not in ftot]
P(f'\nF-families no pod line fills: ' + ', '.join(f'{f} {FAM[f]["name"]}' for f in unusedF) + '.\n')

# ---------- flows as walks ----------
P('## 3. The repertoire: recurring flows, as walks over the metagraph\n')


def walks(rows, key):
    seqs = collections.OrderedDict()
    for r in rows:
        seqs.setdefault(r[key], []).append(r)
    return seqs


def node_seq(rs):
    seq = []
    for r in rs:
        ns = [n for n in r['shapes'] if n not in ('coda',)]
        n = ns[0] if ns else 'none'
        if not seq or seq[-1][0] != n: seq.append((n, [r]))
        else: seq[-1][1].append(r)
    return seq


bigr = collections.Counter(); bex = collections.defaultdict(list); bsrc = collections.defaultdict(set)
for src, rows, key in (('pod-1', pod_rows, 'scene'), ('env', env_rows, None)):
    rows = [r for r in rows if 'coda' not in r['shapes'] and not (src == 'pod-1' and 15 <= r['scene'] <= 21)]
    if key:
        groups = walks(rows, key).values()
    else:  # environment: one long walk, windowed by 40 lines
        groups = [rows[i:i + 40] for i in range(0, len(rows), 40)]
    for g in groups:
        seq = node_seq(g)
        for a, b in zip(seq, seq[1:]):
            if a[0] == 'none' and b[0] == 'none': continue
            k = (a[0], b[0]); bigr[k] += 1; bsrc[k].add(src)
            if len(bex[k]) < 2: bex[k].append((a[1][-1], b[1][0]))
P('Node-to-node transitions that recur (≥2), i.e. where one shape hands on to the next inside a conversation. '
  'Each with the hinge turns verbatim.\n')
for k, c in bigr.most_common():
    if c < 2: break
    a, b = k
    ex = bex[k][0]
    P(f'- **{sname(a)} → {sname(b)}** ×{c} ({", ".join(sorted(bsrc[k]))}): '
      f'"{ex[0]["text"]}" ({ex[0]["id"]}) → "{ex[1]["text"]}" ({ex[1]["id"]})')
P('')
P('The store\'s own complete pod-1 walks (named there, not here):\n')
for wk in walk.get('walks', []):
    ns = []
    for st in wk.get('steps', []):
        if st.get('node') and (not ns or ns[-1] != st['node']): ns.append(st['node'])
    first = next((st for st in wk['steps'] if st.get('surface')), None)
    P(f'- {wk["id"]} {wk.get("name", "")}: ' + ' → '.join(ns) + (f' — opens "{first["surface"]}"' if first else ''))
P('')

# move-label flows (the codebook layer, finer than shapes)
P('### Move sequences that recur (codebook move labels; runs of one move collapsed; ≥3 times)\n')
tri = collections.Counter(); tex = {}
for src, rows, key in (('pod-1', pod_rows, 'scene'), ('env', env_rows, None)):
    groups = walks(rows, key).values() if key else [rows]
    for g in groups:
        g = [r for r in g if 'coda' not in r['shapes'] and not (src == 'pod-1' and 15 <= r['scene'] <= 21)]
        ms, gg = [], []
        for r in g:  # collapse runs of the same move: a flow is a change of job
            m = r['move'].split('+')[-1] if r['move'] else ''
            if ms and ms[-1] == m: continue
            ms.append(m); gg.append(r)
        g = gg
        for i in range(len(g) - 2):
            k = tuple(ms[i:i + 3])
            if '' in k: continue
            tri[k] += 1; tex.setdefault(k, (src, g[i:i + 3]))
for k, c in tri.most_common(25):
    if c < 3: break
    src, ex = tex[k]
    P(f'- {" → ".join(k)} ×{c} — ' + ' / '.join(f'"{r["text"]}"' for r in ex) + f' ({ex[0]["id"]}–{ex[-1]["id"]})')
P('')

# flow-move counts
P('## 4. The conversation-flow moves themselves (codebook labels, pod lines, codas excluded)\n')
mc = collections.Counter()
for src, r in allrows:
    if 'coda' in r['shapes']: continue
    for m in r['move'].split('+'):
        if m: mc[(src, m)] += 1
keys = ['opening-greeting', 'how-are-you', 'how-are-you-answer', 'introduction', 'news-request', 'follow-up-question',
        'reciprocal-return', 'backchannel', 'reaction-positive', 'reaction-sympathy', 'reaction-surprise', 'agreement',
        'disagreement', 'hedge', 'repair-request', 'repair-give', 'word-search', 'check-understanding', 'topic-shift',
        'topic-close', 'invitation', 'plan-making', 'arrangement-confirm', 'contact-exchange', 'pre-closing', 'closing-farewell']
P('| Move | pod-1 | environment |'); P('|---|---|---|')
for k in keys: P(f'| {k} | {mc[("pod-1", k)] or "·"} | {mc[("env", k)] or "·"} |')
P('')

print('\n'.join(out))
