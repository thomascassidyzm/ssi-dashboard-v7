#!/bin/sh
# holmes-availability-sentinel.sh — the outward half of Holmes availability.
#
# Runs on WATSON-1, from the user crontab, every 5 minutes. It restarts nothing;
# it only tells Tom. That division is the whole point:
#
#   * ops/launchd/holmes-popty-watchdog.sh runs ON Holmes and fixes things.
#     It cannot report an outage in which Holmes itself is off, asleep or wedged
#     — which is precisely the outage that matters.
#   * this script runs on a machine that is always up and always has network,
#     so it can still speak when Holmes cannot.
#
# What Tom actually complained about (2026-08-07) was not that Holmes went down.
# It was finding out from a red dot in a dashboard. So the deliverable here is
# ONE plain-English line on the Command Surface board when Holmes has been gone
# long enough to mean something.
#
# TASTE-SAFE DEFAULTS, both overridable by env:
#   check every 5 minutes (the cron line)
#   raise only after 3 CONSECUTIVE misses (~15 minutes continuous failure)
# A closed lid, a reboot or a 4G blip must not raise a card: a notice for every
# blip is a notice Tom learns to ignore, which is worse than no notice at all.
# Recovery auto-resolves the card, so the board never carries a stale outage.

set -u

URL=${HOLMES_HEALTH_URL:-https://popty.ngrok.app/health}
MISSES_TO_ALERT=${HOLMES_MISSES_TO_ALERT:-3}
LOG=${HOLMES_SENTINEL_LOG:-$HOME/.local/log/holmes-availability-sentinel.log}
SURFACE=${CS_SURFACE:-http://localhost:4317}

# State in /tmp is correct here, unlike the log: it is a "how many misses in a
# row" counter, and a reboot resetting it just means the first notice after a
# reboot takes another 15 minutes — which is the behaviour we want anyway.
STATE=/tmp/holmes-sentinel-misses
CARD=/tmp/holmes-sentinel-card.id

/bin/mkdir -p "$(/usr/bin/dirname "$LOG")" 2>/dev/null
if [ -f "$LOG" ] && [ "$(/usr/bin/wc -l < "$LOG" 2>/dev/null)" -gt 5000 ]; then
  /usr/bin/tail -n 2000 "$LOG" > "$LOG.tmp" && /bin/mv "$LOG.tmp" "$LOG"
fi
log() { /bin/echo "$(/bin/date -u +%Y-%m-%dT%H:%M:%SZ) holmes-sentinel: $*" >> "$LOG"; }

# Same two-header identity every cron POST in the estate carries: a cookie with
# no Origin is refused as a cross-site browser shape. Fail-soft — a missing file
# leaves CS_COOKIE empty and the call falls back to the loopback identity.
. /home/tomcassidy/command-surface/ops/cs-cron-identity.sh 2>/dev/null || true
: "${CS_COOKIE:=}"

CODE=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" --max-time 20 "$URL" 2>/dev/null)

resolve_card() {
  [ -f "$CARD" ] || return 0
  id=$(/bin/cat "$CARD" 2>/dev/null)
  [ -n "$id" ] && /usr/bin/curl -s -X POST "$SURFACE/api/needs-you/resolve" \
    -H 'Content-Type: application/json' \
    -H "Cookie: cs_user=$CS_COOKIE" -H "Origin: $SURFACE" \
    -d "{\"id\":$id}" >/dev/null 2>&1
  /bin/rm -f "$CARD"
}

if [ "$CODE" = "200" ]; then
  prev=$(/bin/cat "$STATE" 2>/dev/null)
  case "$prev" in ''|0|*[!0-9]*) : ;; *)
    log "recovered after $prev consecutive misses"
    resolve_card ;;
  esac
  /bin/echo 0 > "$STATE"
  exit 0
fi

misses=$(/bin/cat "$STATE" 2>/dev/null)
case "$misses" in ''|*[!0-9]*) misses=0 ;; esac
misses=$((misses + 1))
/bin/echo "$misses" > "$STATE"

if [ "$misses" -lt "$MISSES_TO_ALERT" ]; then
  log "$URL returned [$CODE], miss $misses/$MISSES_TO_ALERT, staying quiet"
  exit 0
fi

# Only ever ONE open card. Past the threshold we keep counting and keep logging,
# but we do not re-post every 5 minutes — that is how a notice becomes noise.
if [ -f "$CARD" ]; then
  log "$URL returned [$CODE], miss $misses, card already open"
  exit 0
fi

TEXT="Tom's Mac (Holmes) has been offline for ~$(( misses * 5 )) minutes — popty.ngrok.app is not answering. Jobs on your own hardware won't run until it's back."
log "raising card after $misses consecutive misses (last code [$CODE])"
/usr/bin/curl -s -X POST "$SURFACE/api/needs-you" -H 'Content-Type: application/json' \
  -H "Cookie: cs_user=$CS_COOKIE" -H "Origin: $SURFACE" \
  -d "$(/usr/bin/printf '{"text":%s}' "$(/usr/bin/python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$TEXT")")" >/dev/null 2>&1

# Remember which card is ours, so recovery resolves exactly it and a second
# outage replaces rather than stacks.
/usr/bin/curl -s "$SURFACE/api/needs-you" 2>/dev/null \
  | /bin/grep -o '{[^{}]*Holmes[^{}]*}' | /bin/grep -o '"id":[0-9]*' | /usr/bin/head -1 | /usr/bin/cut -d: -f2 > "$CARD"
