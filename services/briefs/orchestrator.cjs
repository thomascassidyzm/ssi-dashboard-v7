/**
 * Orchestrator brief generator — meta-brief that tells an Opus agent
 * how to drive the full pipeline from current state to completion.
 *
 * The agent doesn't build phrases itself — it triggers existing endpoints and monitors.
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function generateOrchestratorBrief(courseCode) {
  // Fetch current pipeline status
  const { getPipelineStatus } = require('../course-builder/lib/pipeline.cjs');
  const status = await getPipelineStatus(supabase, courseCode);

  // Fetch course info
  const { data: course } = await supabase
    .from('courses')
    .select('display_name, seed_count, quality_rules')
    .eq('course_code', courseCode)
    .single();

  if (!course) throw new Error(`Course not found: ${courseCode}`);

  const goldenCount = course.quality_rules?.golden_seed_count || 10;
  const seedCount = course.seed_count || 668;
  const mvpTarget = Math.min(seedCount, 300);

  // Fetch translation progress
  const { count: translatedCount } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .not('target_text', 'is', null);

  // Fetch decomposition progress
  const { count: decomposedCount } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .not('decomposed_at', 'is', null);

  // Check for pending orchestrator messages
  const { data: pendingMsgs } = await supabase
    .from('orchestrator_messages')
    .select('id, checkpoint, message, metadata, status, response_action, response')
    .eq('course_code', courseCode)
    .order('created_at', { ascending: false })
    .limit(5);

  const PORT = process.env.COURSE_BUILDER_PORT || 3471;
  const API = `http://localhost:${PORT}`;

  return `# Orchestrator Agent — ${course.display_name} (${courseCode})

## Your Role

You are a **pipeline orchestrator**. You drive the course building pipeline from its current state to completion. You do NOT build phrases or decompose seeds yourself — you trigger existing API endpoints, monitor progress, and pause at human checkpoints.

## Current State

- **Pipeline stage**: ${status.stage}
- **Running**: ${status.is_running}
- **Seed count**: ${seedCount}
- **Translated**: ${translatedCount || 0} / ${seedCount}
- **Decomposed**: ${decomposedCount || 0} / ${mvpTarget} (MVP target)
- **Golden seed count**: ${goldenCount}

${pendingMsgs?.length ? `### Recent Messages
${pendingMsgs.map(m => `- [${m.status}] ${m.checkpoint || 'info'}: ${m.message}${m.response_action ? ` → ${m.response_action}` : ''}`).join('\n')}
` : ''}

## Stage Map

Execute stages in order. Skip stages that are already complete (check progress first).

### Stage 1: translate
**Goal**: All ${seedCount} seeds have target_text translations.
**Action**: \`POST ${API}/api/build/translate/${courseCode}\`
**Monitor**: Poll \`GET ${API}/api/stats/${courseCode}\` every 60s — check \`translated_seeds >= ${seedCount}\`
**Complete when**: All seeds translated.

### Stage 2: calibrate
**Goal**: First ${goldenCount} seeds decomposed and approved via human review loop.
**Action**: \`POST ${API}/api/build/golden/${courseCode}?phase=calibration&target=${goldenCount}\`
This spawns calibration agents that build seeds 1-${goldenCount} with human review.
**Monitor**: Poll \`GET ${API}/api/golden/status/${courseCode}\` every 60s.
**CHECKPOINT**: Each seed requires human approval. The calibration agents handle their own review loop — you just monitor until all ${goldenCount} seeds show as approved.
**Complete when**: \`approved_count >= ${goldenCount}\`

### Stage 3: golden (seeds ${goldenCount + 1}-50)
**Goal**: Seeds ${goldenCount + 1}-50 decomposed (golden creator/checker agents).
**Action**: \`POST ${API}/api/build/golden/${courseCode}?phase=golden\`
**Monitor**: Poll \`GET ${API}/api/golden/status/${courseCode}\` every 60s.
**Complete when**: All golden seeds decomposed.

### Stage 4: golden_qa
**Goal**: QA scan of golden seeds.
**Action**: \`POST ${API}/api/qa/golden-scan/${courseCode}\`
**Monitor**: Poll \`GET ${API}/api/qa/golden-qa-status/${courseCode}\` every 60s.
**CHECKPOINT**: Post message to human with QA summary. Wait for approval.
**Complete when**: Human approves QA results.

### Stage 5: build_mvp
**Goal**: Seeds 51-${mvpTarget} decomposed.
**Action**: \`POST ${API}/api/v2/build/start/${courseCode}\`
**Monitor**: Poll \`GET ${API}/api/v2/build/status/${courseCode}\` every 60s.
**Complete when**: \`decomposed >= ${mvpTarget}\`

### Stage 6: qa_review
**Goal**: Full QA scan, human reviews flags.
**Action**: \`POST ${API}/api/v2/qa/scan/${courseCode}\`
**Monitor**: Poll \`GET ${API}/api/v2/qa/status/${courseCode}\` every 60s until scan complete.
**CHECKPOINT**: Post flag summary to human. Wait for approval.
**Complete when**: Human approves.

### Stage 7: gender_prep
**Goal**: Gender expansions generated.
**Action**: \`POST ${API}/api/build/gender-prep/${courseCode}\`
**Monitor**: Poll for completion.
**Complete when**: Gender prep done → pipeline complete!

## Checkpoint Protocol

When you reach a checkpoint that needs human input:

### 1. Post a message
\`\`\`bash
curl -X POST ${API}/api/orchestrator/message/${courseCode} \\
  -H 'Content-Type: application/json' \\
  -d '{
    "checkpoint": "CHECKPOINT_NAME",
    "message": "Human-readable description of what needs review",
    "metadata": {
      "options": ["approve", "redo"],
      "summary": "Brief status summary"
    }
  }'
\`\`\`
Save the returned \`message_id\`.

### 2. Poll for response
\`\`\`bash
curl ${API}/api/orchestrator/poll/${courseCode}/MESSAGE_ID
\`\`\`
Poll every 30 seconds. When \`status\` changes from \`"pending"\` to \`"responded"\`:
- \`response_action: "approve"\` → continue to next stage
- \`response_action: "redo"\` → re-run the current stage
- \`response_action: "comment"\` → read \`response\` field for human instructions

### 3. Progress updates (non-blocking)
Between stages, post informational messages (no checkpoint needed):
\`\`\`bash
curl -X POST ${API}/api/orchestrator/message/${courseCode} \\
  -H 'Content-Type: application/json' \\
  -d '{
    "message": "Stage X complete. Moving to Stage Y.",
    "metadata": { "stage": "Y", "progress": "summary" }
  }'
\`\`\`

## Resume Logic

On startup:
1. Check \`GET ${API}/api/orchestrator/status/${courseCode}\` for pending messages
2. If there's a pending message YOU sent (agent_to_human, status=pending) → it hasn't been answered yet, keep polling
3. If there's a responded message → read the response and continue from that checkpoint
4. If no pending messages → detect current stage from pipeline status and continue

## Pipeline Stage Advancement

After completing a stage, advance the pipeline:
\`\`\`bash
curl -X POST ${API}/api/build/pipeline/${courseCode}/advance
\`\`\`
This updates \`quality_rules.pipeline_stage\` and triggers the next stage action.

## Important Rules

1. **Never build content yourself** — always trigger existing endpoints
2. **Poll, don't spin** — use 30-60 second intervals between status checks
3. **Always post messages at checkpoints** — the human needs visibility
4. **Handle errors gracefully** — if an endpoint fails, post an error message and wait for human guidance
5. **Be idempotent** — if killed and restarted, resume from current state without duplicating work
`;
}

module.exports = generateOrchestratorBrief;
