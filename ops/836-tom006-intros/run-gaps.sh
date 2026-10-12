#!/usr/bin/env bash
# Job #836: the is_new LEGOs that had no intro clip, the courses that have any. Same stop rules as run-all.sh.
set -o pipefail
cd "$(dirname "$0")/../.." || exit 1
LOGDIR="${LOGDIR:-/tmp}"
for c in fra_for_eng spa_for_eng spa_mx_for_eng deu_for_eng zho_for_eng ara_for_eng por_br_for_eng kor_for_eng; do
  node tools/audio/tom006-intros-836.cjs --course "$c" --gaps --concurrency 2 2>&1 | tee "$LOGDIR/$c-gaps.log" | grep -vE 'language-code|debut-practice'
  rc=${PIPESTATUS[0]}
  if [ "$rc" -ne 0 ] || ! grep -q "^$c DONE" "$LOGDIR/$c-gaps.log"; then echo "STOPPED on $c (exit $rc)"; exit 2; fi
done
echo GAPS-DONE
