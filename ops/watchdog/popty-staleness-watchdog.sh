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

# The log lives outside tmpfs (2026-08-07). /tmp is wiped by every reboot, and the record of a
# stale checkout, a diverged branch or a refused pull is exactly the evidence a reboot must not
# take with it. STATE_FILE and ATTEMPT_FILE below stay in /tmp deliberately: those are
# within-boot verdict and retry tokens, and clearing them on reboot is the correct behaviour.
# The trim is inlined rather than calling command-surface's ops/trim-log.sh on purpose: this
# script is deliberately portable to Camberley, where that repo need not exist.
LOG=${POPTY_WATCHDOG_LOG:-$HOME/.local/log/popty-watchdog.log}
mkdir -p "$(dirname "$LOG")" 2>/dev/null
if [ -f "$LOG" ] && [ "$(wc -l < "$LOG" 2>/dev/null)" -gt 5000 ]; then
  tail -n 2000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi
BRANCH_EXPECTED=${POPTY_DEPLOY_BRANCH:-main}

# Repo root = two levels up from this script, so the checkout can move.
REPO=$(cd "$(dirname "$0")/../.." && pwd)

# State is keyed by CHECKOUT, because watson-1 runs services out of more than
# one clone and two watchdogs must not stamp on each other's verdict. The
# service side derives the same path from its own repo root
# (services/shared/build-identity.cjs), so they meet without configuration.
REPO_KEY=$(basename "$REPO")
STATE_FILE=${POPTY_STALENESS_STATE:-/tmp/popty-staleness-$REPO_KEY.json}
ATTEMPT_FILE=/tmp/popty-staleness-attempt-$REPO_KEY

log() { echo "$(date) popty-staleness: $*" >> "$LOG"; }

# Every Popty service that reports a build sha on /health. Which of these
# actually belong to THIS checkout is decided below, from what they report —
# not assumed here.
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
      # MY_UNITS only — the units actually loaded from THIS checkout.
      for unit in $MY_UNITS; do
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
    echo "  \"repo\": \"$REPO\","
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
# -uno on purpose: only TRACKED modifications block a pull. The production
# checkout carries an untracked node_modules/, and counting that as "dirty"
# would disable the auto-restart half of this watchdog permanently, silently —
# the exact failure shape it exists to prevent. A fast-forward cannot clobber
# untracked files; if it would collide, git refuses loudly and we alert.
if [ -n "$(git status --porcelain -uno)" ]; then TREE_STATE=dirty; else TREE_STATE=clean; fi

# ── What are the live processes actually running? ────────────────────────────
# NOT what is on disk. The disk can be new while the loaded process is old, and
# that gap IS the bug. /health reports a sha frozen at process start
# (services/shared/build-identity.cjs).
RUNNING_JSON=""
STALE_SERVICES=""
UNREPORTED=""
MY_UNITS=""
for entry in $SERVICES; do
  unit=${entry%%:*}
  port=${entry##*:}
  health=$(curl -s --max-time 10 "http://localhost:$port/health" 2>/dev/null)
  sha=$(printf '%s' "$health" | sed -n 's/.*"commit"[[:space:]]*:[[:space:]]*"\([0-9a-f]*\)".*/\1/p')
  root=$(printf '%s' "$health" | sed -n 's/.*"root"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')

  # watson-1 runs services out of TWO clones of this repo (production-api and
  # phase8 from the -prod checkout, course-builder from the dev one). A
  # watchdog guarding one tree must not judge — or restart — a service loaded
  # from the other, or it would report permanent false staleness against
  # whatever branch the dev checkout happens to be sitting on.
  # Fallback attribution for a service too old to report `root` (or down):
  # ask the supervisor which directory the unit runs from. Without this, the
  # first run after a deploy would judge — and restart — services belonging to
  # another clone, purely because they had not yet been restarted into a build
  # that reports its own root.
  if [ -z "$root" ] && [ "$SUPERVISOR" = systemd ]; then
    root=$(systemctl --user show -p WorkingDirectory --value "$unit" 2>/dev/null)
  fi

  if [ -n "$root" ] && [ "$root" != "$REPO" ]; then
    log "skipping $unit — loaded from $root, not $REPO"
    continue
  fi

  MY_UNITS="$MY_UNITS $unit"
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

# The CHECKOUT itself being behind is staleness too, independent of what any
# service reports. It covers the cases /health cannot: a service that is down,
# and — the bootstrap case — a service running a build that predates this
# feature and so reports no sha at all. Without this the watchdog could never
# deploy its own first version.
if [ -n "$LOCAL_SHA" ] && [ "$LOCAL_SHA" != "$REMOTE_SHA" ] \
   && git merge-base --is-ancestor "$LOCAL_SHA" "$REMOTE_SHA" 2>/dev/null; then
  STALE_SERVICES="$STALE_SERVICES checkout"
fi

# Diverged: this checkout has commits main does not AND is not level with it.
# Not staleness — but it means this machine can NEVER be auto-updated, which is
# the same silence in slower motion. Say so out loud rather than reporting
# "current" because no ancestor test happened to match.
DIVERGED=no
if [ -n "$LOCAL_SHA" ] && [ "$LOCAL_SHA" != "$REMOTE_SHA" ] \
   && ! git merge-base --is-ancestor "$LOCAL_SHA" "$REMOTE_SHA" 2>/dev/null; then
  DIVERGED=yes
fi

# ── Level? Clear the loop guard and go home. ─────────────────────────────────
if [ -z "$STALE_SERVICES" ]; then
  rm -f "$ATTEMPT_FILE"
  if [ "$DIVERGED" = yes ]; then
    log "ALERT: checkout '$LOCAL_BRANCH' has diverged from origin/$BRANCH_EXPECTED — it can never be auto-updated. Needs a human."
    write_state diverged none "checkout has commits not on origin/$BRANCH_EXPECTED; cannot be auto-updated"
    exit 0
  fi
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

# ── SYNTAX GATE: never hand a supervisor a file it cannot parse ──────────────
# 2026-08-08: merge 186af122 put two `const MIN_TAKE_MS` in one scope of
# production-api.cjs. Both parents parsed; the merge did not. It reached this
# checkout, and Restart=always then spent the outage restarting a process that
# could never start — a supervisor cannot restart its way out of a SyntaxError.
#
# So the gate sits HERE, between the pull and the restart, which is the only
# place on this machine where the old process is still alive and the new code is
# already on disk. Make-before-break (CLAUDE.md): verify the new thing first, and
# if it is bad, put the disk back and leave the running service alone.
#
# Scope: what the pull actually changed, plus every entrypoint this checkout
# starts — because a broken file that arrived in an EARLIER pull is still a file
# we are about to start. Fails closed: if the checker itself cannot run (missing,
# unparseable, node absent) that is a failed gate, not a passed one.
if node tools/check-service-syntax.cjs --range "$LOCAL_SHA..$NEW_SHA" >>"$LOG" 2>&1 \
   && node tools/check-service-syntax.cjs >>"$LOG" 2>&1; then
  :
else
  log "ALERT: SYNTAX GATE FAILED at $NEW_SHA — rolling back to $LOCAL_SHA and NOT restarting."
  log "       The running services keep the last-known-good code. See the gate output above. NEEDS A HUMAN."
  # Safe: the tree was verified clean (-uno) before the pull, so there is nothing
  # of anyone's to lose. Untracked node_modules/ is not touched by a reset.
  if git reset --hard "$LOCAL_SHA" >>"$LOG" 2>&1; then
    log "       rolled checkout back to $LOCAL_SHA"
    write_state stale none "syntax gate failed at $NEW_SHA; rolled back to $LOCAL_SHA, did not restart"
  else
    log "ALERT: rollback to $LOCAL_SHA FAILED — this checkout now holds unparseable code. NEEDS A HUMAN URGENTLY."
    write_state stale none "syntax gate failed at $NEW_SHA and rollback failed; checkout holds unparseable code"
  fi
  # ATTEMPT_FILE keeps $REMOTE_SHA on purpose: back off rather than re-pull the
  # same broken sha every ten minutes.
  exit 0
fi

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
