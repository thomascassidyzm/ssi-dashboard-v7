# cs #704·AI — re-record, in each course's CURRENT CAST VOICE, the 84 slots #694·AI left silent for voice reasons:
# 69 refused EXISTS_IN_LANGUAGE + 15 ara_eg/lb English prompts held as cross-voice (VOICE_MISMATCH at link-clip), now released
# by Kai ("Happy for you to handle the silent rows as well", 18 Nov). Shape copied from ops/zho-449/rerecord.py + link.py and
# ops/silent-fill-694/fill.cjs. Only Popty HTTP routes: script-view (read), /api/audio/render (no voiceId -> cast voice, Kai
# approval verified by x-cs-conv), /api/production/<c>/link-clip (fill-only, never replace). No retries; a refusal is the answer.
#   python3 -I rerecord.py live      -> live.json   (each slot re-read live; skipped if filled / edited / gone)
#   python3 -I rerecord.py dry|real  -> render-<mode>.json  (one render per distinct course,role,text; real stops at CAP)
#   python3 -I rerecord.py link      -> link.json   (fill-only link of each new clip)
#   python3 -I rerecord.py readback  -> readback.json (live slot now serves the new clip id)
import json, sys, os, re, urllib.request, collections
H = os.path.dirname(os.path.abspath(__file__)); MODE = sys.argv[1]; CAP = 6000; API = 'http://localhost:3470'; WHO = 'cs-704-silent-rerecord'
APPROVAL = 'kai:2026-11-18:silent rows follow-up, Kai approved 18 Nov (cs #694/#704)'
PURPOSE = 'cs #704·AI: re-record a silent played-row slot #694·AI left empty (EXISTS_IN_LANGUAGE / cross-voice), Kai approved 18 Nov'
COL = {'known': 'known', 'target1': 'target1', 'target2': 'target2'}
def call(method, url, body=None, conv=False):
    h = {'Content-Type': 'application/json', 'x-agent-id': WHO}
    if conv: h['x-cs-conv'] = os.environ['CS_CONV_TOKEN']
    req = urllib.request.Request(API + url, data=json.dumps(body).encode() if body is not None else None, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=300) as r: return {'status': r.status, **json.loads(r.read())}
    except urllib.error.HTTPError as e:
        try: return {'status': e.code, **json.loads(e.read())}
        except Exception: return {'status': e.code, 'ok': False, 'error': str(e)}
    except (TimeoutError, OSError) as e:  # client-side timeout: outcome unknown; recorded, never retried in this pass
        return {'status': None, 'ok': False, 'code': 'CLIENT_TIMEOUT', 'error': str(e)}
def live_rows(course, seeds):
    rows = {}
    for n in sorted(seeds):
        d = call('GET', f'/api/production/{course}/script-view?seedStart=S{n:04d}&seedEnd=S{n:04d}')
        for s in d.get('seeds') or []:
            for l in s['legos']:
                for p in l['phrases']: rows[p['id']] = {**p, 'lego_id': l['lego_id']}
    return rows
def is_uuid(x): return bool(re.match(r'^[0-9a-f-]{36}$', x, re.I))
def slot_live(slots):
    by = collections.defaultdict(set)
    for s in slots: by[s['course']].add(int(s['lego'][1:5]))
    live = {c: live_rows(c, ns) for c, ns in by.items()}
    for s in slots:
        p = live[s['course']].get(s['phraseId'])
        s['live'] = None if p is None else {'id': p['id'], 'known': p['known_text'], 'target': p['target_text'], 'clip': p[COL[s['role']] + '_audio_uuid']}
    return slots
if MODE == 'live':
    R = json.load(open(f'{H}/../silent-fill-694/live/readback.json'))
    slots = [{k: r[k] for k in ('course', 'phraseId', 'row', 'lego', 'type', 'role', 'text', 'result')} for r in R
             if r['result'] in ('refused:EXISTS_IN_LANGUAGE', 'held_kai_crossvoice')]
    slots = slot_live(slots); tally = collections.Counter()
    for s in slots:
        L = s['live']
        if L is None: s['skip'] = 'ROW_GONE'
        elif L['clip']: s['skip'] = 'FILLED_SINCE'
        else:
            t = L['known'] if s['role'] == 'known' else L['target']
            if t != s['text']: s['textChanged'] = {'was': s['text']}
            s['text'] = t; s['skip'] = None
        tally[s['skip'] or ('send-edited' if s.get('textChanged') else 'send')] += 1
    json.dump(slots, open(f'{H}/live.json', 'w'), ensure_ascii=False, indent=1); print(len(slots), dict(tally))
elif MODE in ('dry', 'real'):
    DRY = MODE == 'dry'; slots = [s for s in json.load(open(f'{H}/live.json')) if not s['skip']]
    cache = {}; spent = would = 0; out = []; stop = False
    if not DRY:  # cap by the dry run's price, courses in order; the real spend is also counted as it goes
        pass
    for s in slots:
        k = (s['course'], s['role'], s['text'])
        if k not in cache:
            if stop: r = {'ok': False, 'code': 'NOT_SENT', 'error': 'pass stopped after a hard refusal'}
            elif not DRY and spent + len(s['text']) > CAP: r = {'ok': False, 'code': 'CAP_STOP', 'error': f'job cap {CAP} chars'}
            else:
                r = call('POST', '/api/audio/render', {'courseCode': s['course'], 'role': s['role'], 'text': s['text'], 'purpose': PURPOSE,
                         'job': '#704·AI', 'dryRun': DRY, 'approval': APPROVAL}, conv=True)
                spent += r.get('charsSpent') or 0; would += r.get('wouldSpendChars') or 0
            cache[k] = r
            with open(f'{H}/render-{MODE}.log.jsonl', 'a') as lf: lf.write(json.dumps({'k': k, 'r': r}, ensure_ascii=False) + '\n')
            if not DRY and r.get('code') in ('DAILY_TOTAL_CAP', 'NOT_IN_CHAIN', 'APPROVAL_UNVERIFIED'): stop = True
            if not r.get('ok'): print('REFUSED', s['course'], s['row'], s['role'], json.dumps(r, ensure_ascii=False)[:300])
        r = cache[k]
        out.append({**{x: s[x] for x in ('course', 'phraseId', 'row', 'lego', 'role', 'text')}, 'source': r.get('source'), 'audioId': r.get('audioId'),
                    'voiceId': r.get('voiceId'), 'chars': r.get('charsSpent') or r.get('wouldSpendChars') or 0,
                    'error': None if r.get('ok') else {'code': r.get('code'), 'status': r.get('status'), 'message': (r.get('error') or r.get('message') or '')[:400]}})
    json.dump(out, open(f'{H}/render-{MODE}.json', 'w'), ensure_ascii=False, indent=1)
    print(MODE, len(out), 'slots', len(cache), 'distinct', dict(collections.Counter(o['source'] or o['error']['code'] for o in out)), 'charsSpent', spent, 'wouldSpend', would)
elif MODE == 'link':
    out = json.load(open(f'{H}/render-real.json')); res = []; t = collections.Counter()
    for o in out:
        if not o['audioId']: continue
        ref = {'legoId': o['lego']} if is_uuid(o['phraseId']) else {'phraseId': o['phraseId']}
        l = call('POST', f"/api/production/{o['course']}/link-clip", {'links': [{**ref, 'role': o['role'], 'audioId': o['audioId']}]})
        one = (l.get('results') or [l])[0]; ok = bool(l.get('ok') and one.get('ok') is not False)
        res.append({**o, 'link': {'ok': ok, 'status': l.get('status'), 'code': one.get('code') or l.get('code'), 'error': str(one.get('error') or l.get('error') or '')[:300] or None, 'eventId': l.get('eventId') or l.get('event_id')}})
        t[(o['course'], ok)] += 1
        if not ok: print('LINK FAILED', o['course'], o['row'], o['role'], res[-1]['link'])
    json.dump(res, open(f'{H}/link.json', 'w'), ensure_ascii=False, indent=1); print(dict(t))
elif MODE == 'readback':
    res = json.load(open(f'{H}/link.json')); slots = slot_live([dict(r) for r in res]); t = collections.Counter()
    for s in slots:
        now = (s['live'] or {}).get('clip'); s['servedNow'] = now; s['readback'] = 'serving-new' if now == s['audioId'] else 'MISMATCH'
        t[(s['course'], s['readback'], s['voiceId'])] += 1
        if s['readback'] != 'serving-new': print('MISMATCH', s['course'], s['row'], s['role'], now)
    json.dump(slots, open(f'{H}/readback.json', 'w'), ensure_ascii=False, indent=1)
    for k, v in sorted(t.items()): print(k, v)
