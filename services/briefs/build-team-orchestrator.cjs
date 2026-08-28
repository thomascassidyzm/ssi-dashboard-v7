/**
 * Brief: BUILD ORCHESTRATOR — spawns a single Opus builder agent.
 * Builder submits directly to the API. Orchestrator monitors, spot-checks, and respawns on stall.
 *
 * DEPRECATED: The creator/checker team pattern. Single agent + API validation + final pass is sufficient.
 */

const { getSupabase, getLanguageName, getGoldenSeedCount } = require('./shared.cjs');

async function generateBuildTeamOrchestratorBrief(courseCode, query = {}) {
  const supabase = getSupabase();
  const langName = getLanguageName(courseCode);

  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, seed_count, quality_rules')
    .eq('course_code', courseCode)
    .single();

  const goldenSeedCount = getGoldenSeedCount(courseInfo);

  // Find which seeds are already decomposed
  const { data: decomposedSeeds } = await supabase
    .from('course_seeds')
    .select('seed_number')
    .eq('course_code', courseCode)
    .not('decomposed_at', 'is', null)
    .order('seed_number');

  const decomposedSet = new Set((decomposedSeeds || []).map(s => s.seed_number));
  const highestDecomposed = decomposedSeeds?.length > 0
    ? decomposedSeeds[decomposedSeeds.length - 1].seed_number
    : 0;

  // Resolution order: explicit ?target= → courses.seed_count → 300
  // This way the orchestrator brief always reflects the course's recorded release target.
  const targetSeeds = parseInt(query.target) || courseInfo?.seed_count || 300;

  // Figure out where we are in the process
  const goldenDone = [];
  const goldenRemaining = [];
  for (let i = 1; i <= goldenSeedCount; i++) {
    if (decomposedSet.has(i)) goldenDone.push(i);
    else goldenRemaining.push(i);
  }
  const allGoldenDone = goldenRemaining.length === 0;

  // Seeds for the builder
  const autonomousSeeds = [];
  for (let i = goldenSeedCount + 1; i <= targetSeeds; i++) {
    if (!decomposedSet.has(i)) autonomousSeeds.push(i);
  }

  const builderSeeds = allGoldenDone ? autonomousSeeds : goldenRemaining.concat(autonomousSeeds);

  return `# Build Orchestrator — ${courseCode} (${langName})

Working directory: ${process.cwd()}

## YOUR JOB

You spawn a single Opus builder agent and monitor the build from seed 1 to ${targetSeeds}.
You DO NOT build seeds yourself.

## Current State

- **Golden seeds (1-${goldenSeedCount})**: ${goldenDone.length}/${goldenSeedCount} done${goldenRemaining.length > 0 ? ` — remaining: ${goldenRemaining.join(', ')}` : ' — ALL DONE'}
- **Autonomous seeds (${goldenSeedCount + 1}-${targetSeeds})**: ${autonomousSeeds.length} remaining (highest decomposed: ${highestDecomposed})
- **Target**: ${targetSeeds} seeds total

## Architecture

1. **Builder** (Opus) decomposes seeds, fetches each LEGO's phrases from the v3 phrase door, and submits to the API
2. **API** validates (tiling, vocab, ZUT, phrase counts) and writes to Supabase
3. **You** (Opus orchestrator) monitor progress, spot-check quality, respawn on stalls
4. **Final pass** catches grammar/naturalness issues after the build
5. **Human** reviews in the dashboard seed grid

No teams. No messaging between agents. One builder, one API, one orchestrator watching.

---

## Step 1: Spawn the Builder (Opus)

OPUS, NOT SONNET, AND THERE IS NO FALLBACK TIER. Tom's ruling of 2026-08-27 on the
six-language phrase-prompt replication: Opus leaves roughly two and a half times
as many phrase sets needing no human at all, and both arms cost the same zero
dollars on the flat-rate subscription. Do not "save" anything by dropping a tier.

Use the Agent tool:
- model: "opus"
- mode: "bypassPermissions"
- run_in_background: true

Builder prompt:
\`\`\`
You are the course builder for ${courseCode}. Read your full brief:

curl -s "http://localhost:3471/api/brief/${courseCode}/build-team-creator?seeds=${builderSeeds.join(',')}"

Then follow the instructions exactly. Build each seed, submit directly to the API, and move to the next one. You are fully autonomous — never ask questions.
\`\`\`

After spawning, post to chat:
\`\`\`bash
curl -X POST "http://localhost:3471/api/orchestrator/chat/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"role":"agent","message":"Build team active — Opus builder running, targeting ${targetSeeds} seeds"}'
\`\`\`

## Step 2: Monitor Progress AND Quality

### 2a. Progress (every 5 minutes)
\`\`\`bash
curl -s "http://localhost:3471/api/stats/${courseCode}"
\`\`\`
Track seeds completed, LEGOs, phrases. Ratio should stay between 7-13.

### 2b. Quality spot-checks (every ~20 seeds)
Pick a recently submitted seed and READ its phrases. You are Opus — you know ${langName}. Check:
- **Grammar**: Is every phrase grammatically correct in both languages?
- **Naturalness**: Would a real speaker say this?
- **Pedagogy**: Do BUILD phrases show genuine recombination? Do USE phrases feel like things a learner would want to say?

\`\`\`bash
curl -s "http://localhost:3470/api/production/${courseCode}/seed/N/baskets"
\`\`\`

If you spot systematic issues, use the Repair Toolkit below to fix them directly.

### 2c. Stall detection
If seed count doesn't increase for 10+ minutes, the builder has died or hit context compaction. Respawn it:
\`\`\`bash
curl -s "http://localhost:3471/api/resume/${courseCode}"
\`\`\`
Use the \`next_seed\` from the response to spawn a new builder from that point.

### 2d. Human messages (every monitoring cycle)
\`\`\`bash
curl -s "http://localhost:3471/api/orchestrator/chat/${courseCode}?direction=human_to_agent&status=pending"
\`\`\`

If there are pending messages, read and act on them. Reply:
\`\`\`bash
curl -X POST "http://localhost:3471/api/orchestrator/chat/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"role":"agent","message":"YOUR RESPONSE"}'
\`\`\`

### 2e. Periodic status updates
Every ~15 min, post a brief status update:
\`\`\`bash
curl -X POST "http://localhost:3471/api/orchestrator/chat/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"role":"agent","message":"Progress: X/${targetSeeds} seeds done, ratio Y. No issues."}'
\`\`\`

## Repair Toolkit — Fixing Seeds Without Rebuilding

### Fix a LEGO's text or components
\`\`\`bash
curl -s -X PATCH "http://localhost:3470/api/production/${courseCode}/lego/S0010L02" \\
  -H "Content-Type: application/json" \\
  -d '{"known_text": "corrected English", "target_text": "corrected target"}'
\`\`\`

### Fix a phrase's text
\`\`\`bash
curl -s -X PATCH "http://localhost:3470/api/production/${courseCode}/phrase/PHRASE_ID" \\
  -H "Content-Type: application/json" \\
  -d '{"known_text": "corrected", "target_text": "corrected"}'
\`\`\`

### Delete a single bad phrase
\`\`\`bash
curl -s -X DELETE "http://localhost:3470/api/production/${courseCode}/phrases/PHRASE_ID"
\`\`\`

### View a seed's full structure
\`\`\`bash
curl -s "http://localhost:3470/api/production/${courseCode}/seed/10/baskets"
\`\`\`

### ⚠️ NEVER use /api/build/rebuild for small fixes

## IMPORTANT RULES

1. **DO NOT build seeds yourself.** Spawn, monitor, respawn only.
2. **One builder at a time.** Seeds must be sequential (vocab is incremental).
3. **Human approval happens in the dashboard**, not through you.
4. **If spot-checks show quality issues**, fix them directly with PATCH endpoints.
5. **When all ${targetSeeds} seeds are done**, report completion.
6. **NEVER call /api/build/rebuild to fix individual seeds.** Use PATCH endpoints.

## START NOW
Spawn the builder, then monitor.
`;
}

module.exports = generateBuildTeamOrchestratorBrief;
