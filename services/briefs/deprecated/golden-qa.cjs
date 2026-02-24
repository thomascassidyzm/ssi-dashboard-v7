/**
 * Brief: GOLDEN QA — Parallel QA of golden seeds 11-50.
 * Extracted from generateStrictQABrief() in course-builder-api.cjs.
 */

const { getSupabase, getLanguageName, getGoldenSeedCount } = require('./shared.cjs');

async function generateGoldenQABrief(courseCode) {
  const supabase = getSupabase();
  const langName = getLanguageName(courseCode);

  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, seed_count, quality_rules')
    .eq('course_code', courseCode)
    .single();

  const goldenCount = getGoldenSeedCount(courseInfo);

  // 8 sub-agents × 5 seeds each = seeds goldenCount+1 to 50
  const batches = [];
  for (let start = goldenCount + 1; start <= 50; start += 5) {
    batches.push({ start, end: Math.min(start + 4, 50) });
  }
  const batchList = batches.map((b, i) =>
    `Batch ${i + 1}: seeds ${b.start}-${b.end} (${b.end - b.start + 1} seeds)`
  ).join('\n');

  return `# Parallel Golden QA — Seeds ${goldenCount + 1}-50 (${courseCode})

You are coordinating a parallel HIGH-STANDARD quality review of the golden seeds (${goldenCount + 1}-50) for course **${courseCode}** (${langName}).

Seeds 1-${goldenCount} are hand-calibrated by the course creator — do NOT QA those.

## CRITICAL: You are an ORCHESTRATOR, not a checker
- You do NOT check phrases yourself
- You spawn sub-agents using the Task tool and monitor their progress
- You report completion when all batches are checked

## Batch Assignments

${batchList}

## Step 1: Spawn ALL Sub-Agents In One Message

**CRITICAL: You MUST send ALL Task tool calls in a SINGLE message.** Do NOT spawn one, wait, then spawn the next. Send one message containing one Task tool call per batch — all at once. This is how parallel execution works. If you spawn them sequentially the QA will take 10x longer.

For each batch, use this prompt template (customize START/END for each):

---BEGIN SUB-AGENT PROMPT---
You are a HIGH-STANDARD quality reviewer for course ${courseCode} (${langName}). You are checking ALL phrases (BUILD and USE) for seeds {START} to {END}.

## Your Four Checks

For each phrase pair (known_text + target_text), apply ALL four checks:

### 1. GRAMMAR (BOTH LANGUAGES) — MOST IMPORTANT
Is the phrase grammatically correct in BOTH English and ${langName}?
- Flag: ANY grammar error in either language — wrong verb form, wrong pronoun, missing elision, wrong mood, agreement errors
- Flag: wrong preposition, missing negation word, wrong pronoun placement, gender/number agreement
- If a native speaker of either language would notice an error, flag it
- Grammar errors teach learners wrong patterns — this is the #1 quality gate

### 2. NATURALNESS
Would a real person say this in conversation?
- Flag: stilted, textbook-sounding, or contrived phrases
- Flag: semantic nonsense ("I'm starting to finish", "I want to feel tired")
- Flag: subject-object conflicts ("I like speaking with me"), time contradictions
- Keep: everyday speech, things learners would actually say

### 3. VARIETY
Are the phrases for each LEGO genuinely different?
- Flag: near-duplicates (same sentence with one word swapped)
- Flag: phrases that all follow the exact same template pattern
- Keep: phrases showing the LEGO in varied, surprising contexts

### 4. BUILD PHRASE QUALITY
Do BUILD phrases demonstrate meaningful recombination?
- Flag: BUILD phrases that are just the LEGO by itself with no combination
- Flag: BUILD phrases with meaningless filler (LEGO + "here" or LEGO + "please")
- Keep: BUILD phrases combining the new LEGO with previously introduced LEGOs

## CRITICAL RULES
- **IGNORE punctuation and capitalisation entirely** — these are spoken phrases
- **IGNORE missing accents/diacritics** — known normalization issue, not content errors
- **Grammar errors in EITHER language MUST be flagged** — primary quality gate
- **Do NOT be conservative.** The cost of a bad phrase reaching learners is far higher than over-flagging.

## Workflow

### Step 1: Fetch ALL phrases for your seed range
\`\`\`
OFFSET=0
while true; do
  RESULT=$(curl -s "http://localhost:3471/api/phrases/${courseCode}?seed_min={START}&seed_max={END}&limit=500&offset=$OFFSET")
  COUNT=$(echo "$RESULT" | jq '.count')
  echo "$RESULT"
  if [ "$COUNT" -lt 500 ]; then break; fi
  OFFSET=$((OFFSET + 500))
done
\`\`\`

### Step 2: Review every phrase
For each phrase, apply all four checks. If EITHER language fails ANY check, add to flags.

### Step 3: Submit flags (if any)
\`\`\`
curl -s -X POST "http://localhost:3471/api/qa/bulk-flag" \\
  -H "Content-Type: application/json" \\
  -d '{"flags": [
    {"course_code": "${courseCode}", "phrase_id": "<the phrase uuid>", "seed_number": <N>, "check_type": "<grammar|naturalness|variety|build_quality>", "severity": "<error for grammar, warning for others>", "issue": "<brief reason — say which language and what's wrong>", "details": {"known": "<known_text>", "target": "<target_text>", "phrase_role": "<build/use>"}},
    ...
  ]}'
\`\`\`

### Step 4: Mark range as checked
\`\`\`
curl -s -X POST "http://localhost:3471/api/qa/bulk-mark-checked" \\
  -H "Content-Type: application/json" \\
  -d '{"course_code": "${courseCode}", "seed_min": {START}, "seed_max": {END}}'
\`\`\`

## IMPORTANT
- Check EVERY phrase (BUILD and USE). Do not skip any.
- Check BOTH languages independently for every phrase.
- NEVER ask questions. Process all phrases and submit results.
---END SUB-AGENT PROMPT---

IMPORTANT: When spawning sub-agents via the Task tool:
- Use subagent_type: "general-purpose"
- Set run_in_background: true for each
- Use model: "sonnet" (Sonnet for language evaluation)
- Keep the description short: "QA seeds {start}-{end} for ${courseCode}"

## Step 2: Monitor Progress

After spawning all sub-agents, poll progress every 60 seconds:

\`\`\`
curl -s http://localhost:3471/api/qa/summary/${courseCode}
\`\`\`

This returns { phrases: { total, checked, unchecked, progress_percent }, flags: { total, open, errors, warnings } }.

Use the Bash tool with curl to poll. Wait 60 seconds between polls (use sleep 60).

When all 8 sub-agents have completed (check their output files), the QA pass is complete.

If progress stalls (no change for 5 minutes), check sub-agent output files and report the issue. If a sub-agent failed, spawn a replacement for its seed range.

## Step 3: Report

When all batches are checked, summarise:
- Total phrases checked across all sub-agents
- Flags raised (count) by category (grammar / naturalness / variety / build_quality)
- Grammar flags broken down by language (English errors vs ${langName} errors)
- Any seeds that are particularly weak overall
- Any batches that failed

## Step 4: Signal Completion

**CRITICAL**: After all sub-agents finish and you've summarised the results, you MUST call the completion endpoint so the dashboard knows Golden QA is done:

\`\`\`
curl -s -X POST "http://localhost:3471/api/qa/golden/complete/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"flags_total": <total_flags>, "phrases_checked": <total_phrases>}'
\`\`\`

This marks the golden_qa build_jobs record as complete. Without this call, the dashboard will not know QA finished.

## AUTONOMY
You are running unattended. NEVER ask questions.
- Make decisions yourself
- If a sub-agent fails, spawn a replacement
- Keep going until all batches are checked
- ALWAYS call the completion endpoint when done (Step 4)
`;
}

module.exports = generateGoldenQABrief;
