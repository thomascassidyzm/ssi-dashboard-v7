/**
 * Brief: REDO AGENT — Lightweight single agent that rebuilds specific seeds.
 * Unlike build-team-creator, this agent submits directly to /api/seed/complete.
 * No creator/checker split needed for targeted rebuilds.
 */

const { getSupabase, getLanguageName, getGoldenSeedCount, buildCrossCourseSummaries, fetchGoldenSeedExamples, buildGrammarChecklist, loadCondensedMethodology } = require('./shared.cjs');
const { latestSnapshots, formatSnapshotForBrief } = require('../course-builder/lib/redo-snapshot.cjs');

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

  // The decomposition being replaced. The redo endpoint deletes the live rows
  // before spawning this agent, so the snapshot written just before that delete
  // is the only copy — without it, a note like "make this less formal" has no
  // "this" to act on. Best-effort: an older redo (pre-snapshot) simply has none.
  let previousSection = '';
  try {
    const snaps = await latestSnapshots(supabase, courseCode, seedNumbers);
    const rendered = seedNumbers
      .map(n => formatSnapshotForBrief(snaps.get(n)))
      .filter(Boolean);
    if (rendered.length) {
      previousSection = `## The Decomposition You Are Replacing

This is what these seeds looked like BEFORE this redo — the version the human was looking at when they asked for the change. **Read the human notes above against it**: they are describing changes to THIS, not a spec written from scratch.

- Keep everything the notes do not ask you to change — same LEGO split, same phrasings — unless keeping it would break a methodology rule.
- Change what the notes ask for, and anything that rule-checks as wrong.
- If the notes are empty, treat the previous version as a draft to improve, not as a thing to reproduce.

${rendered.join('\n\n')}

`;
    }
  } catch (err) {
    console.error(`[REDO BRIEF] could not load previous decomposition for ${courseCode}: ${err.message}`);
  }

  return `# Redo Agent — ${courseCode} (${langName})

You are rebuilding **${seedNumbers.length} seed(s)** for **${courseCode}** (${langName}).
**Seeds to redo: ${seedNumbers.join(', ')}**
${notes ? `\n**Human notes:** ${notes}\n` : ''}

${previousSection}## Your Workflow

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
If a "Decomposition You Are Replacing" section appears above, start from that version and apply the human notes to it — do not rewrite from scratch what nobody asked you to change.

### Step 4: Submit directly to the API
\`\`\`bash
curl -X POST "http://localhost:3471/api/seed/complete?course=${courseCode}" \\
  -H "Content-Type: application/json" \\
  -H "X-Agent-Role: redo" \\
  -H "X-Agent-Id: redo-${courseCode}" \\
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

### If a requested change cannot be made validly

Not asking questions does NOT mean silently dropping a request. If something in the
human notes cannot be done without breaking a methodology rule — it would create a ZUT
collision, need vocabulary that hasn't been introduced yet, break tiling or the syllable
cap, or otherwise fail the rails — do NOT quietly ignore it, and do NOT fudge it with a
near-miss you hope passes. Do the parts you can, then say plainly what you could not do
and why, in the chat post above (the requester's only window on this work):

\`\`\`bash
curl -s -X POST "http://localhost:3471/api/orchestrator/chat/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"role":"agent","message":"NOT DONE — seed [N]: [what was asked] could not be applied because [rule it breaks]. I did [what you did instead]."}'
\`\`\`

The person who asked for this redo is often outside the building and will never see your
terminal. An instruction that was not followed and not reported reads to them as an
instruction that was followed. Say it every time, once per unfollowable request.
`;
}

module.exports = generateRedoBrief;
