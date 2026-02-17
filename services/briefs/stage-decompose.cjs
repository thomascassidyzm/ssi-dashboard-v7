/**
 * Stage: DECOMPOSE — Sonnet sub-agents decompose seeds into LEGOs (no phrases).
 */

const { getSupabase, getLanguageName, getGoldenSeedCount, fetchGoldenSeedExamples, formatDecompositionPatterns, formatBatchAssignments } = require('./shared.cjs');

async function generateDecomposeBrief(courseCode) {
  const supabase = getSupabase();
  const langName = getLanguageName(courseCode);

  // Get course info
  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, seed_count, quality_rules')
    .eq('course_code', courseCode)
    .single();

  const goldenCount = getGoldenSeedCount(courseInfo);
  const totalSeeds = courseInfo?.seed_count || 300;

  // Count seeds that already have drafts
  const { data: drafts } = await supabase
    .from('course_seed_drafts')
    .select('seed_number')
    .eq('course_code', courseCode)
    .gte('seed_number', goldenCount + 1);

  const draftedSeeds = new Set((drafts || []).map(d => d.seed_number));

  // Count seeds that are already finalized (have LEGOs)
  const { data: finalized } = await supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', courseCode)
    .gte('seed_number', goldenCount + 1);

  const finalizedSeeds = new Set((finalized || []).map(f => f.seed_number));

  // Seeds needing decomposition = not drafted and not finalized
  const seedsNeeded = [];
  for (let s = goldenCount + 1; s <= totalSeeds; s++) {
    if (!draftedSeeds.has(s) && !finalizedSeeds.has(s)) {
      seedsNeeded.push(s);
    }
  }

  // Fetch golden seed examples for pattern reference
  const goldenNums = [];
  for (let i = 1; i <= Math.min(5, goldenCount); i++) goldenNums.push(i);
  const goldenSeeds = await fetchGoldenSeedExamples(courseCode, goldenNums);
  const patternsSection = formatDecompositionPatterns(goldenSeeds);

  // QA lessons from quality_rules
  const lessons = courseInfo?.quality_rules?.lessons || [];
  const lessonsSection = lessons.length > 0
    ? `\n## Lessons from QA\n${lessons.map(l =>
        `- ${l.lesson}${l.example_wrong ? ` (wrong: ${l.example_wrong})` : ''}${l.example_right ? ` (right: ${l.example_right})` : ''}`
      ).join('\n')}`
    : '';

  // Batch assignments
  const batches = formatBatchAssignments(seedsNeeded, 10);
  const agentCount = batches.length;

  const batchAssignments = batches.map(b =>
    `Agent ${b.index}: seeds ${b.items.join(', ')} (${b.items.length} seeds)`
  ).join('\n');

  return `# Stage: DECOMPOSE — ${courseCode}

## Current State
- Total seeds to decompose: ${totalSeeds - goldenCount}
- Already drafted: ${draftedSeeds.size}
- Already finalized: ${finalizedSeeds.size}
- Remaining: ${seedsNeeded.length}

## Action
Spawn ${agentCount} Sonnet sub-agents (~10 seeds each) via Task tool.
ALL in a SINGLE message for parallel execution.

subagent_type: "general-purpose", model: "sonnet", run_in_background: true

## Batch Assignments
${batchAssignments}

## Sub-Agent Prompt Template

Give each sub-agent EXACTLY this prompt (replace {SEED_LIST} with their seed numbers):

---BEGIN PROMPT---
You are decomposing course content for ${courseCode} (${langName}). Your seeds: {SEED_LIST}

## API
- Seeds: GET http://localhost:3471/api/seeds/${courseCode}
- Vocab: GET http://localhost:3471/api/vocab/${courseCode}?seed=N
- Submit: POST http://localhost:3471/api/v2/decompose (JSON)

## Your Job
Break each seed into LEGOs (teaching chunks). NO PHRASES — just LEGOs.

**A-LEGO** = single word, zero ambiguity.
**M-LEGO** = multi-word bundle. Groups words that would be ambiguous alone. Must have components array.

Submit JSON:
\`\`\`json
{
  "course_code": "${courseCode}",
  "seed_number": N,
  "legos": [
    { "idx": 1, "type": "A", "known_text": "...", "target_text": "..." },
    { "idx": 2, "type": "M", "known_text": "...", "target_text": "...",
      "components": [{ "known": "...", "target": "..." }] }
  ]
}
\`\`\`

## LEGO Decomposition Patterns — Study These
${patternsSection}
${lessonsSection}

If rejected, read the error, fix, retry. Never ask questions.
---END PROMPT---

## Monitor
Poll: GET http://localhost:3471/api/course/${courseCode}/drafts (every 60s)
Track: number of drafted seeds
Target: ${seedsNeeded.length} seeds drafted

## Stall Metric
Drafted count not increasing for 3 polls (4.5 min) → check which seeds are missing, spawn replacements

## Next Step
When all drafts are in: proceed to FINALIZE stage.
`;
}

module.exports = generateDecomposeBrief;
