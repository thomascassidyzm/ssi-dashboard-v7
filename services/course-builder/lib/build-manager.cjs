/**
 * Build manager — sequential/parallel build orchestration.
 * Stateful: operates on ctx.activeBuilds and reads ctx.supabase.
 */

const { getGoldenSeedCount } = require('./language-config.cjs');
const { advancePipeline, getPipelineStatus } = require('./pipeline.cjs');

let buildManagerInterval = null;

/**
 * Get current progress for a course (seeds with LEGOs = fully processed).
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
 * Check build progress and update DB.
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

  const now = Date.now();

  for (const job of runningJobs) {
    const courseCode = job.course_code;

    try {
      // Translate jobs: check if all seeds have target_text
      if (job.build_mode === 'translate' || job.pass === 'translate') {
        const { count: translated } = await ctx.supabase
          .from('course_seeds')
          .select('*', { count: 'exact', head: true })
          .eq('course_code', courseCode)
          .not('target_text', 'is', null);

        const target = job.total_seeds || 668;
        console.log(`[BUILD-DEBUG] === CHECK TRANSLATE ${courseCode}: ${translated}/${target} ===`);

        await ctx.supabase.from('build_jobs').update({
          current_seed: translated || 0,
          last_heartbeat: new Date().toISOString(),
        }).eq('id', job.id);

        if ((translated || 0) >= target) {
          console.log(`[BUILD] ✓ TRANSLATE COMPLETE: ${courseCode} (${translated}/${target} seeds)`);
          await ctx.supabase.from('build_jobs').update({
            status: 'complete',
            current_seed: translated,
            seeds_completed: translated,
            completed_at: new Date().toISOString(),
          }).eq('id', job.id);

          try {
            await advancePipeline(ctx, courseCode);
          } catch (chainErr) {
            console.error(`[BUILD] Pipeline advance failed after translate:`, chainErr.message);
          }
        }
        continue;
      }

      const progress = await getBuildProgress(ctx, courseCode);
      const targetSeeds = job.total_seeds || 300;

      console.log(`[BUILD-DEBUG] === CHECK ${courseCode} ===`);
      console.log(`[BUILD-DEBUG] Progress: completed=${progress.completed}, target=${targetSeeds}`);

      // Track draft progress
      try {
        const { count: draftCount } = await ctx.supabase
          .from('course_seed_drafts')
          .select('*', { count: 'exact', head: true })
          .eq('course_code', courseCode);

        console.log(`[BUILD-DEBUG] Parallel drafts: ${draftCount || 0}`);

        await ctx.supabase.from('build_jobs').update({
          current_seed: draftCount || 0,
          last_heartbeat: new Date().toISOString(),
        }).eq('id', job.id);
      } catch (e) {
        console.log(`[BUILD] Could not check parallel drafts: ${e.message}`);
      }

      // Check completion
      if (progress.completed >= targetSeeds) {
        console.log(`[BUILD] ✓ COMPLETE: ${courseCode} (${progress.completed}/${targetSeeds} seeds)`);
        await ctx.supabase.from('build_jobs').update({
          status: 'complete',
          current_seed: progress.completed,
          seeds_completed: progress.completed,
          completed_at: new Date().toISOString(),
        }).eq('id', job.id);

        // AUTO-CHAIN: Build complete → advance pipeline (e.g. build_mvp → qa_review)
        try {
          await advancePipeline(ctx, courseCode);
        } catch (chainErr) {
          console.error(`[BUILD] Pipeline advance failed after completion:`, chainErr.message);
        }
      }

    } catch (err) {
      console.error(`[BUILD] Error checking ${courseCode}:`, err.message);
    }
  }
}

/**
 * Start the build manager loop.
 */
function startBuildManager(ctx) {
  if (buildManagerInterval) return;
  console.log('[BUILD] Starting build manager loop...');
  buildManagerInterval = setInterval(() => checkBuilds(ctx), ctx.config.BUILD_CHECK_INTERVAL_MS || 30000);
}

/**
 * Stop the build manager loop.
 */
function stopBuildManager() {
  if (buildManagerInterval) {
    clearInterval(buildManagerInterval);
    buildManagerInterval = null;
    console.log('[BUILD] Build manager stopped');
  }
}

/**
 * Start a build for a course.
 */
async function startBuild(ctx, courseCode, terminal = 'iTerm2', targetSeeds = 668, spawnCallback) {
  const progress = await getBuildProgress(ctx, courseCode);
  const effectiveTarget = Math.min(targetSeeds, progress.total);

  if (progress.completed >= effectiveTarget) {
    return { ok: false, error: `Target reached (${progress.completed}/${effectiveTarget} seeds)` };
  }

  let jobId = null;
  let agentCount = 0;

  try {
    const { data: existingJob, error: findError } = await ctx.supabase
      .from('build_jobs')
      .select('id, status, agent_count, respawn_count')
      .eq('course_code', courseCode)
      .in('status', ['running', 'stalled'])
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (!findError && existingJob) {
      if (existingJob.status === 'running') {
        return { ok: false, error: 'Build already running - wait or stop it first' };
      }

      console.log(`[BUILD] Resuming existing job ${existingJob.id} for ${courseCode}`);
      jobId = existingJob.id;
      agentCount = existingJob.agent_count || 0;

      await ctx.supabase.from('build_jobs').update({
        status: 'running',
        terminal,
        current_seed: progress.completed,
        total_seeds: effectiveTarget,
        last_heartbeat: new Date().toISOString(),
        machine_name: ctx.MACHINE_NAME,
      }).eq('id', existingJob.id);
    }
  } catch (dbErr) {
    // No existing job
  }

  if (!jobId) {
    try {
      const { data: jobData, error: jobError } = await ctx.supabase
        .from('build_jobs')
        .insert({
          course_code: courseCode,
          pass: 'pass_2',
          status: 'running',
          current_seed: progress.completed,
          seeds_completed: progress.completed,
          total_seeds: effectiveTarget,
          started_at: new Date().toISOString(),
          last_heartbeat: new Date().toISOString(),
          requested_by: 'dashboard',
          terminal,
          agent_count: 0,
          respawn_count: 0,
          machine_name: ctx.MACHINE_NAME,
          build_mode: 'parallel',
        })
        .select('id')
        .single();

      if (jobError) {
        console.error('[BUILD] Failed to insert build_jobs record:', jobError.message);
        return { ok: false, error: 'Failed to create build job: ' + jobError.message };
      }
      jobId = jobData.id;
      console.log(`[BUILD] Created new build_jobs record: ${jobId} for ${courseCode}`);
    } catch (dbErr) {
      console.error('[BUILD] Unexpected error inserting build_jobs:', dbErr.message);
      return { ok: false, error: 'Database error: ' + dbErr.message };
    }
  }

  startBuildManager(ctx);

  const newAgentCount = agentCount + 1;
  try {
    if (spawnCallback) {
      console.log(`[BUILD] Spawning parallel coordinator for ${courseCode}...`);
      await spawnCallback(courseCode, newAgentCount, terminal);
      console.log(`[BUILD] ✓ Parallel coordinator spawned for ${courseCode}`);
    }

    await ctx.supabase.from('build_jobs').update({
      agent_count: newAgentCount,
      last_heartbeat: new Date().toISOString(),
    }).eq('id', jobId);
  } catch (spawnErr) {
    console.error(`[BUILD] ✗ Spawn failed: ${spawnErr.message}`);
    await ctx.supabase.from('build_jobs').update({ status: 'stalled' }).eq('id', jobId);
    return { ok: false, error: `Failed to spawn agent: ${spawnErr.message}` };
  }

  return {
    ok: true,
    course_code: courseCode,
    job_id: jobId,
    progress,
    build_mode: 'parallel',
    message: 'Parallel build started - coordinator agent spawned',
  };
}

/**
 * Stop a build for a course.
 */
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

    const { error: updateError } = await ctx.supabase
      .from('build_jobs')
      .update({
        status: 'stopped',
        stop_requested: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    if (updateError) {
      console.error(`[BUILD] Failed to stop job ${job.id}:`, updateError.message);
      return { ok: false, error: updateError.message };
    }

    console.log(`[BUILD] Stopped job ${job.id} for ${courseCode}`);

    // Clear in-memory state
    const build = ctx.activeBuilds.get(courseCode);
    if (build) {
      if (build.agent && build.agent.pid) {
        try { process.kill(build.agent.pid, 'SIGTERM'); } catch (e) {}
      }
      ctx.activeBuilds.delete(courseCode);
    }

    ctx.courseActivity.delete(courseCode);
    ctx.agentHeartbeats.delete(courseCode);
    console.log(`[BUILD] Cleared in-memory state for ${courseCode}`);

    if (ctx.activeBuilds.size === 0) {
      stopBuildManager();
    }

    return {
      ok: true,
      success: true,
      course_code: courseCode,
      job_id: job.id,
      message: 'Build stopped',
    };

  } catch (err) {
    console.error(`[BUILD] Error stopping build for ${courseCode}:`, err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Get build status for a course.
 */
async function getBuildStatus(ctx, courseCode) {
  const build = ctx.activeBuilds.get(courseCode);
  const progress = await getBuildProgress(ctx, courseCode);

  let dbJob = null;
  let lastJobTarget = null;
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

  if (!dbJob) {
    try {
      const { data } = await ctx.supabase
        .from('build_jobs')
        .select('total_seeds')
        .eq('course_code', courseCode)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();
      lastJobTarget = data?.total_seeds;
    } catch (e) { /* no previous job */ }
  }

  const isActive = !!dbJob;

  if (!isActive && (build || ctx.courseActivity.has(courseCode) || ctx.agentHeartbeats.has(courseCode))) {
    ctx.activeBuilds.delete(courseCode);
    ctx.courseActivity.delete(courseCode);
    ctx.agentHeartbeats.delete(courseCode);
    console.log(`[BUILD] Cleaned up stale in-memory state for ${courseCode}`);
  }

  const heartbeat = ctx.agentHeartbeats.get(courseCode);
  const heartbeatAlive = heartbeat && (Date.now() - heartbeat.lastHeartbeat) < ctx.config.HEARTBEAT_TIMEOUT_MS;

  let parallelInfo = null;
  if (isActive) {
    try {
      const { count: draftCount } = await ctx.supabase
        .from('course_seed_drafts')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode);

      const targetSeeds = dbJob?.total_seeds || progress.total;

      let goldenCount = 10;
      try {
        const { data: courseData } = await ctx.supabase
          .from('courses')
          .select('quality_rules')
          .eq('course_code', courseCode)
          .single();
        goldenCount = getGoldenSeedCount(courseData);
      } catch (e) { /* default */ }

      const draftsExpected = Math.max(0, targetSeeds - goldenCount);

      parallelInfo = {
        phase: (draftCount || 0) < draftsExpected ? 'drafting' : 'finalizing',
        drafts_submitted: draftCount || 0,
        drafts_expected: draftsExpected,
      };
    } catch (e) { /* draft table may not exist */ }
  }

  return {
    course_code: courseCode,
    active: isActive,
    progress,
    source: isActive ? 'database' : null,
    heartbeat_alive: heartbeatAlive,
    last_job_target: lastJobTarget || progress.total,
    build_mode: 'parallel',
    build: isActive ? {
      status: dbJob?.status || 'running',
      build_mode: 'parallel',
      agent_count: build?.agentCount || 1,
      current_batch_seeds: progress.completed - (build?.batchStartSeed || 0),
      batch_size: ctx.config.BATCH_SIZE,
      job_id: dbJob?.id || null,
      total_seeds: dbJob?.total_seeds || progress.total,
    } : null,
    parallel: parallelInfo,
  };
}

module.exports = {
  getBuildProgress,
  updateBuildJobDb,
  checkBuilds,
  startBuildManager,
  stopBuildManager,
  startBuild,
  stopBuild,
  getBuildStatus,
};
