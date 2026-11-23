#!/usr/bin/env bash
# ops/overnight-785/kit/second-pass.sh — cs #789·AK: ONE second pass over an item whose renders stopped on a TRANSIENT refusal
# (item 3: GENDER_PREP_MISSING "try again later"; item 2: APPROVAL_UNVERIFIED while the Command Surface restarted 23:14-23:16Z).
# The stored refusal is moved aside (out/audio-refused-pass1.json) so its ask is made once more; a fresh live read + Kai's
# pre-check against the copy holds every seed pass 1 already changed (live no longer matches the copy), so nothing is sent twice.
# Any refusal in this pass ends it. Never looped: one pass per item, by design.
#   usage: second-pass.sh <conv id> <item dir> <course> <item cap> [<item dir> <course> <cap> ...]
set -u
CONV="$1"; shift
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"; cd "$REPO"
KIT=ops/overnight-785/kit/night-kit.cjs; EV="$HOME/ssi-evidence/ssi-dashboard-v7/ops/overnight-785"
export STOP_AT="${STOP_AT:-2026-11-24T06:45:00Z}"
WHY="Kai overnight run #785·AK child A cs #789·AK second pass after transient refusal (Kai Y 23 Nov 11:02Z)"
NIGHT_CAP=80000
wake() { node "$HOME/command-surface/tools/cs-wake-send.cjs" "$CONV" "$CS_CONV_TOKEN" "$1" || true; }
spent_all() { node -e 'const fs=require("fs");let t=0;for(const d of ["item3-por-br","item5-por","item4-kor","item6-jpn-small","item2-jpn-d2"]){const f=`ops/overnight-785/${d}/spend.json`;if(fs.existsSync(f)){const s=JSON.parse(fs.readFileSync(f,"utf8"));t+=(s.cartesia||0)+(s.azure||0)+(s.other||0);}}console.log(t)'; }
while [ $# -ge 3 ]; do
  D="$1" C="$2" CAP="$3"; shift 3
  DIR="ops/overnight-785/$D"; L1="$EV/live-$C-p2a.json"; L2="$EV/live-$C-p2b.json"
  if [ "$(date -u +%s)" -ge "$(date -u -d "$STOP_AT" +%s)" ]; then wake "PASS2 $D: not started, STOP_AT passed"; continue; fi
  # MAX_CHARS is cumulative per item (render counts spend from audio-real.json); keep the night total under 80k
  ITEM=$(node -e 'const s=require(process.argv[1]);console.log((s.cartesia||0)+(s.azure||0)+(s.other||0))' "$REPO/$DIR/spend.json")
  LEFT=$(( NIGHT_CAP - $(spent_all) )); MAXC=$(( ITEM + LEFT )); [ "$MAXC" -gt "$CAP" ] && MAXC="$CAP"
  echo "=== pass 2 $D ($C) max $MAXC $(date -u +%FT%TZ)"
  node -e 'const fs=require("fs"),f=process.argv[1]+"/out/audio-real.json",a=JSON.parse(fs.readFileSync(f,"utf8"));const keep=a.filter(x=>!(x.real&&x.real.code)),drop=a.filter(x=>x.real&&x.real.code);fs.writeFileSync(process.argv[1]+"/out/audio-refused-pass1.json",JSON.stringify(drop,null,1));fs.writeFileSync(f,JSON.stringify(keep,null,1));console.log("refusals moved aside:",drop.length)' "$DIR"
  node $KIT "$DIR" read "$L1" --live-ok "$WHY" || { wake "PASS2 $D: live read FAILED"; continue; }
  node $KIT "$DIR" precheck "$EV/$C.snap.json" "$L1" | cut -c1-400 || { wake "PASS2 $D: precheck crashed"; continue; }
  node $KIT "$DIR" plan "$L1" > "$DIR/out/plan-live-pass2.txt" 2>&1 || { wake "PASS2 $D: plan crashed"; continue; }
  APPLY_CONFIRM=1 MAX_CHARS="$MAXC" node $KIT "$DIR" render "$L1" --live-ok "$WHY"; RC=$?
  APPLY_CONFIRM=1 node $KIT "$DIR" apply "$L1" --live-ok "$WHY"; AC=$?
  APPLY_CONFIRM=1 node $KIT "$DIR" intros "$L1" --live-ok "$WHY"
  node $KIT "$DIR" read "$L2" --live-ok "$WHY" && node $KIT "$DIR" verify "$L2" --live-ok "$WHY"
  V=$(node -e 'const v=require(process.argv[1]);console.log(`${v.ok.length} ok / ${v.bad.length} bad`)' "$REPO/$DIR/out/verify.json" 2>/dev/null || echo "no verify")
  wake "PASS2 $D finished: render exit $RC, apply exit $AC, verify (this pass's plan) $V, item spend $(tr -d '\n ' < $DIR/spend.json | head -c 200)"
done
wake "PASS2 DONE at $(date -u +%FT%TZ); items 2-6 spend $(spent_all)"
