# cs #449·AI — re-record the 59 zho_for_eng slots #431·AI's render refused EXISTS_IN_LANGUAGE (../zho-held-431/refused-slots.json),
# through the ONE route POST /api/audio/render, library first, one render, no retries, course cast voice (no voiceId sent),
# under Kai's approval token (approval-origin.cjs: x-cs-conv from this Kai-seat conversation). Kai approved ~4,700 chars on
# 17 Nov; #431 spent 3,275, so this pass stops at CAP chars. Usage: python3 rerecord.py dry|real -> render-<mode>.json
import json, sys, os, urllib.request
MODE = sys.argv[1]; DRY = MODE == 'dry'; CAP = 1400
APPROVAL = 'kai:2026-11-17:zho held items re-records, Kai approved ~4700 chars 17 Nov (cs 431/449)'
PURPOSE = 'cs #449·AI zho_for_eng re-record of 59 slots refused EXISTS_IN_LANGUAGE in #431 (Kai approval 17 Nov)'
refused = json.load(open('../zho-held-431/refused-slots.json'))
texts = {(o['kind'], o['key'], o['role']): o['text'] for o in json.load(open('../zho-held-431/audio-real.json'))}
def render(role, text):
    body = {'courseCode': 'zho_for_eng', 'role': role, 'text': text, 'purpose': PURPOSE, 'dryRun': DRY, 'approval': APPROVAL}
    req = urllib.request.Request('http://localhost:3470/api/audio/render', data=json.dumps(body).encode(), method='POST',
        headers={'Content-Type': 'application/json', 'x-agent-id': 'worker-zho-449', 'x-cs-conv': os.environ['CS_CONV_TOKEN']})
    try:
        with urllib.request.urlopen(req, timeout=180) as r: return json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return json.loads(e.read())
        except Exception: return {'ok': False, 'error': str(e)}
out = []; cache = {}; spent = 0; would = 0
for kind, key, role, served_before in refused:
    text = texts[(kind, key, role)]
    if (role, text) in cache: r = cache[(role, text)]
    else:
        if not DRY and spent + len(text) > CAP: r = {'ok': False, 'code': 'CAP_STOP', 'error': f'pass cap {CAP} chars reached'}
        else: r = render(role, text)
        cache[(role, text)] = r
        spent += r.get('charsSpent') or 0; would += r.get('wouldSpendChars') or 0
    out.append({'kind': kind, 'key': key, 'role': role, 'text': text, 'servedBefore': served_before, 'source': r.get('source'),
                'audioId': r.get('audioId'), 'voiceId': r.get('voiceId'), 'chars': r.get('charsSpent') or r.get('wouldSpendChars') or 0,
                'error': None if r.get('ok') else {'code': r.get('code'), 'message': r.get('error') or r.get('message')}})
    if not r.get('ok'): print('REFUSED', key, role, json.dumps(r, ensure_ascii=False)[:400])
    if not DRY and r.get('code') in ('DAILY_TOTAL_CAP', 'NOT_IN_CHAIN', 'APPROVAL_UNVERIFIED'): break
json.dump(out, open(f'render-{MODE}.json', 'w'), ensure_ascii=False, indent=1)
from collections import Counter
print(MODE, len(out), 'slots', Counter(o['source'] for o in out), 'charsSpent', spent, 'wouldSpend', would)
