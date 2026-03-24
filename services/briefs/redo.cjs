/**
 * Brief: REDO AGENT — Lightweight single agent that rebuilds specific seeds.
 * Unlike build-team-creator, this agent submits directly to /api/seed/complete.
 * No creator/checker split needed for targeted rebuilds.
 */

const { getSupabase, getLanguageName, getGoldenSeedCount, buildCrossCourseSummaries, fetchGoldenSeedExamples, buildGrammarChecklist, loadCondensedMethodology } = require('./shared.cjs');

async function generateRedoBrief(courseCode, query = {}) {
  const supabase = getSupabase();
  const langName = getLanguageName(courseCode);

  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, seed_count, quality_rules, translation_analysis')
    .eq('course_code', courseCode)
    .single();

  const translationDoctrine = courseInfo?.quality_rules?.target_language_guidance
    ? JSON.stringify(courseInfo.quality_rules.target_language_guidance, null, 2)
    : null;

  const grammarRules = courseInfo?.quality_rules?.grammar_rules || null;

  // Fetch a few golden seeds as quality reference
  const goldenSeedCount = getGoldenSeedCount(courseInfo);
  const calibrationNums = [];
  for (let i = 1; i <= Math.min(5, goldenSeedCount); i++) calibrationNums.push(i);
  const calibrationSeeds = await fetchGoldenSeedExamples(courseCode, calibrationNums);

  if (!query.seeds) {
    throw new Error('redo brief requires ?seeds=1,2,3 query param');
  }
  const seedNumbers = query.seeds.split(',').map(Number).filter(n => n > 0);
  const notes = query.notes || '';

  return `# Redo Agent — ${courseCode} (${langName})

You are rebuilding **${seedNumbers.length} seed(s)** for **${courseCode}** (${langName}).
**Seeds to redo: ${seedNumbers.join(', ')}**
${notes ? `\n**Human notes:** ${notes}\n` : ''}

## Your Workflow

For each seed in order:

### Step 1: Fetch vocabulary
\`\`\`bash
curl -s "http://localhost:3471/api/vocab/${courseCode}?seed=$N"
\`\`\`

### Step 2: Fetch the seed
\`\`\`bash
curl -s "http://localhost:3471/api/seeds/${courseCode}" | jq ".seeds[] | select(.seed_number == $N)"
\`\`\`

### Step 3: Build the decomposition
Design LEGOs and write BUILD + USE phrases. Check every phrase against the grammar checklist below.

### Step 4: Submit directly to the API
\`\`\`bash
curl -X POST "http://localhost:3471/api/seed/complete?course=${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{ "course_code": "${courseCode}", "seed_number": N, "legos": [...] }'
\`\`\`

### Step 5: Move to next seed

## SSi Methodology — Key Rules

### LEGO Types
- **A-LEGO (Atomic)**: Single meaningful word. Often appears inside M-LEGOs.
- **M-LEGO (Molecular)**: Multi-word phrase. MUST have \`components\` array.

### BUILD Phrases
- Combine the **new LEGO** with **previously introduced LEGOs**
- Show how the new piece "plugs in" — NOT the LEGO by itself
- Fragments OK, must contain exact LEGO target
- **No capitalisation, no trailing periods**

### USE Phrases
- **Natural things a real learner would say** — complete enough to stand alone
- Minimum 5 per LEGO, scored 5-9
- Must contain exact LEGO target
- **No capitalisation, no trailing periods**

### LEGO Form Is Fixed
LEGOs are used **exactly as-is** — never conjugated or inflected.

### M-LEGO Components Are NON-NEGOTIABLE
Every M-LEGO MUST have a \`components\` array.

### LEGO Size — Syllable Cap
Max **8 syllables** per LEGO. Sweet spot: **3-5 syllables**.

### ZUT (Zero Uncertainty Test)
Same KNOWN text → same TARGET text. Always.

${translationDoctrine ? `## Translation Doctrine for ${langName}\n\n${translationDoctrine}\n` : ''}
${buildGrammarChecklist(langName, grammarRules)}

## Approved Calibration Seeds — Quality Reference

${calibrationSeeds && calibrationSeeds.length > 0 ? calibrationSeeds.map(seed => {
  const lines = [`### Seed ${seed.seed_number}: "${seed.known_text}" → "${seed.target_text}"`];
  for (const lego of seed.legos) {
    lines.push(`\n**L${lego.idx} (${lego.type})**: "${lego.known}" → "${lego.target}"`);
    if (lego.components) {
      lines.push(`  Components: ${lego.components.map(c => `"${c.known}" → "${c.target}"`).join(', ')}`);
    }
    if (lego.build && lego.build.length > 0) {
      lines.push(`  BUILD: ${lego.build.slice(0, 2).map(p => `"${p.known}" → "${p.target}"`).join(' | ')}`);
    }
    if (lego.use && lego.use.length > 0) {
      lines.push(`  USE: ${lego.use.slice(0, 3).map(p => `"${p.known}" → "${p.target}"`).join(' | ')}`);
    }
  }
  return lines.join('\n');
}).join('\n\n') : '(No approved calibration seeds available yet)'}

## Condensed Methodology Reference

<details>
<summary>SSi Methodology (condensed)</summary>

${loadCondensedMethodology()}

</details>

## Context Compaction Recovery

If context is compacted, call:
\`\`\`bash
curl -s "http://localhost:3471/api/resume/${courseCode}"
\`\`\`

## Chat Updates — IMPORTANT

A remote user is watching build progress via the dashboard chat. Post meaningful updates so they know the process is alive and healthy.

\`\`\`bash
curl -s -X POST "http://localhost:3471/api/orchestrator/chat/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"role":"agent","message":"YOUR MESSAGE"}'
\`\`\`

**When to post:**
1. **When you start**: "Redo started — rebuilding ${seedNumbers.length} seed(s): ${seedNumbers.join(', ')}"
2. **Every ~5 seeds** (or every ~5 minutes, whichever is less frequent): "Redo progress — [N]/${seedNumbers.length} seeds rebuilt so far. Latest: seed [N] ([N] LEGOs, [N] phrases)"
3. **When you finish**: "Redo complete — ${seedNumbers.length} seeds rebuilt. [N] LEGOs, [N] phrases total"

Keep messages concise but informative. The user can't see your terminal — chat is their only window into what you're doing.

## AUTONOMY

You are running unattended. NEVER ask questions.
**Your seeds: ${seedNumbers.join(', ')}.** Process ONLY these seeds, in order.
Do NOT spawn sub-agents.
Submit each seed directly to the API.
Work SLOWLY AND STEADILY — quality over speed.
`;
}

module.exports = generateRedoBrief;
