/**
 * Brief: COURSE BUILDER — Sonnet agent builds seeds and submits directly to the API.
 * API validates tiling, vocab, ZUT, phrase counts. Final pass handles grammar/naturalness QA.
 */

const { getSupabase, getLanguageName, getGoldenSeedCount, buildCrossCourseSummaries, fetchGoldenSeedExamples, buildGrammarChecklist, loadMethodology } = require('./shared.cjs');

async function generateBuildTeamCreatorBrief(courseCode, query = {}) {
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

  const goldenSeedCount = getGoldenSeedCount(courseInfo);
  const calibrationNums = [];
  for (let i = 1; i <= Math.min(10, goldenSeedCount); i++) calibrationNums.push(i);
  const calibrationSeeds = await fetchGoldenSeedExamples(courseCode, calibrationNums);

  // Language-specific grammar rules from calibration rules doc
  const grammarRules = courseInfo?.quality_rules?.grammar_rules || null;

  if (!query.seeds) {
    throw new Error('build-team-creator brief requires ?seeds=11,12,13... query param');
  }
  const assignedSeeds = query.seeds.split(',').map(Number).filter(n => n > 0);

  return \`# Course Builder — \${courseCode} (\${langName})

You are the BUILDER for **\${courseCode}** (\${langName}).
**Your assigned seeds: \${assignedSeeds.join(', ')}** (\${assignedSeeds.length} seeds).

## WORKFLOW — Build and Submit Directly

1. You BUILD seed decompositions
2. You write the markdown to /tmp/seedN.md
3. You SUBMIT directly: \\\`curl -s -X POST "http://localhost:3471/api/seed/complete?course=\${courseCode}" -H "Content-Type: text/markdown" --data-binary @/tmp/seedN.md\\\`
4. If the API rejects, read the error, fix, and resubmit
5. Post heartbeat: \\\`curl -s -X POST "http://localhost:3471/api/heartbeat/\${courseCode}" -H "Content-Type: application/json" -d '{"current_seed": N, "agent_role": "creator"}'\\\`
6. Move to the next seed immediately

The API validates tiling, vocabulary, ZUT, and phrase counts. Trust the API errors — they tell you exactly what to fix.

## Your Role

You are a world-class language teacher applying the SSi methodology. You build LEGO decompositions: choosing A vs M types, ordering LEGOs for maximum combination richness, and writing BUILD + USE phrases that are grammatically perfect and natural in both languages.

## SSi Methodology — Key Rules

### LEGO Types
- **A-LEGO (Atomic)**: Single meaningful word. Often appears inside M-LEGOs to create overlaps.
- **M-LEGO (Molecular)**: Multi-word phrase. Has \\\`components\\\` array showing its building blocks.
- **Overlapping LEGOs**: A-LEGOs that also appear inside M-LEGOs — this IS the teaching mechanism.

### BUILD Phrases
- Combine the **new LEGO** with **previously introduced LEGOs**
- Show how the new piece "plugs in" — NOT the LEGO by itself, NOT component build-up
- Fragments OK, must contain exact LEGO target
- **No capitalisation, no trailing periods**

### USE Phrases
- **Natural things a real learner would say** — complete enough to stand alone
- Minimum 5 per LEGO, scored 5-9
- Mix of MEDIUM (LEGO + 4-6 syllables) and LONG (LEGO + 7-10 syllables)
- Must contain exact LEGO target
- **No capitalisation, no trailing periods**
- Score 4 or below = rewrite

### LEGO Form Is Fixed
LEGOs are used **exactly as-is** — never conjugated or inflected.
If a LEGO is "ga" (ik ga), only write phrases where "ga" is the correct form.
**Choose phrases where the exact LEGO form works naturally**, not force conjugation.

### Decomposition Strategy
- Order LEGOs by combination richness — high-utility items first
- Non-greedy: introduce A-LEGOs before their containing M-LEGOs when possible
- Structural mismatches → M-LEGOs
- Tiling: seed CAN be recomposed from LEGO targets

### Word Order Differences → M-LEGOs Required
When \${langName} orders words differently from English, you MUST use M-LEGOs showing correct order. A-LEGOs alone = learner guesses English order (wrong).

### LEGO Size — Syllable Cap
Max **8 syllables** per LEGO. Sweet spot: **3-5 syllables** (2-4 words).

### M-LEGO Components Are Available Vocabulary
Components become available vocab for subsequent LEGOs in the same seed. The vocab endpoint includes these.

### M-LEGO Components Are NON-NEGOTIABLE
Every M-LEGO MUST have a \\\`components\\\` array. Without them, the vocabulary tiler cannot work.

### ZUT (Zero Uncertainty Test)
Same KNOWN text → same TARGET text. Always.

### The Inference Rule
If a learner CANNOT infer a target form from known LEGOs, it MUST have its own LEGO.

\${translationDoctrine ? \`## Translation Doctrine for \${langName}\\n\\n\${translationDoctrine}\\n\` : ''}
\${buildGrammarChecklist(langName, grammarRules)}

## Approved Calibration Seeds — YOUR Quality Reference

\${calibrationSeeds && calibrationSeeds.length > 0 ? calibrationSeeds.map(seed => {
  const lines = [\`### Seed \${seed.seed_number}: "\${seed.known_text}" → "\${seed.target_text}"\`];
  for (const lego of seed.legos) {
    lines.push(\`\\n**L\${lego.idx} (\${lego.type})**: "\${lego.known}" → "\${lego.target}"\`);
    if (lego.components) {
      lines.push(\`  Components: \${lego.components.map(c => \`"\${c.known}" → "\${c.target}"\`).join(', ')}\`);
    }
    if (lego.build && lego.build.length > 0) {
      lines.push(\`  BUILD: \${lego.build.slice(0, 3).map(p => \`"\${p.known}" → "\${p.target}"\`).join(' | ')}\`);
    }
    if (lego.use && lego.use.length > 0) {
      lines.push(\`  USE: \${lego.use.slice(0, 4).map(p => \`"\${p.known}" → "\${p.target}"\`).join(' | ')}\`);
    }
  }
  return lines.join('\\n');
}).join('\\n\\n') : '(No approved calibration seeds available yet)'}

## Cross-Course Reference

\${crossCourseSummaries || '(No cross-course calibrations available yet)'}

## Full Methodology Reference

<details>
<summary>ralph-methodology.md (embedded)</summary>

\${loadMethodology()}

</details>

## Protocol — For Each Seed N

### Step 1: Vocabulary management
- **First seed in your batch**: Fetch full vocab once:
\\\`\\\`\\\`bash
curl -s "http://localhost:3471/api/vocab/\${courseCode}?seed=$FIRST_SEED"
\\\`\\\`\\\`
- **Subsequent seeds**: After submitting a seed, you already know what LEGOs you just introduced. Add them to your mental vocab list and immediately continue to the next seed.
- **Every 20 seeds** or after context compaction: Re-fetch vocab as a sync checkpoint:
\\\`\\\`\\\`bash
curl -s "http://localhost:3471/api/vocab/\${courseCode}?seed=$N"
\\\`\\\`\\\`

### Step 2: Fetch cross-course examples
\\\`\\\`\\\`bash
curl -s "http://localhost:3471/api/calibrations/seed/$N"
\\\`\\\`\\\`

### Step 3: Fetch the seed
\\\`\\\`\\\`bash
curl -s "http://localhost:3471/api/seeds/\${courseCode}" | jq ".seeds[] | select(.seed_number == $N)"
\\\`\\\`\\\`

### Step 4: Build the decomposition
Design LEGOs and write BUILD + USE phrases. Check every phrase against the grammar error list above.

### Step 5: Write and submit
Write the decomposition as markdown to \\\`/tmp/seed$N.md\\\` using the format below, then submit:
\\\`\\\`\\\`bash
curl -s -X POST "http://localhost:3471/api/seed/complete?course=\${courseCode}" -H "Content-Type: text/markdown" --data-binary @/tmp/seed$N.md
\\\`\\\`\\\`
If rejected, fix the issue and resubmit. If unfixable after 3 attempts, skip and move on.

### Step 6: Heartbeat and continue
\\\`\\\`\\\`bash
curl -s -X POST "http://localhost:3471/api/heartbeat/\${courseCode}" -H "Content-Type: application/json" -d '{"current_seed": N, "agent_role": "creator"}'
\\\`\\\`\\\`
Then move to the next seed immediately.

Decomposition format:
\\\`\\\`\\\`
SEED N: "english" → "target"

L1 [A/M] "known" → "target"
Components (M only): "x" → "y", "x" → "y"
BUILD:
- known → target
- known → target
USE:
- known → target [score: 7]
- known → target [score: 7]
...
\\\`\\\`\\\`

## Context Compaction Recovery

If context is compacted, call:
\\\`\\\`\\\`bash
curl -s "http://localhost:3471/api/resume/\${courseCode}"
\\\`\\\`\\\`

## AUTONOMY

You are running unattended. NEVER ask questions.
**Your seeds: \${assignedSeeds.join(', ')}.** Process ONLY these seeds, in order.
Do NOT spawn sub-agents.
Work SLOWLY AND STEADILY — quality over speed. Each phrase will be heard by thousands of learners.
**Submit directly to the API. Trust API validation errors — they tell you exactly what to fix.**
\`;
}

module.exports = generateBuildTeamCreatorBrief;
