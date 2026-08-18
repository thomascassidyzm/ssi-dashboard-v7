#!/usr/bin/env bash
# A-158 estate rollout: every course with detector residue, activity-ordered,
# ONE AT A TIME, halting on the first anomaly.
#
# Activity orders the queue; it never excludes a course. Absence from
# player_events does not prove a course is unused, and because the bump is
# metadata-only a device only re-fetches clips it actually holds — so a bump on
# a genuinely unused course costs nothing. (Tom, 2026-08-18.)
#
#   ./estate-rollout.sh <census.csv>            # dry runs only
#   APPLY=1 ./estate-rollout.sh <census.csv>
set -uo pipefail
CENSUS="${1:?census csv}"; APPLY="${APPLY:-0}"
DIR="${A158_DIR:-/tmp/a158-run}"; mkdir -p "$DIR"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG="$DIR/estate-rollout.log"

while IFS=, read -r course actors exposed; do
  [ "$course" = course_code ] && continue
  [ -z "$course" ] && continue
  echo "==================== $course (actors=$actors expected=$exposed) ===================="
  if APPLY="$APPLY" "$HERE/course-sequence.sh" "$course" >>"$LOG" 2>&1; then
    tail -n 25 "$LOG" | grep -E "^########|^(OK|FAIL) |verified" || true
  else
    echo "!!!! HALTED at $course — sequence returned non-zero"
    tail -n 40 "$LOG"
    exit 1
  fi
done < "$CENSUS"
echo "==================== estate rollout complete ===================="
