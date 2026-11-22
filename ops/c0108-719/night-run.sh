#!/usr/bin/env bash
# C0108 seed 108 hope -> expect night runner (cs #374·AI; Kai yes 18 Nov 13:22Z, Aran agreed the wording 13:17Z,
# re-commissioned 22 Nov). The shape of item 4's runner (ops/paid-cleanup-item4/night-run.sh, #358·AK). Fired by the
# user timer cs-long-keep-c0108-apply-374.timer (22:10 UTC). Each night:
#   a) fast-forwards the persistent worktree ~/.cs-long/c0108-374/popty to origin/main (never recreated: the ledgers
#      <file>.applied.jsonl and audio logs, untracked, live beside the changesets and make the nights resumable);
#   b) waits only while three other DB writers run (Tom 18 Nov: at most 3 writers, the a2c chain counted; Kai 22 Nov: item 4 +
#      a2c + this runner is the 3); gives up at 05:30 UK; it starts no parallel writer of its own (audio follows text, same process chain);
#   c) courses = every ops/c0108-719/<course>/changesets/c0108-374.changeset.jsonl on main (so a course landed later
#      joins the next night). PROBES FIRST: lit_for_eng (kind E) then deu_for_eng (kind T, no add-on); each is read back
#      from live (tools/live-check.cjs readback) and the run STOPS unless both match. Then the rest, one course at a
#      time, one writer: live pre-check of seed + LEGO (live-check.cjs precheck: a mismatch is ledgered as drift, held,
#      never forced), then Popty's governed applier, 25 ops per transaction, signed with the Kai key (kai_go for the
#      add-on LEGO inserts), never --urgent. Exit 75 = window closed: stop. Exit 1 = one course stopped on an error
#      (an add-on course whose LEGO insert is refused stops whole: one transaction, nothing applied): carry on, stop
#      after 3 in a row. Exit 2 = done with drift/refused ops set aside: carry on;
#   d) audio (tools/night-audio.cjs) for every applied row, after the a2c chain ends, 80k Cartesia cap;
#   e) reads every applied course back from live, wakes the owning conversation with the numbers; when every ledger is
#      complete and the audio answered, disables its own timer.
# No secret on any argv: --key kai is resolved by the signer (sudo -u popty); the surface token is read from a 0600 file.
set -u
D="$HOME/.cs-long/c0108-374"; W="$D/popty"; DIR=ops/c0108-719
SELF=91ab51c5-cdee-47ce-bfec-c8bb24d536fd      # job #374·AI (Kai's C0108 resume)
WAKE="$HOME/command-surface/tools/cs-wake-send.cjs"
LOG="$D/night-$(date -u +%Y%m%d).log"
exec >>"$LOG" 2>&1
say() { local tok; tok=$(cat "$D/.tok" 2>/dev/null) || return 0; node "$WAKE" "$SELF" "$tok" "$1"; }
ukh() { TZ=Europe/London date +%-H; }
late() { local h m; h=$(ukh); m=$(TZ=Europe/London date +%-M); [ "$h" -ge 6 ] && [ "$h" -lt 22 ] || { [ "$h" -eq 5 ] && [ "$m" -ge 30 ]; }; }
echo "=== start $(date -u +%FT%TZ)"
cd "$W" || { say "[c0108 night] FAILED: worktree $W missing (log $LOG)"; exit 1; }
git fetch -q origin main && git merge -q --ff-only origin/main || { say "[c0108 night] FAILED: could not fast-forward $W to origin/main (log $LOG)"; exit 1; }
echo "main=$(git rev-parse --short HEAD)"
curl -s -m 20 http://localhost:3470/health | grep -q '"governed":true' || { say "[c0108 night] skipped tonight: Popty /health does not report governed:true (log $LOG)"; exit 0; }

writers() { systemctl --user list-units --state=active --no-legend --plain 'cs-long-*' 2>/dev/null | awk '{print $1}' \
  | grep -E 'a2c|item|apply|night|tiles|relink|render|fill' | grep -v 'c0108' | wc -l; }
while [ "$(writers)" -ge 3 ]; do   # Kai 22 Nov: item 4 + a2c + this runner = 3, the cap; a 4th never starts
  if late; then say "[c0108 night] skipped tonight: $(writers) other DB writers still running at $(ukh)h UK (log $LOG)"; exit 0; fi
  echo "$(date -u +%T) $(writers) other writers active; waiting"; sleep 300
done
export CS_CONV_TOKEN; CS_CONV_TOKEN=$(cat "$D/.tok" 2>/dev/null || true)   # render approval origin; env, never argv

state() { node ops/paid-cleanup-item9/tools/ledger-state.cjs "$1"; }      # "<ops left> <set aside>"
cf() { echo "$DIR/$1/changesets/c0108-374.changeset.jsonl"; }
PROBES="lit_for_eng deu_for_eng"
REST=$(ls $DIR/*/changesets/c0108-374.changeset.jsonl 2>/dev/null | awk -F/ '{print $3}' | grep -vxE 'lit_for_eng|deu_for_eng' | sort)
stop=""; report=""; applied_courses=""; errs=0; nerr=0
apply_one() {   # $1 course -> sets rc; appends to report
  local c=$1 f l0 a0 l1 a1; f=$(cf "$c")
  [ -f "$f" ] || { report="$report $c:no-file"; rc=0; return; }
  read -r l0 a0 < <(state "$f")
  if [ "$l0" -eq 0 ]; then applied_courses="$applied_courses $c"; rc=0; return; fi
  node $DIR/tools/live-check.cjs precheck "$f" || { report="$report $c:precheck-unreadable"; rc=1; return; }
  node tools/changeset/apply-changeset.cjs "$f" --key kai --agent kai-c0108-374 --batch 25; rc=$?
  read -r l1 a1 < <(state "$f")
  echo "$c exit=$rc left=$l1 aside=$a1"; report="$report $c:+$((l0-l1-(a1-a0)))/left$l1/aside$a1"
  applied_courses="$applied_courses $c"
}
for c in $PROBES; do
  if late; then stop="window closing before probe $c"; break; fi
  apply_one "$c"
  [ $rc -eq 75 ] && { stop="quiet hours closed during probe $c"; break; }
  [ $rc -eq 1 ] && { stop="PROBE $c stopped on an error (see log); rest not started"; break; }
  node $DIR/tools/live-check.cjs readback "$(cf "$c")" || { stop="PROBE $c read-back does not match live (see log); rest not started"; break; }
done
if [ -z "$stop" ]; then
  for c in $REST; do
    if late; then stop="window closing (05:30 UK) before $c"; break; fi
    apply_one "$c"
    [ $rc -eq 75 ] && { stop="quiet hours closed during $c"; break; }
    if [ $rc -eq 1 ]; then nerr=$((nerr+1)); errs=$((errs+1)); [ $errs -ge 3 ] && { stop="3 courses in a row stopped on errors (last $c); see log"; break; }; else errs=0; fi
  done
fi

audio=""; arc=0
# the a2c chain's day tally runs until it ends (22 Nov 23:45Z): audio waits for it; c0108's 80k is reserved on
# 23 Nov through fixes.json entry "c0108-374"
while systemctl --user is-active -q cs-long-keep-a2c-chain.service; do late && break; echo "$(date -u +%T) a2c chain still running; audio waits"; sleep 300; done
late || { AGENT_ID=kai-c0108-374 node "$DIR/tools/night-audio.cjs" $applied_courses; arc=$?; audio=$(grep '^night-audio c0108' "$LOG" | tail -1); }

rb=""; for c in $applied_courses; do out=$(node $DIR/tools/live-check.cjs readback "$(cf "$c")" 2>&1); echo "$out"; echo "$out" | grep -q ' 0 differ' || rb="$rb $c"; done
echo "=== end $(date -u +%FT%TZ)"

left=0; for c in $PROBES $REST; do f=$(cf "$c"); [ -f "$f" ] || continue; read -r l a < <(state "$f"); left=$((left+l)); done
spend=$(tr -d '\n ' < "$HOME/ssi-evidence/ssi-dashboard-v7/ops/c0108-719/cartesia-spend.json" 2>/dev/null | head -c 300)
if [ "$left" -eq 0 ] && echo "$audio" | grep -qE ' 0 unanswered|c0108 cap'; then
  systemctl --user disable --now cs-long-keep-c0108-apply-374.timer
  say "[c0108 night] ALL DONE:${report:0:1800}; $audio; readback mismatch:${rb:- none}; timer disabled. Log $LOG"
else
  say "[c0108 night] $(date -u +%F): ops left $left, course errors $nerr${stop:+; $stop};${report:0:1800}; ${audio:-audio not run (window)}$([ "$arc" -ne 0 ] && echo " (audio exit $arc)"); readback mismatch:${rb:- none}; spend $spend. Log $LOG"
fi
