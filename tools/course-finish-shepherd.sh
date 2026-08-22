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
#  1. verifyIncumbents:false, and the question is now MOOT. Tom, 02:02Z:
#     all French and German incumbents are being wiped and replaced regardless,
#     so measuring how damaged one is produces a number nobody will act on.
#
#  2. NO WHISPER AT ALL. Neither the incumbent listen nor the pre-publish gate.
#     See the long note further down; the short version is that the damage came
#     from our own post-processing, which is deleted, not from TTS error rate.
#
#  3. THIS COURSE'S OWN CLIPS ARE NOT A REUSE SOURCE. Tom, 02:02Z: "we are not
#     checking any internal clips first from French or German ... because we
#     KNOW that both French and German are bobbins." Cross-course pool reuse at
#     the same voice stays ON and is wanted — it is where the free clips come
#     from — it just may never source from fra/deu themselves. Implemented as
#     distrustOwnBefore, a DATE (the day the destructive post-processing was
#     deleted), not a boolean, so a band restart does not re-buy this run's own
#     fresh output. Human recordings are never overwritten, whatever the policy.
#
# CONCURRENCY. Tom, 02:18Z: "concurrency should go to the xAI limits" — 8 was
# our own arbitrary clamp, not a real constraint. Two knobs matter, and only one
# of them is the endpoint's:
#
#   REUSE_CONCURRENCY   how many clips this run works on at once (endpoint bound,
#                       now REUSE_MAX_CONCURRENCY, configurable)
#   XAI_TTS_CONCURRENCY a PROCESS-GLOBAL semaphore inside tts-service.cjs,
#                       default 4. THIS is what actually binds xAI throughput —
#                       raising the endpoint number alone changes nothing,
#                       because every xAI call queues behind it.
#
# Both are set on the phase-8 instance at launch and driven up empirically. The
# live phase 8 on 3465 is never touched, so Tom's own popty.app work stays free.
set -uo pipefail

COURSE_KEY="${1:-}"
case "$COURSE_KEY" in
  fra)
    COURSE=fra_for_eng
    PORT=3468
    SNAP=${FINISH_SNAP:-${FINISH_REPO:-/home/tomcassidy/.finish-run-worktree}}
    VERDICT_CACHE=/home/tomcassidy/.audio-veracity-verdicts.json
    BANDS=("201:400" "401:600" "601:800" "801:1000" "1001:1200" "1201:1400" "1401:1529")
    ;;
  deu)
    COURSE=deu_for_eng
    PORT=3469
    SNAP=${FINISH_SNAP:-${FINISH_REPO:-/home/tomcassidy/.finish-run-worktree}}
    VERDICT_CACHE=/home/tomcassidy/.audio-veracity-verdicts-deu.json
    BANDS=("201:400" "401:600" "601:800" "801:1000" "1001:1200" "1201:1395")
    ;;
  *) echo "usage: $0 fra|deu" >&2; exit 2 ;;
esac

# The band list above is the 2026-08-08 overnight scope: round 201 upward. A
# later job with a different range (rounds 1-200, say) should not have to edit
# these profiles or fork the script, because a forked shepherd is a shepherd
# whose fixes stop arriving. BANDS_OVERRIDE="1:100 101:200" replaces the list.
if [ -n "${BANDS_OVERRIDE:-}" ]; then
  read -r -a BANDS <<< "$BANDS_OVERRIDE"
fi

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
# Both phase-8 instances now run from THIS tree too, not from the 08-07 snapshot
# trees. Those snapshots existed only because the main checkout lacked fromRound
# at the time; this branch has it, plus tonight's fixes, and is internally
# consistent and tested. Trying to hand-patch three divergent trees at 02:40
# broke two of them — one tested tree is better, simpler and cheaper than three.
# The snapshots have been restored to pristine and are untouched.
REPO=${FINISH_REPO:-/home/tomcassidy/.finish-run-worktree}
ARTDIR="$REPO/${SHEPHERD_ARTDIR:-docs/audio-repair-2026-08-07}"

# A second run of this shepherd over a DIFFERENT range must not inherit the
# first run's band cursor or run id, or it resumes a finished job and exits
# immediately. SHEPHERD_TAG namespaces every piece of per-run state.
TAG=${SHEPHERD_TAG:+-$SHEPHERD_TAG}
LOG=/tmp/finish-shepherd-$COURSE_KEY$TAG.log
PHASE8LOG=/tmp/$COURSE_KEY-phase8-$PORT.log
RUNID=/home/tomcassidy/.$COURSE_KEY$TAG-band-runid
BANDSTATE=/home/tomcassidy/.$COURSE_KEY$TAG-band-state
ALERTS=/tmp/finish-shepherd-$COURSE_KEY$TAG-alerts.log
# The sized follow-up repair job: how many incumbent clips we KEPT without
# listening to them, per band. Written so it cannot go missing from the report.
KEPTLOG=/home/tomcassidy/.$COURSE_KEY$TAG-kept-unheard.jsonl

CONCURRENCY=${REUSE_CONCURRENCY:-12}
XAI_CONCURRENCY=${XAI_TTS_CONCURRENCY:-8}
# The day Tom deleted audioProcessor.repairTailDefect. Own-course clips written
# before this could have been through the destructive trim; clips written after
# ship exactly as rendered.
DISTRUST_OWN_BEFORE=${DISTRUST_OWN_BEFORE:-2026-08-05}

# Hardcoding a conversation id sends every 4am progress ping into a room
# that ended hours ago. SHEPHERD_PARENT points them at the live job.
PARENT=${SHEPHERD_PARENT:-14d775d3-80ef-494e-bd8a-d5eaffb498bb}

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
      REUSE_MAX_CONCURRENCY=32 \
      XAI_TTS_CONCURRENCY=$XAI_CONCURRENCY \
      XAI_PHONO_GATE=0 \
      nohup node services/phases/phase8-audio-v13.cjs >> "$PHASE8LOG" 2>&1 & )
  for _ in $(seq 1 30); do sleep 5; service_up && { say "  service up"; return 0; }; done
  alert "$COURSE_KEY service failed to come up on $PORT after 150s"
  return 1
}

start_band() {
  local idx=$1
  local spec=${BANDS[$idx]}
  local from=${spec%%:*} to=${spec##*:}
  say "START $COURSE_KEY band $((idx+1)): rounds $from-$to (concurrency $CONCURRENCY, xai $XAI_CONCURRENCY, no whisper, own clips distrusted before $DISTRUST_OWN_BEFORE)"
  local out; out=$(curl -s -m 900 -X POST "http://localhost:$PORT/reuse-apply/$COURSE" \
    -H 'Content-Type: application/json' \
    -d "{\"rounds\":$to,\"fromRound\":$from,\"dryRun\":false,\"confirm\":\"$COURSE\",\"concurrency\":$CONCURRENCY,\"verifyIncumbents\":false,\"freshRoles\":[\"presentation\"],\"distrustOwnBefore\":\"$DISTRUST_OWN_BEFORE\"}")
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
import json,os,sys
d=json.load(open(sys.argv[1]))
if d.get('state')!='done' or not d.get('log'): sys.exit(1)
log=d['log']
# NEVER let a re-plan clobber the record of the band that did the work. A
# service restart makes the shepherd re-issue a band; the re-plan then finds
# every clip already satisfied and returns RENDERED:0 — correct as a plan, and
# a lie as a record. deu rounds 201-400 rendered 3,471 clips at 03:00:23Z on
# 2026-08-08 and the re-run overwrote it with 0. The work was real; only the
# bookkeeping was lost, and the morning report reads the bookkeeping.
if os.path.exists(sys.argv[2]):
    try:
        prev=json.load(open(sys.argv[2]))
        if (prev.get('counts') or {}).get('RENDERED',0) > (log.get('counts') or {}).get('RENDERED',0):
            sys.exit(0)   # keep the richer record, still counts as persisted
    except Exception:
        pass
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

# ── Verification: NONE. Tom's ruling, 2026-08-08 ────────────────────────────
# "I do not think we need EITHER and here is why - the error rate is generally
# acceptable and always has been UNLESS we are using bad post-processing."
#
# EITHER = the incumbent listen AND the pre-publish veracity gate. Both off for
# this run. The reasoning is his and it holds: TTS error rate was never the
# problem. The damage came from OUR post-processing — masterAudio called
# audioProcessor.repairTailDefect, which trimmed at the tail detector's
# timestamp and re-padded, and the detector cannot tell a tail click from a
# natural mid-sentence pause, so it ate every word after the pause. Tom deleted
# that path on 2026-08-05; masterAudio now normalises loudness, FLAGS tail
# defects read-only, and ships the clip exactly as rendered. The gate is
# insurance against a fire that is already out.
#
# There are THREE whisper legs in this pipeline, not two, and all three are off:
#   AUDIO_VERACITY_GATE=off  the pre-publish veracity gate
#   (no verify_band)         the sampled sweep over finished bands
#   XAI_PHONO_GATE=0         the xAI PHONOLOGY gate — the one that is easy to
#                            miss. It whispers every NON-ENGLISH xAI render to
#                            detect language drift, so on French and German
#                            target clips it fires on every single one. Measured
#                            2026-08-08: it held the run to ~8 clips/min, clips
#                            landing in pairs every 13s, because the decode
#                            serialises everything behind it. It is also the gate
#                            that calls a correct French "je" Turkish — whisper
#                            language-ID is unreliable on short clips.
#
# So there is no verify_band step and no whisper anywhere in this run. The gate
# CODE is untouched and every other job keeps its own default — this is an
# operational setting for tonight, set via AUDIO_VERACITY_GATE=off on this
# instance only.

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
