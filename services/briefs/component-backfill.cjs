/**
 * Brief: COMPONENT BACKFILL — Generates literal component breakdowns for M-LEGOs.
 *
 * Workflow:
 *   1. GET /api/course/:courseCode/components/gaps → M-LEGOs needing components
 *   2. For each LEGO, use `claude --print --model haiku` to generate literal component gloss
 *   3. POST /api/course/:courseCode/components/backfill → write components + rebuild phrases
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

  // Fetch a few example gaps to include in the brief (include partial = single-component M-LEGOs)
  const res = await fetch(`http://localhost:3471/api/course/${courseCode}/components/gaps?limit=5&include_partial=true`);
  const gapData = await res.json();
  const exampleGaps = gapData.gaps || [];
  const totalGaps = gapData.total_gaps || 0;

  const exampleSection = exampleGaps.map(g =>
    `  - S${g.seed_number}L${g.lego_index}: "${g.known_text}" → "${g.target_text}" (seed: "${g.seed_known}" → "${g.seed_target}")`
  ).join('\n');

  const batchSize = parseInt(query.batch) || 50;

  return `# Component Backfill Agent — ${courseCode} (${displayName})

You are generating **literal component breakdowns** for M-LEGOs in **${courseCode}** (${displayName}).

There are **${totalGaps} M-LEGOs** needing components.

## What Components Are

M-LEGOs are multi-word chunks the learner absorbs as a unit. The M-LEGO already has its natural translation (known_text). Components add a **visual layer** showing the learner the target language's internal logic.

**The audio gives the correct meaning. The tiles give the structural insight.**

Example — French M-LEGO: "I mean" → "je veux dire"

The learner HEARS: "I mean" → "je veux dire" (natural translation, audio)
The learner SEES on screen:
\`\`\`
┌────────┐ ┌──────┐
│ je veux│ │ dire │   ← target tiles
└────────┘ └──────┘
  I want    to say    ← LITERAL gloss (not "I mean")
\`\`\`

The delta between the natural meaning and the literal gloss is where the learning happens. "Oh — French literally says 'I want to say' for 'I mean'!"

## Rules for Component Splitting

1. **Every target character must be covered** by exactly one component — no gaps, no overlaps
2. **Component known-side = literal translation** of that target piece, NOT the M-LEGO's natural meaning
3. **Structural glue stays with its content word** — don't isolate particles/prepositions that only make sense attached (e.g. "smettere di" is ONE component, not two)
4. **If there's no English equivalent** for a structural piece, use empty string \`""\` for known — the app shows a dot
5. **If the split reveals a reusable pattern**, that's ideal (e.g. "verb + di + infinitive" is a pattern the learner will see again)
6. **If the M-LEGO is an opaque chunk with no useful internal structure** — return components that cover all the text but don't force artificial splits. Even a single component covering the whole LEGO is valid (it just won't generate component tiles, only the debut)
7. **Components must concatenate to form the full target_text** (with spaces between for space-separated languages)

## Example Gaps

${exampleSection}

## Your Workflow

Process LEGOs in batches of ${batchSize}:

### Step 1: Fetch gaps

\`\`\`bash
curl -s 'http://localhost:3471/api/course/${courseCode}/components/gaps?limit=${batchSize}&offset=0&include_partial=true'
\`\`\`

### Step 2: Generate components for each LEGO

For each gap, use Haiku to generate the literal component breakdown:

\`\`\`bash
echo 'M-LEGO: "KNOWN_TEXT" → "TARGET_TEXT"
Seed context: "SEED_KNOWN" → "SEED_TARGET"
Language: ${displayName}

Split this M-LEGO into components. Each component needs a "known" (literal English gloss) and "target" (the target language piece). Rules:
- Components must cover ALL target text with no gaps
- known = literal word-by-word translation, NOT the natural meaning of the whole M-LEGO
- Keep structural words (prepositions, particles, articles) attached to their content word if they only make sense together
- Use empty string "" for known if a structural piece has no English equivalent

Return ONLY a JSON array, no explanation:
[{"known": "...", "target": "..."}, ...]' | claude --print --model haiku
\`\`\`

Parse the JSON array from Haiku's response. Validate that the target pieces concatenate to match the full target_text (with spaces).

### Step 3: Submit batch

Collect the components for all LEGOs in the batch, then POST:

\`\`\`bash
curl -s -X POST 'http://localhost:3471/api/course/${courseCode}/components/backfill?force=true' \\
  -H 'Content-Type: application/json' \\
  -d '{"legos": [{"seed_number": N, "lego_index": N, "components": [...]}, ...]}'
\`\`\`

### Step 4: Check response

The response shows \`results\` (success) and \`errors\` (failures). Log any errors.

### Step 5: Repeat

Increment offset by ${batchSize} and fetch the next batch. Continue until all gaps are processed.

## Quality Checks Before Submitting

For each LEGO's components, verify:
- Target pieces join with spaces to form the exact target_text (or characters for CJK)
- No empty target strings
- known strings make sense as literal glosses
- Structural words aren't awkwardly isolated

## Important Notes

- Work steadily through all ${totalGaps} LEGOs — don't rush
- Use \`claude --print --model haiku\` for the literal glosses (NEVER the Anthropic SDK)
- If Haiku returns malformed JSON, retry once, then skip that LEGO and note it
- The backfill endpoint handles phrase rebuilding automatically — you just provide components
`;
}

module.exports = { generateComponentBackfillBrief };
