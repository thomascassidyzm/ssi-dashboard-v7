#!/bin/bash
# =============================================================================
# Terminal Cleanup Script for SSi Machine (Remote Mac Server)
# =============================================================================
# Closes iTerm2 windows/tabs where the shell has no running claude process,
# cleans up temp prompt files, and logs memory stats.
#
# Run via PM2 cron (see ecosystem.config.cjs) or manually:
#   bash scripts/cleanup-terminals.sh
#
# Safe: only closes windows where claude is NOT actively running.
# =============================================================================

LOG_PREFIX="[CLEANUP $(date '+%H:%M:%S')]"

echo "$LOG_PREFIX Starting terminal cleanup..."

# ─────────────────────────────────────────────────────────────────────────────
# 1. Count active claude processes (for logging, not killing)
# ─────────────────────────────────────────────────────────────────────────────
ACTIVE_CLAUDE=$(pgrep -f "claude --dangerously-skip-permissions" | wc -l | tr -d ' ')
echo "$LOG_PREFIX Active claude processes: $ACTIVE_CLAUDE"

# ─────────────────────────────────────────────────────────────────────────────
# 2. Close iTerm2 windows/tabs with no running foreground process
#    (i.e., the claude process has exited, leaving a dead shell)
# ─────────────────────────────────────────────────────────────────────────────
CLOSED=0

if pgrep -q iTerm; then
  # Use AppleScript to check each iTerm session and close idle ones
  CLOSED=$(osascript <<'APPLESCRIPT' 2>/dev/null
    set closedCount to 0
    tell application "iTerm"
      repeat with w in windows
        set sessionsToClose to {}
        repeat with t in tabs of w
          repeat with s in sessions of t
            -- Check if session is idle (no job running)
            -- "is at shell prompt" is true when nothing is running
            try
              if (is at shell prompt of s) then
                set end of sessionsToClose to s
              end if
            end try
          end repeat
        end repeat
        -- Close idle sessions
        repeat with s in sessionsToClose
          try
            close s
            set closedCount to closedCount + 1
          end try
        end repeat
      end repeat
    end tell
    return closedCount
APPLESCRIPT
  )
  echo "$LOG_PREFIX Closed $CLOSED idle iTerm session(s)"
else
  echo "$LOG_PREFIX iTerm not running, skipping window cleanup"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 3. Clean up old temp prompt files (older than 1 hour)
# ─────────────────────────────────────────────────────────────────────────────
TEMP_COUNT=$(find /tmp -name "claude_build_*.txt" -mmin +60 2>/dev/null | wc -l | tr -d ' ')
if [ "$TEMP_COUNT" -gt 0 ]; then
  find /tmp -name "claude_build_*.txt" -mmin +60 -delete 2>/dev/null
  echo "$LOG_PREFIX Cleaned $TEMP_COUNT old prompt file(s) from /tmp"
else
  echo "$LOG_PREFIX No old prompt files to clean"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 4. Memory stats
# ─────────────────────────────────────────────────────────────────────────────
# macOS memory pressure (percentage used)
MEM_PRESSURE=$(memory_pressure 2>/dev/null | grep "System-wide memory free percentage" | awk '{print 100-$NF"%"}')
if [ -z "$MEM_PRESSURE" ]; then
  # Fallback: use vm_stat
  FREE_PAGES=$(vm_stat | grep "Pages free" | awk '{print $3}' | tr -d '.')
  INACTIVE_PAGES=$(vm_stat | grep "Pages inactive" | awk '{print $3}' | tr -d '.')
  TOTAL_FREE_MB=$(( (FREE_PAGES + INACTIVE_PAGES) * 4096 / 1048576 ))
  echo "$LOG_PREFIX Memory: ~${TOTAL_FREE_MB}MB free (free+inactive)"
else
  echo "$LOG_PREFIX Memory pressure: $MEM_PRESSURE used"
fi

# Node.js processes memory
NODE_RSS=$(ps aux | grep "[n]ode" | awk '{sum+=$6} END {printf "%.0f", sum/1024}')
echo "$LOG_PREFIX Node.js total RSS: ${NODE_RSS}MB"

# PM2 process count
PM2_COUNT=$(pm2 jlist 2>/dev/null | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "?")
echo "$LOG_PREFIX PM2 managed processes: $PM2_COUNT"

echo "$LOG_PREFIX Cleanup complete (active claude: $ACTIVE_CLAUDE, closed: $CLOSED, temp cleaned: $TEMP_COUNT)"
