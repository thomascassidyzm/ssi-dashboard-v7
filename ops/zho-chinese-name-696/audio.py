# cs #696·AI — audio for the 中文→target-name known-side fix, through the ONE route POST /api/audio/render
# (library-first, spend guard, one render, no retries). Usage: python3 audio.py <course> dry|real [cap_remaining]
# Slots come from <course>.slots.json (plan.py). known: the row's new known text. presentation: the LEGO's current
# intro text (GET /presentation/:legoId) with 中文 → the course's name; a presentation render that names its LEGO binds
# itself (audio-render-entry.cjs linkLego). Known slots are linked afterwards by link.py (audio.link through edit-batch).
import json, sys, urllib.request, urllib.parse
C, MODE = sys.argv[1], sys.argv[2]; DRY = MODE == 'dry'
CAP = int(sys.argv[3]) if len(sys.argv) > 3 else 10000
NAME = {'spa_for_zho': '西班牙语', 'fra_for_zho': '法语', 'deu_for_zho': '德语', 'ita_for_zho': '意大利语'}[C]
PURPOSE = 'cs #696·AI known side said 中文 where it meant the target language; Kai approved 18 Nov 2026, cap 10,000 chars'
H = {'Content-Type': 'application/json', 'x-agent-id': 'worker-cs-696-zho-name'}
def call(url, body=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, method='POST' if body is not None else 'GET', headers=H)
    try:
        with urllib.request.urlopen(req, timeout=180) as r: return json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return json.loads(e.read())
        except Exception: return {'ok': False, 'error': str(e)}
slots = json.load(open(f'{C}.slots.json'))
slots.sort(key=lambda s: s['role'] == 'presentation')
cache = {}; out = []; spent = 0; would = 0
for s in slots:
    if s['role'] == 'presentation':
        p = call(f"http://localhost:3470/api/production/{C}/presentation/{s['key']}")
        old = p.get('text') or ''
        if '中文' not in old:
            out.append({**s, 'text': old, 'source': None, 'error': 'INTRO_HAS_NO_中文' if old else 'NO_INTRO'}); continue
        text = old.replace('中文', NAME); s = {**s, 'old_text': old}
    else: text = s['text']
    ck = (s['role'], text, s['key'] if s['role'] == 'presentation' else None)
    if ck in cache: r = cache[ck]
    else:
        if not DRY and spent >= CAP: out.append({**s, 'text': text, 'source': None, 'error': 'CAP_STOP'}); continue
        body = {'courseCode': C, 'role': s['role'], 'text': text, 'purpose': PURPOSE, 'dryRun': DRY}
        if s['role'] == 'presentation': body['legoId'] = s['key']
        r = call('http://localhost:3470/api/audio/render', body); cache[ck] = r
        spent += r.get('charsSpent') or 0; would += r.get('wouldSpendChars') or 0
        if not r.get('ok'): print('REFUSED', s['key'], s['role'], r.get('code'), str(r.get('error'))[:200])
    import re as _re
    ex = _re.findall(r'clip\(s\): ([0-9a-f-]{36})', str(r.get('error') or '')) if r.get('code') == 'EXISTS_IN_LANGUAGE' else []
    out.append({**s, 'text': text, 'existing': ex[0] if ex else None, 'existing_detail': str(r.get('error'))[:300] if ex else None, 'source': r.get('source'), 'audioId': r.get('audioId'), 'chars': r.get('charsSpent') or r.get('wouldSpendChars') or 0,
                'error': None if r.get('ok') else (r.get('code') or r.get('error'))})
    if not DRY and r.get('code') in ('DAILY_TOTAL_CAP', 'NOT_IN_CHAIN'): break
json.dump(out, open(f'{C}.audio-{MODE}.json', 'w'), ensure_ascii=False, indent=1)
from collections import Counter
print(C, MODE, len(out), 'slots', Counter(o['source'] for o in out), 'errors', Counter(o['error'] for o in out if o['error']), 'charsSpent', spent, 'wouldSpend', would)
