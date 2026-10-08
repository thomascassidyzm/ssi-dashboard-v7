#!/usr/bin/env bash
# Gap-fill a list of courses one after another (job #924). Resumable: each course
# skips windows already filled, so re-running the same list continues where a
# usage limit (exit 75) stopped it. Ends each course with an apply DRY RUN —
# nothing here writes a course row.
# Usage: tools/frame-layer/v4/run-fanout.sh <course> [<course> ...]
set -u
cd "$(dirname "$0")/../../.."
R="${V4_RUN_DIR:-$HOME/ssi-evidence/ssi-dashboard-v7/924-phrase-v4-all-courses}"
for C in "$@"; do
  mkdir -p "$R/$C"
  echo "=== $(date -u +%FT%TZ) $C"
  node tools/frame-layer/v4/gap-fill-course.cjs "$C" >> "$R/$C/run.log" 2>&1
  RC=$?
  grep -E "GATED|weak windows|FAILED" "$R/$C/run.log" | tail -3
  if [ $RC -eq 75 ]; then echo "STOPPED at $C: model usage limit — re-run this list to resume"; exit 75; fi
  [ $RC -ne 0 ] && { echo "$C failed (rc $RC), see $R/$C/run.log"; continue; }
  node tools/frame-layer/v4/apply-gap-fill.cjs "$C" 2>&1 | grep -v language-code
done
echo "=== fan-out list finished $(date -u +%FT%TZ)"
