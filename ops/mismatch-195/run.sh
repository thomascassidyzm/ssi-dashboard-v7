#!/usr/bin/env bash
# run.sh <course_code> [suffix] — launch the Haiku judge for one course as a durable user unit (job #195).
set -eu
C=$1; S=${2:-}; c=${C%%_*}
H=$(cd "$(dirname "$0")" && pwd)
E=$HOME/ssi-evidence/ssi-dashboard-v7/ops/mismatch-195
systemctl --user reset-failed "cs-long-keep-mm195-$c$S" 2>/dev/null || true
systemd-run --user --unit="cs-long-keep-mm195-$c$S" --slice=cs-workers.slice --property=RuntimeMaxSec=18000 \
  --setenv=CLAUDE_CONFIG_DIR="$CLAUDE_CONFIG_DIR" --working-directory="$E" \
  bash -lc "python3 $H/judge.py $E/units/$C.jsonl haiku $E/runs/$C.jsonl --ctx filtered --par 3 >> $E/runs/$C.log 2>&1"
