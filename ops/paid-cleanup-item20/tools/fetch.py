#!/usr/bin/env python3
"""Read one course LIVE through Popty's own read routes (cs #718·AI; no DB code of ours) into the
GET /api/production/:course/seeds shape the item-4 tools read. Tries the whole-course /seeds route
once (it hits the 8 s statement timeout under load), then falls back to script-view in 25-seed windows.
script-view carries no updated_at / last_edit_event_id, so collision safety comes from each op's
`expect` (the text the author saw) and a fresh re-read right before every apply.
usage: python3 -I fetch.py <course> [seedFrom seedTo]   -> ~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-item20/live/<course>.json"""
import json, sys, os, time, urllib.request
c = sys.argv[1]
lo = int(sys.argv[2]) if len(sys.argv) > 2 else 1
hi = int(sys.argv[3]) if len(sys.argv) > 3 else 700
d = os.path.expanduser('~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-item20/live'); os.makedirs(d, exist_ok=True)
H = {'x-agent-id': 'cs-718-item20'}
def get(url, timeout=120):
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=timeout))
seeds = []
for a in range(lo, hi + 1, 25):
    b = min(a + 24, hi)
    url = f"http://localhost:3470/api/production/{c}/script-view?seedStart=S{a:04d}&seedEnd=S{b:04d}"
    for attempt in range(5):
        try: got = get(url).get('seeds') or []; break
        except Exception as e: err = e; time.sleep(4 + 4 * attempt)
    else: sys.exit(f'window {a} failed: {err}')
    for s in got:
        legos = []
        for l in s.get('legos', []):
            ph = [p for p in l.get('phrases', []) if p.get('type') != 'lego_debut']
            comps = [{'known': p['known_text'], 'target': p['target_text']} for p in ph if p.get('type') == 'component']
            legos.append({'lego_id': l['lego_id'], 'lego_index': l['lego_index'], 'type': l.get('type'), 'is_new': l.get('is_new'),
                'known_text': l.get('known_text'), 'target_text': l.get('target_text'), 'components': comps or None,
                'basket_phrases': [{'id': p['id'], 'position': p.get('position'), 'phrase_role': p.get('type'), 'known_text': p.get('known_text'),
                    'target_text': p.get('target_text'), 'known_audio_id': p.get('known_audio_uuid'), 'target1_audio_id': p.get('target1_audio_uuid'),
                    'target2_audio_id': p.get('target2_audio_uuid'), 'updated_at': '', 'last_edit_event_id': None} for p in ph]})
        seeds.append({'seed_number': s['seed_number'], 'known_text': s.get('known_text'), 'target_text': s.get('target_text'), 'status': s.get('status'), 'legos': legos})
    if not got and a > 1 and len(sys.argv) <= 2: break
out = os.path.join(d, f'{c}.json' if len(sys.argv) <= 2 else f'{c}.{lo}-{hi}.json')
json.dump({'courseCode': c, 'source': 'script-view', 'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'seeds': seeds}, open(out + '.tmp', 'w'), ensure_ascii=False)
os.replace(out + '.tmp', out)
print(out, len(seeds), 'seeds')
