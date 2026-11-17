# cs #431·AI — audio for every slot whose words changed (changed-slots.json from plan.py), through the ONE route
# POST /api/audio/render (library-first, spend guard, one render), then audio.link ops into the rows (make-before-break:
# the old clip is only unlinked by being replaced, never deleted). Usage: python3 audio.py dry|real -> audio-<mode>.json
import json, sys, urllib.request
MODE = sys.argv[1]; DRY = MODE == 'dry'
PURPOSE = 'cs #431·AI zho_for_eng held items re-record (Kai approved 17 Nov 2026 12:42Z, ~4,700 chars)'
INTRO = "The Chinese for: '{}', is: <break time=\"300ms\"/> <break time=\"10ms\"/>"
slots = json.load(open('changed-slots.json'))
# S0120L01U05: case-only change, relinked to the library clip of these exact words (#425 F2)
slots.append(['phrase', 'S0120L01U05', 'known', 'can we go by bus?'])
# seed 61's P26 copy speaks the seed's NEW words
slots += [['phrase', 'S0061L03U09', r, '你能慢一点再说一遍吗？'] for r in ('target1', 'target2')]
def render(role, text, lego=None):
    body = {'courseCode': 'zho_for_eng', 'role': role, 'text': text, 'purpose': PURPOSE, 'dryRun': DRY}
    if lego: body['legoId'] = lego
    req = urllib.request.Request('http://localhost:3470/api/audio/render', data=json.dumps(body).encode(), method='POST',
                                 headers={'Content-Type': 'application/json', 'x-agent-id': 'worker-zho-held-431'})
    try:
        with urllib.request.urlopen(req, timeout=180) as r: return json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return json.loads(e.read())
        except Exception: return {'ok': False, 'error': str(e)}
# phrases first, then seeds, then LEGOs, so a LEGO whose words a phrase already says is a free library hit
order = {'phrase': 0, 'seed': 1, 'lego': 2}
slots.sort(key=lambda s: (order[s[0]], s[2] == 'presentation'))
cache = {}; out = []; spent = 0; would = 0
for kind, key, role, text in slots:
    words = INTRO.format(text) if role == 'presentation' else text
    ck = (role, words if role != 'presentation' else key)
    if ck in cache and role != 'presentation': r = cache[ck]
    else:
        r = render(role, words, key if role == 'presentation' else None); cache[ck] = r
        spent += r.get('charsSpent') or 0; would += r.get('wouldSpendChars') or 0
    out.append({'kind': kind, 'key': key, 'role': role, 'text': words, 'source': r.get('source'), 'audioId': r.get('audioId'),
                'chars': r.get('charsSpent') or r.get('wouldSpendChars') or 0, 'error': None if r.get('ok') else (r.get('code') or r.get('error'))})
    if not r.get('ok'): print('REFUSED', kind, key, role, r.get('code'), str(r.get('error'))[:200])
    if not DRY and r.get('code') in ('DAILY_TOTAL_CAP', 'NOT_IN_CHAIN'): break
json.dump(out, open(f'audio-{MODE}.json', 'w'), ensure_ascii=False, indent=1)
from collections import Counter
print(MODE, len(out), 'slots', Counter(o['source'] for o in out), 'charsSpent', spent, 'wouldSpend', would)
