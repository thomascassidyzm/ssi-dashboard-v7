#!/bin/bash
# usage: run-batch.sh <batch-key> dry|apply [ops-file]
# Posts one batch from ops.json (or the given ops file) to Popty edit-batch as kai-777 (cs #777·AK).
# LOAD GATE: before EVERY post, reads Popty /health dbLoadGate.level. Anything but "green" (or a missing /
# unreadable field) waits 60 s and re-checks, bounded at 30 checks (~30 min); still not green => refuse, exit 3.
# Every check is appended to gate-log.txt, and the level that let the batch through is written beside its response.
set -e
D=$(cd "$(dirname "$0")" && pwd); B=$1; MODE=$2; OPS=${3:-$D/ops.json}
APPLY=False; [ "$MODE" = apply ] && APPLY=True
LEVEL=""
for i in $(seq 1 30); do
  LEVEL=$(curl -s -m 10 http://localhost:3470/health | python3 -c "import json,sys
try: print(json.load(sys.stdin)['dbLoadGate']['level'] or 'missing')
except Exception: print('unreadable')" 2>/dev/null || echo unreadable)
  echo "$(date -u +%FT%TZ) $MODE $B gate=$LEVEL" >> "$D/gate-log.txt"
  [ "$LEVEL" = green ] && break
  [ "$i" = 30 ] && { echo "GATE NOT GREEN after 30 checks ($LEVEL): $B NOT SENT"; exit 3; }
  sleep 60
done
python3 -c "
import json
d=json.load(open('$OPS'))
ops=[{k:v for k,v in o.items() if not k.startswith('_')} for o in d['batches']['$B']]
print(json.dumps({'ops':ops,'apply':$APPLY,'reason':'cs #777: sweep Doug settled words into approved seeds 1-529 ($B), pdc_for_eng, Kai 23 Nov 10:42Z \"yes sweep\"'}))" > "$D/$MODE/$B.request.json"
echo "{\"gate\":\"$LEVEL\",\"at\":\"$(date -u +%FT%TZ)\"}" > "$D/$MODE/$B.gate.json"
curl -s -X POST http://localhost:3470/api/production/pdc_for_eng/edit-batch -H 'Content-Type: application/json' \
  -H 'x-agent-id: kai-777' -H 'x-agent-role: content-fix' --data @"$D/$MODE/$B.request.json" > "$D/$MODE/$B.response.json"
python3 -c "
import json;r=json.load(open('$D/$MODE/$B.response.json'))
print('$B', {k:r.get(k) for k in ['ok','dryRun','applied','event_id','undo_file','error','code']}, 'results', len(r.get('results') or []),
      'changed', sum(1 for x in r.get('results') or [] if x.get('changed')))"
