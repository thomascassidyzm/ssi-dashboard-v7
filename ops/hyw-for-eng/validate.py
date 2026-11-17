#!/usr/bin/env python3
# Validate the hyw_for_eng authoring files against the canon's machine-checkable rules (cs #405·AI).
#   python3 ops/hyw-for-eng/validate.py [--seeds-only] [--range A-B]
# ERRORS (exit 1): seed English differs from the skeleton; a seed token no LEGO covers (S3); a LEGO not in its
# seed; LEGO over 8 syllables (L3); one English LEGO with two Western answers (K2/K4); a not-new LEGO with no
# earlier identical pair; a new LEGO repeating an earlier pair; an M LEGO word with no literal gloss;
# a phrase that does not contain its whole LEGO (P17); a phrase word not yet taught (P1/P2/K21);
# one English phrase prompt with two Western answers (P16); a bare-LEGO build phrase (P3); phrases under a
# not-new LEGO (P25); Eastern-only spellings. WARNINGS: thin baskets (P10/P30), LEGO known words absent from seed (L26).
import sys, re
from hywlib import *
args = sys.argv[1:]
seeds_only = '--seeds-only' in args
rng = None
if '--range' in args:
    a, b = args[args.index('--range') + 1].split('-'); rng = (int(a), int(b))
E_, W_ = [], []
def err(m): E_.append(m)
def warn(m): W_.append(m)
seeds, perr = load_seeds(); E_ += perr
eng = load_english(); gloss = load_gloss()
EAST = [r'և', r'ություն', r'^նա$', r'^նրա', r'^ինձ$', r'^վոր$', r'ում$', r'^դու$', r'^այստեղ$', r'^լինել$', r'^ասել$', r'^անել$', r'^հիմի$']
EAST_OK = {'ժամանակին', 'շատ', 'մեկնում', 'հարցում', 'հարցումներ', 'ներում', 'իրիկուն'}
def lint(text, where):
    for t in norm_tokens(text):
        if t in EAST_OK: continue
        for p in EAST:
            if re.search(p, t): err(f'{where}: Eastern-looking form "{t}" in "{text}"')
nums = [s['n'] for s in seeds]
if len(set(nums)) != len(nums): err('duplicate seed numbers')
pair_first = {}      # (known,target tokens) -> lego id
known_first = {}     # known -> (target tokens, lego id)
taught = set()       # tokens taught so far
taught_at = {}       # lego_id -> frozenset of taught tokens up to and including it
order = []
for s in sorted(seeds, key=lambda s: s['n']):
    n = s['n']
    if n not in eng: err(f"{s['where']}: seed {n} not in skeleton"); continue
    if s['known'] != eng[n]: err(f"{s['where']}: English differs from skeleton: \"{s['known']}\" vs \"{eng[n]}\"")
    st = norm_tokens(s['target']); lint(s['target'], s['where'])
    covered = set()
    if not s['legos']: err(f"{s['where']}: seed {n} has no LEGOs")
    for l in s['legos']:
        lid = lego_id(n, l['idx']); l['id'] = lid
        lt = norm_tokens(l['target']); l['tok'] = lt
        if not lt or not l['known']: err(f"{l['where']}: empty side"); continue
        pos = all_positions(lt, st)
        if pos is None: err(f"{l['where']}: LEGO \"{l['target']}\" is not in seed {n} \"{s['target']}\"")
        else: covered.update(pos)
        syl = syllables(l['target'])
        if syl > 8: err(f"{l['where']}: LEGO \"{l['target']}\" is {syl} syllables (cap 8)")
        k = norm_known(l['known']); key = (k, tuple(lt))
        if l['new']:
            if key in pair_first: err(f"{l['where']}: new LEGO \"{l['known']} | {l['target']}\" repeats {pair_first[key]}; mark it =")
            elif k in known_first and known_first[k][0] != tuple(lt):
                err(f"{l['where']}: ZUT: \"{l['known']}\" is \"{' '.join(known_first[k][0])}\" at {known_first[k][1]} and \"{l['target']}\" here")
            else: pair_first[key] = lid; known_first.setdefault(k, (tuple(lt), lid))
            if len(lt) > 1:
                for t in lt:
                    if t not in gloss: err(f"{l['where']}: M LEGO word \"{t}\" has no literal gloss in gloss.tsv")
            kw = set(re.findall(r"[a-z']+", l['known'].lower())) - {'to'}
            sw = set(re.findall(r"[a-z']+", s['known'].lower()))
            if kw - sw: warn(f"{l['where']}: L26 known words not in seed {n}: {sorted(kw - sw)} (\"{l['known']}\")")
        else:
            if key not in pair_first: err(f"{l['where']}: not-new LEGO \"{l['known']} | {l['target']}\" has no earlier identical pair")
        taught.update(lt); taught_at[lid] = frozenset(taught); order.append(l)
    miss = [st[i] for i in range(len(st)) if i not in covered]
    if miss: err(f"{s['where']}: seed {n} tokens not covered by any LEGO: {miss}")
want = set(range(1, 301)) if not rng else set(range(rng[0], rng[1] + 1))
have = set(nums)
nl = sum(1 for l in order if l['new'])
print(f'seeds {len(seeds)} (missing from 1-300: {len(set(range(1,301)) - have)}), LEGOs {len(order)} ({nl} new, {len(order)-nl} not-new)')
if not seeds_only:
    phrases, perr = load_phrases(); E_ += perr
    byid = {l['id']: l for l in order}
    prompt = {}
    for k, (t, lid) in known_first.items(): prompt[k] = (t, lid)
    for s in seeds: prompt.setdefault(norm_known(s['known']), (tuple(norm_tokens(s['target'])), f"seed {s['n']}"))
    np_ = 0
    for lid, ps in phrases.items():
        if lid not in byid: err(f'phrases: {lid} is not a LEGO'); continue
        l = byid[lid]
        if rng and not (rng[0] <= l['seed'] <= rng[1]): continue
        if not l['new'] and ps: err(f'phrases: {lid} is not-new and must have no phrases (P25)')
        seen = set()
        for p in ps:
            np_ += 1
            pt = norm_tokens(p['target']); lint(p['target'], p['where'])
            if not contains(l['tok'], pt) and subseq(l['tok'], pt) is None: err(f"{p['where']}: phrase does not contain LEGO {lid} \"{l['target']}\": \"{p['target']}\"")
            elif not contains(l['tok'], pt): warn(f"{p['where']}: LEGO {lid} is split inside the phrase (K49): \"{p['target']}\"")
            un = [t for t in pt if t not in taught_at[lid]]
            if un: err(f"{p['where']}: untaught at {lid}: {un} in \"{p['target']}\"")
            if p['role'] == 'build' and pt == l['tok'] and taught_at[lid] != frozenset(l['tok']): err(f"{p['where']}: build phrase is the bare LEGO (P3)")
            k = norm_known(p['known'])
            if k in prompt and prompt[k][0] != tuple(pt): err(f"{p['where']}: ZUT: \"{p['known']}\" is \"{' '.join(prompt[k][0])}\" at {prompt[k][1]} and \"{p['target']}\" here")
            prompt.setdefault(k, (tuple(pt), p['where']))
            if (k, tuple(pt)) in seen: err(f"{p['where']}: duplicate phrase in basket {lid}")
            seen.add((k, tuple(pt)))
    for l in order:
        if not l['new'] or l['seed'] not in want: continue
        if rng and not (rng[0] <= l['seed'] <= rng[1]): continue
        ps = phrases.get(l['id'], [])
        b = sum(1 for p in ps if p['role'] == 'build'); u = len(ps) - b
        if not ps: err(f"{l['id']} \"{l['known']} | {l['target']}\": new LEGO with no phrases (P30)")
        elif l['seed'] >= 6 and (b < 3 or u < 4): warn(f"{l['id']}: thin basket {b} build / {u} use")
    print(f'phrases {np_} in {len(phrases)} baskets')
for w in W_[:400]: print('WARN', w)
for e in E_[:300]: print('ERROR', e)
print(f'{len(E_)} error(s), {len(W_)} warning(s)')
sys.exit(1 if E_ else 0)
