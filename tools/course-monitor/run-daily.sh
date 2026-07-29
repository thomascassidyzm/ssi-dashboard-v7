#!/usr/bin/env bash
# Daily course-status routine.
#
# Two stages:
#   1. DETERMINISTIC gather (no LLM) — always runs; produces a snapshot. Never blocked by usage limits.
#   2. LLM interpret + post-to-Basecamp — needs Claude usage; wrapped in a usage-aware retry so a
#      spent session/weekly quota doesn't lose the run.
#
# Usage-limit policy (per Kai 2026-07-29): wait and retry a couple of times; if still limited
# (e.g. the WEEKLY quota is spent, not just the session), give up gracefully and drop a marker so
# the next run — or Kai — knows stage-2 was deferred. Stage-1 output is always fresh regardless.
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 1
export PATH="$HOME/.local/bin:$PATH"

STAMP="$(date +%Y%m%d-%H%M)"
OUTDIR="${COURSE_MONITOR_OUT:-$HOME/Documents/GitHub/ssi-dashboard-v7/temp/course-monitor}"
mkdir -p "$OUTDIR"
SNAP="$OUTDIR/snapshot-$STAMP.md"
LOG="$OUTDIR/run-$STAMP.log"
DEFER="$OUTDIR/DEFERRED.flag"

log(){ echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }

# --- VPN: connect-on-launch is enabled, so launching the app brings the tunnel up ---
if ! ssh -o BatchMode=yes -o ConnectTimeout=6 ssi@apidev true 2>/dev/null; then
  log "VPN down — launching OpenVPN Connect"; open -a "OpenVPN Connect" 2>/dev/null || true
  for i in $(seq 1 12); do sleep 5; ssh -o BatchMode=yes -o ConnectTimeout=6 ssi@apidev true 2>/dev/null && break; done
fi
ssh -o BatchMode=yes -o ConnectTimeout=6 ssi@apidev true 2>/dev/null && LEGACY_OK=1 || { LEGACY_OK=0; log "VPN still down — legacy checks will be skipped by the gatherers"; }

# --- STAGE 1: deterministic gather (no LLM) ---
log "gather.cjs"; node tools/course-monitor/gather.cjs >"$SNAP" 2>>"$LOG" || log "gather.cjs FAILED (see log)"
log "check-encouragements.cjs"; { echo; echo "## Encouragements currency"; node tools/course-monitor/check-encouragements.cjs 2>>"$LOG"; } >>"$SNAP" || log "encouragements check FAILED"
log "snapshot -> $SNAP"

# --- STAGE 2: LLM interpret + post, usage-aware retry ---
# Attempts spaced to let a spent *session* recover; capped so a spent *weekly* quota gives up.
MAX_TRIES="${COURSE_MONITOR_MAX_TRIES:-3}"
WAIT_SECS="${COURSE_MONITOR_WAIT_SECS:-1800}"   # 30 min between tries
usage_limited(){ grep -qiE "usage limit|rate.?limit|quota|out of (usage|credits?)|resets? at|5-hour limit|weekly limit" "$1"; }

for try in $(seq 1 "$MAX_TRIES"); do
  ATTLOG="$OUTDIR/stage2-$STAMP-try$try.log"
  log "stage-2 attempt $try/$MAX_TRIES"
  # NOTE: stage-2 agent (read snapshot -> reason about anomalies/abandoned/unclear-goal -> post to the
  # Basecamp status card, @Kai / @Aran as needed) is invoked here. Prompt/posting wired when the
  # comment behaviour is finalised. Placeholder call kept explicit so the retry harness is real:
  if node tools/course-monitor/post-findings.cjs "$SNAP" >"$ATTLOG" 2>&1; then
    log "stage-2 OK"; rm -f "$DEFER"; break
  fi
  if usage_limited "$ATTLOG"; then
    if [ "$try" -lt "$MAX_TRIES" ]; then log "usage-limited — waiting ${WAIT_SECS}s then retry"; sleep "$WAIT_SECS"
    else log "usage-limited after $MAX_TRIES tries — DEFERRING (weekly quota likely spent)"; date > "$DEFER"; echo "snapshot: $SNAP" >>"$DEFER"; fi
  else
    log "stage-2 failed (non-usage error) — not retrying; see $ATTLOG"; break
  fi
done
log "done"
