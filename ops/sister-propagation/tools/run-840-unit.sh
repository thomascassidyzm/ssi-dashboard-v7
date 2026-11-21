#!/bin/bash
# cs #840·AI unit body: run the courses, then wake the job (token comes from the unit's environment, never argv).
P="$(cd "$(dirname "$0")/.." && pwd)"
"$P/tools/run-840.sh" "$@" > "$P/run-840.log" 2>&1
M="WAKE: run-840 finished: $(grep -c '^DONE' "$P/run-840.log") done, $(grep -c '^STOP' "$P/run-840.log") stopped"
node ~/command-surface/tools/cs-wake-send.cjs 5895e570-9658-4c3e-abb2-a5bd30d98521 "$CS_CONV_TOKEN" "$M"
