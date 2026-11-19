#!/usr/bin/env bash
# @db-live-write: Kai-approved item 20 apply (19 Nov ~17:05Z), via Popty routes only: apply-changeset.cjs (governed edit door) + render route + link-clip
# Item 20 Saturday runner (cs #79·AJ; Kai approved item 20 with its audio on Sat 21 Nov: "Happy with item 20", 19 Nov ~17:05Z).
# Fired ONCE by the user timer cs-long-keep-item20-sat.timer at Sat 21 Nov 00:05 UTC — inside Popty's quiet window
# (apply-changeset.cjs applies only 22:00-07:00 Europe/London = UTC in November; Tom #835: a write beyond hand-scale goes as
# a changeset through that governed applier, never --urgent). It:
#   a) fast-forwards the persistent worktree ~/.cs-long/item20/popty to origin/main (the ledgers <file>.applied.jsonl and
#      audio logs <file>.audio.jsonl sit beside each changeset there, untracked, so a stop resumes exactly);
#   b) waits for Popty /health to show the load gate governed:true (≤ 60 min, else stops and says so);
#   c) TEXT, course by course, smallest first (urd 390, pan 555, mar 667, ben 702, guj 1,125 ops: if the window or a cap ends
#      the run early, the most courses are whole — text AND audio — and the biggest is the one carried): wait while 2+ other
#      DB writers are active (≤ 3 at once, counting this unit's own audio step), Kai's live pre-check of each op's seed + LEGO
#      (item 9's precheck-guards.cjs: a mismatch is held as drift, never forced; the applier's `expect` holds the row), then
#      apply-changeset.cjs --batch 25. Exit 75 = window closed: sleep to Sat 22:00 UK and resume once, then stop.
#   d) AUDIO, in a parallel loop, for each course as soon as its text is done: tools/sat-audio.cjs (route only, one ask at a
#      time, fill-only links, Kai's grant for EXISTS_IN_LANGUAGE, caps checked before every Cartesia ask; exit 3 = a cap or
#      a limit refusal: ALL audio stops). Audio is never rendered for a row its ledger does not mark applied.
#   e) after each course's audio: post.cjs after <course> (one full /v2/validate on live, diffed against the copy's before).
#   f) marks item 20's spend file done (a2c's run-day.cjs then counts real spend only), writes results.md/json and wakes
#      job #79·AJ with the numbers. Any failure or the 40 h backstop wakes it too (trap EXIT).
# No secret on any argv: --key kai is resolved by the signer (sudo -u popty); the surface token is read from a 0600 file.
set -u
D="$HOME/.cs-long/item20"; W="$D/popty"; DIR=ops/paid-cleanup-item20
SELF=1d2949a0-f76a-4cd5-9413-44211d8deaff      # job #79·AJ (Kai's item 20 apply job)
WAKE="$HOME/command-surface/tools/cs-wake-send.cjs"
LOG="$D/sat-$(date -u +%Y%m%d).log"
COURSES="eng_for_urd eng_for_pan eng_for_mar eng_for_ben eng_for_guj"
exec >>"$LOG" 2>&1
say() { node "$WAKE" "$SELF" "$(cat "$D/.tok" 2>/dev/null)" "$1"; }
FINISHED=""
trap '[ -z "$FINISHED" ] && say "[item20 sat] runner ENDED UNEXPECTEDLY (killed, backstop or error) at $(date -u +%FT%TZ); ledgers resume on a re-run. Log $LOG"' EXIT
ts() { date -u +%FT%TZ; }
ukh() { TZ=Europe/London date +%H; }
inwin() { local h; h=$(ukh); [ "$h" -ge 22 ] || [ "$h" -lt 7 ]; }
echo "=== start $(ts)"
cd "$W" || { say "[item20 sat] FAILED: worktree $W missing"; FINISHED=1; exit 1; }
git fetch -q origin main && git merge -q --ff-only origin/main || { say "[item20 sat] FAILED: could not fast-forward $W to origin/main (log $LOG)"; FINISHED=1; exit 1; }
echo "main=$(git rev-parse --short HEAD)"
[ -f "$DIR/sat-run.sh" ] || { say "[item20 sat] NOT RUN: item 20 runner is not on main"; FINISHED=1; exit 1; }
export CS_CONV_TOKEN; CS_CONV_TOKEN=$(cat "$D/.tok")
export AGENT_ID=kai-79-item20

for i in $(seq 1 60); do curl -s -m 20 http://localhost:3470/health | grep -q '"governed":true' && break; [ "$i" = 60 ] && { say "[item20 sat] NOT RUN: Popty /health never showed the load gate governed:true in 60 min (log $LOG)"; FINISHED=1; exit 1; }; sleep 60; done
echo "$(ts) load gate governed:true"

# Other DB writers: a2c render runners, item 9/12 night appliers, the Italian tile repair, and any other cs-long unit whose
# name says it writes (apply/fill/relink/recut/backfill/tiles/render/item). This unit and serve-only units are excluded.
writers() {
  systemctl --user list-units 'cs-long-*' --state=active --no-legend --plain 2>/dev/null | awk '{print $1}' | grep '\.service$' \
    | grep -v -e item20-sat -e item20-probe -e flag326 -e px734 -e photoreal -e mtt- \
    | grep -E 'a2c|item|apply|fill|relink|recut|backfill|tiles|render|night' | wc -l
}
wait_writers() { # $1 = how many others may run alongside
  local n
  while :; do n=$(writers); [ "$n" -le "$1" ] && return 0; inwin || return 1; echo "$(ts) $n other DB writers active; waiting"; sleep 60; done
}
left() { node "$DIR/../paid-cleanup-item9/tools/ledger-state.cjs" "$1" | cut -d' ' -f1; }
F() { echo "$DIR/$1/changesets/item20.changeset.jsonl"; }
rm -f "$D"/textdone-* "$D/text-finished"

text_loop() {
  local c f rc resumed=""
  for c in $COURSES; do
    f=$(F "$c")
    while :; do
      [ "$(left "$f")" -eq 0 ] && break
      if ! inwin || ! wait_writers 1; then
        if [ -z "$resumed" ] && [ "$(date -u +%u)" = 6 ]; then
          echo "$(ts) window closed with $c unfinished; sleeping to 22:00 UK"; echo "WINDOW $(ts) $c" >> "$D/gaps"
          resumed=1; while ! inwin; do sleep 300; done; continue
        fi
        echo "$(ts) TEXT STOPPED at $c: window closed again"; echo "TEXTSTOP $(ts) window closed at $c" >> "$D/gaps"; touch "$D/text-finished"; return
      fi
      node "$DIR/../paid-cleanup-item9/tools/precheck-guards.cjs" "$f" || { echo "PRECHECK could not read live for $c"; echo "PRECHECK $(ts) $c could not read live" >> "$D/gaps"; break; }
      node tools/changeset/apply-changeset.cjs "$f" --key kai --agent kai-79-item20 --batch 25; rc=$?
      echo "$(ts) $c apply exit=$rc left=$(left "$f")"
      [ $rc -eq 75 ] && continue
      if [ $rc -eq 1 ]; then echo "TEXTSTOP $(ts) applier stopped on an error at $c" >> "$D/gaps"; touch "$D/text-finished"; return; fi
      break
    done
    touch "$D/textdone-$c"
  done
  touch "$D/text-finished"
}

audio_loop() {
  local c f rc
  for c in $COURSES; do
    while [ ! -f "$D/textdone-$c" ] && [ ! -f "$D/text-finished" ]; do sleep 30; done
    f=$(F "$c")
    if grep -q '"status":"applied"' "$f.applied.jsonl" 2>/dev/null && [ ! -f "$D/audio-stopped" ]; then
      node "$DIR/tools/sat-audio.cjs" "$f"; rc=$?
      if [ $rc -eq 3 ]; then echo "AUDIOSTOP $(ts) at $c (cap or limit; see log)" >> "$D/gaps"; touch "$D/audio-stopped"; fi
      [ $rc -ne 0 ] && [ $rc -ne 3 ] && echo "AUDIOERR $(ts) $c exit $rc" >> "$D/gaps"
    fi
    grep -q '"status":"applied"' "$f.applied.jsonl" 2>/dev/null && (cd "$DIR/tools" && node post.cjs after "$c") || true
  done
}

audio_loop & AP=$!
text_loop
wait $AP
node "$DIR/tools/sat-audio.cjs" --mark-done
SUM=$(node "$DIR/tools/sat-report.cjs" "$W/$DIR")
GAPS=$(tr '\n' ';' < "$D/gaps" 2>/dev/null)
echo "=== end $(ts): $SUM ${GAPS:+GAPS: $GAPS}"
systemctl --user disable cs-long-keep-item20-sat.timer 2>/dev/null
FINISHED=1
say "WAKE: [item20 sat] run finished $(ts): $SUM.${GAPS:+ GAPS: $GAPS} Results ~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-item20/results.md; log $LOG"
