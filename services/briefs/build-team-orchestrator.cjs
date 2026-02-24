/**
 * Brief: BUILD TEAM ORCHESTRATOR — spawns creator (Sonnet) + checker (Opus) team.
 * Seeds 1-N (golden count) require human approval. Seeds N+1 onwards are autonomous.
 * Monitors progress and restarts stalled agents.
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

  const targetSeeds = parseInt(query.target) || 300;

  // Figure out where we are in the process
  const goldenDone = [];
  const goldenRemaining = [];
  for (let i = 1; i <= goldenSeedCount; i++) {
    if (decomposedSet.has(i)) goldenDone.push(i);
    else goldenRemaining.push(i);
  }
  const allGoldenDone = goldenRemaining.length === 0;

  // Seeds for the autonomous phase
  const startSeed = allGoldenDone ? Math.max(goldenSeedCount + 1, highestDecomposed + 1) : 1;
  const autonomousSeeds = [];
  for (let i = goldenSeedCount + 1; i <= targetSeeds; i++) {
    if (!decomposedSet.has(i)) autonomousSeeds.push(i);
  }

  const teamName = courseCode.replace(/_/g, '-') + '-build';

  return `# Build Team Orchestrator — ${courseCode} (${langName})

Working directory: /Users/tomcassidy/SSi/ssi-dashboard-v7-clean

## YOUR JOB

You spawn a creator/checker team and drive the full build from seed 1 to ${targetSeeds}.
You DO NOT build seeds yourself.

## Current State

- **Golden seeds (1-${goldenSeedCount})**: ${goldenDone.length}/${goldenSeedCount} done${goldenRemaining.length > 0 ? ` — remaining: ${goldenRemaining.join(', ')}` : ' — ALL DONE'}
- **Autonomous seeds (${goldenSeedCount + 1}-${targetSeeds})**: ${autonomousSeeds.length} remaining (highest decomposed: ${highestDecomposed})
- **Target**: ${targetSeeds} seeds total

## The Two Phases

### Phase A: Golden Seeds 1-${goldenSeedCount} (Human Approval Required)
${allGoldenDone ? `**ALREADY COMPLETE** — skip to Phase B.` : `
The first ${goldenSeedCount} seeds set the quality bar. The creator/checker team builds them,
but YOU present each completed seed to the human for approval before moving on.

**For each golden seed:**
1. Creator builds it, sends to checker
2. Checker reviews, submits to API
3. You fetch the seed's phrases and present them to the human
4. Human says APPROVE → move to next seed
5. Human says REDO → tell creator to rebuild that seed

**Present seeds to the human like this:**
\\\`\\\`\\\`bash
curl -s "http://localhost:3471/api/phrases/${courseCode}?seed_min=$N&seed_max=$N&limit=500"
\\\`\\\`\\\`
Show the human all LEGOs + BUILD + USE phrases for the seed. Ask: "Seed N — approve or redo?"
`}

### Phase B: Autonomous Build (${goldenSeedCount + 1}-${targetSeeds})
Once all golden seeds are approved, the creator/checker team runs autonomously.
You monitor progress and spot-check quality, but don't gate each seed.

---

## Step 1: Create the Team

\`\`\`javascript
// Use TeamCreate tool
team_name: "${teamName}"
description: "${langName} course builder — seeds ${startSeed}-${targetSeeds}"
\`\`\`

## Step 2: Spawn the Checker (Opus) FIRST

Spawn checker first so it's ready when creator sends work.

Use the Task tool:
- subagent_type: "general-purpose"
- model: "opus"
- mode: "bypassPermissions"
- name: "checker"
- team_name: "${teamName}"
- run_in_background: true

Checker prompt — fetch the brief:
\`\`\`
You are the quality checker for ${courseCode}. Read your full brief:

curl -s "http://localhost:3471/api/brief/${courseCode}/build-team-checker"

Then follow the instructions exactly. Wait for messages from "creator".
\`\`\`

## Step 3: Spawn the Creator (Sonnet)

Use the Task tool:
- subagent_type: "general-purpose"
- model: "sonnet"
- mode: "bypassPermissions"
- name: "creator"
- team_name: "${teamName}"
- run_in_background: true

${allGoldenDone ? `Creator prompt — autonomous phase only:
\`\`\`
You are the seed creator for ${courseCode}. Read your full brief:

curl -s "http://localhost:3471/api/brief/${courseCode}/build-team-creator?seeds=${autonomousSeeds.join(',')}"

Then follow the instructions exactly. Send every decomposition to "checker" for review before it gets submitted.
\`\`\`` : `Creator prompt — start with golden seeds:
\`\`\`
You are the seed creator for ${courseCode}. Read your full brief:

curl -s "http://localhost:3471/api/brief/${courseCode}/build-team-creator?seeds=${goldenRemaining.concat(autonomousSeeds).join(',')}"

Then follow the instructions exactly. Send every decomposition to "checker" for review before it gets submitted.
\`\`\``}

## Step 4: ${allGoldenDone ? 'Monitor' : 'Human Approval Loop (Seeds 1-' + goldenSeedCount + ')'}

${allGoldenDone ? '' : `**Wait for each golden seed to be submitted, then present to the human.**

After checker submits seed N, fetch the phrases:
\`\`\`bash
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
(async () => {
  const N = SEED_NUM;
  const {data: legos} = await sb.from('course_legos').select('lego_index,type,known_text,target_text').eq('course_code','${courseCode}').eq('seed_number',N).order('lego_index');
  const {data: phrases} = await sb.from('course_practice_phrases').select('known_text,target_text,phrase_role,seed_number').eq('course_code','${courseCode}').eq('seed_number',N).order('id');
  console.log('=== SEED ' + N + ' ===');
  for (const l of legos) {
    console.log('\\nL' + l.lego_index + ' (' + l.type + '): ' + l.known_text + ' → ' + l.target_text);
    const lp = phrases.filter(p => p.known_text && p.target_text);
    for (const p of phrases.filter(p => true)) {
      console.log('  [' + p.phrase_role + '] ' + p.known_text + ' → ' + p.target_text);
    }
  }
})();
"
\`\`\`

Present this to the human and ask: **"Seed N — approve or redo?"**

- **APPROVE** → continue to next golden seed (or Phase B if all golden done)
- **REDO** → tell creator to rebuild: message "creator" with the human's feedback, then tell checker to wipe the seed first:
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/build/rebuild/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"from_seed": N, "to_seed": N}'
\`\`\`

Repeat until all ${goldenSeedCount} golden seeds are approved, then move to Phase B monitoring.

`}## ${allGoldenDone ? 'Monitoring' : 'Step 5: Autonomous Phase Monitoring'}

Every 5 minutes, check progress:
\`\`\`bash
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
(async () => {
  const {count} = await sb.from('course_seeds').select('*',{count:'exact',head:true}).eq('course_code','${courseCode}').not('decomposed_at','is',null);
  const {data: latest} = await sb.from('course_seeds').select('seed_number').eq('course_code','${courseCode}').not('decomposed_at','is',null).order('seed_number',{ascending:false}).limit(1);
  console.log('Decomposed:', count, '/ Last:', latest[0]?.seed_number, '/ Target:', ${targetSeeds});
})();
"
\`\`\`

Every ~30 seeds, spot-check a recent seed's USE phrases:
\`\`\`bash
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
(async () => {
  const SEED = SEED_NUM;
  const {data} = await sb.from('course_practice_phrases').select('known_text,target_text,phrase_role').eq('course_code','${courseCode}').eq('seed_number',SEED).eq('phrase_role','use').order('id');
  console.log('Seed', SEED, 'USE phrases (' + data.length + '):');
  for (const p of data) console.log('  ' + p.known_text + ' → ' + p.target_text);
})();
"
\`\`\`

**Stall detection**: If decomposed count doesn't increase for 10+ minutes, check if creator/checker died. If so, respawn from the next undecomposed seed.

## IMPORTANT RULES

1. **DO NOT build seeds yourself.** Spawn, monitor, restart only.
2. **DO NOT spawn more than one creator.** Seeds must be sequential.
3. **Seeds 1-${goldenSeedCount} MUST have human approval.** Never skip the approval loop.
4. **If spot-checks show quality issues**, message the checker to tighten up on that issue.
5. **When all ${targetSeeds} seeds are done**, shut down the team and report completion.

## START NOW
Create the team, spawn checker, spawn creator, ${allGoldenDone ? 'then monitor.' : 'then run the human approval loop for golden seeds.'}
`;
}

module.exports = generateBuildTeamOrchestratorBrief;
