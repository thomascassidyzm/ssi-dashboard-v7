#!/bin/bash
# Serial bulk pod render chain for the remaining premium courses.
# One course at a time: phase 8 runs one pod operation at a time and xAI is
# concurrency-throttled, so serialising is both correct and no slower.
OUT=/home/tomcassidy/SSi/ssi-dashboard-v7-clean/docs/pods/render-chain-2026-08-22
mkdir -p "$OUT"
for c in ara_for_eng spa_mx_for_eng por_for_eng ara_eg_for_eng deu_for_eng kor_for_eng por_br_for_eng; do
  echo "=== $c $(date -u +%FT%TZ)" >> "$OUT/chain.log"
  curl -s --max-time 7200 -X POST "http://localhost:3465/generate-pods/$c" \
    -H 'Content-Type: application/json' \
    -d "{\"pod_ids\":[\"$c:pod-0-unrecorded\"],\"roles\":[\"target\"]}" \
    -o "$OUT/$c-bulk.json"
  echo "--- $c done $(date -u +%FT%TZ) $(head -c 300 "$OUT/$c-bulk.json")" >> "$OUT/chain.log"
done
echo "=== CHAIN COMPLETE $(date -u +%FT%TZ)" >> "$OUT/chain.log"
