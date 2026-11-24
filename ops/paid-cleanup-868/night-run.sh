#!/usr/bin/env bash
# cs #868 night runner (Kai's paid-cleanup limbo finish; approved families). Fired by cs-long-keep-868-night.timer
# (22:10 UTC). Runs from the job's own checkout (ledgers <file>.applied.jsonl live beside each changeset there).
#   a) Popty /health must say governed:true; waits while 2+ other DB writers run (cap 3), gives up at 05:30 UK;
#   b) builds kor_for_tam's item-6 changeset once (text + audio.link to clips rendered by day: make-before-break);
#   c) per changeset, in Kai's order (item 6 before item 4): Kai's live pre-check of seed + LEGO text
#      (ops/paid-cleanup-item9/tools/precheck-guards.cjs; mismatch = drift in the ledger, held, never forced), then the
#      governed applier, 25 ops per transaction, never --urgent. 75 = window closed; 1 = stopped on an error;
#   d) wakes the job with the numbers. Token from a 0600 file, never argv.
set -u
W=/home/tomcassidy/.cs-worktrees/ssi-dashboard-v7-clean/868-paid-cleanup-limbo-finish-item5-
D=$HOME/.cs-long/868; LOG="$D/night-$(date -u +%Y%m%d).log"; exec >>"$LOG" 2>&1
SELF=1a7af9ed-9077-4f45-9354-1a5218876914
say() { node "$HOME/command-surface/tools/cs-wake-send.cjs" "$SELF" "$(cat $D/.tok)" "$1"; }
ukh() { TZ=Europe/London date +%-H; }
late() { local h; h=$(ukh); [ "$h" -ge 5 ] && [ "$h" -lt 22 ]; }
echo "=== start $(date -u +%FT%TZ)"; cd "$W" || { say "[868 night] FAILED: checkout missing"; exit 1; }
curl -s -m 20 http://localhost:3470/health | grep -q '"governed":true' || { say "[868 night] skipped: Popty /health not governed:true (log $LOG)"; exit 0; }
writers() { systemctl --user list-units --state=active --no-legend --plain 'cs-long-*' 2>/dev/null | awk '{print $1}' \
  | grep -E 'a2c|item|apply|night|tiles|relink|render|fill' | grep -v '868' | wc -l; }
while [ "$(writers)" -ge 2 ]; do late && { say "[868 night] skipped: $(writers) other DB writers still running at $(ukh)h UK (log $LOG)"; exit 0; }; echo "$(date -u +%T) $(writers) other writers; waiting"; sleep 300; done

T=ops/paid-cleanup-868/item6/kor_for_tam.r868.changeset.jsonl
if [ ! -f "$T" ]; then
  ( cd ops/paid-cleanup-item6-703 && ITEM6_FROM_COPY=1 ITEM6_DATA=$D/item6 python3 apply.py batch kor_for_tam file ) &&
  node ops/paid-cleanup-868/tools/mk-changeset.cjs ops/paid-cleanup-item6-703/applied/kor_for_tam/batch.ops.json "$D/item6/live-kor_for_tam.json" "$T" \
    --id item6-kor_for_tam-r868 --job '#868' --why 'paid cleanup item 6: plain 나/내 in a polite 저/제 course (+ #703 judgement rows), with clips rendered by day' \
    --kai-go 'Kai approved paid-cleanup item 6 on 18 Nov; limbo finish commissioned 23 Nov (cs #868)' &&
  node tools/changeset/apply-changeset.cjs "$T" --check || { say "[868 night] FAILED to build kor_for_tam changeset (log $LOG)"; T=""; }
fi
state() { node ops/paid-cleanup-item9/tools/ledger-state.cjs "$1"; }
report=""; stop=""
for f in $T ops/paid-cleanup-868/item4/eng_for_sin/r868.changeset.jsonl ops/paid-cleanup-868/item4/por_for_eng/r868.changeset.jsonl; do
  [ -f "$f" ] || continue; n=$(basename "$(dirname "$f")")/$(basename "$f")
  read -r l0 a0 < <(state "$f"); [ "$l0" -eq 0 ] && { report="$report $n:done(aside $a0);"; continue; }
  late && { stop="window closing before $n"; break; }
  node ops/paid-cleanup-item9/tools/precheck-guards.cjs "$f" || { stop="PRECHECK could not read live for $n"; break; }
  node tools/changeset/apply-changeset.cjs "$f" --key kai --agent kai-868 --batch 25; rc=$?
  read -r l1 a1 < <(state "$f"); report="$report $n: applied $((l0-l1-(a1-a0))), left $l1, set aside $a1 (exit $rc);"
  [ $rc -eq 75 ] && { stop="quiet hours closed during $n"; break; }
  [ $rc -eq 1 ] && { stop="STOPPED on an error in $n"; break; }
done
echo "=== end $(date -u +%FT%TZ)"
say "[868 night] $(date -u +%F):$report${stop:+ $stop.} Log $LOG"
