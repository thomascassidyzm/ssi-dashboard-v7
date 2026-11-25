#!/usr/bin/env bash
# cs #234·AL overnight runner: price → (22:00-07:00 UK) deletes → rewords → addend → English re-voice, each step gated and read back.
# Run as a systemd user unit (outlives the job's turn). Wakes the job's conversation after each step through cs-wake-send.cjs;
# the conversation token is read from ~/.cs-long/234/.tok (600), never from argv.
# GATE before every step: Popty /health dbLoadGate.governed == true AND fewer than 3 of tonight's other DB writers active
# (Kai's 3-writer rule; Tom's 18 Nov NEVER HAMMER THE DB). Waits, never adds a fourth writer.
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$DIR/../../.." && pwd)"; cd "$ROOT"
CONV=5d671ac0-8a72-4bd5-b674-987fa36f1950
AGENT=kai-234-jpn-open-end
WRITERS="cs-long-keep-868-8b cs-long-keep-868-night cs-long-keep-item4-358"
EV="$HOME/ssi-evidence/ssi-dashboard-v7/ops/jpn-t32-open-end-census/apply"; mkdir -p "$EV"
wake() { node ~/command-surface/tools/cs-wake-send.cjs "$CONV" "$(cat ~/.cs-long/234/.tok)" "$1" >/dev/null 2>&1 && echo "WAKE SENT: $1" || echo "WAKE FAILED: $1"; }
ukh() { TZ=Europe/London date +%H | sed 's/^0//'; }
night() { local h; h=$(ukh); [ "$h" -ge 22 ] || [ "$h" -lt 7 ]; }
others() { local n=0; for u in $WRITERS; do systemctl --user is-active -q "$u" && n=$((n+1)); done; echo $n; }
governed() { curl -s -m 10 http://localhost:3470/health | grep -q '"governed":true'; }
gate() { # waits for night + governed + <3 other writers; returns 1 if the night ends first
  while :; do
    if ! night; then [ "$(ukh)" -ge 7 ] && [ "$(ukh)" -lt 22 ] && [ "${STARTED:-0}" = 1 ] && return 1; sleep 60; continue; fi
    STARTED=1
    if governed && [ "$(others)" -lt 3 ]; then return 0; fi
    echo "$(date -u +%FT%TZ) gate: governed=$(governed && echo y || echo n) other_writers=$(others) — waiting"; sleep 120
  done
}
readback() { curl -s -m 300 http://localhost:3470/api/production/jpn_for_eng/seeds -o "$EV/live-$1.json" && node "$DIR/readback.cjs" "$EV/live-$1.json" probe deletes rewords addend; }

# 0. price (dry run, any hour, no spend)
[ -f "$DIR/price.json" ] || { AGENT_ID=$AGENT node "$DIR/night-audio.cjs" --price; }
echo "$(date -u +%FT%TZ) price: $(node -e 'const p=require(process.argv[1]);console.log(JSON.stringify({unique:p.unique_texts,chars:p.chars,render_chars:p.render_chars,tally:p.tally}))' "$DIR/price.json")"

for cs in probe deletes rewords addend; do
  while :; do
    gate || { wake "WAKE: cs234 night window closed before $cs finished; ledgers resume next night. $(readback closed | tr '\n' ' ')"; exit 0; }
    echo "$(date -u +%FT%TZ) applying $cs (other writers $(others))"
    node tools/changeset/apply-changeset.cjs "$DIR/$cs.changeset.jsonl" --key kai --agent $AGENT; rc=$?
    echo "$(date -u +%FT%TZ) $cs exit $rc"
    case $rc in 0|2) break ;; 75) continue ;; *) n=$(( ${n:-0} + 1 )); [ $n -ge 3 ] && { wake "WAKE: cs234 $cs STOPPED (exit $rc three times); see journalctl --user -u cs-long-keep-234-night"; exit 1; }; sleep 120 ;; esac
  done
  n=0
  RB=$(readback "$cs" | tr '\n' ' ')
  echo "$(date -u +%FT%TZ) readback after $cs: $RB"
  if [ "$cs" = probe ]; then
    node -e 'const l=process.argv[1].trim().split(/\n|(?<=\}) (?=\{)/).map(x=>JSON.parse(x)).find(x=>x.changeset==="probe");process.exit(l&&l.readback_problems===0&&l.verified_live===l.ops?0:1)' "$RB" \
      || { wake "WAKE: cs234 PROBE readback NOT clean, run stopped before the bulk: $RB"; exit 1; }
    continue
  fi
  wake "WAKE: cs234 $cs applied (exit $rc). Readback: $RB"
done

while :; do
  gate || { wake "WAKE: cs234 night window closed during the English re-voice; audio.jsonl resumes next night"; exit 0; }
  AGENT_ID=$AGENT node "$DIR/night-audio.cjs"; rc=$?
  left=$(AGENT_ID=$AGENT node -e '
    const {slotsFor}=require(process.argv[1]+"/../../paid-cleanup-item9/tools/ledger-state.cjs");const fs=require("fs"),p=require("path");
    const L=new Set((fs.existsSync(p.join(process.argv[1],"audio.jsonl"))?fs.readFileSync(p.join(process.argv[1],"audio.jsonl"),"utf8").split("\n").filter(Boolean):[]).map(l=>JSON.parse(l).key));
    let n=0;for(const k of ["probe","rewords","addend"])for(const s of slotsFor(p.join(process.argv[1],k+".changeset.jsonl")).slots)if(s.role==="known"&&!L.has(s.key))n++;console.log(n)' "$DIR")
  [ "$rc" = 3 ] && { wake "WAKE: cs234 English re-voice STOPPED on a spend refusal; $left slots unanswered; see audio.jsonl"; exit 0; }
  [ "$left" = 0 ] && break
  sleep 120
done
RB=$(readback final | tr '\n' ' ')
wake "WAKE: cs234 ALL DONE (deletes, rewords, add-end, English re-voice). Final readback: $RB"
