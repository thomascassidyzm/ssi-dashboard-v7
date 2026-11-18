#!/bin/bash
# cs #725·AI unit body: run the courses, then wake the job (token comes from the unit's environment, never argv).
P="$(cd "$(dirname "$0")/.." && pwd)"
"$P/tools/run-725.sh" "$@" > "$P/run-725.log" 2>&1
M="WAKE: run-725 finished: $(grep -c '^DONE' "$P/run-725.log") done, $(grep -c '^STOP' "$P/run-725.log") stopped"
node ~/command-surface/tools/cs-wake-send.cjs 9b295707-df35-4c15-b485-0444219d56e6 "$CS_CONV_TOKEN" "$M"
