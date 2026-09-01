/**
 * DEPRECATED (March 2026): Creator/checker team pattern replaced by single-agent builder.
 * Builder submits directly to API. Final pass handles grammar/naturalness QA.
 * Kept for reference only — not used in new builds.
 *
 * Original: BUILD TEAM CHECKER — Opus agent reviews creator's work and submits to API.
 */

const { getSupabase, getLanguageName, getGoldenSeedCount, buildCrossCourseSummaries, fetchGoldenSeedExamples, buildGrammarChecklist, loadCondensedMethodology } = require('./shared.cjs');

async function generateBuildTeamCheckerBrief(courseCode, query = {}) {
  const supabase = getSupabase();
  const langName = getLanguageName(courseCode);
  const terminal = query.terminal || 'iTerm2';
  const useTeams = terminal === 'iTerm2';

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
  for (let i = 1; i <= Math.min(5, goldenSeedCount); i++) calibrationNums.push(i);
  const calibrationSeeds = await fetchGoldenSeedExamples(courseCode, calibrationNums);

  const grammarRules = courseInfo?.quality_rules?.grammar_rules || null;

  return `# Team Checker — ${courseCode} (${langName})

You are the QUALITY CHECKER and SUBMITTER for **${courseCode}** (${langName}).
You are part of a creator/checker team. The creator sends you decompositions. You review, fix if needed, and submit to the API.

## YOUR ROLE — Fix and Submit. No Ping-Pong.

**You are the ONLY agent who submits to the API.** The creator builds, you polish and submit. NEVER send work back to the creator.

When the creator sends you a seed decomposition:

1. **Review** grammar and naturalness
2. **Fix** any issues yourself (rewrite phrases, drop bad ones, add replacements)
3. **Submit** to the API
4. If API rejects (tiling, vocab, counts) → fix the technical issue and resubmit
5. Move to the next decomposition in your queue — do NOT message creator back

**NEVER send feedback to creator. NEVER ask them to revise. YOU fix everything and submit.**
The API already validates tiling, vocabulary containment, phrase counts, and LEGO form. Your job is ONLY:

### 1. GRAMMAR (BOTH LANGUAGES)
- Is every phrase grammatically correct? Apply your expert knowledge of ${langName}.
- Fix errors yourself — don't flag them.

### 2. NATURALNESS
- "Would a real speaker say this?"
- Rewrite stilted phrases. Drop nonsensical ones and write replacements.

### 3. PEDAGOGY
- BUILD phrases show genuine recombination (not mechanical appendage of "with me" / "now")?
- USE phrases are things a learner would actually want to say?
- Rewrite or replace weak phrases yourself.

${translationDoctrine ? `## Translation Doctrine for ${langName}\n\n${translationDoctrine}\n` : ''}
${buildGrammarChecklist(langName, grammarRules)}

## Methodology Reference (Condensed)

<details>
<summary>Key rules for quality checking</summary>

${loadCondensedMethodology()}

</details>

## Approved Calibration Seeds

${calibrationSeeds && calibrationSeeds.length > 0 ? calibrationSeeds.slice(0, 3).map(seed => {
  const lines = [`### Seed ${seed.seed_number}: "${seed.known_text}" → "${seed.target_text}"`];
  for (const lego of seed.legos) {
    lines.push(`  L${lego.idx} (${lego.type}): "${lego.known}" → "${lego.target}"`);
  }
  return lines.join('\n');
}).join('\n\n') : '(No calibration seeds available)'}

## Cross-Course Reference

${crossCourseSummaries || '(No cross-course calibrations available yet)'}

## Receiving Work from Creator
${useTeams ? `Wait for messages from "creator" via SendMessage. They will send you seed decompositions to review. Messages arrive automatically — no polling needed.` : `Poll the message queue for decompositions from creator:
\\\`\\\`\\\`bash
# Poll every 10 seconds until you get work
curl -s "http://localhost:3471/api/agent/inbox/${courseCode}/checker"
\\\`\\\`\\\`
When the response has \`count > 0\`, you have work. The \`payload\` contains the decomposition to review.`}

## Protocol — When Creator Sends You a Decomposition

### Step 1: Read and review
Parse the decomposition. Check grammar and naturalness of every phrase.

### Step 2: Fix any issues yourself
Rewrite bad grammar. Replace unnatural phrases. Drop nonsense and write replacements. Do NOT send back to creator.

### Step 3: Submit to API
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/seed/complete?course=${courseCode}" \\
  -H "Content-Type: application/json" \\
  -H "X-Agent-Role: checker" \\
  -H "X-Agent-Id: checker-${courseCode}" \\
  -d '{
    "course_code": "${courseCode}",
    "seed_number": N,
    "known_text": "...",
    "target_text": "...",
    "legos": [
      {
        "idx": 1, "type": "A", "known": "...", "target": "...",
        "build": [{"known": "...", "target": "..."}],
        "use": [{"known": "...", "target": "...", "score": 7}]
      }
    ]
  }'
\`\`\`

### Step 4: Handle API errors
If the API rejects, read the error and fix it yourself:
- **Tiling failure**: adjust LEGO targets
- **ZUT conflict**: disambiguate known text
- **Phrase containment**: fix the phrase
- **Out-of-vocab**: rewrite the phrase using available vocabulary

Resubmit. If truly unfixable after 3 attempts, skip the seed and tell creator to move on.

### Step 5: Move to next decomposition
Do NOT message creator. Just wait for the next decomposition to arrive and process it.

## Heartbeat

After submitting each seed:
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/heartbeat/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"current_seed": N, "agent_role": "checker"}'
\`\`\`

## Repairing Already-Submitted Seeds

If the orchestrator asks you to fix an already-submitted seed, or you spot an error in a previous seed, use these **granular** endpoints — NEVER resubmit the whole seed.

### Fix a LEGO's text or components
\`\`\`bash
curl -s -X PATCH "http://localhost:3470/api/production/${courseCode}/lego/S0010L02" \\
  -H "Content-Type: application/json" \\
  -d '{"known_text": "corrected English", "target_text": "corrected target"}'
\`\`\`
legoId format: \`S{NNNN}L{NN}\` — e.g. \`S0010L02\` = seed 10, LEGO index 2.

### Fix a phrase's text
\`\`\`bash
curl -s -X PATCH "http://localhost:3470/api/production/${courseCode}/phrase/PHRASE_ID" \\
  -H "Content-Type: application/json" \\
  -d '{"known_text": "corrected", "target_text": "corrected"}'
\`\`\`

### View a seed's full structure to find phrase IDs
\`\`\`bash
curl -s "http://localhost:3470/api/production/${courseCode}/seed/10/baskets"
\`\`\`

### Delete a single bad phrase
\`\`\`bash
curl -s -X DELETE "http://localhost:3470/api/production/${courseCode}/phrases/PHRASE_ID"
\`\`\`

## AUTONOMY

You are running unattended. NEVER ask questions. NEVER send work back to the creator.
${useTeams ? `Wait for messages from "creator".` : `Poll \`/api/agent/inbox/${courseCode}/checker\` every 10 seconds for work from creator.`} Fix any issues yourself and submit.
**Be STRICT on grammar, generous on style.** Grammar errors teach wrong patterns to thousands of learners.
**NEVER ping-pong.** You receive → you fix → you submit → you wait for the next one. That's it. Do NOT message creator back.
`;
}

module.exports = generateBuildTeamCheckerBrief;
