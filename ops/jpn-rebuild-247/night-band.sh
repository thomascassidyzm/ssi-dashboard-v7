#!/usr/bin/env bash
# cs #247·AL night runner for ONE band of the jpn/kor rebuild: night-band.sh <jpn|kor> <from-to>
# Runs as a systemd user unit from the durable checkout ~/.cs-long/247/popty (worktrees get reaped).
# Prerequisites (day, on the copy): gen files for the band + the cross-family read at ops/jpn-rebuild-247/<c>/reads/<range>.json
# + the copy dump the read was taken against at $EV/<c>-copy-<range>.json.
# Steps, each behind the GATE (22:00-07:00 UK, Popty /health governed:true, fewer than 3 OTHER DB writers active —
# Kai's 3-writer rule, Tom 18 Nov NEVER HAMMER THE DB):
#   1. fresh live /seeds read → plan (live pre-check of row + LEGO + seed; any mismatch holds the LEGO)
#   2. audio through the one route (library first; a refusal stops, never retried)
#   3. insert changeset → --check → apply-changeset (governed, ledgered, undo)
#   4. delete changeset built from the insert ledger (make-before-break) → --check → apply
#   5. live read → verify → commit the band's ops files → wake the job
# Re-running resumes: plan/audio are library-first and idempotent, the applier skips ledgered ops.
# The conversation token is read from ~/.cs-long/247/.tok (600), never from argv.
set -u
C=$1; R=$2
DIR="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$DIR/../.." && pwd)"; cd "$ROOT"
CONV=2ff16996-027f-4e22-a132-813fead29575
AGENT=kai-247
T=tools/course-optimization/jpn-kor-rebuild-247.cjs
CODE=${C}_for_eng
WRITERS="cs-long-keep-236-night cs-long-keep-868-8b cs-long-keep-868-night cs-long-keep-item4-358"
EV="$HOME/ssi-evidence/ssi-dashboard-v7/ops/jpn-rebuild-247"; mkdir -p "$EV"
CS="$DIR/$C"
wake() { node ~/command-surface/tools/cs-wake-send.cjs "$CONV" "$(cat ~/.cs-long/247/.tok)" "$1" >/dev/null 2>&1 && echo "WAKE SENT: $1" || echo "WAKE FAILED: $1"; }
ukh() { TZ=Europe/London date +%H | sed 's/^0//'; }
night() { local h; h=$(ukh); [ "$h" -ge 22 ] || [ "$h" -lt 7 ]; }
others() { local n=0; for u in $WRITERS; do systemctl --user is-active -q "$u" && n=$((n+1)); done
  local p; p=$(pgrep -f 'apply-changeset.cjs' | wc -l); [ "$p" -gt "$n" ] && n=$p; echo $n; }
governed() { curl -s -m 10 http://localhost:3470/health | grep -q '"governed":true'; }
gate() {
  while :; do
    if ! night; then [ "${STARTED:-0}" = 1 ] && return 1; sleep 60; continue; fi
    STARTED=1
    if governed && [ "$(others)" -lt 3 ]; then return 0; fi
    echo "$(date -u +%FT%TZ) gate: governed=$(governed && echo y || echo n) other_writers=$(others) — waiting"; sleep 120
  done
}
liveread() { for t in 1 2 3 4; do curl -s -m 300 "http://localhost:3470/api/production/$CODE/seeds" -o "$EV/$C-live-$R-$1.json"; [ "$(stat -c%s "$EV/$C-live-$R-$1.json")" -gt 100000 ] && return 0; sleep 60; done; return 1; }
commitband() { git add "$CS/plan-$R.json" "$CS/audio.json" "$CS/audio-runs.jsonl" "$CS"/$R.*.changeset.jsonl* 2>/dev/null
  git commit -q -m "jpn-rebuild-247 (cs #247·AL): $C $R night run — $1" && git push -q origin HEAD:cs/247-run || true; }
applycs() { # $1 = insert|delete
  local f="$CS/$R.$1.changeset.jsonl" rc n=0
  node tools/changeset/apply-changeset.cjs "$f" --check || { wake "WAKE: cs247 $C $R $1 changeset FAILED --check; nothing applied"; exit 1; }
  while :; do
    gate || { commitband "window closed in $1"; wake "WAKE: cs247 $C $R night window closed during $1; ledger resumes next night"; exit 0; }
    echo "$(date -u +%FT%TZ) applying $1 (other writers $(others))"
    node tools/changeset/apply-changeset.cjs "$f" --key kai --agent $AGENT; rc=$?
    echo "$(date -u +%FT%TZ) $1 exit $rc"
    case $rc in 0|2) return 0 ;; 75) continue ;; *) n=$((n+1)); [ $n -ge 3 ] && { commitband "$1 stopped"; wake "WAKE: cs247 $C $R $1 STOPPED (exit $rc three times); journalctl --user -u cs-long-keep-247-$C-$R"; exit 1; }; sleep 120 ;; esac
  done
}

# 1-2. plan + audio (skipped when the insert changeset is already ledgered — a resumed night)
if [ ! -f "$CS/$R.insert.changeset.jsonl.applied.jsonl" ]; then
  while :; do
    gate || { wake "WAKE: cs247 $C $R window closed before the plan/audio step; re-arm"; exit 0; }
    liveread pre || { wake "WAKE: cs247 $C $R live read failed; nothing written"; exit 1; }
    node $T plan $C $R "$EV/$C-copy-$R.json" "$EV/$C-live-$R-pre.json" || { wake "WAKE: cs247 $C $R plan STOPPED (see journal); nothing written"; exit 1; }
    RENDER_CONFIRM=1 node $T audio $C $R --real; rc=$?
    [ $rc = 3 ] && { commitband "audio refused"; wake "WAKE: cs247 $C $R audio STOPPED on a refusal (no retry); $(tail -1 "$CS/audio-runs.jsonl")"; exit 0; }
    [ $rc = 0 ] && break
    sleep 120
  done
  node $T insert-cs $C $R || exit 1
fi
applycs insert
node $T delete-cs $C $R || { wake "WAKE: cs247 $C $R delete-cs failed"; exit 1; }
applycs delete
liveread post
V=$(node $T verify $C $R "$EV/$C-live-$R-post.json")
commitband "applied; $V"
node tools/course-optimization/queue-audio-pass.cjs $CODE --reason "cs #247 rebuild $R (audio already linked; pass checks the band)" >/dev/null 2>&1 || true
wake "WAKE: cs247 $C $R DONE. $(tail -1 "$CS/audio-runs.jsonl") verify: $V"
