#!/usr/bin/env bash
# Job #709: resume the fin_for_eng English renders once the UTC day (and the 1M daily TTS cap) has turned over, then wake the job.
# Every step resumes from its .jsonl, so re-running this is safe.
set -u
cd "$(dirname "$0")/../.."
T=tools/course-optimization/fin-english-fill-709-2026-10-29.cjs; D=ops/fin-english-fill-709/full
START=$(date -u +%F)
while [ "$(date -u +%F)" = "$START" ] || [ "$(date -u +%H%M)" -lt 0010 ]; do sleep 60; done
for r in 21-230 231-450 451-9999; do node $T intro render $D --seeds $r > $D/intro-render-$r.day2.out 2>&1 & done
for r in 21-450 451-9999; do node $T known render $D --seeds $r > $D/known-render-$r.day2.out 2>&1 & done
wait
M="WAKE: fin709 day-2 renders finished: $(tail -qn1 $D/*.day2.out | tr '\n' ' ')"
node ~/command-surface/tools/cs-wake-send.cjs "$1" "$2" "$M"
