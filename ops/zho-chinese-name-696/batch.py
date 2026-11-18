# cs #696·AI — POST <course>.ops.json to Popty's edit-batch (dry run unless 'apply'), keeping the answer and the undo.
# Usage: python3 batch.py <course> <ops.json> dry|apply <tag>
import json, sys, urllib.request
C, OPS, MODE, TAG = sys.argv[1:5]
body = {'ops': json.load(open(OPS)), 'apply': MODE == 'apply',
        'reason': 'cs #696·AI known side said 中文 where it meant the target language (#481·AI scan d/b48b1f13); Kai approved 18 Nov 2026'}
req = urllib.request.Request(f'http://localhost:3470/api/production/{C}/edit-batch', data=json.dumps(body).encode(), method='POST',
                             headers={'Content-Type': 'application/json', 'x-agent-id': 'worker-cs-696-zho-name'})
try:
    with urllib.request.urlopen(req, timeout=600) as r: res = json.loads(r.read())
except urllib.error.HTTPError as e: res = json.loads(e.read() or b'{}'); res['_http'] = e.code
json.dump(res, open(f'out/{C}.{TAG}.{MODE}.json', 'w'), ensure_ascii=False, indent=1)
if res.get('undo_ops') is not None: json.dump(res['undo_ops'], open(f'out/{C}.{TAG}.undo.ops.json', 'w'), ensure_ascii=False, indent=1)
print(C, TAG, MODE, {k: res.get(k) for k in ('ok', 'dryRun', 'applied', 'event_id', 'error', 'code', '_http', 'undo_file')}, 'results', len(res.get('results') or []), 'undo_ops', len(res.get('undo_ops') or []))
