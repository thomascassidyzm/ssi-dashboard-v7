#!/usr/bin/env node

const { spawn } = require('child_process');
const missing = require('./missing_baskets_228.json');

// Configuration
const MASTER_WINDOWS = 8;
const AGENTS_PER_WINDOW = 10;
const BASKETS_PER_AGENT = 3;

const basketsPerWindow = AGENTS_PER_WINDOW * BASKETS_PER_AGENT; // 30 baskets per window
const totalAssigned = MASTER_WINDOWS * basketsPerWindow; // 240 baskets
const leftover = missing.slice(totalAssigned); // Remaining for window 9

console.log(`\n🚀 Phase 5 Basket Generation - Clear Distribution\n`);
console.log(`   Total missing baskets: ${missing.length}`);
console.log(`   Master windows: ${MASTER_WINDOWS} (30 baskets each)`);
console.log(`   Window 9 (leftover): ${leftover.length} baskets`);
console.log(`   Agents per window: ${AGENTS_PER_WINDOW}`);
console.log(`   Baskets per agent: ${BASKETS_PER_AGENT}\n`);

async function spawnWindow(windowNum, basketIds) {
  const isLeftoverWindow = windowNum === 9;
  const agentCount = isLeftoverWindow
    ? Math.ceil(basketIds.length / BASKETS_PER_AGENT)
    : AGENTS_PER_WINDOW;

  const prompt = `# Phase 5 Basket Generation - Window ${windowNum}${isLeftoverWindow ? ' (LEFTOVER)' : ''}

**Your task:** Generate practice baskets for **${basketIds.length} LEGOs**

---

## 📋 LEGO IDs to Process

${JSON.stringify(basketIds, null, 2)}

---

## 🎯 Clear Instructions

You are the **Master Agent** for this window. Your job:

1. **Spawn ${agentCount} sub-agents in parallel** using the Task tool
2. **Distribute the ${basketIds.length} LEGO IDs equally** among the ${agentCount} agents (~${BASKETS_PER_AGENT} baskets each)
3. Each sub-agent generates baskets independently

---

## 📊 Agent Distribution

${Array.from({ length: agentCount }, (_, i) => {
  const start = i * BASKETS_PER_AGENT;
  const end = Math.min(start + BASKETS_PER_AGENT, basketIds.length);
  const agentBaskets = basketIds.slice(start, end);
  return `**Agent ${i + 1}:** ${agentBaskets.join(', ')} (${agentBaskets.length} baskets)`;
}).join('\n')}

---

## 🤖 Sub-Agent Instructions

Each sub-agent should:

1. **Read scaffolds** from \`public/vfs/courses/spa_for_eng/phase5_scaffolds/\`
2. **Follow Phase 5 intelligence**: https://raw.githubusercontent.com/thomascassidyzm/ssi-dashboard-v7/main/public/docs/phase_intelligence/phase_5_lego_baskets.md
3. **Generate baskets** with natural grammar and GATE compliance
4. **Save outputs** to \`public/vfs/courses/spa_for_eng/phase5_outputs/\`

---

## ⚠️ Critical Requirements

- **GATE compliance**: Only use available vocabulary (recent seeds + current seed's earlier LEGOs + current LEGO)
- **Natural grammar**: Both English and Spanish must sound natural
- **Quality over quantity**: Early seeds (S0001-S0020) can have fewer phrases if vocabulary is limited
- **Save format**: Each seed file saved as \`seed_sXXXX.json\` in phase5_outputs/

---

## 🚀 NOW: Spawn ${agentCount} agents in parallel

Use the Task tool ${agentCount} times in a single message, distributing the LEGO IDs as shown above.`;

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

  console.log(`✅ Window ${windowNum}: ${basketIds.length} baskets → ${agentCount} agents × ${BASKETS_PER_AGENT} baskets each`);
}

async function main() {
  // Spawn 8 master windows
  for (let w = 0; w < MASTER_WINDOWS; w++) {
    const start = w * basketsPerWindow;
    const end = start + basketsPerWindow;
    const windowBaskets = missing.slice(start, end);

    await spawnWindow(w + 1, windowBaskets);

    if (w < MASTER_WINDOWS - 1) {
      console.log(`   Waiting 8 seconds before next window...\n`);
      await new Promise(resolve => setTimeout(resolve, 8000));
    }
  }

  // Spawn window 9 for leftovers
  if (leftover.length > 0) {
    console.log(`\n   Waiting 8 seconds before leftover window...\n`);
    await new Promise(resolve => setTimeout(resolve, 8000));
    await spawnWindow(9, leftover);
  }

  console.log(`\n✅ All windows spawned!\n`);
  console.log(`   Windows 1-8: 30 baskets each (240 total)`);
  console.log(`   Window 9: ${leftover.length} baskets (leftover)`);
  console.log(`   Total: ${missing.length} baskets\n`);
}

main().catch(console.error);
