/**
 * Stage: FINALIZE — Coordinator calls finalize API, fixes any ZUT collisions.
 */

const { getSupabase, getGoldenSeedCount } = require('./shared.cjs');

async function generateFinalizeBrief(courseCode) {
  const supabase = getSupabase();

  // Get course info
  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, seed_count, quality_rules')
    .eq('course_code', courseCode)
    .single();

  const goldenCount = getGoldenSeedCount(courseInfo);

  // Count drafts ready to finalize
  const { count: draftCount } = await supabase
    .from('course_seed_drafts')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .gte('seed_number', goldenCount + 1);

  // Count already-finalized seeds
  const { data: finalizedRaw } = await supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', courseCode)
    .gte('seed_number', goldenCount + 1);

  const finalizedCount = new Set((finalizedRaw || []).map(f => f.seed_number)).size;

  return `# Stage: FINALIZE — ${courseCode}

## Current State
- Drafts ready to finalize: ${draftCount || 0}
- Seeds already finalized (have LEGOs): ${finalizedCount}

## Action
You (the coordinator) call the finalize endpoint directly. No sub-agents needed.

\`\`\`bash
curl -s -X POST "http://localhost:3471/api/v2/decompose/finalize/${courseCode}"
\`\`\`

## Handling Results

### Success (200)
All drafts finalized cleanly. Proceed to PHRASES stage.

### Collisions (409)
The response contains ZUT collisions — same known text mapping to different targets.

**How to fix collisions:**
1. Read the collision details from the response
2. For each collision: merge the two colliding LEGOs into a bigger M-LEGO
   - Pick an adjacent LEGO to merge with — whichever makes a natural combined phrase
   - New M-LEGO: known = combined English, target = combined target, components = the originals
3. Re-index remaining LEGOs sequentially (1, 2, 3...)
4. Resubmit the fixed draft: POST http://localhost:3471/api/v2/decompose
5. Re-finalize: POST http://localhost:3471/api/v2/decompose/finalize/${courseCode}

**Loop until clean (200).** Most courses need 0-2 collision fix rounds.

### Server Error (500)
Retry once. If still failing, check the error message and report.

## AUTONOMY
Fix collisions yourself — do not spawn sub-agents for this. It's faster to handle directly.
`;
}

module.exports = generateFinalizeBrief;
