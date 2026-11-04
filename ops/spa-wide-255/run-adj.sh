#!/usr/bin/env bash
# run-adj.sh <name> <units.jsonl> <run.jsonl> <out.jsonl> — durable Sonnet second read (job #255).
set -eu
N=$1; U=$2; R=$3; O=$4; PAR=${PAR:-4}
H=$(cd "$(dirname "$0")" && pwd)
systemctl --user reset-failed "cs-long-spa255-$N" 2>/dev/null || true
systemd-run --user --unit="cs-long-spa255-$N" --slice=cs-workers.slice --property=RuntimeMaxSec=21600 \
  --setenv=CLAUDE_CONFIG_DIR="${CLAUDE_CONFIG_DIR:-}" --working-directory="$H" \
  bash -lc "python3 $H/adjudicate.py $U $R $O --model sonnet --par $PAR >> $O.log 2>&1"
