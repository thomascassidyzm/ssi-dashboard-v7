#!/usr/bin/env bash
# run.sh <name> <units.jsonl> <out.jsonl> [model] — durable judge run as a user unit (job #255).
set -eu
N=$1; U=$2; O=$3; M=${4:-haiku}; PAR=${PAR:-6}
H=$(cd "$(dirname "$0")" && pwd)
systemctl --user reset-failed "cs-long-spa255-$N" 2>/dev/null || true
systemd-run --user --unit="cs-long-spa255-$N" --slice=cs-workers.slice --property=RuntimeMaxSec=14400 \
  --setenv=CLAUDE_CONFIG_DIR="${CLAUDE_CONFIG_DIR:-}" --working-directory="$H" \
  bash -lc "python3 $H/judge.py $U $M $O --par $PAR >> $O.log 2>&1"
