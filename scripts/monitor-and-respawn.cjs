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

const { spawn, execSync } = require('child_process');
require('dotenv').config();

const COURSE_BUILDER_URL = process.env.COURSE_BUILDER_URL || 'http://localhost:3471';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS) || 60000;
const DRY_RUN = process.env.DRY_RUN === 'true';
const PROJECT_DIR = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean';

// Track which courses have active respawn attempts
const respawnInProgress = new Set();

/**
 * Check how many headless Claude agents are already running in the project directory.
 * Returns count of background agents (excludes terminal-attached sessions).
 */
function getRunningAgentCount() {
  try {
    // Get all claude PIDs
    const psOutput = execSync('ps aux | grep -i "claude" | grep -v grep | grep -v chrome-native', { encoding: 'utf8' });
    const lines = psOutput.trim().split('\n').filter(Boolean);

    let headlessCount = 0;
    for (const line of lines) {
      const parts = line.split(/\s+/);
      const pid = parts[1];
      const tty = parts[6];

      // Skip terminal-attached sessions (tty like s000, s001, etc.)
      if (tty && tty.match(/^s\d+$/)) continue;

      // Check if this process is working in our project directory
      try {
        const lsofOutput = execSync(`lsof -p ${pid} 2>/dev/null | grep cwd`, { encoding: 'utf8' });
        if (lsofOutput.includes(PROJECT_DIR)) {
          headlessCount++;
        }
      } catch (e) {
        // Process may have exited, skip it
      }
    }

    return headlessCount;
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
    console.log(`  Headless agents running: ${runningAgents}`);
    console.log(`  Stalled: ${data.stalled_count}`);

    if (data.stalled.length > 0) {
      console.log(`  Stalled courses: ${data.stalled.join(', ')}`);

      for (const courseCode of data.stalled) {
        // Don't spawn if already respawning
        if (respawnInProgress.has(courseCode)) {
          console.log(`  [${courseCode}] Respawn already in progress, skipping`);
          continue;
        }

        console.log(`  [${courseCode}] STALLED - spawning new agent...`);
        await spawnAgent(courseCode);
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

async function spawnAgent(courseCode) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would spawn agent for ${courseCode}`);
    return;
  }

  // CRITICAL: Only allow ONE agent at a time to avoid wasting tokens
  const runningAgents = getRunningAgentCount();
  if (runningAgents > 0) {
    console.log(`  [${courseCode}] BLOCKED: ${runningAgents} agent(s) already running - skipping spawn`);
    return;
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

  // Spawn Claude Code agent
  const prompt = `You are resuming the ${courseCode} course build.

IMMEDIATELY run the /course-resume skill to get your context, then continue building seeds autonomously.

Do NOT stop to ask questions. Do NOT wait for approval. Build seeds continuously until the course is complete.

If you encounter validation errors, fix them and continue. If you get stuck on one seed after 3 attempts, skip it and continue with the next.

Your goal is to complete all 668 seeds for this course.`;

  console.log(`  Spawning: claude --model opus for ${courseCode}`);

  const agent = spawn('claude', [
    '--model', 'opus',
    '--dangerously-skip-permissions',
    '-p', prompt
  ], {
    stdio: 'inherit',
    detached: true
  });

  // Register agent with the course-builder API for tracking
  const pid = agent.pid;
  console.log(`  Agent PID: ${pid}`);
  try {
    await fetch(`${COURSE_BUILDER_URL}/api/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid, course_code: courseCode })
    });
    console.log(`  Registered agent ${pid} with course-builder API`);
  } catch (err) {
    console.log(`  Warning: Could not register agent: ${err.message}`);
  }

  agent.on('error', (err) => {
    console.error(`  [${courseCode}] Spawn error:`, err.message);
    respawnInProgress.delete(courseCode);
  });

  agent.on('exit', async (code) => {
    console.log(`  [${courseCode}] Agent ${pid} exited with code ${code}`);
    respawnInProgress.delete(courseCode);
    // Mark agent as complete in the API
    try {
      await fetch(`${COURSE_BUILDER_URL}/api/agents/${pid}/complete`, { method: 'POST' });
    } catch (err) {
      // Ignore - agent may have already been cleaned up
    }
  });

  // Don't wait for agent to finish
  agent.unref();
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
