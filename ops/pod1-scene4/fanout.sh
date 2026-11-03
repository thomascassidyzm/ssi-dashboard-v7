#!/usr/bin/env bash
# ops/pod1-scene4/fanout.sh — job #799: run run-course.cjs over every drafted course not yet live, one at a time,
# committing state.json after each; then REVOKE the job799 key and prove it, whatever happened; then wake the job.
# Needs CS_CONV_TOKEN and CS_CONV_ID from an EnvironmentFile (never argv).
set -u
cd "$(dirname "$0")/../.."
STATE=ops/pod1-scene4/state.json
COURSES=$(node -e 'const d=require("./ops/pod1-scene4/drafts.json").drafts;console.log([...new Set(d.map(x=>x.course))].join(" "))')
total=67
progress() { curl -s -m 20 -X POST http://localhost:4317/api/job-progress -H 'Content-Type: application/json' -H "x-cs-conv: $CS_CONV_TOKEN" -d "$(jq -nc --argjson n "$1" --arg note "$2" --argjson t $total '{steps_total:$t,steps_done:$n,note:$note}')" >/dev/null || true; }
for c in $COURSES; do
  st=$(jq -r --arg c "$c" '.[$c].state // ""' "$STATE")
  [ "$st" = "live" ] || [ "$st" = "skipped-welsh" ] && continue
  echo "=== $c $(date -u +%H:%M:%S)"
  timeout 900 node ops/pod1-scene4/run-course.cjs "$c" 2>&1 | grep -v dotenv
  git add "$STATE" && git commit -q -m "ops/pod1-scene4 (#799): $c -> $(jq -r --arg c "$c" '.[$c].state' "$STATE")

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git push -q origin HEAD 2>&1 | grep -v '^remote' || true
  done_n=$(jq '[to_entries[]|select(.key|startswith("_")|not)|select(.value.state=="live")]|length' "$STATE")
  # steps: key(1) + voice(1) + live courses (ita probe included)
  progress $((2 + done_n)) "$c: $(jq -r --arg c "$c" '.[$c].state + " — " + (.[$c].why // "")' "$STATE" | cut -c1-140)"
done
# REVOKE (always) and prove it
sudo -n -u popty rm -f /etc/popty/agent-admin-job799.key
if sudo -n -u popty test -e /etc/popty/agent-admin-job799.key; then REV="REVOKE FAILED: key file still present"; else
  out=$(node tools/agent-admin/call.cjs --key job799 --agent job799-revoke-proof GET /api/admin/canonical-pods 2>&1); rc=$?
  if [ $rc -ne 0 ]; then REV="revoked: key file gone; signed call refused (rc=$rc: $(echo "$out" | tail -1 | cut -c1-120))"; else REV="REVOKE NOT PROVEN: signed call succeeded"; fi
fi
echo "$REV"
jq --arg r "$REV" --arg t "$(date -u +%FT%TZ)" '._key_job799={state:"revoked",why:$r,at:$t}' "$STATE" > "$STATE.tmp" && mv "$STATE.tmp" "$STATE"
git add "$STATE" && git commit -q -m "ops/pod1-scene4 (#799): fan-out ended; job799 key: $REV

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git push -q origin HEAD 2>&1 | grep -v '^remote' || true
SUM=$(jq -r '[to_entries[]|select(.key|startswith("_")|not)|.value.state]|group_by(.)|map("\(.[0]) \(length)")|join(", ")' "$STATE")
node ~/command-surface/tools/cs-wake-send.cjs "$CS_CONV_ID" "$CS_CONV_TOKEN" "WAKE: #799 fan-out finished — $SUM; $REV"
