#!/bin/bash
# usage: run-batch.sh <batch-key> dry|apply   — posts one batch from ops.json to Popty edit-batch as kai-770
set -e
D=$(dirname "$0"); B=$1; MODE=$2
APPLY=false; [ "$MODE" = apply ] && APPLY=true
python3 -c "
import json,sys
d=json.load(open('$D/ops.json'))
ops=[{k:v for k,v in o.items() if not k.startswith('_')} for o in d['batches']['$B']]
print(json.dumps({'ops':ops,'apply':$( [ $APPLY = true ] && echo True || echo False ),'reason':'cs #770: Doug settled word fixes ($B), pdc_for_eng drafted seeds 530-668, Kai 23 Nov 10:10Z'}))" > $D/$MODE/$B.request.json
curl -s -X POST http://localhost:3470/api/production/pdc_for_eng/edit-batch -H 'Content-Type: application/json' \
  -H 'x-agent-id: kai-770' -H 'x-agent-role: content-fix' --data @$D/$MODE/$B.request.json > $D/$MODE/$B.response.json
python3 -c "
import json;r=json.load(open('$D/$MODE/$B.response.json'))
print({k:(v if not isinstance(v,(list,dict)) else (len(v) if isinstance(v,list) else list(v)[:12])) for k,v in r.items()})"
