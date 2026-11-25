#!/usr/bin/env bash
# cs #236·AL night runner: Kai's four paid-cleanup items (Kai 24 Nov: "Yes, tonight is good for those"), in his order:
#   1) item 9 back-fill (ops/overnight-785/item7-backfill/*/changesets/backfill, inserts) + its audio (render, fill-only)
#   2) item 18 deletes (same row twice in one basket)
#   3) item 16 rule 1 (moves, then gate16 → flips of groups whose inserts all landed)
#   4) item 14 rule 1 (add the missing ?/؟/¿…?) + re-record of that side (audio14.cjs)
# Fired by cs-long-keep-236-night.timer from the DURABLE checkout ~/.cs-long/236/popty (ff-only to origin/main by the
# unit); ledgers <file>.applied.jsonl / .audio.jsonl / .verify.json live beside each changeset there. Unit failure wakes
# the job (OnFailure). Kai's live pre-check (precheck-guards.cjs: seed + LEGO text; the applier's expect covers the row)
# before every file; mismatch = drift in the ledger, held, never forced. Governed applier, 25 ops per transaction.
#   Writer cap: at most 2 OTHER DB writers active (Kai's cap of 3 after the 18 Nov hold); /health gate green per file.
#   Gives up for the night at 05:30 UK; the next night resumes from the ledgers. Token from a 0600 file, never argv.
set -u
W=${W236:-$HOME/.cs-long/236/popty}
D=$HOME/.cs-long/236; LOG="$D/night-$(date -u +%Y%m%d).log"; exec >>"$LOG" 2>&1
SELF=4e75a420-e308-4458-a9e7-bab7327312f3
export CS_CONV_TOKEN; CS_CONV_TOKEN=$(cat "$D/.tok" 2>/dev/null || true)
say() { node "$HOME/command-surface/tools/cs-wake-send.cjs" "$SELF" "$CS_CONV_TOKEN" "$1"; }
ukh() { TZ=Europe/London date +%-H; }; ukm() { TZ=Europe/London date +%-M; }
late() { local h m; h=$(ukh); m=$(ukm); [ "$h" -ge 6 ] && [ "$h" -lt 22 ] && return 0; [ "$h" -eq 5 ] && [ "$m" -ge 30 ]; }
echo "=== start $(date -u +%FT%TZ)"; cd "$W" || { say "[236 night] FAILED: checkout $W missing"; exit 1; }
echo "main=$(git rev-parse --short HEAD)"
T=ops/paid-cleanup-236/tools; P=ops/paid-cleanup-item9/tools
curl -s -m 20 http://localhost:3470/health | grep -q '"governed":true' || { say "[236 night] skipped: Popty /health not governed:true (log $LOG)"; exit 0; }

# Start gate: #234·AL (jpn apply) was STOOD DOWN for 24 Nov (Kai's Watson, 17:2xZ), so no wait on it; the writer cap
# and the load gate below are the only gates.
# Services only: a waiting .timer is "active" all day and is not a writer (24 Nov night: three timers held the cap shut).
writers() { systemctl --user list-units --type=service --state=active --no-legend --plain 'cs-long-*' 2>/dev/null | awk '{print $1}' \
  | grep -E 'a2c|item|apply|night|tiles|relink|render|fill|record|8b' | grep -v -E '236|cohort' | wc -l; }
waitw() { while [ "$(writers)" -ge 2 ]; do late && return 1; echo "$(date -u +%T) $(writers) other writers; waiting"; sleep 180; done; return 0; }
green() { for _ in $(seq 1 40); do curl -s -m 20 http://localhost:3470/health | grep -q '"level":"green"' && return 0; echo "$(date -u +%T) gate not green"; sleep 30; done; return 1; }
state() { node $P/ledger-state.cjs "$1"; }
report=""; stop=""
apply() {   # $1 file $2 label → 0 carry on, 1 stop the night
  local f=$1 n=$2 l0 a0 l1 a1 rc
  read -r l0 a0 < <(state "$f"); [ "$l0" -eq 0 ] && return 0
  late && { stop="window closing before $n"; return 1; }
  waitw || { stop="writer cap still full at $(ukh)h UK before $n"; return 1; }
  green || { stop="load gate not green for 20 min before $n"; return 1; }
  node $P/precheck-guards.cjs "$f" || { report="$report $n: precheck could not read live, skipped;"; return 0; }
  node tools/changeset/apply-changeset.cjs "$f" --key kai --agent kai-236 --batch 25; rc=$?
  read -r l1 a1 < <(state "$f"); report="$report $n: +$((l0-l1-(a1-a0))) left $l1 aside $a1;"
  [ $rc -eq 75 ] && { stop="quiet hours closed during $n"; return 1; }
  [ $rc -eq 1 ] && { stop="STOPPED on an error in $n"; return 1; }
  return 0
}
bysize() { for f in "$@"; do [ -f "$f" ] && echo "$(($(wc -l <"$f")-1)) $f"; done | sort -n | cut -d' ' -f2; }

# 1) item 9 back-fill, smallest first; the first two are read back before the rest go.
B=$(bysize ops/overnight-785/item7-backfill/*/changesets/backfill.changeset.jsonl); k=0
for f in $B; do
  c=$(basename "$(dirname "$(dirname "$f")")")
  apply "$f" "i9:$c" || break
  if grep -q '"status":"applied"' "$f.applied.jsonl" 2>/dev/null && ! late; then
    AGENT_ID=kai-236-item9 node $P/night-audio.cjs "$f"
  fi
  k=$((k+1))
  if [ $k -le 2 ]; then node $T/verify.cjs "$f" || { stop="item 9 readback FAILED on $c (see $f.verify.json); nothing more tonight"; break; }; fi
done
if [ -z "$stop" ]; then
  # 2) item 18 deletes
  for f in $(bysize ops/paid-cleanup-236/item18/*/item18.changeset.jsonl); do apply "$f" "i18:$(basename "$(dirname "$f")")" || break; done
fi
if [ -z "$stop" ]; then
  # 3) item 16: moves, then the gated flips
  for f in $(bysize ops/paid-cleanup-236/item16/*/item16-moves.changeset.jsonl); do
    c=$(dirname "$f"); apply "$f" "i16m:$(basename "$c")" || break
    node $T/gate16.cjs "$c" && [ -f "$c/item16-flips.ready.changeset.jsonl" ] && { apply "$c/item16-flips.ready.changeset.jsonl" "i16f:$(basename "$c")" || break; }
  done
fi
if [ -z "$stop" ]; then
  # 4) item 14 text, then re-record of the side that gained the mark
  for f in $(bysize ops/paid-cleanup-236/item14/*/item14.changeset.jsonl); do
    apply "$f" "i14:$(basename "$(dirname "$f")")" || break
    late || AGENT_ID=kai-236-item14 node $T/audio14.cjs "$f"
  done
fi
# readback of everything applied so far (read-only, script-view)
vb=0; for f in ops/overnight-785/item7-backfill/*/changesets/backfill.changeset.jsonl ops/paid-cleanup-236/item1[468]/*/*.changeset.jsonl; do
  [ -f "$f.applied.jsonl" ] || continue; node $T/verify.cjs "$f" >/dev/null || vb=$((vb+1)); done
echo "=== end $(date -u +%FT%TZ)"
say "[236 night] $(date -u +%F):$report${stop:+ $stop.} Readback: $vb file(s) with a mismatch. Log $LOG"
