/**
 * Pipeline state machine for automated course building.
 *
 * States: translate → calibrate → golden → build_mvp → qa_review → gender_prep → complete
 *
 * Stored in courses.quality_rules.pipeline_stage
 * Human gates: calibrate (async review), qa_review (approve flags)
 */

const { getGoldenSeedCount } = require('./language-config.cjs');

const PIPELINE_STAGES = [
  'translate',
  'calibrate',
  'golden',
  'build_mvp',
  'qa_review',
  'gender_prep',
  'complete'
];

const DEFAULT_HUMAN_GATES = ['calibrate', 'golden', 'build_mvp', 'qa_review'];

/**
 * Check if a stage is a human gate for a given course's quality_rules.
 * `calibrate` is ALWAYS human — non-negotiable.
 */
function isHumanGate(qualityRules, stage) {
  if (stage === 'calibrate') return true;
  const modes = qualityRules?.gate_modes || {};
  if (modes[stage]) return modes[stage] === 'human';
  return DEFAULT_HUMAN_GATES.includes(stage);
}

/**
 * Get resolved gate modes for a course (defaults + overrides, calibrate always human).
 */
function getGateModes(qualityRules) {
  const defaults = Object.fromEntries(DEFAULT_HUMAN_GATES.map(g => [g, 'human']));
  return { ...defaults, ...(qualityRules?.gate_modes || {}), calibrate: 'human' };
}

/**
 * Get current pipeline status for a course.
 */
async function getPipelineStatus(supabase, courseCode) {
  const { data: course, error } = await supabase
    .from('courses')
    .select('quality_rules, seed_count')
    .eq('course_code', courseCode)
    .single();

  if (error) throw error;

  const rules = course.quality_rules || {};
  const stage = rules.pipeline_stage || null;
  const stageIndex = stage ? PIPELINE_STAGES.indexOf(stage) : -1;

  return {
    course_code: courseCode,
    stage: stage || 'not_started',
    stage_index: stageIndex,
    stages: PIPELINE_STAGES,
    is_running: rules.pipeline_running === true,
    started_at: rules.pipeline_started_at || null,
    human_gate: stage ? isHumanGate(rules, stage) : false,
    gate_mode: stage ? (isHumanGate(rules, stage) ? 'human' : 'agent') : null,
    seed_count: course.seed_count || 300
  };
}

/**
 * Set pipeline stage for a course.
 */
async function setPipelineStage(supabase, courseCode, stage, extra = {}) {
  const { data: course, error: fetchErr } = await supabase
    .from('courses')
    .select('quality_rules')
    .eq('course_code', courseCode)
    .single();

  if (fetchErr) throw fetchErr;

  const rules = course.quality_rules || {};
  const updated = {
    ...rules,
    pipeline_stage: stage,
    pipeline_updated_at: new Date().toISOString(),
    ...extra
  };

  if (stage === 'complete') {
    updated.pipeline_running = false;
    updated.pipeline_completed_at = new Date().toISOString();
  }

  const { error: updateErr } = await supabase
    .from('courses')
    .update({ quality_rules: updated })
    .eq('course_code', courseCode);

  if (updateErr) throw updateErr;

  console.log(`[PIPELINE] ${courseCode}: stage → ${stage}`);
  return stage;
}

/**
 * Advance pipeline to the next stage and trigger its action.
 * Returns the new stage, or null if already complete or at a human gate.
 *
 * @param {object} ctx - Server context (supabase, config, etc.)
 * @param {string} courseCode
 * @param {object} opts - { force: bool } to skip gate check
 */
async function advancePipeline(ctx, courseCode, opts = {}) {
  const status = await getPipelineStatus(ctx.supabase, courseCode);
  const currentIdx = status.stage_index;

  if (status.stage === 'complete') {
    console.log(`[PIPELINE] ${courseCode}: already complete`);
    return null;
  }

  const nextIdx = currentIdx + 1;
  if (nextIdx >= PIPELINE_STAGES.length) {
    await setPipelineStage(ctx.supabase, courseCode, 'complete');
    return 'complete';
  }

  const nextStage = PIPELINE_STAGES[nextIdx];

  // Fetch quality_rules for dynamic gate check
  const { data: courseData } = await ctx.supabase
    .from('courses')
    .select('quality_rules')
    .eq('course_code', courseCode)
    .single();
  const qualityRules = courseData?.quality_rules || {};
  const humanGate = isHumanGate(qualityRules, nextStage);

  // Set the stage first
  await setPipelineStage(ctx.supabase, courseCode, nextStage, {
    pipeline_running: !humanGate
  });

  // If next stage is a human gate, pause (don't auto-trigger)
  if (humanGate && !opts.force) {
    console.log(`[PIPELINE] ${courseCode}: paused at human gate → ${nextStage}`);
    return nextStage;
  }

  // Trigger the stage action
  await triggerStage(ctx, courseCode, nextStage);
  return nextStage;
}

/**
 * Start or resume pipeline from wherever it currently is.
 * Idempotent — calling when already running does nothing.
 */
async function startPipeline(ctx, courseCode) {
  const status = await getPipelineStatus(ctx.supabase, courseCode);

  if (status.is_running) {
    console.log(`[PIPELINE] ${courseCode}: already running at ${status.stage}`);
    return { stage: status.stage, action: 'already_running' };
  }

  if (status.stage === 'complete') {
    return { stage: 'complete', action: 'already_complete' };
  }

  // Determine starting stage based on existing data
  let startStage = status.stage;
  if (!startStage || startStage === 'not_started') {
    startStage = await detectCurrentStage(ctx.supabase, courseCode);
  }

  // Fetch quality_rules for dynamic gate check
  const { data: courseForGate } = await ctx.supabase
    .from('courses')
    .select('quality_rules')
    .eq('course_code', courseCode)
    .single();
  const startRules = courseForGate?.quality_rules || {};
  const startIsHuman = isHumanGate(startRules, startStage);

  await setPipelineStage(ctx.supabase, courseCode, startStage, {
    pipeline_running: !startIsHuman,
    pipeline_started_at: new Date().toISOString()
  });

  // If at a human gate, don't auto-trigger
  if (startIsHuman) {
    console.log(`[PIPELINE] ${courseCode}: at human gate → ${startStage}`);
    return { stage: startStage, action: 'waiting_at_gate' };
  }

  await triggerStage(ctx, courseCode, startStage);
  return { stage: startStage, action: 'started' };
}

/**
 * Detect current stage from existing data (for fresh pipeline starts).
 */
async function detectCurrentStage(supabase, courseCode) {
  // Check translation progress
  const { count: translatedSeeds } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .not('target_text', 'is', null);

  if (!translatedSeeds || translatedSeeds === 0) return 'translate';

  // Check calibration (golden seeds 1-10 in seed_drafts with approved status)
  const { data: courseInfo } = await supabase
    .from('courses')
    .select('quality_rules, seed_count')
    .eq('course_code', courseCode)
    .single();

  const goldenCount = getGoldenSeedCount(courseInfo);

  const { count: approvedCalibration } = await supabase
    .from('course_seed_drafts')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .lte('seed_number', 10)
    .eq('review_status', 'approved');

  if (!approvedCalibration || approvedCalibration < 10) return 'calibrate';

  // Check golden seeds (11-50)
  const { count: goldenDecomposed } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .gte('seed_number', 11)
    .lte('seed_number', goldenCount)
    .not('decomposed_at', 'is', null);

  const goldenTarget = goldenCount - 10;
  if (!goldenDecomposed || goldenDecomposed < goldenTarget) return 'golden';

  // Check MVP build (seeds 1-300)
  const mvpTarget = Math.min(courseInfo?.seed_count || 300, 300);
  const { count: mvpDecomposed } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .lte('seed_number', mvpTarget)
    .not('decomposed_at', 'is', null);

  if (!mvpDecomposed || mvpDecomposed < mvpTarget) return 'build_mvp';

  // Check QA
  const { count: uncheckedPhrases } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .is('qa_checked', null);

  const { count: openFlags } = await supabase
    .from('course_qa_flags')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .eq('status', 'open');

  if (uncheckedPhrases > 0 || openFlags > 0) return 'qa_review';

  // Check gender prep
  const { count: genderExpansions } = await supabase
    .from('course_gender_expansions')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode);

  if (!genderExpansions || genderExpansions === 0) return 'gender_prep';

  return 'complete';
}

/**
 * Trigger the action for a given stage.
 */
async function triggerStage(ctx, courseCode, stage) {
  const port = ctx.config.PORT || 3471;
  const baseUrl = `http://localhost:${port}`;

  console.log(`[PIPELINE] ${courseCode}: triggering stage → ${stage}`);

  try {
    switch (stage) {
      case 'translate':
        await fetch(`${baseUrl}/api/build/translate/${courseCode}`, { method: 'POST' });
        break;

      case 'calibrate':
        await fetch(`${baseUrl}/api/build/golden/${courseCode}?phase=calibration&target=10`, { method: 'POST' });
        break;

      case 'golden':
        await fetch(`${baseUrl}/api/build/golden/${courseCode}?phase=golden&target=50`, { method: 'POST' });
        break;

      case 'build_mvp': {
        const { data: ci } = await ctx.supabase
          .from('courses')
          .select('seed_count')
          .eq('course_code', courseCode)
          .single();
        const targetSeeds = Math.min(ci?.seed_count || 300, 300);
        await fetch(`${baseUrl}/api/build/start/${courseCode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetSeeds })
        });
        break;
      }

      case 'qa_review':
        // Spawn QA scan agents, then pause at human gate
        await fetch(`${baseUrl}/api/qa/start/${courseCode}`, { method: 'POST' });
        break;

      case 'gender_prep':
        await fetch(`${baseUrl}/api/build/gender-prep/${courseCode}`, { method: 'POST' });
        break;

      case 'complete':
        // Nothing to trigger
        break;

      default:
        console.warn(`[PIPELINE] Unknown stage: ${stage}`);
    }
  } catch (err) {
    console.error(`[PIPELINE] Failed to trigger ${stage} for ${courseCode}:`, err.message);
  }
}

module.exports = {
  PIPELINE_STAGES,
  DEFAULT_HUMAN_GATES,
  isHumanGate,
  getGateModes,
  getPipelineStatus,
  setPipelineStage,
  advancePipeline,
  startPipeline,
  detectCurrentStage,
  triggerStage
};
