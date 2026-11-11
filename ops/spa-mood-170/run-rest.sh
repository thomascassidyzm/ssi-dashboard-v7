#!/usr/bin/env bash
# Job #170: the long tail, run as a systemd unit so it outlives the session. Popty production restarts on every deploy to main
# (four times on 11 Nov afternoon), so every step first waits for Popty to answer, and a step that lost its connection is run
# again — never a render that was REFUSED or FAILED (those are recorded and left for a person): a re-run answers library-first,
# so a clip already made is linked for 0 chars, never paid for twice. Steps: v2 audio → v2 link → sweep text → sweep audio →
# sweep link → verify both stages. Then wakes the job.
cd "$(dirname "$0")/../.."
T=tools/course-optimization/spa-mood-never-bare-2026-11-11.cjs
S="$(pwd)/ops/spa-mood-170/run/seeds.json"
up() { for i in $(seq 1 120); do curl -s -m 5 -o /dev/null -w "%{http_code}" http://localhost:3470/api/production/spa_for_eng/edit-ops | grep -q 200 && return 0; sleep 5; done; return 1; }
seeds() { up; curl -s --max-time 600 http://localhost:3470/api/production/spa_for_eng/seeds -o "$S"; }
step() { # step <label> <tries> <env...> -- <mode>
  local label=$1 tries=$2; shift 2
  for i in $(seq 1 $tries); do
    echo "== $label try $i $(date -u +%H:%M)"; seeds
    out=$(env "$@" node $T "${MODE}" "$S" 2>&1); echo "$out" | grep -v '^   UPD\|^   DEL\|^   NEW\|^real 200\|^wrote'
    echo "$out" | grep -q 'fetch failed\|statement timeout\|real ERR' || return 0
    sleep 30
  done
}
MODE=audio step "v2 audio" 4 STAGE=v2 APPLY_CONFIRM=1
MODE=link  step "v2 link" 4 STAGE=v2 APPLY_CONFIRM=1
MODE=text  step "sweep text" 6 STAGE=sweep APPLY_CONFIRM=1
MODE=audio step "sweep audio" 4 STAGE=sweep SKIP_DRY=1 APPLY_CONFIRM=1
MODE=link  step "sweep link" 4 STAGE=sweep APPLY_CONFIRM=1
echo "== verify $(date -u +%H:%M)"; seeds; STAGE=v2 node $T verify "$S"; STAGE=sweep node $T verify "$S"
echo "== done $(date -u +%H:%M)"
