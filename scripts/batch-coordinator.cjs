/**
 * Batch Coordinator - Sequential 30-Seed Agent Spawner
 *
 * Spawns Claude agents one at a time, each handling ~30 seeds.
 * When an agent completes its batch OR stalls, spawns the next agent.
 *
 * This avoids context compaction issues by keeping each agent's work
 * within the ~200k token window.
 *
 * Usage: node scripts/batch-coordinator.cjs <course_code>
 *
 * Environment:
 *   COURSE_BUILDER_URL - Course Builder API (default: http://localhost:3471)
 *   BATCH_SIZE - Seeds per agent (default: 30)
 *   STALL_THRESHOLD_MS - Stall detection (default: 300000 = 5 minutes)
 *   DRY_RUN - Set to 'true' to log without spawning (default: false)
 */

const { spawn } = require('child_process');
require('dotenv').config();

const COURSE_BUILDER_URL = process.env.COURSE_BUILDER_URL || 'http://localhost:3471';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 30;
const STALL_THRESHOLD_MS = parseInt(process.env.STALL_THRESHOLD_MS) || 5 * 60 * 1000;
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS) || 30000; // Check every 30s
const DRY_RUN = process.env.DRY_RUN === 'true';

// State
let currentAgent = null;
let batchStartSeed = 0;
let batchStartTime = null;
let lastSeenSeed = 0;
let lastProgressTime = null;
let agentCount = 0;

async function getStats(courseCode) {
  try {
    const response = await fetch(`${COURSE_BUILDER_URL}/api/stats/${courseCode}`);
    if (!response.ok) {
      throw new Error(`Stats API returned ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error(`[${timestamp()}] Error fetching stats:`, err.message);
    return null;
  }
}

function timestamp() {
  return new Date().toISOString().substring(11, 19);
}

function spawnAgent(courseCode, targetSeeds) {
  if (DRY_RUN) {
    console.log(`[${timestamp()}] [DRY RUN] Would spawn agent for ${courseCode} (target: ${targetSeeds} seeds)`);
    return null;
  }

  agentCount++;
  const agentId = agentCount;

  const prompt = `You are Agent #${agentId} building seeds for ${courseCode}.

FIRST: Run /course-resume to get your context and starting position.

YOUR MISSION: Build exactly ${BATCH_SIZE} seeds from your starting position, then EXIT.

RULES:
1. Do NOT stop to ask questions - build autonomously
2. Do NOT wait for approval - proceed continuously
3. If validation fails, fix and retry (max 3 attempts per seed, then skip)
4. After completing ${BATCH_SIZE} seeds, say "BATCH COMPLETE" and exit
5. Do NOT continue beyond your ${BATCH_SIZE}-seed quota

The coordinator will spawn a fresh agent to continue after you.`;

  console.log(`[${timestamp()}] Spawning Agent #${agentId} for ${courseCode}`);
  console.log(`  Target: ${BATCH_SIZE} seeds from current position`);

  const agent = spawn('claude', [
    '--model', 'opus',
    '--dangerously-skip-permissions',
    '-p', prompt
  ], {
    stdio: 'inherit',
    detached: false
  });

  agent.on('error', (err) => {
    console.error(`[${timestamp()}] Agent #${agentId} spawn error:`, err.message);
    currentAgent = null;
  });

  agent.on('exit', (code) => {
    console.log(`[${timestamp()}] Agent #${agentId} exited with code ${code}`);
    currentAgent = null;
  });

  return agent;
}

async function checkProgress(courseCode) {
  const stats = await getStats(courseCode);
  if (!stats) return;

  // Use seeds_with_legos (fully processed seeds with LEGOs + phrases)
  const completedSeeds = stats.seeds_with_legos || stats.completed_seeds || 0;
  const totalSeeds = stats.total_seeds || 668;
  const now = Date.now();

  // Course complete?
  if (completedSeeds >= totalSeeds) {
    console.log(`\n[${timestamp()}] ════════════════════════════════════════`);
    console.log(`[${timestamp()}] COURSE COMPLETE: ${courseCode}`);
    console.log(`[${timestamp()}] Total seeds: ${completedSeeds}/${totalSeeds}`);
    console.log(`[${timestamp()}] Total agents used: ${agentCount}`);
    console.log(`[${timestamp()}] ════════════════════════════════════════\n`);
    process.exit(0);
  }

  // No agent running - spawn one
  if (!currentAgent) {
    console.log(`[${timestamp()}] No agent running, spawning new agent...`);
    console.log(`  Current progress: ${completedSeeds}/${totalSeeds} seeds`);

    batchStartSeed = completedSeeds;
    batchStartTime = now;
    lastSeenSeed = completedSeeds;
    lastProgressTime = now;

    currentAgent = spawnAgent(courseCode, BATCH_SIZE);
    return;
  }

  // Agent running - check progress
  const seedsThisBatch = completedSeeds - batchStartSeed;
  const timeSinceProgress = now - lastProgressTime;

  // Progress made?
  if (completedSeeds > lastSeenSeed) {
    console.log(`[${timestamp()}] Progress: ${completedSeeds}/${totalSeeds} (+${completedSeeds - lastSeenSeed} seeds)`);
    lastSeenSeed = completedSeeds;
    lastProgressTime = now;
  }

  // Batch complete?
  if (seedsThisBatch >= BATCH_SIZE) {
    console.log(`[${timestamp()}] Batch complete! Agent built ${seedsThisBatch} seeds.`);
    console.log(`  Waiting for agent to exit naturally...`);
    // Agent should exit on its own after completing batch
    // If it doesn't exit within a reasonable time, we'll detect stall
    return;
  }

  // Stalled?
  if (timeSinceProgress > STALL_THRESHOLD_MS) {
    console.log(`[${timestamp()}] STALL DETECTED - no progress for ${Math.round(timeSinceProgress / 1000)}s`);
    console.log(`  Seeds this batch: ${seedsThisBatch}/${BATCH_SIZE}`);
    console.log(`  Killing stalled agent and spawning fresh one...`);

    if (currentAgent && currentAgent.pid) {
      try {
        process.kill(currentAgent.pid, 'SIGTERM');
      } catch (e) {
        // Process may already be dead
      }
    }
    currentAgent = null;

    // Will spawn new agent on next check
    return;
  }

  // Still working
  const remainingBatch = BATCH_SIZE - seedsThisBatch;
  const stallWarning = timeSinceProgress > STALL_THRESHOLD_MS / 2 ? ' (may be slowing)' : '';
  console.log(`[${timestamp()}] Agent working: ${seedsThisBatch}/${BATCH_SIZE} batch, ${remainingBatch} to go${stallWarning}`);
}

async function main() {
  const courseCode = process.argv[2];

  if (!courseCode) {
    console.error('Usage: node scripts/batch-coordinator.cjs <course_code>');
    console.error('Example: node scripts/batch-coordinator.cjs zho_for_eng');
    process.exit(1);
  }

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Batch Coordinator - Sequential 30-Seed Agent Spawner        ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Course: ${courseCode.padEnd(52)}║`);
  console.log(`║  Batch size: ${BATCH_SIZE} seeds                                       ║`);
  console.log(`║  Stall threshold: ${STALL_THRESHOLD_MS / 1000}s                                        ║`);
  console.log(`║  API: ${COURSE_BUILDER_URL.padEnd(52)}║`);
  console.log(`║  Dry run: ${DRY_RUN}                                              ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // Initial stats
  const stats = await getStats(courseCode);
  if (stats) {
    const completed = stats.seeds_with_legos || stats.completed_seeds || 0;
    console.log(`\nStarting progress: ${completed}/${stats.total_seeds || 668} seeds`);
    console.log(`  (${stats.legos || 0} LEGOs, ${stats.phrases || 0} phrases)`);
  } else {
    console.log('\nWarning: Could not fetch initial stats. Starting anyway...');
  }

  // Start monitoring
  console.log(`\nMonitoring every ${POLL_INTERVAL_MS / 1000}s...\n`);

  // Initial check (will spawn first agent)
  await checkProgress(courseCode);

  // Continuous monitoring
  setInterval(() => checkProgress(courseCode), POLL_INTERVAL_MS);
}

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log(`\n[${timestamp()}] Shutting down coordinator...`);
  if (currentAgent && currentAgent.pid) {
    console.log(`[${timestamp()}] Killing current agent (PID ${currentAgent.pid})...`);
    try {
      process.kill(currentAgent.pid, 'SIGTERM');
    } catch (e) {
      // Process may already be dead
    }
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.emit('SIGINT');
});

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
