#!/usr/bin/env bash
# Bulk driver for the empty-seed-clause audio repair (2026-09-03).
# Runs the per-course renderer over a list of courses, in order, and STOPS on
# the first course that produces no output rather than burning thousands of
# TTS calls into a dead unit. Every course is individually resumable, so a
# stop here loses nothing but the time already spent.
#   ./fix-empty-seed-clause-audio-run.sh <concurrency> <course> [course...]
set -u
cd "$(dirname "$0")/../.."
CONC="$1"; shift
for course in "$@"; do
  echo "=== $(date -u +%H:%M:%S) $course (concurrency $CONC)"
  if ! node tools/course-optimization/fix-empty-seed-clause-audio.cjs --course "$course" --concurrency "$CONC"; then
    echo "!!! $course FAILED (exit $?) — stopping the run"
    exit 1
  fi
done
echo "=== $(date -u +%H:%M:%S) all courses done"
