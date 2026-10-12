#!/usr/bin/env bash
# Job #836: the 11 courses in order, one after another; a REFUSED / VERIFY FAILED / FADE FAILED line in any course stops the whole run (a refusal is an answer, never routed around).
cd "$(dirname "$0")/../.." || exit 1
for c in fra_for_eng spa_for_eng spa_mx_for_eng deu_for_eng zho_for_eng ara_for_eng por_for_eng por_br_for_eng kor_for_eng jpn_for_eng ita_for_eng; do
  node tools/audio/tom006-intros-836.cjs --course "$c" --concurrency 3 2>&1 | tee "${LOGDIR:-/tmp}/$c.log" | grep -vE 'language-code|debut-practice'
  if grep -qE 'REFUSED|VERIFY FAILED|FADE FAILED' "${LOGDIR:-/tmp}/$c.log"; then echo "STOPPED on $c"; exit 2; fi
done
echo ALL-DONE
