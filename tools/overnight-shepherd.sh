#!/usr/bin/env bash
# Overnight shepherd — fra_for_eng banding (port 3468) + deu_for_eng watch (port 3467).
#
# SINGLE OWNER. The predecessor loop (tools/fra-rounds-supervisor.sh) is killed before
# this starts: two loops that both restart a dead service and both POST a new run is
# exactly how you get two competing passes on the same course. This one adopts the
# in-flight run by id rather than starting its own.
#
# What is durable where:
#   - clip work  : the DATABASE (applyReusePlan commits each swap as it lands), so any
#                  restart is idempotent and finished clips re-plan as SATISFIED
#   - band state : $BANDSTATE, so a restart of THIS script resumes at the right band
#   - evidence   : docs/audio-repair-2026-08-07/*-reuse-applied-log.json, per band
#
# FRA bands are disjoint via fromRound. Band 1 (1-200) is already flying on the OLD
# snapshot, which predates fromRound; every later band needs SNAP2 (ef0079dd), so the
# service is relaunched onto SNAP2 at the first band boundary.
set -uo pipefail

# SINGLE INSTANCE, ENFORCED. Two shepherds both resurrecting a dead service and both
# POSTing a fresh run is the split-brain this file exists to prevent — so it is a lock,
# not a promise. Re-exec under flock; a second copy exits immediately.
LOCK=/tmp/overnight-shepherd.lock
if [ "${SHEPHERD_LOCKED:-}" != "1" ]; then
  export SHEPHERD_LOCKED=1
  exec flock -n "$LOCK" "$0" "$@" || { echo "another shepherd holds $LOCK — exiting"; exit 0; }
fi

REPO=/home/tomcassidy/SSi/ssi-dashboard-v7-clean
SNAP1=/home/tomcassidy/.fra-redo-snapshot-2026-08-07      # 0eae988d — no fromRound
SNAP2=/home/tomcassidy/.fra-redo-snapshot2-2026-08-07     # ef0079dd — has fromRound
DEUSNAP=/home/tomcassidy/.deu-redo-snapshot-2026-08-07

FRA_PORT=3468
DEU_PORT=3467
FRA_COURSE=fra_for_eng
DEU_COURSE=deu_for_eng

LOG=/tmp/overnight-shepherd.log
RUNID=/home/tomcassidy/.fra-band-runid
BANDSTATE=/home/tomcassidy/.fra-band-state     # holds the band index we are on
ALERTS=/tmp/overnight-shepherd-alerts.log      # things a human must look at

# Bands: "fromRound:rounds". SIZED ON MEASURED THROUGHPUT (05:20Z, this machine, both
# runs sharing 8 loaded cores):
#   incumbent listen  22.7 whisper decodes/min at concurrency 4
#   render+gate       ~15-17 clips/min
# Rounds 1-200 is 6,413 distinct clips: 4,314 incumbents to listen (3.2h) plus 2,099
# renders, more if the listen promotes damaged incumbents — 5.5-8h for the band.
# So a band is 200 rounds, not the 300-400 first guessed: bands exist to CHECKPOINT,
# and a band that takes 12h is a checkpoint that never lands. At ~32 distinct clips per
# round the whole 1,529-round course is ~49,000 clips — days of wall-clock, not a night.
BANDS=("1:200" "201:400" "401:600" "601:800" "801:1000" "1001:1200" "1201:1400" "1401:1529")

CONCURRENCY=4   # 8 cores, machine already loaded — do NOT raise (Tom's standing instruction)

say()   { echo "[$(date -u +%H:%M:%SZ)] $*" >> "$LOG"; }
alert() { echo "[$(date -u +%H:%M:%SZ)] $*" | tee -a "$ALERTS" >> "$LOG"; }

jget() { python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  for k in '$1'.split('.'):
    d = d.get(k) if isinstance(d,dict) else None
  print('' if d is None else d)
except Exception: print('')
" 2>/dev/null; }

fra_run_state() {
  local id; id=$(tr -d '\n' < "$RUNID" 2>/dev/null)
  [ -n "$id" ] || { echo unknown; return; }
  local out; out=$(curl -s -m 20 "http://localhost:$FRA_PORT/reuse-run/$id" 2>/dev/null)
  [ -n "$out" ] || { echo unreachable; return; }
  local s; s=$(printf '%s' "$out" | jget state)
  echo "${s:-unknown}"
}

fra_service_up() { curl -s -m 10 "http://localhost:$FRA_PORT/health" >/dev/null 2>&1; }

# Relaunch phase 8 on SNAP2 — the tree that has fromRound. Used for band 2+ and for
# any resurrection: SNAP2 is a strict superset of SNAP1's behaviour for this work.
fra_launch_service() {
  say "  launching phase8 on $FRA_PORT from SNAP2 (ef0079dd)"
  ( cd "$SNAP2" && PHASE8_PORT=$FRA_PORT nohup node services/phases/phase8-audio-v13.cjs \
      >> /tmp/fra-phase8-3468.log 2>&1 & )
  for _ in $(seq 1 30); do sleep 5; fra_service_up && { say "  service up"; return 0; }; done
  alert "FRA service failed to come up on $FRA_PORT after 150s"
  return 1
}

fra_start_band() {
  local idx=$1
  local spec=${BANDS[$idx]}
  local from=${spec%%:*} to=${spec##*:}
  say "START FRA band $((idx+1)): rounds $from-$to (concurrency $CONCURRENCY, verifyIncumbents, freshRoles=presentation)"
  local out; out=$(curl -s -m 300 -X POST "http://localhost:$FRA_PORT/reuse-apply/$FRA_COURSE" \
    -H 'Content-Type: application/json' \
    -d "{\"rounds\":$to,\"fromRound\":$from,\"dryRun\":false,\"confirm\":\"$FRA_COURSE\",\"concurrency\":$CONCURRENCY,\"verifyIncumbents\":true,\"freshRoles\":[\"presentation\"]}")
  say "  -> ${out:0:400}"
  local id; id=$(printf '%s' "$out" | jget runId)
  if [ -z "$id" ]; then alert "FRA band $((idx+1)) did NOT start: ${out:0:300}"; return 1; fi
  printf '%s\n' "$id" > "$RUNID"
  printf '%s\n' "$idx" > "$BANDSTATE"
  say "  band $((idx+1)) runId=$id"
}

# A band is only DONE when its artifact exists on disk. "state:done" without the
# applied-log is a claim, not evidence (honesty rule).
fra_band_artifact() {
  local spec=${BANDS[$1]}; local from=${spec%%:*} to=${spec##*:}
  local p="$REPO/docs/audio-repair-2026-08-07/${FRA_COURSE}-rounds${from}-${to}-reuse-applied-log.json"
  [ -f "$p" ] && echo "$p" || echo ""
}

deu_report() {
  local s; s=$(curl -s -m 20 "http://localhost:$DEU_PORT/status" 2>/dev/null)
  if [ -z "$s" ]; then
    alert "DEU service on $DEU_PORT is UNREACHABLE — restarting the SERVICE only"
    ( cd "$DEUSNAP" && PHASE8_PORT=$DEU_PORT nohup node services/phases/phase8-audio-v13.cjs \
        >> "$REPO/.a74-scratch/phase8-3467.log" 2>&1 & )
    alert "DEU run NOT auto-relaunched — it renders known+presentation onto the clone and the exact"
    alert "  launch params are not recoverable from the process; a human/shepherd turn must reissue it."
    return
  fi
  local active cur tot fail
  active=$(printf '%s' "$s" | jget active)
  cur=$(printf '%s' "$s" | jget current)
  tot=$(printf '%s' "$s" | jget total)
  fail=$(printf '%s' "$s" | jget failed)
  if [ "$active" = "True" ] || [ "$active" = "true" ]; then
    say "DEU $cur/$tot failed=$fail"
  else
    if grep -q "\[ReuseFirst\] .* finished" "$REPO/.a74-scratch/phase8-3467.log" 2>/dev/null; then
      alert "DEU FINISHED: $(grep '\[ReuseFirst\] .* finished' "$REPO/.a74-scratch/phase8-3467.log" | tail -1)"
    else
      say "DEU idle (planning, or between phases) cur=$cur tot=$tot"
    fi
  fi
}

say "=== overnight shepherd starting (pid $$) ==="
[ -f "$BANDSTATE" ] || echo 0 > "$BANDSTATE"

tick=0
while true; do
  band=$(tr -d '\n' < "$BANDSTATE" 2>/dev/null); band=${band:-0}

  if [ "$band" -ge "${#BANDS[@]}" ]; then
    alert "ALL FRA BANDS COMPLETE — full course 1-1529 satisfied"
    deu_report
    exit 0
  fi

  st=$(fra_run_state)
  case "$st" in
    running)
      # /status is the only live progress read; it says "planning" during the long
      # plan-build + incumbent-listen window, which is NOT idleness.
      p=$(curl -s -m 20 "http://localhost:$FRA_PORT/status" 2>/dev/null)
      pa=$(printf '%s' "$p" | jget active)
      if [ "$pa" = "True" ] || [ "$pa" = "true" ]; then
        say "FRA band $((band+1)) $(printf '%s' "$p" | jget current)/$(printf '%s' "$p" | jget total) failed=$(printf '%s' "$p" | jget failed)"
      else
        say "FRA band $((band+1)) planning/listening (run alive)"
      fi
      ;;
    done)
      art=$(fra_band_artifact "$band")
      if [ -z "$art" ]; then
        alert "FRA band $((band+1)) reports done but its applied-log artifact is MISSING — not advancing"
      else
        alert "FRA BAND $((band+1)) COMPLETE — artifact $art"
        grep -h "listened to" /tmp/fra-phase8-3468.log 2>/dev/null | tail -1 >> "$ALERTS"
        next=$((band+1))
        if [ "$next" -ge "${#BANDS[@]}" ]; then
          echo "$next" > "$BANDSTATE"
        else
          # Band 2+ needs fromRound, which the running SNAP1 service does not have.
          if [ "$next" -eq 1 ]; then
            say "restarting phase8 onto SNAP2 before band 2 (SNAP1 has no fromRound)"
            pkill -f "$SNAP1/services/phases/phase8-audio-v13.cjs" 2>/dev/null
            pgrep -f "PHASE8_PORT=$FRA_PORT" >/dev/null 2>&1 && sleep 2
            fuser -k -n tcp $FRA_PORT 2>/dev/null; sleep 5
            fra_launch_service || { sleep 60; continue; }
          fi
          fra_start_band "$next" || sleep 60
        fi
      fi
      ;;
    failed)
      alert "FRA band $((band+1)) FAILED — restarting it (finished clips return SATISFIED)"
      fra_service_up || fra_launch_service
      fra_start_band "$band" || sleep 60
      ;;
    unreachable|unknown)
      # unknown also covers the service having died and lost its in-process run map.
      alert "FRA run state=$st — service check then restart of band $((band+1))"
      fra_service_up || fra_launch_service
      fra_start_band "$band" || sleep 60
      ;;
  esac

  tick=$((tick+1))
  [ $((tick % 5)) -eq 1 ] && deu_report
  sleep 60
done
