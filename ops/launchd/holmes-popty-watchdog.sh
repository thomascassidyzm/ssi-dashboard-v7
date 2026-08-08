#!/bin/sh
# holmes-popty-watchdog.sh — the in-machine half of Holmes availability.
#
# Runs on Tom's Mac (holmes), driven by its OWN launchd agent
# (com.ssi.popty-watchdog, StartInterval 120) — deliberately a separate job from
# the two it watches, so a crash, throttle or bootout of the backend or the
# tunnel cannot take the thing that resurrects them down with it.
#
# WHY NOT CRON, when watson-1's equivalent watchdog is emphatically in cron?
# watson-1's lesson (2026-08-04) was that its services were supervised by the
# systemd USER manager, and a machine-wide OOM SIGKILLed the manager itself —
# a supervisor above the supervisor, which could and did die, leaving nothing to
# restart anything for 2.5 hours. cron survived it because crond is a different
# process tree. macOS has no equivalent layer to lose: launchd IS pid 1, and
# macOS cron is itself started by launchd (com.vix.cron), so moving this script
# to cron would buy exactly nothing. The genuinely independent leg — the one
# that survives Holmes being off, asleep, or wedged — cannot live on Holmes at
# all, and it doesn't: it is ops/watchdog/holmes-availability-sentinel.sh,
# running on watson-1, which tells Tom rather than restarting anything.
#
# KeepAlive already restarts a process that EXITS. This script exists for the
# case KeepAlive cannot see: a process that is alive but not serving — node
# wedged, the event loop blocked, ngrok holding a session it can no longer
# forward. It health-checks the ports and kickstarts on a real miss.

set -u

LOG=${HOLMES_WATCHDOG_LOG:-$HOME/Library/Logs/popty-watchdog.log}
/bin/mkdir -p "$(/usr/bin/dirname "$LOG")" 2>/dev/null

# Log lives under ~/Library/Logs, never /tmp: a watchdog whose record of what it
# resurrected is wiped by the next reboot is worthless for the one question it
# exists to answer. Trim inline rather than calling out to another repo's
# helper, so this script stays portable.
if [ -f "$LOG" ] && [ "$(/usr/bin/wc -l < "$LOG" 2>/dev/null)" -gt 5000 ]; then
  /usr/bin/tail -n 2000 "$LOG" > "$LOG.tmp" && /bin/mv "$LOG.tmp" "$LOG"
fi

UID_NUM=$(/usr/bin/id -u)
STATE_DIR="$HOME/Library/Application Support/popty-watchdog"
/bin/mkdir -p "$STATE_DIR" 2>/dev/null

log() { /bin/echo "$(/bin/date) holmes-popty-watchdog: $*" >> "$LOG"; }

# Two consecutive misses before acting — copied from watson-1's watchdog for the
# same reason: one slow response, or a restart Tom did himself, must not start a
# restart loop.
check() {
  label=$1        # launchd label to kickstart
  url=$2          # health URL to probe
  name=$3         # human name for the log
  state="$STATE_DIR/fails-$label"

  code=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" --max-time 20 "$url" 2>/dev/null)
  if [ "$code" = "200" ]; then
    /bin/echo 0 > "$state"
    return
  fi

  fails=$(/bin/cat "$state" 2>/dev/null)
  case "$fails" in ''|*[!0-9]*) fails=0 ;; esac
  fails=$((fails + 1))

  if [ "$fails" -ge 2 ]; then
    log "$name ($url) returned [$code], kickstarting $label"
    /bin/launchctl kickstart -k "gui/$UID_NUM/$label" >> "$LOG" 2>&1
    /bin/echo 0 > "$state"
  else
    log "$name ($url) returned [$code], miss $fails/2, not restarting"
    /bin/echo "$fails" > "$state"
  fi
}

# The backend first. Loopback, so this is purely "is node serving".
check com.ssi.popty-production-api http://localhost:3470/health "production API"

# Then the tunnel, from the outside in. A 200 here proves the whole chain —
# ngrok session, reserved domain, forward to 3470. It is checked SECOND and
# against its own strike counter so that a backend outage (which makes this URL
# return ngrok's own ERR_NGROK_8012 page) restarts the backend on its own
# counter and, at worst, bounces a tunnel that was innocent — never the other
# way round, where a wedged tunnel goes unnoticed because the backend is fine.
check com.ssi.popty-ngrok https://popty.ngrok.app/health "ngrok tunnel"
