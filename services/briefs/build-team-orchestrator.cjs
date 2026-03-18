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
  const terminal = query.terminal || 'iTerm2';
  const useTeams = terminal === 'iTerm2';

  // TEMPORARY: Opus cannot reliably output Armenian script — use Sonnet for checker
  const checkerModel = courseCode.startsWith('hye_') ? 'sonnet' : 'opus';
  const checkerModelNote = courseCode.startsWith('hye_') ? `
## ⚠️ ARMENIAN SCRIPT OVERRIDE

**The checker for this course uses Sonnet, not Opus.** This is because Opus has a confirmed bug where it cannot reliably output Armenian (հայերեն) script — it enters a corruption loop producing partial characters and garbage text. This was tested and verified on ${new Date().toISOString().split('T')[0]}. Sonnet handles Armenian perfectly.

**As the orchestrator (Opus), you must NEVER write Armenian text in your messages.** When spot-checking quality or flagging issues, refer to phrases by number only (e.g. "S0042L02 BUILD phrase 3"). Quote only the English (known) side if needed.

**Process note:** With both creator and checker on Sonnet, stalling risk is higher. Check progress every 5 minutes (not 15). Ping agents proactively if seed count hasn't increased in 10 minutes.
` : '';

  const creatorSeeds = allGoldenDone ? autonomousSeeds : goldenRemaining.concat(autonomousSeeds);

  return `# Build Team Orchestrator — ${courseCode} (${langName})

Working directory: ${process.cwd()}

${checkerModelNote}## YOUR JOB

You spawn a creator/checker team and drive the full build from seed 1 to ${targetSeeds}.
You DO NOT build seeds yourself.

## Current State

- **Golden seeds (1-${goldenSeedCount})**: ${goldenDone.length}/${goldenSeedCount} done${goldenRemaining.length > 0 ? ` — remaining: ${goldenRemaining.join(', ')}` : ' — ALL DONE'}
- **Autonomous seeds (${goldenSeedCount + 1}-${targetSeeds})**: ${autonomousSeeds.length} remaining (highest decomposed: ${highestDecomposed})
- **Target**: ${targetSeeds} seeds total

## How the Team Works

1. **Creator** (Sonnet) builds seed decompositions and sends them to checker
2. **Checker** (${checkerModel === 'opus' ? 'Opus' : 'Sonnet'}) fixes grammar/naturalness issues and submits to the API
3. **Checker NEVER sends work back to creator** — checker fixes everything and submits directly
4. **API** validates (tiling, vocab, counts) and writes to Supabase
5. **Human** reviews submitted seeds in the dashboard seed grid and approves/rejects there

**You do NOT gate seeds for human approval.** The dashboard handles that. Your job is to keep the agents moving and restart them if they stall.

---

## Step 1: Create the Team

Use TeamCreate to set up the team so agents can communicate via SendMessage:
\`\`\`
TeamCreate: team_name="${teamName}", description="Build team for ${courseCode}"
\`\`\`

## Step 2: Spawn the Checker FIRST

Spawn checker first so it's ready when creator sends work.

Use the Agent tool:
- name: "checker"
- team_name: "${teamName}"
- model: "${checkerModel}"

Checker prompt:
\`\`\`
You are the quality checker for ${courseCode}. Read your full brief:

curl -s "http://localhost:3471/api/brief/${courseCode}/build-team-checker?terminal=${terminal}"

Then follow the instructions exactly. You will receive seed decompositions from "creator" via SendMessage. Use SendMessage to reply to "creator" when done.
\`\`\`

## Step 3: Spawn the Creator (Sonnet)

Use the Agent tool:
- name: "creator"
- team_name: "${teamName}"
- model: "sonnet"

Creator prompt:
\`\`\`
You are the seed creator for ${courseCode}. Read your full brief:

curl -s "http://localhost:3471/api/brief/${courseCode}/build-team-creator?seeds=${creatorSeeds.join(',')}&terminal=${terminal}"

Then follow the instructions exactly. Use SendMessage to send decompositions to "checker". Wait for "checker" to reply with "DONE" before moving to the next seed.
\`\`\`

## Step 4: Confirm Team is Running

Check both are alive before monitoring. Messages between creator and checker flow automatically via SendMessage — no HTTP queue needed.

## Step 5: Monitor Progress AND Quality

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

### 4d. Human messages (every monitoring cycle)

The human may be managing this build remotely from their phone. Check for messages every cycle:

\`\`\`bash
curl -s "http://localhost:3471/api/orchestrator/chat/${courseCode}?direction=human_to_agent&status=pending"
\`\`\`

If there are pending messages (check the \`messages\` array is non-empty):
1. Read and understand what the human wants
2. Act on it — common requests:
   - "How's it going?" → Reply with current progress (seeds done, quality, issues)
   - "Skip seed N" / "Redo seed N" → Instruct checker accordingly
   - "Stop" / "Pause" → Shut down the team gracefully
   - "Change approach" → Adjust instructions to creator/checker
   - General questions → Answer concisely
3. Reply:
\`\`\`bash
curl -X POST "http://localhost:3471/api/orchestrator/chat/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"role":"agent","message":"YOUR RESPONSE"}'
\`\`\`

Your reply automatically marks the human's messages as read. Keep responses concise — they're reading on a phone.

### 4e. Periodic status updates

Every 3rd progress check (~15 min), post a brief status update to chat so the human can see the build is alive without asking:
\`\`\`bash
curl -X POST "http://localhost:3471/api/orchestrator/chat/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"role":"agent","message":"Progress: X/300 seeds done, ratio Y. No issues."}'
\`\`\`

## Repair Toolkit — Fixing Seeds Without Rebuilding

When you spot issues in submitted seeds, use these **granular** endpoints. NEVER use the rebuild endpoint to fix individual seeds — it wipes ranges and can destroy hours of work.

### Fix a LEGO's text or components (non-destructive)
\`\`\`bash
curl -s -X PATCH "http://localhost:3470/api/production/${courseCode}/lego/S0010L02" \\
  -H "Content-Type: application/json" \\
  -d '{"known_text": "corrected English", "target_text": "corrected target"}'
\`\`\`
legoId format: \`S{NNNN}L{NN}\` — e.g. \`S0010L02\` = seed 10, LEGO index 2.
Can also update: \`type\` (A/M), \`components\` (array), \`is_new\` (boolean).

### Fix a phrase's text (non-destructive)
\`\`\`bash
curl -s -X PATCH "http://localhost:3470/api/production/${courseCode}/phrase/PHRASE_ID" \\
  -H "Content-Type: application/json" \\
  -d '{"known_text": "corrected", "target_text": "corrected"}'
\`\`\`

### Delete a single bad phrase
\`\`\`bash
curl -s -X DELETE "http://localhost:3470/api/production/${courseCode}/phrases/PHRASE_ID"
\`\`\`

### View a seed's full structure (LEGOs + phrases)
\`\`\`bash
curl -s "http://localhost:3470/api/production/${courseCode}/seed/10/baskets"
\`\`\`

### ⚠️ NEVER use /api/build/rebuild for small fixes
The rebuild endpoint wipes ALL LEGOs and phrases in a range. For fixing 1-5 seeds, ALWAYS use the PATCH endpoints above. The rebuild endpoint exists only for full course resets and requires explicit confirmation for ranges > 10.

## IMPORTANT RULES

1. **DO NOT build seeds yourself.** Spawn, monitor, restart only.
2. **DO NOT spawn more than one creator.** Seeds must be sequential.
3. **Checker fixes and submits.** No ping-pong between creator and checker. If you see them going back and forth, message checker: "Fix it yourself and submit."
4. **Human approval happens in the dashboard**, not through you.
5. **If spot-checks show quality issues**, message the checker to tighten up on that issue.
6. **When all ${targetSeeds} seeds are done**, shut down the team and report completion.
7. **NEVER call /api/build/rebuild to fix individual seeds.** Use the PATCH endpoints in the Repair Toolkit above.

## START NOW
Create the team, spawn checker, spawn creator, then monitor.
`;
}

module.exports = generateBuildTeamOrchestratorBrief;
