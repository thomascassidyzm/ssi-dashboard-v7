/**
 * Checkpoint system — QA gates during build with drift tracking.
 * Config-driven: reads review_mode from course_checkpoint_config table.
 * Stateful: operates on ctx.checkpointState, ctx.pendingQAJobs.
 */

const CHECKPOINT_SEEDS = [10, 50, 150, 300];
const QA_DRIFT_THRESHOLD = 0.7;

/**
 * Initialize checkpoint state for a course if not exists.
 */
function initCheckpointState(ctx, courseCode) {
  if (!ctx.checkpointState.has(courseCode)) {
    ctx.checkpointState.set(courseCode, {
      checkpoints: {},
      drift_history: [],
      calibration_feedback: null,
    });
  }
  return ctx.checkpointState.get(courseCode);
}

/**
 * Check if a QA job is pending for this course.
 */
function isQAPending(ctx, courseCode) {
  const job = ctx.pendingQAJobs.get(courseCode);
  return job && job.status === 'running';
}

/**
 * Get checkpoint config from database (course-specific or _default fallback).
 */
async function getCheckpointConfig(ctx, courseCode, checkpointSeed) {
  const { data: specific } = await ctx.supabase
    .from('course_checkpoint_config')
    .select('review_mode, min_quality_score, max_drift_rate')
    .eq('course_code', courseCode)
    .eq('checkpoint_seed', checkpointSeed)
    .single();

  if (specific) return specific;

  const { data: defaultConfig } = await ctx.supabase
    .from('course_checkpoint_config')
    .select('review_mode, min_quality_score, max_drift_rate')
    .eq('course_code', '_default')
    .eq('checkpoint_seed', checkpointSeed)
    .single();

  if (defaultConfig) return defaultConfig;

  return { review_mode: 'human', min_quality_score: 7.0, max_drift_rate: 0.20 };
}

/**
 * Get the next unapproved checkpoint seed that blocks this seed.
 */
async function getBlockingCheckpoint(ctx, courseCode, requestedSeed) {
  const state = initCheckpointState(ctx, courseCode);

  for (const checkpointSeed of CHECKPOINT_SEEDS) {
    if (requestedSeed > checkpointSeed) {
      const cp = state.checkpoints[checkpointSeed];
      if (!cp || !cp.approved) {
        const config = await getCheckpointConfig(ctx, courseCode, checkpointSeed);
        if (config.review_mode === 'auto' || config.review_mode === 'auto_with_flag') {
          console.log(`[CHECKPOINT] Auto-approving checkpoint ${checkpointSeed} for ${courseCode} (review_mode: ${config.review_mode})`);
          await approveCheckpoint(ctx, courseCode, checkpointSeed, 'auto', {
            review_mode_used: config.review_mode,
            auto_approved_reason: 'Checkpoint configured for auto-approve',
          }, 'approved');
          continue;
        }
        return checkpointSeed;
      }
    }
  }
  return null;
}

/**
 * Check if checkpoint is required (just completed a checkpoint seed, not yet approved).
 */
async function isCheckpointRequired(ctx, courseCode, completedSeed) {
  if (!CHECKPOINT_SEEDS.includes(completedSeed)) return false;
  await getCheckpointStatus(ctx, courseCode);
  const state = initCheckpointState(ctx, courseCode);
  const cp = state.checkpoints[completedSeed];
  if (cp && cp.approved) return false;
  return true;
}

/**
 * Check if course is blocked by checkpoint.
 */
async function isBlockedByCheckpoint(ctx, courseCode, requestedSeed) {
  await getCheckpointStatus(ctx, courseCode);
  const blockingCheckpoint = await getBlockingCheckpoint(ctx, courseCode, requestedSeed);
  return blockingCheckpoint !== null;
}

/**
 * Approve checkpoint for course with QA report (persists to database).
 */
async function approveCheckpoint(ctx, courseCode, checkpointSeed, approvedBy = 'human', qaReport = null, status = 'approved') {
  const gateData = qaReport?.quality_gates || {};

  const { error } = await ctx.supabase
    .from('course_checkpoint_results')
    .upsert({
      course_code: courseCode,
      checkpoint_seed: checkpointSeed,
      status,
      approved_by: approvedBy,
      review_mode_used: qaReport?.review_mode_used || (approvedBy === 'auto' ? 'auto' : 'human'),
      gate_1_quality_avg: gateData.gate_1_absolute_quality?.qa_avg_score || null,
      gate_2_use_avg: gateData.gate_2_use_exceeds_build?.use_avg || null,
      gate_2_build_avg: gateData.gate_2_use_exceeds_build?.build_avg || null,
      gate_3_vocab_violations: gateData.gate_3_vocabulary?.violations_found || 0,
      gate_4_drift_rate: gateData.gate_4_drift?.drift_rate ? parseFloat(gateData.gate_4_drift.drift_rate) : null,
      qa_report: qaReport,
      created_at: new Date().toISOString(),
    }, { onConflict: 'course_code,checkpoint_seed' });

  if (error) {
    console.error(`[CHECKPOINT] DB error writing to course_checkpoint_results: ${error.message}`);
  }

  const state = initCheckpointState(ctx, courseCode);
  const isApproved = status === 'approved' || status === 'flagged';
  state.checkpoints[checkpointSeed] = {
    approved: isApproved,
    approvedAt: isApproved ? new Date().toISOString() : null,
    approvedBy: isApproved ? approvedBy : null,
    status,
    qa_report: qaReport,
  };

  if (qaReport && qaReport.quality_gates?.gate_4_drift) {
    const driftData = qaReport.quality_gates.gate_4_drift;
    const checkpointNumber = CHECKPOINT_SEEDS.indexOf(checkpointSeed) + 1;

    state.drift_history.push({
      checkpoint: checkpointNumber,
      seed: checkpointSeed,
      agent_avg: driftData.avg_agent_score,
      qa_avg: driftData.avg_qa_score,
      drift: Math.abs((driftData.avg_agent_score || 0) - (driftData.avg_qa_score || 0)),
      timestamp: new Date().toISOString(),
    });

    state.calibration_feedback = generateCalibrationFeedback(state.drift_history);
  }

  console.log(`✓ Checkpoint ${checkpointSeed} approved for ${courseCode} by ${approvedBy} (persisted to DB)`);
}

/**
 * Generate calibration feedback message based on drift history.
 */
function generateCalibrationFeedback(driftHistory) {
  if (!driftHistory || driftHistory.length === 0) return null;

  const latest = driftHistory[driftHistory.length - 1];

  let driftTrend = 'stable';
  if (driftHistory.length >= 2) {
    const prev = driftHistory[driftHistory.length - 2];
    if (latest.drift > prev.drift + 0.2) driftTrend = 'increasing';
    else if (latest.drift < prev.drift - 0.2) driftTrend = 'decreasing';
  }

  let message = '';
  if (latest.drift < 0.3) {
    message = 'Excellent calibration - your scores align well with QA.';
  } else if (latest.drift < 0.7) {
    message = `Your scores are ${latest.drift.toFixed(1)} higher than QA. Minor adjustment may help.`;
  } else if (latest.drift < 1.2) {
    message = `Your scores are ${latest.drift.toFixed(1)} higher than QA. Be more critical of USE phrases.`;
  } else {
    message = `WARNING: Drift of ${latest.drift.toFixed(1)} is high. Review QA feedback carefully.`;
  }

  if (driftTrend === 'increasing') {
    message += ' Drift is INCREASING - quality may be declining.';
  }

  return {
    last_checkpoint: latest.seed,
    checkpoint_number: latest.checkpoint,
    your_avg_score: latest.agent_avg,
    qa_avg_score: latest.qa_avg,
    drift: latest.drift,
    drift_trend: driftTrend,
    message,
  };
}

/**
 * Get checkpoint status for course (all checkpoints) — reads from database.
 */
async function getCheckpointStatus(ctx, courseCode) {
  const state = initCheckpointState(ctx, courseCode);

  try {
    const { data: results } = await ctx.supabase
      .from('course_checkpoint_results')
      .select('checkpoint_seed, status, created_at, approved_by, review_mode_used, qa_report, gate_1_quality_avg, gate_4_drift_rate')
      .eq('course_code', courseCode);

    if (results) {
      for (const result of results) {
        state.checkpoints[result.checkpoint_seed] = {
          approved: result.status === 'approved',
          status: result.status,
          approvedAt: result.created_at,
          approvedBy: result.approved_by,
          review_mode_used: result.review_mode_used,
          qa_report: result.qa_report,
          quality_avg: result.gate_1_quality_avg,
          drift_rate: result.gate_4_drift_rate,
        };
      }
    }
  } catch (e) {
    console.error(`[CHECKPOINT] DB read error: ${e.message}`);
  }

  let nextCheckpoint = null;
  for (const seed of CHECKPOINT_SEEDS) {
    const cp = state.checkpoints[seed];
    if (!cp || !cp.approved) {
      nextCheckpoint = seed;
      break;
    }
  }

  const checkpointDetails = {};
  for (const seed of CHECKPOINT_SEEDS) {
    const cp = state.checkpoints[seed];
    checkpointDetails[seed] = {
      approved: cp?.approved || false,
      approvedAt: cp?.approvedAt || null,
      approvedBy: cp?.approvedBy || null,
    };
  }

  return {
    checkpoint_seeds: CHECKPOINT_SEEDS,
    next_checkpoint: nextCheckpoint,
    checkpoints: checkpointDetails,
    drift_history: state.drift_history,
    calibration_feedback: state.calibration_feedback,
  };
}

/**
 * Spawn checkpoint QA agent — DISABLED (dashboard controls spawning).
 */
async function spawnCheckpointQAAgent(ctx, courseCode, checkpointSeed) {
  console.log(`[SPAWN-DISABLED] spawnCheckpointQAAgent called for ${courseCode} checkpoint ${checkpointSeed} - NO ACTION`);
  return { spawned: false, checkpoint_seed: checkpointSeed, reason: 'auto-spawn disabled' };
}

module.exports = {
  CHECKPOINT_SEEDS,
  QA_DRIFT_THRESHOLD,
  initCheckpointState,
  isQAPending,
  getCheckpointConfig,
  getBlockingCheckpoint,
  isCheckpointRequired,
  isBlockedByCheckpoint,
  approveCheckpoint,
  generateCalibrationFeedback,
  getCheckpointStatus,
  spawnCheckpointQAAgent,
};
