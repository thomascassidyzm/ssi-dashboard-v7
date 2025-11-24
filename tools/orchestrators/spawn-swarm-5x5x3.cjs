#!/usr/bin/env node

/**
 * Spawn Swarm: 5×5×3 Test
 *
 * Spawns 5 browser windows, each running a master orchestrator
 * that spawns 5 sub-agents, each processing 3 seeds.
 *
 * Total: 5 × 5 × 3 = 75 seeds
 *
 * Usage:
 *   node tools/orchestrators/spawn-swarm-5x5x3.cjs spa_for_eng
 *   node tools/orchestrators/spawn-swarm-5x5x3.cjs cmn_for_eng --api-url http://localhost:3457
 */

const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

// Configuration
const COURSE_CODE = process.argv[2] || 'spa_for_eng';
const API_URL = process.argv.find(a => a.startsWith('--api-url='))?.split('=')[1] || 'http://localhost:3457';
const BROWSER = process.argv.find(a => a.startsWith('--browser='))?.split('=')[1] || 'safari';
const SPAWN_DELAY_MS = 3000; // 3 seconds between browser spawns (reliable timing)

// Language mapping
const LANGUAGE_NAMES = {
  'eng': 'English',
  'spa': 'Spanish',
  'cmn': 'Mandarin Chinese',
  'ita': 'Italian',
  'fra': 'French',
  'deu': 'German',
  'jpn': 'Japanese',
  'kor': 'Korean',
  'por': 'Portuguese',
  'rus': 'Russian',
  'ara': 'Arabic'
};

function getLanguageName(code) {
  return LANGUAGE_NAMES[code.toLowerCase()] || code.toUpperCase();
}

// Parse course code
const [targetLang, , knownLang] = COURSE_CODE.split('_');
const TARGET_LANG_NAME = getLanguageName(targetLang);
const KNOWN_LANG_NAME = getLanguageName(knownLang || 'eng');

console.log(`
╔════════════════════════════════════════════════════════════════╗
║           SWARM SPAWN: 5×5×3 PARALLELIZATION TEST              ║
╠════════════════════════════════════════════════════════════════╣
║  Course:     ${COURSE_CODE.padEnd(46)}║
║  Target:     ${TARGET_LANG_NAME.padEnd(46)}║
║  Known:      ${KNOWN_LANG_NAME.padEnd(46)}║
║  API URL:    ${API_URL.padEnd(46)}║
║                                                                ║
║  Browsers:   5                                                 ║
║  Agents:     5 per browser (25 total)                          ║
║  Seeds:      3 per agent (75 total)                            ║
╚════════════════════════════════════════════════════════════════╝
`);

/**
 * Generate master orchestrator prompt for a browser
 */
function generateMasterPrompt(browserId, seedStart, seedEnd) {
  const seedsPerBrowser = 15;
  const seedsPerAgent = 3;

  // Calculate agent ranges
  const agents = [];
  for (let i = 0; i < 5; i++) {
    const agentStart = seedStart + (i * seedsPerAgent);
    const agentEnd = Math.min(agentStart + seedsPerAgent - 1, seedEnd);
    agents.push({
      id: `${browserId}.${i + 1}`,
      start: agentStart,
      end: agentEnd,
      startPadded: String(agentStart).padStart(4, '0'),
      endPadded: String(agentEnd).padStart(4, '0')
    });
  }

  return `# Browser ${browserId} Master - SPAWN EXACTLY 5 AGENTS

⚠️ YOU ARE BROWSER ${browserId}. YOU SPAWN ONLY AGENTS ${browserId}.1 THROUGH ${browserId}.5. NO OTHER AGENTS.

## Config
- Course: ${COURSE_CODE}
- Known: ${KNOWN_LANG_NAME}
- Target: ${TARGET_LANG_NAME}
- API: ${API_URL}

## YOUR 5 AGENTS (spawn ALL in ONE message)

${agents.map(a => `**Agent ${a.id}**: Seeds S${a.startPadded}-S${a.endPadded}`).join('\n')}

## Sub-Agent Prompt (Use This for ALL 5)

For each agent, use \`subagent_type: "general-purpose"\` and this prompt (change only seed range and agent ID):

\`\`\`markdown
# Phase 1+3 Sub-Agent: {AGENT_ID}

Process 3 seeds for ${COURSE_CODE}: S{START}-S{END}

## Get Seeds
Read: public/vfs/canonical/canonical_seeds.json
Filter seeds {START_NUM} to {END_NUM}. Replace {target} with "${TARGET_LANG_NAME}".

## Rules
- **A-type**: Single word EITHER side = A-type (can't split)
- **M-type**: 2+ words BOTH sides + teaches something unexpected (word order, linking word)
- **NOT M-type**: Trivial concatenation (quiero hablar = just A+A)

## For Each Seed
1. Translate to ${TARGET_LANG_NAME}
2. Extract LEGOs (A-type or M-type with components)
3. All new: true

## Output Format
\\\`\\\`\\\`json
{
  "seed_id": "S00XX",
  "seed_pair": {"known": "...", "target": "..."},
  "legos": [
    {"id": "S00XXL01", "type": "A", "new": true, "lego": {"known": "...", "target": "..."}},
    {"id": "S00XXL02", "type": "M", "new": true, "lego": {"known": "...", "target": "..."},
     "components": [{"known": "...", "target": "..."}], "teaches": "..."}
  ]
}
\\\`\\\`\\\`

## POST Results
After all 3 seeds, POST using Bash:

\\\`\\\`\\\`bash
curl -X POST ${API_URL}/upload-batch \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "course": "${COURSE_CODE}",
    "browserId": ${browserId},
    "agentId": "{AGENT_ID}",
    "seedRange": "S{START}-S{END}",
    "seeds": [/* your 3 seed objects */]
  }'
\\\`\\\`\\\`

Report: "Agent {AGENT_ID} complete: Posted 3 seeds"
\`\`\`

## EXECUTE NOW - EXACTLY 5 TASK CALLS

Use ONE message with EXACTLY 5 Task tool invocations:

1. Task for Agent ${agents[0].id}: S${agents[0].startPadded}-S${agents[0].endPadded}
2. Task for Agent ${agents[1].id}: S${agents[1].startPadded}-S${agents[1].endPadded}
3. Task for Agent ${agents[2].id}: S${agents[2].startPadded}-S${agents[2].endPadded}
4. Task for Agent ${agents[3].id}: S${agents[3].startPadded}-S${agents[3].endPadded}
5. Task for Agent ${agents[4].id}: S${agents[4].startPadded}-S${agents[4].endPadded}

⚠️ DO NOT spawn agents for other browsers. You are Browser ${browserId} ONLY.

**GO!**
`;
}

/**
 * Get macOS application name for browser
 */
function getBrowserAppName(browser) {
  const browserMap = {
    'safari': 'Safari',
    'chrome': 'Google Chrome',
    'brave': 'Brave Browser',
    'arc': 'Arc'
  };
  return browserMap[browser.toLowerCase()] || 'Google Chrome';
}

/**
 * Copy text to clipboard using pbcopy (spawn for reliability)
 */
async function copyToClipboard(text) {
  return new Promise((resolve, reject) => {
    const pbcopy = spawn('pbcopy', [], { stdio: ['pipe', 'inherit', 'inherit'] });
    pbcopy.stdin.write(text);
    pbcopy.stdin.end();
    pbcopy.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pbcopy failed with code ${code}`));
    });
  });
}

/**
 * Open browser TAB with Claude and paste prompt (Phase 5 reliable pattern)
 */
async function spawnBrowserWithPrompt(browserId, prompt) {
  // Copy prompt to clipboard first (reliably via spawn)
  await copyToClipboard(prompt);

  const browserApp = getBrowserAppName(BROWSER);

  // AppleScript using Phase 5 reliable pattern:
  // - Uses tell window 1 (assumes window exists)
  // - Simple delay structure: 3s page load, 0.5s after paste
  const appleScript = `
tell application "${browserApp}"
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

return "success"
  `.trim();

  return new Promise((resolve, reject) => {
    const child = spawn('osascript', ['-e', appleScript], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = '';

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        console.error(`Failed to spawn browser ${browserId}:`, stderr);
        resolve(false);
      }
    });

    child.on('error', (err) => {
      console.error(`Failed to spawn browser ${browserId}:`, err.message);
      resolve(false);
    });
  });
}

/**
 * Main execution
 */
async function main() {
  const browserApp = getBrowserAppName(BROWSER);
  console.log(`Starting swarm spawn using ${browserApp}...\n`);
  console.log(`⚠️  IMPORTANT: Make sure ${browserApp} has at least one window open!\n`);

  // Browser distribution (5 browsers × 15 seeds each = 75 seeds)
  const browsers = [
    { id: 1, seedStart: 1, seedEnd: 15 },
    { id: 2, seedStart: 16, seedEnd: 30 },
    { id: 3, seedStart: 31, seedEnd: 45 },
    { id: 4, seedStart: 46, seedEnd: 60 },
    { id: 5, seedStart: 61, seedEnd: 75 }
  ];

  let successCount = 0;

  for (const browser of browsers) {
    console.log(`\n🌐 Spawning Tab ${browser.id} (S${String(browser.seedStart).padStart(4, '0')}-S${String(browser.seedEnd).padStart(4, '0')})...`);

    const prompt = generateMasterPrompt(browser.id, browser.seedStart, browser.seedEnd);

    // Save prompt for reference
    const promptDir = path.join(__dirname, '../../scripts/swarm-prompts');
    await fs.ensureDir(promptDir);
    await fs.writeFile(
      path.join(promptDir, `browser_${browser.id}_prompt.md`),
      prompt
    );

    // Spawn browser tab (async, waits for completion)
    const success = await spawnBrowserWithPrompt(browser.id, prompt);

    if (success) {
      console.log(`   ✅ Tab ${browser.id} spawned and prompt submitted`);
      successCount++;
    } else {
      console.log(`   ❌ Tab ${browser.id} failed to spawn`);
    }

    // Delay before next tab (let clipboard settle)
    if (browser.id < browsers.length) {
      console.log(`   ⏳ Waiting ${SPAWN_DELAY_MS / 1000}s before next tab...`);
      await new Promise(resolve => setTimeout(resolve, SPAWN_DELAY_MS));
    }
  }

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    SWARM SPAWN COMPLETE                        ║
╠════════════════════════════════════════════════════════════════╣
║  ${successCount}/5 browser tabs spawned successfully                         ║
║  Each will spawn 5 sub-agents                                  ║
║  25 agents processing 75 seeds total                           ║
║                                                                ║
║  Monitor: ${API_URL}/health                            ║
║  Results: public/vfs/courses/${COURSE_CODE}/               ║
║                                                                ║
║  Expected completion: ~5-10 minutes                            ║
╚════════════════════════════════════════════════════════════════╝
`);
}

main().catch(console.error);
