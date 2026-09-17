#!/bin/sh
# wait-queue-fresh.sh — wait until the LIVE API agrees that the fixture has been reset.
#
#   sh e2e/booth-artists-day/wait-queue-fresh.sh <api-base> <voice-id> <expected-total> [timeout-seconds]
#
# WHY THIS EXISTS. fixture.cjs reset deletes the test voice's takes straight in the
# database, from its own process. The recordist queue is cached in the API's process
# (services/voice-engine/recordist-queue-cache.cjs), invalidated by the writes that
# process makes and otherwise only by a 60s TTL — its stated contract is "a write from
# another process is caught within the TTL". An out-of-band writer therefore has to
# wait for that, and on 2026-09-17 nobody did: run.sh health-curled the queue (warming
# the cache with the PREVIOUS night's 8-recorded state), then reset, and the spec's
# beforeAll read the stale entry and aborted with "the test voice's queue is not fresh:
# total=8 recorded=8". Three nights of dashboard@main red, one of them this.
#
# So: poll the API's own answer until it matches the reset, bounded well past the TTL,
# and if it never does, say the cache's name rather than blaming the fixture.
set -u
API=${1:?usage: wait-queue-fresh.sh <api-base> <voice-id> <expected-total> [timeout-seconds]}
VOICE=${2:?missing voice id}
WANT_TOTAL=${3:?missing expected total}
TIMEOUT=${4:-90}   # > LANGUAGE_LINES_TTL_MS (60s), so a stale entry always expires inside it

t0=$(date +%s)
last="(no answer yet)"
while :; do
  body=$(curl -sf "$API/api/recording/voice/$VOICE" 2>/dev/null || true)
  if [ -n "$body" ]; then
    last=$(printf '%s' "$body" | node -e '
      let s = ""
      process.stdin.on("data", (d) => (s += d)).on("end", () => {
        try { const q = JSON.parse(s); process.stdout.write(`total=${q.total} recorded=${q.recorded}`) }
        catch { process.stdout.write("unparseable answer") }
      })' 2>/dev/null || echo "unparseable answer")
    [ "$last" = "total=$WANT_TOTAL recorded=0" ] && { echo "wait-queue-fresh: the API agrees the fixture is reset ($last)"; exit 0; }
  fi
  now=$(date +%s)
  if [ $((now - t0)) -ge "$TIMEOUT" ]; then
    echo "wait-queue-fresh: after ${TIMEOUT}s the API still says '$last', not 'total=$WANT_TOTAL recorded=0' — the queue cache (services/voice-engine/recordist-queue-cache.cjs) is serving a read older than the fixture reset, or the reset did not take" >&2
    exit 1
  fi
  sleep 2
done
