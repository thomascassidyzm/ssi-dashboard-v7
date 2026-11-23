#!/usr/bin/env python3
"""cym_for_kor (cs #813·AK) — LEGO plan helper. Reads files only; touches no database, no route.

  plan-tool.py draft FROM TO > draft.json
      For each seed, a proposed tiling in the seed's own surface (mutated) words:
        src=plan        the LEGO is already in the plan (any earlier plan/*.json) — its Korean gloss is filled in
        src=source      a split the source course (cym_nv2_for_eng S1000+n) has for this seed — Korean gloss to write
        src=source-old  a split from the source's older seeds S0001-S0316 — Korean gloss to write
        src=GAP         one word nothing covers — decide the shortest LEGO that teaches it
      The author's judgement (calibration rules) turns the draft into plan/NNNN-MMMM.json.

  plan-tool.py check [FROM TO]
      Validates every plan file together (seeds FROM..TO if given):
        - every seed word is tiled by that seed's LEGO targets (Popty's word-set rule, with Welsh ’n = yn)
        - no brackets / parentheses / slash in any gloss (Popty refuses them: NON_EXAMPLE_TEXT)
        - ZUT: one Korean gloss -> one Welsh LEGO (soft-mutated forms count as the same LEGO)
        - the same Welsh LEGO keeps one Korean gloss (a second gloss makes a second LEGO)
        - every seed in range has a plan entry
        - no LEGO over 8 syllables (Popty's cap; counted roughly as Welsh vowel groups)
"""
import json, re, sys, pathlib

HERE = pathlib.Path(__file__).resolve().parent
SEEDS = {s['seed_number']: s for s in json.load(open(HERE.parent / 'seeds-ko-draft.json'))['seeds']}
SRC = json.load(open(HERE / 'source-splits.json'))
NON_EXAMPLE = re.compile(r'[\[\]{}()（）［］｛｝]|(?<![0-9])/|/(?![0-9])')

SOFT = {'c': 'g', 'p': 'b', 't': 'd', 'g': '', 'b': 'f', 'd': 'dd', 'll': 'l', 'm': 'f', 'rh': 'r'}
ASP = {'c': 'ch', 'p': 'ph', 't': 'th'}
NAS = {'c': 'ngh', 'p': 'mh', 't': 'nh', 'g': 'ng', 'b': 'm', 'd': 'n'}


def w(t):
    t = t.lower().replace('’', "'").replace('‘', "'")
    return [x for x in re.split(r"[\s?!.,;:]+", t) if x]


def radicals(word):
    """Every radical a (possibly mutated) Welsh word could come from, itself included."""
    out = {word}
    for table in (SOFT, ASP, NAS):
        for rad, mut in table.items():
            if mut and word.startswith(mut):
                out.add(rad + word[len(mut):])
    if word[:1] in "aeiouwyâêîôûŵŷ'":
        out.add('g' + word)
    return out


def same_word(a, b):
    return a == b or bool(radicals(a) & radicals(b))


def same_lego(a, b):
    wa, wb = w(a), w(b)
    return len(wa) == len(wb) and all(same_word(x, y) for x, y in zip(wa, wb))


def load_plan():
    plan = {}
    for p in sorted((HERE / 'plan').glob('*.json')):
        for k, v in json.load(open(p))['seeds'].items():
            plan[int(k)] = v
    return plan


def expand_n(word):
    # "fo'n" -> fo + yn ; "mae'n" -> mae + yn (Popty's welshExpandYn, roughly)
    if word.endswith("'n") and len(word) > 2:
        return [word[:-2], 'yn']
    return [word]


def tiled(seed_cy, lego_cys):
    have = set()
    for c in lego_cys:
        for x in w(c):
            have.add(x)
            have.update(expand_n(x))
    return [x for x in w(seed_cy) if x not in have and not all(y in have for y in expand_n(x))]


def draft(lo, hi):
    plan = load_plan()
    inv = []  # (cy, ko) in plan order
    for n in sorted(plan):
        for l in plan[n]['legos']:
            inv.append((l['cy'], l['ko']))
    older = SRC['older']
    out = {}
    for n in range(lo, hi + 1):
        s = SEEDS[n]
        st = w(s['welsh'])
        surf = re.split(r"[\s]+", s['welsh'].replace('?', '').replace('!', '').replace(',', ''))
        surf = [x for x in surf if x]
        own = [(l['cy'], l['en'], 'source') for l in SRC['hc'][str(n)]['legos']]
        cands = own + [(cy, ko, 'plan') for cy, ko in inv] + [(cy, v['en'], 'source-old') for cy, v in older.items()]
        i, tiles = 0, []
        while i < len(st):
            best = None
            for cy, gl, src in cands:
                lt = w(cy)
                if lt and i + len(lt) <= len(st) and all(same_word(st[i + j], lt[j]) for j in range(len(lt))):
                    rank = (len(lt), {'plan': 3, 'source': 2, 'source-old': 1}[src])
                    if best is None or rank > best[0]:
                        best = (rank, cy, gl, src)
            if best:
                k = best[0][0]
                tile = {'cy': ' '.join(surf[i:i + k]), 'src': best[3]}
                if best[3] == 'plan':
                    tile['ko'] = best[2]
                    if tile['cy'].lower() != best[1].lower():
                        tile['note'] = f"mutated form of plan LEGO {best[1]}"
                else:
                    tile['en'] = best[2]
                tiles.append(tile)
                i += k
            else:
                tiles.append({'cy': surf[i] if i < len(surf) else st[i], 'src': 'GAP'})
                i += 1
        out[n] = {'cy_seed': s['welsh'], 'ko_seed': s['korean'], 'en_seed': s['english'], 'tiles': tiles}
    json.dump(out, sys.stdout, ensure_ascii=False, indent=1)


def check(lo=None, hi=None):
    plan = load_plan()
    probs = []
    rng = range(lo, hi + 1) if lo else sorted(plan)
    for n in rng:
        if n not in plan:
            probs.append(f'S{n}: no plan entry')
            continue
        legos = plan[n]['legos']
        miss = tiled(SEEDS[n]['welsh'], [l['cy'] for l in legos])
        if miss:
            probs.append(f'S{n}: untiled {miss}')
        for l in legos:
            syl = len(re.findall(r"[aeiouwyâêîôûŵŷ]+", l['cy'].lower()))
            if syl > 8:
                probs.append(f'S{n}: LEGO "{l["cy"]}" ~{syl} syllables (cap 8)')
            if not l.get('ko') or NON_EXAMPLE.search(l['ko']) or NON_EXAMPLE.search(l['cy']):
                probs.append(f'S{n}: bad text {l}')
    g2c, c2g = {}, {}
    for n in sorted(plan):
        for l in plan[n]['legos']:
            g2c.setdefault(l['ko'], []).append((n, l['cy']))
            c2g.setdefault(l['cy'].lower().replace('’', "'"), set()).add(l['ko'])
    for g, uses in g2c.items():
        first = uses[0][1]
        for n, cy in uses[1:]:
            if not same_lego(first, cy):
                probs.append(f'ZUT S{n}: gloss "{g}" = "{cy}" but S{uses[0][0]} has "{first}"')
    for cy, gs in c2g.items():
        if len(gs) > 1:
            probs.append(f'two glosses for "{cy}": {sorted(gs)}')
    print('\n'.join(probs) if probs else 'clean')
    print(f'{len(plan)} seeds planned', file=sys.stderr)
    return 1 if probs else 0


if __name__ == '__main__':
    if sys.argv[1] == 'draft':
        draft(int(sys.argv[2]), int(sys.argv[3]))
    else:
        sys.exit(check(*(int(x) for x in sys.argv[2:4])) if len(sys.argv) > 2 else check())
