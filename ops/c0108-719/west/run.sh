#!/bin/bash
# west shard: generate plan, build ops, validate, DRY RUN (never apply). usage: west/run.sh <course>...
cd "$(dirname "$0")/.."
for c in "$@"; do
  python3 -I west/gen.py $c && python3 -I tools/mkops.py $c/a.plan.py && python3 -I tools/popty.py validate $c $c/a.ops.json && python3 -I tools/popty.py batch $c $c/a.ops.json
  sleep 1
done
