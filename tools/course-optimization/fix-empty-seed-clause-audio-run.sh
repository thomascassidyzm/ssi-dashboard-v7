#!/usr/bin/env bash
# Bulk driver for the empty-seed-clause audio repair (2026-09-03).
# Runs the per-course renderer over a list of courses, in order.
#
# A single course that dies is RECORDED AND SKIPPED — the remaining courses
# still run. On 2026-09-03 eight consecutive "fetch failed" (a phase8 restart
# dropping in-flight requests) aborted eng_for_mar, and the driver's stop-the-
# world guard then abandoned 18 untouched courses for nothing.
#
# The guard's intent is kept: a run failing on everything still stops. If
# CONSEC_COURSE_FAIL_STOP courses fail back to back, the box is not the content
# and we stop rather than burn the estate's TTS budget.
#
# Every course is individually resumable, so a stop here loses nothing but the
# time already spent.
#   ./fix-empty-seed-clause-audio-run.sh <concurrency> <course> [course...]
set -u
cd "$(dirname "$0")/../.."
CONC="$1"; shift
CONSEC_COURSE_FAIL_STOP="${CONSEC_COURSE_FAIL_STOP:-3}"

failed_courses=()
consec=0
for course in "$@"; do
  echo "=== $(date -u +%H:%M:%S) $course (concurrency $CONC)"
  node tools/course-optimization/fix-empty-seed-clause-audio.cjs --course "$course" --concurrency "$CONC"
  rc=$?
  if [ $rc -ne 0 ]; then
    failed_courses+=("$course(exit $rc)")
    consec=$((consec + 1))
    echo "!!! $course FAILED (exit $rc) — recorded and SKIPPED, continuing with the next course"
    if [ "$consec" -ge "$CONSEC_COURSE_FAIL_STOP" ]; then
      echo "!!! $consec courses failed back to back — stopping the run (the unit, not the content)"
      echo "=== $(date -u +%H:%M:%S) STOPPED. failed: ${failed_courses[*]}"
      exit 1
    fi
  else
    consec=0
  fi
done

if [ ${#failed_courses[@]} -gt 0 ]; then
  echo "=== $(date -u +%H:%M:%S) all courses attempted; ${#failed_courses[@]} failed: ${failed_courses[*]}"
  exit 1
fi
echo "=== $(date -u +%H:%M:%S) all courses done"
