#!/usr/bin/env bash
# Nightly read-only course scan runner (cs #237·AL; Kai approved 24 Nov 2026 17:02Z). Fired by
# cs-long-keep-nightly-course-scan.timer (22:20 UTC) from the DURABLE checkout ~/.cs-long/nightly-course-scan/popty, which the
# unit fast-forwards to origin/main first — never a job worktree (cymkor #813 lost its checkout under its timer on 24 Nov).
#   1. waits for the 22:05/22:10 night writers (item4-358, 868-night) to finish, then for <=2 other DB jobs, Popty's load gate
#      governed and not red, and box load < 16 — bounded: if it cannot start by 03:00 UTC (the QA copy is rebuilt at 03:30)
#      it skips the night and Kai's room is told why;
#   2. scans the next 3 queue courses on the nightly QA copy (tools/nightly-course-scan/scan.cjs: local reads only, never live);
#   3. dispatches ONE night worker (parent Kai's room, kind judgement) to hand-check and publish the tables; it advances the queue;
#   4. queue empty -> tells Kai's room and disables its own timer.
# Any non-zero exit fires OnFailure (cs-long-keep-nightly-course-scan-fail.service), which tells Kai's room too.
set -u
D=$HOME/.cs-long/nightly-course-scan
LOG="$D/night-$(date -u +%Y%m%d).log"; exec >>"$LOG" 2>&1
echo "=== start $(date -u +%FT%TZ) $(git rev-parse --short HEAD)"
notice() { node ops/nightly-course-scan/dispatch.cjs notice "$1 (log $LOG)"; }
utc_h() { date -u +%-H; }
too_late() { local h; h=$(utc_h); [ "$h" -ge 3 ] && [ "$h" -lt 22 ]; }
night_writers() { systemctl --user is-active cs-long-keep-item4-358.service cs-long-keep-868-night.service 2>/dev/null | grep -cx 'active\|activating'; }
other_db_jobs() { systemctl --user list-units --state=active --no-legend --plain 'cs-long-*' 2>/dev/null | awk '{print $1}' \
  | grep -E 'a2c|item|apply|night|tiles|relink|render|fill|record' | grep -v 'nightly-course-scan' | wc -l; }
gate_ok() {
  local h; h=$(curl -s -m 20 http://localhost:3470/health)
  echo "$h" | grep -q '"governed":true' || { WHY="Popty /health not governed:true"; return 1; }
  # red guards LIVE learners; this scan reads only the local QA copy, so red holds it back until 00:30 UTC and no later
  if echo "$h" | grep -q '"level":"red"'; then [ "$(date -u +%H%M)" -ge 0030 ] && [ "$(utc_h)" -lt 22 ] && echo "$(date -u +%T) load gate red; going ahead (QA-copy reads only)" || { WHY="Popty load gate level red"; return 1; }; fi
  [ "$(other_db_jobs)" -le 2 ] || { WHY="$(other_db_jobs) other DB jobs running (cap 2)"; return 1; }
  awk '{exit !($1 < 16)}' /proc/loadavg || { WHY="box load $(cut -d' ' -f1 /proc/loadavg)"; return 1; }
  return 0
}

[ "$(date -u +%Y%m%d)" -lt 20261125 ] && { echo "before the first night (Wed 25 Nov): nothing to do"; exit 0; }
# PAUSED AFTER ITALIAN (cs #387·AL, Kai 25 Nov: "If the italian scans don't turn up enough stuff, don't blindly run through
# everything else"). From 26 Nov the runner scans nothing unless $D/CONTINUE exists; the Thu 26 Nov 09:00Z judge
# (cs-long-keep-nightly-scan-judge) touches it if the three Italian tables are BIG. Exit 0, no notice: a paused night is not a
# failure and nobody is nagged. The gate is only checked here at the top, so the 25 Nov run that is still waiting for the
# night writers after midnight UTC finishes. Resume: touch $D/CONTINUE. Pause again: rm $D/CONTINUE.
[ "$(date -u +%Y%m%d)" -ge 20261126 ] && [ ! -e "$D/CONTINUE" ] && { echo "paused after Italian per Kai 25 Nov; touch $D/CONTINUE to resume"; exit 0; }
COURSES=$(node tools/nightly-course-scan/scan.cjs --next 3) || exit 1
if [ -z "$COURSES" ]; then
  notice "[nightly course scan] the queue is finished: every course in ops/nightly-course-scan/queue.json has a published table. Timer disabled."
  systemctl --user disable --now cs-long-keep-nightly-course-scan.timer; exit 0
fi
# the QA copy must be today's (built ~03:40Z); an older copy means the restore failed — scan nothing, say so
age=$(( $(date +%s) - $(date -d "$(node -p "require('$HOME/ssi-restore/copy-state.json').built")" +%s) ))
[ "$age" -lt 108000 ] || { notice "[nightly course scan] skipped tonight: the nightly QA copy is $((age/3600))h old (restore failed?). Courses waiting: $COURSES"; exit 0; }

while [ "$(night_writers)" -gt 0 ]; do too_late && { notice "[nightly course scan] skipped tonight: the 22:05/22:10 night runs were still going at 03:00 UTC. Courses waiting: $COURSES"; exit 0; }; echo "$(date -u +%T) night writers still running"; sleep 300; done
WHY=""
until gate_ok; do too_late && { notice "[nightly course scan] skipped tonight: $WHY at 03:00 UTC. Courses waiting: $COURSES"; exit 0; }; echo "$(date -u +%T) gate: $WHY"; sleep 300; done

echo "$(date -u +%T) scanning: $COURSES"
for c in $COURSES; do
  gate_ok || { echo "gate closed before $c: $WHY"; sleep 120; }
  nice -n 10 node tools/nightly-course-scan/scan.cjs "$c" || { notice "[nightly course scan] FAILED scanning $c"; exit 1; }
done
NIGHT="night $(TZ=Europe/London date +%a\ %-d\ %b)"
node ops/nightly-course-scan/dispatch.cjs worker "$NIGHT" $COURSES || exit 1
echo "=== end $(date -u +%FT%TZ)"
