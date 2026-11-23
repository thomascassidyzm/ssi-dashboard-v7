#!/usr/bin/env bash
# ops/overnight-785/kit/settled-fixes.sh — cs #789·AK, the two settled re-run fixes (ops/overnight-785/rerun-plan.md;
# Kai's Watson 23 Nov ~22:55Z, settled on Kai's behalf). The ONE edit writer: waits until pass 2 has ended.
#  A. item 3 por_br: GENDER_PREP_MISSING repeated on "não estou mais contente" (S0145L01B03). Live pre-check of seed 145
#     (row + LEGO + seed against the copy the plan was built on); then ONE course_gender_expansions row for that exact text,
#     expanded_f = expanded_m = null ("no different form": contente is the same for a man or a woman) through Popty's
#     POST /api/production/por_br_for_eng/edit (dry run, then apply); then one more pass over item 3's held seeds.
#  B. item 5 por seed 26: the seed's target1 clip is a female-form re-record (says "pronta", clip_spoken_text verdict), so
#     Popty refused to link it to the phrase rows (SPOKEN_WORDS_MISMATCH). DROP_PRESET=26:target1 asks /api/audio/render
#     for that seat instead (gender prep gives the seat's form), never forcing the mislabelled clip; then apply seed 26 only.
#   usage: settled-fixes.sh <conv id> [wait unit]
set -u
CONV="$1" WAITU="${2:-}"
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"; cd "$REPO"
KIT=ops/overnight-785/kit/night-kit.cjs; EV="$HOME/ssi-evidence/ssi-dashboard-v7/ops/overnight-785"
export STOP_AT="${STOP_AT:-2026-11-24T06:45:00Z}"
WHY="Kai overnight run #785·AK child A cs #789·AK settled re-run fixes (rerun-plan.md)"
wake() { node "$HOME/command-surface/tools/cs-wake-send.cjs" "$CONV" "$CS_CONV_TOKEN" "$1" || true; }
past() { [ "$(date -u +%s)" -ge "$(date -u -d "$STOP_AT" +%s)" ]; }
green() { for i in $(seq 1 40); do [ "$(curl -s localhost:3470/health | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).dbLoadGate.level)}catch{console.log("?")}})')" = green ] && return 0; sleep 30; done; return 1; }
spent_all() { node -e 'const fs=require("fs");let t=0;for(const d of ["item3-por-br","item5-por","item4-kor","item6-jpn-small","item2-jpn-d2"]){const f=`ops/overnight-785/${d}/spend.json`;if(fs.existsSync(f)){const s=JSON.parse(fs.readFileSync(f,"utf8"));t+=(s.cartesia||0)+(s.azure||0)+(s.other||0);}}console.log(t)'; }
if [ -n "$WAITU" ]; then for i in $(seq 1 1000); do systemctl --user is-active -q "$WAITU" || break; sleep 30; done; fi

# ---- A. item 3
D3=ops/overnight-785/item3-por-br; L="$EV/live-por_br_for_eng-p3a.json"
if past; then wake "SETTLED A item 3: not started, STOP_AT passed"; else
  echo "=== A item 3 gender entry $(date -u +%FT%TZ)"
  node $KIT "$D3" read "$L" --live-ok "$WHY" && node $KIT "$D3" precheck "$EV/por_br_for_eng.snap.json" "$L" | cut -c1-300
  if node -e 'const p=require(process.argv[1]);process.exit(p.heldSeeds.includes(145)?1:0)' "$REPO/$D3/out/precheck.json"; then
    BODY='{"op":"gender.insert","row":{"original_text":"não estou mais contente","language":"por","text_side":"target","expanded_f":null,"expanded_m":null}'
    green && curl -s -X POST localhost:3470/api/production/por_br_for_eng/edit -H 'Content-Type: application/json' -H 'x-agent-id: kai-789' -d "$BODY,\"dryRun\":true}" > "$D3/out/gender-entry-dry.json"
    if grep -q '"ok":true' "$D3/out/gender-entry-dry.json" && green; then
      curl -s -X POST localhost:3470/api/production/por_br_for_eng/edit -H 'Content-Type: application/json' -H 'x-agent-id: kai-789' -d "$BODY}" > "$D3/out/gender-entry-apply.json"
      cat "$D3/out/gender-entry-apply.json" | head -c 600; echo
      if grep -q '"applied":true' "$D3/out/gender-entry-apply.json"; then
        LABEL=PASS3 bash ops/overnight-785/kit/second-pass.sh "$CONV" item3-por-br por_br_for_eng 30000
      else wake "SETTLED A item 3: gender entry NOT applied ($(head -c 200 $D3/out/gender-entry-apply.json)); held seeds stay held"; fi
    else wake "SETTLED A item 3: gender entry dry run not ok or gate not green ($(head -c 200 $D3/out/gender-entry-dry.json)); nothing written"; fi
  else wake "SETTLED A item 3: live pre-check HELD seed 145 (live moved from the plan); no gender entry, nothing written"; fi
fi

# ---- B. item 5 seed 26
D5=ops/overnight-785/item5-por; L1="$EV/live-por_for_eng-p3a.json"; L2="$EV/live-por_for_eng-p3b.json"
if past; then wake "SETTLED B item 5: not started, STOP_AT passed"; exit 0; fi
echo "=== B item 5 seed 26 $(date -u +%FT%TZ)"
export DROP_PRESET=26:target1
node $KIT "$D5" read "$L1" --live-ok "$WHY" || { wake "SETTLED B item 5: live read failed"; exit 0; }
node $KIT "$D5" precheck "$EV/por_for_eng.snap.json" "$L1" | cut -c1-300
if ! node -e 'const p=require(process.argv[1]);process.exit(p.heldSeeds.includes(26)?1:0)' "$REPO/$D5/out/precheck.json"; then wake "SETTLED B item 5: live pre-check HELD seed 26; nothing written"; exit 0; fi
node $KIT "$D5" plan "$L1" > "$D5/out/plan-live-seed26.txt" 2>&1
ITEM=$(node -e 'const s=require(process.argv[1]);console.log((s.cartesia||0)+(s.azure||0)+(s.other||0))' "$REPO/$D5/spend.json")
MAXC=$(( ITEM + 80000 - $(spent_all) )); [ "$MAXC" -gt 5000 ] && MAXC=5000
APPLY_CONFIRM=1 MAX_CHARS="$MAXC" node $KIT "$D5" render "$L1" --live-ok "$WHY"; RC=$?
SEEDS=26 APPLY_CONFIRM=1 node $KIT "$D5" apply "$L1" --live-ok "$WHY"; AC=$?
SEEDS=26 APPLY_CONFIRM=1 node $KIT "$D5" intros "$L1" --live-ok "$WHY"
node $KIT "$D5" read "$L2" --live-ok "$WHY" && node $KIT "$D5" verify "$L2" --live-ok "$WHY"
V=$(node -e 'const v=require(process.argv[1]);console.log(`${v.ok.length} ok / ${v.bad.length} bad`)' "$REPO/$D5/out/verify.json" 2>/dev/null || echo "no verify")
wake "SETTLED B item 5 seed 26 finished: render exit $RC, apply exit $AC, verify $V, item spend $(tr -d '\n ' < $D5/spend.json | head -c 200); items 2-6 total $(spent_all)"
