#!/usr/bin/env bash
# Item 4 night runner (cs #358; Kai approved item 4 on 18 Nov with a 200k Cartesia cap, raised to 550k 22 Nov). The same shape as item 9's
# (ops/paid-cleanup-item9/night-run.sh, #960·AI). Fired by the user timer cs-long-keep-item4-358.timer (22:05 UTC). Each night:
#   a) fast-forwards the persistent worktree ~/.cs-long/item4-358/popty to origin/main (never recreated: the ledgers
#      <file>.applied.jsonl and the audio logs, untracked, live beside the changesets and make the nights resumable);
#   b) waits while two other DB writers are already running (Tom 18 Nov: at most 3 writers at once, the
#      azure-to-cartesia chain counted), giving up for the night at 05:30 UK;
#   c) per course, por_br_for_eng THEN eng_for_mar, one writer: pre-checks every pending op's seed + LEGO text against
#      live (item 9's precheck-guards.cjs; a mismatch is written to the ledger as drift: held, never forced), then
#      applies through Popty's governed applier (25 ops per transaction, never --urgent);
#      Exit 75 = quiet hours closed: stop, resume tomorrow. Exit 1 = stopped on an error: stop and say so.
#      Exit 2 = file done with drift/refused ops set aside: carry on;
#   d) audio for every row item 4 made live (tools/night-audio.cjs: tonight's applied ops + the 18 Nov backlog, in
#      seed order, Popty's one render route, fill-only links, 550k Cartesia cap in total, stops on a spend refusal);
#   e) wakes the owning conversation with the night's numbers; when both ledgers are complete and the audio is either
#      all answered or at the cap, disables its own timer.
# No secret on any argv: --key kai is resolved by the signer (sudo -u popty); the surface token is read from a 0600 file.
set -u
D="$HOME/.cs-long/item4-358"; W="$D/popty"; DIR=ops/paid-cleanup-item4
SELF=d3a237c1-bb86-43a2-9080-9270bafd58ab      # job #358·AI (Kai's item-4 resume)
WAKE="$HOME/command-surface/tools/cs-wake-send.cjs"
LOG="$D/night-$(date -u +%Y%m%d).log"
exec >>"$LOG" 2>&1
say() { local tok; tok=$(cat "$D/.tok" 2>/dev/null) || return 0; node "$WAKE" "$SELF" "$tok" "$1"; }
ukh() { TZ=Europe/London date +%-H; }
late() { local h; h=$(ukh); [ "$h" -ge 5 ] && [ "$h" -lt 22 ]; }
echo "=== start $(date -u +%FT%TZ)"
cd "$W" || { say "[item4 night] FAILED: worktree $W missing (log $LOG)"; exit 1; }
git fetch -q origin main && git merge -q --ff-only origin/main || { say "[item4 night] FAILED: could not fast-forward $W to origin/main (log $LOG)"; exit 1; }
echo "main=$(git rev-parse --short HEAD)"
[ -f "$DIR/night-run.sh" ] || { echo "not merged yet"; exit 0; }
curl -s -m 20 http://localhost:3470/health | grep -q '"governed":true' || { say "[item4 night] skipped tonight: Popty /health does not report governed:true (log $LOG)"; exit 0; }

writers() { systemctl --user list-units --state=active --no-legend --plain 'cs-long-*' 2>/dev/null | awk '{print $1}' \
  | grep -E 'a2c|item|apply|night|tiles|relink|render|fill' | grep -v 'item4-358' | wc -l; }
while [ "$(writers)" -ge 2 ]; do
  if late; then say "[item4 night] skipped tonight: $(writers) other DB writers still running at $(ukh)h UK (log $LOG)"; exit 0; fi
  echo "$(date -u +%T) $(writers) other writers active; waiting"; sleep 300
done
export CS_CONV_TOKEN; CS_CONV_TOKEN=$(cat "$D/.tok" 2>/dev/null || true)   # render approval origin; env, never argv

state() { node ops/paid-cleanup-item9/tools/ledger-state.cjs "$1"; }      # "<ops left> <set aside>"
COURSES="por_br_for_eng eng_for_mar"; stop=""; report=""
for c in $COURSES; do
  f="$DIR/$c/changesets/r358.changeset.jsonl"
  read -r l0 a0 < <(state "$f")
  if [ "$l0" -eq 0 ]; then report="$report $c:done(aside $a0)"; continue; fi
  if late; then stop="window closing (05:30 UK) before $c"; break; fi
  node ops/paid-cleanup-item9/tools/precheck-guards.cjs "$f" || { stop="PRECHECK could not read live for $c"; break; }
  node tools/changeset/apply-changeset.cjs "$f" --key kai --agent kai-358-item4 --batch 25; rc=$?
  read -r l1 a1 < <(state "$f")
  echo "$c exit=$rc left=$l1 aside=$a1"; report="$report $c:applied $((l0-l1-(a1-a0))) left $l1 aside $a1"
  [ $rc -eq 75 ] && { stop="quiet hours closed during $c"; break; }
  [ $rc -eq 1 ] && { stop="STOPPED on an error in $c (see log)"; break; }
done

audio=""; arc=0
# The a2c chain's own day tally runs until it ends (22 Nov 23:45Z): audio waits for it, so the two never share a day's
# cap; item 4's whole cap is reserved on the a2c four-day total through fixes.json entry "item4-358" (utc_day 23 Nov).
while systemctl --user is-active -q cs-long-keep-a2c-chain.service; do late && break; echo "$(date -u +%T) a2c chain still running; audio waits"; sleep 300; done
# audio only ever touches ops the ledgers mark applied (and the 18 Nov backlog), so it runs whatever stopped above
late || { AGENT_ID=kai-358-item4 node "$DIR/tools/night-audio.cjs" $COURSES; arc=$?; audio=$(grep '^night-audio item4' "$LOG" | tail -1); }
echo "=== end $(date -u +%FT%TZ)"

left=0; for c in $COURSES; do read -r l a < <(state "$DIR/$c/changesets/r358.changeset.jsonl"); left=$((left+l)); done
spend=$(cat "$HOME/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-item4/cartesia-spend.json" 2>/dev/null | tr -d '\n ' | head -c 300)
if [ "$left" -eq 0 ] && { echo "$audio" | grep -qE ' 0 unanswered|item-4 cap'; }; then
  systemctl --user disable --now cs-long-keep-item4-358.timer
  say "[item4 night] ITEM4 ALL DONE:$report; $audio; timer disabled. Log $LOG"
else
  say "[item4 night] $(date -u +%F):$report${stop:+; $stop}; ${audio:-audio not run (window)}$([ "$arc" -ne 0 ] && echo " (audio exit $arc)"); spend $spend. Log $LOG"
fi
