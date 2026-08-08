#!/usr/bin/env bash
# course-finish-morning-report — build, publish and deliver the morning report,
# then remove its own cron line.
#
# This exists because "I'll report in the morning" is worth nothing if the
# reporting depends on a chat session that ended hours earlier. It runs
# OUT OF PROCESS, reads only durable state on disk, and delivers itself.
#
# It reports what it can actually see and says so where it cannot. If a band is
# still running at report time it says the band is still running — it never
# waits, never guesses, and never calls an unfinished course finished.
set -uo pipefail

REPO=${FINISH_REPO:-/home/tomcassidy/.finish-run-worktree}
OUT=$REPO/docs/audio-repair-2026-08-08/overnight-report-2026-08-08.md
CONV=14d775d3-80ef-494e-bd8a-d5eaffb498bb
# The conversation token authenticates the surface call. It is machine-local and
# gitignored on purpose — it must never be committed or published.
TOKFILE=/home/tomcassidy/.finish-report-conv-token
TOKEN=$(cat "$TOKFILE" 2>/dev/null)

cd "$REPO" || exit 1
node tools/course-finish-report.cjs > "$OUT" 2>/tmp/finish-report-build.err
if [ ! -s "$OUT" ]; then
  echo "report build produced nothing; see /tmp/finish-report-build.err" >&2
  OUT=/tmp/finish-report-fallback.md
  { echo "# Overnight run — report build FAILED"; echo;
    echo "The report generator produced no output. Raw state follows so nothing is hidden."; echo;
    echo '```'; tail -40 /tmp/finish-shepherd-fra.log 2>/dev/null; echo '---';
    tail -40 /tmp/finish-shepherd-deu.log 2>/dev/null; echo '```'; } > "$OUT"
fi

URL=$(curl -s -X POST http://localhost:4317/api/publish-doc \
  -H 'Content-Type: application/json' -H "x-cs-conv: $TOKEN" \
  -d "{\"path\":\"$OUT\",\"title\":\"French and German — the overnight run\",\"conv_id\":\"$CONV\"}" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin).get("url",""))' 2>/dev/null)

SUMMARY=$(head -40 "$OUT")
python3 - "$CONV" "$URL" "$SUMMARY" <<'PY' 2>/dev/null || true
import json,sys,urllib.request
conv,url,summary=sys.argv[1],sys.argv[2],sys.argv[3]
text=f"[morning report] French and German overnight run — {url}\n\n{summary}"
body=json.dumps({"jobId":conv,"text":text}).encode()
r=urllib.request.Request("http://localhost:4317/api/reply",data=body,
                         headers={"Content-Type":"application/json"})
urllib.request.urlopen(r,timeout=30).read()
PY

# Remove our own cron line — a reporter that fires again tomorrow is noise.
crontab -l 2>/dev/null | grep -v 'course-finish-morning-report.sh' | crontab - 2>/dev/null || true
echo "reported: $URL"
