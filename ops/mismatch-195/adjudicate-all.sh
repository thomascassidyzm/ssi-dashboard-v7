#!/usr/bin/env bash
# adjudicate-all.sh <course>... — as each course's judge run completes (status.py exit 0, or its unit has stopped),
# run the Sonnet second read on it; one course at a time. Bounded to 6 h of waiting. (job #195)
H=$(cd "$(dirname "$0")" && pwd); E=$HOME/ssi-evidence/ssi-dashboard-v7/ops/mismatch-195
left=("$@")
for i in $(seq 1 360); do
  [ ${#left[@]} = 0 ] && exit 0
  next=()
  for C in "${left[@]}"; do c=${C%%_*}
    if python3 $H/status.py $E/units/$C.jsonl $E/runs/$C.jsonl >/dev/null 2>&1 || ! systemctl --user is-active --quiet cs-long-keep-mm195-$c; then
      python3 $H/adjudicate.py $E/units/$C.jsonl $E/runs/$C.jsonl $E/adj/$C.jsonl --model sonnet --min 4 --par 4 >> $E/adj/$C.log 2>&1
    else next+=("$C"); fi
  done
  left=("${next[@]}"); [ ${#left[@]} = 0 ] && exit 0; sleep 60
done
