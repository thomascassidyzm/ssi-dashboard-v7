#!/bin/bash
# cs #727·AI: fill every course's empty item-5 slots, one course at a time, then wake the job (conv id in $1)
cd "$(dirname "$0")/.." || exit 1; L=fill-727.log; : > $L
for c in fra_ca_for_eng eng_for_fra eng_for_spa eng_for_por eng_for_deu eng_for_ita ara_for_eng ara_lb_for_eng eng_for_ben eng_for_kan eng_for_zho eng_for_sin eng_for_jpn eng_for_tam eng_for_tel; do
  echo "== $c" >> $L; python3 tools/fill.py 40000 $c >> $L 2>&1
done
M="WAKE: item5 fill finished: $(grep -c ' linked |' $L) linked rows; $(grep -c 'STOP' $L) stops; $(tail -1 $L)"
node ~/command-surface/tools/cs-wake-send.cjs "$1" "$CS_CONV_TOKEN" "$M"
