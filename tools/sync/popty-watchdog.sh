#!/bin/bash
# popty-watchdog.sh — health-checks the dashboard backend on :3470 and auto-recovers
# a wedged deploy (e.g. missing node_modules / crash-looping production-api).
# Runs from launchd every 60s. Restarts only after N consecutive failures so a
# single slow request doesn't trigger a restart.

set -uo pipefail

DASHBOARD_DIR="/Users/tomcassidy/ssi-dashboard-v7-clean"
HEALTH_URL="http://localhost:3470/health"
STATE_FILE="/tmp/popty-watchdog.fails"
LOG="$DASHBOARD_DIR/tools/sync/popty-watchdog.log"
FAIL_THRESHOLD=3          # consecutive failed checks before acting
export PATH="/opt/homebrew/bin:/Users/tomcassidy/.nvm/versions/node/v22.15.0/bin:$PATH"

ts() { date "+%Y-%m-%d %H:%M:%S"; }
log() { echo "$(ts) $1" >> "$LOG"; }

code=$(curl -s --max-time 8 -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null)

if [ "$code" = "200" ]; then
  # healthy — reset counter (only log a recovery transition)
  if [ -f "$STATE_FILE" ] && [ "$(cat "$STATE_FILE" 2>/dev/null)" != "0" ]; then
    log "RECOVERED — /health=200"
  fi
  echo 0 > "$STATE_FILE"
  exit 0
fi

fails=$(( $(cat "$STATE_FILE" 2>/dev/null || echo 0) + 1 ))
echo "$fails" > "$STATE_FILE"
log "UNHEALTHY (/health=$code) consecutive=$fails"

[ "$fails" -lt "$FAIL_THRESHOLD" ] && exit 0

log "ACTING — threshold reached, attempting recovery"
cd "$DASHBOARD_DIR" || exit 1

# Self-heal missing dependencies (the failure mode that took the site down).
if ! node -e "require.resolve('dotenv')" >/dev/null 2>&1; then
  log "node_modules incomplete (dotenv unresolved) — running npm install"
  npm install >> "$LOG" 2>&1
fi

log "restarting pm2 services"
pm2 restart orchestrator production-api >> "$LOG" 2>&1
pm2 save >> "$LOG" 2>&1
echo 0 > "$STATE_FILE"
log "recovery attempt complete"
