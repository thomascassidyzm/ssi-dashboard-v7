#!/bin/bash
# Regenerate all flagged stragglers per role, both courses, sequentially.
LOG=scripts/deepening/regen-driver.log
: > "$LOG"
fire() {
  local course=$1 role=$2
  echo "[$(date +%H:%M:%S)] === $course / $role ===" >> "$LOG"
  curl -s --max-time 1800 -X POST "http://localhost:3465/regenerate-role/$course" \
    -H 'Content-Type: application/json' \
    -d "{\"role\":\"$role\",\"flaggedOnly\":true,\"dryRun\":false}" >> "$LOG" 2>&1
  echo "" >> "$LOG"
}
for role in known target1 target2 presentation; do fire deu_for_eng "$role"; done
for role in known target1 target2; do fire fra_for_eng "$role"; done
echo "[$(date +%H:%M:%S)] ALL REGEN COMPLETE" >> "$LOG"
