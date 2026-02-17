/**
 * Activity tracking for stall detection and agent management.
 * Stateful: operates on ctx.courseActivity, ctx.agentHeartbeats, ctx.activeAgents.
 */

/**
 * Record activity for a course (called after successful seed submission).
 */
function recordActivity(ctx, courseCode, seedNumber) {
  const existing = ctx.courseActivity.get(courseCode);
  const seedsThisSession = existing ? existing.seedsThisSession + 1 : 1;
  const sessionStartSeed = existing?.sessionStartSeed ?? seedNumber;

  ctx.courseActivity.set(courseCode, {
    lastSubmission: Date.now(),
    lastSeed: seedNumber,
    seedsThisSession,
    sessionStartSeed,
    status: 'active',
  });
}

/**
 * Reset session counter (called when new agent spawns).
 */
function resetSession(ctx, courseCode) {
  const existing = ctx.courseActivity.get(courseCode);
  if (existing) {
    existing.seedsThisSession = 0;
    existing.sessionStartSeed = existing.lastSeed;
  }
}

/**
 * Check if agent should exit for fresh context.
 */
function shouldExitForFreshContext(ctx, courseCode) {
  const activity = ctx.courseActivity.get(courseCode);
  if (!activity) return false;
  return activity.seedsThisSession >= ctx.config.BATCH_SIZE;
}

/**
 * Get stall status for all tracked courses.
 */
function getActivityStatus(ctx) {
  const now = Date.now();
  const result = {};

  for (const [courseCode, activity] of ctx.courseActivity.entries()) {
    const elapsed = now - activity.lastSubmission;
    const stalled = elapsed > ctx.config.STALL_THRESHOLD_MS;
    const shouldExit = activity.seedsThisSession >= ctx.config.BATCH_SIZE;

    result[courseCode] = {
      lastSubmission: new Date(activity.lastSubmission).toISOString(),
      lastSeed: activity.lastSeed,
      seedsThisSession: activity.seedsThisSession || 0,
      sessionStartSeed: activity.sessionStartSeed,
      elapsedMs: elapsed,
      elapsedMinutes: (elapsed / 60000).toFixed(1),
      stalled,
      shouldExit,
      status: stalled ? 'STALLED' : (shouldExit ? 'BATCH_COMPLETE' : 'active'),
    };
  }

  return result;
}

/**
 * Register a spawned agent.
 */
function registerAgent(ctx, pid, courseCode) {
  ctx.activeAgents.set(pid, {
    courseCode,
    spawnedAt: new Date().toISOString(),
    submissions: [],
    status: 'running',
  });
  console.log(`[AGENT] Registered agent ${pid} for ${courseCode}`);
}

/**
 * Record a submission from an agent.
 */
function recordAgentSubmission(ctx, pid, seedNumber) {
  const agent = ctx.activeAgents.get(pid);
  if (agent) {
    agent.submissions.push({ seedNumber, at: new Date().toISOString() });
  }
}

/**
 * Mark an agent as complete.
 */
function markAgentComplete(ctx, pid) {
  const agent = ctx.activeAgents.get(pid);
  if (agent) {
    agent.status = 'complete';
    agent.completedAt = new Date().toISOString();
    console.log(`[AGENT] Agent ${pid} marked complete (${agent.submissions.length} submissions)`);
  }
}

/**
 * Update course activity (called from route handler on submission).
 */
function updateAgentActivity(ctx, courseCode, seedNumber) {
  recordActivity(ctx, courseCode, seedNumber);
}

/**
 * Get all active agents info.
 */
function getActiveAgents(ctx) {
  const result = {};
  for (const [pid, agent] of ctx.activeAgents.entries()) {
    result[pid] = { ...agent };
  }
  return result;
}

/**
 * Start the stall watcher interval.
 */
function startStallWatcher(ctx, respawnCallback) {
  if (ctx.stallWatcherInterval) return;

  ctx.stallWatcherInterval = setInterval(() => {
    checkForStalledCourses(ctx, respawnCallback);
  }, ctx.config.STALL_WATCHER_INTERVAL_MS);

  console.log(`[STALL] Stall watcher started (interval: ${ctx.config.STALL_WATCHER_INTERVAL_MS}ms)`);
}

/**
 * Stop the stall watcher interval.
 */
function stopStallWatcher(ctx) {
  if (ctx.stallWatcherInterval) {
    clearInterval(ctx.stallWatcherInterval);
    ctx.stallWatcherInterval = null;
    console.log('[STALL] Stall watcher stopped');
  }
}

/**
 * Check for stalled courses and trigger respawn if needed.
 */
function checkForStalledCourses(ctx, respawnCallback) {
  const now = Date.now();

  for (const [courseCode, activity] of ctx.courseActivity.entries()) {
    if (activity.status !== 'active') continue;

    const elapsed = now - activity.lastSubmission;
    if (elapsed <= ctx.config.STALL_THRESHOLD_MS) continue;

    // Check respawn count
    const respawnInfo = ctx.courseRespawnCounts.get(courseCode) || { count: 0, lastRespawn: 0 };
    if (respawnInfo.count >= ctx.config.MAX_AUTO_RESPAWNS) {
      console.log(`[STALL] ${courseCode} stalled but max respawns (${ctx.config.MAX_AUTO_RESPAWNS}) reached`);
      continue;
    }

    // Trigger respawn
    console.log(`[STALL] ${courseCode} stalled (${(elapsed / 60000).toFixed(1)}min). Respawn #${respawnInfo.count + 1}`);
    ctx.courseRespawnCounts.set(courseCode, {
      count: respawnInfo.count + 1,
      lastRespawn: now,
    });

    if (respawnCallback) {
      respawnCallback(courseCode, activity.lastSeed);
    }
  }
}

module.exports = {
  recordActivity,
  resetSession,
  shouldExitForFreshContext,
  getActivityStatus,
  registerAgent,
  recordAgentSubmission,
  markAgentComplete,
  updateAgentActivity,
  getActiveAgents,
  startStallWatcher,
  stopStallWatcher,
  checkForStalledCourses,
};
