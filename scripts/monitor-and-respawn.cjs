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

const { spawn } = require('child_process');
require('dotenv').config();

const COURSE_BUILDER_URL = process.env.COURSE_BUILDER_URL || 'http://localhost:3471';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS) || 60000;
const DRY_RUN = process.env.DRY_RUN === 'true';

// Track which courses have active respawn attempts
const respawnInProgress = new Set();

async function checkActivity() {
  try {
    const response = await fetch(`${COURSE_BUILDER_URL}/api/activity`);
    const data = await response.json();

    console.log(`\n[${new Date().toISOString()}] Activity check`);
    console.log(`  Active courses: ${Object.keys(data.courses).length}`);
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

  agent.on('error', (err) => {
    console.error(`  [${courseCode}] Spawn error:`, err.message);
    respawnInProgress.delete(courseCode);
  });

  agent.on('exit', (code) => {
    console.log(`  [${courseCode}] Agent exited with code ${code}`);
    respawnInProgress.delete(courseCode);
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
