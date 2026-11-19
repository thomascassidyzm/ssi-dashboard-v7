#!/usr/bin/env bash
# Item 9 night runner (cs #960·AI; Kai approved item 9 on 18 Nov 15:41Z, all but the 19 held make-new LEGOs).
# Fired by the user timer cs-long-keep-item9-night.timer. Each night it:
#   a) fast-forwards the persistent worktree ~/.cs-long/item9/popty to origin/main; if this file is not on main there
#      yet, logs "not merged yet" and exits 0. The worktree is never recreated: each changeset's ledger
#      (<file>.applied.jsonl) and audio log (<file>.audio.jsonl), untracked, sit beside it and make the nights resumable.
#   b) waits while the Italian tile repair (cs-long-937-ita-tiles) or item 12's applier (cs-long-keep-item12-night)
#      is running, so two appliers never share the window; gives up for the night at 05:30 UK.
#   c) pre-checks each op's seed + LEGO text against live (tools/precheck-guards.cjs; mismatch = held as drift), then
#      applies, one file at a time, through Popty's governed applier (never --urgent), in this order:
#        1-backfill (every course) -> 2-free -> 3-filled -> 4-recut-S#### (--batch 8)
#      3-filled is REFUSED for a course until its 1-backfill ledger covers every op and every op is applied/already
#      (a drifted or refused back-fill row keeps that course's dependent deletes off live, never forced).
#      Exit 75 = quiet-hours window closed: stop, resume tomorrow. Exit 1 = stopped on an error: stop and say so.
#      Exit 2 = file done with drift/refused ops set aside: carry on.
#   d) after each file, fills the audio of the rows it ACTUALLY changed (tools/night-audio.cjs: render route dry run
#      first, then render + fill-only link; refusals logged, never retried; Cartesia capped per night).
#   e) when every file's ledger is complete and its audio answered: ITEM9 ALL DONE, disables its own timer, tells Kai.
# No secret on any argv: --key kai is resolved by the signer (sudo -u popty); the surface token is read from a 0600 file.
set -u
D="$HOME/.cs-long/item9"; W="$D/popty"; DIR=ops/paid-cleanup-item9
ROOM=ee4c3798-79af-4f7d-9727-fe3cfffba955      # Kai's Watson room
SELF=1cfb5bd6-a215-43d4-94c8-86de7fccf181      # job #960·AI, fallback if the room refuses this token
WAKE="$HOME/command-surface/tools/cs-wake-send.cjs"
LOG="$D/night-$(date -u +%Y%m%d).log"
exec >>"$LOG" 2>&1
say() { local tok; tok=$(cat "$D/.tok" 2>/dev/null) || return 0
  node "$WAKE" "$ROOM" "$tok" "$1" || node "$WAKE" "$SELF" "$tok" "$1"; }
ukh() { TZ=Europe/London date +%H; }
late() { local h; h=$(ukh); [ "$h" -ge 5 ] && [ "$h" -lt 22 ]; }
echo "=== start $(date -u +%FT%TZ)"
cd "$W" || { echo "no worktree $W"; say "[item9 night] FAILED: worktree $W missing (log $LOG)"; exit 1; }
git fetch -q origin main && git merge -q --ff-only origin/main || { echo "ff-only failed"; say "[item9 night] FAILED: could not fast-forward $W to origin/main (log $LOG)"; exit 1; }
echo "main=$(git rev-parse --short HEAD)"
[ -f "$DIR/night-run.sh" ] || { echo "not merged yet"; exit 0; }

for u in cs-long-937-ita-tiles.service cs-long-keep-item12-night.service; do
  while systemctl --user is-active -q "$u"; do
    if late; then echo "$u still running at $(ukh)h UK; giving up tonight"; say "[item9 night] skipped tonight: $u ran until $(ukh)h UK (log $LOG)"; exit 0; fi
    sleep 60
  done
done
export CS_CONV_TOKEN; CS_CONV_TOKEN=$(cat "$D/.tok" 2>/dev/null || true)   # render approval origin (#116·AI); env, never argv

state() { node "$DIR/tools/ledger-state.cjs" "$@"; }       # prints: <ops left> <ops set aside (drift/refused)>
left() { state "$1" | cut -d' ' -f1; }
FILES=$(ls $DIR/*/changesets/1-backfill.changeset.jsonl $DIR/*/changesets/2-free.changeset.jsonl \
           $DIR/*/changesets/3-filled.changeset.jsonl $DIR/*/changesets/4-recut-S*.changeset.jsonl 2>/dev/null)
total_left() { local t=0 f; for f in $FILES; do t=$((t+$(left "$f"))); done; echo $t; }

before=$(total_left); stop=""; gated=""
for f in $FILES; do
  [ "$(left "$f")" -eq 0 ] && continue
  if late; then stop="window closing (05:30 UK)"; break; fi
  cdir=$(dirname "$f"); name=$(basename "$f" .changeset.jsonl)
  if [ "$name" = 3-filled ] && [ -f "$cdir/1-backfill.changeset.jsonl" ]; then
    read -r bl bb < <(state "$cdir/1-backfill.changeset.jsonl")
    if [ "$bl" -ne 0 ] || [ "$bb" -ne 0 ]; then echo "GATED $f: 1-backfill left=$bl set-aside=$bb"; gated="$gated $(basename "$(dirname "$cdir")")"; continue; fi
  fi
  # Kai's rule: live pre-check of the seed and LEGO text too (the applier's expect covers the row); a mismatch is
  # written to the ledger as drift (held, never forced). If live cannot be read, this file waits for tomorrow.
  node "$DIR/tools/precheck-guards.cjs" "$f" || { echo "PRECHECK could not read live for $f; skipped tonight"; continue; }
  batch=25; [[ "$name" == 4-recut-* ]] && batch=8
  node tools/changeset/apply-changeset.cjs "$f" --key kai --agent kai-960-item9 --batch $batch; rc=$?
  echo "$f exit=$rc left=$(left "$f")"
  if [ $rc -eq 75 ]; then stop="window closed at $f"; break; fi
  if [ $rc -eq 1 ]; then stop="STOPPED on an error at $f (see log)"; break; fi
done

# Audio for whatever is applied (also catches up slots a cap or a restart left unanswered on earlier nights).
for f in $FILES; do
  late && break
  grep -q '"status":"applied"' "$f.applied.jsonl" 2>/dev/null || continue
  AGENT_ID=kai-960-item9 node "$DIR/tools/night-audio.cjs" "$f" --dry
  AGENT_ID=kai-960-item9 node "$DIR/tools/night-audio.cjs" "$f"
done
gl=0; for g in $gated; do f="$DIR/$g/changesets/3-filled.changeset.jsonl"; gl=$((gl+$(left "$f"))); done
after=$(total_left); echo "=== end $(date -u +%FT%TZ) ops left $after (was $before)${gated:+; gated:$gated}"
held=$(cat $DIR/*/changesets/*.audio.jsonl 2>/dev/null | wc -l)

if [ "$after" -eq "$gl" ] && [ -z "$stop" ] && ! node "$DIR/tools/ledger-state.cjs" --audio-pending $FILES; then
  echo "ITEM9 ALL DONE"
  aside=$(cat $DIR/*/changesets/*.applied.jsonl 2>/dev/null | grep -cE '"status":"(drift|refused)"')
  systemctl --user disable --now cs-long-keep-item9-night.timer
  say "[item9 night] ITEM9 ALL DONE: every changeset ledger complete ($aside lines set aside as drift/refused, never forced)${gated:+; 3-filled NOT applied for$gated because its back-fill had drift/refused rows}, audio answered ($held slot answers); timer disabled. Log $LOG"
else
  say "[item9 night] $(date -u +%F): applied $((before-after)) ops, $after left${gated:+; 3-filled gated for$gated (back-fill drift/refused)}${stop:+; $stop}. Log $LOG"
fi
