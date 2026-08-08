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
# WHEN IT IS ALLOWED TO SPEAK (Tom's ruling, 2026-08-08, after this script woke
# him at 02:34Z to say his Mac was asleep — which is what a Mac does at night):
#
#   Holmes DOWN, nothing waiting on it  -> SILENT. Log a line, say nothing else.
#   Holmes DOWN, something waiting      -> escalate. This is where he loses time.
#   Holmes UP but HALF-WORKING          -> escalate, demand or no demand. A green
#                                          dot that lies costs him time the
#                                          moment he sits down and trusts it.
#   Holmes UP and healthy               -> silent, and clear any outage state.
#
# "Holmes idle and unreachable with nothing queued for it is a non-event." An
# alert that fires on the normal overnight state is a false alarm by
# construction, and false alarms at 2am erode trust in every other alert on the
# estate. Silence means silence: no card, no push, no post — a log line only.
#
# THE DEMAND SIGNAL, HONESTLY (read this before trusting the quiet):
# There is no queue to count. The Command Surface `jobs` table has no host or
# environment column, and "Tom's Machine" is a browser-side selector living in
# localStorage (src/components/EnvironmentSwitcher.vue), unreadable from here.
# Nothing on watson-1 makes requests to popty.ngrok.app except this script. So
# demand is read from a MARKER a demander touches, and AT THE TIME OF WRITING
# NOTHING TOUCHES IT — which means the pure-down case is silent by default.
# That is the deliberate, ruled-on behaviour, not an oversight. Anything that
# genuinely needs Holmes should `touch $HOLMES_DEMAND_MARKER` when it tries and
# fails; from that moment this sentinel escalates real blocked work.
#
# WHAT WE PROBE, AND WHY NOT /health:
# /health is shallow, and worse, the ngrok edge answers on its own when nothing
# is behind it — an offline endpoint returns a 404 HTML page carrying
# `ngrok-error-code: ERR_NGROK_3200` ("endpoint popty.ngrok.app is offline").
# So we probe /api/languages, the route services/api/ngrok-proxy.cjs itself
# names as the dashboard's real usage, and we require a 200 whose body is
# actually JSON. Status code alone cannot tell "working" from "the tunnel is
# answering for a machine that isn't there".
#
# TASTE-SAFE DEFAULTS, all overridable by env:
#   check every 5 minutes (the cron line)
#   raise only after 3 CONSECUTIVE misses (~15 minutes continuous failure)
# A closed lid, a reboot or a 4G blip must not raise a card: a notice for every
# blip is a notice Tom learns to ignore, which is worse than no notice at all.

set -u

URL=${HOLMES_HEALTH_URL:-https://popty.ngrok.app/api/languages}
MISSES_TO_ALERT=${HOLMES_MISSES_TO_ALERT:-3}
LOG=${HOLMES_SENTINEL_LOG:-$HOME/.local/log/holmes-availability-sentinel.log}
SURFACE=${CS_SURFACE:-http://localhost:4317}

# Demand: a marker whose mtime says "something wanted Holmes recently". A file,
# not a queue, because there is no queue to read (see the header). The window is
# generous — a demander that gave up 20 minutes ago was still genuinely blocked.
DEMAND_MARKER=${HOLMES_DEMAND_MARKER:-$HOME/.local/state/holmes-demand}
DEMAND_WINDOW_MIN=${HOLMES_DEMAND_WINDOW_MIN:-30}
DEMAND_FORCE=${HOLMES_DEMAND_FORCE:-}   # "1"/"0" to pin the answer in tests

# State dir is overridable so the tests can drive this script without stamping
# on the live counters. /tmp is right for the real thing: these are "how many
# misses in a row" and "have we already spoken", and a reboot resetting them
# just costs another 15 minutes before the first notice — which we want anyway.
STATE_DIR=${HOLMES_STATE_DIR:-/tmp}
STATE=$STATE_DIR/holmes-sentinel-misses
OPEN=$STATE_DIR/holmes-sentinel-open

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

# ---------------------------------------------------------------- the probe --
# Three outcomes, not two. HALF is the case Tom named: it answers, so every
# dashboard shows green, but nothing useful is behind it.
BODY=$(/bin/mktemp "${TMPDIR:-/tmp}/holmes-probe.XXXXXX") || exit 0
trap '/bin/rm -f "$BODY"' EXIT INT TERM
CODE=$(/usr/bin/curl -s -o "$BODY" -w "%{http_code}" --max-time 20 \
  -H 'ngrok-skip-browser-warning: true' "$URL" 2>/dev/null)
FIRST=$(/usr/bin/tr -d ' \t\r\n' < "$BODY" 2>/dev/null | /usr/bin/head -c 1)

case "$CODE" in
  200)
    # A 200 is not enough. The working path returns JSON; ngrok's own pages and
    # a stray Vite index.html return HTML, and both would read as "green".
    case "$FIRST" in
      '{'|'[') STATE_NOW=healthy; WHY="200 and JSON" ;;
      *)       STATE_NOW=half;    WHY="200 but the body is not JSON — something is answering for Holmes, but it is not the Popty API" ;;
    esac ;;
  401|403)
    # The literal "green dot but 401" state. The tunnel and the app are both up;
    # the route a user of Tom's Machine depends on is refusing them.
    STATE_NOW=half; WHY="the API answered [$CODE] on a route the dashboard needs — it is up but not usable" ;;
  500|502|503|504)
    # Tunnel connected, nothing healthy behind it (ngrok says ERR_NGROK_8012 for
    # a refused upstream). Holmes is THERE, so this is not "asleep" — it is broken.
    STATE_NOW=half; WHY="the tunnel is connected but the API behind it returned [$CODE]" ;;
  *)
    # 000 (no connection) or 404 with ngrok-error-code ERR_NGROK_3200, i.e.
    # "endpoint popty.ngrok.app is offline" — the honest asleep/unreachable case.
    STATE_NOW=down; WHY="[$CODE]" ;;
esac

# --------------------------------------------------------------- the demand --
# Is anything actually waiting on Holmes? Only ever consulted for the DOWN case.
has_demand() {
  case "$DEMAND_FORCE" in 1) return 0 ;; 0) return 1 ;; esac
  [ -f "$DEMAND_MARKER" ] || return 1
  [ -n "$(/usr/bin/find "$DEMAND_MARKER" -mmin -"$DEMAND_WINDOW_MIN" 2>/dev/null)" ]
}

escalate() {
  # One plain-English line. Only ever ONE open notice per outage: past the
  # threshold we keep counting and keep logging, but we do not re-post every 5
  # minutes — that is how a notice becomes noise.
  if [ -f "$OPEN" ]; then
    log "$STATE_NOW: $WHY — miss $misses, already escalated, staying quiet"
    return 0
  fi
  log "escalating ($STATE_NOW) after $misses consecutive misses: $WHY"
  /usr/bin/curl -s -X POST "$SURFACE/api/needs-you" -H 'Content-Type: application/json' \
    -H "Cookie: cs_user=$CS_COOKIE" -H "Origin: $SURFACE" \
    -d "$(/usr/bin/printf '{"text":%s}' "$(/usr/bin/python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$1")")" \
    >/dev/null 2>&1
  # Tom's decision board was retired on 2026-08-05: a Tom-addressed needs-you is
  # delivered inline into his Watson conversation instead of being boarded, so
  # GET /api/needs-you has nothing to read back and the old resolve-by-id could
  # never work. We record the outage locally instead and log a plain "recovered"
  # line when it ends. No new resolve mechanism — there is nothing to resolve.
  /bin/echo "$STATE_NOW" > "$OPEN"
}

if [ "$STATE_NOW" = healthy ]; then
  prev=$(/bin/cat "$STATE" 2>/dev/null)
  case "$prev" in ''|0|*[!0-9]*) : ;; *)
    if [ -f "$OPEN" ]; then
      log "recovered after $prev consecutive misses (escalated as $(/bin/cat "$OPEN" 2>/dev/null))"
    else
      log "recovered after $prev consecutive misses (never escalated)"
    fi ;;
  esac
  /bin/rm -f "$OPEN"
  /bin/echo 0 > "$STATE"
  exit 0
fi

misses=$(/bin/cat "$STATE" 2>/dev/null)
case "$misses" in ''|*[!0-9]*) misses=0 ;; esac
misses=$((misses + 1))
/bin/echo "$misses" > "$STATE"

if [ "$misses" -lt "$MISSES_TO_ALERT" ]; then
  log "$STATE_NOW: $WHY, miss $misses/$MISSES_TO_ALERT, staying quiet"
  exit 0
fi

MINS=$(( misses * 5 ))

if [ "$STATE_NOW" = half ]; then
  # No demand condition here, deliberately: a dashboard showing green while the
  # thing behind it is broken is what costs Tom an afternoon. He should hear
  # about it whether or not anything is queued right now.
  escalate "Tom's Mac (Holmes) looks online but isn't working — $WHY. It has been like this for ~$MINS minutes, so anything you point at 'Tom's Machine' will look fine and do nothing."
  exit 0
fi

# STATE_NOW = down. This is the case that woke him. Demand or silence.
if has_demand; then
  escalate "Tom's Mac (Holmes) has been unreachable for ~$MINS minutes and something is waiting on it — work targeted at 'Tom's Machine' can't proceed until it's back."
else
  log "down: $WHY, miss $misses — nothing is waiting on Holmes, staying quiet (no demand marker touched in the last $DEMAND_WINDOW_MIN min)"
fi
