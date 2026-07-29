#!/usr/bin/env bash
# Afternoon check: did this morning's course-monitor run complete?
# If yes -> quiet macOS notification. If no -> loud notification + a Basecamp note on the Kai board.
# Self-contained (macOS notify + basecamp CLI); no Slack/Claude-account dependency.
export PATH="$HOME/.local/bin:$PATH"
OUTDIR="${COURSE_MONITOR_OUT:-$HOME/Documents/GitHub/ssi-dashboard-v7/temp/course-monitor}"
MARKER="$OUTDIR/LAST_OK"
TODAY="$(date +%Y-%m-%d)"

if [ -f "$MARKER" ] && grep -q "$TODAY" "$MARKER"; then
  osascript -e 'display notification "Ran OK this morning — findings on the Kai Basecamp board." with title "Course Monitor ✓"' 2>/dev/null || true
  exit 0
fi

# Did NOT complete today
osascript -e 'display notification "This morning'\''s run did NOT complete. Check temp/course-monitor logs." with title "Course Monitor ⚠️"' 2>/dev/null || true
BODY="⚠️ The course-monitor did NOT complete this morning (no success marker for ${TODAY}).
Check on the dashboard host: ${OUTDIR}/ — launchd.err, the latest run-*.log, and whether a DEFERRED.flag exists.
Likely causes: Mac asleep/logged-out at 09:00, VPN didn't come up, or the Basecamp token expired (re-run 'basecamp auth login'). Re-run manually: tools/course-monitor/run-daily.sh"
basecamp message --project 43553001 "⚠️ Course Monitor did not run — ${TODAY}" "$BODY" 2>/dev/null || echo "basecamp post failed (token?)"
