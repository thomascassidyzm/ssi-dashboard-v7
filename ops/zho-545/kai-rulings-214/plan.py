#!/usr/bin/env python3
# zho_for_eng #214 — turn rulings.py into Popty edit-batch ops, and check them first. Reads ONLY a saved
# GET /api/production/zho_for_eng/seeds dump; writes ops JSON files. No database access of any kind.
#   python3 plan.py <seeds.json> <outdir>
# Checks (each reported; the TO-rule renames that would create a LEGO-level one-English-two-Chinese clash are
# dropped automatically and listed as held):
#   P17 every build/use row under a changed LEGO still holds the LEGO (English words in order, a leading "to" optional —
#       Kai 4 Nov: the seed need not say "to"; Chinese contiguous), P1 no NEW untaught Chinese (whole taught chunks),
#   ZUT new LEGO-level and phrase-level clashes, duplicate rows in a basket, not-new only where an earlier LEGO matches.
import json, re, sys, copy, importlib.util, os
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('rulings', os.path.join(HERE, 'rulings.py')); R = importlib.util.module_from_spec(spec); spec.loader.exec_module(R)
C = 'zho_for_eng'
api = json.load(open(sys.argv[1])); OUT = sys.argv[2]; os.makedirs(OUT, exist_ok=True)

seeds, legos, phrases = {}, {}, {}
for s in api['seeds']:
    s = dict(s); ls = s.pop('legos') or []; seeds[s['seed_number']] = s
    for l in ls:
        l = dict(l); ps = l.pop('basket_phrases') or []; legos[l['lego_id']] = l
        for p in ps: phrases[p['id'].split(':', 1)[1]] = p
B = dict(seeds=copy.deepcopy(seeds), legos=copy.deepcopy(legos), phrases=copy.deepcopy(phrases))
order = lambda lid: (int(lid[1:5]), int(lid[6:8]))
nk = lambda s: re.sub(r'[.?!,]+$', '', (s or '').lower().strip())
PUNCT = re.compile(r"[\s，。？！、；：,.?!;:“”\"'‘’《》（）()…—-]")
han = lambda s: PUNCT.sub('', s or '')
held = list(R.HELD); notes = []

# ---------------- TO-RULE: renames + followers + not-new flips + LEGO ZUT ----------------
def lego_pairs(L): return {lid: (nk(l['known_text']), han(l['target_text'])) for lid, l in L.items()}
def lego_zut(L):
    by = {}
    for lid, l in L.items(): by.setdefault(nk(l['known_text']), set()).add(han(l['target_text']))
    return {k: v for k, v in by.items() if len(v) > 1}
zut_before = lego_zut(legos)

def apply_lego_sets(L, sets):
    for lid, st in sets.items():
        for k, v in st.items(): L[lid][k] = v

lego_set = {}    # lid -> {col: val}
def LS(lid, **kw): lego_set.setdefault(lid, {}).update(kw)
for lid, r in R.LEGO.items():
    if lid not in legos: sys.exit(f'no LEGO {lid}')
    if 'known' in r: LS(lid, known_text=r['known'])
    if 'target' in r: LS(lid, target_text=r['target'], target_text_roman=r.get('roman'))
    if 'type' in r: LS(lid, type=r['type'])
    if 'comps' in r: LS(lid, components=[{'known': k, 'target': t} for k, t in r['comps']] or None)
    if 'is_new' in r: LS(lid, is_new=r['is_new'])
for lid, patch in R.COMP_PATCH.items():
    LS(lid, components=[dict(c, known=patch.get(c.get('known'), c.get('known'))) for c in legos[lid]['components']])

to_applied = {}
for lid, new in R.TO_RULE.items():
    old = legos[lid]
    trial = copy.deepcopy(legos); apply_lego_sets(trial, lego_set)
    group = [lid] + [x for x, l in legos.items() if x != lid and order(x) > order(lid) and nk(l['known_text']) == nk(old['known_text'])
                     and han(l['target_text']) == han(old['target_text'])]
    for x in group: trial[x]['known_text'] = new
    z = lego_zut(trial); newclash = {k: v for k, v in z.items() if k not in zut_before or v != zut_before[k]}
    if nk(new) in newclash:
        others = [f"{x} {l['known_text']} | {l['target_text']}" for x, l in trial.items() if nk(l['known_text']) == nk(new) and han(l['target_text']) != han(old['target_text'])]
        held.append(('TO-rule', lid, f'"{old["known_text"]} | {old["target_text"]}" → "{new}" would clash with {"; ".join(others)} (one English, two Chinese) — not applied'))
        continue
    for x in group: LS(x, known_text=new); to_applied[x] = (legos[x]['known_text'], new)
    if len(group) > 1: notes.append(f'TO-rule {lid}: followers {group[1:]} (same old pair) re-glossed too')

A = dict(seeds=copy.deepcopy(seeds), legos=copy.deepcopy(legos), phrases=copy.deepcopy(phrases))
apply_lego_sets(A['legos'], lego_set)
# not-new flips: a NEW LEGO whose pair now equals an EARLIER LEGO's pair, where this job touched either side of the match
touched_l = set(lego_set)
pairs = lego_pairs(A['legos'])
for lid in sorted(A['legos'], key=order):
    l = A['legos'][lid]
    if not l['is_new']: continue
    earlier = [x for x in pairs if order(x) < order(lid) and pairs[x] == pairs[lid]]
    if earlier and (lid in touched_l or any(e in touched_l for e in earlier)):
        LS(lid, is_new=False); l['is_new'] = False
        notes.append(f'not-new: {lid} "{l["known_text"]} | {l["target_text"]}" now repeats {earlier[0]} on both sides')
# not-new LEGOs this job left without an earlier pair (L31)
for lid, l in A['legos'].items():
    if l['is_new'] is False and lid in touched_l and not [x for x in pairs if order(x) < order(lid) and pairs[x] == pairs[lid]]:
        notes.append(f'L31 WARNING: {lid} not-new with no earlier exact pair: {l["known_text"]} | {l["target_text"]}')
# not-new must match on both sides (explicit is_new=False in rulings too)
for lid, r in R.LEGO.items():
    if r.get('is_new') is False:
        l = A['legos'][lid]
        if not [x for x in pairs if order(x) < order(lid) and pairs[x] == pairs[lid]]: notes.append(f'NOT-NEW CHECK FAILED {lid}')

# B01 echoes of TO-rule renames: rows that are exactly the old LEGO pair follow it
phr_set = {pid: {} for pid in []}
def PSET(pid, **kw): phr_set.setdefault(pid, {}).update(kw)
echo_dels = set()
for lid, (oldk, newk) in to_applied.items():
    for pid, p in phrases.items():
        if pid.startswith(lid) and p['phrase_role'] != 'component' and p['known_text'] == oldk and han(p['target_text']) == han(legos[lid]['target_text']) and pid not in R.PHR:
            twin = [q for q, r in phrases.items() if q != pid and q[:8] == lid and r['phrase_role'] != 'component' and nk(r['known_text']) == nk(newk) and han(r['target_text']) == han(p['target_text'])]
            if twin: echo_dels.add(pid); notes.append(f'TO-rule echo {pid} "{oldk}" deleted: {twin[0]} already reads "{newk}"')
            else: PSET(pid, known_text=newk)
for pid, (k, t, r) in R.PHR.items():
    if pid not in phrases: sys.exit(f'no phrase {pid}')
    if k is not None and k != phrases[pid]['known_text']: PSET(pid, known_text=k)
    if t is not None and t != phrases[pid]['target_text']: PSET(pid, target_text=t, target_text_roman=r, word_count=len(han(t)))
seed_set = {}
for n, (k, t, r) in R.SEED.items():
    st = {}
    if k is not None: st['known_text'] = k
    if t is not None: st.update(target_text=t, target_text_roman=r)
    seed_set[n] = st
    # P26 copies: phrases carrying the seed's exact old pair follow it
    s = seeds[n]
    for pid, p in phrases.items():
        if p['phrase_role'] != 'component' and nk(p['known_text']) == nk(s['known_text']) and han(p['target_text']) == han(s['target_text']) and pid not in R.PHR:
            cp = {}
            if k is not None: cp['known_text'] = k
            if t is not None: cp.update(target_text=t, target_text_roman=r, word_count=len(han(t)))
            PSET(pid, **cp); notes.append(f'P26 copy of seed {n}: {pid} follows')
for pid, st in phr_set.items(): A['phrases'][pid].update(st)
for n, st in seed_set.items(): A['seeds'][n].update(st)
dels = set(R.DEL) | echo_dels
for lid in R.DEL_LEGO:
    for pid in list(A['phrases']):
        if pid.startswith(lid): dels.add(pid)
    del A['legos'][lid]
for pid in dels: A['phrases'].pop(pid, None)
for row in R.INS_LEGO:
    lid = f"S{row['seed_number']:04d}L{row['lego_index']:02d}"
    if lid in legos: sys.exit(f'{lid} exists')
    A['legos'][lid] = dict(row, lego_id=lid, presentation_audio_id=None)
for row in R.INS_PHR: A['phrases'][row['id'].split(':', 1)[1]] = dict(row)

# ---------------- checks ----------------
def words(s): return re.findall(r"[a-z0-9']+", (s or '').lower().replace('’', "'"))
def holds_en(phrase, lego_known):
    lw = words(lego_known); pw = words(phrase)
    if lw and lw[0] == 'to' and len(lw) > 1:
        return holds_seq(pw, lw) or holds_seq(pw, lw[1:])
    return holds_seq(pw, lw)
def stem(w):
    for suf in ('ing', 'ed', 'es', 's'):
        if len(w) > len(suf) + 2 and w.endswith(suf): w = w[:-len(suf)]; break
    return w.rstrip('e')
def holds_seq(pw, lw):
    i = 0
    for w in pw:
        if i < len(lw) and stem(w) == stem(lw[i]): i += 1
    return i == len(lw)
def chunks_for(lid, S, L):
    sn, ix = order(lid); texts = [s['target_text'] for n, s in S.items() if n < sn]
    for x, l in L.items():
        if order(x) <= (sn, ix):
            texts.append(l['target_text']); texts += [c.get('target', '') for c in (l.get('components') or []) if c]
    return sorted({han(t) for t in texts if han(t)}, key=len, reverse=True)
def uncovered(text, chunks):
    t = han(text); n = len(t); best = [10**9] * (n + 1); back = [None] * (n + 1); best[0] = 0
    byf = {}
    for c in chunks: byf.setdefault(c[0], []).append(c)
    for i in range(n):
        if best[i] >= 10**9: continue
        if best[i] + 1 < best[i + 1]: best[i + 1] = best[i] + 1; back[i + 1] = (i, True)
        for c in byf.get(t[i], []):
            if t.startswith(c, i) and best[i] < best[i + len(c)]: best[i + len(c)] = best[i]; back[i + len(c)] = (i, False)
    out = []; j = n
    while j > 0:
        f, miss = back[j]
        if miss: out.append(t[f])
        j = f
    return out[::-1]
problems = []
changed_legos = set(lego_set) | {f"S{r['seed_number']:04d}L{r['lego_index']:02d}" for r in R.INS_LEGO}
check_rows = set(phr_set) | {r['id'].split(':', 1)[1] for r in R.INS_PHR} | {pid for pid in A['phrases'] if pid[:8] in changed_legos}
for pid in sorted(check_rows):
    p = A['phrases'].get(pid)
    if not p: continue
    lid = pid[:8]; l = A['legos'].get(lid)
    if not l: problems.append(f'{pid}: no LEGO'); continue
    before = phrases.get(pid); lb = legos.get(lid)
    if p['phrase_role'] != 'component' and pid not in R.OVERRIDE_P17:
        was_en = before is not None and lb is not None and holds_en(before['known_text'], lb['known_text'])
        was_zh = before is not None and lb is not None and han(lb['target_text']) in han(before['target_text'])
        if not holds_en(p['known_text'], l['known_text']) and (was_en or before is None or before['known_text'] != p['known_text']): problems.append(f'P17-EN {pid}: "{p["known_text"]}" vs LEGO "{l["known_text"]}"')
        if han(l['target_text']) not in han(p['target_text']) and (was_zh or before is None or before['target_text'] != p['target_text']): problems.append(f'P17-ZH {pid}: {p["target_text"]} vs LEGO {l["target_text"]}')
    if before is None or before['target_text'] != p['target_text']:
        unA = uncovered(p['target_text'], chunks_for(lid, A['seeds'], A['legos']))
        unB = uncovered(before['target_text'], chunks_for(lid, seeds, legos)) if before else []
        new = list(unA)
        for c in unB:
            if c in new: new.remove(c)
        if new: problems.append(f'P1 {pid}: untaught {"".join(new)} in {p["target_text"]}')
# seed tiling for changed seeds (by the seed's last LEGO)
for n, st in seed_set.items():
    if 'target_text' not in st: continue
    own = sorted([x for x in A['legos'] if order(x)[0] == n], key=order)[-1]
    unA = uncovered(A['seeds'][n]['target_text'], chunks_for(own, A['seeds'], A['legos']))
    unB = uncovered(seeds[n]['target_text'], chunks_for(own, seeds, legos))
    new = list(unA)
    for c in unB:
        if c in new: new.remove(c)
    if new: notes.append(f'seed {n} introduces (allowed for seeds): {"".join(new)}')
# phrase-level ZUT (Kai: phrase clashes are not blockers; reported)
def pzut(S, L, P):
    by = {}
    for pid, p in P.items():
        if p['phrase_role'] == 'component': continue
        by.setdefault(nk(p['known_text']), {}).setdefault(han(p['target_text']), []).append(pid)
    return by
zb, za = pzut(seeds, legos, phrases), pzut(A['seeds'], A['legos'], A['phrases'])
for pid in sorted(check_rows):
    p = A['phrases'].get(pid)
    if not p or p['phrase_role'] == 'component': continue
    k = nk(p['known_text'])
    if len(za.get(k, {})) > 1 and za.get(k) != zb.get(k):
        notes.append(f'phrase ZUT {pid} "{p["known_text"]}": {json.dumps({t: v for t, v in za[k].items()}, ensure_ascii=False)}')
# duplicates in a basket
for pid in sorted(check_rows):
    p = A['phrases'].get(pid)
    if not p or p['phrase_role'] == 'component': continue
    tw = [q for q, r in A['phrases'].items() if q != pid and q[:8] == pid[:8] and r['phrase_role'] != 'component' and nk(r['known_text']) == nk(p['known_text']) and han(r['target_text']) == han(p['target_text'])]
    if tw: problems.append(f'DUP {pid} = {tw}')
p26_rows = []
for n in sorted({order(x)[0] for x in touched_l if x in A['legos']} | set(seed_set)):
    s = A['seeds'][n]
    home = [pid for pid, p in A['phrases'].items() if p['phrase_role'] != 'component' and nk(p['known_text']) == nk(s['known_text']) and han(p['target_text']) == han(s['target_text']) and A['legos'].get(pid[:8], {}).get('is_new')]
    wash = [pid for pid, p in phrases.items() if p['phrase_role'] != 'component' and nk(p['known_text']) == nk(seeds[n]['known_text']) and han(p['target_text']) == han(seeds[n]['target_text']) and legos.get(pid[:8], {}).get('is_new')]
    if wash and not home:
        cands = sorted([x for x, l in A['legos'].items() if l.get('is_new') and order(x)[0] == n], key=order, reverse=True) + \
                sorted([x for x, l in A['legos'].items() if l.get('is_new') and order(x)[0] < n], key=order, reverse=True)
        homed = None
        for x in cands:
            l = A['legos'][x]
            if not holds_en(s['known_text'], l['known_text']) or han(l['target_text']) not in han(s['target_text']): continue
            if order(x)[0] < n and uncovered(s['target_text'], chunks_for(x, A['seeds'], A['legos'])): continue
            homed = x; break
        if not homed: notes.append(f'P26 LISTED: seed {n} "{s["known_text"]}" has no played home (no new LEGO it contains)'); continue
        used = {pid[8:] for pid in A['phrases'] if pid[:8] == homed}
        k = 1
        while f'U{k:02d}' in used: k += 1
        nid = f'{homed}U{k:02d}'
        row = dict(id=f'{C}:{nid}', seed_number=order(homed)[0], lego_index=order(homed)[1], known_text=s['known_text'], target_text=s['target_text'],
                   target_text_roman=s.get('target_text_roman'), phrase_role='use', position=99, status='draft',
                   known_audio_id=s.get('known_audio_id'), target1_audio_id=s.get('target1_audio_id'), target2_audio_id=s.get('target2_audio_id'))
        p26_rows.append(row); A['phrases'][nid] = row
        notes.append(f'P26 REHOMED: seed {n} sentence added as {nid} under {homed} "{A["legos"][homed]["known_text"]}" (seed clips reused)')
za_l = lego_zut(A['legos'])
for k, v in za_l.items():
    if zut_before.get(k) != v: notes.append(f'LEGO ZUT now: "{k}" -> {sorted(v)} ({[x for x, l in A["legos"].items() if nk(l["known_text"]) == k]})')

# ---------------- ops ----------------
ops_text, ops_struct, ops_audio = [], [], []
ex = lambda r: {'known_text': r['known_text'], 'target_text': r['target_text']}
for lid in sorted(lego_set, key=order):
    st = {k: v for k, v in lego_set[lid].items() if legos[lid].get(k) != v}
    if not st: continue
    ops_text.append({'op': 'lego.update', 'lego_id': lid, 'set': st, 'expect': ex(legos[lid])})
    if ('known_text' in st or 'target_text' in st or st.get('is_new') is False) and lid not in R.PRES_MOVE and legos[lid].get('presentation_audio_id'):
        ops_audio.append({'op': 'audio.link', 'target': 'lego', 'lego_id': lid, 'slot': 'presentation', 'audio_id': None})
for dst, src in R.PRES_MOVE.items():
    ops_audio.append({'op': 'audio.link', 'target': 'lego', 'lego_id': dst, 'slot': 'presentation', 'audio_id': legos[src]['presentation_audio_id']})
for n, st in sorted(seed_set.items()):
    ops_text.append({'op': 'seed.update', 'seed_number': n, 'set': st, 'expect': ex(seeds[n])})
for pid, st in sorted(phr_set.items()):
    if pid in dels: continue
    ops_text.append({'op': 'phrase.update', 'phrase_id': f'{C}:{pid}', 'set': st, 'expect': ex(phrases[pid])})
for pid in sorted(dels):
    if pid[:8] in R.DEL_LEGO: continue
    ops_text.append({'op': 'phrase.delete', 'phrase_id': f'{C}:{pid}', 'expect': ex(phrases[pid])})
for lid in R.DEL_LEGO:
    ops_struct.append({'op': 'lego.delete', 'lego_id': lid, 'cascade_phrases': True})
for row in R.INS_LEGO:
    ops_struct.append({'op': 'lego.insert', 'row': {k: v for k, v in row.items()}})
for row in R.INS_PHR + p26_rows:
    ops_struct.append({'op': 'phrase.insert', 'row': dict(row, course_code=C, word_count=len(han(row['target_text'])), lego_count=1, metadata={'format': 'build_use'}, introduce=row['phrase_role'] == 'build')})
touched_seeds = {order(x)[0] for x in lego_set} | {int(p[1:5]) for p in phr_set} | set(seed_set) | {r['seed_number'] for r in R.INS_LEGO} | {int(p[1:5]) for p in dels}
unapprove = sorted(n for n in touched_seeds if seeds[n].get('approved_at'))
ops_unapprove = [{'op': 'seed.update', 'seed_number': n, 'set': {'approved_at': None}} for n in unapprove]

json.dump(dict(text=ops_text, struct=ops_struct, audio=ops_audio, unapprove=ops_unapprove), open(os.path.join(OUT, 'ops.json'), 'w'), ensure_ascii=False, indent=1)
json.dump(dict(held=held, notes=notes, problems=problems, to_applied=to_applied, unapprove=unapprove, pres=R.PRES), open(os.path.join(OUT, 'report.json'), 'w'), ensure_ascii=False, indent=1)
print(f'ops: {len(ops_text)} text, {len(ops_struct)} structural, {len(ops_audio)} audio links, {len(ops_unapprove)} unapprove; TO-rule applied {len(to_applied)}; held {len(held)}')
print('PROBLEMS', len(problems)); [print('  ', x) for x in problems]
print('NOTES', len(notes)); [print('  ', x) for x in notes]
print('HELD'); [print('  ', h[0], h[1], '—', h[2][:220]) for h in held]
