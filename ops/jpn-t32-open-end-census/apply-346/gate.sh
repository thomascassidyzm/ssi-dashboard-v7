#!/usr/bin/env bash
# cs #346·AL: wait until Popty's DB load gate is governed+green and fewer than 3 OTHER DB writers run (Kai's 3-writer rule).
# Writers counted (active services only; timers that are merely waiting do not write): the jpn/kor rebuild (#338), the
# cym_for_kor chain (#251), item-4/868/236 night appliers. Prints the state; exit 0 = go. Re-checks every 2 min, max 2 h.
WRITER_RE='^cs-long-keep-(338-|251-chain|868-|item4-358|236-night|234-)'
others() { systemctl --user list-units 'cs-long-*' --type=service --state=active --no-legend --plain | awk '{print $1}' | grep -cE "$WRITER_RE"; }
for i in $(seq 1 60); do
  H=$(curl -s -m 10 http://localhost:3470/health)
  gov=$(echo "$H" | grep -o '"governed":true' | head -1); lvl=$(echo "$H" | grep -o '"level":"[a-z]*"' | head -1)
  n=$(others)
  echo "$(date -u +%FT%TZ) governed=${gov:+y} $lvl other_writers=$n"
  [ -n "$gov" ] && [ "$lvl" = '"level":"green"' ] && [ "$n" -lt 3 ] && exit 0
  sleep 120
done
exit 1
