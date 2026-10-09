#!/usr/bin/env bash
# Tom 2026-10-09 14:47Z go ("Yes", job #355): render the audio released from hold for
# the courses that got #924 phrase-v4 rows. Runs each course through the sanctioned
# render-driver (budgeted, dry-run first, spend-guarded; library-first reuse and
# the course cast voices live in phase8 /generate — nothing here picks a voice).
# Idempotent: a course with nothing left to render is a no-op, so a daily re-run
# simply continues from where the 260k/day cap stopped the day before.
# Stops at the first spend-cap refusal (a refusal is the answer; never retried).
set -u
P=${POPTY_DIR:-/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod}
cd "$P" || exit 2
# course:budgetChars — budget is the dry-run plan (2026-10-09) plus ~10% headroom.
COURSES="zho_for_eng:17000 jpn_for_eng:17000 eng_for_por:6500 ita_for_eng:29000 ara_for_eng:42000 kor_for_eng:42000 deu_for_eng:59000 por_for_eng:59000 deu_at_for_eng:67000 eng_for_spa:94000 spa_mx_for_eng:100000 spa_for_eng:107000 por_br_for_eng:123000 eng_for_fra:1000 ara_eg_for_eng:426000 ara_lb_for_eng:419000"
for cb in $COURSES; do
  c=${cb%%:*}; b=${cb##*:}
  echo "[$(date -u +%FT%TZ)] $c budget=$b"
  out=$(node tools/render-driver.cjs --course "$c" --budget-chars "$b" --go --max-passes 6 --job '#355' 2>&1); rc=$?
  echo "$out" | grep -E '"event":"(plan|pass|stop)"|render-driver:'
  if echo "$out" | grep -qE 'DAILY_TOTAL_CAP|spend-capped|daily cap|ceiling'; then
    echo "[$(date -u +%FT%TZ)] spend cap reached at $c — stopping until tomorrow"; exit 0
  fi
  [ $rc -ne 0 ] && echo "[$(date -u +%FT%TZ)] $c stopped rc=$rc (see above) — continuing to next course"
done
echo "[$(date -u +%FT%TZ)] queue pass complete"
