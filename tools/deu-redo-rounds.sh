#!/usr/bin/env bash
# deu_for_eng audio redo — rounds 1..ROUNDS, resumable.
#
# This is scripts/deu-total-known-replace.sh (the driver that produced the
# 2026-08-06 seeds 1-10 repair Tom heard and approved), with ONE change: the
# worklist comes from the REAL learning-script generator scoped to rounds,
# instead of the known-only SQL. Everything downstream is identical —
# `propose --spend` renders and whisper-verifies, `build-accept-manifest`
# rebuilds the manifest from the DB's pending-candidate table, `accept` swaps
# the link in place at a bumped revision, audio_stamp is bumped. Nothing is
# created, nothing is deleted, no CASCADE can fire.
#
# Each round re-derives what is still off the current generation FROM THE DB,
# so a restart never repeats work.
set -u
cd "$(dirname "$0")/.."
COURSE=${COURSE:-deu_for_eng}
ROUNDS=${ROUNDS:-200}
SHARDS=${SHARDS:-12}
ROUND_SIZE=${ROUND_SIZE:-720}
MAX_BATCHES=${MAX_BATCHES:-0}   # 0 = run to completion; >0 = stop after N (shakedown)
WORK=${WORK:-/tmp/deu-redo-r$ROUNDS}
mkdir -p "$WORK"
export $(grep -v '^#' .env.psql | xargs)
PSQL=~/.local/pg17/bin/psql

round=0
while :; do
  round=$((round+1))
  node tools/deu-rounds-enumerate.cjs "$COURSE" "$ROUNDS" "$WORK/all-remaining.json" \
    > "$WORK/enumerate-$round.json" 2> "$WORK/enumerate-$round.log" || {
      echo "enumerate failed — see $WORK/enumerate-$round.log"; exit 1; }
  N=$(python3 -c "import json;print(len(json.load(open('$WORK/all-remaining.json'))['items']))")
  echo "=== batch $round: $N clip(s) still stale in rounds 1-$ROUNDS  $(date -u +%H:%M:%SZ)"
  [ "$N" -eq 0 ] && { echo "DONE — rounds 1-$ROUNDS all on the current generation"; break; }

  python3 - "$WORK" "$SHARDS" "$ROUND_SIZE" "$COURSE" <<'PY'
import json,sys
work,shards,size,course=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]),sys.argv[4]
items=json.load(open(f'{work}/all-remaining.json'))['items'][:size]
for i in range(shards):
    json.dump({'course':course,'items':items[i::shards]}, open(f'{work}/shard-{i}.json','w'))
print(f'  rendering {len(items)} this batch across {shards} shards')
PY

  START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  sleep 1
  for i in $(seq 0 $((SHARDS-1))); do
    node tools/audio-repair.cjs propose "$COURSE" --targets "$WORK/shard-$i.json" --spend --actor claude \
      > "$WORK/shard-$i.log" 2>&1 &
  done
  wait

  node tools/audio-repair-accept-manifest.cjs "$COURSE" "$START" "$WORK/accept.json" || exit 1
  cp "$WORK/accept.json" "$WORK/accept-batch-$round.json"
  node tools/audio-repair.cjs accept "$COURSE" --from "$WORK/accept.json" --i-have-listened \
    --actor claude --reason "deu redo rounds 1-$ROUNDS" 2>&1 | tail -3
  $PSQL "$DATABASE_URL" -c "update courses set audio_stamp=now() where course_code='$COURSE';" >/dev/null
  [ "$MAX_BATCHES" -gt 0 ] && [ "$round" -ge "$MAX_BATCHES" ] && { echo "stopping after $round batch(es) — MAX_BATCHES"; break; }
done
