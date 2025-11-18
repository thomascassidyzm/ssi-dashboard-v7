#!/bin/bash

# Phase 5: Launch 12 Master Orchestrators
# Opens 12 Claude Code browser tabs and auto-pastes the prompts

echo "🚀 Launching 12 Master Orchestrators for Phase 5"
echo "════════════════════════════════════════════════════════════"
echo ""

PROMPTS_DIR="$(dirname "$0")/phase5_master_prompts"
CLAUDE_CODE_CMD="claude"

if [ ! -d "$PROMPTS_DIR" ]; then
  echo "❌ Prompts directory not found: $PROMPTS_DIR"
  echo "Run: node scripts/phase5_generate_master_prompts.cjs cmn_for_eng"
  exit 1
fi

echo "Opening 12 browser tabs..."
echo ""

for i in {01..12}; do
  PROMPT_FILE="$PROMPTS_DIR/patch_${i}_"*.md

  if [ ! -f $PROMPT_FILE ]; then
    echo "⚠️  Patch $i: Prompt file not found"
    continue
  fi

  echo "📋 Patch $i: $(basename $PROMPT_FILE)"

  # Read the prompt content
  PROMPT_CONTENT=$(cat $PROMPT_FILE)

  # Open Claude Code with the prompt and hit Enter
  # Using echo to pipe the prompt, then Enter key
  osascript <<EOF
    tell application "iTerm"
      create window with default profile
      tell current session of current window
        write text "$CLAUDE_CODE_CMD"
        delay 1
        write text "$(echo "$PROMPT_CONTENT" | sed 's/"/\\"/g' | sed "s/'/\\'/g")"
        delay 0.5
        -- Hit Enter to submit
        keystroke return
      end tell
    end tell
EOF

  # 5 second delay between tabs (critical for reliability)
  sleep 5

done

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ Launched 12 master orchestrators"
echo ""
echo "Each master will:"
echo "  1. Create scaffolds for their patch LEGOs"
echo "  2. Spawn sub-agents (10 baskets each)"
echo "  3. Generate baskets using standard Phase 5"
echo "  4. Save to phase5_outputs/"
echo ""
echo "Monitor progress in each tab!"
echo ""
