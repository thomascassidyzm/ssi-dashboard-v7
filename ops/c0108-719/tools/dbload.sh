#!/bin/bash
# cs #758·AI: active statement count on the shared DB from the watchdog's newest sample (brief: >6 = do not write)
f=$(ls -t ~/.local/state/db-watchdog/freezes/samples-*.jsonl 2>/dev/null | head -1)
tail -1 "$f" | python3 -c 'import json,sys;d=json.loads(sys.stdin.read());print(sum(a.get("count",1) for a in d.get("activity",[]) if a.get("state")=="active"))'
