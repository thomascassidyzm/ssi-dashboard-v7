/**
 * Brief: FINAL PASS ORCHESTRATOR — Opus agent spawns Sonnet reviewers in parallel.
 * Reviewers report grammar issues. Orchestrator decides and executes deletions.
 *
 * Query params:
 *   ?seed_min=N&seed_max=N — override range (for full pass)
 *   ?seeds=4,17,22 — specific seed numbers (for targeted pass)
 *   ?agents=N — number of parallel reviewers (default 6, auto-scales for small sets)
 */

const { getSupabase, getLanguageName, getGoldenSeedCount, buildGrammarChecklist } = require('./shared.cjs');

async function generateFinalPassOrchestratorBrief(courseCode, query = {}) {
  const supabase = getSupabase();
  const langName = getLanguageName(courseCode);

  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, seed_count, quality_rules, translation_analysis')
    .eq('course_code', courseCode)
    .single();

  const grammarRules = courseInfo?.quality_rules?.grammar_rules || null;

  // Determine which seeds to review
  const specificSeeds = query.seeds ? query.seeds.split(',').map(Number).filter(n => n > 0).sort((a, b) => a - b) : null;
  const seedMin = specificSeeds ? specificSeeds[0] : (parseInt(query.seed_min) || 4);
  const seedMax = specificSeeds ? specificSeeds[specificSeeds.length - 1] : (parseInt(query.seed_max) || 300);
  const agentCount = parseInt(query.agents) || 6;

  // Count phrases in scope
  let phraseCount;
  if (specificSeeds) {
    const { count } = await supabase
      .from('course_practice_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .in('seed_number', specificSeeds);
    phraseCount = count;
  } else {
    const { count } = await supabase
      .from('course_practice_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .gte('seed_number', seedMin)
      .lte('seed_number', seedMax);
    phraseCount = count;
  }

  // Calculate batch assignments
  const seedList = specificSeeds || Array.from({ length: seedMax - seedMin + 1 }, (_, i) => seedMin + i);
  const totalSeeds = seedList.length;
  const effectiveAgents = Math.min(agentCount, totalSeeds); // don't spawn more agents than seeds
  const batchSize = Math.ceil(totalSeeds / effectiveAgents);
  const batches = [];
  for (let i = 0; i < effectiveAgents; i++) {
    const batchSeeds = seedList.slice(i * batchSize, (i + 1) * batchSize);
    if (batchSeeds.length > 0) {
      batches.push({ index: i + 1, seeds: batchSeeds, seedMin: batchSeeds[0], seedMax: batchSeeds[batchSeeds.length - 1] });
    }
  }

  const isTargeted = !!specificSeeds;
  const scopeLabel = isTargeted ? `${totalSeeds} specific seeds` : `seeds ${seedMin}-${seedMax}`;

  const terminal = query.terminal || 'iTerm2';

  // Build reviewer brief URLs — use seeds= for targeted, seed_min/max for ranges
  function reviewerBriefUrl(batch) {
    if (isTargeted) {
      return `http://localhost:3471/api/brief/${courseCode}/final-pass-reviewer?seeds=${batch.seeds.join(',')}`;
    }
    return `http://localhost:3471/api/brief/${courseCode}/final-pass-reviewer?seed_min=${batch.seedMin}&seed_max=${batch.seedMax}`;
  }

  function batchLabel(batch) {
    if (isTargeted || batch.seeds.length <= 10) {
      return `seeds ${batch.seeds.join(', ')}`;
    }
    return `seeds ${batch.seedMin}-${batch.seedMax} (${batch.seeds.length} seeds)`;
  }

  return `# Final Pass Orchestrator — ${courseCode} (${langName})

Working directory: ${process.cwd()}

## YOUR JOB

You are the FINAL QUALITY AUDITOR for **${courseCode}** (${langName}).
~${phraseCount || '?'} phrases across ${scopeLabel}.
${isTargeted ? `\n**TARGETED PASS** — reviewing only these ${totalSeeds} seeds: ${specificSeeds.join(', ')}\n` : ''}
You run a full quality pipeline: grammar review → delete bad phrases → backfill under-threshold LEGOs → approve clean seeds. The whole thing runs autonomously.

## Architecture

1. **Sonnet reviewers** (read-only) — check grammar, report issues via SendMessage
2. **You** (Opus orchestrator) — verify reports, delete bad phrases, spawn backfill, mass-approve

## Phase 1: Grammar Review

### Step 1.1: Create the Team

\`\`\`
TeamCreate: team_name="${courseCode.replace(/_/g, '-')}-final-pass", description="Final pass QA for ${courseCode}"
\`\`\`

### Step 1.2: Spawn All Reviewers in Parallel

Spawn all ${batches.length} reviewers at once using the Agent tool. Each reviewer gets its own seeds:

${batches.map(b => `**reviewer-${b.index}** (Sonnet, ${batchLabel(b)}):
\`\`\`
Agent tool:
  name: "reviewer-${b.index}"
  team_name: "${courseCode.replace(/_/g, '-')}-final-pass"
  model: "sonnet"
  prompt: "You are a grammar reviewer. Read your brief and follow it exactly:\\n\\ncurl -s \\"${reviewerBriefUrl(b)}\\"\\n\\nThen work through every seed in your assignment."
\`\`\``).join('\n\n')}

### Step 1.3: Process Reports As They Come In

Reviewers will send you messages like:
- \`SEED N: CLEAN — X phrases reviewed, 0 issues\`
- \`SEED N: ISSUES — X phrases reviewed, Y issues found\\n- PHRASE_ID: [phrase] — [problem]\`

**For seeds with ISSUES — verify and act:**

1. **Read the reported phrase** — is the reviewer right? Use your Opus-level ${langName} knowledge.
2. **If it's genuinely wrong grammar** — delete it:
\`\`\`bash
curl -s -X DELETE "http://localhost:3471/api/qa/phrase/PHRASE_ID"
\`\`\`
3. **If the reviewer is wrong** (phrase is actually fine) — skip it, don't delete.
4. **After processing all deletions in a seed**, check LEGO phrase counts:
\`\`\`bash
curl -s "http://localhost:3471/api/phrases/${courseCode}?seed_min=$N&seed_max=$N&limit=500"
\`\`\`
Count remaining USE phrases per LEGO. Track which seeds have LEGOs below 4 USE phrases.

**Do NOT approve or flag individual seeds yet — wait until all reviewers finish.**

### Step 1.4: Monitor Progress

Track which reviewers have completed. If a reviewer goes silent for 10+ minutes, check its status. If it died, spawn a replacement for its remaining seeds. Shut down completed reviewers.

## Phase 2: Triage & Backfill

When all reviewers are done and you've processed all deletions:

### Step 2.1: Flag seeds with under-threshold LEGOs

For any seed where you found a LEGO dropped below 4 USE phrases after deletions, flag it:
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/build/set-flags/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"seeds": [10, 11, 47]}'
\`\`\`

### Step 2.2: Check the seed grid

\`\`\`bash
curl -s "http://localhost:3471/api/build/seed-grid/${courseCode}" | python3 -c "
import json,sys; d=json.load(sys.stdin)
ut = sum(1 for s in d['seeds'] if s['status']=='under-threshold')
fl = sum(1 for s in d['seeds'] if s['status']=='flagged')
print(f'Under-threshold: {ut}, Flagged (rebuild): {fl}')
"
\`\`\`

The API detects seeds with LEGOs below 4 USE phrases and marks them \`under-threshold\` (distinct from \`flagged\`).

### Step 2.3: If there are under-threshold seeds — spawn backfill

\`\`\`bash
curl -s -X POST "http://localhost:3471/api/build/backfill-phrases/${courseCode}" \\
  -H "Content-Type: application/json"
\`\`\`

This spawns a Sonnet agent that writes replacement USE phrases for under-threshold LEGOs.
Wait for the backfill to complete by polling the seed grid every 30 seconds:
\`\`\`bash
curl -s "http://localhost:3471/api/build/seed-grid/${courseCode}" | python3 -c "
import json,sys; d=json.load(sys.stdin)
ut = sum(1 for s in d['seeds'] if s['status']=='under-threshold')
print(f'Under-threshold: {ut}')
"
\`\`\`
Poll until under-threshold count reaches 0.

### Step 2.4: After backfill — clear flags on backfilled seeds

\`\`\`bash
curl -s -X POST "http://localhost:3471/api/build/clear-flags/${courseCode}" \\
  -H "Content-Type: application/json"
\`\`\`

This clears \`flagged_at\` on all flagged seeds so they can be mass-approved.

## Phase 3: Mass Approve

### Step 3.1: Approve all clean seeds

\`\`\`bash
curl -s -X POST "http://localhost:3471/api/build/mass-approve/${courseCode}" \\
  -H "Content-Type: application/json"
\`\`\`

This approves all decomposed, non-flagged seeds at once.

### Step 3.2: Store lessons learned

\`\`\`bash
curl -s -X PATCH "http://localhost:3471/api/course/${courseCode}/quality-rules" \\
  -H "Content-Type: application/json" \\
  -d '{"lessons_learned": ["pattern 1", "pattern 2", ...], "final_pass_completed": true, "final_pass_date": "'$(date -u +%Y-%m-%d)'"}'
\`\`\`

### Step 3.3: Verify and print summary

\`\`\`bash
curl -s "http://localhost:3471/api/build/seed-grid/${courseCode}"
\`\`\`

Print:
\`\`\`
FINAL PASS COMPLETE — ${courseCode} ${scopeLabel}
Architecture: Opus orchestrator + ${batches.length} Sonnet reviewers
Seeds reviewed: X / ${totalSeeds}
Seeds approved: X
Seeds remaining (flagged for rebuild): Z [list seed numbers]
Total phrases deleted: N
False positives (reviewer flagged, orchestrator overruled): N
Backfill: N seeds backfilled, M phrases added
Most common error type: [e.g., "wrong modal construction (15 instances)"]
\`\`\`

${grammarRules ? `## ${langName}-Specific Grammar Rules\n\nUse these when verifying reviewer reports:\n\n${grammarRules}\n` : ''}

## IMPORTANT RULES

1. **Only YOU delete phrases.** Reviewers are read-only.
2. **Verify before deleting.** Reviewers may flag style issues as errors — use your judgement.
3. **Don't delete for style** — only actual grammar errors.
4. **IGNORE diacritics/accents/tashkeel** — missing diacritical marks are NOT errors.
5. **Don't edit phrases** — delete or leave. No PATCH on phrase text.
6. **If a reviewer dies**, spawn a replacement for its remaining seeds.
7. **Do NOT use PATCH /api/seed/ for approvals** — that endpoint updates seed text, not approval status. Use mass-approve.
8. **To set flagged_at on seeds**, use the node script with Supabase client (shown in Step 2.3).

## START NOW

Create the team, spawn all ${batches.length} reviewers, then process their reports as they arrive. When reviews are done, proceed through Phase 2 (backfill) and Phase 3 (approve) autonomously.
`;
}

module.exports = generateFinalPassOrchestratorBrief;
