#!/usr/bin/env bash
# Item 12 night runner (cs #957·AI, Kai approved 19 Nov 12:02Z): seed sentence as a practice row, 47 paid courses.
# Fired by the user timer cs-long-keep-item12-night.timer (22:30 UTC nightly). Each night it:
#   a) fast-forwards the persistent worktree ~/.cs-long/item12/popty to origin/main; if this tree is not on main yet,
#      logs "not merged yet" and exits 0 (tomorrow's timer tries again). The worktree is NEVER recreated: the ledgers
#      (<changeset>.applied.jsonl, untracked) live beside each changeset in it and are what make the nights resumable.
#   b) waits while Kai's Italian tile repair (cs-long-937-ita-tiles.service) is running, so two appliers never share
#      the window; gives up for the night at 05:30 UK.
#   c) runs Popty's governed applier per unfinished course, one at a time, batch 25, never --urgent. Exit 75 = the
#      quiet-hours window closed: stop, resume tomorrow. Exit 1 = stopped on an error/refusal: stop and say so.
#      Exit 2 = course done with drift/refused ops set aside (never forced): carry on.
#   d) when every scheduled course's ledger covers every op: logs ITEM12 ALL DONE, disables its own timer, wakes Kai.
# One line goes to Kai's room each night it does work. No secrets on any argv: --key kai is resolved by the signer
# (sudo -u popty), and the surface token is read from a 0600 file by cs-wake-send's caller below.
set -u
D="$HOME/.cs-long/item12"; W="$D/popty"; DIR=ops/paid-cleanup-717/item12
ROOM=ee4c3798-79af-4f7d-9727-fe3cfffba955      # Kai's Watson room (the commission's source conversation)
SELF=0908a622-304f-45ad-8374-c397f1a38d2b      # job #957·AI, fallback if the room refuses this token
HELD=" eng_for_sin "                           # held whole by the spot-check: garbled Sinhala known prompts
WAKE="$HOME/command-surface/tools/cs-wake-send.cjs"
LOG="$D/night-$(date -u +%Y%m%d).log"
exec >>"$LOG" 2>&1
say() { local tok; tok=$(cat "$D/.tok" 2>/dev/null) || return 0
  node "$WAKE" "$ROOM" "$tok" "$1" || node "$WAKE" "$SELF" "$tok" "$1"; }
ukh() { TZ=Europe/London date +%H; }
echo "=== start $(date -u +%FT%TZ)"
cd "$W" || { echo "no worktree $W"; say "[item12 night] FAILED: worktree $W missing (log $LOG)"; exit 1; }
git fetch -q origin main && git merge -q --ff-only origin/main || { echo "ff-only failed"; say "[item12 night] FAILED: could not fast-forward $W to origin/main (log $LOG)"; exit 1; }
echo "main=$(git rev-parse --short HEAD)"
if [ ! -f "$DIR/SPOTCHECK.md" ] || [ ! -f "$DIR/night-run.sh" ]; then echo "not merged yet"; exit 0; fi

while systemctl --user is-active -q cs-long-937-ita-tiles.service; do
  h=$(ukh); if [ "$h" -ge 5 ] && [ "$h" -lt 22 ]; then echo "ita repair still running at ${h}h UK; giving up tonight"; say "[item12 night] skipped: Italian tile repair ran all night (log $LOG)"; exit 0; fi
  sleep 60
done

# remaining <changeset>: ops in the file not yet in its ledger (any fate: applied, already, drift, refused)
remaining() { python3 - "$1" <<'PY'
import json,sys
f=sys.argv[1]; n=len([l for l in open(f) if l.strip()])-1; done=set()
try:
  for l in open(f+'.applied.jsonl'):
    if l.strip(): done.update(json.loads(l).get('ops',[]))
except FileNotFoundError: pass
print(n-len(done & set(range(n))))
PY
}
total_left() { local t=0 c f; for f in $DIR/*/item12.changeset.jsonl; do c=$(basename "$(dirname "$f")"); [[ "$HELD" == *" $c "* ]] && continue; t=$((t+$(remaining "$f"))); done; echo $t; }

before=$(total_left); stop=""
for f in $DIR/*/item12.changeset.jsonl; do
  c=$(basename "$(dirname "$f")"); [[ "$HELD" == *" $c "* ]] && continue
  [ "$(remaining "$f")" -eq 0 ] && continue
  node tools/changeset/apply-changeset.cjs "$f" --key kai --agent kai-item12 --batch 25; rc=$?
  echo "$c exit=$rc left=$(remaining "$f")"
  if [ $rc -eq 75 ]; then stop="window closed at $c"; break; fi
  if [ $rc -eq 1 ]; then stop="STOPPED on an error at $c (see log)"; break; fi
done
after=$(total_left); echo "=== end $(date -u +%FT%TZ) ops left $after (was $before)"

if [ "$after" -eq 0 ]; then
  echo "ITEM12 ALL DONE"
  drift=$(cat $DIR/*/item12.changeset.jsonl.applied.jsonl 2>/dev/null | grep -cE '"status":"(drift|refused)"')
  systemctl --user disable --now cs-long-keep-item12-night.timer
  say "[item12 night] ITEM12 ALL DONE: every scheduled ledger complete ($drift batch-lines set aside as drift/refused, never forced); timer disabled. eng_for_sin still held. Log $LOG"
else
  say "[item12 night] $(date -u +%F): applied $((before-after)) ops, $after left${stop:+; $stop}. Log $LOG"
fi
