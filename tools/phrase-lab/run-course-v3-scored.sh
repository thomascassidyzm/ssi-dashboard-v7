#!/usr/bin/env bash
# GENERATE AND SCORE, SEED-CHUNK BY SEED-CHUNK — never generate everything and
# score at the end. A run cut short by a rate limit, a pool or a window must
# leave behind a COMPLETE, SCORED result for everything it finished, because an
# unscored pile of candidates answers nothing.
#
# Each chunk: generate its baskets with tools/phrase-lab/run-course-v3.cjs (the
# course-builder's own generateLegoPhrases, v3 prompt, Opus, real gates), then
# score each of its seeds with tools/frame-layer/qa-report.cjs --with-live so
# every candidate lands next to the live basket it would replace. Both steps are
# read-only against the database; candidates and scores go to the evidence store.
#
#   SSI_CLAUDE_CONFIG_DIR=$HOME/.cs-accounts/account-5 \
#   tools/phrase-lab/run-course-v3-scored.sh ita_for_eng 1 60 <out-dir> [deadline-epoch]
#
# DEADLINE: no new chunk starts after it. A chunk already running finishes, so
# the last chunk is whole rather than half-scored.
set -u
COURSE="${1:?course}"; FROM="${2:?from seed}"; TO="${3:?to seed}"; OUT="${4:?out dir}"
DEADLINE="${5:-0}"; CHUNK="${CHUNK:-3}"; CONC="${CONC:-3}"
CAND="$OUT/candidates"; SCORES="$OUT/scores"
mkdir -p "$CAND" "$SCORES"
s=$FROM
while [ "$s" -le "$TO" ]; do
  if [ "$DEADLINE" -gt 0 ] && [ "$(date +%s)" -ge "$DEADLINE" ]; then
    echo "=== deadline reached before seed $s — stopping cleanly ==="; break
  fi
  e=$(( s + CHUNK - 1 )); [ "$e" -gt "$TO" ] && e=$TO
  echo "=== CHUNK seeds $s-$e  $(date -u +%H:%M:%SZ) ==="
  node tools/phrase-lab/run-course-v3.cjs "$COURSE" --from "$s" --to "$e" --out "$CAND" --concurrency "$CONC"
  for n in $(seq "$s" "$e"); do
    d="$CAND/seed-$(printf %04d "$n")"
    [ -d "$d" ] || continue
    node tools/frame-layer/qa-report.cjs "$COURSE" --seed "$n" --candidates "$d" --with-live \
      --json "$SCORES/seed-$(printf %04d "$n").json" > "$SCORES/seed-$(printf %04d "$n").txt" 2>&1
    tail -4 "$SCORES/seed-$(printf %04d "$n").txt"
  done
  s=$(( e + 1 ))
done
echo "=== RUN COMPLETE $(date -u +%H:%M:%SZ) ==="
