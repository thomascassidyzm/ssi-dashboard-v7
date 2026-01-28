/**
 * Course Builder Monitor & Respawn Service
 *
 * Monitors active courses and spawns new agents when they stall.
 * Run this alongside the dashboard for fully autonomous operation.
 *
 * Usage: node scripts/monitor-and-respawn.cjs
 *
 * Environment:
 *   COURSE_BUILDER_URL - Course Builder API (default: http://localhost:3471)
 *   POLL_INTERVAL_MS - How often to check (default: 60000 = 1 minute)
 *   DRY_RUN - Set to 'true' to log without spawning (default: false)
 */

const { execSync } = require('child_process');
const { spawnClaudeCliAgent } = require('../services/shared/spawn-agent-cli.cjs');
require('dotenv').config();

const COURSE_BUILDER_URL = process.env.COURSE_BUILDER_URL || 'http://localhost:3471';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS) || 60000;
const DRY_RUN = process.env.DRY_RUN === 'true';
const PROJECT_DIR = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean';

// Track which courses have active respawn attempts
const respawnInProgress = new Set();

/**
 * Check how many Claude agents are running in the project directory.
 * Counts ALL agents - both terminal-attached and headless.
 */
function getRunningAgentCount() {
  try {
    // Get all claude PIDs (exclude chrome helper)
    const psOutput = execSync('ps aux | grep -i "claude" | grep -v grep | grep -v chrome-native', { encoding: 'utf8' });
    const lines = psOutput.trim().split('\n').filter(Boolean);

    let agentCount = 0;
    for (const line of lines) {
      const parts = line.split(/\s+/);
      const pid = parts[1];

      // Check if this process is working in our project directory
      try {
        const lsofOutput = execSync(`lsof -p ${pid} 2>/dev/null | grep cwd`, { encoding: 'utf8' });
        if (lsofOutput.includes(PROJECT_DIR)) {
          agentCount++;
        }
      } catch (e) {
        // Process may have exited, skip it
      }
    }

    return agentCount;
  } catch (e) {
    // No claude processes found
    return 0;
  }
}

async function checkActivity() {
  try {
    const response = await fetch(`${COURSE_BUILDER_URL}/api/activity`);
    const data = await response.json();

    const runningAgents = getRunningAgentCount();
    console.log(`\n[${new Date().toISOString()}] Activity check`);
    console.log(`  Active courses: ${Object.keys(data.courses).length}`);
    console.log(`  Claude agents running: ${runningAgents}`);
    console.log(`  Stalled: ${data.stalled_count}`);

    if (data.stalled.length > 0) {
      console.log(`  Stalled courses: ${data.stalled.join(', ')}`);

      for (const courseCode of data.stalled) {
        // Don't spawn if already respawning
        if (respawnInProgress.has(courseCode)) {
          console.log(`  [${courseCode}] Respawn already in progress, skipping`);
          continue;
        }

        // Get stall duration for this course
        const courseData = data.courses[courseCode];
        const stallMinutes = parseFloat(courseData?.elapsedMinutes) || 5;

        console.log(`  [${courseCode}] STALLED (${stallMinutes.toFixed(1)}m) - attempting spawn...`);
        await spawnAgent(courseCode, stallMinutes);
      }
    } else {
      console.log(`  All courses progressing normally`);
    }

    // Log individual course status
    for (const [code, status] of Object.entries(data.courses)) {
      const icon = status.stalled ? '⚠️' : '✓';
      console.log(`    ${icon} ${code}: seed ${status.lastSeed}, ${status.elapsedMinutes}m ago`);
    }

  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error checking activity:`, err.message);
  }
}

async function spawnAgent(courseCode, stallMinutes = 5) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would spawn agent for ${courseCode}`);
    return;
  }

  // Check running agents, but allow override if stalled too long
  const runningAgents = getRunningAgentCount();
  const FORCE_SPAWN_AFTER_MINUTES = 10; // If stalled this long, spawn anyway

  if (runningAgents > 0 && stallMinutes < FORCE_SPAWN_AFTER_MINUTES) {
    console.log(`  [${courseCode}] BLOCKED: ${runningAgents} agent(s) running, stalled only ${stallMinutes}m (need ${FORCE_SPAWN_AFTER_MINUTES}m to force)`);
    return;
  }

  if (runningAgents > 0) {
    console.log(`  [${courseCode}] FORCE SPAWN: Stalled ${stallMinutes}m despite ${runningAgents} agent(s) - they must be idle`);
  }

  respawnInProgress.add(courseCode);

  // Ping the API to reset stall timer
  try {
    await fetch(`${COURSE_BUILDER_URL}/api/activity/${courseCode}/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed_number: 0 })
    });
  } catch (err) {
    console.log(`  Warning: Could not ping activity endpoint: ${err.message}`);
  }

  // Spawn Claude Code agent in iTerm2 window
  const prompt = `You are resuming the ${courseCode} course build.

IMMEDIATELY run the /course-resume skill to get your context, then continue building seeds autonomously.

## CRITICAL: AUTONOMOUS OPERATION

You are running UNATTENDED. The user is AFK (away from keyboard). There is NO ONE to answer questions.

**FORBIDDEN PHRASES - NEVER OUTPUT THESE:**
- "Shall I continue?"
- "Would you like me to..."
- "Should I proceed?"
- "Let me know if..."
- "Do you want me to..."

**REQUIRED BEHAVIOR:**
- If there are incomplete seeds → BUILD THEM
- If you hit an error → FIX IT AND CONTINUE
- If you complete a batch → CONTINUE TO THE NEXT BATCH
- If you're unsure → MAKE A DECISION AND CONTINUE

**STOPPING CONDITIONS (ONLY THESE):**
- All seeds are complete (course finished)
- Unrecoverable error after 3 retries on same seed (skip and continue)

If you encounter validation errors, fix them and continue. If you get stuck on one seed after 3 attempts, skip it and continue with the next.

Your goal is to complete all seeds for this course. DO NOT STOP UNTIL DONE.`;

  console.log(`  Spawning iTerm2 window: claude --model opus for ${courseCode}`);

  try {
    // Use iTerm2 spawner for visible windows
    const result = await spawnClaudeCliAgent(prompt, Date.now() % 1000, {
      model: 'opus',
      workingDir: PROJECT_DIR,
      skipPermissions: true
    });

    console.log(`  [${courseCode}] iTerm2 window opened: ${result.windowId}`);

    // Clear respawn lock after a delay (give agent time to start)
    setTimeout(() => {
      respawnInProgress.delete(courseCode);
    }, 60000); // 1 minute cooldown

  } catch (err) {
    console.error(`  [${courseCode}] Spawn error:`, err.message);
    respawnInProgress.delete(courseCode);
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Course Builder Monitor & Respawn Service                    ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  API: ${COURSE_BUILDER_URL.padEnd(52)}║`);
  console.log(`║  Poll interval: ${(POLL_INTERVAL_MS/1000)}s                                          ║`);
  console.log(`║  Dry run: ${DRY_RUN}                                              ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // Initial check
  await checkActivity();

  // Continuous monitoring
  setInterval(checkActivity, POLL_INTERVAL_MS);
}

main().catch(console.error);
