#!/usr/bin/env bash
# cs #420·AK: night runner for the ita own-LEGO changesets (#942 plan, re-checked on the 22 Nov copy). Shape of
# ops/c0108-719/night-run.sh. Fired by cs-long-keep-ita420-apply.timer (23:46 UTC; the a2c chain ends 23:45Z). Each night:
#   a) fast-forwards the persistent worktree ~/.cs-long/ita420/popty to origin/main (ledgers <file>.applied.jsonl and
#      audio logs are untracked and live beside the changesets, so nights resume);
#   b) WRITER RULE (Tom 18 Nov, at most 3 DB writers): waits while 3 or more other writer units are active; never starts a
#      write at or after 06:30 UK, and then wakes the owner "no slot tonight";
#   c) PROBE ita_for_jpn: live pre-check of row+LEGO+seed (item 9's precheck-guards.cjs: a mismatch is ledgered as
#      drift and HELD, never forced) -> governed applier (25 ops/transaction, Kai key, never --urgent) -> text read-back
#      from live. Any read-back mismatch stops the night before ita_for_eng;
#   d) ita_for_eng the same way;
#   e) audio: dry run first (price), then the real fill only if the dry price is inside ITA420_CAP (10,000 Cartesia chars);
#      EXISTS_IN_LANGUAGE links the clip the route names (Kai 18 Nov fill now, mismatch OK);
#   f) full read-back (text + 3 audio slots) of both; silent slots left -> queue-audio-pass.cjs; wakes the owning
#      conversation with the numbers; disables its own timer when every op is answered and nothing is silent.
# No secret on any argv: --key kai is resolved by the signer (sudo -u popty); the surface token is read from a 0600 file.
set -u
D="$HOME/.cs-long/ita420"; W="$D/popty"; DIR=ops/420-ita-own-lego-apply
SELF=a108777e-ad9e-4f10-b0fd-82b83696ccbc      # job #420·AK
WAKE="$HOME/command-surface/tools/cs-wake-send.cjs"
LOG="$D/night-$(date -u +%Y%m%d).log"
exec >>"$LOG" 2>&1
say() { local tok; tok=$(cat "$D/.tok" 2>/dev/null) || return 0; node "$WAKE" "$SELF" "$tok" "$1"; }
ukh() { TZ=Europe/London date +%-H; }
late() { local h m; h=$(ukh); m=$(TZ=Europe/London date +%-M); { [ "$h" -ge 7 ] && [ "$h" -lt 22 ]; } || { [ "$h" -eq 6 ] && [ "$m" -ge 30 ]; }; }
echo "=== start $(date -u +%FT%TZ)"
cd "$W" || { say "[ita420 night] FAILED: worktree $W missing (log $LOG)"; exit 1; }
git fetch -q origin main && git merge -q --ff-only origin/main || { say "[ita420 night] FAILED: could not fast-forward $W to origin/main (log $LOG)"; exit 1; }
echo "main=$(git rev-parse --short HEAD)"
curl -s -m 20 http://localhost:3470/health | grep -q '"governed":true' || { say "[ita420 night] skipped tonight: Popty /health does not report governed:true (log $LOG)"; exit 0; }

writers() { systemctl --user list-units --type=service --state=active --no-legend --plain 'cs-long-*' 2>/dev/null | awk '{print $1}' \
  | grep -E 'a2c|item|apply|night|tiles|relink|render|fill' | grep -v 'ita420' | wc -l; }
n=0
while [ "$(writers)" -ge 3 ]; do
  if late; then say "[ita420 night] NO SLOT tonight: $(writers) other DB writers still active at $(TZ=Europe/London date +%H:%M) UK; nothing written, timer stays armed for the next night (log $LOG)"; exit 0; fi
  n=$((n+1)); [ $n -gt 100 ] && { say "[ita420 night] TIMED OUT waiting for a writer slot (log $LOG)"; exit 0; }
  echo "$(date -u +%T) $(writers) other writers active: $(systemctl --user list-units --type=service --state=active --no-legend --plain 'cs-long-*' | awk '{print $1}' | grep -E 'a2c|item|apply|night|tiles|relink|render|fill' | tr '\n' ' '); waiting"; sleep 300
done
late && { say "[ita420 night] NO SLOT tonight: window closing ($(TZ=Europe/London date +%H:%M) UK); nothing written (log $LOG)"; exit 0; }
echo "$(date -u +%T) slot open: $(writers) other writer(s)"
export CS_CONV_TOKEN; CS_CONV_TOKEN=$(cat "$D/.tok" 2>/dev/null || true)   # render approval origin; env, never argv

state() { node ops/paid-cleanup-item9/tools/ledger-state.cjs "$1"; }      # "<ops left> <set aside>"
cf() { echo "$DIR/$1/changesets/own-lego-420.changeset.jsonl"; }
stop=""; report=""
apply_one() {   # $1 course -> rc; appends to report
  local c=$1 f l0 a0 l1 a1; f=$(cf "$c"); rc=0
  read -r l0 a0 < <(state "$f")
  if [ "$l0" -gt 0 ]; then
    node ops/paid-cleanup-item9/tools/precheck-guards.cjs "$f" || { report="$report $c:precheck-unreadable"; rc=1; return; }
    node tools/changeset/apply-changeset.cjs "$f" --key kai --agent kai-420 --batch 25; rc=$?
  fi
  read -r l1 a1 < <(state "$f")
  echo "$c exit=$rc left=$l1 aside=$a1"; report="$report $c:+$((l0-l1-(a1-a0)))/left$l1/aside$a1"
}
for c in ita_for_jpn ita_for_eng; do
  if late; then stop="window closing before $c"; break; fi
  apply_one "$c"
  [ $rc -eq 75 ] && { stop="quiet hours closed during $c"; break; }
  [ $rc -eq 1 ] && { stop="$c stopped on an error (see log)"; break; }
  out=$(node $DIR/readback.cjs "$(cf "$c")" --text-only 2>&1); echo "$out"; report="$report [${out}]"
  echo "$out" | grep -q ' 0 differ' || { stop="$c text read-back does not match live; nothing further written"; break; }
done

audio=""
if [ -z "$stop" ] && ! late; then
  dry=0; for c in ita_for_jpn ita_for_eng; do o=$(AGENT_ID=kai-420 node $DIR/night-audio.cjs "$(cf "$c")" --dry 2>&1 | tail -1); echo "$o"; audio="$audio [$o]"; w=$(echo "$o" | sed -n 's/.*would spend \([0-9]*\).*/\1/p'); dry=$((dry+${w:-0})); done
  if [ "$dry" -le "${ITA420_CAP:-10000}" ]; then
    for c in ita_for_jpn ita_for_eng; do late && break; o=$(AGENT_ID=kai-420 node $DIR/night-audio.cjs "$(cf "$c")" 2>&1 | tail -1); echo "$o"; audio="$audio [$o]"; done
  else audio="$audio NOT RENDERED: dry price $dry > cap ${ITA420_CAP:-10000}"; fi
fi

rb=""; silent=0; for c in ita_for_jpn ita_for_eng; do out=$(node $DIR/readback.cjs "$(cf "$c")" 2>&1); r=$?; echo "$out"; rb="$rb [$out]"
  if [ $r -ne 0 ] && echo "$out" | grep -q 'SILENT'; then silent=1; node tools/course-optimization/queue-audio-pass.cjs "$c" --reason "cs #420 ita own-LEGO re-words left silent" --by "@kai-420" || true; fi; done
echo "=== end $(date -u +%FT%TZ)"
left=0; for c in ita_for_jpn ita_for_eng; do read -r l a < <(state "$(cf "$c")"); left=$((left+l)); done
if [ "$left" -eq 0 ] && [ -z "$stop" ] && [ $silent -eq 0 ] && [ -n "$audio" ]; then
  systemctl --user disable --now cs-long-keep-ita420-apply.timer
  say "[ita420 night] ALL DONE:${report:0:1500}; audio:${audio:0:900}; readback:${rb:0:900}; timer disabled. Log $LOG"
else
  say "[ita420 night] $(date -u +%F): ops left $left${stop:+; STOP: $stop};${report:0:1500}; audio:${audio:- not run}; readback:${rb:0:900}. Log $LOG"
fi
