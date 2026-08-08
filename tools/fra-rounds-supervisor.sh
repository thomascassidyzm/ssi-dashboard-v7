#!/usr/bin/env bash
# fra_for_eng rounds 1-200 reuse-first supervisor (pinned-service edition).
#
# The work is durable in the DATABASE: applyReusePlan commits each clip's swap
# or relink the moment it lands, so an interrupted run loses nothing — a re-plan
# reports the finished clips SATISFIED and renders only the rest. This loop makes
# that recovery automatic.
#
# It tracks the RUN ID, not just /status, because a 200-round plan takes minutes
# to build and /status reads inactive for the whole of that window. Watching
# /status alone would see "idle" and start a second, competing run.
#
#   pinned service : port 3468, ~/.fra-redo-snapshot-2026-08-07
#   why pinned     : the live checkout is edited by other sessions mid-run, and
#                    the run must keep the post-04:28Z last-word veracity gate
#                    it loaded at start.
set -uo pipefail

COURSE=fra_for_eng
ROUNDS=200
PORT=3468
RUNID_FILE=/home/tomcassidy/.fra-current-runid
STATE=/home/tomcassidy/.fra-rounds-supervisor.state

say() { echo "[$(date -u +%H:%M:%SZ)] $*"; }

run_state() {   # -> running | done | failed | unknown
  local id; id=$(tr -d '\n' < "$RUNID_FILE" 2>/dev/null)
  [ -n "$id" ] || { echo unknown; return; }
  curl -s -m 20 "http://localhost:$PORT/reuse-run/$id" 2>/dev/null | python3 -c "
import sys,json
try: print(json.load(sys.stdin).get('state','unknown'))
except Exception: print('unknown')
" 2>/dev/null
}

progress() {
  curl -s -m 20 "http://localhost:$PORT/status" 2>/dev/null | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  print(f\"{d.get('current',0)}/{d.get('total',0)} ok={d.get('success',0)} failed={d.get('failed',0)}\" if d.get('active') else 'planning')
except Exception: print('?')
" 2>/dev/null
}

start_run() {
  say "START rounds 1-$ROUNDS on port $PORT"
  local out; out=$(curl -s -m 120 -X POST "http://localhost:$PORT/reuse-apply/$COURSE" \
    -H 'Content-Type: application/json' \
    -d "{\"rounds\":$ROUNDS,\"dryRun\":false,\"confirm\":\"$COURSE\",\"concurrency\":4,\"verifyIncumbents\":true}")
  say "  -> $out"
  echo "$out" | python3 -c "
import sys,json
try: sys.stdout.write(json.load(sys.stdin).get('runId','')+'\n')
except Exception: pass
" > "$RUNID_FILE"
}

last_bucket=-1
while true; do
  st=$(run_state)
  case "$st" in
    running)
      p=$(progress)
      echo "$p state=running" > "$STATE"
      cur=${p%%/*}
      if [[ "$cur" =~ ^[0-9]+$ ]]; then
        b=$(( cur / 250 ))
        if [ "$b" -ne "$last_bucket" ]; then say "PROGRESS $p"; last_bucket=$b; fi
      fi
      ;;
    done)
      say "RUN FINISHED — verifying nothing is outstanding"
      rem=$(curl -s -m 1800 -X POST "http://localhost:$PORT/reuse-apply/$COURSE" \
        -H 'Content-Type: application/json' -d "{\"rounds\":$ROUNDS,\"dryRun\":true}" \
        | python3 -c "
import sys,json
try:
  s=json.load(sys.stdin).get('plan',{}).get('summary',{})
  print(s.get('total',0)-s.get('satisfied',0)-s.get('blocked',0))
except Exception: print(-1)
" 2>/dev/null)
      say "OUTSTANDING clips: $rem"
      if [ "${rem:--1}" -gt 0 ] 2>/dev/null; then
        say "work remains after a finished run — starting another pass"
        start_run; last_bucket=-1
      else
        say "DONE — rounds 1-$ROUNDS fully satisfied"
        echo "DONE" > "$STATE"; exit 0
      fi
      ;;
    failed|unknown)
      # unknown covers the service having died and lost its in-process run map.
      say "RUN STATE=$st — restarting the pass (finished clips come back SATISFIED)"
      if ! curl -s -m 10 "http://localhost:$PORT/health" >/dev/null 2>&1; then
        say "  pinned service is down — relaunching it first"
        ( cd /home/tomcassidy/.fra-redo-snapshot-2026-08-07 \
          && PHASE8_PORT=$PORT nohup node services/phases/phase8-audio-v13.cjs \
             >> /tmp/fra-phase8-3468.log 2>&1 & )
        sleep 20
      fi
      start_run; last_bucket=-1; sleep 60
      ;;
  esac
  sleep 60
done
