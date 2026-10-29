#!/bin/bash
# Job #551: once Aran's booth has had no take for 20 minutes, rebuild the staging SPA and restart the staging API,
# then report. Never restarts while he is uploading (brief rule: 20 idle minutes, [BoothTake] lines).
cd /home/tomcassidy/wt-staging
idle_ok() {
  last=$(grep -a "\[BoothTake\]" staging-api.log | tail -1 | grep -oE "20[0-9-]+T[0-9:.]+Z")
  [ -z "$last" ] && return 0
  age=$(( $(date +%s) - $(date -d "$last" +%s) ))
  [ "$age" -ge 1200 ]
}
for i in $(seq 1 360); do
  if idle_ok; then
    npx vite build > staging-build.log 2>&1 || { echo "BUILD FAILED"; exit 1; }
    idle_ok || continue
    systemctl --user restart cs-long-keep-staging-api.service
    for j in $(seq 1 60); do curl -sf -o /dev/null http://127.0.0.1:3490/api/recording/voice/human_aran_cym_n && { echo "RESTARTED OK $(date -u +%FT%TZ)"; exit 0; }; sleep 5; done
    echo "RESTARTED BUT API NOT ANSWERING"; exit 2
  fi
  sleep 30
done
echo "TIMED OUT: booth never idle 20 min in 3h"; exit 3
