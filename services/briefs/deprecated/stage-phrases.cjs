/**
 * Stage: PHRASES — Sonnet sub-agents generate BUILD + USE phrases for finalized LEGOs.
 * This is the key fix: provides golden examples, JSON format, scoring rules, and vocab instructions.
 */

const { getSupabase, getLanguageName, getGoldenSeedCount, fetchGoldenSeedExamples, formatGoldenPhraseExamples, formatBatchAssignments } = require('./shared.cjs');

async function generatePhraseBrief(courseCode) {
  const supabase = getSupabase();
  const langName = getLanguageName(courseCode);

  // Get course info
  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, seed_count, quality_rules')
    .eq('course_code', courseCode)
    .single();

  const goldenCount = getGoldenSeedCount(courseInfo);

  // Count new LEGOs needing phrases
  const { data: newLegos } = await supabase
    .from('course_legos')
    .select('id, seed_number, lego_index, type, known_text, target_text')
    .eq('course_code', courseCode)
    .eq('is_new', true)
    .gte('seed_number', goldenCount + 1)
    .order('seed_number')
    .order('lego_index');

  // Count LEGOs that already have phrases
  const { count: legosWithPhrases } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .gte('seed_number', goldenCount + 1);

  const totalNewLegos = newLegos?.length || 0;
  // Rough estimate — unique seed+lego combos with phrases
  const done = legosWithPhrases || 0;
  const remaining = Math.max(0, totalNewLegos - done);

  // Build batch assignments from actual LEGOs
  const legoItems = (newLegos || []).map(l => `S${l.seed_number}L${l.lego_index}`);
  const batches = formatBatchAssignments(legoItems, 10);
  const agentCount = batches.length;

  const batchAssignments = batches.map(b =>
    `Agent ${b.index}: ${b.items.join(', ')} (${b.items.length} LEGOs)`
  ).join('\n');

  // Fetch golden examples for phrase patterns
  const goldenNums = [];
  for (let i = 1; i <= Math.min(5, goldenCount); i++) goldenNums.push(i);
  const goldenSeeds = await fetchGoldenSeedExamples(courseCode, goldenNums);
  const goldenExamples = formatGoldenPhraseExamples(goldenSeeds);

  return `# Stage: PHRASES — ${courseCode}

## Current State
- Total new LEGOs needing phrases: ${totalNewLegos}
- LEGOs already with phrases: ${done}
- Remaining: ${remaining}

## Action
Spawn ${agentCount} Sonnet sub-agents (~10 LEGOs each) via Task tool.
ALL in a SINGLE message for parallel execution.

subagent_type: "general-purpose", model: "sonnet", run_in_background: true

## Batch Assignments
${batchAssignments}

## Sub-Agent Prompt Template

Give each sub-agent EXACTLY this prompt (replace {LEGO_LIST} with their assignments):

---BEGIN PROMPT---
You are a world-class ${langName} language teacher generating practice phrases for ${courseCode}.

Your LEGOs: {LEGO_LIST}

## What You're Building

You're creating practice material for language learners. Each LEGO is a "teaching chunk" — a word or phrase the learner is about to learn. You create two types of practice:

**BUILD phrases (5+):** Short fragments that let the learner practise the new LEGO with words they already know. These are stepping stones — they don't need to be full sentences. Examples: "want to speak", "speak German", "I want to speak". No capitalisation, no trailing periods.

**USE phrases (12+):** Natural things a real person would say — flexible like slogans, not pre-defined sentences. The learner combines everything they've learned into real speech. Must average 12+ syllables. Scored 5-9 for difficulty. No capitalisation, no trailing periods.

## Rules (server enforces these — violations = rejection)

1. **Containment**: Every phrase target MUST contain the LEGO's target text as an exact substring (same form, not conjugated differently)
2. **Vocabulary**: Every word in the target phrase (lowercased) must be in the learner's vocab. Check: GET http://localhost:3471/api/vocab/${courseCode}?seed=N (returns comma-separated — split on commas)
3. **Grammar**: Must be grammatically correct ${langName}. Watch for: article agreement, verb conjugation, word order, case endings
4. **Naturalness**: Would a native speaker actually say this? Avoid textbook-sounding or stilted phrases

## API
- Check vocab before writing: GET http://localhost:3471/api/vocab/${courseCode}?seed=N
- Fetch your LEGOs: GET http://localhost:3471/api/legos/${courseCode}?seed=N
- Submit: POST http://localhost:3471/api/v2/phrases/${courseCode} (JSON body)

## JSON Format

\`\`\`json
{
  "phrases": [
    {
      "seed_number": 51,
      "lego_index": 1,
      "build": [
        { "known": "speak German", "target": "Deutsch sprechen" },
        { "known": "want to speak German", "target": "Deutsch sprechen möchte" }
      ],
      "use": [
        { "known": "I want to speak German with you", "target": "ich möchte Deutsch mit dir sprechen", "known_score": 6, "target_score": 7 },
        { "known": "she wants to speak German every day", "target": "sie möchte jeden Tag Deutsch sprechen", "known_score": 7, "target_score": 8 }
      ]
    }
  ]
}
\`\`\`

## Scoring Guide
- **known_score**: How common is the English? 5=everyday ("I want"), 7=moderately complex ("she mentioned"), 9=advanced ("had I not been")
- **target_score**: How complex is the target? 5=short/simple (4-6 words), 7=medium (7-10 words), 9=long/complex (11+ words)
- Aim for a MIX of scores — don't make everything a 7

## Golden Examples From This Course
${goldenExamples}

## Workflow
1. For each LEGO: fetch vocab for that seed number
2. Write BUILD phrases (5+) — short, use the LEGO + known vocab
3. Write USE phrases (12+) — full sentences, natural, scored
4. Submit the batch
5. If rejected: read the error message carefully, fix the specific issue, resubmit

Overgenerate — aim for 6 BUILD and 15 USE per LEGO. The server validates and rejects bad ones.
Never ask questions. Fix errors and retry.
---END PROMPT---

## Monitor
Poll: GET http://localhost:3471/api/v2/phrases/progress/${courseCode}
Track: \`completed\` field
Target: completed >= ${totalNewLegos}

## Stall Metric
\`completed\` not increasing for 3 polls (4.5 min) → check which LEGOs lack phrases, spawn replacements
`;
}

module.exports = generatePhraseBrief;
