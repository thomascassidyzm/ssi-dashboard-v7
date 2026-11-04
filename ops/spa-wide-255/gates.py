#!/usr/bin/env python3
"""gates.py <seeds.json> <proposals.jsonl> [--out checked.jsonl]
Mechanical checks on proposed fixes against a seeds snapshot (GET /api/production/spa_for_eng/seeds).
Proposal: {"id": phrase id (S0101L02U03) | LEGO id (S0101L02) | seed id (S0101), "after_known": str|null, "after_target": str|null,
           "pattern_known": str|null, "pattern_target": str|null}   (null after = unchanged; "DELETE" in after_target = delete a phrase)
Adds: before, untaught (target tokens new to the row and not taught by its position), contains_lego (phrase still holds its
LEGO on both sides, word-set test so K49 reorders pass), zut (played rows/LEGOs whose English equals the new English but whose
Spanish differs), dup_before (other played rows with the same before text on the changed side), pattern_rows (played rows whose
text contains the pattern string)."""
import json, sys, re, unicodedata
def norm(s): return re.sub(r'\s+', ' ', re.sub(r"[^\w'\s]", ' ', unicodedata.normalize('NFKC', s or '').lower())).strip()
def toks(s): return set(norm(s).split())
a = sys.argv[1:]; d = json.load(open(a[0]))
out = a[a.index('--out')+1] if '--out' in a else None
seeds = sorted(d['seeds'], key=lambda s: s['seed_number'])
rows, order, taught_at, legos, seedrow = {}, [], {}, {}, {}
taught = set()
for s in seeds:
    seedrow[s['seed_id']] = s
    for l in sorted(s['legos'], key=lambda l: l['lego_index']):
        taught |= toks(l['target_text'])
        for c in (l.get('components') or []):
            if c and c.get('target'): taught |= toks(c['target'])
        legos[l['lego_id']] = l; taught_at[l['lego_id']] = set(taught)
        for p in (l.get('basket_phrases') or []):
            pid = p['id'].split(':')[-1]
            rows[pid] = {'id': pid, 'lego': l['lego_id'], 'played': bool(l['is_new']) and p['phrase_role'] != 'component',
                         'role': p['phrase_role'], 'known': p['known_text'], 'target': p['target_text']}
    taught_at[s['seed_id']] = set(taught)
zut = {}
for r in rows.values():
    if r['played'] and r['role'] == 'use': zut.setdefault(norm(r['known']), set()).add((norm(r['target']), r['id']))
for l in legos.values():
    if l['is_new']: zut.setdefault(norm(l['known_text']), set()).add((norm(l['target_text']), l['lego_id']))
def check(p):
    i = p['id']; r = dict(p)
    if i in rows:
        row = rows[i]; bk, bt = row['known'], row['target']; tset = taught_at[row['lego']]; lg = legos[row['lego']]
    elif i in legos:
        lg = legos[i]; bk, bt = lg['known_text'], lg['target_text']; tset = taught_at[i]; row = None
    elif i in seedrow:
        s = seedrow[i]; bk, bt = s['known_text'], s['target_text']; tset = taught_at[i]; row = None; lg = None
    else:
        r['error'] = 'no such id in snapshot'; return r
    ak = p.get('after_known') or bk; at = p.get('after_target') or bt
    r['before'] = [bk, bt]; r['after'] = [ak, at]
    if at != 'DELETE':
        new = toks(at) - toks(bt); r['untaught'] = sorted(w for w in new if w not in tset)
        if row:
            r['contains_lego'] = toks(lg['target_text']) <= toks(at) and (toks(lg['known_text']) <= toks(ak) or None)
            if r['contains_lego'] is None: r['contains_lego'] = 'target-yes/known-check'
        z = [x[1] for x in zut.get(norm(ak), ()) if x[0] != norm(at) and x[1] != i]
        r['zut'] = z[:10]
    side = 'target' if p.get('after_target') else 'known'
    bv = bt if side == 'target' else bk
    r['dup_before'] = [x['id'] for x in rows.values() if x['played'] and x['id'] != i and norm(x[side]) == norm(bv)][:20]
    pr = []
    for k, f in (('pattern_target', 'target'), ('pattern_known', 'known')):
        if p.get(k):
            pat = norm(p[k]); pr += [x['id'] for x in rows.values() if x['played'] and x['id'] != i and f' {pat} ' in f' {norm(x[f])} ']
    r['pattern_rows'] = sorted(set(pr))
    r['pattern_count'] = len(r['pattern_rows'])
    return r
res = [check(json.loads(l)) for l in open(a[1]) if l.strip()]
txt = '\n'.join(json.dumps(x, ensure_ascii=False) for x in res) + '\n'
if out: open(out, 'w').write(txt)
else: sys.stdout.write(txt)
