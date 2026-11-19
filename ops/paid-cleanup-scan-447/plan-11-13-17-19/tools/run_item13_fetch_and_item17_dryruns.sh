#!/usr/bin/env bash
# cs #784: the slow, serial network steps (Popty answers in 10 s+ under load), run as a systemd user unit so a turn
# ending cannot cut them off. READ-ONLY reads + DRY-RUN posts only (dryrun.py never sends "apply": true).
cd "$(dirname "$0")/.." || exit 1
while read -r c seeds; do python3 -I tools/live_seeds.py "$c" $seeds; done < data/item13-seeds.txt
for c in kor_for_tam zho_for_hin kor_for_hin; do python3 -I tools/dryrun.py item17 "$c" --chunk 100 | cut -c1-300; sleep 2; done
python3 -I tools/dryrun.py item17 eng_for_ben --chunk 100 | cut -c1-300
echo ALL-DONE
