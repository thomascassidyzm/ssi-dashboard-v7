#!/usr/bin/env bash
# cs #251·AL night runner for ONE band of the cym_for_kor option-D basket rebuild: night-band.sh <from-to>
# Runs as a systemd user unit from the durable checkout ~/.cs-long/251/popty (worktrees get reaped). NO AUDIO, ever.
# Prerequisites (day): ko/S####.json for the band (Korean prompts), assign.json + the snapshot in $EV.
# Each DB step waits for the GATE: 22:00-07:00 UK, Popty /health governed:true, fewer than 3 OTHER DB writers, and
# no #247 apply running (Kai's 3-writer rule; Tom 18 Nov NEVER HAMMER THE DB; brief: never on top of #247).
#   1. fresh live /seeds read → plan (live pre-check of LEGO + seed + every row; mismatch HOLDS the LEGO)
#   2. insert changeset → --check → apply-changeset (governed, 25/txn, ledgered, undo)
#   3. delete changeset built from the insert ledger (make-before-break) → --check → apply
#   4. live read → verify → commit the band's files → wake the job
# Re-running resumes: the applier skips ledgered ops; the plan is not recomputed once the insert ledger exists.
# The conversation token is read from ~/.cs-long/251/.tok (600), never from argv.
set -u
R=$1
DIR="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$DIR/../../.." && pwd)"; cd "$ROOT"
CONV=ae1f934c-2a29-4efa-b1a3-e69bf78b6492
AGENT=kai-251
T=tools/course-optimization/cym-for-kor-rebuild-251.cjs
EV="$HOME/ssi-evidence/ssi-dashboard-v7/ops/cym-for-kor/rebuild-251"; mkdir -p "$EV"
UNIT="cs-long-keep-251-band-$R"
wake() { node ~/command-surface/tools/cs-wake-send.cjs "$CONV" "$(cat ~/.cs-long/251/.tok)" "$1" >/dev/null 2>&1 && echo "WAKE SENT: $1" || echo "WAKE FAILED: $1"; }
ukh() { TZ=Europe/London date +%H | sed 's/^0//'; }
night() { local h; h=$(ukh); [ "$h" -ge 22 ] || [ "$h" -lt 7 ]; }
others() { local n p
  # SERVICES only: the other jobs' .timer units are 'active' all day and are not writers (24 Nov night lost to that)
  n=$(systemctl --user list-units --type=service --state=active --no-legend --plain 'cs-long-keep-*' | awk '{print $1}' | grep -cE 'item4|868-8b|868-night|868-guj|236-night|247-(jpn|kor)-[0-9]|247-.*night|247-.*band')
  p=$(pgrep -f '^node .*apply-changeset.cjs' | wc -l); [ "$p" -gt "$n" ] && n=$p; echo $n; }
c247() { pgrep -f '^node .*apply-changeset.cjs.*kai-247' >/dev/null && echo 1 || echo 0; }
governed() { curl -s -m 10 http://localhost:3470/health | grep -q '"governed":true'; }
gate() {
  while :; do
    if ! night; then [ "${STARTED:-0}" = 1 ] && return 1; sleep 60; continue; fi
    STARTED=1
    if governed && [ "$(others)" -lt 3 ] && [ "$(c247)" = 0 ]; then return 0; fi
    echo "$(date -u +%FT%TZ) gate: governed=$(governed && echo y || echo n) other_writers=$(others) cs247_apply=$(c247) — waiting"; sleep 120
  done
}
liveread() { for t in 1 2 3 4; do curl -s -m 300 -H "x-agent-id: $AGENT" "http://localhost:3470/api/production/cym_for_kor/seeds?status=all" -o "$EV/live-$R-$1.json"; [ "$(stat -c%s "$EV/live-$R-$1.json")" -gt 1000000 ] && return 0; sleep 60; done; return 1; }
commitband() { git add "$DIR/plan-$R.json" "$DIR"/$R.*.changeset.jsonl* 2>/dev/null
  git commit -q -m "cym-for-kor rebuild-251 (cs #251·AL): $R night run — $1" && git push -q origin HEAD:cs/251-run || true; }
applycs() { # $1 = insert|delete
  local f="$DIR/$R.$1.changeset.jsonl" rc n=0
  node tools/changeset/apply-changeset.cjs "$f" --check || { commitband "$1 failed --check"; wake "WAKE: cs251 $R $1 changeset FAILED --check; nothing applied"; exit 1; }
  while :; do
    gate || { commitband "window closed in $1"; wake "WAKE: cs251 $R night window closed during $1; ledger resumes next night (re-arm)"; exit 0; }
    echo "$(date -u +%FT%TZ) applying $1 (other writers $(others))"
    node tools/changeset/apply-changeset.cjs "$f" --key kai --agent $AGENT; rc=$?
    echo "$(date -u +%FT%TZ) $1 exit $rc"
    case $rc in 0|2) return 0 ;; 75) continue ;; *) n=$((n+1)); [ $n -ge 3 ] && { commitband "$1 stopped"; wake "WAKE: cs251 $R $1 STOPPED (exit $rc three times); journalctl --user -u $UNIT"; exit 1; }; sleep 120 ;; esac
  done
}

if [ ! -f "$DIR/$R.insert.changeset.jsonl.applied.jsonl" ]; then
  gate || { wake "WAKE: cs251 $R window closed before the plan step; nothing written (re-arm)"; exit 0; }
  rm -f "$DIR/plan-$R.json"
  liveread pre || { wake "WAKE: cs251 $R live read failed; nothing written"; exit 1; }
  node $T plan "$R" "$EV/live-$R-pre.json" 2>&1 | grep -v language-code || true
  [ -f "$DIR/plan-$R.json" ] || { wake "WAKE: cs251 $R plan STOPPED (see journal); nothing written"; exit 1; }
  node $T insert-cs "$R" 2>&1 | grep -v language-code
fi
applycs insert
node $T delete-cs "$R" 2>&1 | grep -v language-code || { wake "WAKE: cs251 $R delete-cs failed"; exit 1; }
applycs delete
liveread post
V=$(node $T verify "$R" "$EV/live-$R-post.json" 2>&1 | grep -v language-code)
commitband "applied; $V"
wake "WAKE: cs251 $R DONE. verify: $V"
