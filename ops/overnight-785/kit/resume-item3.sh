#!/usr/bin/env bash
# ops/overnight-785/kit/resume-item3.sh — cs #789·AK: the first night writer unit was stopped from outside at 22:15:53Z with
# item 3 at batch 6/12 applied. Finish item 3 on the SAME live read (SKIP_BATCHES=<n> keeps the packing identical), then
# intros, fresh read, verify, wake; then hand on to run-night.sh for the remaining items.
#   usage: resume-item3.sh <conv id> <batches already applied> [items after 3...]
set -u
CONV="$1"; SKIP="$2"; shift 2
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"; cd "$REPO"
KIT=ops/overnight-785/kit/night-kit.cjs; EV="$HOME/ssi-evidence/ssi-dashboard-v7/ops/overnight-785"
export STOP_AT="${STOP_AT:-2026-11-24T06:45:00Z}"
WHY="Kai overnight run #785·AK child A cs #789·AK resume item 3 (Kai Y 23 Nov 11:02Z)"
DIR=ops/overnight-785/item3-por-br; L1="$EV/live-por_br_for_eng-1.json"; L2="$EV/live-por_br_for_eng-2.json"
wake() { node "$HOME/command-surface/tools/cs-wake-send.cjs" "$CONV" "$CS_CONV_TOKEN" "$1" || true; }
echo "=== resume item3 from batch $((SKIP+1)) $(date -u +%FT%TZ)"
SKIP_BATCHES="$SKIP" APPLY_CONFIRM=1 node $KIT "$DIR" apply "$L1" --live-ok "$WHY"; AC=$?
echo "apply exit $AC"
APPLY_CONFIRM=1 node $KIT "$DIR" intros "$L1" --live-ok "$WHY"
node $KIT "$DIR" read "$L2" --live-ok "$WHY" && node $KIT "$DIR" verify "$L2" --live-ok "$WHY"
V=$(node -e 'const v=require(process.argv[1]);console.log(`${v.ok.length} ok / ${v.bad.length} bad`)' "$REPO/$DIR/out/verify.json" 2>/dev/null || echo "no verify")
wake "ITEM item3-por-br (resumed) finished: apply exit $AC, verify $V, item spend $(tr -d '\n ' < $DIR/spend.json | head -c 200)"
exec bash ops/overnight-785/kit/run-night.sh "$CONV" "${@:-5 4 6 2}"
