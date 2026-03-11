/**
 * Brief: COMPONENT BACKFILL ORCHESTRATOR
 *
 * Opus orchestrator that spawns parallel Haiku worker agents to generate
 * literal component breakdowns for M-LEGOs.
 *
 * Architecture:
 *   Orchestrator (Opus) → spawns N worker agents (Haiku via Agent tool)
 *   Each worker gets a batch of M-LEGOs to decompose
 *   Workers call the backfill API directly — no back-and-forth needed
 */

const { getSupabase, getLanguageName } = require('./shared.cjs');

async function generateComponentBackfillBrief(courseCode, query = {}) {
  const supabase = getSupabase();
  const langName = getLanguageName(courseCode);

  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name')
    .eq('course_code', courseCode)
    .single();

  const displayName = courseInfo?.display_name || langName;

  // Fetch total gap count
  const res = await fetch(`http://localhost:3471/api/course/${courseCode}/components/gaps?limit=5&include_partial=true`);
  const gapData = await res.json();
  const exampleGaps = gapData.gaps || [];
  const totalGaps = gapData.total_gaps || 0;

  const exampleSection = exampleGaps.map(g =>
    `  - S${g.seed_number}L${g.lego_index}: "${g.known_text}" → "${g.target_text}" (seed: "${g.seed_known}" → "${g.seed_target}")`
  ).join('\n');

  // Calculate batches — ~30 LEGOs per worker, up to 5 workers
  const batchSize = parseInt(query.batch) || 30;
  const workerCount = Math.min(5, Math.ceil(totalGaps / batchSize));

  return `# Component Backfill Orchestrator — ${courseCode} (${displayName})

Working directory: /Users/tomcassidy/SSi/ssi-dashboard-v7-clean

## YOUR JOB

You are an **Opus orchestrator**. You spawn parallel worker agents to generate literal component breakdowns for **${totalGaps} M-LEGOs** in ${courseCode}.

**You do NOT generate components yourself.** You spawn workers, monitor them, and verify completion.

## What Components Are

M-LEGOs are multi-word chunks the learner absorbs as a unit. Components add a **visual layer** showing the target language's internal logic.

Example — French M-LEGO: "I mean" → "je veux dire"
\`\`\`
┌────────┐ ┌──────┐
│ je veux│ │ dire │   ← target tiles
└────────┘ └──────┘
  I want    to say    ← LITERAL gloss (not "I mean")
\`\`\`

The delta between the natural meaning and the literal gloss is where the learning happens.

## Example Gaps

${exampleSection}

## Component Rules (include in every worker prompt)

1. Every target character covered by exactly one component — no gaps, no overlaps
2. Component known-side = **literal translation** of that target piece, NOT the M-LEGO's natural meaning
3. Structural glue stays with its content word (e.g. "smettere di" = ONE component)
4. No English equivalent? Use empty string \`""\` for known
5. Components must concatenate (with spaces) to form the exact target_text
6. If no useful internal structure — single component covering whole LEGO is valid

---

## Step 1: Fetch ALL Gaps

\`\`\`bash
curl -s 'http://localhost:3471/api/course/${courseCode}/components/gaps?limit=200&include_partial=true'
\`\`\`

This returns up to 200 M-LEGOs needing components. Parse the \`gaps\` array from the response.

## Step 2: Spawn ${workerCount} Worker Agents in Parallel

Split the gaps into ${workerCount} batches of ~${batchSize} each. Spawn all workers **simultaneously** using multiple Agent tool calls in a single message.

For each worker, use the Agent tool:
- **run_in_background: true**
- **mode: "bypassPermissions"**

Each worker's prompt should be a COMPLETE self-contained brief (the worker has no context from you). Include:
1. The batch of M-LEGOs (seed_number, lego_index, known_text, target_text, seed context)
2. The component rules (all 6 rules above)
3. The exact curl command to submit results
4. Language: ${displayName}

### Worker Prompt Template

For each worker, construct a prompt like this (filling in the actual LEGO data):

\`\`\`
You are generating literal component breakdowns for M-LEGOs in ${courseCode} (${displayName}).

## Component Rules
1. Every target character covered by exactly one component — no gaps, no overlaps
2. Component known-side = LITERAL translation of that target piece, NOT the M-LEGO's natural meaning
3. Structural glue stays with its content word (don't isolate particles/prepositions)
4. No English equivalent? Use empty string "" for known
5. Components must concatenate (with spaces) to form exact target_text
6. If no useful internal structure — single component covering whole LEGO is valid

## Your M-LEGOs

Process each of these M-LEGOs. For each one, split the target_text into components with literal English glosses.

[LIST EACH LEGO HERE, e.g.:]
1. S2L2: "i'm trying to learn" → "öğrenmeye çalışıyorum" (seed: "I'm trying to learn" → "Öğrenmeye çalışıyorum.")
2. S3L2: "as often as possible" → "mümkün olduğunca sık" (seed: "how to speak as often as possible" → "...")
[... etc for all LEGOs in this batch]

## How to Submit

For each LEGO, determine the components array. Then submit ALL at once:

curl -s -X POST 'http://localhost:3471/api/course/${courseCode}/components/backfill?force=true' \\
  -H 'Content-Type: application/json' \\
  -d '{"legos": [
    {"seed_number": N, "lego_index": N, "components": [{"known": "...", "target": "..."}, ...]},
    ...
  ]}'

## Validation Before Submitting

For each LEGO's components:
- Join all target pieces with spaces — must exactly match the original target_text
- No empty target strings
- known strings are literal glosses, not natural translations

## IMPORTANT
- Work through ALL LEGOs in your batch
- Submit them in a single POST call (or split into groups of 20 if the batch is large)
- Report how many succeeded and how many failed
\`\`\`

## Step 3: Monitor Workers

Wait for all workers to complete. Each worker will report back how many LEGOs it processed.

## Step 4: Verify Completion

After all workers finish, recheck:

\`\`\`bash
curl -s 'http://localhost:3471/api/course/${courseCode}/components/gaps?limit=1&include_partial=true'
\`\`\`

If \`total_gaps\` is still > 0, spawn additional workers for the remaining gaps (some may have failed validation).

## Step 5: Report

When \`total_gaps\` reaches 0 (or only unfixable gaps remain), report:
- Total M-LEGOs processed
- Success count
- Any failures with details

## IMPORTANT RULES

1. **Spawn ALL workers in parallel** — use multiple Agent tool calls in a single message
2. **Each worker is self-contained** — include the full LEGO list and rules in its prompt
3. **Workers submit directly to the API** — no back-and-forth with you
4. **You verify completion** after workers finish and handle any stragglers
5. **DO NOT generate components yourself** — that's the workers' job

## START NOW
Fetch the gaps, split into batches, spawn ${workerCount} workers in parallel.
`;
}

module.exports = { generateComponentBackfillBrief };
