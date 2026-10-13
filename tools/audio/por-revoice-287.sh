#!/usr/bin/env bash
# Portuguese re-voice (job #287, Tom 2026-10-13 GO), ONE course per run: $1 = por_for_eng | por_br_for_eng, $2 = cast key (por | por_br).
# Stage 1 renders every new-voice clip (--render-only, nothing repointed); stage 2 repeats the same commands, finding each clip in the
# library (free), and repoints + bumps content_version. Stage 2 runs only if stage 1 left nothing outstanding.
set -u
C=$1; CAST=$2; export BACKFILL_JOB='#287' CONCURRENCY=${CONCURRENCY:-4}
B="node tools/audio/charlotte-backfill.cjs --course $C --seeds 1-100 --budget 150000"
P="node tools/audio/pod-revoice.cjs --pod $C:pod-1 --cast $CAST --budget 60000"
for mode in --render-only ""; do
  echo "=== $C stage ${mode:-repoint} $(date -u +%FT%TZ)"
  out=""
  for cmd in "$B --voices por-target1 $mode" "$B --voices por-target2 $mode" "$P $mode"; do
    echo "--- $cmd"; o=$($cmd 2>&1); echo "$o" | grep -E "old clips|NO CAST|REFUSED|FAIL|VERIFY|OUTSTANDING|SKIPPED|done |content_version|speakers" | cut -c1-300
    n=$(echo "$o" | sed -n 's/^OUTSTANDING \([0-9]*\).*/\1/p' | tail -1); [ -z "$n" ] && { echo "unreadable output: stop"; exit 2; }
    out="$out $n"
  done
  echo "outstanding per pass:$out"
  for n in $out; do [ "$n" != 0 ] && { echo "work still outstanding after stage ${mode:-repoint}: stopping for a human"; exit 3; }; done
done
echo "ALL DONE $C $(date -u +%FT%TZ)"
