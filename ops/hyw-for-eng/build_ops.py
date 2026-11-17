#!/usr/bin/env python3
# Turn the authoring files into Popty edit-batch requests for hyw_for_eng and send them (cs #405·AI).
#   python3 build_ops.py seeds   [--apply]   seed.update (1-300 text + roman) and lego.insert, chunked on seed boundaries
#   python3 build_ops.py phrases [--apply]   phrase.insert for every basket, plus each seed sentence as a USE phrase (canon P26)
#   python3 build_ops.py known301 [--apply]  seeds 301-668: English only, copied from hye_for_eng (the skeleton wrote "hyw" for "Armenian")
# Dry run unless --apply. Writes only through POST :3470/api/production/hyw_for_eng/edit-batch. Event ids -> events.tsv.
import sys, json, os, urllib.request, datetime
from hywlib import *
from roman import roman
COURSE = 'hyw_for_eng'; API = os.environ.get('POPTY_API', 'http://localhost:3470')
HDR = {'Content-Type': 'application/json', 'x-agent-id': 'cs-405-AI-hyw-applier', 'x-agent-role': 'course-builder'}
CHUNK = 380
def post(ops, apply):
    req = urllib.request.Request(f'{API}/api/production/{COURSE}/edit-batch', data=json.dumps({'ops': ops, 'apply': apply}).encode(), headers=HDR, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=600) as r: return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or '{}')
def chunks(per_seed):
    cur = []; out = []
    for n, ops in per_seed:
        if cur and sum(len(o) for _, o in cur) + len(ops) > CHUNK: out.append(cur); cur = []
        cur.append((n, ops))
    if cur: out.append(cur)
    return out
def seed_ops():
    seeds, errs = load_seeds(); assert not errs, errs
    eng = load_english(); gloss = load_gloss(); per = []
    for s in sorted(seeds, key=lambda s: s['n']):
        ops = [{'op': 'seed.update', 'seed_number': s['n'], 'set': {'known_text': eng[s['n']], 'target_text': s['target'], 'target_text_roman': roman(s['target'])}}]
        for l in s['legos']:
            tok = norm_tokens(l['target'])
            row = {'seed_number': s['n'], 'lego_index': l['idx'], 'type': 'M' if len(tok) > 1 else 'A', 'is_new': l['new'],
                   'known_text': l['known'], 'target_text': l['target'], 'status': 'draft', 'target_text_roman': roman(l['target'])}
            if len(tok) > 1: row['components'] = [{'known': gloss[t], 'target': t} for t in tok]
            ops.append({'op': 'lego.insert', 'row': row})
        per.append((s['n'], ops))
    return per
def phrase_ops():
    seeds, errs = load_seeds(); assert not errs, errs
    phrases, errs = load_phrases(); assert not errs, errs
    taught = set(); taught_at = {}; legos = []
    for s in sorted(seeds, key=lambda s: s['n']):
        for l in s['legos']:
            l['id'] = lego_id(s['n'], l['idx']); l['tok'] = norm_tokens(l['target']); taught.update(l['tok']); taught_at[l['id']] = frozenset(taught); legos.append(l)
    new = [l for l in legos if l['new']]
    extra = {}  # lego id -> seed sentences added as USE (P26)
    for s in seeds:
        st = norm_tokens(s['target']); own = [l for l in s['legos'] if l['new'] and contains(l['tok'], st)]
        if own: host = own[-1]
        else:
            cand = [l for l in new if contains(l['tok'], st) and set(st) <= taught_at[l['id']]]
            earlier = [l for l in cand if l['seed'] < s['n']]
            host = earlier[-1] if earlier else (cand[0] if cand else None)
        if host is None: print(f"P26: seed {s['n']} has no basket to sit in"); continue
        have = [p for p in phrases.get(host['id'], []) if norm_tokens(p['target']) == st]
        if not have: extra.setdefault(host['id'], []).append({'role': 'use', 'known': s['known'], 'target': s['target'], 'seed_sentence': s['n']})
    per = []; total = 0
    for s in sorted(seeds, key=lambda s: s['n']):
        ops = []
        for l in s['legos']:
            ps = phrases.get(l['id'], []) + extra.get(l['id'], [])
            if not ps: continue
            ordered = [p for p in ps if p['role'] == 'build'] + [p for p in ps if p['role'] == 'use']
            nb = nu = 0
            for pos, p in enumerate(ordered, 1):
                if p['role'] == 'build': nb += 1; pid = f"{COURSE}:{l['id']}B{nb:02d}"
                else: nu += 1; pid = f"{COURSE}:{l['id']}U{nu:02d}"
                ops.append({'op': 'phrase.insert', 'row': {'id': pid, 'seed_number': s['n'], 'lego_index': l['idx'], 'known_text': p['known'], 'target_text': p['target'],
                            'phrase_role': p['role'], 'position': pos, 'introduce': True, 'status': 'draft', 'metadata': {'format': 'build_use'},
                            'target_text_roman': roman(p['target'])}})
        total += len(ops)
        if ops: per.append((s['n'], ops))
    print(f'{total} phrase rows ({sum(len(v) for v in extra.values())} of them seed sentences added under P26)')
    return per
def known301_ops():
    with urllib.request.urlopen(f'{API}/api/production/hye_for_eng/seeds?status=all', timeout=300) as r: src = json.load(r)['seeds']
    return [(s['seed_number'], [{'op': 'seed.update', 'seed_number': s['seed_number'], 'set': {'known_text': s['known_text']}}]) for s in sorted(src, key=lambda s: s['seed_number']) if s['seed_number'] > 300]
def main():
    mode = sys.argv[1]; apply = '--apply' in sys.argv
    only = None
    if '--seeds' in sys.argv:
        a, b = sys.argv[sys.argv.index('--seeds') + 1].split('-'); only = (int(a), int(b))
    per = {'seeds': seed_ops, 'phrases': phrase_ops, 'known301': known301_ops}[mode]()
    if only: per = [(n, o) for n, o in per if only[0] <= n <= only[1]]
    cs = chunks(per); ok = 0
    for i, c in enumerate(cs, 1):
        ops = [o for _, x in c for o in x]
        st, body = post(ops, apply)
        tag = f'{mode} chunk {i}/{len(cs)} seeds {c[0][0]}-{c[-1][0]} ({len(ops)} ops)'
        if st != 200 or not body.get('ok'):
            print(f"{tag}: REFUSED {st} {body.get('code','')} {body.get('error','')}")
            if body.get('index') is not None: print('  op:', json.dumps(ops[body['index']], ensure_ascii=False)[:600])
            if apply: sys.exit(1)
            continue
        ok += 1
        if body.get('applied'):
            print(f"{tag}: APPLIED event {body.get('event_id')} undo {body.get('undo_file')}")
            with open(os.path.join(HERE, 'events.tsv'), 'a', encoding='utf8') as f:
                f.write(f"{datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}\t{mode}\t{c[0][0]}-{c[-1][0]}\t{len(ops)}\t{body.get('event_id')}\t{body.get('undo_file')}\n")
        else: print(f'{tag}: dry run OK')
    print(f"{ok}/{len(cs)} chunk(s) {'applied' if apply else 'passed the dry run'}")
    sys.exit(0 if ok == len(cs) else 1)
main()
