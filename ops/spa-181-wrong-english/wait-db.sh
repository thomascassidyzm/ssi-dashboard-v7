#!/usr/bin/env bash
# One-shot waker for job #181: retries a single edit-batch DRY RUN (rolled back, writes nothing) every 2 min for ~2 h,
# because spa_for_eng edit-batch kept hitting the 60 s statement timeout while four other spa apply jobs were running.
P="$(dirname "$0")/probe-op.json"
for i in $(seq 1 60); do
  c=$(curl -s -m 70 -o /dev/null -w '%{http_code}' -X POST http://localhost:3470/api/production/spa_for_eng/edit-batch -H 'Content-Type: application/json' -H 'x-agent-id: spa-181-wrong-english (job #181) probe' -d @"$P")
  [ "$c" = 200 ] && { M="WAKE: spa_for_eng edit-batch dry run answers 200 again (attempt $i); retry the #181 text dry run, then apply"; break; }
  sleep 120
done
M=${M:-"TIMED OUT after ~2h: spa_for_eng edit-batch still hitting the statement timeout"}
node ~/command-surface/tools/cs-wake-send.cjs 214ac8ed-30bc-46d2-9dd9-aef3fc32d059 "$CS_CONV_TOKEN" "$M"
