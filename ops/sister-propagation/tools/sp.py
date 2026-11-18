#!/usr/bin/env python3
"""cs #698·AI sister-course propagation: one plan -> live read -> render -> edit-batch, through Popty only.

plan.json = {"course", "purpose", "phrases":[{"id","known"?,"target"?}], "deletes":[id], "legos":[{"id","known"?,"target"?,"intro":bool}]}
  sp.py live    <dir>            GET live rows (lego basket / seed baskets / presentation) -> <dir>/live.json
  sp.py audio   <dir> dry|real   one render call per (role,text) -> <dir>/audio-<mode>.json ; real stops at the job budget
  sp.py ops     <dir> [--text-only]  -> <dir>/ops.json (expect = live text; clips linked in the same batch)
  sp.py post    <dir> dry|apply  edit-batch in chunks of 10 -> <dir>/dry.json | apply.json (+ undo)
  sp.py readback <dir>           -> <dir>/readback.json
"""
import json, sys, os, urllib.request, urllib.error, re
API = 'http://localhost:3470'
AGENT = 'cs-sister-propagation'
HERE = os.path.dirname(os.path.abspath(__file__))
LEDGER = os.environ.get('SP_LEDGER') or os.path.join(HERE, '..', 'budget-rest.json')   # running charsSpent ledger
CAP = int(os.environ.get('SP_CAP') or 4500)   # cs #702·AI: SP_LEDGER/SP_CAP for its own 45,000 cap

def call(method, path, body=None, timeout=180):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method,
                                 headers={'Content-Type': 'application/json', 'x-agent-id': AGENT})
    try:
        r = urllib.request.urlopen(req, timeout=timeout); return r.status, json.load(r)
    except urllib.error.HTTPError as h:
        raw = h.read() or b'{}'
        try: return h.code, json.loads(raw)
        except Exception: return h.code, {'raw': raw.decode()[:500]}
    except (TimeoutError, OSError) as e:   # cs #702·AI: a slow render must not kill the whole run; the re-run finds it in the library
        return 0, {'ok': False, 'code': 'CLIENT_TIMEOUT', 'error': str(e)[:200]}

def lego_of(pid): return re.match(r'(S\d{4}L\d{2})', pid).group(1)
def load(d, f): return json.load(open(os.path.join(d, f)))
def save(d, f, x): json.dump(x, open(os.path.join(d, f), 'w'), ensure_ascii=False, indent=1)

def live(d):
    P = load(d, 'plan.json'); C = P['course']; out = {'phrases': {}, 'legos': {}, 'intros': {}}
    ids = [p['id'] for p in P.get('phrases', [])] + P.get('deletes', [])
    baskets = {}
    for pid in ids:
        L = lego_of(pid)
        if L not in baskets: baskets[L] = {r['id'].split(':', 1)[1]: r for r in call('GET', f'/api/production/{C}/lego/{L}/basket')[1].get('phrases', [])}
        out['phrases'][pid] = baskets[L].get(pid)
    for l in P.get('legos', []):
        seed = l['id'][:5]
        st, b = call('GET', f'/api/production/{C}/seed/{seed}/baskets')
        out['legos'][l['id']] = b['baskets'].get(l['id'], {}).get('lego')
        out['legos'][l['id'] + '#seed'] = b.get('seed_pair')
        if l.get('intro'): out['intros'][l['id']] = call('GET', f'/api/production/{C}/presentation/{l["id"]}')[1]
    out['seeds'] = {}
    for sd in P.get('seeds', []):
        out['seeds'][str(sd['n'])] = call('GET', f'/api/production/{C}/seed/S{sd["n"]:04d}/baskets')[1].get('seed_pair')
    save(d, 'live.json', out)
    miss = [k for k, v in out['phrases'].items() if v is None]
    print('live', len(out['phrases']), 'phrases', len(out['legos']) // 2, 'legos; MISSING', miss)

def intro_text(d, lid, new_known):
    L = load(d, 'live.json'); old = L['intros'][lid]['text']
    # cs #702·AI: the English may hold apostrophes ("I don't think that"), so never regex on '[^']*'.
    # Unchanged English = the intro text verbatim (library link); changed = swap what sits between "for: '" and "', is:".
    if new_known == (L['legos'].get(lid) or {}).get('known'): return old
    i, j = old.find("for: '"), old.rfind("', is:")
    if i >= 0 and j > i: return old[:i + 6] + new_known + old[j:]
    raise SystemExit(f'intro text of {lid} has no "for: \'…\', is:" frame: {old!r}')

def asks(d):
    P = load(d, 'plan.json'); A = {}
    for p in P.get('phrases', []):
        if 'known' in p: A.setdefault(('known', p['known']), []).append(p['id'])
        if 'target' in p:
            for r in ('target1', 'target2'): A.setdefault((r, p['target']), []).append(p['id'])
    for sd in P.get('seeds', []):
        if 'known' in sd: A.setdefault(('known', sd['known']), []).append(f"seed {sd['n']}")
        if 'target' in sd:
            for r in ('target1', 'target2'): A.setdefault((r, sd['target']), []).append(f"seed {sd['n']}")
    for l in P.get('legos', []):
        if 'known' in l: A.setdefault(('known', l['known']), []).append(l['id'])
        if 'target' in l:
            for r in ('target1', 'target2'): A.setdefault((r, l['target']), []).append(l['id'])
        if l.get('intro'): A.setdefault(('presentation', intro_text(d, l['id'], l.get('known', load(d, 'live.json')['legos'][l['id']]['known']))), []).append(l['id'])
    return A

def audio(d, mode):
    P = load(d, 'plan.json'); dry = mode == 'dry'; out = {}
    ledger = json.load(open(LEDGER)) if os.path.exists(LEDGER) else {'spent': 0, 'calls': []}
    A = asks(d)
    if mode == 'estimate':   # dry runs capped per hour on live (BULK_DRY_RUN_ON_LIVE): upper bound = every char rendered
        est = sum(len(t) for (r, t) in A); print('ESTIMATE <=', est, 'ledger', ledger['spent'], 'cap', CAP); return
    prev = {}
    if not dry and os.path.exists(os.path.join(d, 'audio-real.json')):   # cs #702·AI: a re-run only asks for what has no clip yet
        try: prev = {(a['role'], a['text']): a for a in load(d, 'audio-real.json') if a.get('audioId')}
        except Exception: prev = {}
    for (role, text), ids in A.items():
        if (role, text) in prev:
            a = prev[(role, text)]; out[f'{role}|{text}'] = {'status': 200, 'rows': ids, 'ok': True, 'source': a.get('source'), 'audioId': a['audioId'], 'charsSpent': 0}
            continue
        if not dry and ledger['spent'] + len(text) > CAP:
            out[f'{role}|{text}'] = {'status': 0, 'rows': ids, 'ok': False, 'code': 'JOB_BUDGET', 'message': 'not rendered: 4,500-char share would be exceeded'}
            print('SKIP budget', role, text[:60]); continue
        st, res = call('POST', '/api/audio/render', {'courseCode': P['course'], 'role': role, 'text': text, 'purpose': P['purpose'], 'dryRun': dry}, timeout=300)
        out[f'{role}|{text}'] = {'status': st, 'rows': ids, **{k: res.get(k) for k in ('ok', 'source', 'audioId', 'charsSpent', 'wouldSpendChars', 'code', 'error', 'message') if k in res}}
        if st == 409 and res.get('code') == 'EXISTS_IN_LANGUAGE' and res.get('existing'):
            # the route's own answer: these words are already recorded in this language — link that clip (0 chars),
            # preferring a clip of this course and this side (as #695·AI did)
            ex = sorted(res['existing'], key=lambda e: (e.get('courseCode') != P['course'], e.get('side') != role))
            out[f'{role}|{text}'].update({'audioId': ex[0]['audioId'], 'source': 'exists_in_language', 'voiceId': ex[0].get('voiceId')})
        if not dry and res.get('charsSpent'):
            ledger['spent'] += res['charsSpent']; ledger['calls'].append({'course': P['course'], 'role': role, 'text': text, 'chars': res['charsSpent'], 'audioId': res.get('audioId')})
            json.dump(ledger, open(LEDGER, 'w'), ensure_ascii=False, indent=1)
        print(st, role, res.get('source'), res.get('wouldSpendChars', res.get('charsSpent')), res.get('code') or '', text[:60], flush=True)
    save(d, f'audio-{mode}.json', out)
    if dry: print('WOULD SPEND', sum(v.get('wouldSpendChars') or 0 for v in out.values()))
    else:
        save(d, 'audio-real.json', [{'role': k.split('|', 1)[0], 'text': k.split('|', 1)[1], 'audioId': v.get('audioId'), 'source': v.get('source'), 'charsSpent': v.get('charsSpent'), 'rows': v['rows'], **({'voiceId': v['voiceId']} if v.get('voiceId') else {}), **({'code': v['code']} if v.get('code') else {})} for k, v in out.items()])
        print('SPENT', sum(v.get('charsSpent') or 0 for v in out.values()), 'ledger', ledger['spent'])

def ops(d, text_only):
    P = load(d, 'plan.json'); C = P['course']; L = load(d, 'live.json')
    A = {} if text_only else load(d, 'audio-real.json')
    clip = {(a['role'], a['text']): a['audioId'] for a in A} if A else {}
    def link(target, key, slot, role, text):
        if text_only: return []
        aid = clip.get((role, text))
        if not aid: raise SystemExit(f'no clip {role}|{text}')
        return [{'op': 'audio.link', 'target': target, **({'lego_id': key} if target == 'lego' else {'seed_number': key} if target == 'seed' else {'phrase_id': f'{C}:{key}'}), 'slot': slot, 'audio_id': aid}]
    O = []
    for sd in P.get('seeds', []):
        cur = L['seeds'][str(sd['n'])]; s = {}
        if 'known' in sd: s['known_text'] = sd['known']
        if 'target' in sd: s['target_text'] = sd['target']
        if 'roman' in sd: s['target_text_roman'] = sd['roman']
        O.append({'op': 'seed.update', 'seed_number': sd['n'], 'expect': {'known_text': cur['known'], 'target_text': cur['target']}, 'set': s})
        if 'known' in sd: O += link('seed', sd['n'], 'known', 'known', sd['known'])
        if 'target' in sd: O += link('seed', sd['n'], 'target1', 'target1', sd['target']) + link('seed', sd['n'], 'target2', 'target2', sd['target'])
    for l in P.get('legos', []):
        cur = L['legos'][l['id']]; s = {}
        if 'known' in l: s['known_text'] = l['known']
        if 'target' in l: s['target_text'] = l['target']
        if 'roman' in l: s['target_text_roman'] = l['roman']
        s.update(l.get('extra', {}))   # cs #702·AI: e.g. type / components for a re-cut
        O.append({'op': 'lego.update', 'lego_id': l['id'], 'expect': {'known_text': cur['known'], 'target_text': cur['target']}, 'set': s})
        if 'known' in l: O += link('lego', l['id'], 'known', 'known', l['known'])
        if 'target' in l: O += link('lego', l['id'], 'target1', 'target1', l['target']) + link('lego', l['id'], 'target2', 'target2', l['target'])
        if l.get('intro'): O += link('lego', l['id'], 'presentation', 'presentation', intro_text(d, l['id'], l.get('known', cur['known'])))
    for p in P.get('phrases', []):
        cur = L['phrases'][p['id']]; s = {}
        if 'known' in p: s['known_text'] = p['known']
        if 'target' in p: s['target_text'] = p['target']
        if 'roman' in p: s['target_text_roman'] = p['roman']
        s.update(p.get('extra', {}))
        O.append({'op': 'phrase.update', 'phrase_id': f'{C}:{p["id"]}', 'expect': {'known_text': cur['known_text'], 'target_text': cur['target_text']}, 'set': s})
        if 'known' in p: O += link('phrase', p['id'], 'known', 'known', p['known'])
        if 'target' in p: O += link('phrase', p['id'], 'target1', 'target1', p['target']) + link('phrase', p['id'], 'target2', 'target2', p['target'])
    for pid in P.get('deletes', []):
        cur = L['phrases'][pid]
        O.append({'op': 'phrase.delete', 'phrase_id': f'{C}:{pid}', 'expect': {'known_text': cur['known_text'], 'target_text': cur['target_text']}})
    save(d, 'ops.json', O); print('ops', len(O), 'text-only' if text_only else 'with clips')

def chunks(O):
    # keep an update together with its audio.link ops
    groups, g = [], []
    for o in O:
        if o['op'] != 'audio.link' and g: groups.append(g); g = []
        g.append(o)
    if g: groups.append(g)
    batch = []
    for g in groups:
        if batch and len(batch) + len(g) > 12: yield batch; batch = []
        batch += g
    if batch: yield batch

def post(d, mode):
    P = load(d, 'plan.json'); C = P['course']; O = load(d, 'ops.json'); res = []
    for i, b in enumerate(chunks(O)):
        body = {'ops': b, 'apply': mode == 'apply', 'reason': P['purpose']}
        st, r = call('POST', f'/api/production/{C}/edit-batch', body, timeout=120)
        res.append({'batch': i, 'status': st, 'n': len(b), 'result': r})
        print(i, st, len(b), r.get('ok'), r.get('eventId') or r.get('event_id') or '', (r.get('error') or r.get('code') or '')[:200] if isinstance(r.get('error') or r.get('code'), str) else r.get('error'), flush=True)
        if st >= 400 or r.get('ok') is False:
            if mode == 'apply': break
    save(d, f'{mode}.json', res)

def readback(d):
    P = load(d, 'plan.json'); C = P['course']; out = {}; bad = 0
    for p in P.get('phrases', []):
        r = {x['id'].split(':', 1)[1]: x for x in call('GET', f'/api/production/{C}/lego/{lego_of(p["id"])}/basket')[1].get('phrases', [])}.get(p['id'])
        ok = r and r['known_text'] == p.get('known', r['known_text']) and r['target_text'] == p.get('target', r['target_text'])
        out[p['id']] = {'ok': bool(ok), 'known': r and r['known_text'], 'target': r and r['target_text'], 'audio': r and [r['known_audio_id'], r['target1_audio_id'], r['target2_audio_id']]}
        bad += not ok
    for pid in P.get('deletes', []):
        r = {x['id'].split(':', 1)[1]: x for x in call('GET', f'/api/production/{C}/lego/{lego_of(pid)}/basket')[1].get('phrases', [])}.get(pid)
        out[pid] = {'ok': r is None, 'deleted': r is None}; bad += r is not None
    for l in P.get('legos', []):
        b = call('GET', f'/api/production/{C}/seed/{l["id"][:5]}/baskets')[1]['baskets'].get(l['id'], {}).get('lego', {})
        ok = b.get('known') == l.get('known', b.get('known')) and b.get('target') == l.get('target', b.get('target'))
        out[l['id']] = {'ok': ok, **b}; bad += not ok
    for sd in P.get('seeds', []):
        b = call('GET', f'/api/production/{C}/seed/S{sd["n"]:04d}/baskets')[1].get('seed_pair', {})
        ok = b.get('known') == sd.get('known', b.get('known')) and b.get('target') == sd.get('target', b.get('target'))
        out[f"seed {sd['n']}"] = {'ok': ok, **b}; bad += not ok
    save(d, 'readback.json', out); print('readback', len(out) - bad, '/', len(out))

if __name__ == '__main__':
    cmd, d = sys.argv[1], sys.argv[2]
    {'live': lambda: live(d), 'audio': lambda: audio(d, sys.argv[3]), 'ops': lambda: ops(d, '--text-only' in sys.argv),
     'post': lambda: post(d, sys.argv[3]), 'readback': lambda: readback(d)}[cmd]()
