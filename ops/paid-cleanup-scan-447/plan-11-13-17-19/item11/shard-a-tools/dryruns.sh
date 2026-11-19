#!/bin/bash
# One serial dry-run attempt per course (Popty edit-batch WITHOUT apply; rolled back). The outcome of each attempt is
# appended to item11/dryrun-status.txt: finished (with the count of chunks answered 200), timed out at 40 minutes, or
# failed (Popty unreachable). A course is never retried in a loop.
cd "$(dirname "$0")/../.."
L=${CS_SCRATCH:-$HOME/.cs-scratch}
for c in "$@"; do
  timeout 2400 python3 -I tools/dryrun.py item11 $c --chunk 50 > $L/dr-$c.log 2>&1; rc=$?
  if [ $rc = 0 ]; then msg="finished: $(grep -c ' 200 ' $L/dr-$c.log) chunks answered 200, $(grep -c "^$c ops" $L/dr-$c.log) chunks sent"
  elif [ $rc = 124 ]; then msg="TIMED OUT at 40 min: GAP"
  else msg="FAILED (exit $rc: $(tail -1 $L/dr-$c.log | cut -c1-120)): GAP"; fi
  echo "$(date -u +%FT%TZ) $c dry run $msg" >> item11/dryrun-status.txt
done
