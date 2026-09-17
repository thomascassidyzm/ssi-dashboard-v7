#!/bin/sh
# THE NIGHTLY ENTRY for the artist's-day browser run. Exit status IS the verdict:
# staging down, fixture unresettable, any assertion failing — all non-zero, so
# the nightly line goes red rather than could-not-run. Run from the repo root.
#
#   REFRESH_STAGING=1 sh e2e/booth-artists-day/run.sh   # nightly: bring ~/wt-staging to origin/main first
#   sh e2e/booth-artists-day/run.sh                      # just run against staging as it stands
#
# Staging is the pair of user units on this box: cs-long-staging-api (production-api
# out of ~/wt-staging on 3490, the LIVE database) and cs-long-staging-spa (that tree's
# built SPA on 3491, /api proxied to 3490 — e2e/booth-artists-day/staging-spa-server.cjs).
set -u
STAGING_DIR=${STAGING_DIR:-$HOME/wt-staging}
API=${E2E_API_BASE:-http://127.0.0.1:3490}
SPA=${E2E_BASE_URL:-http://127.0.0.1:3491}
VOICE=human_e2e_booth_zzz
SHOTS=${E2E_SHOTS:-$HOME/ssi-evidence/ssi-dashboard-v7/e2e/booth-artists-day/$(date -u +%Y-%m-%dT%H-%M-%SZ)}
export E2E_API_BASE="$API" E2E_BASE_URL="$SPA" E2E_SHOTS="$SHOTS"

die() { echo "booth-artists-day-browser: $*" >&2; exit 1; }

# The staging pair are TRANSIENT systemd units (systemd-run), so a reboot takes them with it and
# `systemctl restart` then fails on a unit that no longer exists — which is how a box that rebooted
# at 20:25 made the 02:04 booth check red. Restart it if it is there, start it if it is not; either
# way the run only proceeds against a staging pair that is actually answering.
start_unit() {
  unit=$1; cmd=$2
  if systemctl --user cat "$unit" >/dev/null 2>&1; then
    systemctl --user restart "$unit" || die "could not restart $unit"
  else
    systemctl --user reset-failed "$unit" >/dev/null 2>&1 || true
    systemd-run --user --unit="$unit" --working-directory="$STAGING_DIR" \
      bash -lc "$cmd" >/dev/null || die "could not start $unit in $STAGING_DIR"
    echo "booth-artists-day-browser: started $unit (it was not running — a reboot takes transient units with it)"
  fi
}
[ -f .env ] || die "no .env in $(pwd) — the fixture needs SUPABASE_URL/SUPABASE_SERVICE_KEY"
[ -x node_modules/.bin/playwright ] || die "no playwright under node_modules"

# RESET FIRST, BEFORE ANY QUEUE READ. fixture.cjs writes straight to the database from its
# own process; the API caches the recordist queue in ITS process for 60s (recordist-queue-
# cache.cjs). Health-curling the queue and THEN resetting warms the cache with the state the
# reset is about to destroy, which is exactly how 2026-09-17's nightly went red ("the test
# voice's queue is not fresh: total=8 recorded=8"). Resetting first also means the nightly's
# restart of cs-long-staging-api below starts a process whose cache cannot be pre-reset.
node e2e/booth-artists-day/fixture.cjs reset || die "could not reset the e2e_booth fixture"
LINE_COUNT=$(node -e 'process.stdout.write(String(require("./e2e/booth-artists-day/fixture.cjs").LINES.length))') \
  || die "could not read the fixture's line count"

if [ "${REFRESH_STAGING:-0}" = 1 ]; then
  sh e2e/booth-artists-day/ensure-staging.sh "$STAGING_DIR" "$(pwd)" || exit 1
  want=$(cd "$STAGING_DIR" && git rev-parse --short=8 HEAD)
  have=$(node -e "try{console.log(require('$STAGING_DIR/dist/version.json').version)}catch{console.log('')}")
  if [ "$want" != "$have" ]; then
    echo "staging SPA is at '$have', main is $want — building"
    ( cd "$STAGING_DIR" && NODE_OPTIONS=--max-old-space-size=8192 node_modules/.bin/vite build > "$STAGING_DIR/staging-build.log" 2>&1 ) || die "vite build failed in $STAGING_DIR (see staging-build.log)"
  fi
  start_unit cs-long-staging-api.service "PRODUCTION_API_PORT=3490 AUDIT_ARCHIVE_CRON=off TAIL_REPAIR_MODE=flag node services/production-api.cjs > $STAGING_DIR/staging-api.log 2>&1"
  start_unit cs-long-staging-spa.service "STAGING_SPA_PORT=3491 STAGING_API=http://127.0.0.1:3490 node e2e/booth-artists-day/staging-spa-server.cjs > $STAGING_DIR/staging-spa.log 2>&1"
  i=0; while [ $i -lt 30 ]; do
    curl -sf -o /dev/null "$API/api/recording/voice/$VOICE" && break
    i=$((i + 1)); sleep 2
  done
fi

curl -sf -o /dev/null "$API/api/recording/voice/$VOICE" || die "staging API at $API is not answering for $VOICE (is cs-long-staging-api up? has the fixture been seeded?)"
curl -sf -o /dev/null "$SPA/r/$VOICE" || die "staging SPA at $SPA is not answering (is cs-long-staging-spa up?)"

# The reset is already done (above, BEFORE anything read the queue). All that is left is to
# be sure the LIVE API agrees with it rather than serving a cached read from before it.
sh e2e/booth-artists-day/wait-queue-fresh.sh "$API" "$VOICE" "$LINE_COUNT" || exit 1
mkdir -p "$SHOTS"
node_modules/.bin/playwright test --config=e2e/booth-artists-day/playwright.config.js
rc=$?
echo "booth-artists-day-browser: rc=$rc, screenshots in $SHOTS"
exit $rc
