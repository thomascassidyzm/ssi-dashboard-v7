#!/usr/bin/env bash
# Crash-restart watchdog for the French shepherd (scripts/overnight-shepherd.sh).
#
# Twin of scripts/deu-shepherd-watchdog.sh, and it exists because of what happened
# at 14:07:06Z on 2026-08-07: BOTH shepherds' transient systemd units were stopped
# cleanly in the same second. German came back three minutes later because it had a
# watchdog; French stayed dead, mid-render at 1,021/2,707 of band 2, until a human
# noticed. French is Tom's stated first priority, so French being the one without a
# watchdog was exactly backwards.
#
# The cause of that stop is NOT established. Ruled out: a user-manager restart
# (user@1000.service has been active since 2026-08-06 08:44:03Z and never bounced),
# and the popty services watchdog's re-linger path (it logged nothing at that time).
# This script deliberately does not care what the cause was — it restores service
# whatever stopped it.
#
# Idempotent by construction: the shepherd holds /tmp/overnight-shepherd.lock for its
# whole life, so if it is alive this script sees a busy lock and exits 0 silently. It
# can therefore be fired every 10 minutes forever with no risk of a second shepherd —
# the split-brain overnight-shepherd.sh was written to prevent — because the only path
# that starts anything is the one where the lock is genuinely free.
#
# Band state lives in ~/.fra-band-state and clip work is committed to the DATABASE as
# each swap lands, so a restarted shepherd resumes at the right band and finished clips
# re-plan as SATISFIED. Restarting is cheap; staying dead is not.
set -uo pipefail

LOCK=/tmp/overnight-shepherd.lock
SHEPHERD=/home/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/overnight-shepherd.sh
LOG=/tmp/overnight-shepherd.log

# `flock -n <file> true` succeeds ONLY if the lock is free — i.e. no shepherd running.
if flock -n "$LOCK" true 2>/dev/null; then
  echo "[$(date -u +%H:%M:%SZ)] watchdog: no shepherd holding $LOCK — restarting" >> "$LOG"
  systemd-run --user --collect \
    --unit="overnight-shepherd-$(date -u +%H%M%S)" \
    --description="fra shepherd (watchdog restart)" \
    /usr/bin/bash "$SHEPHERD"
else
  exit 0
fi
