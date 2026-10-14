#!/bin/sh
# Popty service watchdog — runs from the USER CRONTAB, deliberately.
#
# 2026-08-04 incident: the production API (3470) was supervised by a systemd
# user unit with Restart=always, but a machine-wide OOM event SIGKILLed
# user@1000.service — the manager itself. With the supervisor dead, nothing
# restarted anything and every Popty dashboard call 502'd for ~2.5 hours.
#
# cron runs under crond, NOT under the user manager, so it survives exactly the
# failure that took supervision down. Its job is to resurrect the manager
# (re-lingering starts it without root) and then the units.
#
# Deliberately does NOT touch command-surface (4317) — that has its own
# watchdog at ~/command-surface/ops/watchdog.sh.

# The log lives outside tmpfs (2026-08-07). /tmp is wiped by every reboot, so a watchdog whose
# record of what it resurrected dies with the machine is worthless for the one question it
# exists to answer: why did the machine go down, and did anything come back? The 14:44 reboot
# proved the cost — the 04:15 and 04:40 cron jobs demonstrably ran and left nothing behind.
# The trim is inlined rather than calling command-surface's ops/trim-log.sh on purpose: this
# script is deliberately portable to Camberley, where that repo need not exist.
LOG=${POPTY_WATCHDOG_LOG:-$HOME/.local/log/popty-watchdog.log}
/bin/mkdir -p "$(/usr/bin/dirname "$LOG")" 2>/dev/null
if [ -f "$LOG" ] && [ "$(/usr/bin/wc -l < "$LOG" 2>/dev/null)" -gt 5000 ]; then
  /usr/bin/tail -n 2000 "$LOG" > "$LOG.tmp" && /bin/mv "$LOG.tmp" "$LOG"
fi
UID_NUM=$(/usr/bin/id -u)
XDG_RUNTIME_DIR=/run/user/$UID_NUM
export XDG_RUNTIME_DIR

log() { /bin/echo "$(/bin/date) popty-watchdog: $*" >> "$LOG"; }

# 1. The supervisor. Without it, restarting a unit is a no-op.
if [ "$(/usr/bin/systemctl is-active user@$UID_NUM.service 2>/dev/null)" != "active" ]; then
  log "user@$UID_NUM.service is down — re-lingering to restart it"
  /usr/bin/loginctl disable-linger "$(/usr/bin/id -un)" 2>/dev/null
  /bin/sleep 2
  /usr/bin/loginctl enable-linger "$(/usr/bin/id -un)" 2>/dev/null
  /bin/sleep 5
  log "user manager now: $(/usr/bin/systemctl is-active user@$UID_NUM.service 2>/dev/null)"
fi

# 2. The services. Two consecutive misses before acting, so a slow response or a
#    deliberate restart doesn't trigger a restart loop.
check() {
  unit=$1
  port=$2
  state="/tmp/popty-watchdog-fails-$port"
  code=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" --max-time 20 "http://localhost:$port/health" 2>/dev/null)
  if [ "$code" = "200" ]; then
    /bin/echo 0 > "$state"
    return
  fi
  fails=$(/bin/cat "$state" 2>/dev/null)
  case "$fails" in ''|*[!0-9]*) fails=0 ;; esac
  fails=$((fails + 1))
  if [ "$fails" -ge 2 ]; then
    log "$unit (port $port) returned [$code], restarting"
    /usr/bin/systemctl --user restart "$unit" 2>>"$LOG"
    /bin/echo 0 > "$state"
  else
    log "$unit (port $port) returned [$code], miss $fails/2, not restarting"
    /bin/echo "$fails" > "$state"
  fi
}

check popty-production-api 3470
check popty-course-builder-api 3471
# 3465 is not optional: /api/production/:course/audio-stats calls phase 8's
# /needs and 500s outright when it is down. See the 2026-08-04 incident doc.
check popty-phase8-audio 3465
# 2026-08-07: orchestrator joined systemd (it was the last pm2 holdout, and the
# 14:44 reboot left it down for ~50 min because nothing watched 3456).
check popty-orchestrator 3456
