#!/usr/bin/env python3
"""cym_for_kor (cs #813·AK): write each seed's Welsh (HC North, as in cym_nv2_for_eng S1001-S1668)
and proofread Korean (step 3, #780·AK) into Popty through course-builder PATCH /api/seed/:course/:n.
HTTP only, one seed per request, sequential (one DB writer). Skips seeds whose text already matches.
Usage: set-seed-texts.py FROM TO"""
import json, sys, time, urllib.request, pathlib
HERE = pathlib.Path(__file__).resolve().parent.parent
SEEDS = {s['seed_number']: s for s in json.load(open(HERE / 'seeds-ko-draft.json'))['seeds']}
B = 'http://localhost:3471/api'
HDR = {'Content-Type': 'application/json', 'x-agent-id': 'kai-813-cym-for-kor'}
def call(method, url, body=None):
    req = urllib.request.Request(url, method=method, headers=HDR, data=json.dumps(body).encode() if body else None)
    with urllib.request.urlopen(req, timeout=60) as r: return json.load(r)
def gate():
    while True:
        h = json.load(urllib.request.urlopen('http://localhost:3470/health', timeout=30)).get('dbLoadGate', {})
        if h.get('level') in ('green', None): return
        print('gate', h.get('level'), '- waiting 60s', flush=True); time.sleep(60)
lo, hi = int(sys.argv[1]), int(sys.argv[2])
cur = {s['seed_number']: s for s in call('GET', f'{B}/seeds/cym_for_kor?limit=1000')['seeds']}
ok = skip = 0
for n in range(lo, hi + 1):
    s = SEEDS[n]
    if cur.get(n, {}).get('target_text') == s['welsh'] and cur.get(n, {}).get('known_text') == s['korean']:
        skip += 1; continue
    if n % 50 == 0: gate()
    r = call('PATCH', f'{B}/seed/cym_for_kor/{n}', {'target_text': s['welsh'], 'known_text': s['korean']})
    if not r.get('ok'): print('FAIL', n, r, flush=True); sys.exit(1)
    ok += 1
print(f'written {ok}, already set {skip}', flush=True)
