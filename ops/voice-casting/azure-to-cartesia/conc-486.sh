#!/bin/bash
# cs #486·AK: one concurrent run-day.cjs pass under Tom's grant #184. Args: DAY CONC CAP
EV=$HOME/ssi-evidence/ssi-dashboard-v7/ops/voice-casting/azure-to-cartesia
node ops/voice-casting/azure-to-cartesia/run-day.cjs --day "$1" --concurrency "$2" --approver tom --cap "$3" \
  --reason "spa_for_zho re-record grant #184 (Tom yes 22 Nov, cs #486), day $1 at concurrency $2" > "$EV/day$1-conc.log" 2>&1
node ~/command-surface/tools/cs-wake-send.cjs f9986a7b-bf70-406c-a991-4296e08f8a35 "$CS_CONV_TOKEN" "WAKE: day $1 concurrent run ended: $(tail -c 700 "$EV/day$1-conc.log" | tr '\n' ' ')"
