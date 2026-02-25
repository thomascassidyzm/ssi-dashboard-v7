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

## How the Team Works

1. **Creator** (Sonnet) builds seed decompositions and sends them to checker
2. **Checker** (Opus) fixes grammar/naturalness issues and submits to the API
3. **Checker NEVER sends work back to creator** — checker fixes everything and submits directly
4. **API** validates (tiling, vocab, counts) and writes to Supabase
5. **Human** reviews submitted seeds in the dashboard seed grid and approves/rejects there

**You do NOT gate seeds for human approval.** The dashboard handles that. Your job is to keep the agents moving and restart them if they stall.

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

## Step 4: Monitor Progress AND Quality

You are the quality eye. Check three things continuously:

### 4a. Progress (every 5 minutes)
\`\`\`bash
curl -s "http://localhost:3471/api/stats/${courseCode}"
\`\`\`
Track seeds completed, LEGOs, phrases. Watch the phrases/LEGO ratio — should stay between 7-13.

### 4b. Quality spot-checks (every ~10 seeds)
Pick the most recently submitted seed and READ its phrases. You are Opus — you know ${langName}. Check:
- **Grammar**: Is every phrase grammatically correct in both languages?
- **Naturalness**: Would a real speaker say this? Watch for mechanical patterns (e.g. just appending "with me" or "now" to every phrase).
- **Pedagogy**: Do BUILD phrases show genuine recombination? Do USE phrases feel like things a learner would want to say?

Use the seed grid to find recent seeds and their phrase counts:
\`\`\`bash
curl -s "http://localhost:3471/api/build/seed-grid/${courseCode}"
\`\`\`

If you spot issues, message the **checker** with a specific correction: "Seed N had mechanical BUILD phrases — make sure you're rewriting these, not just passing them through."

If you see the same issue 3+ times, message **both** creator and checker with a clear directive.

### 4c. Stall detection
If seed count doesn't increase for 15+ minutes, check if creator/checker died. Respawn from the next undecomposed seed:
\`\`\`bash
curl -s "http://localhost:3471/api/resume/${courseCode}"
\`\`\`

## IMPORTANT RULES

1. **DO NOT build seeds yourself.** Spawn, monitor, restart only.
2. **DO NOT spawn more than one creator.** Seeds must be sequential.
3. **Checker fixes and submits.** No ping-pong between creator and checker. If you see them going back and forth, message checker: "Fix it yourself and submit."
4. **Human approval happens in the dashboard**, not through you.
5. **If spot-checks show quality issues**, message the checker to tighten up on that issue.
6. **When all ${targetSeeds} seeds are done**, shut down the team and report completion.

## START NOW
Create the team, spawn checker, spawn creator, then monitor.
`;
}

module.exports = generateBuildTeamOrchestratorBrief;
