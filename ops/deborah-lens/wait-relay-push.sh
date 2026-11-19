#!/usr/bin/env bash
# ops/deborah-lens/wait-relay-push.sh <branch> <sha-now> <lead-conversation-id>   (env: CS_CONV_TOKEN)
# One-shot, bounded (4 h): wakes the lead when the relay branch moves, i.e. a relay reader has pushed its batch.
set -u
BR=$1; OLD=$2; LEAD=$3
for i in $(seq 1 470); do
  NEW=$(git ls-remote origin "refs/heads/$BR" 2>/dev/null | cut -c1-40)
  if [ -n "$NEW" ] && [ "$NEW" != "$OLD" ]; then M="WAKE: relay branch $BR moved to ${NEW:0:9} (a reader pushed); verify that batch's findings"; break; fi
  sleep 30
done
M=${M:-"TIMED OUT after about 4 h: relay branch $BR has not moved from ${OLD:0:9}; no reader has pushed"}
node ~/command-surface/tools/cs-wake-send.cjs "$LEAD" "$CS_CONV_TOKEN" "$M"
