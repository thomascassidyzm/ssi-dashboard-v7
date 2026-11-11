#!/usr/bin/env bash
# Job #170: the long tail, run as a systemd unit so it outlives the session (the shared DB was timing out, renders ~1/min).
# v2 audio (resumes; library-first answers what is already made) → v2 link → sweep text (retried only on a DB statement timeout;
# the batch is atomic) → sweep audio (SKIP_DRY) → sweep link → verify both stages. Then wakes the job.
cd "$(dirname "$0")/../.."
T=tools/course-optimization/spa-mood-never-bare-2026-11-11.cjs
S=${CS_SCRATCH:-/tmp}/rest-seeds.json
seeds() { curl -s --max-time 600 http://localhost:3470/api/production/spa_for_eng/seeds -o "$S"; }
echo "== v2 audio $(date -u +%H:%M)"; seeds; STAGE=v2 APPLY_CONFIRM=1 node $T audio "$S"
echo "== v2 link $(date -u +%H:%M)"; seeds; STAGE=v2 APPLY_CONFIRM=1 node $T link "$S"
for i in 1 2 3 4 5 6; do
  echo "== sweep text try $i $(date -u +%H:%M)"; seeds
  out=$(STAGE=sweep APPLY_CONFIRM=1 node $T text "$S" 2>&1); echo "$out" | grep -v '^   UPD\|^   DEL\|^   NEW'
  echo "$out" | grep -q 'statement timeout' || break; sleep 120
done
echo "== sweep audio $(date -u +%H:%M)"; seeds; STAGE=sweep SKIP_DRY=1 APPLY_CONFIRM=1 node $T audio "$S"
echo "== sweep link $(date -u +%H:%M)"; seeds; STAGE=sweep APPLY_CONFIRM=1 node $T link "$S"
echo "== verify $(date -u +%H:%M)"; seeds; STAGE=v2 node $T verify "$S"; STAGE=sweep node $T verify "$S"
echo "== done $(date -u +%H:%M)"
