#!/bin/bash

################################################################################
# Launch Phase 5 Recovery Orchestrators
#
# Automatically detects missing baskets, generates recovery prompts,
# and launches Claude Code browser tabs with orchestrator instructions.
#
# Usage:
#   ./scripts/launch_phase5_recovery.sh <course_code>
#
# Example:
#   ./scripts/launch_phase5_recovery.sh cmn_for_eng
#
# Process:
#   1. Detects missing baskets from GitHub branches
#   2. Generates recovery orchestrator prompts (12 windows)
#   3. Launches Safari tabs with Claude Code
#   4. Copies prompts to clipboard for pasting
#
################################################################################

set -e

COURSE_CODE="$1"

if [ -z "$COURSE_CODE" ]; then
  echo "Usage: ./scripts/launch_phase5_recovery.sh <course_code>"
  echo "Example: ./scripts/launch_phase5_recovery.sh cmn_for_eng"
  exit 1
fi

echo "═══════════════════════════════════════════════════════════"
echo "PHASE 5 RECOVERY - AUTOMATED LAUNCH"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Course: $COURSE_CODE"
echo ""

# Step 1: Detect missing baskets
echo "Step 1: Detecting missing baskets..."
node scripts/detect_missing_baskets.cjs "$COURSE_CODE"

# Check if there are missing seeds
if [ ! -f "missing_seeds.json" ]; then
  echo "❌ Error: missing_seeds.json not created"
  exit 1
fi

MISSING_COUNT=$(node -e "console.log(require('./missing_seeds.json').missing_count)")

if [ "$MISSING_COUNT" -eq 0 ]; then
  echo ""
  echo "✅ No missing baskets - nothing to recover!"
  exit 0
fi

echo ""
echo "Found $MISSING_COUNT missing seeds"
echo ""

# Step 2: Generate recovery prompts
echo "Step 2: Generating recovery prompts..."
node scripts/generate_recovery_prompts.cjs "$COURSE_CODE"

# Step 3: Count generated prompts
PROMPT_DIR=".claude/recovery_prompts"
PROMPT_COUNT=$(ls -1 "$PROMPT_DIR"/window_*.md 2>/dev/null | wc -l | tr -d ' ')

if [ "$PROMPT_COUNT" -eq 0 ]; then
  echo "❌ Error: No prompts generated"
  exit 1
fi

echo ""
echo "Generated $PROMPT_COUNT orchestrator prompts"
echo ""

# Step 4: Launch Safari tabs with prompts
echo "Step 3: Launching Claude Code in Safari with prompts..."
echo ""
echo "Opening $PROMPT_COUNT tabs (5 second delay between each)..."
echo ""

# Launch tabs one by one with prompts
for ((i=1; i<=PROMPT_COUNT; i++)); do
  WINDOW_NUM=$(printf "%02d" $i)
  PROMPT_FILE=".claude/recovery_prompts/window_$WINDOW_NUM.md"

  echo "Tab $i: Loading window_$WINDOW_NUM.md..."

  # Copy prompt to clipboard
  cat "$PROMPT_FILE" | pbcopy

  if [ $i -eq 1 ]; then
    # First tab - create new window
    osascript <<EOF
tell application "Safari"
  activate
  make new document
  set URL of document 1 to "https://claude.ai/code"
  delay 5

  -- Paste the prompt
  tell application "System Events"
    keystroke "v" using command down
  end tell
end tell
EOF
  else
    # Additional tabs
    osascript <<EOF
tell application "Safari"
  activate
  tell window 1
    make new tab at end of tabs
    set current tab to last tab
    set URL of current tab to "https://claude.ai/code"
  end tell
  delay 5

  -- Paste the prompt
  tell application "System Events"
    keystroke "v" using command down
  end tell
end tell
EOF
  fi

  echo "   ✅ Pasted prompt for window $WINDOW_NUM"

  # 5 second delay before next tab (except after last one)
  if [ $i -lt $PROMPT_COUNT ]; then
    sleep 5
  fi
done

echo ""
echo "✅ Launched $PROMPT_COUNT Safari tabs"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "NEXT STEPS"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "1. Wait for all Claude Code tabs to load"
echo "2. In each tab, paste the corresponding prompt:"
echo ""

for ((i=1; i<=PROMPT_COUNT; i++)); do
  WINDOW_NUM=$(printf "%02d" $i)
  echo "   Tab $i: .claude/recovery_prompts/window_$WINDOW_NUM.md"
done

echo ""
echo "3. Replace {SESSION_ID} in each prompt with that tab's session ID"
echo "4. Let the orchestrators run"
echo ""
echo "Tip: Use 'cat .claude/recovery_prompts/window_01.md | pbcopy' to copy prompts"
echo ""
