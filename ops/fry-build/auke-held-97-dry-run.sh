#!/bin/bash
# Posts ONE family batch as a DRY RUN (no "apply") and prints the engine's answer. Never applies.
# usage: dry.sh <family>   (texts at ops/fry-build/auke-held-97-<family>-texts.json)
R=$(cd "$(dirname "$0")" && pwd)
f=$1; cd "${PAGES_DIR:?set PAGES_DIR to the dir holding seeds.json and sv_*.json}"
python3 $R/auke-held-97-build-batch.py $R/auke-held-97-$f-texts.json seeds.json $(ls sv_*.json | sort -t_ -k2 -n) > $R/auke-held-97-$f-batch.json || exit 1
curl -s -X POST http://localhost:3470/api/production/fry_for_eng/edit-batch -H 'Content-Type: application/json' -H 'x-agent-id: cs-97-fry-auke-held-prepare' -H 'x-agent-role: dry-run-only' --data-binary @$R/auke-held-97-$f-batch.json > $CS_SCRATCH/dry_$f.json
python3 - "$f" "$CS_SCRATCH/dry_$f.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[2]))
print({k:v for k,v in d.items() if k not in('results','undo_ops')})
rs=d.get('results',[]); from collections import Counter
print('results',len(rs),Counter((r.get('op'),r.get('changed'),bool(r.get('error'))) for r in rs))
for r in rs:
    if r.get('error') or r.get('refused'): print('ERR',r)
PY
