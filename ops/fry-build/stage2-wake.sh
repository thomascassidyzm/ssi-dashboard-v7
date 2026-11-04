#!/usr/bin/env bash
# Wakes the fry stage-2 build job when seeds_with_legos reaches $1, or the build team stops.
# Usage: stage2-wake.sh <threshold> <conv-id>   (token comes from $CS_CONV_TOKEN)
T=$1; C=$2
for i in $(seq 1 600); do
  S=$(curl -s localhost:3471/api/build/status/fry_for_eng)
  N=$(curl -s localhost:3471/api/stats/fry_for_eng | python3 -c "import json,sys;print(json.load(sys.stdin)['seeds_with_legos'])" 2>/dev/null || echo 0)
  if [ "${N:-0}" -ge "$T" ]; then M="WAKE: fry stage 2 reached $N seeds with LEGOs"; break; fi
  if echo "$S" | grep -q '"active":false'; then M="WAKE: fry build team stopped at $N seeds with LEGOs: $(echo "$S" | head -c 500)"; break; fi
  sleep 30
done
M=${M:-"TIMED OUT after 5h waiting for fry stage 2 to reach $T"}
node ~/command-surface/tools/cs-wake-send.cjs "$C" "$CS_CONV_TOKEN" "$M"
