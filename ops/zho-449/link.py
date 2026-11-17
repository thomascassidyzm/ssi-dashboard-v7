# cs #449·AI — render-real.json -> one audio.link per slot via POST /api/production/zho_for_eng/edit-batch (audio.link refuses a
# clip whose words differ from the row's). Then READBACK: the same ops sent as a dry run, whose live "before" row must already
# hold the new clip. Old clips are not deleted. Usage: python3 link.py apply|readback
import json, sys, os, urllib.request
MODE = sys.argv[1]
out = json.load(open('render-real.json')); ops = []
for o in out:
    if not o['audioId']: continue
    op = {'op': 'audio.link', 'target': o['kind'], 'slot': o['role'], 'audio_id': o['audioId']}
    if o['kind'] == 'seed': op['seed_number'] = o['key']
    elif o['kind'] == 'lego': op['lego_id'] = o['key']
    else: op['phrase_id'] = 'zho_for_eng:' + o['key']
    ops.append(op)
body = {'ops': ops, 'apply': MODE == 'apply', 'reason': 'cs #449·AI link re-recorded clips for 59 EXISTS_IN_LANGUAGE slots (Kai approval 17 Nov)'}
req = urllib.request.Request('http://localhost:3470/api/production/zho_for_eng/edit-batch', data=json.dumps(body).encode(), method='POST',
    headers={'Content-Type': 'application/json', 'x-agent-id': 'worker-zho-449', 'x-agent-role': 'worker'})
try:
    with urllib.request.urlopen(req, timeout=300) as r: res = json.loads(r.read())
except urllib.error.HTTPError as e: res = json.loads(e.read())
json.dump(res, open(f'link-{MODE}.json', 'w'), ensure_ascii=False, indent=1)
print(MODE, len(ops), 'ops; ok', res.get('ok'), 'applied', res.get('applied'), 'event', res.get('event_id'), (res.get('error') or '')[:300])
if MODE == 'readback':
    col = {'known': 'known_audio_id', 'target1': 'target1_audio_id', 'target2': 'target2_audio_id'}
    good = bad = 0
    for op, r in zip(ops, res.get('results', [])):
        served = (r.get('before') or {}).get(col[op['slot']])
        if served == op['audio_id']: good += 1
        else: bad += 1; print('NOT SERVING', op.get('phrase_id') or op.get('lego_id') or op.get('seed_number'), op['slot'], served)
    print('readback serving new clip:', good, '/', len(ops), 'mismatch', bad)
