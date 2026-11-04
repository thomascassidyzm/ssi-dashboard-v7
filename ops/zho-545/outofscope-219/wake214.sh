#!/bin/bash
# one-shot waker: wakes #219 when #214 stops running (bounded 2h). Token comes from the unit's EnvironmentFile.
D=$(dirname "$0")
for i in $(seq 1 240); do "$D/check214.sh" && { M='WAKE: #214 zho-545-apply-kai-rulings is no longer running - re-fetch, re-check, apply bucket 1'; break; }; sleep 30; done
M=${M:-'TIMED OUT after 2h waiting on #214 to finish'}
node ~/command-surface/tools/cs-wake-send.cjs 9496a54e-c6b2-4107-844f-d2fb3ccab979 "$CS_CONV_TOKEN" "$M"
