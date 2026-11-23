#!/usr/bin/env bash
# ops/overnight-785/kit/resume-apply.sh — cs #789·AK: finish an item whose apply stopped part-way, on the SAME live read
# (packing identical): skip the first <n> committed batches, hold <seeds> refused at apply time (never forced), then intros,
# fresh read, verify, wake. Waits (bounded) for the night writer unit to finish first so there is only ever ONE edit writer.
#   usage: resume-apply.sh <conv id> <item dir> <course> <batches already applied> <hold seeds csv> [wait unit]
set -u
CONV="$1" D="$2" C="$3" SKIP="$4" HOLD="$5" WAITU="${6:-}"
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"; cd "$REPO"
KIT=ops/overnight-785/kit/night-kit.cjs; EV="$HOME/ssi-evidence/ssi-dashboard-v7/ops/overnight-785"
export STOP_AT="${STOP_AT:-2026-11-24T06:45:00Z}"
WHY="Kai overnight run #785·AK child A cs #789·AK resume $D (Kai Y 23 Nov 11:02Z)"
DIR="ops/overnight-785/$D"; L1="$EV/live-$C-1.json"; L2="$EV/live-$C-2.json"
wake() { node "$HOME/command-surface/tools/cs-wake-send.cjs" "$CONV" "$CS_CONV_TOKEN" "$1" || true; }
if [ -n "$WAITU" ]; then for i in $(seq 1 1000); do systemctl --user is-active -q "$WAITU" || break; sleep 30; done; fi
if [ "$(date -u +%s)" -ge "$(date -u -d "$STOP_AT" +%s)" ]; then wake "RESUME $D: not started, STOP_AT passed"; exit 0; fi
echo "=== resume $D from batch $((SKIP+1)), hold $HOLD $(date -u +%FT%TZ)"
SKIP_BATCHES="$SKIP" HOLD_SEEDS="$HOLD" APPLY_CONFIRM=1 node $KIT "$DIR" apply "$L1" --live-ok "$WHY"; AC=$?
echo "apply exit $AC"
APPLY_CONFIRM=1 node $KIT "$DIR" intros "$L1" --live-ok "$WHY"
node $KIT "$DIR" read "$L2" --live-ok "$WHY" && node $KIT "$DIR" verify "$L2" --live-ok "$WHY"
V=$(node -e 'const v=require(process.argv[1]);console.log(`${v.ok.length} ok / ${v.bad.length} bad`)' "$REPO/$DIR/out/verify.json" 2>/dev/null || echo "no verify")
wake "RESUME $D finished: apply exit $AC, verify $V, held $HOLD, item spend $(tr -d '\n ' < $DIR/spend.json | head -c 200)"
