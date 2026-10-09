#!/usr/bin/env bash
# Tom 2026-10-09 14:47Z go ("Yes", job #355): render the audio released from hold for
# the courses that got #924 phrase-v4 rows. Runs each course through the sanctioned
# render-driver (budgeted, dry-run first, spend-guarded; library-first reuse and
# the course cast voices live in phase8 /generate — nothing here picks a voice).
# Idempotent: a course with nothing left to render is a no-op, so a daily re-run
# simply continues from where the daily cap stopped the day before.
#
# THE DAILY CAP IS THIS SCRIPT'S OWN (job #504, 2026-10-09). The ledger's automatic cap is
# 1,000,000/day since Tom's 10-07 "runaway guard" ruling, so it did not stop the 2026-10-09
# run at 300,008 chars; the 260k/day figure is Watson's budget for this release. Before every
# course the script sums the UTC day's ledger (ALL renders, any job, any provider) and gives the
# driver only what is left of DAILY_CAP_CHARS, as a hard per-pass cap (--partial).
#
# EXIT CODE (#375 review): 0 = every course finished or the day's cap was reached cleanly;
# 1 = a driver failed for a reason other than the cap; 2 = bad setup; 3 = ledger unreadable
# (never render blind).
set -u
P=${POPTY_DIR:-/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod}
DAILY_CAP_CHARS=${DAILY_CAP_CHARS:-260000}
MIN_USEFUL_CHARS=${MIN_USEFUL_CHARS:-1500}   # below this a pass is not worth starting
cd "$P" || exit 2
# The driver's ledger snapshot and the spend guard read SUPABASE_* from the environment.
[ -f "$P/.env" ] && { set -a; . "$P/.env"; set +a; }

PSQL_ENV=""
for f in "$HOME/ssi-dashboard-v7-clean/.env.psql" "$HOME/SSi/ssi-dashboard-v7-clean/.env.psql" "$P/.env.psql"; do [ -f "$f" ] && PSQL_ENV=$f && break; done
[ -n "${DATABASE_URL:-}" ] || { [ -n "$PSQL_ENV" ] && { set -a; . "$PSQL_ENV"; set +a; }; }
[ -n "${DATABASE_URL:-}" ] || { echo "no DATABASE_URL — cannot read the spend ledger, refusing to render blind"; exit 3; }

# Chars spent today (UTC) across every provider and caller — failed/reserved calls included, conservatively.
spent_today() {
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -Atc "select coalesce(sum(chars),0) from tts_spend_ledger where kind='call' and at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'" 2>/dev/null
}

# course:budgetChars — budget is the dry-run plan (2026-10-09) plus ~10% headroom, further capped by the day's remainder.
COURSES=${COURSES:-"zho_for_eng:17000 jpn_for_eng:17000 eng_for_por:6500 ita_for_eng:29000 ara_for_eng:42000 kor_for_eng:42000 deu_for_eng:59000 por_for_eng:59000 deu_at_for_eng:67000 eng_for_spa:94000 spa_mx_for_eng:100000 spa_for_eng:107000 por_br_for_eng:123000 eng_for_fra:1000 ara_eg_for_eng:426000 ara_lb_for_eng:419000"}
FAILED=""
for cb in $COURSES; do
  c=${cb%%:*}; b=${cb##*:}
  spent=$(spent_today) || spent=""
  case "$spent" in ''|*[!0-9]*) echo "[$(date -u +%FT%TZ)] ledger unreadable before $c — stopping (never render blind)"; exit 3;; esac
  remaining=$((DAILY_CAP_CHARS - spent))
  if [ "$remaining" -lt "$MIN_USEFUL_CHARS" ]; then
    echo "[$(date -u +%FT%TZ)] daily cap: $spent of $DAILY_CAP_CHARS chars spent today (UTC) — stopping before $c until tomorrow"
    [ -n "$FAILED" ] && { echo "driver failures earlier today:$FAILED"; exit 1; }
    exit 0
  fi
  [ "$b" -gt "$remaining" ] && b=$remaining
  echo "[$(date -u +%FT%TZ)] $c budget=$b (day: $spent/$DAILY_CAP_CHARS)"
  out=$(node tools/render-driver.cjs --course "$c" --budget-chars "$b" --partial --go --max-passes 6 --job '#355' 2>&1); rc=$?
  echo "$out" | grep -E '"event":"(plan|pass|stop)"|render-driver:'
  if [ $rc -ne 0 ]; then
    # A driver stopped by the cap we handed it is not a failure; anything else is.
    after=$(spent_today) || after=0
    if [ $((DAILY_CAP_CHARS - after)) -lt "$MIN_USEFUL_CHARS" ]; then
      echo "[$(date -u +%FT%TZ)] $c stopped at the daily cap ($after/$DAILY_CAP_CHARS) — until tomorrow"
      [ -n "$FAILED" ] && { echo "driver failures earlier today:$FAILED"; exit 1; }
      exit 0
    fi
    echo "[$(date -u +%FT%TZ)] $c FAILED rc=$rc (see above) — continuing to next course"
    FAILED="$FAILED $c"
  fi
done
if [ -n "$FAILED" ]; then echo "[$(date -u +%FT%TZ)] queue pass finished WITH FAILURES:$FAILED"; exit 1; fi
echo "[$(date -u +%FT%TZ)] queue pass complete"
exit 0
