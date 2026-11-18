"""cs #703·AI item-6 apply, through Popty's HTTP routes only (no database access of its own).

  apply.py prepare <course>            fresh live dump (ops/paid-cleanup-scan-447/dump-course.py → Popty script-view),
                                       compare every plan entry with the live row, write applied/<course>/text.ops.json
                                       (ops carry "expect" = the live text, so a parallel edit aborts the batch) and stale.json
  apply.py audio <course> dry|real [cap]   POST /api/audio/render (library first) for every new known/target text;
                                       → applied/<course>/render-<mode>.json. A refusal stops a real run (a refusal is the answer).
  apply.py batch <course> dry|apply    ONE edit-batch: text ops + audio.link ops for the rendered clips (make-before-break:
                                       the new clip exists before the old link moves) → applied/<course>/batch-<mode>.json (+ undo)
  apply.py present <course> dry|real   re-render the presentation of every LEGO whose English changed (role presentation +
                                       legoId: the route links it to the LEGO); → applied/<course>/present-<mode>.json
  apply.py readback <course>           fresh live dump; every planned row checked for text and filled audio slots → readback.json

Rows listed in applied/<course>/skip.txt (one id per line) are left out (review disputes that could not be settled).
"""
import json, os, re, subprocess, sys, urllib.request, urllib.error
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
BASE = 'http://localhost:3470'
AGENT = 'cs-703-item6-wrong-target-form'
JOB = '#703·AI'
PURPOSE = 'paid-course cleanup item 6, wrong target-language form (Kai approved 18 Nov) cs #703·AI'
SCR = os.environ.get('ITEM6_DATA') or os.environ['CS_SCRATCH']
SPELL_ONLY = {('fra_for_eng', 'S0469L01B02'), ('fra_for_eng', 'S0555L04B02'), ('por_for_eng', 'S0434L05B01')}  # S0453L02B01 became a delete after review #723

def call(method, url, body=None, timeout=600):
    data = json.dumps(body, ensure_ascii=False).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={'Content-Type': 'application/json', 'x-agent-id': AGENT})
    try:
        r = urllib.request.urlopen(req, timeout=timeout); return r.status, json.load(r)
    except urllib.error.HTTPError as h:
        raw = h.read() or b'{}'
        try: return h.code, json.loads(raw)
        except Exception: return h.code, {'raw': raw.decode(errors='replace')[:500]}

def adir(c):
    d = f'{HERE}/applied/{c}'; os.makedirs(d, exist_ok=True); return d

def plan(c):
    P = json.load(open(f'{HERE}/plan.json'))['entries']
    skip = set(open(f'{adir(c)}/skip.txt').read().split()) if os.path.exists(f'{adir(c)}/skip.txt') else set()
    return [e for e in P if e['course'] == c and e['row'] not in skip], skip

def live_dump(c):
    out = f'{SCR}/live-{c}.json'
    subprocess.run([sys.executable, '-I', f'{ROOT}/ops/paid-cleanup-scan-447/dump-course.py', c, out, '700'], check=True)
    d = json.load(open(out)); idx = {}
    for s in d['seeds']:
        idx[f"SEED{s['n']}"] = ('seed', s, None, None)
        for l in s['legos']:
            idx[l['id']] = ('lego', s, l, None)
            for p in l['phrases']:
                if p['type'] == 'lego_debut':
                    l['_debut'] = p
                elif ':' in p['id']:
                    idx[p['id'].split(':')[-1]] = ('phrase', s, l, p)
    return idx

def slots_of(o, kind):
    """live audio ids of a row: phrase rows carry ka/t1/t2; a LEGO's live clips are on its lego_debut row; seeds are not in the dump"""
    if kind == 'phrase': return {'known': o.get('ka'), 'target1': o.get('t1'), 'target2': o.get('t2')}
    if kind == 'lego': dbt = o.get('_debut') or {}; return {'known': dbt.get('ka'), 'target1': dbt.get('t1'), 'target2': dbt.get('t2')}
    return {}

def prepare(c):
    E, skip = plan(c); idx = live_dump(c); ops = []; stale = []; olds = {}
    for e in E:
        if e['action'] not in ('edit', 'delete'): continue
        g = idx.get(e['row'])
        if not g: stale.append({'row': e['row'], 'why': 'row not found live'}); continue
        kind, s, l, p = g; o = p or l or s
        if (o['known'], o['target']) != (e['current']['known'], e['current']['target']):
            stale.append({'row': e['row'], 'why': 'changed since the plan', 'planned_from': e['current'], 'live': {'known': o['known'], 'target': o['target']}}); continue
        exp = {'known_text': o['known'], 'target_text': o['target']}
        olds[e['row']] = slots_of(o, kind)
        if e['action'] == 'delete':
            ops.append({'op': 'phrase.delete', 'phrase_id': f"{c}:{e['row']}", 'expect': exp}); continue
        st = {}
        if e['new']['known'] != o['known']: st['known_text'] = e['new']['known']
        if e['new']['target'] != o['target']: st['target_text'] = e['new']['target']
        if e['new'].get('is_new') is False: st['is_new'] = False
        if not st: continue
        if kind == 'seed': ops.append({'op': 'seed.update', 'seed_number': s['n'], 'set': st, 'expect': exp})
        elif kind == 'lego': ops.append({'op': 'lego.update', 'lego_id': e['row'], 'set': st, 'expect': exp})
        else: ops.append({'op': 'phrase.update', 'phrase_id': f"{c}:{e['row']}", 'set': st, 'expect': exp})
    json.dump({'ops': ops}, open(f'{adir(c)}/text.ops.json', 'w'), ensure_ascii=False, indent=1)
    json.dump(stale, open(f'{adir(c)}/stale.json', 'w'), ensure_ascii=False, indent=1)
    json.dump(olds, open(f'{adir(c)}/old-slots.json', 'w'), ensure_ascii=False, indent=1)
    print(c, 'ops', len(ops), 'stale', len(stale), 'skipped by review', len(skip))
    for x in stale: print('  STALE', x)

def needs(c):
    """(role, text, target kind, row id) for every slot whose words change; component tiles and spelling-only rows excluded"""
    E, _ = plan(c); ops = json.load(open(f'{adir(c)}/text.ops.json'))['ops']
    live = {o.get('phrase_id', '').split(':')[-1] or o.get('lego_id') or f"SEED{o.get('seed_number')}": o for o in ops if o['op'] != 'phrase.delete'}
    out = []
    for e in E:
        o = live.get(e['row'])
        if not o or re.search(r'C\d\d$', e['row']) or (c, e['row']) in SPELL_ONLY: continue
        tk = {'seed': 'seed', 'lego': 'lego'}.get(e['kind'], 'phrase')
        if 'known_text' in o['set']: out.append(('known', o['set']['known_text'], tk, e['row']))
        if 'target_text' in o['set']:
            out.append(('target1', o['set']['target_text'], tk, e['row'])); out.append(('target2', o['set']['target_text'], tk, e['row']))
    return out

def audio(c, mode, cap=30000):
    f = f'{adir(c)}/render-{mode}.json'
    done = json.load(open(f)) if os.path.exists(f) else {}
    spent = 0
    for role, text, tk, rid in needs(c):
        k = f'{role}|{text}'
        if k in done and (mode == 'dry' or done[k].get('ok')): continue
        st, r = call('POST', f'{BASE}/api/audio/render', {'courseCode': c, 'role': role, 'text': text, 'purpose': PURPOSE, 'dryRun': mode == 'dry', 'job': JOB})
        keep = {kk: r.get(kk) for kk in ('ok', 'source', 'audioId', 'charsSpent', 'wouldSpendChars', 'code', 'error', 'voiceId') if kk in r}
        keep['status'] = st
        if st == 409 and r.get('code') == 'EXISTS_IN_LANGUAGE':
            keep['existing'] = re.findall(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', json.dumps(r))
        done[k] = keep; json.dump(done, open(f, 'w'), ensure_ascii=False, indent=1)
        spent += r.get('charsSpent') or 0
        print(st, role, keep.get('source'), keep.get('charsSpent', keep.get('wouldSpendChars')), keep.get('code') or '', text[:60], flush=True)
        if mode == 'real' and st >= 400 and st != 409: print('REFUSED: stopping (a refusal is the answer)'); break
        if mode == 'real' and spent > cap: print('STOP: cap'); break
    vals = list(done.values())
    print(c, mode, 'clips', len(vals), 'library', sum(1 for v in vals if v.get('source') == 'library'),
          'chars', sum((v.get('charsSpent') if mode == 'real' else (v.get('wouldSpendChars') or v.get('charsSpent'))) or 0 for v in vals),
          'refused', sum(1 for v in vals if (v.get('status') or 200) >= 400))

def batch(c, mode):
    ops = list(json.load(open(f'{adir(c)}/text.ops.json'))['ops'])
    # ROMAN_STALE (services/shared/roman-sync.cjs): a changed target_text must carry its romanisation.
    # applied/<c>/roman.json {row_id: "romanisation"} supplies one read by hand; otherwise it is cleared
    # on purpose (null) — a blank shows the learner the right script, a stale one the old words.
    rf = f'{adir(c)}/roman.json'
    roman = json.load(open(rf)) if os.path.exists(rf) else {}
    for o in ops:
        s = o.get('set') or {}
        if 'target_text' in s and 'target_text_roman' not in s:
            rid = (o.get('phrase_id') or o.get('lego_id') or str(o.get('seed_number') or o.get('id') or '')).split(':')[-1]
            s['target_text_roman'] = roman.get(rid)
    rr =json.load(open(f'{adir(c)}/render-real.json')) if os.path.exists(f'{adir(c)}/render-real.json') else {}
    olds = json.load(open(f'{adir(c)}/old-slots.json'))
    for role, text, tk, rid in needs(c):
        r = rr.get(f'{role}|{text}') or {}
        aid = r.get('audioId') or (r.get('existing') or [None])[0]
        if not aid: continue
        op = {'op': 'audio.link', 'target': tk, 'slot': role, 'audio_id': aid}
        if tk == 'phrase': op['phrase_id'] = f'{c}:{rid}'
        elif tk == 'lego': op['lego_id'] = rid
        else: op['seed_number'] = int(rid[4:])
        ops.append(op)
    for rid in [r for (cc, r) in SPELL_ONLY if cc == c]:   # same words spoken: keep the clips the row already had
        for role, aid in (olds.get(rid) or {}).items():
            if aid and role != 'known':
                ops.append({'op': 'audio.link', 'target': 'phrase', 'phrase_id': f'{c}:{rid}', 'slot': role, 'audio_id': aid, 'allow_text_mismatch': True})
    body = {'ops': ops, 'apply': mode == 'apply'}
    st, res = call('POST', f'{BASE}/api/production/{c}/edit-batch', body)
    json.dump({'status': st, 'request': body, **res}, open(f'{adir(c)}/batch-{mode}.json', 'w'), ensure_ascii=False, indent=1)
    print(c, mode, st, {k: res.get(k) for k in ('ok', 'applied', 'event_id', 'eventId', 'error', 'code') if k in res}, 'ops', len(ops))
    for i, r in enumerate(res.get('results') or []):
        if r.get('error') or r.get('refused'): print('  ', i, json.dumps(r, ensure_ascii=False)[:300])

def present(c, mode):
    E, _ = plan(c); out = {}
    for e in E:
        if e['kind'] != 'lego' or e['action'] != 'edit' or e['new']['known'] == e['current']['known']: continue
        st, cur = call('GET', f"{BASE}/api/production/{c}/presentation/{e['row']}")
        old_t = cur.get('text') or ''
        new_t = old_t.replace(f"'{e['current']['known']}'", f"'{e['new']['known']}'")
        new_t = new_t.replace(e['current']['known'], e['new']['known']) if e['current']['known'] in new_t else new_t
        if new_t == old_t: out[e['row']] = {'skipped': 'old known not found in the intro text', 'text': old_t}; continue
        st, r = call('POST', f'{BASE}/api/audio/render', {'courseCode': c, 'role': 'presentation', 'text': new_t, 'legoId': e['row'], 'purpose': PURPOSE, 'dryRun': mode == 'dry', 'job': JOB})
        out[e['row']] = {'old': old_t, 'new': new_t, 'status': st, **{k: r.get(k) for k in ('ok', 'source', 'audioId', 'charsSpent', 'wouldSpendChars', 'code', 'error') if k in r}}
        print(st, e['row'], r.get('source'), r.get('charsSpent', r.get('wouldSpendChars')), r.get('code') or '', new_t[:90], flush=True)
        if mode == 'real' and st >= 400: print('REFUSED: stopping'); break
    json.dump(out, open(f'{adir(c)}/present-{mode}.json', 'w'), ensure_ascii=False, indent=1)

def readback(c):
    E, _ = plan(c); idx = live_dump(c); rep = []
    for e in E:
        g = idx.get(e['row'])
        if e['action'] == 'delete': rep.append({'row': e['row'], 'ok': g is None, 'state': 'gone' if g is None else 'STILL THERE'}); continue
        if e['action'] != 'edit': continue
        if not g: rep.append({'row': e['row'], 'ok': False, 'state': 'MISSING'}); continue
        kind, s, l, p = g; o = p or l or s
        txt_ok = (o['known'], o['target']) == (e['new']['known'], e['new']['target'])
        sl = slots_of(o, kind)
        empty = [k for k, v in sl.items() if not v] if (kind != 'seed' and not re.search(r'C\d\d$', e['row'])) else []
        rep.append({'row': e['row'], 'ok': txt_ok and not empty, 'text_ok': txt_ok, 'empty_slots': empty, 'slots': sl})
    json.dump(rep, open(f'{adir(c)}/readback.json', 'w'), ensure_ascii=False, indent=1)
    bad = [r for r in rep if not r['ok']]
    print(c, 'readback', len(rep), 'ok', len(rep) - len(bad), 'not ok', len(bad))
    for r in bad: print('  ', r)

if __name__ == '__main__':
    a = sys.argv
    {'prepare': lambda: prepare(a[2]), 'audio': lambda: audio(a[2], a[3], int(a[4]) if len(a) > 4 else 30000),
     'batch': lambda: batch(a[2], a[3]), 'present': lambda: present(a[2], a[3]), 'readback': lambda: readback(a[2])}[a[1]]()
