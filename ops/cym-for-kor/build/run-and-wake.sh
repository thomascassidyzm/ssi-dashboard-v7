#!/usr/bin/env bash
# cym_for_kor (cs #813·AK): run the builder over FROM..TO (stops at 21:45 UTC), then wake the job's conversation
# with the exit code and the last stop line. The conversation token comes from the unit's environment
# (systemd-run --setenv), never from argv. Usage: run-and-wake.sh FROM TO LABEL
set -u
cd "$(dirname "$0")/../../.."
E="$HOME/ssi-evidence/ssi-dashboard-v7/ops/cym-for-kor/build"
python3 ops/cym-for-kor/build/run-builder.py "$1" "$2" --stop-at 21:45 > "$E/run-$3.log" 2>&1
rc=$?
L=$(grep -E '"stop"|"done"' "$E/run-$3.log" | tail -1 | cut -c1-300)
node ~/command-surface/tools/cs-wake-send.cjs c0fb4601-2e83-4f19-b55b-6b93b0a2aa0c "$CS_CONV_TOKEN" \
  "WAKE: cym_for_kor $3 run exited rc=$rc (0 done, 2 stopped on a seed, 3 stopped at 21:45): ${L:-no stop line}"
