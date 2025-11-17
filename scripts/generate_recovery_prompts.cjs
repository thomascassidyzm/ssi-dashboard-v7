#!/usr/bin/env node

/**
 * Generate Recovery Orchestrator Prompts
 *
 * Creates N orchestrator prompts for recovering missing Phase 5 baskets.
 * Reads missing_seeds.json and divides work across 12 windows.
 *
 * Usage:
 *   node scripts/generate_recovery_prompts.cjs <course_code>
 *
 * Example:
 *   node scripts/generate_recovery_prompts.cjs cmn_for_eng
 *
 * Output:
 *   - Creates .claude/recovery_prompts/window_01.md through window_12.md
 *   - Each prompt ready to paste into Claude Code browser tab
 */

const fs = require('fs');
const path = require('path');

// Parse arguments
const courseCode = process.argv[2];

if (!courseCode) {
  console.error('Usage: node scripts/generate_recovery_prompts.cjs <course_code>');
  console.error('Example: node scripts/generate_recovery_prompts.cjs cmn_for_eng');
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════════════');
console.log('RECOVERY ORCHESTRATOR PROMPT GENERATION');
console.log('═══════════════════════════════════════════════════════════\n');

// Load missing seeds analysis
const missingSeedsPath = path.join(__dirname, '..', 'missing_seeds.json');
if (!fs.existsSync(missingSeedsPath)) {
  console.error('❌ Error: missing_seeds.json not found');
  console.error('Run: node scripts/detect_missing_baskets.cjs <course_code> first\n');
  process.exit(1);
}

const analysis = JSON.parse(fs.readFileSync(missingSeedsPath, 'utf8'));

if (analysis.missing_count === 0) {
  console.log('✅ No missing seeds - nothing to recover!\n');
  process.exit(0);
}

console.log(`Course: ${analysis.course}`);
console.log(`Missing seeds: ${analysis.missing_count}`);
console.log(`Recovery strategy: ${analysis.recovery_params.num_windows} windows × ${analysis.recovery_params.agents_per_window} agents × ${analysis.recovery_params.seeds_per_agent} seeds\n`);

// Create output directory
const outputDir = path.join(__dirname, '..', '.claude', 'recovery_prompts');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Distribute seeds across windows
const NUM_WINDOWS = analysis.recovery_params.num_windows;
const AGENTS_PER_WINDOW = analysis.recovery_params.agents_per_window;
const SEEDS_PER_AGENT = analysis.recovery_params.seeds_per_agent;
const missingSeedsList = analysis.missing_seeds;

const seedsPerWindow = Math.ceil(missingSeedsList.length / NUM_WINDOWS);

console.log('Generating prompts...\n');

for (let windowNum = 1; windowNum <= NUM_WINDOWS; windowNum++) {
  const startIdx = (windowNum - 1) * seedsPerWindow;
  const endIdx = Math.min(startIdx + seedsPerWindow, missingSeedsList.length);

  if (startIdx >= missingSeedsList.length) {
    break; // No more seeds for this window
  }

  const windowSeeds = missingSeedsList.slice(startIdx, endIdx);
  const firstSeed = windowSeeds[0];
  const lastSeed = windowSeeds[windowSeeds.length - 1];

  // Generate prompt for this window
  const prompt = generateWindowPrompt(
    courseCode,
    windowNum,
    firstSeed,
    lastSeed,
    windowSeeds,
    AGENTS_PER_WINDOW,
    SEEDS_PER_AGENT
  );

  // Save to file
  const filename = path.join(outputDir, `window_${String(windowNum).padStart(2, '0')}.md`);
  fs.writeFileSync(filename, prompt);

  console.log(`✅ Window ${windowNum}: S${String(firstSeed).padStart(4, '0')}-S${String(lastSeed).padStart(4, '0')} (${windowSeeds.length} seeds)`);
}

console.log(`\n✅ All prompts generated in: .claude/recovery_prompts/\n`);
console.log(`Next step: ./scripts/launch_phase5_orchestrators.sh --recovery\n`);

/**
 * Generate orchestrator prompt for a single window
 */
function generateWindowPrompt(courseCode, windowNum, firstSeed, lastSeed, windowSeeds, numAgents, seedsPerAgent) {
  const firstSeedId = `S${String(firstSeed).padStart(4, '0')}`;
  const lastSeedId = `S${String(lastSeed).padStart(4, '0')}`;

  let prompt = `# Phase 5 Basket Generation - Recovery Window ${windowNum}

**Course**: ${courseCode}
**Seeds**: ${firstSeedId}-${lastSeedId} (${windowSeeds.length} seeds)
**Your Session ID**: {SESSION_ID} ← **REPLACE WITH YOUR ACTUAL SESSION ID**
**Branch**: baskets-${courseCode}-recovery-w${String(windowNum).padStart(2, '0')}-{SESSION_ID}

---

## Step 1: Repository Setup

\`\`\`bash
git clone https://github.com/zenjin/ssi-dashboard-v7-clean.git
cd ssi-dashboard-v7-clean
git checkout -b baskets-${courseCode}-recovery-w${String(windowNum).padStart(2, '0')}-{SESSION_ID}
\`\`\`

**CRITICAL**: Replace {SESSION_ID} with YOUR actual Claude Code session ID before running!

---

## Step 2: Generate Scaffolds

This creates scaffolds ONLY for your assigned seeds (${firstSeed}-${lastSeed}):

\`\`\`bash
node << 'SCAFFOLD_GEN'
const fs = require('fs');

// Read lego_pairs.json
const legoPairs = JSON.parse(
  fs.readFileSync('public/vfs/courses/${courseCode}/lego_pairs.json', 'utf8')
);

// Create scaffolds directory
fs.mkdirSync('public/vfs/courses/${courseCode}/phase5_scaffolds', { recursive: true });

// Your assigned seed numbers
const assignedSeeds = [${windowSeeds.join(', ')}];

// Generate scaffolds
for (const seedNum of assignedSeeds) {
  const seedId = \`S\${String(seedNum).padStart(4, '0')}\`;
  const seedData = legoPairs.seeds.find(s => s.seed_id === seedId);

  if (!seedData) {
    console.log(\`⚠️  \${seedId} not found in lego_pairs.json\`);
    continue;
  }

  // Build scaffold with hierarchy
  const scaffold = {
    seed_id: seedId,
    seed_pair: seedData.seed_pair,
    legos: seedData.legos.filter(lego => lego.new === true).map(lego => ({
      id: lego.id,
      type: lego.type,
      lego: [lego.known, lego.target],
      current_seed_earlier_legos: seedData.legos
        .filter(l => l.new === true && parseInt(l.id.match(/L(\\\\d+)/)[1]) < parseInt(lego.id.match(/L(\\\\d+)/)[1]))
        .map(l => ({ id: l.id, known: l.known, target: l.target, type: l.type })),
      phrase_distribution: {
        short_1_to_2_legos: 2,
        medium_3_legos: 2,
        longer_4_legos: 2,
        longest_5_legos: 4
      },
      target_phrase_count: 10
    }))
  };

  const filename = \`public/vfs/courses/${courseCode}/phase5_scaffolds/seed_s\${String(seedNum).padStart(4, '0')}.json\`;
  fs.writeFileSync(filename, JSON.stringify(scaffold, null, 2));
  console.log(\`✅ \${seedId}\`);
}

console.log(\`\\\\n🎉 Scaffolds generated for ${firstSeedId}-${lastSeedId}\`);
SCAFFOLD_GEN
\`\`\`

---

## Step 3: Process Seeds with Agents

Process your ${windowSeeds.length} seeds using **${numAgents} agents × ~${seedsPerAgent} seeds per agent**.

### Agent Instruction Template

Use the Task tool to spawn ${numAgents} agents in parallel. Give each agent this instruction:

\`\`\`
Generate Phase 5 LEGO baskets for seeds {SEED_LIST}.

For EACH seed:

1. Read scaffold: public/vfs/courses/${courseCode}/phase5_scaffolds/seed_s{NUM}.json
   (lowercase 's', 4-digit padded number)

2. For each LEGO in the scaffold:
   - Generate 10 practice phrases following phrase_distribution:
     * 2 short (1-2 LEGOs)
     * 2 medium (3 LEGOs)
     * 2 longer (4 LEGOs)
     * 4 longest (5 LEGOs)
   - Use current_seed_earlier_legos for building combinations

3. Save basket: public/vfs/courses/${courseCode}/phase5_outputs/seed_{SEED_ID}_baskets.json
   (capital 'S', with _baskets suffix)

Example:
- Read: seed_s0115.json
- Write: seed_S0115_baskets.json

DO NOT do any git operations - orchestrator handles that.
\`\`\`

### Agent Seed Assignments

Spawn all ${numAgents} agents at once with these assignments:
`;

  // Distribute seeds across agents
  for (let agentNum = 1; agentNum <= numAgents; agentNum++) {
    const agentStartIdx = (agentNum - 1) * seedsPerAgent;
    const agentEndIdx = Math.min(agentStartIdx + seedsPerAgent, windowSeeds.length);

    if (agentStartIdx >= windowSeeds.length) {
      break; // No more seeds
    }

    const agentSeeds = windowSeeds.slice(agentStartIdx, agentEndIdx);
    const seedList = agentSeeds.map(s => `S${String(s).padStart(4, '0')}`).join(', ');

    prompt += `\n- Agent ${agentNum}: ${seedList}`;
  }

  prompt += `

---

## Step 4: Wait for Completion

Wait for ALL agents to finish. Verify files created:

\`\`\`bash
ls public/vfs/courses/${courseCode}/phase5_outputs/seed_S*.json | wc -l
# Should show approximately ${windowSeeds.length} files
\`\`\`

---

## Step 5: Commit and Push

\`\`\`bash
# Add new basket files
git add public/vfs/courses/${courseCode}/phase5_outputs/seed_S*.json

# Commit
git commit -m "Recovery Window ${windowNum}: ${firstSeedId}-${lastSeedId} (${windowSeeds.length} seeds)"

# Push to YOUR branch (with your session ID!)
git push origin baskets-${courseCode}-recovery-w${String(windowNum).padStart(2, '0')}-{{SESSION_ID}}
\`\`\`

---

## Step 6: Final Verification

\`\`\`bash
# Count your basket files
count=$(ls public/vfs/courses/${courseCode}/phase5_outputs/seed_S*.json 2>/dev/null | wc -l)
echo "Generated: $count / ${windowSeeds.length} seeds"

# List any missing seeds from your assignment
expected="${windowSeeds.map(s => `S${String(s).padStart(4, '0')}`).join(' ')}"
for seed in $expected; do
  if [ ! -f "public/vfs/courses/${courseCode}/phase5_outputs/seed_\${seed}_baskets.json" ]; then
    echo "⚠️  Missing: $seed"
  fi
done
\`\`\`

---

## Success Criteria

- ✅ All ${windowSeeds.length} basket files generated
- ✅ All commits pushed to single branch
- ✅ Branch visible on GitHub
- ✅ No missing seeds in your assignment
- ✅ Working tree clean

---

## Report When Complete

\`\`\`
🎉 Recovery Window ${windowNum} Complete!

Branch: baskets-${courseCode}-recovery-w${String(windowNum).padStart(2, '0')}-{{SESSION_ID}}
Seeds: ${firstSeedId}-${lastSeedId} (${windowSeeds.length} seeds)
Status: ✅ All seeds generated and pushed
\`\`\`
`;

  return prompt;
}
