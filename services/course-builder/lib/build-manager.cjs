/**
 * Build manager — tracks running build jobs (translate + decompose).
 * No auto-advancing, no auto-spawning. Human controls everything.
 */

let buildManagerInterval = null;

/**
 * Per-job backoff for the PROGRESS COUNT query (Step 1 below).
 *
 * The tick stays at BUILD_CHECK_INTERVAL_MS because `last_heartbeat` is a
 * liveness signal downstream (production-api's stall check + the detective
 * brief both call a job stalled at >5 min without a heartbeat) — widening the
 * tick would fake stalls. What gets widened is the expensive part: the
 * count-seeds query. A job whose count is unchanged is re-counted at
 * 2x the previous delay, capped; any change resets it to the base delay.
 *
 * Why: jobs are never auto-killed here (see Step 3), so `running` rows
 * accumulate and get counted forever — live 2026-08-04 there were 10 running
 * jobs, the oldest started 2026-05-18 and 3 of them `final-pass`, so the
 * approved-seed count ran every 30s for weeks against an answer that had not
 * moved in a month. That poll is ~988k calls of the measured DB load.
 */
const progressBackoff = new Map(); // job.id -> { nextCheckAt, delayMs }

/** Passes whose progress comes from a DB count (i.e. the ones worth backing off). */
const COUNTING_PASSES = new Set(['translate', 'build-team', 'decompose', 'final-pass']);

/**
 * Check if a claude agent process is still running for a given course.
 * Looks for 'claude --model' processes whose command line includes the course code.
 */
function isAgentRunningForCourse(courseCode) {
  try {
    const { execSync } = require('child_process');
    const output = execSync(`pgrep -af "claude --model" 2>/dev/null || true`, { encoding: 'utf8' });
    return output.includes(courseCode);
  } catch (e) {
    return false;
  }
}

/**
 * Get current progress for a course (seeds with decomposed_at).
 */
async function getBuildProgress(ctx, courseCode) {
  const { data: courseData } = await ctx.supabase
    .from('courses')
    .select('seed_count')
    .eq('course_code', courseCode)
    .single();

  const totalSeeds = courseData?.seed_count || 300;

  const { count: completedSeeds } = await ctx.supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .not('decomposed_at', 'is', null);

  return {
    completed: completedSeeds || 0,
    total: totalSeeds,
    isComplete: (completedSeeds || 0) >= totalSeeds,
  };
}

/**
 * Helper to update build_jobs table (fire-and-forget).
 */
async function updateBuildJobDb(ctx, buildJobId, updates) {
  if (!buildJobId) return;
  try {
    const { error } = await ctx.supabase
      .from('build_jobs')
      .update(updates)
      .eq('id', buildJobId);
    if (error) {
      console.error(`[BUILD] DB update failed for job ${buildJobId}:`, error.message);
    }
  } catch (err) {
    console.error(`[BUILD] Unexpected DB error for job ${buildJobId}:`, err.message);
  }
}

/**
 * Check build progress and update DB. No auto-advance — just track progress.
 */
async function checkBuilds(ctx) {
  let runningJobs = [];
  try {
    const { data, error } = await ctx.supabase
      .from('build_jobs')
      .select('*')
      .eq('status', 'running');

    if (error) {
      console.error('[BUILD] DB query failed:', error.message);
      return;
    }
    runningJobs = data || [];
  } catch (err) {
    console.error('[BUILD] DB error:', err.message);
    return;
  }

  // Drop backoff state for jobs that are no longer running.
  const runningIds = new Set(runningJobs.map((j) => j.id));
  for (const id of progressBackoff.keys()) {
    if (!runningIds.has(id)) progressBackoff.delete(id);
  }

  if (runningJobs.length === 0) return;

  for (const job of runningJobs) {
    const courseCode = job.course_code;
    const now = new Date();
    const minutesSinceStart = (now - new Date(job.started_at)) / 60000;

    try {
      // --- Step 1: Get current DB progress for this course ---
      let currentProgress = 0;
      let target = job.total_seeds || 300;

      // Backed-off jobs skip the count entirely: heartbeat only, no
      // progress/completion write (writing a stale count would be a lie).
      const backoff = progressBackoff.get(job.id);
      if (COUNTING_PASSES.has(job.pass) && backoff && now.getTime() < backoff.nextCheckAt) {
        await ctx.supabase
          .from('build_jobs')
          .update({ last_heartbeat: now.toISOString() })
          .eq('id', job.id);
        continue;
      }

      if (job.pass === 'translate') {
        const { count } = await ctx.supabase
          .from('course_seeds')
          .select('*', { count: 'exact', head: true })
          .eq('course_code', courseCode)
          .not('target_text', 'is', null)
          .neq('target_text', '');
        currentProgress = count || 0;
        target = job.total_seeds || 668;
      } else if (job.pass === 'build-team' || job.pass === 'decompose') {
        const p = await getBuildProgress(ctx, courseCode);
        currentProgress = p.completed;
      } else if (job.pass === 'final-pass') {
        // Count approved seeds as progress
        const { count } = await ctx.supabase
          .from('course_seeds')
          .select('*', { count: 'exact', head: true })
          .eq('course_code', courseCode)
          .not('approved_at', 'is', null);
        currentProgress = count || 0;
      } else if (job.pass === 'backfill-phrases') {
        // Progress tracked via activity log in metadata — use seeds_completed
        currentProgress = job.seeds_completed || 0;
      }

      // --- Step 2: Update heartbeat + progress in DB ---
      const progressChanged = currentProgress !== (job.seeds_completed || 0);

      if (COUNTING_PASSES.has(job.pass)) {
        const baseMs = ctx.config.BUILD_PROGRESS_MIN_INTERVAL_MS || 60000;
        const maxMs = ctx.config.BUILD_PROGRESS_MAX_INTERVAL_MS || 900000;
        const prevDelay = progressBackoff.get(job.id)?.delayMs || 0;
        const delayMs = progressChanged ? baseMs : Math.min(Math.max(prevDelay * 2, baseMs), maxMs);
        progressBackoff.set(job.id, { delayMs, nextCheckAt: now.getTime() + delayMs });
      }
      const updates = {
        current_seed: currentProgress,
        seeds_completed: currentProgress,
        last_heartbeat: now.toISOString(),
      };
      if (progressChanged) {
        updates.last_progress_at = now.toISOString();
      }
      await ctx.supabase.from('build_jobs').update(updates).eq('id', job.id);

      // --- Step 3: Check completion ---
      // Only mark complete when target is reached. Never kill jobs —
      // the job-done curl handles agent exit, dashboard shows stall warnings,
      // user clicks Stop manually if needed.
      if (currentProgress >= target && target > 0) {
        console.log(`[BUILD] ${job.pass.toUpperCase()} COMPLETE: ${courseCode} (${currentProgress}/${target})`);
        await ctx.supabase.from('build_jobs').update({
          status: 'complete',
          current_seed: currentProgress,
          seeds_completed: currentProgress,
          completed_at: now.toISOString(),
        }).eq('id', job.id);
      }

    } catch (err) {
      console.error(`[BUILD] Error checking ${courseCode}:`, err.message);
    }
  }
}

function startBuildManager(ctx) {
  if (buildManagerInterval) return;
  console.log('[BUILD] Starting build manager loop...');
  buildManagerInterval = setInterval(() => checkBuilds(ctx), ctx.config.BUILD_CHECK_INTERVAL_MS || 30000);
}

function stopBuildManager() {
  if (buildManagerInterval) {
    clearInterval(buildManagerInterval);
    buildManagerInterval = null;
    progressBackoff.clear();
    console.log('[BUILD] Build manager stopped');
  }
}

/**
 * Stop every running/stalled job for a course — and actually end it (job #482).
 * Before #482 this only flipped build_jobs.status: the orchestrator kept building, and a
 * course with two running rows (a double Start) made `.single()` fail, so Stop said "No
 * active build" while two orchestrators ran. Now each row's recorded process tree is killed,
 * the row records stop_reason 'human' and who stopped it, and a usage-limit pause waiting
 * to auto-resume is cancelled (Stop on a paused build means "don't restart it").
 */
async function stopBuild(ctx, courseCode, { by = null } = {}) {
  const { killProcessTree, ownsPid } = require('./build-job-runtime.cjs');
  const now = new Date().toISOString();
  try {
    const { data: jobs, error } = await ctx.supabase
      .from('build_jobs')
      .select('id, status, metadata, machine_name')
      .eq('course_code', courseCode)
      .in('status', ['running', 'stalled']);
    if (error) return { ok: false, error: error.message };

    const stopped = [];
    for (const job of jobs || []) {
      let kill = { wasAlive: false, killed: [], survivors: [] };
      if (ownsPid(ctx, job)) kill = await killProcessTree(job.metadata.pid);
      await ctx.supabase.from('build_jobs').update({
        status: 'stopped',
        completed_at: now,
        stop_requested: true,
        metadata: { ...(job.metadata || {}), stop_reason: 'human', stopped_by: by, process_killed: kill.wasAlive, kill_survivors: kill.survivors },
      }).eq('id', job.id);
      stopped.push({ job_id: job.id, process_killed: kill.wasAlive, survivors: kill.survivors, pid_known: ownsPid(ctx, job) });
    }

    // A paused build waiting on its usage-limit reset: Stop cancels the automatic restart.
    const cancelled = await cancelScheduledResumes(ctx, courseCode, { by });

    ctx.activeBuilds.delete(courseCode);
    ctx.courseActivity.delete(courseCode);
    ctx.agentHeartbeats.delete(courseCode);
    if (ctx.activeBuilds.size === 0) stopBuildManager();

    if (!stopped.length && !cancelled.length) return { ok: false, error: 'No active build for this course' };
    const legacy = stopped.filter((s) => !s.pid_known).length;
    const message = [
      stopped.length ? `Build stopped${stopped.some((s) => s.process_killed) ? ' and its builder process ended' : ''}` : null,
      cancelled.length ? 'automatic resume cancelled' : null,
      legacy ? `${legacy} job(s) started before process tracking: marked stopped, but no process was recorded to end` : null,
    ].filter(Boolean).join('; ');
    return { ok: true, success: true, course_code: courseCode, job_id: stopped[0]?.job_id || null, stopped, cancelled_resumes: cancelled, message };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/** Usage-limit stops for this course still waiting to restart. */
async function scheduledResumes(ctx, courseCode) {
  const { data } = await ctx.supabase
    .from('build_jobs')
    .select('id, status, metadata, total_seeds, completed_at, course_code, pass')
    .eq('course_code', courseCode)
    .eq('status', 'stopped')
    .order('completed_at', { ascending: false })
    .limit(10);
  return (data || []).filter((j) => j.metadata?.auto_resume?.state === 'scheduled');
}

async function cancelScheduledResumes(ctx, courseCode, { by = null, reason = 'cancelled' } = {}) {
  const pending = await scheduledResumes(ctx, courseCode);
  for (const j of pending) {
    await ctx.supabase.from('build_jobs').update({
      metadata: { ...j.metadata, auto_resume: { ...j.metadata.auto_resume, state: reason, cancelled_by: by, cancelled_at: new Date().toISOString() } },
    }).eq('id', j.id);
  }
  return pending.map((j) => j.id);
}

/**
 * Status for the Course Manager page. Besides the running job (as before), `last_stop`
 * says how the most recent finished job ended, in plain English (job #482) — so a paused,
 * crashed or limit-stopped build is visible instead of looking like "never started".
 * A running row whose recorded process has vanished is finalized here (process_gone), so a
 * builder that died without calling /build/job-done does not show as running forever.
 */
async function getBuildStatus(ctx, courseCode) {
  const { describeStop } = require('./build-stop-reason.cjs');
  const { isProcessAlive, ownsPid, finalizeJob } = require('./build-job-runtime.cjs');
  const progress = await getBuildProgress(ctx, courseCode);

  let running = [];
  try {
    const { data } = await ctx.supabase
      .from('build_jobs')
      .select('*')
      .eq('course_code', courseCode)
      .in('status', ['running', 'stalled'])
      .order('started_at', { ascending: false });
    running = data || [];
  } catch (e) { /* no active job */ }

  // Lazily settle rows whose process is gone.
  const alive = [];
  for (const job of running) {
    if (ownsPid(ctx, job) && !isProcessAlive(job.metadata.pid)) {
      await finalizeJob(ctx, job, { reasonIfSilent: 'process_gone', decideResume: ctx.decideBuildResume });
    } else alive.push(job);
  }
  const dbJob = alive[0] || null;

  let lastStop = null;
  if (!dbJob) {
    try {
      const { data } = await ctx.supabase
        .from('build_jobs')
        .select('*')
        .eq('course_code', courseCode)
        .in('status', ['stopped', 'complete', 'failed'])
        .order('completed_at', { ascending: false, nullsFirst: false })
        .limit(1);
      const j = data && data[0];
      if (j) {
        const completed = j.metadata?.seeds_at_stop ?? null;
        lastStop = {
          job_id: j.id,
          pass: j.pass,
          status: j.status,
          stop_reason: j.metadata?.stop_reason || (j.status === 'complete' ? 'done' : null),
          stopped_at: j.completed_at,
          seeds_at_stop: completed,
          total_seeds: j.total_seeds,
          reset_at: j.metadata?.reset_at || null,
          auto_resume: j.metadata?.auto_resume || null,
          message: describeStop(j, { completed }),
        };
      }
    } catch (e) { /* no history */ }
  }

  return {
    course_code: courseCode,
    active: !!dbJob,
    running_jobs: alive.length,
    progress,
    build: dbJob ? {
      status: dbJob.status,
      pass: dbJob.pass,
      job_id: dbJob.id,
      started_at: dbJob.started_at,
      total_seeds: dbJob.total_seeds || progress.total,
      account: dbJob.metadata?.account || null,
    } : null,
    last_stop: lastStop,
    paused: !!(lastStop && lastStop.auto_resume && ['scheduled', 'starting'].includes(lastStop.auto_resume.state)),
  };
}

module.exports = {
  getBuildProgress,
  updateBuildJobDb,
  checkBuilds,
  startBuildManager,
  stopBuildManager,
  stopBuild,
  getBuildStatus,
  scheduledResumes,
  cancelScheduledResumes,
};
