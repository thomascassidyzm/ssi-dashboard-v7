#!/bin/bash
# One band: render (real renders only, library first, one route) -> apply.
# usage: band.sh <range> ["jpn"|"kor"|"jpn kor"]   (plan-<range>.json must exist; every row in it was read in full first)
# No dry runs against live (Tom 2026-11-05 18:15Z): the audio estimate is local, and apply lands a LEGO only when every one
# of its new rows has all three clips (checked locally), each LEGO in its own transactions — an error leaves its old basket.
set -u
R=$1; T=tools/course-optimization/jpn-kor-rebuild-248-2026-11-04.cjs; E=$HOME/ssi-evidence/ssi-dashboard-v7/ops/jpn-kor-rebuild-248
for c in ${2:-jpn kor}; do
  RENDER_CONFIRM=1 node $T audio $c $R --real > $E/audio-$c-$R.log 2>&1
  APPLY_CONFIRM=1 node $T apply $c $R > $E/apply-$c-$R.log 2>&1
done
