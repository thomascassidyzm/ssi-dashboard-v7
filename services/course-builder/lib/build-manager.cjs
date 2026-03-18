/**
 * Build manager — tracks running build jobs (translate + decompose).
 * No auto-advancing, no auto-spawning. Human controls everything.
 */

let buildManagerInterval = null;

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

  if (runningJobs.length === 0) return;

  for (const job of runningJobs) {
    const courseCode = job.course_code;
    const now = new Date();
    const minutesSinceStart = (now - new Date(job.started_at)) / 60000;

    try {
      // --- Step 1: Get current DB progress for this course ---
      let currentProgress = 0;
      let target = job.total_seeds || 300;

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
    console.log('[BUILD] Build manager stopped');
  }
}

async function stopBuild(ctx, courseCode) {
  try {
    const { data: job, error: findError } = await ctx.supabase
      .from('build_jobs')
      .select('id, status')
      .eq('course_code', courseCode)
      .in('status', ['running', 'stalled'])
      .single();

    if (findError || !job) {
      return { ok: false, error: 'No active build for this course' };
    }

    await ctx.supabase.from('build_jobs').update({
      status: 'stopped',
      completed_at: new Date().toISOString(),
    }).eq('id', job.id);

    ctx.activeBuilds.delete(courseCode);
    ctx.courseActivity.delete(courseCode);
    ctx.agentHeartbeats.delete(courseCode);

    if (ctx.activeBuilds.size === 0) stopBuildManager();

    return { ok: true, success: true, course_code: courseCode, job_id: job.id, message: 'Build stopped' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function getBuildStatus(ctx, courseCode) {
  const progress = await getBuildProgress(ctx, courseCode);

  let dbJob = null;
  try {
    const { data } = await ctx.supabase
      .from('build_jobs')
      .select('*')
      .eq('course_code', courseCode)
      .in('status', ['running', 'stalled'])
      .order('started_at', { ascending: false })
      .limit(1)
      .single();
    dbJob = data;
  } catch (e) { /* no active job */ }

  return {
    course_code: courseCode,
    active: !!dbJob,
    progress,
    build: dbJob ? {
      status: dbJob.status,
      pass: dbJob.pass,
      job_id: dbJob.id,
      total_seeds: dbJob.total_seeds || progress.total,
    } : null,
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
};
