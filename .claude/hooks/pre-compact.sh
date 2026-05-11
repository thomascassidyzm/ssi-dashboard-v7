#!/bin/bash
# PreCompact hook — captures objective session state before context compression
# Output goes to active-projects.md as a "last known state" snapshot

MEMORY_DIR="$HOME/.claude/projects/-Users-kaisaraceno-Documents-GitHub-ssi-dashboard-v7/memory"
ACTIVE_PROJECTS="$MEMORY_DIR/active-projects.md"
REPO_DIR="/Users/kaisaraceno/Documents/GitHub/ssi-dashboard-v7"

# Read hook input from stdin (contains session_id, transcript_path, trigger, etc.)
INPUT=$(cat)
TRIGGER=$(echo "$INPUT" | jq -r '.trigger // "unknown"')
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')

# Capture git state
cd "$REPO_DIR" || exit 0
GIT_STATUS=$(git status --short 2>/dev/null)
GIT_DIFF_STAT=$(git diff --stat 2>/dev/null)
RECENT_COMMITS=$(git log --oneline -5 2>/dev/null)

# Build snapshot block
SNAPSHOT="
## Pre-Compaction Snapshot
- **When**: $TIMESTAMP ($TRIGGER compaction)
- **Uncommitted changes**:
\`\`\`
${GIT_STATUS:-"(clean)"}
\`\`\`
- **Diff summary**:
\`\`\`
${GIT_DIFF_STAT:-"(no changes)"}
\`\`\`
- **Recent commits**:
\`\`\`
$RECENT_COMMITS
\`\`\`
"

# Replace existing snapshot block or append
if grep -q "## Pre-Compaction Snapshot" "$ACTIVE_PROJECTS" 2>/dev/null; then
  # Remove old snapshot (everything from ## Pre-Compaction Snapshot to next ## or EOF)
  sed -i '' '/^## Pre-Compaction Snapshot$/,/^## [^P]/{ /^## [^P]/!d; }' "$ACTIVE_PROJECTS"
  # Append new snapshot at end
  echo "$SNAPSHOT" >> "$ACTIVE_PROJECTS"
else
  echo "$SNAPSHOT" >> "$ACTIVE_PROJECTS"
fi

echo "Pre-compact snapshot saved to active-projects.md"
