#!/usr/bin/env node

const { spawn } = require('child_process');
const missing = require('./missing_baskets_309.json');

const windowCount = 7;
const basketsPerWindow = Math.ceil(missing.length / windowCount);

console.log(`\n🚀 Spawning ${windowCount} browser windows for ${missing.length} baskets\n`);

async function spawnWindow(windowNum, basketIds) {
  const prompt = `# Phase 5 Basket Generation - Window ${windowNum}

**Your task:** Generate practice baskets for ${basketIds.length} LEGOs

**LEGO IDs to process:**
${JSON.stringify(basketIds)}

---

## Instructions

1. **Spawn 9 sub-agents in parallel** using the Task tool
2. **Distribute the ${basketIds.length} LEGO IDs** among the 9 agents (~5 baskets each)
3. **Each sub-agent should:**
   - Read the scaffold for its assigned LEGOs from \`public/vfs/courses/spa_for_eng/phase5_scaffolds/\`
   - Generate baskets following: https://raw.githubusercontent.com/thomascassidyzm/ssi-dashboard-v7/main/public/docs/phase_intelligence/phase_5_lego_baskets.md
   - Save outputs to \`public/vfs/courses/spa_for_eng/phase5_outputs/\`

**Agent distribution example:**
- Agent 1: First 5 LEGO IDs
- Agent 2: Next 5 LEGO IDs
- ...
- Agent 9: Last 4 LEGO IDs

**IMPORTANT:** Each agent must save its results to individual seed files in phase5_outputs/ directory.

---

## Example Agent Prompt

For Agent 1 handling LEGOs S0033L04, S0034L06, S0034L07, S0034L08, S0035L05:

\`\`\`
Your task: Generate baskets for 5 LEGOs: S0033L04, S0034L06, S0034L07, S0034L08, S0035L05

For each LEGO_ID:
1. Read scaffold: public/vfs/courses/spa_for_eng/phase5_scaffolds/seed_SXXXX.json
2. Follow Phase 5 intelligence: https://raw.githubusercontent.com/thomascassidyzm/ssi-dashboard-v7/main/public/docs/phase_intelligence/phase_5_lego_baskets.md
3. Fill in practice_phrases for this LEGO
4. Save to: public/vfs/courses/spa_for_eng/phase5_outputs/seed_SXXXX_baskets.json
\`\`\`

---

## 🚀 NOW: Spawn 9 agents in parallel

Use the Task tool 9 times in a single message.`;

  // Copy to clipboard
  await new Promise((resolve, reject) => {
    const pbcopy = spawn('pbcopy', []);
    pbcopy.stdin.write(prompt);
    pbcopy.stdin.end();
    pbcopy.on('close', (code) => code === 0 ? resolve() : reject());
  });

  // Open Safari with claude.ai/code
  const appleScript = `
tell application "Safari"
    activate
    tell window 1
        set newTab to make new tab with properties {URL:"https://claude.ai/code"}
        set current tab to newTab
    end tell
    delay 3
    tell application "System Events"
        keystroke "v" using command down
        delay 0.5
        keystroke return
    end tell
end tell
`;

  await new Promise((resolve, reject) => {
    const child = spawn('osascript', ['-e', appleScript]);
    child.on('close', (code) => code === 0 ? resolve() : reject());
  });

  console.log(`✅ Window ${windowNum}: ${basketIds.length} baskets`);
}

async function main() {
  for (let w = 0; w < windowCount; w++) {
    const start = w * basketsPerWindow;
    const end = Math.min(start + basketsPerWindow, missing.length);
    const windowBaskets = missing.slice(start, end);

    await spawnWindow(w + 1, windowBaskets);

    if (w < windowCount - 1) {
      console.log(`   Waiting 5 seconds before next window...\n`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log(`\n✅ All ${windowCount} windows spawned!\n`);
}

main().catch(console.error);
