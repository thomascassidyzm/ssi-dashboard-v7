#!/usr/bin/env bash
# ops/overnight-785/kit/run-night.sh — cs #789·AK, Kai's overnight run #785·AK, the ONE edit writer: items 3 → 5 → 4 → 6 → 2,
# strictly one after another (never two batches at once). Per item: one governed live read → Kai's live pre-check against
# the copy the plan was built on (a moved seed is HELD) → plan on live → renders in learner order (library first, stop on the
# first refusal, item cap and the 80,000-char night cap for items 2-6) → text + clip links in one transaction per batch
# (load gate read before every call) → intros → fresh read → verify. A wake goes to the job after every item.
# No new batch starts after STOP_AT (06:45 UK). Run as: systemd-run --user --unit=cs-long-785-writer ... (see the brief).
#   usage: run-night.sh <conv id> [items...]   (default: 3 5 4 6 2)
set -u
CONV="$1"; shift
ITEMS="${*:-3 5 4 6 2}"
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"; cd "$REPO"
KIT=ops/overnight-785/kit/night-kit.cjs
EV="$HOME/ssi-evidence/ssi-dashboard-v7/ops/overnight-785"
export STOP_AT="${STOP_AT:-2026-11-24T06:45:00Z}"
WHY="Kai overnight run #785·AK child A cs #789·AK (Kai Y 23 Nov 11:02Z)"
NIGHT_CAP=80000
wake() { node "$HOME/command-surface/tools/cs-wake-send.cjs" "$CONV" "$CS_CONV_TOKEN" "$1" || true; }
spent_all() { node -e 'const fs=require("fs");let t=0;for(const d of ["item3-por-br","item5-por","item4-kor","item6-jpn-small","item2-jpn-d2"]){const f=`ops/overnight-785/${d}/spend.json`;if(fs.existsSync(f)){const s=JSON.parse(fs.readFileSync(f,"utf8"));t+=(s.cartesia||0)+(s.azure||0)+(s.other||0);}}console.log(t)'; }
past_stop() { [ "$(date -u +%s)" -ge "$(date -u -d "$STOP_AT" +%s)" ]; }

run_item() { # dir course cap
  local DIR="ops/overnight-785/$1" C="$2" CAP="$3" L1="$EV/live-$2-1.json" L2="$EV/live-$2-2.json"
  local LEFT=$(( NIGHT_CAP - $(spent_all) )); [ "$CAP" -gt "$LEFT" ] && CAP="$LEFT"
  if past_stop; then wake "ITEM $1: not started, STOP_AT $STOP_AT passed"; return 1; fi
  if [ "$CAP" -le 0 ]; then wake "ITEM $1: not started, the 80,000-char night cap for items 2-6 is spent"; return 1; fi
  echo "=== $1 ($C) cap $CAP $(date -u +%FT%TZ)"
  node $KIT "$DIR" read "$L1" --live-ok "$WHY" || { wake "ITEM $1: live read FAILED, item not applied"; return 1; }
  node $KIT "$DIR" precheck "$EV/$C.snap.json" "$L1" || { wake "ITEM $1: precheck crashed, not applied"; return 1; }
  node $KIT "$DIR" plan "$L1" > "$DIR/out/plan-live.txt" 2>&1 || { wake "ITEM $1: plan on live crashed (see out/plan-live.txt), not applied"; return 1; }
  grep -q '^PROBLEM' "$DIR/out/plan-live.txt" && echo "PROBLEM lines in plan-live.txt (held seeds explain them if precheck held them)"
  APPLY_CONFIRM=1 MAX_CHARS="$CAP" node $KIT "$DIR" render "$L1" --live-ok "$WHY"; RC=$?
  echo "render exit $RC"
  APPLY_CONFIRM=1 node $KIT "$DIR" apply "$L1" --live-ok "$WHY"; AC=$?
  echo "apply exit $AC"
  APPLY_CONFIRM=1 node $KIT "$DIR" intros "$L1" --live-ok "$WHY"
  node $KIT "$DIR" read "$L2" --live-ok "$WHY" && node $KIT "$DIR" verify "$L2" --live-ok "$WHY"
  local V; V=$(node -e 'const v=require(process.argv[1]);console.log(`${v.ok.length} ok / ${v.bad.length} bad`)' "$REPO/$DIR/out/verify.json" 2>/dev/null || echo "no verify")
  local H; H=$(node -e 'const p=require(process.argv[1]);console.log(p.heldSeeds.join(",")||"none")' "$REPO/$DIR/out/precheck.json" 2>/dev/null || echo "?")
  wake "ITEM $1 ($C) finished: render exit $RC, apply exit $AC, verify $V, precheck held seeds: $H, item spend $(cat "$DIR/spend.json" 2>/dev/null | tr -d '\n ' | head -c 200)"
}

for I in $ITEMS; do
  case "$I" in
    3) run_item item3-por-br por_br_for_eng 30000 ;;
    5) run_item item5-por por_for_eng 5000 ;;
    4) run_item item4-kor kor_for_eng 1 ;;
    6) run_item item6-jpn-small jpn_for_eng 8000 ;;
    2) P=ops/overnight-785/item2-jpn-d2/plans
       git fetch -q origin main && git checkout -q origin/main -- "$P" 2>/dev/null || true
       SNAP="$EV/eng_for_jpn.snap.json" node ops/overnight-785/kit/item2.cjs copygate $(sed "s|^|$P/|" "$P/READY.txt")
       SNAP="$EV/eng_for_jpn.snap.json" node ops/overnight-785/kit/item2.cjs nightgate $(sed "s|^|$P/|" "$P/READY.txt") --live-ok "$WHY" \
         || { wake "ITEM 2: per-row gate FAILED, item 2 not applied"; continue; }
       run_item item2-jpn-d2 eng_for_jpn 50000 ;;
  esac
done
wake "NIGHT WRITER DONE: items [$ITEMS] finished at $(date -u +%FT%TZ); items 2-6 spend $(spent_all) chars"
