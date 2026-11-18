#!/bin/bash
# cs #758·AI: run tools/fill2.py over the named courses in a systemd unit (outlives the turn), then wake the job.
# usage (from ops/c0108-719): systemd-run --user --unit=cs-long-c0108-fill-N --slice=cs-workers.slice --setenv=CS_CONV_TOKEN --working-directory="$PWD" bash run-fill.sh <cap> <log> <course>...
cap=$1; log=$2; shift 2
python3 -I tools/slots2.py "$@" > "$log" 2>&1
python3 -I tools/fill2.py "$cap" "$@" >> "$log" 2>&1
M="WAKE: c0108 fill done for $* : $(tail -1 "$log")"
node ~/command-surface/tools/cs-wake-send.cjs cca7ec77-2bb6-4110-bef0-288c45de9556 "$CS_CONV_TOKEN" "$M"
