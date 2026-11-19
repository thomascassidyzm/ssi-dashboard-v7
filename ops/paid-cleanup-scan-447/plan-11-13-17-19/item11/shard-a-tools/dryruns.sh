#!/bin/bash
# One serial dry-run attempt per course (Popty edit-batch WITHOUT apply; rolled back). A course whose dry run does not
# finish inside 40 minutes is recorded as a GAP in item11/dryrun-status.txt — never retried in a loop.
cd "$(dirname "$0")/../.."
L=${CS_SCRATCH:-$HOME/.cs-scratch}
for c in "$@"; do
  if timeout 2400 python3 -I tools/dryrun.py item11 $c --chunk 50 > $L/dr-$c.log 2>&1; then
    echo "$(date -u +%FT%TZ) $c dry run finished: $(grep -c ' 200 ' $L/dr-$c.log) chunks answered 200, $(grep -vc ' 200 ' $L/dr-$c.log) other" >> item11/dryrun-status.txt
  else
    echo "$(date -u +%FT%TZ) $c dry run DID NOT FINISH in 40 min: GAP" >> item11/dryrun-status.txt
  fi
  cut -c1-300 $L/dr-$c.log | tail -12 >> item11/dryrun-status.txt
done
