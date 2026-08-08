#!/usr/bin/env bash
# course-finish-shepherd — band a course to completion, with SAMPLED verification.
#
# Usage:  course-finish-shepherd.sh fra | deu
#
# ── What this is ────────────────────────────────────────────────────────────
# The successor to scripts/overnight-shepherd.sh (French) and tools/deu-shepherd.sh
# (German), which were written hours apart on 2026-08-07 and are ~90% identical.
# The isolation that actually mattered between them — port, lock, state files,
# verdict cache, artifact names — is all parameter, not structure, so this is one
# file with a course profile. Everything else about their contract is preserved:
#
#   - clip work  : durable in the DATABASE. applyReusePlan commits each swap as it
#                  lands, so any restart is idempotent and finished clips re-plan
#                  as SATISFIED. There is no delete-before-write in the path.
#   - band state : $BANDSTATE, so a restart resumes at the right band.
#   - evidence   : docs/audio-repair-2026-08-07/*-reuse-applied-log.json, per band.
#   - reporting  : the shepherd pings the parent conversation ITSELF. A band that
#                  completes at 4am is useless if the only thing that would have
#                  relayed it has ended.
#
# ── What CHANGED for the 2026-08-08 finish-the-courses run ──────────────────
# Tom's commission: finish both courses overnight, at as much concurrency as is
# allowed, and "unpick the automatic whispr thing — we know it's basically OK for
# these courses". Three deliberate changes follow from that:
#
#  1. verifyIncumbents:false. The incumbent listen was the dominant wall-clock
#     cost of the 2026-08-07 runs — French band 2 listened to 4,941 clips before
#     issuing a single render, and found 534 damaged (~11%). That is a real,
#     measured problem, but FINISHING and REPAIRING are different jobs, and
#     listening to ~5,000 incumbents per band across thirteen bands would spend
#     the whole night in ASR and finish nothing. So we keep incumbents unheard
#     and COUNT them (see $KEPTLOG) — the repair pass becomes a sized, named
#     follow-up rather than an invisible one.
#
#  2. AUDIO_VERACITY_GATE=off on the phase-8 instance, so the per-render whisper
#     decode does not gate every clip. It announces itself loudly in the log,
#     which is a feature.
#
#  3. ...replaced by a SAMPLED sweep at each band boundary: ~3% ASR sample via
#     tools/band-verify-sample.cjs plus the whole-band duration check via
#     tools/audio-pace-gate.cjs. Whisper here is not validating translation, it
#     is catching SILENT and TRUNCATED clips; the sample keeps that visible at a
#     thirtieth of the cost. If the sample says STOP, THIS SHEPHERD STOPS — it
#     does not grind through the night producing bad audio.
#
# Concurrency 6 (endpoint clamps 1-8). TTS render is network-bound so the
# marginal core cost is modest, but the sampled sweep is CPU-bound at 2 threads
# per decode and this box is shared — 6 per course leaves headroom for Tom's own
# popty.app work against the LIVE phase 8 on 3465, which this script never touches.
set -uo pipefail

COURSE_KEY="${1:-}"
case "$COURSE_KEY" in
  fra)
    COURSE=fra_for_eng
    PORT=3468
    SNAP=/home/tomcassidy/.fra-redo-snapshot2-2026-08-07
    VERDICT_CACHE=/home/tomcassidy/.audio-veracity-verdicts.json
    BANDS=("201:400" "401:600" "601:800" "801:1000" "1001:1200" "1201:1400" "1401:1529")
    ;;
  deu)
    COURSE=deu_for_eng
    PORT=3469
    SNAP=/home/tomcassidy/.deu-redo-snapshot2-2026-08-07
    VERDICT_CACHE=/home/tomcassidy/.audio-veracity-verdicts-deu.json
    BANDS=("201:400" "401:600" "601:800" "801:1000" "1001:1200" "1201:1395")
    ;;
  *) echo "usage: $0 fra|deu" >&2; exit 2 ;;
esac

# SINGLE INSTANCE, ENFORCED. Two shepherds both resurrecting a dead service and
# both POSTing a fresh run is split-brain: two competing passes on one course.
# So it is a lock, not a promise. Re-exec under flock; a second copy exits.
LOCK=/tmp/finish-shepherd-$COURSE_KEY.lock
if [ "${SHEPHERD_LOCKED:-}" != "1" ]; then
  export SHEPHERD_LOCKED=1
  exec flock -n "$LOCK" "$0" "$@" || { echo "another $COURSE_KEY shepherd holds $LOCK — exiting"; exit 0; }
fi

# The sleep child INHERITS the lock fd, so killing the shepherd mid-sleep leaves
# an orphaned sleep holding the lock and the next start fails with a bare exit 1
# for up to a minute. Found the hard way at 05:32Z on 2026-08-07. So the poll
# wait is an interruptible child we own and kill on the way out.
NAPPID=
trap 'kill $NAPPID 2>/dev/null; exit 0' TERM INT
nap() { sleep "$1" & NAPPID=$!; wait $NAPPID 2>/dev/null; NAPPID=; }

# The MAIN checkout is shared by several concurrent sessions and its branch
# moves under you — a commit of mine landed on another session's branch at
# 02:14Z on 2026-08-08 for exactly that reason. This run therefore reads its
# tools and writes its artifacts in a DEDICATED WORKTREE pinned to this
# branch, so a checkout elsewhere cannot swap the verification code out from
# under a band that is halfway through. node_modules and .env are symlinked
# from the main checkout (a sibling worktree has neither of its own).
REPO=${FINISH_REPO:-/home/tomcassidy/.finish-run-worktree}
ARTDIR="$REPO/docs/audio-repair-2026-08-07"

LOG=/tmp/finish-shepherd-$COURSE_KEY.log
PHASE8LOG=/tmp/$COURSE_KEY-phase8-$PORT.log
RUNID=/home/tomcassidy/.$COURSE_KEY-band-runid
BANDSTATE=/home/tomcassidy/.$COURSE_KEY-band-state
ALERTS=/tmp/finish-shepherd-$COURSE_KEY-alerts.log
# The sized follow-up repair job: how many incumbent clips we KEPT without
# listening to them, per band. Written so it cannot go missing from the report.
KEPTLOG=/home/tomcassidy/.$COURSE_KEY-kept-unheard.jsonl

CONCURRENCY=6
SAMPLE_RATE=0.03
MAX_FAIL_RATE=0.02

PARENT=14d775d3-80ef-494e-bd8a-d5eaffb498bb

say() { echo "[$(date -u +%H:%M:%SZ)] $*" >> "$LOG"; }

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
  ping_parent "[$COURSE_KEY-shepherd $(date -u +%H:%MZ)] $*"
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

# Gate OFF on the RENDERING process — the sampled sweep below is a SEPARATE
# process that runs with the gate ON, which is the only way to have both a cheap
# render path and an honest check.
launch_service() {
  say "  launching phase8 on $PORT from $SNAP (veracity gate OFF — sampled sweep runs per band)"
  ( cd "$SNAP" && PHASE8_PORT=$PORT \
      AUDIO_VERACITY_GATE=off \
      AUDIO_VERACITY_CACHE_PATH="$VERDICT_CACHE" \
      nohup node services/phases/phase8-audio-v13.cjs >> "$PHASE8LOG" 2>&1 & )
  for _ in $(seq 1 30); do sleep 5; service_up && { say "  service up"; return 0; }; done
  alert "$COURSE_KEY service failed to come up on $PORT after 150s"
  return 1
}

start_band() {
  local idx=$1
  local spec=${BANDS[$idx]}
  local from=${spec%%:*} to=${spec##*:}
  say "START $COURSE_KEY band $((idx+1)): rounds $from-$to (concurrency $CONCURRENCY, verifyIncumbents=FALSE, freshRoles=presentation)"
  local out; out=$(curl -s -m 900 -X POST "http://localhost:$PORT/reuse-apply/$COURSE" \
    -H 'Content-Type: application/json' \
    -d "{\"rounds\":$to,\"fromRound\":$from,\"dryRun\":false,\"confirm\":\"$COURSE\",\"concurrency\":$CONCURRENCY,\"verifyIncumbents\":false,\"freshRoles\":[\"presentation\"]}")
  say "  -> ${out:0:400}"
  local id; id=$(printf '%s' "$out" | jget runId)
  if [ -z "$id" ]; then alert "$COURSE_KEY band $((idx+1)) did NOT start: ${out:0:300}"; return 1; fi
  printf '%s\n' "$id" > "$RUNID"
  printf '%s\n' "$idx" > "$BANDSTATE"
  say "  band $((idx+1)) runId=$id"
}

band_artifact() {
  local spec=${BANDS[$1]}; local from=${spec%%:*} to=${spec##*:}
  local p="$ARTDIR/${COURSE}-rounds${from}-${to}-reuse-applied-log.json"
  [ -f "$p" ] && echo "$p" || echo ""
}

# phase 8 keeps the apply log IN PROCESS and serves it at GET /reuse-run/<id>; it
# also writes an artifact, but into $SNAP/docs/... (REUSE_ARTIFACT_DIR is relative
# to the service's __dirname), which is a throwaway tree. The durable copy is the
# one we write into the REPO. This writes evidence, it never manufactures it:
# no log, no file, no advance.
persist_artifact() {
  local idx=$1
  local spec=${BANDS[$idx]}; local from=${spec%%:*} to=${spec##*:}
  local id; id=$(tr -d '\n' < "$RUNID" 2>/dev/null); [ -n "$id" ] || return 1
  local out="$ARTDIR/${COURSE}-rounds${from}-${to}-reuse-applied-log.json"
  curl -s -m 300 "http://localhost:$PORT/reuse-run/$id" -o /tmp/$COURSE_KEY-band-$((idx+1))-run.json || return 1
  python3 - /tmp/$COURSE_KEY-band-$((idx+1))-run.json "$out" "$from" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
if d.get('state')!='done' or not d.get('log'): sys.exit(1)
log=d['log']
log['runState']=d['state']; log['runStartedAt']=d.get('startedAt'); log['runFinishedAt']=d.get('finishedAt')
log['fromRound']=int(sys.argv[3])
json.dump(log,open(sys.argv[2],'w'),indent=1,ensure_ascii=False)
PY
}

# The sized follow-up: incumbents we kept WITHOUT listening. NONE in the counts
# means "already satisfied, left alone" — with verifyIncumbents off, that is
# exactly the set nobody has heard. Recorded per band so the number cannot
# quietly vanish from the morning report.
record_kept_unheard() {
  local idx=$1 art=$2
  local spec=${BANDS[$idx]}; local from=${spec%%:*} to=${spec##*:}
  python3 - "$art" "$COURSE" "$from" "$to" "$KEPTLOG" <<'PY' 2>/dev/null || true
import json,sys
art,course,frm,to,out=sys.argv[1:6]
d=json.load(open(art))
c=d.get('counts') or {}
rec={"course":course,"fromRound":int(frm),"toRound":int(to),
     "keptUnheard":c.get('NONE',0),"rendered":c.get('RENDERED',0),
     "reusedCross":c.get('REUSED_CROSS',0),"reusedOwn":c.get('REUSED_OWN',0),
     "failed":c.get('FAILED',0)}
open(out,'a').write(json.dumps(rec)+"\n")
print(json.dumps(rec))
PY
}

# ── The sampled verification sweep ──────────────────────────────────────────
# Runs with the gate ON, in its own process, over the band that just finished.
# Returns 0 = CONTINUE, 1 = STOP (sampled failure rate above threshold),
# anything else = could not check, which is NOT a pass and also stops us.
verify_band() {
  local idx=$1 art=$2
  local spec=${BANDS[$idx]}; local from=${spec%%:*} to=${spec##*:}
  local vout="$ARTDIR/${COURSE}-rounds${from}-${to}-sampled-verify.json"
  say "  sampled verification over band $((idx+1)) (rate $SAMPLE_RATE, max fail $MAX_FAIL_RATE)"
  ( cd "$REPO" && AUDIO_VERACITY_CONCURRENCY=2 AUDIO_VERACITY_THREADS=2 \
      node tools/band-verify-sample.cjs "$art" \
        --rate "$SAMPLE_RATE" --max-fail-rate "$MAX_FAIL_RATE" \
        --json "$vout" >> "$LOG" 2>&1 )
  local rc=$?
  local line; line=$(grep -h "SAMPLED\|failure rate" "$LOG" | tail -2 | tr '\n' ' ')
  say "  verify rc=$rc :: $line"

  # The pace gate over the same window — free, deterministic, and the direct
  # test for "duration anomalous against its text length". Advisory: it reports
  # into the band record, it does not by itself halt the run.
  local pout="$ARTDIR/${COURSE}-rounds${from}-${to}-pace-gate.json"
  ( cd "$REPO" && node tools/audio-pace-gate.cjs "$COURSE" --json "$pout" >> "$LOG" 2>&1 ) || true

  if [ $rc -eq 0 ]; then
    alert "$COURSE_KEY band $((idx+1)) VERIFY CLEAN — $line"
    return 0
  elif [ $rc -eq 1 ]; then
    alert "$COURSE_KEY band $((idx+1)) VERIFY SAYS STOP — $line — HALTING, no further bands. Evidence: $vout"
    return 1
  else
    alert "$COURSE_KEY band $((idx+1)) VERIFY COULD NOT CHECK (rc=$rc) — that is NOT a pass. HALTING. See $LOG"
    return 1
  fi
}

say "=== $COURSE_KEY finish-shepherd starting (pid $$, course $COURSE, port $PORT) ==="
[ -f "$BANDSTATE" ] || echo 0 > "$BANDSTATE"
service_up || launch_service

while true; do
  band=$(tr -d '\n' < "$BANDSTATE" 2>/dev/null); band=${band:-0}

  if [ "$band" -ge "${#BANDS[@]}" ]; then
    last=${BANDS[$(( ${#BANDS[@]} - 1 ))]}
    alert "ALL $COURSE_KEY BANDS COMPLETE — $COURSE finished to round ${last##*:}"
    exit 0
  fi

  st=$(run_state)
  case "$st" in
    running)
      # /status is the only live progress read; it reads inactive during the long
      # plan-build window, which is NOT idleness.
      p=$(curl -s -m 20 "http://localhost:$PORT/status" 2>/dev/null)
      pa=$(printf '%s' "$p" | jget active)
      if [ "$pa" = "True" ] || [ "$pa" = "true" ]; then
        say "$COURSE_KEY band $((band+1)) $(printf '%s' "$p" | jget current)/$(printf '%s' "$p" | jget total) failed=$(printf '%s' "$p" | jget failed)"
      else
        say "$COURSE_KEY band $((band+1)) planning (run alive)"
      fi
      ;;
    done)
      art=$(band_artifact "$band")
      [ -z "$art" ] && { persist_artifact "$band" && art=$(band_artifact "$band"); }
      if [ -z "$art" ]; then
        if [ ! -f "/tmp/finish-$COURSE_KEY-band$((band+1))-missing-reported" ]; then
          alert "$COURSE_KEY band $((band+1)) reports done but its applied-log artifact is MISSING — not advancing"
          touch "/tmp/finish-$COURSE_KEY-band$((band+1))-missing-reported"
        else
          say "$COURSE_KEY band $((band+1)) still blocked on missing artifact (already alerted)"
        fi
      else
        kept=$(record_kept_unheard "$band" "$art")
        alert "$COURSE_KEY BAND $((band+1)) COMPLETE — $kept"
        if ! verify_band "$band" "$art"; then
          exit 1   # halt: a band that fails verification does not release the next one
        fi
        next=$((band+1))
        if [ "$next" -ge "${#BANDS[@]}" ]; then
          echo "$next" > "$BANDSTATE"
        else
          start_band "$next" || nap 60
        fi
      fi
      ;;
    failed)
      alert "$COURSE_KEY band $((band+1)) FAILED — restarting it (finished clips return SATISFIED)"
      service_up || launch_service
      start_band "$band" || nap 60
      ;;
    unreachable|unknown)
      # unknown also covers the service having died and lost its in-process run map.
      alert "$COURSE_KEY run state=$st — service check then (re)start of band $((band+1))"
      service_up || launch_service
      start_band "$band" || nap 60
      ;;
  esac

  nap 60
done
