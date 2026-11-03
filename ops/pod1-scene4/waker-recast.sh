#!/usr/bin/env bash
# job #799 safety waker: if the recast pass unit stops without fanout.sh's own final wake, say so; bounded at 4.5 h.
L="$(dirname "$0")/.recast.log"
for i in $(seq 1 540); do
  if ! systemctl --user is-active -q cs-long-keep-799-recast; then
    grep -q -E 'revoked:|REVOKE' "$L" && exit 0
    M="WAKE: #799 recast pass unit ended WITHOUT its final report (see ops/pod1-scene4/.recast.log; ExecStopPost revoked the key)"; break
  fi
  sleep 30
done
M=${M:-"TIMED OUT after 4.5h waiting on #799 recast pass"}
node ~/command-surface/tools/cs-wake-send.cjs "$CS_CONV_ID" "$CS_CONV_TOKEN" "$M"
