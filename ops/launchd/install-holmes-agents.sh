#!/bin/sh
# install-holmes-agents.sh — make Popty come up by itself on Tom's Mac.
#
# One command, pasted once, never thought about again. It installs three
# per-user LaunchAgents:
#
#   com.ssi.popty-production-api   node services/production-api.cjs   (port 3470)
#   com.ssi.popty-ngrok            ngrok http --url=popty.ngrok.app 3470
#   com.ssi.popty-watchdog         health-checks both every 2 min, kickstarts on
#                                  two consecutive misses
#
# No sudo. LaunchAgents are per-user by design and that is the correct scope
# here: these run as Tom, from Tom's checkout, against Tom's .env and Tom's
# ngrok authtoken. A LaunchDaemon would run as root before login and could not
# read any of them.
#
# Idempotent: safe to run any number of times. Every run rewrites the plists
# from the templates in this directory, boots out any previous copy, boots the
# new one, and verifies.
#
# Usage:  sh ops/launchd/install-holmes-agents.sh [checkout-path]
#         DRY_RUN=1 sh ops/launchd/install-holmes-agents.sh   # print, touch nothing
#
# Env:    DRY_RUN=1        write plists to a temp dir and print the launchctl
#                          calls instead of running them
#         PLIST_DIR=...    override ~/Library/LaunchAgents (tests)

set -u

CHECKOUT=${1:-${POPTY_CHECKOUT:-$HOME/SSi/ssi-dashboard-v7-clean}}
PLIST_DIR=${PLIST_DIR:-$HOME/Library/LaunchAgents}
LOGDIR=${LOGDIR:-$HOME/Library/Logs}
DRY_RUN=${DRY_RUN:-0}
UID_NUM=$(id -u)

say()  { echo "$*"; }
fail() { echo "FAIL: $*" >&2; exit 1; }

run() {  # every mutating launchctl call goes through here so DRY_RUN is honest
  if [ "$DRY_RUN" = "1" ]; then echo "  [dry-run] $*"; else "$@"; fi
}

say "Popty on Holmes — installing LaunchAgents"
say "  checkout: $CHECKOUT"

# ── 1. The checkout ──────────────────────────────────────────────────────────
[ -d "$CHECKOUT" ] || fail "no such directory: $CHECKOUT
       Pass the path as an argument: sh install-holmes-agents.sh /path/to/ssi-dashboard-v7-clean"
[ -f "$CHECKOUT/services/production-api.cjs" ] || fail "$CHECKOUT does not look like the ssi-dashboard checkout (no services/production-api.cjs)"
[ -f "$CHECKOUT/.env" ] || say "  WARNING: no .env in $CHECKOUT — the API will start but Supabase will be uninitialised"

TEMPLATE_DIR="$CHECKOUT/ops/launchd"
for t in com.ssi.popty-production-api com.ssi.popty-ngrok com.ssi.popty-watchdog; do
  [ -f "$TEMPLATE_DIR/$t.plist.template" ] || fail "missing template $TEMPLATE_DIR/$t.plist.template — is this checkout up to date? (git pull)"
done
[ -f "$TEMPLATE_DIR/holmes-popty-watchdog.sh" ] || fail "missing $TEMPLATE_DIR/holmes-popty-watchdog.sh — is this checkout up to date? (git pull)"

# ── 2. The binaries ──────────────────────────────────────────────────────────
# Resolved to ABSOLUTE paths and baked into the plists. launchd hands an agent a
# minimal PATH with neither Homebrew prefix on it, so "node" alone is a
# command-not-found in a log nobody reads. Search order: whatever is on the
# installer's own PATH first (so an nvm/asdf/fnm node that Tom actually uses
# wins), then the two Homebrew prefixes, then the newest nvm install.
find_bin() {
  name=$1
  p=$(command -v "$name" 2>/dev/null) && [ -x "$p" ] && { echo "$p"; return 0; }
  for c in "/opt/homebrew/bin/$name" "/usr/local/bin/$name"; do
    [ -x "$c" ] && { echo "$c"; return 0; }
  done
  # newest nvm version, if any — sorted lexically, which is why it is the last
  # resort rather than the first: v9 sorts above v23.
  for c in $(ls -d "$HOME/.nvm/versions/node"/*/bin/"$name" 2>/dev/null | sort -V | tail -1); do
    [ -x "$c" ] && { echo "$c"; return 0; }
  done
  return 1
}

NODE=$(find_bin node) || fail "node not found.
       Install it (brew install node) or put it on PATH, then re-run."
NGROK=$(find_bin ngrok) || fail "ngrok not found.
       Install it (brew install ngrok) and authenticate it once
       (ngrok config add-authtoken <token>), then re-run."

say "  node:  $NODE ($("$NODE" -v 2>/dev/null))"
say "  ngrok: $NGROK ($("$NGROK" version 2>/dev/null))"

# The templates prepend these to a standard PATH. When the binary already lives
# on that standard PATH (the usual Homebrew case) prepending it again just
# duplicates an entry in a file Tom may well read, so collapse it to nothing.
STD_PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
path_prefix() {  # $1 = dir → "$1:" unless it is already on STD_PATH
  case ":$STD_PATH:" in *":$1:"*) echo "" ;; *) echo "$1:" ;; esac
}
NODE_DIR=$(path_prefix "$(dirname "$NODE")")
NGROK_DIR=$(path_prefix "$(dirname "$NGROK")")

# ── 3. Write the plists ──────────────────────────────────────────────────────
if [ "$DRY_RUN" = "1" ]; then
  PLIST_DIR=${DRY_RUN_PLIST_DIR:-$(mktemp -d)}
  say "  [dry-run] plists → $PLIST_DIR"
fi
mkdir -p "$PLIST_DIR" || fail "cannot create $PLIST_DIR"
mkdir -p "$LOGDIR"    || fail "cannot create $LOGDIR"

render() {
  label=$1
  sed -e "s|__CHECKOUT__|$CHECKOUT|g" \
      -e "s|__NODE_DIR__|$NODE_DIR|g" \
      -e "s|__NGROK_DIR__|$NGROK_DIR|g" \
      -e "s|__NODE__|$NODE|g" \
      -e "s|__NGROK__|$NGROK|g" \
      -e "s|__HOME__|$HOME|g" \
      -e "s|__LOGDIR__|$LOGDIR|g" \
      "$TEMPLATE_DIR/$label.plist.template" > "$PLIST_DIR/$label.plist" \
    || fail "could not write $PLIST_DIR/$label.plist"
  say "  wrote $PLIST_DIR/$label.plist"
}

for label in com.ssi.popty-production-api com.ssi.popty-ngrok com.ssi.popty-watchdog; do
  render "$label"
done

# ── 4. Clear anything already holding the ports ──────────────────────────────
# A hand-started `node services/production-api.cjs` or `ngrok http` from a
# previous session will hold port 3470 / the reserved domain and the agent will
# throttle-loop behind it. Matched narrowly — this must never reach an unrelated
# ngrok tunnel or node process.
if [ "$DRY_RUN" != "1" ]; then
  pkill -f "ngrok http --url=popty.ngrok.app" 2>/dev/null && say "  stopped a hand-started ngrok tunnel"
  pkill -f "node .*services/production-api.cjs" 2>/dev/null && say "  stopped a hand-started production API"
  sleep 1
fi

# ── 5. Load them ─────────────────────────────────────────────────────────────
# bootout/bootstrap is the modern (10.11+) API. `launchctl load -w` still works
# on older macOS and is kept as a documented fallback below.
for label in com.ssi.popty-production-api com.ssi.popty-ngrok com.ssi.popty-watchdog; do
  run launchctl bootout "gui/$UID_NUM/$label" 2>/dev/null
  if [ "$DRY_RUN" = "1" ]; then
    echo "  [dry-run] launchctl bootstrap gui/$UID_NUM $PLIST_DIR/$label.plist"
  else
    if launchctl bootstrap "gui/$UID_NUM" "$PLIST_DIR/$label.plist" 2>/dev/null; then
      say "  bootstrapped $label"
    elif launchctl load -w "$PLIST_DIR/$label.plist" 2>/dev/null; then
      say "  loaded $label (legacy load -w path)"
    else
      say "  WARNING: could not load $label — try: launchctl bootstrap gui/$UID_NUM $PLIST_DIR/$label.plist"
    fi
  fi
done

if [ "$DRY_RUN" = "1" ]; then
  say ""
  say "Dry run complete. Nothing was loaded and no process was touched."
  exit 0
fi

# ── 6. Verify ────────────────────────────────────────────────────────────────
say ""
say "Verifying (the API takes a few seconds to bind)..."
rc=0

probe() {  # $1 = name, $2 = url, $3 = attempts
  i=0
  while [ "$i" -lt "$3" ]; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$2" 2>/dev/null)
    [ "$code" = "200" ] && { say "  PASS  $1 — $2 → 200"; return 0; }
    i=$((i + 1)); sleep 3
  done
  say "  FAIL  $1 — $2 → ${code:-no response}"
  return 1
}

probe "backend" "http://localhost:3470/health" 15 || rc=1
probe "tunnel"  "https://popty.ngrok.app/health" 10 || rc=1

say ""
if [ "$rc" = "0" ]; then
  say "Popty is up on this Mac and will come back by itself after a reboot, a"
  say "crash, or a logout+login. Logs: $LOGDIR/popty-*.log"
else
  say "Something is not serving. Look here first, in this order:"
  say "  tail -n 40 $LOGDIR/popty-production-api.err.log"
  say "  tail -n 40 $LOGDIR/popty-ngrok.err.log"
  say "  launchctl print gui/$UID_NUM/com.ssi.popty-production-api | head -30"
fi
exit $rc
