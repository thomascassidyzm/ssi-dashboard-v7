#!/bin/bash
# Serial bulk pod render chain for the four busiest free-tier courses.
# Fixed order per Tom's ruling 2026-08-22 19:00Z: ron, swe, isl, eus.
OUT=/home/tomcassidy/SSi/ssi-dashboard-v7-clean/docs/pods/render-chain-free-tier-2026-08-22
mkdir -p "$OUT"
for c in ron_for_eng swe_for_eng isl_for_eng eus_for_eng; do
  echo "=== $c $(date -u +%FT%TZ)" >> "$OUT/chain.log"
  curl -s --max-time 7200 -X POST "http://localhost:3465/generate-pods/$c" \
    -H 'Content-Type: application/json' \
    -d "{\"pod_ids\":[\"$c:pod-0-unrecorded\"],\"roles\":[\"target\"]}" \
    -o "$OUT/$c-bulk.json"
  echo "--- $c done $(date -u +%FT%TZ) $(head -c 300 "$OUT/$c-bulk.json")" >> "$OUT/chain.log"
done
echo "=== CHAIN COMPLETE $(date -u +%FT%TZ)" >> "$OUT/chain.log"
