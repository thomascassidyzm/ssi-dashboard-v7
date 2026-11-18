#!/bin/bash
# usage: dispatch.sh <item> "<label>"   — builds brief from briefs/i<item>.md + common.md, dispatches with parent = #724 coordinator
D=$(dirname "$0")
python3 - "$1" "$2" "$D/briefs" <<'PY' > "$CS_SCRATCH/body.json"
import json,sys
i,l,b=sys.argv[1:4]
p=open(f"{b}/i{i}.md").read()+open(f"{b}/common.md").read()
if i in("10","11","12"): p=p.replace("Before any write phase","(You are PLAN ONLY — no write phase.) Before heavy reads")
print(json.dumps({"cwd":"/home/tomcassidy/SSi/ssi-dashboard-v7-clean","label":l,"prompt":p,"parent":"b0ad3386-f8d7-47e4-b880-b522ec03241c"}))
PY
curl -s -X POST http://localhost:4317/api/dispatch -H 'Content-Type: application/json' -H "x-cs-conv: $CS_CONV_TOKEN" -d @"$CS_SCRATCH/body.json"
