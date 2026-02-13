/**
 * Activity / heartbeat / agent-management routes.
 *
 * Mounted by the parent app at /api, so all paths here omit that prefix.
 * Every handler receives shared state through the `ctx` object supplied
 * by the factory function.
 */

const { Router } = require('express');
const {
  recordActivity,
  resetSession,
  getActivityStatus,
  registerAgent,
  recordAgentSubmission,
  markAgentComplete,
  getActiveAgents,
} = require('../lib/activity-tracker.cjs');

module.exports = function activityRoutes(ctx) {
  const router = Router();

  // ---------------------------------------------------------------------------
  // GET /activity - Activity status for all courses (stall detection)
  // ---------------------------------------------------------------------------
  router.get('/activity', async (req, res) => {
    const activity = getActivityStatus(ctx);

    // Cross-check with database: only include courses with active jobs
    let activeCourseCodes = new Set();
    try {
      const { data: activeJobs } = await ctx.supabase
        .from('build_jobs')
        .select('course_code')
        .in('status', ['running', 'stalled']);
      if (activeJobs) {
        activeCourseCodes = new Set(activeJobs.map(j => j.course_code));
      }
    } catch (err) {
      console.error('[ACTIVITY] Failed to check active jobs in DB:', err.message);
      // If DB check fails, fall back to in-memory only
      activeCourseCodes = new Set(Object.keys(activity));
    }

    // Filter activity to only include courses with active jobs in database
    const filteredActivity = {};
    for (const [code, status] of Object.entries(activity)) {
      if (activeCourseCodes.has(code)) {
        filteredActivity[code] = status;
      } else {
        // Clean up stale in-memory entry
        ctx.courseActivity.delete(code);
        ctx.agentHeartbeats.delete(code);
      }
    }

    const stalledCourses = Object.entries(filteredActivity)
      .filter(([_, status]) => status.stalled)
      .map(([code, _]) => code);

    // getActiveAgents returns an object keyed by pid; convert to array
    const agentsObj = getActiveAgents(ctx);
    const agentsList = Object.entries(agentsObj).map(([pid, a]) => ({ pid: Number(pid), ...a }));
    const runningAgents = agentsList.filter(a => a.status === 'running');

    res.json({
      courses: filteredActivity,
      stalled: stalledCourses,
      stalled_count: stalledCourses.length,
      threshold_minutes: ctx.config.STALL_THRESHOLD_MS / 60000,
      agents: {
        running: runningAgents,
        running_count: runningAgents.length,
        total_tracked: agentsList.length,
      },
      message: stalledCourses.length > 0
        ? `${stalledCourses.length} course(s) stalled - spawn new agents with /course-resume`
        : 'All active courses are progressing normally',
    });
  });

  // ---------------------------------------------------------------------------
  // POST /activity/:courseCode/ping - Mark course as active (reset stall timer)
  // ---------------------------------------------------------------------------
  router.post('/activity/:courseCode/ping', (req, res) => {
    const { courseCode } = req.params;
    const seedNumber = req.body?.seed_number || 0;

    recordActivity(ctx, courseCode, seedNumber);

    res.json({
      ok: true,
      course_code: courseCode,
      message: 'Activity recorded - stall timer reset',
    });
  });

  // ---------------------------------------------------------------------------
  // POST /activity/:courseCode/reset-session - Reset session counter for new agent
  // ---------------------------------------------------------------------------
  router.post('/activity/:courseCode/reset-session', (req, res) => {
    const { courseCode } = req.params;

    resetSession(ctx, courseCode);

    const activity = ctx.courseActivity.get(courseCode);
    res.json({
      ok: true,
      course_code: courseCode,
      seeds_this_session: activity?.seedsThisSession || 0,
      batch_size: ctx.config.BATCH_SIZE,
      message: 'Session counter reset - new agent can work for ' + ctx.config.BATCH_SIZE + ' seeds',
    });
  });

  // ---------------------------------------------------------------------------
  // POST /heartbeat/:courseCode - Agent heartbeat (liveness tracking)
  // ---------------------------------------------------------------------------
  router.post('/heartbeat/:courseCode', (req, res) => {
    const { courseCode } = req.params;
    const { agent_id, status, current_seed } = req.body;

    const now = Date.now();
    const existing = ctx.agentHeartbeats.get(courseCode);

    ctx.agentHeartbeats.set(courseCode, {
      lastHeartbeat: now,
      agentId: agent_id || existing?.agentId || 'unknown',
      status: status || 'working',
      currentSeed: current_seed || existing?.currentSeed || null,
      startedAt: existing?.startedAt || now,
    });

    console.log(`[HEARTBEAT] ${courseCode}: agent=${agent_id || 'unknown'} status=${status || 'working'} seed=${current_seed || '?'}`);

    res.json({
      ok: true,
      course_code: courseCode,
      heartbeat_interval_ms: 60000,
      timeout_ms: ctx.config.HEARTBEAT_TIMEOUT_MS,
      message: 'Heartbeat received',
    });
  });

  // ---------------------------------------------------------------------------
  // GET /heartbeats - All active heartbeats
  // ---------------------------------------------------------------------------
  router.get('/heartbeats', (req, res) => {
    const now = Date.now();
    const heartbeats = [];

    for (const [courseCode, hb] of ctx.agentHeartbeats.entries()) {
      const elapsed = now - hb.lastHeartbeat;
      const isAlive = elapsed < ctx.config.HEARTBEAT_TIMEOUT_MS;

      heartbeats.push({
        course_code: courseCode,
        agent_id: hb.agentId,
        status: hb.status,
        current_seed: hb.currentSeed,
        last_heartbeat: new Date(hb.lastHeartbeat).toISOString(),
        elapsed_ms: elapsed,
        is_alive: isAlive,
        started_at: new Date(hb.startedAt).toISOString(),
      });
    }

    res.json({
      active_agents: heartbeats.filter(h => h.is_alive).length,
      heartbeats,
    });
  });

  // ---------------------------------------------------------------------------
  // POST /agents/register - Register a new agent (called by monitor on spawn)
  // ---------------------------------------------------------------------------
  router.post('/agents/register', (req, res) => {
    const { pid, course_code } = req.body;
    if (!pid || !course_code) {
      return res.status(400).json({ ok: false, error: 'pid and course_code required' });
    }
    registerAgent(ctx, Number(pid), course_code);
    res.json({ ok: true, message: `Agent ${pid} registered for ${course_code}` });
  });

  // ---------------------------------------------------------------------------
  // POST /agents/:pid/submission - Record a submission from an agent
  // ---------------------------------------------------------------------------
  router.post('/agents/:pid/submission', (req, res) => {
    const pid = Number(req.params.pid);
    const { seed_number } = req.body;
    recordAgentSubmission(ctx, pid, seed_number);
    res.json({ ok: true });
  });

  // ---------------------------------------------------------------------------
  // POST /agents/:pid/complete - Mark an agent as completed
  // ---------------------------------------------------------------------------
  router.post('/agents/:pid/complete', (req, res) => {
    const pid = Number(req.params.pid);
    markAgentComplete(ctx, pid);
    res.json({ ok: true, message: `Agent ${pid} marked complete` });
  });

  // ---------------------------------------------------------------------------
  // GET /agents - List all tracked agents
  // ---------------------------------------------------------------------------
  router.get('/agents', (req, res) => {
    res.json({
      agents: getActiveAgents(ctx),
      total: ctx.activeAgents.size,
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE /agents/:pid - Kill an agent by PID
  // ---------------------------------------------------------------------------
  router.delete('/agents/:pid', (req, res) => {
    const pid = Number(req.params.pid);
    try {
      process.kill(pid, 'SIGTERM');
      markAgentComplete(ctx, pid);
      res.json({ ok: true, message: `Sent SIGTERM to agent ${pid}` });
    } catch (err) {
      res.status(400).json({ ok: false, error: `Failed to kill ${pid}: ${err.message}` });
    }
  });

  return router;
};
