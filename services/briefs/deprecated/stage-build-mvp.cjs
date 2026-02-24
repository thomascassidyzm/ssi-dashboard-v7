/**
 * Brief: BUILD MVP — Sonnet agent builds seeds 51-300 via seed/complete (same as golden).
 * No Checker review loop. QA runs as a separate pipeline stage afterwards.
 */

const { getSupabase, getLanguageName, getGoldenSeedCount, buildCrossCourseSummaries, fetchGoldenSeedExamples } = require('./shared.cjs');

async function generateBuildMvpBrief(courseCode, query = {}) {
  const supabase = getSupabase();
  const langName = getLanguageName(courseCode);

  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, seed_count, quality_rules, translation_analysis')
    .eq('course_code', courseCode)
    .single();

  const crossCourseSummaries = await buildCrossCourseSummaries(5);
  const translationDoctrine = courseInfo?.quality_rules?.target_language_guidance
    ? JSON.stringify(courseInfo.quality_rules.target_language_guidance, null, 2)
    : null;

  // Fetch approved calibration seeds as quality examples
  const goldenSeedCount = getGoldenSeedCount(courseInfo);
  const calibrationNums = [];
  for (let i = 1; i <= Math.min(10, goldenSeedCount); i++) calibrationNums.push(i);
  const calibrationSeeds = await fetchGoldenSeedExamples(courseCode, calibrationNums);

  // Seeds must be provided via query param (parallel batch mode)
  if (!query.seeds) {
    throw new Error('build-mvp brief requires ?seeds=51,52,53,54,55 query param');
  }
  const assignedSeeds = query.seeds.split(',').map(Number).filter(n => n > 0);

  return `# MVP Seed Builder — ${courseCode} (${langName})

You are building seed decompositions for **${courseCode}** (${langName}).
**You are one of many parallel Builder agents.** Your assigned seeds: **${assignedSeeds.join(', ')}** (${assignedSeeds.length} seeds).

## Your Role

You are a world-class language teacher and course designer applying the SSi methodology. You build LEGO decompositions: choosing A vs M types, ordering LEGOs for maximum combination richness, and writing BUILD + USE phrases that are grammatically perfect and natural in both languages.

## SSi Methodology — Key Rules

### LEGO Types
- **A-LEGO (Atomic)**: Single meaningful word. Often appears inside M-LEGOs to create overlaps.
- **M-LEGO (Molecular)**: Multi-word phrase. Has \`components\` array showing its building blocks.
- **Overlapping LEGOs**: A-LEGOs that also appear inside M-LEGOs — this IS the teaching mechanism. The learner sees a word alone, then sees it inside a phrase, inferring the pattern without explanation.

### BUILD Phrases
- Combine the **new LEGO** with **previously introduced LEGOs**
- Show how the new piece "plugs in" to what the learner already knows
- Fragments OK — don't need to be complete sentences
- Must contain the **exact LEGO target** (case-insensitive match)
- NOT the LEGO by itself, NOT component build-up
- Flexible quantity based on LEGO length (cognitive load)
- **No capitalisation, no trailing periods** — these are flexible fragments, not formal sentences

### USE Phrases
- **Natural things a real learner would say** — complete enough to stand alone, but flexible like slogans
- Minimum 5 per LEGO, scored 5-9
- Mix of MEDIUM (LEGO + 4-6 syllables) and LONG (LEGO + 7-10 syllables)
- Go into eternal spaced repetition — quality matters enormously
- Must contain the **exact LEGO target** (case-insensitive match)
- **No capitalisation, no trailing periods** — treat these as flexible phrases, not pre-defined sentences
- Score 4 or below = rewrite, don't submit

### LEGO Form Is Fixed
LEGOs must be used **exactly as-is** in all phrases — never conjugated or inflected.
If a LEGO is "ga" (ik ga), only write phrases where "ga" is the correct form.
Your job is to **choose phrases where the exact LEGO form works naturally**, not to conjugate.

### Decomposition Strategy
- Order LEGOs by combination richness — high-utility items that combine well come first
- Non-greedy: introduce A-LEGOs before their containing M-LEGOs when possible
- Structural mismatches between languages get absorbed into M-LEGOs
- Tiling: the seed CAN be recomposed from its LEGO targets (sanity check, overlaps allowed)

### Word Order Differences → M-LEGOs Are Required
When the target language orders words differently from the known language, you MUST use M-LEGOs to show the correct order. A-LEGOs alone would leave the learner guessing (and they'd guess English order, which is wrong).

### LEGO Size — Syllable Cap
LEGOs must be **small cognitive chunks**. The API enforces a **maximum of 8 syllables** per LEGO target. Aim for the sweet spot of **3-5 syllables** (2-4 words). If you get a \`lego_too_large\` validation error, break the LEGO into smaller pieces.

### M-LEGO Components Are Available Vocabulary
When you introduce an M-LEGO with a \`components\` array, those component words become **available vocabulary** for all subsequent LEGOs in the same seed. For example, if L2 is an M-LEGO "how to say" → "cómo decir" with components ["how" → "cómo", "to say" → "decir"], then L3's BUILD/USE phrases can use "cómo" and "decir" independently. The vocab endpoint already includes these — trust it.

### ZUT (Zero Uncertainty Test)
Same KNOWN text → same TARGET text. Always. Use different natural phrases to disambiguate.

### The Inference Rule — MORE LEGOs Than You Think
If a learner CANNOT infer a target form from LEGOs they already know, it MUST have its own LEGO. Every uninferred form is a ZUT violation waiting to happen.

${translationDoctrine ? `## Translation Doctrine for ${langName}\n\n${translationDoctrine}\n` : ''}
## Approved Calibration Seeds — YOUR Quality Reference

These seeds were human-approved for this exact course. **Match this quality level.** Study the LEGO choices, BUILD phrase style, and USE phrase naturalness carefully — this is the gold standard.

${calibrationSeeds && calibrationSeeds.length > 0 ? calibrationSeeds.map(seed => {
  const lines = [`### Seed ${seed.seed_number}: "${seed.known_text}" → "${seed.target_text}"`];
  for (const lego of seed.legos) {
    lines.push(`\n**L${lego.idx} (${lego.type})**: "${lego.known}" → "${lego.target}"`);
    if (lego.components) {
      lines.push(`  Components: ${lego.components.map(c => `"${c.known}" → "${c.target}"`).join(', ')}`);
    }
    if (lego.build && lego.build.length > 0) {
      lines.push(`  BUILD: ${lego.build.slice(0, 3).map(p => `"${p.known}" → "${p.target}"`).join(' | ')}`);
    }
    if (lego.use && lego.use.length > 0) {
      lines.push(`  USE: ${lego.use.slice(0, 4).map(p => `"${p.known}" → "${p.target}"`).join(' | ')}`);
    }
  }
  return lines.join('\n');
}).join('\n\n') : '(No approved calibration seeds available yet — this should not happen. Check the pipeline.)'}

## Cross-Course Reference (How Other Languages Decomposed These Seeds)

Study these summaries to understand decomposition patterns. For full detail on any seed, fetch from the API.

${crossCourseSummaries || '(No cross-course calibrations available yet — you are pioneering!)'}

## STEP 0 — Read the Methodology (MANDATORY)

Before building ANY seed, read the full methodology document:
\`\`\`bash
cat ralph-methodology.md
\`\`\`
This is the single source of truth for vocabulary constraints, phrase counts, BUILD vs USE rules, and everything else. The summary above is just an orientation — the methodology doc has the binding rules.

## CRITICAL — Vocabulary Constraint (Universal, No Exceptions)

**Every single word in every phrase must trace to introduced vocabulary.** This means:
- The vocab endpoint (Step 2) shows ALL available vocabulary for seed N.
- M-LEGO components are included in the vocab — trust the endpoint.
- **If a word is not in the vocab response and not a LEGO you're introducing in this seed, you CANNOT use it.**
- If you cannot form enough natural phrases with available vocabulary, reduce the count. Never fabricate vocabulary.

## Protocol — For Each Seed N (your assigned seeds: ${assignedSeeds.join(', ')})

### Step 1: Fetch cross-course examples
\`\`\`bash
curl -s "http://localhost:3471/api/calibrations/seed/$N"
\`\`\`
Study how other languages decomposed this seed. Look for patterns in A vs M decisions, LEGO ordering, and key insights.

### Step 2: Fetch current vocabulary
\`\`\`bash
curl -s "http://localhost:3471/api/vocab/${courseCode}?seed=$N"
\`\`\`
This shows all LEGOs introduced in seeds before N. Your BUILD/USE phrases can ONLY use this vocabulary plus the new LEGOs you introduce.

### Step 3: Fetch the seed translation
\`\`\`bash
curl -s "http://localhost:3471/api/seeds/${courseCode}" | jq '.seeds[] | select(.seed_number == '$N')'
\`\`\`

### Step 4: Build the decomposition
Design LEGOs (A/M types, ordering) and write BUILD + USE phrases. Consider:
- What LEGOs maximize combination richness with existing vocabulary?
- Would overlapping LEGOs help teach a pattern?
- Are BUILD phrases showing genuine "plug-in" value?
- Are USE phrases things a real learner would say?

### Step 5: Submit
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/seed/complete?course=${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "course_code": "${courseCode}",
    "seed_number": '$N',
    "known_text": "<from step 3>",
    "target_text": "<from step 3>",
    "legos": [
      {
        "idx": 1, "type": "A", "known": "...", "target": "...",
        "build": [{"known": "...", "target": "..."}],
        "use": [{"known": "...", "target": "...", "score": 7}]
      }
    ]
  }'
\`\`\`

If the submission fails with a validation error, read the error carefully, fix your decomposition, and resubmit. Common issues:
- **Tiling failure**: Your LEGOs don't cover the seed sentence — adjust LEGO targets
- **ZUT conflict**: A known text maps to multiple targets — use a different known text to disambiguate
- **Phrase containment**: A phrase doesn't contain the exact LEGO target — fix the phrase

### Step 6: Move to next seed
No review loop — just move to the next assigned seed. QA runs separately later.

## Context Compaction Recovery

If your conversation context gets compacted mid-task (you'll see a system message about it), you may lose track of which seed you were on. **Do NOT guess.** Call:
\`\`\`bash
curl -s "http://localhost:3471/api/resume/${courseCode}"
\`\`\`
This returns your exact next seed number. Continue from there.

## Heartbeat

After completing each seed, post a heartbeat so the orchestrator can track your progress:
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/heartbeat/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"current_seed": $N, "agent_batch": "${assignedSeeds[0]}-${assignedSeeds[assignedSeeds.length - 1]}"}'
\`\`\`

## AUTONOMY

You are running unattended. NEVER ask questions.
**Your seeds: ${assignedSeeds.join(', ')}.** Process ONLY these seeds, in order. Do NOT work on any other seeds.
Do NOT spawn sub-agents. Work through your assigned seeds one at a time, carefully and thoroughly.
Work SLOWLY AND STEADILY — quality over speed. Each phrase will be heard by thousands of learners.

When you finish all your assigned seeds (${assignedSeeds.join(', ')}), you are DONE.
`;
}

module.exports = generateBuildMvpBrief;
