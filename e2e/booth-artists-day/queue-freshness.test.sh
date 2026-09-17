#!/bin/sh
# The one test for the 2026-09-17 fix: the nightly booth run never reads the recordist queue
# BEFORE it resets the fixture, and never believes an answer older than that reset.
#
# The red it exists to stop, from ~/ssi-ci/runs/20260917T020055Z/dashboard-main:
#   Error: the test voice's queue is not fresh: total=8 recorded=8 — run fixture.cjs reset
# …on a run whose own log line two rows above said `reset: {"deletedAudio":8,...}`. The reset
# had happened. The API was answering out of the queue cache added in 485d503fb, warmed by
# run.sh's own health curl moments before the reset wiped the takes it described.
#
#   sh e2e/booth-artists-day/queue-freshness.test.sh
#
# QUEUE_FRESHNESS_REPO points this at another checkout, which is how the fix is proved: run
# against the pre-fix tree (3b6ad708) the ordering check below goes red, against this one green.
set -u
REPO=${QUEUE_FRESHNESS_REPO:-$(git rev-parse --show-toplevel)}
RUNSH=$REPO/e2e/booth-artists-day/run.sh
WAITSH=$REPO/e2e/booth-artists-day/wait-queue-fresh.sh
TMP=${TMPDIR:-/tmp}/queue-freshness-test.$$
PORT=${QUEUE_FRESHNESS_PORT:-3497}
fails=0
ok()  { echo "  ok   — $1"; }
bad() { echo "  FAIL — $1"; fails=$((fails + 1)); }
cleanup() { [ -n "${FAKE_PID:-}" ] && kill "$FAKE_PID" 2>/dev/null; rm -rf "$TMP"; }
trap cleanup EXIT
mkdir -p "$TMP"

# ── 1. THE ORDERING. run.sh must reset the fixture before anything reads the queue. ─────────
echo "run.sh resets the fixture before it reads the queue"
if [ ! -f "$RUNSH" ]; then
  bad "no run.sh at $RUNSH"
else
  # Line numbers of the reset, and of the first line that fetches the recordist queue.
  reset_ln=$(grep -n 'fixture\.cjs reset' "$RUNSH" | head -1 | cut -d: -f1)
  read_ln=$(grep -n 'api/recording/voice/\$VOICE' "$RUNSH" | head -1 | cut -d: -f1)
  if [ -z "$reset_ln" ]; then
    bad "run.sh never resets the fixture"
  elif [ -z "$read_ln" ]; then
    ok "run.sh reads no queue before the reset (nothing to warm the cache with)"
  elif [ "$reset_ln" -lt "$read_ln" ]; then
    ok "reset at line $reset_ln precedes the first queue read at line $read_ln"
  else
    bad "run.sh reads the queue at line $read_ln BEFORE resetting at line $reset_ln — this is the 2026-09-17 red: the read warms the cache with the state the reset then destroys"
  fi
  grep -q 'wait-queue-fresh\.sh' "$RUNSH" \
    && ok "run.sh waits for the API's own answer to agree with the reset" \
    || bad "run.sh hands straight to playwright without checking the API agrees the fixture is reset"
fi

# ── 2. THE WAIT ITSELF, against an API that serves the stale answer first. ──────────────────
echo "wait-queue-fresh waits out a cached answer rather than accepting it"
if [ ! -f "$WAITSH" ]; then
  bad "no wait-queue-fresh.sh at $WAITSH"
else
  cat > "$TMP/fake-api.cjs" <<'JS'
// A queue endpoint that answers out of a stale cache for STALE_MS, then truthfully —
// exactly what the real API does for up to its 60s TTL after an out-of-process write.
const http = require('http')
const STALE_MS = Number(process.env.STALE_MS || 6000)
const t0 = Date.now()
http.createServer((req, res) => {
  const stale = Date.now() - t0 < STALE_MS
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ total: 8, recorded: stale ? 8 : 0 }))
}).listen(Number(process.env.PORT), '127.0.0.1')
JS
  PORT=$PORT STALE_MS=6000 node "$TMP/fake-api.cjs" & FAKE_PID=$!
  i=0; while [ $i -lt 25 ]; do curl -sf -o /dev/null "http://127.0.0.1:$PORT/api/recording/voice/v" && break; i=$((i + 1)); sleep 0.2; done
  t0=$(date +%s)
  if sh "$WAITSH" "http://127.0.0.1:$PORT" v 8 30 >/dev/null; then
    waited=$(( $(date +%s) - t0 ))
    [ "$waited" -ge 5 ] && ok "waited ${waited}s for the stale answer to expire" \
      || bad "returned after only ${waited}s — it accepted the stale total=8 recorded=8"
  else
    bad "gave up on an API that did become fresh within the timeout"
  fi
  kill "$FAKE_PID" 2>/dev/null; FAKE_PID=

  echo "…and goes red, naming the cache, when the answer never becomes fresh"
  PORT=$PORT STALE_MS=999999 node "$TMP/fake-api.cjs" & FAKE_PID=$!
  i=0; while [ $i -lt 25 ]; do curl -sf -o /dev/null "http://127.0.0.1:$PORT/api/recording/voice/v" && break; i=$((i + 1)); sleep 0.2; done
  err=$(sh "$WAITSH" "http://127.0.0.1:$PORT" v 8 4 2>&1 >/dev/null) && bad "exited 0 on a queue that never went fresh" || ok "exited non-zero"
  case "$err" in
    *recordist-queue-cache.cjs*) ok "the message names the cache, not the fixture" ;;
    *) bad "the failure message does not name the cache: $err" ;;
  esac
  kill "$FAKE_PID" 2>/dev/null; FAKE_PID=
fi

echo
[ "$fails" -eq 0 ] && { echo "queue-freshness: all checks passed"; exit 0; }
echo "queue-freshness: $fails check(s) FAILED"; exit 1
