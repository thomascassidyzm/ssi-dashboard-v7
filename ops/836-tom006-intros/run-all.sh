#!/usr/bin/env bash
# Job #836: the 11 courses in order. Stops the whole run on ANY non-zero exit from the tool (refusal, verify/fade failure, worker crash, SIGTERM) or a missing "<course> DONE" marker
# (lane reviews #840/#841: a bare pipe hid a crash behind tee's exit 0 and printed ALL-DONE for a half-finished course).
set -o pipefail
cd "$(dirname "$0")/../.." || exit 1
LOGDIR="${LOGDIR:-/tmp}"
for c in fra_for_eng spa_for_eng spa_mx_for_eng deu_for_eng zho_for_eng ara_for_eng por_for_eng por_br_for_eng kor_for_eng jpn_for_eng ita_for_eng; do
  node tools/audio/tom006-intros-836.cjs --course "$c" --concurrency 3 2>&1 | tee "$LOGDIR/$c.log" | grep -vE 'language-code|debut-practice'
  rc=${PIPESTATUS[0]}
  if [ "$rc" -ne 0 ] || ! grep -q "^$c DONE" "$LOGDIR/$c.log"; then echo "STOPPED on $c (exit $rc)"; exit 2; fi
done
echo ALL-DONE
