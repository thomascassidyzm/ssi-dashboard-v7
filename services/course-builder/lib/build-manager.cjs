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

    try {
      // Translate jobs: check if all seeds have target_text
      if (job.build_mode === 'translate' || job.pass === 'translate') {
        const { count: translated } = await ctx.supabase
          .from('course_seeds')
          .select('*', { count: 'exact', head: true })
          .eq('course_code', courseCode)
          .not('target_text', 'is', null)
          .neq('target_text', '');

        const target = job.total_seeds || 668;

        await ctx.supabase.from('build_jobs').update({
          current_seed: translated || 0,
          last_heartbeat: new Date().toISOString(),
        }).eq('id', job.id);

        if ((translated || 0) >= target) {
          console.log(`[BUILD] TRANSLATE COMPLETE: ${courseCode} (${translated}/${target} seeds)`);
          await ctx.supabase.from('build_jobs').update({
            status: 'complete',
            current_seed: translated,
            seeds_completed: translated,
            completed_at: new Date().toISOString(),
          }).eq('id', job.id);
          // No auto-advance — human starts decompose from dashboard
        }
        continue;
      }

      // Decompose jobs: track progress
      if (job.pass === 'decompose') {
        const progress = await getBuildProgress(ctx, courseCode);
        const targetSeeds = job.total_seeds || 300;

        await ctx.supabase.from('build_jobs').update({
          current_seed: progress.completed,
          last_heartbeat: new Date().toISOString(),
        }).eq('id', job.id);

        if (progress.completed >= targetSeeds) {
          console.log(`[BUILD] DECOMPOSE COMPLETE: ${courseCode} (${progress.completed}/${targetSeeds} seeds)`);
          await ctx.supabase.from('build_jobs').update({
            status: 'complete',
            current_seed: progress.completed,
            seeds_completed: progress.completed,
            completed_at: new Date().toISOString(),
          }).eq('id', job.id);
        }
        continue;
      }

      // Build-team jobs: same completion as decompose (count decomposed_at seeds)
      if (job.pass === 'build-team') {
        const progress = await getBuildProgress(ctx, courseCode);
        const targetSeeds = job.total_seeds || 300;

        await ctx.supabase.from('build_jobs').update({
          current_seed: progress.completed,
          last_heartbeat: new Date().toISOString(),
        }).eq('id', job.id);

        if (progress.completed >= targetSeeds) {
          console.log(`[BUILD] BUILD-TEAM COMPLETE: ${courseCode} (${progress.completed}/${targetSeeds} seeds)`);
          await ctx.supabase.from('build_jobs').update({
            status: 'complete',
            current_seed: progress.completed,
            seeds_completed: progress.completed,
            completed_at: new Date().toISOString(),
          }).eq('id', job.id);
        }
        continue;
      }

      // Final-pass jobs: detect agent exit via process check.
      if (job.pass === 'final-pass') {
        const { count: flagged } = await ctx.supabase
          .from('course_practice_phrases')
          .select('*', { count: 'exact', head: true })
          .eq('course_code', courseCode)
          .eq('flagged', true);

        const currentFlagged = flagged || 0;
        const now = new Date();
        const minutesSinceStart = (now - new Date(job.started_at)) / 60000;

        await ctx.supabase.from('build_jobs').update({
          current_seed: currentFlagged,
          last_heartbeat: now.toISOString(),
          metadata: { ...(job.metadata || {}), flagged_phrases: currentFlagged },
        }).eq('id', job.id);

        // If no claude process running for this course and it's been > 2 min, agent is done
        if (minutesSinceStart > 2 && !isAgentRunningForCourse(courseCode)) {
          console.log(`[BUILD] FINAL-PASS COMPLETE (agent exited): ${courseCode} (${currentFlagged} flagged phrases)`);
          await ctx.supabase.from('build_jobs').update({
            status: 'complete',
            completed_at: now.toISOString(),
          }).eq('id', job.id);
        }
        continue;
      }

      // Unmanaged job types (component-backfill, gender-prep, etc.)
      // If agent process is gone and job has been running > 2 min, mark complete
      const minutesSinceStart2 = (new Date() - new Date(job.started_at)) / 60000;
      if (minutesSinceStart2 > 2 && !isAgentRunningForCourse(courseCode)) {
        console.log(`[BUILD] COMPLETE (agent exited): ${courseCode} ${job.pass}`);
        await ctx.supabase.from('build_jobs').update({
          status: 'complete',
          completed_at: new Date().toISOString(),
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
