#!/bin/sh
# Popty DEPLOY-STALENESS watchdog — is the running code older than origin/main?
#
# 2026-08-05 incident: a route was merged to main and deployed, and then sat
# there doing nothing for hours because nothing restarted the backend service
# that serves it. The live server kept running old code and kept 404ing the new
# route. No error, no alert. It was a missing-audio checker that day; the same
# silence could hide something worse.
#
# This is the sibling of popty-services-watchdog.sh, which answers a different
# question ("is it up?") on a different cadence (every 2 min, no network) with
# Linux-only machinery. This one answers "is it CURRENT?", needs a git fetch,
# and has to run on the Mac too. Same cron route, separate file — see
# docs/deploy-staleness-watchdog-2026-08-05.md for the reasoning.
#
# Portable /bin/sh: runs on watson-1 (Linux/systemd-user) and Camberley
# (macOS/pm2). No GNU-only flags, no bashisms, no /run/user assumptions.

# cron gives a minimal PATH on both platforms; pm2 and node live off it.
PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.npm-global/bin:$HOME/.local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
export PATH

LOG=${POPTY_WATCHDOG_LOG:-/tmp/popty-watchdog.log}
STATE_FILE=${POPTY_STALENESS_STATE:-/tmp/popty-staleness.json}
ATTEMPT_FILE=/tmp/popty-staleness-attempt
BRANCH_EXPECTED=${POPTY_DEPLOY_BRANCH:-main}

# Repo root = two levels up from this script, so the checkout can move.
REPO=$(cd "$(dirname "$0")/../.." && pwd)

log() { echo "$(date) popty-staleness: $*" >> "$LOG"; }

# Services that report a build sha on /health. All three run from this one
# checkout, so any of them being behind means the checkout is behind.
SERVICES="popty-production-api:3470 popty-course-builder-api:3471 popty-phase8-audio:3465"

# ── Supervisor detection ─────────────────────────────────────────────────────
# One script, two estates: watson-1 is systemd --user, Camberley is pm2. Detect
# rather than fork the script, so a fix to the logic can't land on one machine
# and miss the other.
SUPERVISOR=none
if command -v systemctl >/dev/null 2>&1 && [ -d /run/user/"$(id -u)" ]; then
  SUPERVISOR=systemd
  XDG_RUNTIME_DIR=/run/user/$(id -u)
  export XDG_RUNTIME_DIR
elif command -v pm2 >/dev/null 2>&1; then
  SUPERVISOR=pm2
fi

restart_services() {
  case "$SUPERVISOR" in
    systemd)
      for entry in $SERVICES; do
        unit=${entry%%:*}
        systemctl --user restart "$unit" >>"$LOG" 2>&1
      done
      ;;
    pm2)
      pm2 restart all --update-env >>"$LOG" 2>&1
      ;;
    *)
      log "no supervisor found (neither systemctl --user nor pm2) — cannot restart"
      return 1
      ;;
  esac
  return 0
}

# ── State file, for the HTTP surface (GET /api/ops/staleness) ────────────────
# Written every run, so its age is itself a signal: a stale verdict means the
# watchdog stopped running.
write_state() {
  _status=$1; _action=$2; _reason=$3
  tmp="$STATE_FILE.tmp.$$"
  {
    echo '{'
    echo "  \"status\": \"$_status\","
    echo "  \"action\": \"$_action\","
    echo "  \"reason\": \"$_reason\","
    echo "  \"origin_main\": \"$REMOTE_SHA\","
    echo "  \"local_head\": \"$LOCAL_SHA\","
    echo "  \"local_branch\": \"$LOCAL_BRANCH\","
    echo "  \"working_tree\": \"$TREE_STATE\","
    echo "  \"supervisor\": \"$SUPERVISOR\","
    echo "  \"running\": {$RUNNING_JSON},"
    echo "  \"host\": \"$(hostname)\","
    echo "  \"checked_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\""
    echo '}'
  } > "$tmp" && mv "$tmp" "$STATE_FILE"
}

cd "$REPO" || { log "repo not found at $REPO"; exit 1; }

# ── Fetch. Plain fetch, never a merge. ───────────────────────────────────────
if ! git fetch origin "$BRANCH_EXPECTED" --quiet 2>>"$LOG"; then
  LOCAL_SHA=$(git rev-parse HEAD 2>/dev/null)
  LOCAL_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
  REMOTE_SHA=""; TREE_STATE=unknown; RUNNING_JSON=""
  log "git fetch failed — cannot judge staleness this run"
  write_state unknown none "git fetch failed"
  exit 0
fi

REMOTE_SHA=$(git rev-parse "origin/$BRANCH_EXPECTED" 2>/dev/null)
LOCAL_SHA=$(git rev-parse HEAD 2>/dev/null)
LOCAL_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [ -n "$(git status --porcelain)" ]; then TREE_STATE=dirty; else TREE_STATE=clean; fi

# ── What are the live processes actually running? ────────────────────────────
# NOT what is on disk. The disk can be new while the loaded process is old, and
# that gap IS the bug. /health reports a sha frozen at process start
# (services/shared/build-identity.cjs).
RUNNING_JSON=""
STALE_SERVICES=""
UNREPORTED=""
for entry in $SERVICES; do
  unit=${entry%%:*}
  port=${entry##*:}
  sha=$(curl -s --max-time 10 "http://localhost:$port/health" 2>/dev/null \
        | sed -n 's/.*"commit"[[:space:]]*:[[:space:]]*"\([0-9a-f]*\)".*/\1/p')
  [ -n "$RUNNING_JSON" ] && RUNNING_JSON="$RUNNING_JSON, "
  RUNNING_JSON="$RUNNING_JSON\"$unit\": \"$sha\""
  if [ -z "$sha" ]; then
    # No sha: either down (the liveness watchdog's problem, not ours) or running
    # a build predating this feature. Either way we can't judge it — say so
    # rather than assuming it is fine.
    UNREPORTED="$UNREPORTED $unit"
  elif [ "$sha" != "$REMOTE_SHA" ]; then
    # Behind only if it is an ANCESTOR of origin/main. A sha that is merely
    # different (a feature branch ahead of main) is not staleness.
    if git merge-base --is-ancestor "$sha" "$REMOTE_SHA" 2>/dev/null; then
      STALE_SERVICES="$STALE_SERVICES $unit"
    fi
  fi
done

# ── Level? Clear the loop guard and go home. ─────────────────────────────────
if [ -z "$STALE_SERVICES" ]; then
  rm -f "$ATTEMPT_FILE"
  if [ -n "$UNREPORTED" ]; then
    log "ALERT: no build sha from:$UNREPORTED (down, or running a pre-watchdog build) — staleness unverifiable for them"
    write_state unverifiable none "no build sha reported by:$UNREPORTED"
  else
    write_state current none "running code matches origin/$BRANCH_EXPECTED"
  fi
  exit 0
fi

# ── Behind. Decide whether we are allowed to fix it. ─────────────────────────
log "STALE: behind origin/$BRANCH_EXPECTED ($REMOTE_SHA) —$STALE_SERVICES"

# Loop guard: one restart attempt per remote sha. If a restart didn't clear it,
# restarting again won't either — something else is wrong (build failure, wrong
# working dir, unit pointing elsewhere). Shout once and back off.
LAST_ATTEMPT=$(cat "$ATTEMPT_FILE" 2>/dev/null)
if [ "$LAST_ATTEMPT" = "$REMOTE_SHA" ]; then
  log "ALERT: still stale AFTER a restart for $REMOTE_SHA — backing off, NEEDS A HUMAN"
  write_state stale-stuck none "restart did not clear staleness for $REMOTE_SHA; backed off, needs a human"
  exit 0
fi

# Dirty tree: alert only. The Deploy button stashes; a 3am cron job must not.
# Silently stashing someone's in-flight work is a worse outcome than being one
# commit behind, and this checkout is routinely dirty with live content work.
if [ "$TREE_STATE" = dirty ]; then
  log "ALERT: stale but working tree is DIRTY — refusing to pull or stash. Needs a human."
  write_state stale none "working tree dirty; refusing to pull or stash (alert-only by policy)"
  exit 0
fi

# Wrong branch: the checkout is on a feature branch. Pulling main into it is not
# ours to decide.
if [ "$LOCAL_BRANCH" != "$BRANCH_EXPECTED" ]; then
  log "ALERT: stale but checkout is on '$LOCAL_BRANCH', not '$BRANCH_EXPECTED' — refusing to pull. Needs a human."
  write_state stale none "checkout on '$LOCAL_BRANCH', not '$BRANCH_EXPECTED'; refusing to pull"
  exit 0
fi

# Not a clean fast-forward: local has commits origin/main doesn't. Don't clobber.
if ! git merge-base --is-ancestor HEAD "origin/$BRANCH_EXPECTED" 2>/dev/null; then
  log "ALERT: stale but HEAD is not an ancestor of origin/$BRANCH_EXPECTED — not a fast-forward, refusing. Needs a human."
  write_state stale none "HEAD not an ancestor of origin/$BRANCH_EXPECTED; not a fast-forward"
  exit 0
fi

# ── Clean, on branch, fast-forwardable: fix it. ──────────────────────────────
echo "$REMOTE_SHA" > "$ATTEMPT_FILE"
PKG_BEFORE=$(git rev-parse HEAD:package.json 2>/dev/null)

if ! git pull --ff-only origin "$BRANCH_EXPECTED" >>"$LOG" 2>&1; then
  log "ALERT: git pull --ff-only FAILED despite clean fast-forwardable tree. Needs a human."
  write_state stale none "git pull --ff-only failed"
  exit 0
fi

NEW_SHA=$(git rev-parse HEAD)
log "pulled $LOCAL_SHA -> $NEW_SHA"

# Deps first, or the restart crash-loops on a missing module.
PKG_AFTER=$(git rev-parse HEAD:package.json 2>/dev/null)
if [ "$PKG_BEFORE" != "$PKG_AFTER" ]; then
  log "package.json changed — running npm install before restart"
  npm install --no-audit --no-fund >>"$LOG" 2>&1 || log "npm install returned non-zero; restarting anyway"
fi

if restart_services; then
  log "restarted Popty services via $SUPERVISOR at $NEW_SHA"
  LOCAL_SHA=$NEW_SHA
  write_state restarted restart "pulled to $NEW_SHA and restarted via $SUPERVISOR"
else
  write_state stale none "pulled to $NEW_SHA but no supervisor available to restart"
fi
