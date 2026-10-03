#!/usr/bin/env bash
# Runs the v4 pilot regions sequentially. Each region is one generate call plus
# at most one retry; the cumulative token ledger in the evidence dir stops the
# run at --budget. Regions: 3 per language, 10 seeds each, chosen where Irish
# has live v3 content so live / v3 / v4 compare inside the same seeds.
set -u
cd "$(dirname "$0")/../../.."
BUDGET="${V4_BUDGET:-400000}"
for R in "gle_for_eng 161 170" "gle_for_eng 201 210" "fra_for_eng 281 290" "fra_for_eng 161 170" "fra_for_eng 201 210" "deu_for_eng 281 290" "deu_for_eng 161 170" "deu_for_eng 201 210"; do
  set -- $R
  echo "=== $(date -u +%H:%M:%SZ) $1 $2-$3"
  node tools/frame-layer/v4/generate-v4.cjs "$1" "$2" "$3" --budget "$BUDGET" || { echo "STOPPED: $1 $2-$3 failed or budget hit"; break; }
done
echo "=== pilot finished $(date -u +%H:%M:%SZ)"
