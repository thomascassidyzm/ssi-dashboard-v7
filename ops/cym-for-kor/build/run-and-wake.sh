#!/usr/bin/env bash
# cym_for_kor (cs #813·AK, resumed by cs #109): run the builder over FROM..TO, then wake the supervising
# conversation with the exit code and the last stop line. The conversation id and token come from the unit's
# environment (systemd-run --setenv=CS_WAKE_CONV=<id> --setenv=CS_CONV_TOKEN), never from argv.
# CS_STOP_AT (UTC HH:MM, today) defaults to 21:45. Usage: run-and-wake.sh FROM TO LABEL
set -u
cd "$(dirname "$0")/../../.."
E="$HOME/ssi-evidence/ssi-dashboard-v7/ops/cym-for-kor/build"
STOP="${CS_STOP_AT:-21:45}"
python3 ops/cym-for-kor/build/run-builder.py "$1" "$2" --stop-at "$STOP" > "$E/run-$3.log" 2>&1
rc=$?
L=$(grep -E '"stop"|"done"' "$E/run-$3.log" | tail -1 | cut -c1-300)
node ~/command-surface/tools/cs-wake-send.cjs "$CS_WAKE_CONV" "$CS_CONV_TOKEN" \
  "WAKE: cym_for_kor $3 run exited rc=$rc (0 done, 2 stopped on a seed, 3 stopped at $STOP): ${L:-no stop line}"
