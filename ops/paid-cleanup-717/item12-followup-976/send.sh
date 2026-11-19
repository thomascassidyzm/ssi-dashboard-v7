#!/bin/bash
# cs #976·AI — send batches/<course>.json to Popty's edit door, signed with the Kai key (same door #964·AI used). MODE=dry|apply.
# dry → batches/<course>.dry.json ; apply → applied/<course>.json (event id + undo file). Stops at the first non-ok answer.
cd "$(dirname "$0")"; ROOT=$(git rev-parse --show-toplevel); MODE=${MODE:-dry}; B=${BATCHDIR:-batches}; A=${APPLIEDDIR:-applied}; mkdir -p "$A"
# BATCHDIR=batches-v2 APPLIEDDIR=applied-v2 sends the correction pass (known-side-only S0450).
for c in "$@"; do
  H=$(date -u +%H%M); if [ "$H" -ge 2155 ] && [ "$H" -le 2225 ]; then echo "QUIET WINDOW 22:00-22:20 UTC - stop"; exit 4; fi
  python3 -c "import json;b=json.load(open('$B/$c.json'));b['apply']=('$MODE'=='apply');json.dump(b,open('$B/$c.send.json','w'),ensure_ascii=False)"
  out=$([ "$MODE" = apply ] && echo "$A/$c.json" || echo "$B/$c.dry.json")
  node "$ROOT/tools/agent-admin/call.cjs" --key kai --agent kai-976 POST "/api/admin/course-edit/$c/edit-batch" --body-file "$B/$c.send.json" > "$out" 2>&1
  python3 -c "import json;d=json.load(open('$out'));print('$c',d.get('ok'),d.get('applied'),d.get('event_id'),d.get('code'),str(d.get('error'))[:400])" 2>&1 | tee -a send.log
  python3 -c "import json,sys;sys.exit(0 if json.load(open('$out')).get('ok') else 1)" 2>/dev/null || { echo "STOP at $c"; exit 1; }
done
echo "SEND DONE $MODE"
