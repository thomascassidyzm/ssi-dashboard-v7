#!/usr/bin/env bash
# One LEGO, both models, identical brief/admitted list/gates/retry rule (generate-v4 --lego).
# Usage: ops/codex-vs-opus-trial/run-pair.sh <course> <SnnnnLnn> <seed>
# Opus runs on the account in OPUS_CONFIG_DIR (SSI_CLAUDE_CONFIG_DIR) — the SSi pool was spent on 2026-11-05.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd); root=$(cd "$here/../.." && pwd)
course=$1 lego=$2 seed=$3
export V4_READ=script-view V4_MODEL=opus V4_EFFORT=${V4_EFFORT:-low}
export V4_CACHE=${V4_CACHE:-$HOME/ssi-evidence/ssi-dashboard-v7/438-codex-vs-opus/cache}
for prov in claude codex; do
  out="$here/$prov"; mkdir -p "$out"
  [ -f "$out/v4-$course-$seed-$seed-$lego.json" ] && { echo "skip $prov $lego (done)"; continue; }
  V4_EVIDENCE="$out" V4_LEDGER=ledger.json SSI_CLAUDE_CONFIG_DIR=${OPUS_CONFIG_DIR:-} \
    node "$root/tools/frame-layer/v4/generate-v4.cjs" "$course" "$seed" "$seed" --provider "$prov" --budget 3000000 --lego "$lego" 2>&1 | grep -v '^\[language-code' || echo "FAILED $prov $lego"
done
