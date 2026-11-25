#!/usr/bin/env bash
# cs #374·AL night runner: applies the bre_for_fra rebuild, one seed per changeset, every night until every planned seed
# has landed (or is set aside as drift). Shape copied from ops/jpn-rebuild-247/night-band.sh (cs #247·AL).
# Runs as the systemd user unit cs-long-keep-374-bre-apply from the DURABLE checkout ~/.cs-long/374/popty on branch
# cs/374-run (worktrees get reaped); each night it first merges origin/cs/374-apply-bre-for-fra-rebuild-seeds--2, so
# changesets committed there by day (seeds 31-300) are picked up without re-arming.
# Per night, behind the GATE (22:00-07:00 UK, Popty /health governed:true, fewer than 3 OTHER DB writers active —
# Kai's 3-writer rule, Tom 18 Nov NEVER HAMMER THE DB):
#   1. fresh live read (GET :3470/api/production/bre_for_fra/seeds) → precheck: a seed whose live rows differ from the
#      baseline the plan was built against is DRIFT, set aside in drift.jsonl, never forced
#   2. per clean seed: apply-changeset --batch 100 (the whole seed in one transaction, ≤100 ops); a seed that lands
#      only in part is UNDONE (its batches' undo files posted back) and set aside — never left half-rebuilt
#   3. live read → verify → commit the ledgers/verify to cs/374-run → wake the job
# No audio is rendered or queued (Breton is human-voice-only; the brief forbids French cue renders too).
# The conversation token is read from $TOKF (mode 600), never from argv.
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$DIR/../.." && pwd)"; cd "$ROOT"
CONV=${CS_WAKE_CONV:-618db2a2-8ea3-4013-81c3-096075215a94}
TOKF=${CS_WAKE_TOKFILE:-$HOME/.cs-long/374/.tok}
AGENT=kai-374
T=tools/course-optimization/bre-rebuild-374.cjs
SRC_BRANCH=cs/374-apply-bre-for-fra-rebuild-seeds--2
RUN_BRANCH=cs/374-run
WRITERS="cs-long-keep-236-night cs-long-keep-251-chain cs-long-keep-338-apply-jpn cs-long-keep-868-night cs-long-keep-868-guj cs-long-keep-item4-358 cs-long-keep-868-8b"
EV="$HOME/ssi-evidence/ssi-dashboard-v7/ops/bre-rebuild-374"; mkdir -p "$EV"
LOG="$EV/night-$(date -u +%F).log"
say() { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
wake() { node ~/command-surface/tools/cs-wake-send.cjs "$CONV" "$(cat "$TOKF")" "$1" >/dev/null 2>&1 && say "WAKE SENT: $1" || say "WAKE FAILED: $1"; }
ukh() { TZ=Europe/London date +%H | sed 's/^0//'; }
night() { local h; h=$(ukh); [ "$h" -ge 22 ] || [ "$h" -lt 7 ]; }
others() { local n=0 u p; for u in $WRITERS; do systemctl --user is-active -q "$u" && n=$((n+1)); done
  p=$(pgrep -f 'apply-changeset.cjs' | wc -l); [ "$p" -gt "$n" ] && n=$p; echo $n; }
governed() { curl -s -m 10 http://localhost:3470/health | grep -q '"governed":true'; }
gate() { # 0 = go; 1 = the night window closed (only once this night has started)
  while :; do
    if ! night; then [ "${STARTED:-0}" = 1 ] && return 1; sleep 300; continue; fi
    STARTED=1
    if governed && [ "$(others)" -lt 3 ]; then return 0; fi
    say "gate: governed=$(governed && echo y || echo n) other_writers=$(others) — waiting"; sleep 120
  done
}
liveread() { local f="$EV/live-$1.json"; for t in 1 2 3 4; do curl -s -m 300 "http://localhost:3470/api/production/bre_for_fra/seeds" -o "$f"; [ "$(stat -c%s "$f" 2>/dev/null || echo 0)" -gt 1000000 ] && { echo "$f"; return 0; }; sleep 60; done; return 1; }
commitrun() { git add ops/bre-rebuild-374/cs/*.applied.jsonl ops/bre-rebuild-374/cs/*.undone.* ops/bre-rebuild-374/drift.jsonl ops/bre-rebuild-374/verify-*.json 2>/dev/null
  git commit -q -m "bre-rebuild-374 (cs #374·AL): night run — $1" && git push -q origin HEAD:$RUN_BRANCH || true; }
undo_seed() { # $1 seed, $2.. undo files
  local n=$1; shift; local u
  for u in "$@"; do node tools/agent-admin/call.cjs --key kai --agent $AGENT POST /api/admin/course-edit/bre_for_fra/edit-batch "{\"undo_file\":\"$u\",\"apply\":true}" >>"$LOG" 2>&1 || say "UNDO FAILED seed $n $u"; done
  local f; f=$(printf 'ops/bre-rebuild-374/cs/S%04d.changeset.jsonl.applied.jsonl' "$n"); [ -f "$f" ] && mv "$f" "$f.undone.$(date -u +%Y%m%dT%H%M%SZ)"
  echo "{\"at\":\"$(date -u +%FT%TZ)\",\"seed\":$n,\"why\":\"landed only in part; undone ($*)\"}" >> ops/bre-rebuild-374/drift.jsonl
}

while :; do
  STARTED=0
  gate || continue
  git fetch -q origin "$SRC_BRANCH" && git merge -q --no-edit "origin/$SRC_BRANCH" >>"$LOG" 2>&1 || say "merge of $SRC_BRANCH failed (carrying on with what is here)"
  STAMP=$(date -u +%Y%m%dT%H%M%SZ)
  PRE=$(liveread "pre-$STAMP") || { wake "WAKE: cs374 bre live read failed; nothing written tonight"; sleep 3600; continue; }
  OK=$(node $T precheck 1-300 "$PRE" 2>>"$LOG") || { wake "WAKE: cs374 bre precheck FAILED (see $LOG); nothing written"; exit 1; }
  applied=0; held=0; closed=""
  for n in $OK; do
    grep -q "\"seed\":$n," ops/bre-rebuild-374/drift.jsonl 2>/dev/null && continue   # set aside on an earlier night
    st=$(node $T ledger "$n" 2>>"$LOG")
    case "$st" in complete|nocs) continue ;; partial*|incomplete*) set -- $st; shift; undo_seed "$n" "$@"; held=$((held+1)); continue ;; esac
    gate || { closed=1; break; }
    F=$(printf 'ops/bre-rebuild-374/cs/S%04d.changeset.jsonl' "$n")
    node tools/changeset/apply-changeset.cjs "$F" --check >>"$LOG" 2>&1 || { say "seed $n --check failed; skipped"; continue; }
    node tools/changeset/apply-changeset.cjs "$F" --key kai --agent $AGENT --batch 100 >>"$LOG" 2>&1; rc=$?
    [ $rc = 75 ] && { closed=1; break; }
    st=$(node $T ledger "$n" 2>>"$LOG")
    case "$st" in
      complete) applied=$((applied+1)) ;;
      partial*|incomplete*) say "seed $n landed in part ($st) — undoing"; set -- $st; shift; undo_seed "$n" "$@"; held=$((held+1)) ;;
      *) say "seed $n: applier exit $rc, ledger '$st' — left for the next night" ;;
    esac
  done
  if POST=$(liveread "post-$STAMP"); then V=$(node $T verify 1-300 "$POST" 2>>"$LOG"); [ -n "$V" ] || V="verify printed nothing (see $LOG)"; else V="post live read failed; not verified"; fi
  say "$V"
  commitrun "applied $applied, set aside $held; $V"
  TODO=0; for n in $(node $T planned 2>/dev/null); do [ "$(node $T ledger "$n" 2>/dev/null)" = complete ] || grep -q "\"seed\":$n," ops/bre-rebuild-374/drift.jsonl 2>/dev/null || TODO=$((TODO+1)); done
  AUTH=$(node -e "const c=require('./ops/bre-rebuild-374/check.json');console.log(Object.values(c.held).filter(h=>h.call==='not authored').length)" 2>/dev/null || echo '?')
  if [ "$TODO" = 0 ] && [ "$AUTH" = 0 ]; then wake "WAKE: cs374 bre DONE — applied $applied tonight, set aside $held. $V"; exit 0; fi
  wake "WAKE: cs374 bre night $STAMP: applied $applied seeds, set aside $held, still to apply $TODO (not yet authored: $AUTH)${closed:+; window closed}. $V"
  while night; do sleep 600; done   # wait out this window; the gate holds until the next one
done
