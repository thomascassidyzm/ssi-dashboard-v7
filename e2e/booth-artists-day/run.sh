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
[ -f .env ] || die "no .env in $(pwd) — the fixture needs SUPABASE_URL/SUPABASE_SERVICE_KEY"
[ -x node_modules/.bin/playwright ] || die "no playwright under node_modules"

if [ "${REFRESH_STAGING:-0}" = 1 ]; then
  [ -d "$STAGING_DIR/.git" ] || die "no staging tree at $STAGING_DIR"
  ( cd "$STAGING_DIR" && git fetch -q origin main && git merge --ff-only origin/main ) || die "could not fast-forward $STAGING_DIR to origin/main"
  want=$(cd "$STAGING_DIR" && git rev-parse --short=8 HEAD)
  have=$(node -e "try{console.log(require('$STAGING_DIR/dist/version.json').version)}catch{console.log('')}")
  if [ "$want" != "$have" ]; then
    echo "staging SPA is at '$have', main is $want — building"
    ( cd "$STAGING_DIR" && NODE_OPTIONS=--max-old-space-size=8192 node_modules/.bin/vite build > "$STAGING_DIR/staging-build.log" 2>&1 ) || die "vite build failed in $STAGING_DIR (see staging-build.log)"
  fi
  systemctl --user restart cs-long-staging-api.service || die "could not restart cs-long-staging-api"
  systemctl --user restart cs-long-staging-spa.service || die "could not restart cs-long-staging-spa"
  i=0; while [ $i -lt 30 ]; do
    curl -sf -o /dev/null "$API/api/recording/voice/$VOICE" && break
    i=$((i + 1)); sleep 2
  done
fi

curl -sf -o /dev/null "$API/api/recording/voice/$VOICE" || die "staging API at $API is not answering for $VOICE (is cs-long-staging-api up? has the fixture been seeded?)"
curl -sf -o /dev/null "$SPA/r/$VOICE" || die "staging SPA at $SPA is not answering (is cs-long-staging-spa up?)"

node e2e/booth-artists-day/fixture.cjs reset || die "could not reset the e2e_booth fixture"
mkdir -p "$SHOTS"
node_modules/.bin/playwright test --config=e2e/booth-artists-day/playwright.config.js
rc=$?
echo "booth-artists-day-browser: rc=$rc, screenshots in $SHOTS"
exit $rc
