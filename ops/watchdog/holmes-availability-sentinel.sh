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

# `half` is held to a LONGER bar than `down` (Tom's ruling, 2026-08-13): Holmes is
# a ROAMING LAPTOP, and its wake transition briefly looks half-working by
# construction, so a service fault must prove itself for MORE THAN 30 MINUTES
# before it is worth a decision card. `down` keeps the 15-minute bar because it is
# demand-gated and so cannot fire on an idle sleeping Mac at all.
HALF_MISSES_TO_ALERT=${HOLMES_HALF_MISSES_TO_ALERT:-6}
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

# Per-STATE run counters (2026-08-13). `misses` counts every unhealthy probe
# regardless of KIND, and that is what made this script cry wolf: a Mac that has
# been legitimately asleep for hours piles up a large 404 count, and then the one
# probe that happens to catch the WAKE TRANSITION — ngrok's agent reconnected,
# node on 3470 not back yet, which the edge answers as ERR_NGROK_8012 / 503 — is
# classified `half` and escalates INSTANTLY, because the inherited 404 count is
# already past the threshold.
#
# The evidence: of 753 probes logged 08-08 to 08-13, 735 were [404] and 16 were
# [503] — and every single [503] was an ISOLATED probe. Not one persisted to the
# next tick five minutes later. So every `half` escalation so far has been a false
# alarm on a sleeping laptop, and the "~N minutes" in its text was the length of
# the SLEEP, not of any fault: today's said "~15 minutes" off three ticks of which
# only the last was a 503, and the API was answering again by the next probe.
#
# `half` therefore now needs its own consecutive evidence before it may speak.
RUN=$STATE_DIR/holmes-sentinel-staterun
LAST=$STATE_DIR/holmes-sentinel-laststate

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
    log "$STATE_NOW: $WHY — miss $COUNT, already escalated, staying quiet"
    return 0
  fi
  log "escalating ($STATE_NOW) after $COUNT consecutive misses: $WHY"
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
  /bin/rm -f "$OPEN" "$RUN" "$LAST"
  /bin/echo 0 > "$STATE"
  exit 0
fi

misses=$(/bin/cat "$STATE" 2>/dev/null)
case "$misses" in ''|*[!0-9]*) misses=0 ;; esac
misses=$((misses + 1))
/bin/echo "$misses" > "$STATE"

# The run of CONSECUTIVE probes in this SAME state. It resets whenever the state
# changes, so the 404,404,503 sequence that fired today leaves the 503 on run 1
# instead of inheriting a count of 3.
prevstate=$(/bin/cat "$LAST" 2>/dev/null)
run=$(/bin/cat "$RUN" 2>/dev/null)
case "$run" in ''|*[!0-9]*) run=0 ;; esac
if [ "$prevstate" = "$STATE_NOW" ]; then run=$((run + 1)); else run=1; fi
/bin/echo "$run" > "$RUN"
/bin/echo "$STATE_NOW" > "$LAST"

# `down` keeps counting on the TOTAL, deliberately: a Mac that has been asleep or
# unreachable for two hours with something waiting on it is one continuous outage,
# however the failure happens to be spelled at the edge. `half` counts only its
# own run — see the note by RUN above. This is the whole behavioural change.
if [ "$STATE_NOW" = half ]; then
  COUNT=$run; THRESHOLD=$HALF_MISSES_TO_ALERT
else
  COUNT=$misses; THRESHOLD=$MISSES_TO_ALERT
fi

if [ "$COUNT" -lt "$THRESHOLD" ]; then
  log "$STATE_NOW: $WHY, miss $COUNT/$THRESHOLD, staying quiet"
  exit 0
fi

# Reports the length of the state being described, not of every unhealthy probe
# that preceded it — the old MINS attributed the sleep to the fault.
MINS=$(( COUNT * 5 ))

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
