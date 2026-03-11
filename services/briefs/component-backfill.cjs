/**
 * Brief: COMPONENT BACKFILL ORCHESTRATOR
 *
 * Opus orchestrator that spawns parallel worker agents to generate
 * component breakdowns for M-LEGOs.
 *
 * Components are ACTIVE LEARNING UNITS — each gets its own presentation
 * audio prompt and 2× practice cycles before the full M-LEGO is introduced.
 *
 * Architecture:
 *   Orchestrator (Opus) → spawns N worker agents via Agent tool
 *   Each worker gets a batch of M-LEGOs to decompose
 *   Workers call the backfill API directly — no back-and-forth needed
 */

const { getSupabase, getLanguageName } = require('./shared.cjs');

async function generateComponentBackfillBrief(courseCode, query = {}) {
  const supabase = getSupabase();
  const langName = getLanguageName(courseCode);

  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, known_lang, target_lang')
    .eq('course_code', courseCode)
    .single();

  const displayName = courseInfo?.display_name || langName;

  // Derive target language display name for presentation template
  const targetLangCode = courseInfo?.target_lang || courseCode.split('_for_')[0];
  const langDisplayNames = {
    spa: 'Spanish', fra: 'French', deu: 'German', ita: 'Italian',
    por: 'Portuguese', nld: 'Dutch', tur: 'Turkish', pol: 'Polish',
    ara: 'Arabic', jpn: 'Japanese', zho: 'Chinese', kor: 'Korean',
    swe: 'Swedish', fin: 'Finnish', gle: 'Irish', cym: 'Welsh',
    bre: 'Breton', cat: 'Catalan', eus: 'Basque', eng: 'English',
  };
  const targetLangName = langDisplayNames[targetLangCode] || targetLangCode;

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

You are an **Opus orchestrator**. You spawn parallel worker agents to generate component breakdowns for **${totalGaps} M-LEGOs** in ${courseCode}.

**You do NOT generate components yourself.** You spawn workers, monitor them, and verify completion.

## What Components Are — ACTIVE LEARNING UNITS

Components are NOT just visual breakdowns. Each component becomes an **active learning unit** with its own presentation audio and 2× practice cycles. The learner hears and practises each piece BEFORE encountering the full M-LEGO.

### Example — Spanish M-LEGO: "I'm trying" → "estoy intentando"

The learner experiences this sequence:

**Component 1: "I'm" → "estoy"**
\`\`\`
Presentation: "The ${targetLangName} for 'I'm', as in 'I'm trying', is:"
→ estoy, estoy
Practice 1: I'm → estoy
Practice 2: I'm → estoy
\`\`\`

**Component 2: "trying" → "intentando"**
\`\`\`
Presentation: "The ${targetLangName} for 'trying', as in 'I'm trying', is:"
→ intentando, intentando
Practice 1: trying → intentando
Practice 2: trying → intentando
\`\`\`

**Then the full M-LEGO round proceeds normally:**
\`\`\`
M-LEGO Intro: "I'm trying" → estoy intentando
Debut: "I'm trying" → estoy intentando
Build: "I'm trying to speak" → ...
Build: "I'm trying Spanish" → ...
Use cycles...
\`\`\`

Components are **prepended** to the existing round. Nothing is removed.

### What the component \`known\` field means

The \`known\` field is the **natural English for that piece** — it's what becomes the spoken prompt.
- "I'm" for "estoy" (NOT "I am" or some literal gloss)
- "trying" for "intentando" (NOT "attempting")
- "to learn" for "aprender" (natural, what you'd say)

The presentation audio template is: *"The ${targetLangName} for '{known}', as in '{M-LEGO known_text}', is:"*

So the \`known\` text must make sense when spoken aloud in that template.

## Example Gaps

${exampleSection}

## Component Rules (include in every worker prompt)

1. **Every target word must be covered** by exactly one component — no gaps, no overlaps
2. **Component known = natural English for that piece** — what you'd say when referring to that chunk. It becomes the spoken prompt: "The ${targetLangName} for '{known}', as in '{M-LEGO}', is:"
3. **Structural glue stays with its content word** — don't isolate particles/prepositions that only make sense attached (e.g., Spanish "estoy intentando" splits as "estoy" + "intentando", NOT "estoy" + "intent" + "ando")
4. **Components must concatenate (with spaces) to form the exact target_text**
5. **If a piece has no natural English equivalent**, use empty string \`""\` for known — but prefer attaching it to an adjacent component instead
6. **Single-word M-LEGOs don't need components** — these are filtered out automatically

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
You are generating component breakdowns for M-LEGOs in ${courseCode} (${displayName}).

## What Components Are

Each component becomes an ACTIVE LEARNING UNIT. The learner hears a presentation prompt and practises each component 2× before encountering the full M-LEGO. The component "known" field is what gets spoken aloud in the prompt:

"The ${targetLangName} for '{known}', as in '{M-LEGO known_text}', is:"

So "known" must be the NATURAL ENGLISH for that piece — what you'd say when referring to it.

## Component Rules
1. Every target word covered by exactly one component — no gaps, no overlaps
2. Component known = natural English for that piece (becomes the spoken prompt)
3. Structural glue stays with its content word (don't isolate particles/prepositions)
4. Components must concatenate (with spaces) to form exact target_text
5. No natural English for a piece? Prefer attaching it to an adjacent component. Use "" only as last resort.

## Your M-LEGOs

For each M-LEGO, split target_text into components. The "known" for each component is the natural English for that piece.

[LIST EACH LEGO HERE, e.g.:]
1. S5L2: "I'm trying" → "estoy intentando" (seed: "I'm trying to learn" → "Estoy intentando aprender.")
   → Components: [{"known": "I'm", "target": "estoy"}, {"known": "trying", "target": "intentando"}]
2. S8L3: "I want to" → "quiero" (seed: ...)
   → This is a single target word — skip (no components needed, return empty)
[... etc for all LEGOs in this batch]

## How to Submit

Submit ALL at once:

curl -s -X POST 'http://localhost:3471/api/course/${courseCode}/components/backfill?force=true' \\
  -H 'Content-Type: application/json' \\
  -d '{"legos": [
    {"seed_number": N, "lego_index": N, "components": [{"known": "...", "target": "..."}, ...]},
    ...
  ]}'

## Validation Before Submitting

For each LEGO's components:
- Join all target pieces with spaces — must EXACTLY match the original target_text
- No empty target strings
- known strings are natural English that make sense in: "The ${targetLangName} for '{known}', as in '{M-LEGO}', is:"

## IMPORTANT
- Work through ALL LEGOs in your batch
- Submit them in a single POST call (or split into groups of 20 if large)
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
