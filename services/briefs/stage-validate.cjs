/**
 * Stage: VALIDATE — Coordinator calls validate API, handles failures.
 */

const { getSupabase, getGoldenSeedCount } = require('./shared.cjs');

async function generateValidateBrief(courseCode) {
  const supabase = getSupabase();

  // Get course info
  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, seed_count, quality_rules')
    .eq('course_code', courseCode)
    .single();

  const goldenCount = getGoldenSeedCount(courseInfo);

  // Count phrases
  const { count: phraseCount } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .gte('seed_number', goldenCount + 1);

  // Count LEGOs
  const { count: legoCount } = await supabase
    .from('course_legos')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .gte('seed_number', goldenCount + 1);

  return `# Stage: VALIDATE — ${courseCode}

## Current State
- LEGOs (seeds ${goldenCount + 1}+): ${legoCount || 0}
- Phrases (seeds ${goldenCount + 1}+): ${phraseCount || 0}

## Action
You (the coordinator) call the validate endpoint directly. No sub-agents needed.

\`\`\`bash
curl -s -X POST "http://localhost:3471/api/v2/validate/${courseCode}"
\`\`\`

## Handling Results

### All Pass (200, no failures)
Validation clean. Proceed to QA stage.

### Failures Present
The response lists LEGOs that failed validation (insufficient phrases, vocab violations, containment errors).

**How to handle failures:**
1. Read the failure list — each entry shows the LEGO, seed, and specific failure reason
2. For LEGOs with too few phrases: spawn targeted Haiku agents to generate more
   - Use the same prompt template from the PHRASES stage
   - Assign only the failing LEGOs
3. For vocab violations: the phrase uses words the learner hasn't seen yet
   - Delete the bad phrase
   - Generate a replacement using only known vocabulary
4. For containment errors: the LEGO target doesn't appear in the phrase target
   - Delete and regenerate the phrase

**After fixing:** Re-validate until clean.

\`\`\`bash
# Check which LEGOs failed
curl -s "http://localhost:3471/api/v2/validate/${courseCode}" | jq '.failures'

# Delete a bad phrase
curl -s -X DELETE "http://localhost:3471/api/phrases/${courseCode}/<phrase_id>"

# Submit replacement phrases
curl -s -X POST "http://localhost:3471/api/v2/phrases/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"phrases": [...]}'
\`\`\`

## AUTONOMY
Handle small failure counts yourself. For large failure counts (>20 LEGOs), spawn Haiku fix agents.
`;
}

module.exports = generateValidateBrief;
