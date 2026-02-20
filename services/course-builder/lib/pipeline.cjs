/**
 * Pipeline state machine — simplified 2-phase pipeline.
 * translate → decompose → complete
 *
 * Stored in courses.quality_rules.pipeline_stage
 * Decompose is ALWAYS a human gate (human rides along with agent).
 */

const PIPELINE_STAGES = [
  'translate',
  'decompose',
  'complete'
];

const DEFAULT_HUMAN_GATES = ['decompose'];

function isHumanGate(qualityRules, stage) {
  if (stage === 'decompose') return true;
  return DEFAULT_HUMAN_GATES.includes(stage);
}

function getGateModes(qualityRules) {
  return { decompose: 'human' };
}

async function getPipelineStatus(supabase, courseCode) {
  const { data: course, error } = await supabase
    .from('courses')
    .select('quality_rules, seed_count')
    .eq('course_code', courseCode)
    .single();

  if (error) throw error;

  const rules = course.quality_rules || {};
  let stage = rules.pipeline_stage || null;

  // Map old stages to new ones
  if (stage && !PIPELINE_STAGES.includes(stage) && stage !== 'not_started') {
    stage = 'decompose'; // Any old stage beyond translate → decompose
  }

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

async function advancePipeline(ctx, courseCode, opts = {}) {
  const status = await getPipelineStatus(ctx.supabase, courseCode);

  if (status.stage === 'complete') return null;

  const currentIdx = status.stage_index;
  const nextIdx = currentIdx + 1;
  if (nextIdx >= PIPELINE_STAGES.length) {
    await setPipelineStage(ctx.supabase, courseCode, 'complete');
    return 'complete';
  }

  const nextStage = PIPELINE_STAGES[nextIdx];

  // Decompose is always a human gate — just set the stage, never auto-trigger
  await setPipelineStage(ctx.supabase, courseCode, nextStage, {
    pipeline_running: false
  });

  console.log(`[PIPELINE] ${courseCode}: advanced to ${nextStage} (human gate)`);
  return nextStage;
}

async function detectCurrentStage(supabase, courseCode) {
  const { count: translatedSeeds } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .not('target_text', 'is', null);

  const { data: courseInfo } = await supabase
    .from('courses')
    .select('seed_count')
    .eq('course_code', courseCode)
    .single();

  const totalSeeds = courseInfo?.seed_count || 668;

  if (!translatedSeeds || translatedSeeds < totalSeeds) return 'translate';

  const { count: decomposed } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .not('decomposed_at', 'is', null);

  const mvpTarget = Math.min(totalSeeds, 300);
  if (!decomposed || decomposed < mvpTarget) return 'decompose';

  return 'complete';
}

// No auto-triggering — decompose is always human-initiated from the dashboard
async function triggerStage(ctx, courseCode, stage) {
  const port = ctx.config.PORT || 3471;
  const baseUrl = `http://localhost:${port}`;

  console.log(`[PIPELINE] ${courseCode}: triggering stage → ${stage}`);

  switch (stage) {
    case 'translate':
      await fetch(`${baseUrl}/api/build/translate/${courseCode}`, { method: 'POST' });
      break;
    case 'decompose':
      // Human-initiated only — do nothing here
      console.log(`[PIPELINE] ${courseCode}: decompose is human-initiated, not auto-triggering`);
      break;
    case 'complete':
      break;
    default:
      console.warn(`[PIPELINE] Unknown stage: ${stage}`);
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
  startPipeline: async (ctx, courseCode) => {
    // Simplified — just detect and set stage
    const stage = await detectCurrentStage(ctx.supabase, courseCode);
    await setPipelineStage(ctx.supabase, courseCode, stage, {
      pipeline_started_at: new Date().toISOString()
    });
    if (stage === 'translate') {
      await triggerStage(ctx, courseCode, stage);
      return { stage, action: 'started' };
    }
    return { stage, action: 'waiting_at_gate' };
  },
  detectCurrentStage,
  triggerStage
};
