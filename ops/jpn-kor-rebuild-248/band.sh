#!/bin/bash
# One band, both courses: render (library first, one route) -> dry-run swap -> real swap only if the dry run had 0 errors.
# usage: band.sh <range> ["jpn"|"kor"|"jpn kor"]   (plan-<range>.json must exist; every row in it was read in full first)
set -u
R=$1; T=tools/course-optimization/jpn-kor-rebuild-248-2026-11-04.cjs; E=$HOME/ssi-evidence/ssi-dashboard-v7/ops/jpn-kor-rebuild-248
for c in ${2:-jpn kor}; do
  RENDER_CONFIRM=1 node $T audio $c $R --real > $E/audio-$c-$R.log 2>&1
  node $T apply $c $R > $E/apply-dry-$c-$R.log 2>&1
  if grep -q "errors 0" $E/apply-dry-$c-$R.log && grep -q "0 LEGOs wait for audio" $E/apply-dry-$c-$R.log; then
    APPLY_CONFIRM=1 node $T apply $c $R > $E/apply-$c-$R.log 2>&1
  else echo "STOP $c $R: dry run not clean or audio missing" > $E/apply-$c-$R.log; fi
done
