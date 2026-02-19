/**
 * Stage: QA — Haiku agents scan for issues, Opus agent repairs flagged phrases.
 */

const { getSupabase, getLanguageName, getGoldenSeedCount, formatBatchAssignments } = require('./shared.cjs');

async function generateQABrief(courseCode) {
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

  // Count unchecked phrases
  const { count: uncheckedCount } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .gte('seed_number', goldenCount + 1)
    .is('qa_checked_at', null);

  // Count existing flags
  const { count: flagCount } = await supabase
    .from('course_qa_flags')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .eq('status', 'open');

  // Build seed ranges for scan sub-agents
  const seedRanges = [];
  for (let s = goldenCount + 1; s <= totalSeeds; s += 10) {
    seedRanges.push({ start: s, end: Math.min(s + 9, totalSeeds) });
  }
  const scanBatches = seedRanges.map((r, i) =>
    `Agent ${i + 1}: seeds ${r.start}-${r.end}`
  ).join('\n');

  return `# Stage: QA — ${courseCode}

## Current State
- Unchecked phrases: ${uncheckedCount || 0}
- Open flags: ${flagCount || 0}

## Part 1: SCAN (Haiku sub-agents)

Spawn ${seedRanges.length} Haiku sub-agents to scan all unchecked phrases.
ALL in a SINGLE message for parallel execution.

subagent_type: "general-purpose", model: "haiku", run_in_background: true

### Batch Assignments
${scanBatches}

### Scan Sub-Agent Prompt Template

---BEGIN PROMPT---
You are scanning phrases for quality issues in ${courseCode} (${langName}). Your seeds: {SEED_MIN} to {SEED_MAX}

## API
- Fetch unchecked phrases: GET http://localhost:3471/api/qa/unchecked/${courseCode}?seed_min={SEED_MIN}&seed_max={SEED_MAX}&limit=1000
- Flag issues: POST http://localhost:3471/api/qa/bulk-flag
- Mark checked: POST http://localhost:3471/api/qa/bulk-mark-checked

## Check each phrase for:
1. **Grammar**: Is the target grammatically correct ${langName}? Is the English correct?
2. **Naturalness**: Would a native speaker actually say this?
3. **LEGO form**: Is the LEGO used in its exact form (no conjugation change)?
4. **Speakability**: Can a learner produce this without reading?

## Flag format
\`\`\`json
{
  "flags": [
    {
      "course_code": "${courseCode}",
      "phrase_id": "<the phrase id>",
      "seed_number": N,
      "check_type": "grammar|naturalness|vocabulary",
      "severity": "error|warning",
      "issue": "Brief description — say which language and what's wrong"
    }
  ]
}
\`\`\`

## After checking all phrases, mark the range as checked:
\`\`\`json
curl -s -X POST "http://localhost:3471/api/qa/bulk-mark-checked" \\
  -H "Content-Type: application/json" \\
  -d '{"course_code": "${courseCode}", "seed_min": {SEED_MIN}, "seed_max": {SEED_MAX}}'
\`\`\`

Never ask questions. Check every phrase. Submit flags. Mark as checked.
---END PROMPT---

### Monitor
Poll: GET http://localhost:3471/api/qa/summary/${courseCode}
Track: \`phrases.checked\` field
Target: checked >= total

### Stall Metric
\`checked\` not increasing for 3 polls (4.5 min) → spawn replacements for unchecked ranges

## Part 2: FIX (Opus agent — only if flags > 0)

After scan completes, check flag count. If flags > 0, spawn ONE fix agent:

subagent_type: "general-purpose", model: "sonnet", run_in_background: true

### Fix Agent Prompt

---BEGIN PROMPT---
You are repairing flagged phrases in ${courseCode} (${langName}). Fix every open flag.

## API
- Get open flags: GET http://localhost:3471/api/qa/flags/${courseCode}?status=open
- Get vocab: GET http://localhost:3471/api/vocab/${courseCode}?seed=N
- Delete bad phrase: DELETE http://localhost:3471/api/phrases/${courseCode}/<phrase_id>
- Submit replacements: POST http://localhost:3471/api/v2/phrases/${courseCode}
- Resolve flag: POST http://localhost:3471/api/qa/flag/<flagId>/resolve

## Strategy
For each flag:
1. Read the issue description
2. Fetch the LEGO context and vocab for that seed
3. If grammar/naturalness error: delete the phrase and write a correct replacement
4. Submit the replacement via the phrases API
5. Resolve the flag

After deleting flagged phrases, if any LEGO has < 4 USE phrases, generate extras to backfill.

Never ask questions. Fix every flag.
---END PROMPT---

### Monitor Fix Agent
Poll: GET http://localhost:3471/api/qa/flags/${courseCode}?status=open
Track: count of open flags
Target: 0 open flags
`;
}

module.exports = generateQABrief;
