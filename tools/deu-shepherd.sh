#!/usr/bin/env bash
# German shepherd — deu_for_eng banding past round 200, on port 3469.
#
# The sibling of tools/overnight-shepherd.sh (fra_for_eng, port 3468), which is
# running right now and is TOM'S FIRST PRIORITY. This file exists as a separate
# process, on a separate port, with separate state, precisely so that the two
# runs cannot reach into each other. Everything below that looks like duplication
# of the French shepherd is deliberate isolation, not copy-paste laziness:
#
#   port 3469          — NOT 3467. The French shepherd's deu_report() watches 3467
#                        and will RESTART a phase-8 service that goes unreachable
#                        there. If this shepherd also owned 3467 we would have two
#                        loops resurrecting one service: the exact split-brain the
#                        French shepherd's header warns about. 3467 is left alone,
#                        idle and harmless, holding the finished 1-200 run.
#   own lock/state     — /tmp/deu-shepherd.lock, ~/.deu-band-{runid,state}
#   own verdict cache  — see AUDIO_VERACITY_CACHE_PATH below
#   concurrency 2      — see CONCURRENCY below
#
# It never reads, writes, signals or restarts anything belonging to the French run.
#
# What is durable where (same contract as the French shepherd):
#   - clip work  : the DATABASE (applyReusePlan commits each swap as it lands), so any
#                  restart is idempotent and finished clips re-plan as SATISFIED
#   - band state : $BANDSTATE, so a restart of THIS script resumes at the right band
#   - evidence   : docs/audio-repair-2026-08-07/*-reuse-applied-log.json, per band
set -uo pipefail

# SINGLE INSTANCE, ENFORCED. Re-exec under flock; a second copy exits immediately.
LOCK=/tmp/deu-shepherd.lock
if [ "${SHEPHERD_LOCKED:-}" != "1" ]; then
  export SHEPHERD_LOCKED=1
  exec flock -n "$LOCK" "$0" "$@" || { echo "another deu shepherd holds $LOCK — exiting"; exit 0; }
fi

# The sleep child INHERITS the lock fd, so killing the shepherd while it sleeps leaves
# an orphaned sleep holding the lock and the next start fails with a bare exit 1 for up
# to a minute. Found the hard way on the French side at 05:32Z on 2026-08-07. So the
# poll wait is an interruptible child we own and kill on the way out.
NAPPID=
trap 'kill $NAPPID 2>/dev/null; exit 0' TERM INT
nap() { sleep "$1" & NAPPID=$!; wait $NAPPID 2>/dev/null; NAPPID=; }

REPO=/home/tomcassidy/SSi/ssi-dashboard-v7-clean

# Cut fresh from COMMITTED HEAD 2112ac32 at 11:2xZ on 2026-08-07 — git archive, never
# the working tree, which is shared with other live sessions and permanently dirty.
# node_modules is hardlinked from the French SNAP2 (read-only at runtime), so the tree
# costs 111M rather than 1.2G and needed no install. It has fromRound (11 occurrences)
# and the persistent verdict cache; the ORIGINAL German snapshot
# (~/.deu-redo-snapshot-2026-08-07, which ran rounds 1-200) has ZERO occurrences of
# fromRound, so launching a band from it would silently re-plan from round 1.
SNAP=/home/tomcassidy/.deu-redo-snapshot2-2026-08-07

PORT=3469
COURSE=deu_for_eng

LOG=/tmp/deu-shepherd.log
PHASE8LOG=/tmp/deu-phase8-3469.log
RUNID=/home/tomcassidy/.deu-band-runid
BANDSTATE=/home/tomcassidy/.deu-band-state      # holds the band index we are on
ALERTS=/tmp/deu-shepherd-alerts.log

# Bands: "fromRound:rounds", inclusive both ends, disjoint via fromRound.
# Derived from the DATA, not from the French numbers: deu_for_eng has 1,395 is_new
# LEGOs and therefore 1,395 rounds (fra_for_eng has 1,529 — hence its different tail
# band). Rounds 1-200 are already DONE: that run finished 06:44Z on 2026-08-07
# ({NONE:3590, REUSED_OWN:12, RENDERED:1323, REUSED_CROSS:506, FAILED:3}), so this
# shepherd starts at 201. Band size 200 mirrors French: bands exist to CHECKPOINT,
# and a band that takes 12h is a checkpoint that never lands.
BANDS=("201:400" "401:600" "601:800" "801:1000" "1001:1200" "1201:1395")

# 8 cores, load already ~8-11 with the French run's whisper at concurrency 4.
# German is the SECOND priority and gets the smaller share. Do NOT raise above 2, and
# never raise French to compensate. If the box goes into distress (load past ~16, swap
# filling), drop this to 1 or pause German — French is never the thing that slows.
CONCURRENCY=2

# The persistent veracity-verdict store is loaded ONCE at run start and flushed as a
# WHOLE MAP every 200 new verdicts (services/phases/phase8-audio-v13.cjs ~6451-6480),
# so two processes on one file is last-write-wins clobbering — and what would be
# clobbered is the French run's thousands of remembered decodes. German therefore gets
# its own file. The cross-course reuse Tom actually cares about comes from the DATABASE
# clip pool, not from this cache, so the cost of not sharing is small and the cost of
# sharing is French's listening.
export AUDIO_VERACITY_CACHE_PATH=/home/tomcassidy/.audio-veracity-verdicts-deu.json

# Watson's live conversation. The French shepherd inherited an older id; this one was
# checked live (POST returned {"ok":true}) before the run started, because a band
# completing at 4am is useless if the channel it reports on is archived.
PARENT=6cbdeb4f-53ac-4993-85f8-ea542a12d88f
SURFACE=http://localhost:4317

say() { echo "[$(date -u +%H:%M:%SZ)] $*" >> "$LOG"; }

# Reporting must NOT depend on a chat session staying alive. The shepherd outlives any
# agent turn, so it pings the parent itself.
ping_parent() {
  python3 - "$1" "$PARENT" <<'PY' 2>/dev/null || true
import json,sys,urllib.request
body=json.dumps({"jobId":sys.argv[2],"text":sys.argv[1]}).encode()
r=urllib.request.Request("http://localhost:4317/api/reply",data=body,
                         headers={"Content-Type":"application/json"})
urllib.request.urlopen(r,timeout=20).read()
PY
}

alert() {
  echo "[$(date -u +%H:%M:%SZ)] $*" | tee -a "$ALERTS" >> "$LOG"
  ping_parent "[deu-shepherd $(date -u +%H:%MZ)] $*"
}

jget() { python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  for k in '$1'.split('.'):
    d = d.get(k) if isinstance(d,dict) else None
  print('' if d is None else d)
except Exception: print('')
" 2>/dev/null; }

run_state() {
  local id; id=$(tr -d '\n' < "$RUNID" 2>/dev/null)
  [ -n "$id" ] || { echo unknown; return; }
  local out; out=$(curl -s -m 20 "http://localhost:$PORT/reuse-run/$id" 2>/dev/null)
  [ -n "$out" ] || { echo unreachable; return; }
  local s; s=$(printf '%s' "$out" | jget state)
  echo "${s:-unknown}"
}

service_up() { curl -s -m 10 "http://localhost:$PORT/health" >/dev/null 2>&1; }

launch_service() {
  say "  launching phase8 on $PORT from $SNAP (HEAD 2112ac32)"
  ( cd "$SNAP" && PHASE8_PORT=$PORT AUDIO_VERACITY_CACHE_PATH="$AUDIO_VERACITY_CACHE_PATH" \
      AUDIO_VERACITY_CONCURRENCY=$CONCURRENCY \
      nohup node services/phases/phase8-audio-v13.cjs >> "$PHASE8LOG" 2>&1 & )
  for _ in $(seq 1 30); do sleep 5; service_up && { say "  service up"; return 0; }; done
  alert "DEU service failed to come up on $PORT after 150s"
  return 1
}

start_band() {
  local idx=$1
  local spec=${BANDS[$idx]}
  local from=${spec%%:*} to=${spec##*:}
  say "START DEU band $((idx+1)): rounds $from-$to (concurrency $CONCURRENCY, verifyIncumbents, freshRoles=presentation)"
  local out; out=$(curl -s -m 300 -X POST "http://localhost:$PORT/reuse-apply/$COURSE" \
    -H 'Content-Type: application/json' \
    -d "{\"rounds\":$to,\"fromRound\":$from,\"dryRun\":false,\"confirm\":\"$COURSE\",\"concurrency\":$CONCURRENCY,\"verifyIncumbents\":true,\"freshRoles\":[\"presentation\"]}")
  say "  -> ${out:0:400}"
  local id; id=$(printf '%s' "$out" | jget runId)
  if [ -z "$id" ]; then alert "DEU band $((idx+1)) did NOT start: ${out:0:300}"; return 1; fi
  printf '%s\n' "$id" > "$RUNID"
  printf '%s\n' "$idx" > "$BANDSTATE"
  say "  band $((idx+1)) runId=$id"
}

# A band is only DONE when its artifact exists on disk. "state:done" without the
# applied-log is a claim, not evidence (honesty rule). Note the service DOES write an
# artifact of its own, but into $SNAP/docs/... (REUSE_ARTIFACT_DIR is relative to the
# service's __dirname), which is a throwaway tree — the durable copy is the one this
# shepherd writes into the REPO.
band_artifact() {
  local spec=${BANDS[$1]}; local from=${spec%%:*} to=${spec##*:}
  local p="$REPO/docs/audio-repair-2026-08-07/${COURSE}-rounds${from}-${to}-reuse-applied-log.json"
  [ -f "$p" ] && echo "$p" || echo ""
}

persist_artifact() {
  local idx=$1
  local spec=${BANDS[$idx]}; local from=${spec%%:*} to=${spec##*:}
  local id; id=$(tr -d '\n' < "$RUNID" 2>/dev/null); [ -n "$id" ] || return 1
  local out="$REPO/docs/audio-repair-2026-08-07/${COURSE}-rounds${from}-${to}-reuse-applied-log.json"
  curl -s -m 180 "http://localhost:$PORT/reuse-run/$id" -o /tmp/deu-band-$((idx+1))-run.json || return 1
  python3 - /tmp/deu-band-$((idx+1))-run.json "$out" "$from" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
if d.get('state')!='done' or not d.get('log'): sys.exit(1)
log=d['log']
log['runState']=d['state']; log['runStartedAt']=d.get('startedAt'); log['runFinishedAt']=d.get('finishedAt')
log['fromRound']=int(sys.argv[3])
json.dump(log,open(sys.argv[2],'w'),indent=1,ensure_ascii=False)
PY
}

# The damage figure — the share of incumbent clips that are present, alive and WRONG.
# French measured 497/5,217 (9.5%): 402 last-word-missing, 95 CER-above-threshold.
# Tom wants the same number for German. The listen logs a running count every 200
# clips; reported every 1,000 to stay useful without becoming noise, final line always.
DAMAGE_SEEN=/home/tomcassidy/.deu-damage-reported
damage_watch() {
  grep -hE "listened to .* incumbent clips|ReuseFirst veracity\] [0-9]+/" "$PHASE8LOG" 2>/dev/null \
  | while IFS= read -r line; do
      case "$line" in
        *"ReuseFirst veracity]"*)
          n=$(printf '%s' "$line" | sed -n 's/.*veracity\] \([0-9]*\)\/.*/\1/p')
          [ -n "$n" ] || continue
          [ $((n % 1000)) -eq 0 ] || continue
          ;;
      esac
      grep -Fqx "$line" "$DAMAGE_SEEN" 2>/dev/null && continue
      echo "$line" >> "$DAMAGE_SEEN"
      alert "DAMAGE — ${line#*\] }"
    done
}

say "=== deu shepherd starting (pid $$) ==="
[ -f "$BANDSTATE" ] || echo 0 > "$BANDSTATE"
touch "$DAMAGE_SEEN"

service_up || launch_service

tick=0
while true; do
  band=$(tr -d '\n' < "$BANDSTATE" 2>/dev/null); band=${band:-0}

  if [ "$band" -ge "${#BANDS[@]}" ]; then
    alert "ALL DEU BANDS COMPLETE — deu_for_eng rounds 1-1395 satisfied"
    exit 0
  fi

  st=$(run_state)
  case "$st" in
    running)
      # /status is the only live progress read; it says "planning" during the long
      # plan-build + incumbent-listen window, which is NOT idleness.
      p=$(curl -s -m 20 "http://localhost:$PORT/status" 2>/dev/null)
      pa=$(printf '%s' "$p" | jget active)
      if [ "$pa" = "True" ] || [ "$pa" = "true" ]; then
        say "DEU band $((band+1)) $(printf '%s' "$p" | jget current)/$(printf '%s' "$p" | jget total) failed=$(printf '%s' "$p" | jget failed)"
      else
        say "DEU band $((band+1)) planning/listening (run alive)"
      fi
      ;;
    done)
      art=$(band_artifact "$band")
      [ -z "$art" ] && { persist_artifact "$band" && art=$(band_artifact "$band"); }
      if [ -z "$art" ]; then
        if [ ! -f "/tmp/deu-shepherd-band$((band+1))-missing-reported" ]; then
          alert "DEU band $((band+1)) reports done but its applied-log artifact is MISSING — not advancing"
          touch "/tmp/deu-shepherd-band$((band+1))-missing-reported"
        else
          say "DEU band $((band+1)) still blocked on missing artifact (already alerted)"
        fi
      else
        alert "DEU BAND $((band+1)) COMPLETE — artifact $art"
        grep -h "listened to" "$PHASE8LOG" 2>/dev/null | tail -1 >> "$ALERTS"
        next=$((band+1))
        if [ "$next" -ge "${#BANDS[@]}" ]; then
          echo "$next" > "$BANDSTATE"
        else
          start_band "$next" || nap 60
        fi
      fi
      ;;
    failed)
      alert "DEU band $((band+1)) FAILED — restarting it (finished clips return SATISFIED)"
      service_up || launch_service
      start_band "$band" || nap 60
      ;;
    unreachable|unknown)
      # unknown also covers the service having died and lost its in-process run map.
      alert "DEU run state=$st — service check then (re)start of band $((band+1))"
      service_up || launch_service
      start_band "$band" || nap 60
      ;;
  esac

  damage_watch
  tick=$((tick+1))
  nap 60
done
