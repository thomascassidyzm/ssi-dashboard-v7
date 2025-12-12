#!/usr/bin/env node

/**
 * Phase 3: LEGO Extraction Server
 *
 * Responsibilities:
 * - Spawn parallel Claude Code browser sessions for LEGO extraction
 * - Manage segmentation strategy (small/medium/large courses)
 * - Watch for phase3-segment-* branches
 * - Validate LEGO quality (FD compliance, complete tiling)
 * - Write lego_pairs.json to VFS
 * - Report completion to orchestrator
 *
 * Port: 3458 (auto-configured by start-automation.js)
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { spawn, execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(require('child_process').exec);
const { generateIntroductions } = require('./generate-introductions.cjs');

// Load environment (set by start-automation.js)
const PORT = process.env.PORT || 3458;
const VFS_ROOT = process.env.VFS_ROOT;
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';
const SERVICE_NAME = process.env.SERVICE_NAME || 'Phase 3 (LEGO Extraction)';
const AGENT_SPAWN_DELAY = process.env.AGENT_SPAWN_DELAY || 6000; // 6s to avoid clipboard race

// Database service for database-first writes
const courseDataService = require('../../course-data-service.cjs');

// Validate config
if (!VFS_ROOT) {
  console.error('❌ Error: VFS_ROOT not set');
  process.exit(1);
}

// Initialize Express
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Active jobs (courseCode -> job state)
const activeJobs = new Map();

// Branch watcher processes (courseCode -> child process)
const watchers = new Map();

/**
 * Language code to full name mapping
 */
function getLanguageName(code) {
  const names = {
    'eng': 'English',
    'ita': 'Italian',
    'spa': 'Spanish',
    'fra': 'French',
    'gle': 'Irish',
    'cym': 'Welsh',
    'cmn': 'Mandarin Chinese',
    'mkd': 'Macedonian',
    'deu': 'German',
    'por': 'Portuguese',
    'nld': 'Dutch',
    'swe': 'Swedish',
    'nor': 'Norwegian',
    'dan': 'Danish',
    'fin': 'Finnish',
    'jpn': 'Japanese',
    'kor': 'Korean',
    'rus': 'Russian',
    'ara': 'Arabic',
    'hin': 'Hindi'
  };
  return names[code.toLowerCase()] || code.toUpperCase();
}

/**
 * Calculate segmentation strategy based on course size
 *
 * Strategies (matching Phase 5's parallelization):
 * - SMALL_TEST: ≤30 seeds → 5-6 seeds/agent (6 agents for 30 seeds)
 * - MEDIUM: 31-100 seeds → 5-6 seeds/agent
 * - LARGE: >100 seeds → 10 seeds/agent (67 agents for 668 seeds)
 */
function calculateSegmentation(totalSeeds) {
  // 3-tier parallelization: BROWSERS × AGENTS × SEEDS
  // Two modes only:
  // - Test mode (≤30 seeds): 6 browsers × 5 agents × 1 seed = 30
  // - Production mode (>30 seeds): 15 browsers × 15 agents × 3 seeds = 675

  let browsers, agentsPerBrowser, seedsPerAgent;

  if (totalSeeds <= 30) {
    // TEST MODE: 6/5/1
    browsers = 6;
    agentsPerBrowser = 5;
    seedsPerAgent = 1;
  } else {
    // PRODUCTION MODE: 15/15/3
    browsers = 15;
    agentsPerBrowser = 15;
    seedsPerAgent = 3;
  }

  // Calculate segments (each browser gets a segment)
  const segments = [];
  const seedsPerBrowser = agentsPerBrowser * seedsPerAgent;

  for (let i = 0; i < totalSeeds; i += seedsPerBrowser) {
    const segmentStart = i + 1;
    const segmentEnd = Math.min(i + seedsPerBrowser, totalSeeds);
    const segmentSeeds = segmentEnd - segmentStart + 1;
    const agentsInThisBrowser = Math.ceil(segmentSeeds / seedsPerAgent);

    segments.push({
      segmentNumber: segments.length + 1,
      startSeed: segmentStart,
      endSeed: segmentEnd,
      seedCount: segmentSeeds,
      browserNumber: segments.length + 1,
      agentCount: agentsInThisBrowser,
      seedsPerAgent: seedsPerAgent
    });
  }

  const totalAgents = segments.reduce((sum, seg) => sum + seg.agentCount, 0);
  const capacity = browsers * agentsPerBrowser * seedsPerAgent;

  return {
    totalSeeds,
    browsers,
    agentsPerBrowser,
    seedsPerAgent,
    segmentCount: segments.length,
    totalAgents,
    capacity,
    segments,
    strategy: totalSeeds <= 30 ? 'TEST_6_5_1' : 'PRODUCTION_15_15_3'
  };
}

/**
 * Generate Phase 3 Master Prompt
 */
function generatePhase3MasterPrompt(courseCode, params, segmentation) {
  const { target, known, startSeed, endSeed, browserNumber } = params;
  const totalSeeds = endSeed - startSeed + 1;

  const agentsInThisBrowser = segmentation.agentsPerBrowser;
  const seedsPerAgent = segmentation.seedsPerAgent;

  return `# Phase 3 Master Orchestrator: LEGO Extraction

**Course**: ${courseCode}
**Browser**: ${browserNumber}/${segmentation.browsers}
**Seeds**: ${totalSeeds} (S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')})
**Parallelization**: ${agentsInThisBrowser} agents × ${seedsPerAgent} seed(s) each

---

## 🎯 YOUR MISSION

You are the **Master Orchestrator** for browser ${browserNumber}. Your job is to:

1. **Read Phase 3 intelligence** (v7.0 - Two Heuristics Edition)
2. **Spawn ${agentsInThisBrowser} sub-agents in parallel** (ONE message with ${agentsInThisBrowser} Task tool calls)
3. **Each sub-agent extracts ${seedsPerAgent} seed(s)** with IDENTICAL prompt (only seed range differs)
4. **Wait for all ${agentsInThisBrowser} to complete**
5. **Verify all sub-agents successfully POSTed** to API
6. **Done** - Vercel auto-deploys results

**CRITICAL**: Use ONE message with multiple Task tool calls to spawn all agents simultaneously.

**OUTPUT METHOD**: Each sub-agent POSTs directly to orchestrator API:
- Endpoint: \`POST ${ORCHESTRATOR_URL}/api/phase3/${courseCode}/submit\`
- Body format: \`{ lego_pairs: {...}, introductions: {...} }\`
- Server merges submissions automatically (no git workflow needed)

---

## 📚 PHASE 3 INTELLIGENCE (Single Source of Truth)

**GET Phase Intelligence from REST API**:
\`\`\`bash
curl ${ORCHESTRATOR_URL}/api/phase-intelligence/3
\`\`\`

Or using fetch in browser:
\`\`\`javascript
fetch('${ORCHESTRATOR_URL}/api/phase-intelligence/3')
  .then(res => res.text())
  .then(markdown => console.log(markdown));
\`\`\`

This is the **ONLY authoritative source** for Phase 3 extraction methodology (v7.0 - Two Heuristics Edition).

**This file contains the complete v7.0 methodology including**:
- **Two Core Heuristics**: (1) Remove learner uncertainty, (2) Maximize patterns with minimum vocab
- Three comprehensive examples (Spanish, Chinese, multilingual)
- Forward/Backward Sweep Algorithm
- Overlapping chains for recombination power
- Complete worked examples with reasoning

**Your sub-agents MUST read this file** before starting extraction. The highlights below are NOT a replacement for reading the full methodology.

**Key principles** (highlights only - see full file for details):
- **Heuristic 1**: Remove learner uncertainty (no standalone pronouns/articles/particles)
- **Heuristic 2**: Maximize patterns with minimum vocab (overlapping chains)
- **Forward + Backward sweeps**: Both required
- **Componentize ALL M-types**: Show word-by-word literal mappings
- **Mark all new: true**: Phase 3 introduces LEGOs

---

## 🚀 SUB-AGENT SPAWNING

You will spawn ${agentsInThisBrowser} sub-agents, each handling ${seedsPerAgent} seed(s).

**Seed distribution**:
${Array.from({length: agentsInThisBrowser}, (_, i) => {
  const agentStart = startSeed + (i * seedsPerAgent);
  const agentEnd = Math.min(startSeed + ((i + 1) * seedsPerAgent) - 1, endSeed);
  return `- Agent ${i + 1}: S${String(agentStart).padStart(4, '0')}-S${String(agentEnd).padStart(4, '0')}`;
}).join('\n')}

**Input file**: Read from \`seed_pairs.json\` (or segment file if using segmentation)

---

## 📋 SUB-AGENT PROMPT TEMPLATE

**CRITICAL**: Give IDENTICAL prompts to all ${agentsInThisBrowser} agents - only the seed range changes!

\`\`\`markdown
# Phase 3 Sub-Agent: Extract S00XX-S00YY

## 📚 STEP 1: READ PHASE INTELLIGENCE

**GET Phase Intelligence from REST API**:
\`\`\`bash
curl ${ORCHESTRATOR_URL}/api/phase-intelligence/3
\`\`\`

(430 lines - v7.0: Two Heuristics Edition)

---

## 🚨 STEP 2: TWO CORE HEURISTICS (From Intelligence Doc)

**Apply these heuristics to EVERY seed**:

**Heuristic 1: Remove Learner Uncertainty**
- When learner hears KNOWN → ZERO uncertainty about TARGET
- No standalone pronouns/articles/particles (él, she, una, the, de, of, 的)
- If uncertain → chunk UP with context

**Heuristic 2: Maximize Patterns with Minimum Vocab**
- Create overlapping chunks when pedagogically valuable
- Each LEGO should generate multiple practice sentences
- Example: "tardaron" in both "las noticias tardaron" AND "tardaron varias horas"

**All strategies serve these two goals** (forward/backward sweeps, M-types, components)

---

## 📖 STEP 3: YOUR ASSIGNMENT

**Extract LEGOs from**: Seeds S00XX through S00YY (${seedsPerAgent} seeds)

**GET seed_pairs.json from REST API**:
\`\`\`bash
curl ${ORCHESTRATOR_URL}/api/courses/${courseCode}/phase-outputs/1/seed_pairs.json
\`\`\`

Or using fetch:
\`\`\`javascript
fetch('${ORCHESTRATOR_URL}/api/courses/${courseCode}/phase-outputs/1/seed_pairs.json')
  .then(res => res.json())
  .then(data => console.log(data));
\`\`\`

---

## 🔄 STEP 4: EXTRACT (Per Seed)

For EACH of your ${seedsPerAgent} seeds:

1. **Use <thinking> tags** - reason through extraction step-by-step
2. **Apply Heuristic 1**: Does KNOWN → TARGET have zero uncertainty? If NO → chunk UP
3. **Apply Heuristic 2**: Can overlaps add recombination power? Create if valuable
4. **Both sweeps**: Forward (KNOWN left-to-right) + Backward (TARGET right-to-left)
5. **Components**: Add to every M-type (word-by-word literal mapping)
6. **Final check**: Any standalone pronouns/articles/particles? If yes → pair with context

---

## 📊 STEP 5: REPORT PROGRESS

**After completing your seeds**, report progress to orchestrator:

\`\`\`bash
curl -X POST ${ORCHESTRATOR_URL}/api/courses/${courseCode}/progress \\
  -H "Content-Type: application/json" \\
  -d '{
    "phase": 3,
    "updates": {
      "status": "running",
      "seedsCompleted": <your_end_seed>,
      "seedsTotal": ${endSeed},
      "agentId": "<your_agent_number>",
      "currentSeed": "S00YY"
    },
    "logMessage": "Agent <N>: Completed S00XX-S00YY (${seedsPerAgent} seeds extracted)"
  }'
\`\`\`

Or using fetch:
\`\`\`javascript
fetch('${ORCHESTRATOR_URL}/api/courses/${courseCode}/progress', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phase: 3,
    updates: {
      status: 'running',
      seedsCompleted: <your_end_seed>,
      seedsTotal: ${endSeed},
      agentId: '<your_agent_number>',
      currentSeed: 'S00YY'
    },
    logMessage: 'Agent <N>: Completed S00XX-S00YY (${seedsPerAgent} seeds extracted)'
  })
})
.then(res => res.json())
.then(result => console.log('Progress reported:', result));
\`\`\`

---

## 📤 STEP 6: OUTPUT - POST TO REST API

**Submit your extraction via REST API**:

\`\`\`bash
curl -X POST ${ORCHESTRATOR_URL}/api/phase3/${courseCode}/submit \\
  -H "Content-Type: application/json" \\
  -d '{
    "lego_pairs": {
      "course": "${courseCode}",
      "generated_at": "2025-11-20T12:00:00.000Z",
      "methodology": "Phase 3 v7.0 - Two Heuristics Edition",
      "phase": "3",
      "seeds": [
        {
          "seed_id": "S00XX",
          "seed_pair": {"known": "known sentence", "target": "target sentence"},
          "legos": [
            {
              "id": "S00XXL01",
              "type": "A",
              "new": true,
              "lego": {"known": "word", "target": "palabra"}
            }
          ]
        }
      ]
    },
    "introductions": {
      "version": "7.8.0",
      "course": "${courseCode}",
      "target": "${target}",
      "known": "${known}",
      "generated": "2025-11-20T12:00:00.000Z",
      "presentations": {
        "S00XXL01": "The ${getLanguageName(target)} for 'word', is: ... 'palabra' ... 'palabra'"
      }
    }
  }'
\`\`\`

Or using fetch:
\`\`\`javascript
const submission = {
  lego_pairs: {
    course: "${courseCode}",
    generated_at: new Date().toISOString(),
    methodology: "Phase 3 v7.0 - Two Heuristics Edition",
    phase: "3",
    seeds: [
      {
        seed_id: "S00XX",
        seed_pair: {known: "known sentence", target: "target sentence"},
        legos: [
          { id: "S00XXL01", type: "A", new: true, lego: {known: "word", target: "palabra"} },
          { id: "S00XXL02", type: "M", new: true, lego: {known: "multi word", target: "multi palabra"},
            components: [["multi", "multi"], ["word", "palabra"]] }
        ]
      }
    ]
  },
  introductions: {
    version: "7.8.0",
    course: "${courseCode}",
    target: "${target}",
    known: "${known}",
    generated: new Date().toISOString(),
    presentations: {
      "S00XXL01": "The ${getLanguageName(target)} for 'word', is: ... 'palabra' ... 'palabra'"
    }
  }
};

fetch('${ORCHESTRATOR_URL}/api/phase3/${courseCode}/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(submission)
})
.then(res => res.json())
.then(result => console.log(result));
// Expected response: { success: true, legoCount: N, introCount: M, savedTo: {...} }
\`\`\`

**Response format**:
\`\`\`json
{
  "success": true,
  "legoCount": 15,
  "introCount": 0,
  "savedTo": {
    "lego_pairs": "public/vfs/courses/${courseCode}/lego_pairs.json",
    "introductions": "public/vfs/courses/${courseCode}/introductions.json"
  }
}
\`\`\`
\`\`\`

---

## 🎬 EXECUTE NOW

### Step 1: Spawn All ${agentsInThisBrowser} Sub-Agents in Parallel

**CRITICAL**: Use ONE message with ${agentsInThisBrowser} Task tool calls.

For each agent, use this exact prompt structure (changing only the seed range):

\`\`\`
[Copy the entire "Phase 3 Sub-Agent" prompt template above]
[Change only: "Extract S00XX through S00YY" to match agent's range]
\`\`\`

### Step 2: Monitor Completion

Watch for all ${agentsInThisBrowser} sub-agents to report successful API POST.

Each will show:
\`\`\`
✅ Successfully POSTed to API
   Response: { success: true, legoCount: 10, savedTo: {...} }
\`\`\`

### Step 3: Verify

Once all complete, verify results via API:
\`\`\`bash
curl ${ORCHESTRATOR_URL}/api/courses/${courseCode}/phase-outputs/3/lego_pairs.json
\`\`\`

Or check dashboard:
https://ssi-dashboard-v7.vercel.app/courses/${courseCode}

### Step 4: Done!

All agents POST directly to the orchestrator API. No git branches needed - data is merged automatically on the server side.

---

## ✅ SUCCESS CRITERIA

- All ${totalSeeds} seeds extracted
- Zero Pragmatic FD violations (no standalone pronouns/articles/particles)
- Overlapping chains used where pedagogically valuable
- Components on all M-types
- All marked \`new: true\`

**Target time**: ~15-20 minutes for ${totalSeeds} seeds

**You are building world-class language learning materials!**
`;
}

/**
 * POST /start
 * Start Phase 3 LEGO extraction for a course
 *
 * Body: {
 *   courseCode: string,
 *   totalSeeds: number,
 *   strategy?: 'balanced' | 'fast' | 'quick_test' | 'auto',
 *   target?: string,    // e.g., 'spa', 'cmn'
 *   known?: string      // e.g., 'eng'
 * }
 */
app.post('/start', async (req, res) => {
  const {
    courseCode,
    totalSeeds,
    strategy = 'auto',
    target,
    known,
    startSeed = 1,
    endSeed = totalSeeds
  } = req.body;

  if (!courseCode || !totalSeeds) {
    return res.status(400).json({ error: 'courseCode and totalSeeds required' });
  }

  // Check if already running
  if (activeJobs.has(courseCode)) {
    return res.status(409).json({ error: `Phase 3 already running for ${courseCode}` });
  }

  console.log(`\n🚀 Starting Phase 3 for ${courseCode}`);
  console.log(`   Total seeds: ${totalSeeds}`);
  console.log(`   Strategy: ${strategy}`);

  // Calculate segmentation (3-tier: browsers × agents × seeds)
  const segmentation = calculateSegmentation(totalSeeds);

  console.log(`   Segmentation: ${segmentation.strategy}`);
  console.log(`   Parallelization: ${segmentation.browsers} browsers × ${segmentation.agentsPerBrowser} agents × ${segmentation.seedsPerAgent} seed(s)`);
  console.log(`   Total capacity: ${segmentation.capacity} seeds (${segmentation.totalAgents} agents)`);
  console.log(`   Browsers to spawn: ${segmentation.browsers}`);

  // Initialize job state with enhanced tracking
  const job = {
    courseCode,
    totalSeeds,
    startSeed,
    endSeed,
    target: target || courseCode.split('_')[0],
    known: known || courseCode.split('_')[2],
    segmentation,
    status: 'spawning_orchestrators',
    startedAt: new Date().toISOString(),

    // Milestone tracking
    milestones: {
      segmentationCalculated: true,
      segmentationCalculatedAt: new Date().toISOString(),
      watcherStarted: false,
      watcherStartedAt: null,
      orchestratorsSpawned: 0,
      orchestratorsTotal: segmentation.segmentCount,
      lastOrchestratorSpawnedAt: null,
      branchesDetected: 0,
      branchesExpected: segmentation.segmentCount,
      lastBranchDetectedAt: null,
      branchesMerged: 0,
      mergeStartedAt: null,
      mergeCompletedAt: null,
      deduplicationStartedAt: null,
      deduplicationCompletedAt: null
    },

    // Branch tracking (detailed)
    branches: [],

    // Legacy fields (for backward compatibility)
    orchestratorsSpawned: 0,
    branchesDetected: 0,
    merged: false,
    error: null,
    warnings: []
  };

  activeJobs.set(courseCode, job);

  try {
    // Start branch watcher for phase3-segment-* branches
    await startBranchWatcher(courseCode, segmentation.segmentCount);

    // Update milestone
    job.milestones.watcherStarted = true;
    job.milestones.watcherStartedAt = new Date().toISOString();

    // Spawn browser windows (one per segment)
    await spawnSegmentOrchestrators(courseCode, {
      target: target || courseCode.split('_')[0],
      known: known || courseCode.split('_')[2],
      startSeed,
      endSeed
    }, segmentation);

    res.json({
      success: true,
      message: `Phase 3 started for ${courseCode}`,
      job: {
        courseCode,
        totalSeeds,
        strategy: segmentation.strategy,
        segmentCount: segmentation.segmentCount,
        totalAgents: segmentation.totalAgents,
        status: 'running'
      }
    });
  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    activeJobs.delete(courseCode);

    console.error(`❌ Failed to start Phase 3 for ${courseCode}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Run LEGO reuse tracking (Phase 2: Conflict Resolution)
 * Marks duplicate LEGOs with new: false and ref: firstSeedId
 * Also detects LEGOs embedded within recently seen LEGOs (10-LEGO window)
 */
async function runDeduplication(courseCode) {
  console.log(`\n🔍 Running LEGO reuse tracking (Phase 2) for ${courseCode}...`);

  const legoPairsPath = path.join(VFS_ROOT, courseCode, 'lego_pairs.json');

  if (!fs.existsSync(legoPairsPath)) {
    console.log(`   ⚠️  lego_pairs.json not found, skipping deduplication`);
    return;
  }

  // Helper: normalize text for comparison (lowercase, remove punctuation)
  const normalize = (text) => text.toLowerCase().replace(/[.,!?;:'"¿¡]/g, '').trim();

  // Helper: check if phrase exists as substring within container (character-level)
  const containsSubstring = (container, phrase) => {
    if (container === phrase) return false; // Must be proper subset
    return container.includes(phrase);
  };

  try {
    const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

    // Track ALL seen LEGOs for exact duplicate detection
    const seenLegos = new Map(); // key -> seedId (for ref)

    // Track last 10 LEGOs for embedded detection (sliding window)
    const recentLegos = []; // Array of {target, known} normalized
    const EMBEDDED_WINDOW = 10;

    let totalLegos = 0;
    let exactDuplicates = 0;
    let embeddedMatches = 0;

    legoPairs.seeds.forEach((seed) => {
      const seedId = seed.seed_id;

      seed.legos.forEach((lego) => {
        totalLegos++;
        const target = lego.lego?.target || lego.target;
        const known = lego.lego?.known || lego.known;

        const normTarget = normalize(target);
        const normKnown = normalize(known);
        const key = `${normTarget}|${normKnown}`;

        // Check 1: Exact match against ALL seen LEGOs
        if (seenLegos.has(key)) {
          lego.new = false;
          lego.ref = seenLegos.get(key);
          exactDuplicates++;

          // Still add to recent window
          recentLegos.push({ target: normTarget, known: normKnown });
          if (recentLegos.length > EMBEDDED_WINDOW) recentLegos.shift();
          return;
        }

        // Check 2: Embedded in last 10 LEGOs only
        let isEmbedded = false;
        for (const recent of recentLegos) {
          if (containsSubstring(recent.target, normTarget) &&
              containsSubstring(recent.known, normKnown)) {
            isEmbedded = true;
            break;
          }
        }

        if (isEmbedded) {
          lego.new = false;
          delete lego.ref;
          embeddedMatches++;
        } else {
          // First occurrence - mark as debut
          lego.new = true;
          delete lego.ref;
        }

        // Add to both tracking structures
        seenLegos.set(key, seedId);
        recentLegos.push({ target: normTarget, known: normKnown });
        if (recentLegos.length > EMBEDDED_WINDOW) recentLegos.shift();
      });
    });

    // Write updated file
    fs.writeFileSync(legoPairsPath, JSON.stringify(legoPairs, null, 2));

    console.log(`   ✅ Deduplication complete!`);
    console.log(`      Total LEGOs: ${totalLegos}`);
    console.log(`      Unique (new: true): ${seenLegos.size - embeddedMatches}`);
    console.log(`      Exact duplicates: ${exactDuplicates}`);
    console.log(`      Embedded (within last 10): ${embeddedMatches}`);

  } catch (error) {
    console.error(`   ❌ Deduplication failed:`, error.message);
    throw error;
  }
}

/**
 * Run automatic collision check (Phase 3.6)
 * Called after deduplication to detect and fix Learner Uncertainty Test (LUT) violations
 * LUT = when same KNOWN phrase maps to multiple different TARGET phrases
 * Returns true if collisions found and re-extraction started
 */
async function runAutomaticCollisionCheck(courseCode, job) {
  console.log(`\n🔍 [Phase 3.6] Running automatic LUT check for ${courseCode}...`);

  const courseDir = path.join(VFS_ROOT, courseCode);
  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');

  if (!fs.existsSync(legoPairsPath)) {
    console.log(`   ⚠️  lego_pairs.json not found, skipping LUT check`);
    return false;
  }

  try {
    // Read lego_pairs.json
    const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

    // Build lookup table for LUT check: known phrase → set of target phrases
    const lut = new Map();
    const violationsBySeed = {};
    let totalViolations = 0;

    // Scan LEGOs to build LUT (only first 100 seeds)
    // After 100 seeds, learners have enough exposure to handle ambiguity
    // and can benefit from larger chunks anyway
    legoPairs.seeds.forEach((seed) => {
      const seedId = seed.seed_id;
      const seedNum = parseInt(seedId.replace('S', ''));

      // Only check LUT violations in first 100 seeds
      if (seedNum > 100) return;

      seed.legos.forEach((lego) => {
        const knownPhrase = lego.known;
        const targetPhrase = lego.target;

        if (!lut.has(knownPhrase)) {
          lut.set(knownPhrase, new Map());
        }

        const targetSet = lut.get(knownPhrase);
        if (!targetSet.has(targetPhrase)) {
          targetSet.set(targetPhrase, []);
        }

        targetSet.get(targetPhrase).push(seedId);
      });
    });

    // Detect LUT violations (known phrase maps to multiple different targets)
    lut.forEach((targetSet, knownPhrase) => {
      if (targetSet.size > 1) {
        // LUT violation detected!
        const targets = Array.from(targetSet.keys());

        console.log(`   ⚠️  LUT VIOLATION: "${knownPhrase}" → ${targets.join(' / ')}`);

        // Apply FCFS rule: First Come First Served
        // Keep first occurrence, mark subsequent ones for re-extraction
        const allSeeds = [];
        targetSet.forEach((seedIds, target) => {
          seedIds.forEach(seedId => {
            allSeeds.push({ seedId, target });
          });
        });

        // Sort by seed_id to maintain FCFS order
        allSeeds.sort((a, b) => a.seedId.localeCompare(b.seedId));

        const firstSeed = allSeeds[0];
        const subsequentSeeds = allSeeds.slice(1);

        subsequentSeeds.forEach(({ seedId, target }) => {
          if (!violationsBySeed[seedId]) {
            violationsBySeed[seedId] = [];
          }

          violationsBySeed[seedId].push({
            collision_key: knownPhrase,
            conflicting_targets: targets,
            kept_target: firstSeed.target,
            kept_in_seed: firstSeed.seedId
          });

          totalViolations++;
        });
      }
    });

    if (totalViolations === 0) {
      console.log(`   ✅ No LUT violations detected - Phase 3 complete!`);
      return false;
    }

    // LUT violations found - generate manifest and trigger re-extraction
    const affectedSeeds = Object.keys(violationsBySeed).sort();

    console.log(`\n   ⚠️  LUT VIOLATIONS DETECTED:`);
    console.log(`      Total violations: ${totalViolations}`);
    console.log(`      Affected seeds: ${affectedSeeds.length}`);
    console.log(`      First affected seed: ${affectedSeeds[0]}`);

    // Save manifest
    const manifestPath = path.join(courseDir, 'lego_pairs_reextraction_manifest.json');
    const manifest = {
      version: '3.6.0',
      course: courseCode,
      generated: new Date().toISOString(),
      total_violations: totalViolations,
      affected_seeds: affectedSeeds,
      violations_by_seed: violationsBySeed
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`      Manifest saved: ${manifestPath}`);

    // Trigger re-extraction internally
    console.log(`\n   🔧 Starting automatic re-extraction...`);

    const reextractionJob = {
      courseCode,
      mode: 'auto_reextraction',
      affectedSeeds,
      totalSeeds: affectedSeeds.length,
      collisionManifest: violationsBySeed,
      status: 'preparing',
      startedAt: new Date().toISOString(),
      branches: [],
      milestones: {
        orchestratorsSpawned: 0,
        orchestratorsTotal: affectedSeeds.length,
        branchesDetected: 0,
        branchesExpected: affectedSeeds.length,
        mergeStartedAt: null,
        mergeCompletedAt: null
      },
      error: null
    };

    activeJobs.set(courseCode, reextractionJob);

    // Spawn re-extraction sessions asynchronously
    setTimeout(async () => {
      await spawnReextractionSessions(courseCode, reextractionJob);
    }, 100);

    return true; // LUT violations found and re-extraction started

  } catch (error) {
    console.error(`   ❌ LUT check failed:`, error.message);
    throw error;
  }
}

/**
 * Start branch watcher for phase3-segment-* branches
 */
/**
 * Start branch watcher for Phase 3 segments
 * Polls git remote for phase3-segment-* branches and tracks them
 */
async function startBranchWatcher(courseCode, expectedSegments) {
  console.log(`\n👁️  Starting branch watcher for ${courseCode}`);
  console.log(`   Expected segments: ${expectedSegments}`);
  console.log(`   Branch pattern: phase3-segment-*-${courseCode} or claude/phase3-*`);

  const job = activeJobs.get(courseCode);
  if (!job) return;

  // Poll for branches every 15 seconds
  const watchInterval = setInterval(async () => {
    try {
      // Fetch latest from remote
      await execAsync('git fetch --all', { cwd: VFS_ROOT });

      // Look for Phase 3 branches for this course (support both patterns)
      const result = await execAsync(
        `git branch -r | grep -E "(phase3-segment.*${courseCode}|claude/phase3.*${courseCode})" || true`,
        { cwd: VFS_ROOT }
      );

      const branches = result.stdout
        .split('\n')
        .filter(b => b.trim())
        .map(b => b.trim().replace('origin/', ''));

      if (branches.length > 0) {
        // Update job with new branches
        const currentBranchNames = job.branches.map(b => b.branchName);
        const newBranches = branches.filter(b => !currentBranchNames.includes(b));

        newBranches.forEach(branchName => {
          // Extract segment number if possible
          const segmentMatch = branchName.match(/segment-(\d+)/i);
          const segmentNum = segmentMatch ? parseInt(segmentMatch[1]) : null;

          // Find corresponding segment in segmentation
          let seedRange = 'unknown';
          let expectedSeeds = 0;
          if (segmentNum && job.segmentation && job.segmentation.segments) {
            const segment = job.segmentation.segments.find(s => s.segmentNumber === segmentNum);
            if (segment) {
              const segmentStart = job.startSeed + segment.startSeed - 1;
              const segmentEnd = job.startSeed + segment.endSeed - 1;
              seedRange = `S${String(segmentStart).padStart(4, '0')}-S${String(segmentEnd).padStart(4, '0')}`;
              expectedSeeds = segment.seedCount;
            }
          }

          // Add to branches array
          job.branches.push({
            branchName,
            detectedAt: new Date().toISOString(),
            seedRange,
            segmentNumber: segmentNum,
            expectedSeeds,
            merged: false
          });

          // Update milestones
          job.milestones.branchesDetected = job.branches.length;
          job.milestones.lastBranchDetectedAt = new Date().toISOString();
          job.branchesDetected = job.branches.length; // Legacy

          console.log(`  [Watcher] Branch ${job.branches.length}/${expectedSegments}: ${branchName} (${seedRange})`);
        });

        // Check if all branches detected
        if (job.branches.length >= expectedSegments && job.status === 'waiting_for_completion') {
          console.log(`\n  [Watcher] ✅ All ${expectedSegments} branches detected!`);
          console.log(`  [Watcher] Starting merge process...`);

          clearInterval(watchInterval);
          watchers.delete(courseCode);

          job.status = 'merging_branches';
          job.milestones.mergeStartedAt = new Date().toISOString();

          // TODO: Trigger merge process
          // For now, just mark as complete
          setTimeout(() => {
            job.merged = true;
            job.milestones.branchesMerged = job.branches.length;
            job.milestones.mergeCompletedAt = new Date().toISOString();
            job.status = 'deduplicating';
            job.branches.forEach(b => b.merged = true);

            // Trigger deduplication
            job.milestones.deduplicationStartedAt = new Date().toISOString();
            runDeduplication(courseCode).then(() => {
              job.milestones.deduplicationCompletedAt = new Date().toISOString();
              job.status = 'complete';

              // Notify orchestrator
              notifyOrchestrator(courseCode, 'complete');
            }).catch(err => {
              console.error(`[Watcher] Deduplication failed:`, err);
              job.status = 'failed';
              job.error = `Deduplication failed: ${err.message}`;
            });
          }, 2000);
        }
      }
    } catch (error) {
      console.error(`[Watcher] Error polling branches:`, error.message);
    }
  }, 15000);

  watchers.set(courseCode, watchInterval);

  return Promise.resolve();
}

/**
 * Start branch watcher for re-extraction branches
 * Watches for claude/phase3-reextract-* branches and triggers dedup → collision check when complete
 */
async function startReextractionBranchWatcher(courseCode, expectedBranches) {
  console.log(`\n👁️  [Re-extraction Watcher] Starting for ${courseCode}`);
  console.log(`   Expected branches: ${expectedBranches}`);
  console.log(`   Branch pattern: claude/phase3-reextract-*-${courseCode}`);

  const job = activeJobs.get(courseCode);
  if (!job) return;

  // Poll for branches every 15 seconds
  const watchInterval = setInterval(async () => {
    try {
      // Fetch latest from remote
      await execAsync('git fetch --all', { cwd: VFS_ROOT });

      // Look for re-extraction branches for this course
      const result = await execAsync(
        `git branch -r | grep -E "claude/phase3-reextract-.*${courseCode}" || true`,
        { cwd: VFS_ROOT }
      );

      const branches = result.stdout
        .split('\n')
        .filter(b => b.trim())
        .map(b => b.trim().replace('origin/', ''));

      if (branches.length > 0) {
        // Update job with new branches
        const currentBranchNames = job.branches.map(b => b.branchName);
        const newBranches = branches.filter(b => !currentBranchNames.includes(b));

        newBranches.forEach(branchName => {
          // Extract seed ID from branch name
          const seedMatch = branchName.match(/reextract-(S\d+)/i);
          const seedId = seedMatch ? seedMatch[1] : 'unknown';

          job.branches.push({
            branchName,
            seedId,
            detectedAt: new Date().toISOString(),
            merged: false
          });

          job.milestones.branchesDetected = job.branches.length;
          job.milestones.lastBranchDetectedAt = new Date().toISOString();

          console.log(`  [Re-extraction Watcher] Branch ${job.branches.length}/${expectedBranches}: ${branchName} (${seedId})`);
        });

        // Check if all branches detected
        if (job.branches.length >= expectedBranches && job.status === 'waiting_for_completion') {
          console.log(`\n  [Re-extraction Watcher] ✅ All ${expectedBranches} branches detected!`);
          console.log(`  [Re-extraction Watcher] Starting merge → dedup → collision check cycle...`);

          clearInterval(watchInterval);
          watchers.delete(courseCode);

          job.status = 'merging_branches';
          job.milestones.mergeStartedAt = new Date().toISOString();

          // Simulate merge (TODO: actual git merge implementation)
          setTimeout(async () => {
            job.merged = true;
            job.milestones.branchesMerged = job.branches.length;
            job.milestones.mergeCompletedAt = new Date().toISOString();
            job.status = 'deduplicating';
            job.branches.forEach(b => b.merged = true);

            console.log(`\n  [Re-extraction Watcher] Starting deduplication...`);
            job.milestones.deduplicationStartedAt = new Date().toISOString();

            try {
              await runDeduplication(courseCode);
              job.milestones.deduplicationCompletedAt = new Date().toISOString();

              console.log(`\n  [Re-extraction Watcher] Running LUT check again...`);
              const lutViolationsFound = await runAutomaticCollisionCheck(courseCode, job);

              if (lutViolationsFound) {
                console.log(`\n  [Re-extraction Watcher] ⚠️  More LUT violations found - continuing cycle`);
                // Job continues with new re-extraction
              } else {
                console.log(`\n  [Re-extraction Watcher] ✅ No more LUT violations - Phase 3 complete!`);
                job.status = 'complete';
                await notifyOrchestrator(courseCode, 'complete');
              }
            } catch (err) {
              console.error(`  [Re-extraction Watcher] ❌ Error:`, err.message);
              job.status = 'failed';
              job.error = err.message;
            }
          }, 2000);
        }
      }
    } catch (error) {
      console.error(`  [Re-extraction Watcher] Error polling branches:`, error.message);
    }
  }, 15000);

  watchers.set(courseCode, watchInterval);

  return Promise.resolve();
}

/**
 * Spawn browser windows for parallel LEGO extraction
 */
async function spawnSegmentOrchestrators(courseCode, params, segmentation) {
  const { target, known, startSeed, endSeed } = params;
  const { segments } = segmentation;

  console.log(`\n🌐 Spawning ${segments.length} segment orchestrator(s)...`);

  // Import browser spawning utility
  const spawnClaudeWebAgent = await loadWebAgentSpawner();

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const segmentStart = startSeed + segment.startSeed - 1;
    const segmentEnd = startSeed + segment.endSeed - 1;

    console.log(`\n  Browser ${segment.browserNumber}/${segments.length}:`);
    console.log(`    Seed range: S${String(segmentStart).padStart(4, '0')}-S${String(segmentEnd).padStart(4, '0')}`);
    console.log(`    Agents: ${segment.agentCount} × ${segment.seedsPerAgent} seed(s)`);

    // Generate master prompt for this browser
    const prompt = generatePhase3MasterPrompt(courseCode, {
      target,
      known,
      startSeed: segmentStart,
      endSeed: segmentEnd,
      browserNumber: segment.browserNumber
    }, segmentation);

    // Spawn browser window
    if (spawnClaudeWebAgent) {
      try {
        await spawnClaudeWebAgent(prompt, 3, 'safari');
        console.log(`    ✅ Orchestrator spawned`);

        const job = activeJobs.get(courseCode);
        if (job) {
          job.orchestratorsSpawned++;
          job.milestones.orchestratorsSpawned = job.orchestratorsSpawned;
          job.milestones.lastOrchestratorSpawnedAt = new Date().toISOString();
        }

        // Delay between spawns
        if (i < segments.length - 1) {
          console.log(`    Waiting ${AGENT_SPAWN_DELAY}ms before next segment...`);
          await new Promise(resolve => setTimeout(resolve, AGENT_SPAWN_DELAY));
        }
      } catch (error) {
        console.error(`    ❌ Failed to spawn orchestrator:`, error.message);
        const job = activeJobs.get(courseCode);
        if (job && !job.warnings) job.warnings = [];
        if (job) job.warnings.push(`Failed to spawn orchestrator ${segment.segmentNumber}: ${error.message}`);
      }
    } else {
      // Fallback: just log the prompt
      console.log(`\n📝 Prompt for Segment ${segment.segmentNumber}:`);
      console.log(prompt);
      console.log('\n' + '='.repeat(80) + '\n');
    }
  }

  const job = activeJobs.get(courseCode);
  if (job) {
    job.status = 'waiting_for_completion';
  }

  console.log(`\n✅ All ${segments.length} orchestrator(s) spawned`);
  console.log(`   Monitor browser tabs for progress`);
}

/**
 * Load web agent spawner (if available)
 */
async function loadWebAgentSpawner() {
  try {
    const spawnerPath = path.join(__dirname, '../../shared/spawn-agent.cjs');
    if (await fs.pathExists(spawnerPath)) {
      const { spawnClaudeWebAgent } = require(spawnerPath);
      return spawnClaudeWebAgent;
    }
  } catch (error) {
    console.warn(`⚠️  Web agent spawner not available: ${error.message}`);
  }
  return null;
}

/**
 * GET /status/:courseCode
 * Get current Phase 3 status (Enhanced with realistic observables)
 */
app.get('/status/:courseCode', (req, res) => {
  const { courseCode } = req.params;
  const job = activeJobs.get(courseCode);

  if (!job) {
    return res.status(404).json({ error: `No Phase 3 job found for ${courseCode}` });
  }

  // Calculate timing metrics
  const startTime = new Date(job.startedAt).getTime();
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - startTime) / 1000);

  // Calculate velocity (if branches are appearing)
  let velocity = null;
  if (job.branches && job.branches.length > 0) {
    const firstBranchTime = new Date(job.branches[0].detectedAt).getTime();
    const elapsedSinceFirstBranch = (now - firstBranchTime) / 1000;
    const avgSecondsPerBranch = elapsedSinceFirstBranch / job.branches.length;
    const remainingBranches = job.milestones.branchesExpected - job.branches.length;
    const estimatedSecondsRemaining = remainingBranches * avgSecondsPerBranch;

    velocity = {
      branchesCompleted: job.branches.length,
      elapsedSinceFirstBranch: Math.floor(elapsedSinceFirstBranch),
      avgSecondsPerBranch: Math.floor(avgSecondsPerBranch),
      estimatedSecondsRemaining: Math.floor(estimatedSecondsRemaining),
      estimatedCompletionAt: new Date(now + estimatedSecondsRemaining * 1000).toISOString()
    };
  }

  // Calculate coverage
  const coverage = job.segmentation ? {
    seedsTotal: job.totalSeeds,
    segmentCount: job.segmentation.segmentCount,
    totalAgents: job.segmentation.totalAgents,
    seedsPerAgent: job.segmentation.seedsPerAgent,
    strategy: job.segmentation.strategy
  } : null;

  // Determine sub-status
  let subStatus = null;
  if (job.status === 'spawning_orchestrators') {
    if (job.milestones.orchestratorsSpawned < job.milestones.orchestratorsTotal) {
      subStatus = `spawning_orchestrator_${job.milestones.orchestratorsSpawned + 1}_of_${job.milestones.orchestratorsTotal}`;
    } else {
      subStatus = 'all_orchestrators_spawned';
    }
  } else if (job.status === 'waiting_for_branches') {
    if (job.milestones.branchesDetected === 0) {
      subStatus = 'waiting_for_first_branch';
    } else {
      subStatus = `${job.milestones.branchesDetected}_of_${job.milestones.branchesExpected}_branches_detected`;
    }
  } else if (job.status === 'merging_branches') {
    subStatus = 'merge_in_progress';
  } else if (job.status === 'deduplicating') {
    subStatus = 'running_phase3.5_deduplication';
  }

  res.json({
    courseCode,
    status: job.status,
    subStatus,

    milestones: job.milestones,

    branches: job.branches.map(b => ({
      branchName: b.branchName,
      detectedAt: b.detectedAt,
      seedRange: b.seedRange,
      segmentNumber: b.segmentNumber,
      expectedSeeds: b.expectedSeeds,
      merged: b.merged || false
    })),

    timing: {
      startedAt: job.startedAt,
      elapsedSeconds,
      velocity
    },

    coverage,

    segmentation: job.segmentation,

    error: job.error,
    warnings: job.warnings || [],

    // Legacy fields for backward compatibility
    orchestratorsSpawned: job.orchestratorsSpawned,
    branchesDetected: job.branchesDetected,
    merged: job.merged
  });
});

/**
 * POST /stop/:courseCode
 * Stop Phase 3 for a course
 */
app.post('/stop/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const job = activeJobs.get(courseCode);

  if (!job) {
    return res.status(404).json({ error: `No Phase 3 job found for ${courseCode}` });
  }

  console.log(`\n🛑 Stopping Phase 3 for ${courseCode}...`);

  // Kill branch watcher
  const watcher = watchers.get(courseCode);
  if (watcher) {
    watcher.kill();
    watchers.delete(courseCode);
  }

  activeJobs.delete(courseCode);

  res.json({
    success: true,
    message: `Phase 3 stopped for ${courseCode}`
  });
});

/**
 * GET /progress/:course - Get Phase 3 progress for a course
 * Similar to Phase 5's basket-status endpoint
 */
app.get('/progress/:course', async (req, res) => {
  try {
    const { course } = req.params;
    const courseDir = path.join(VFS_ROOT || process.cwd(), 'public/vfs/courses', course);
    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
    const seedPairsPath = path.join(courseDir, 'seed_pairs.json');

    if (!await fs.pathExists(legoPairsPath)) {
      return res.json({
        success: true,
        totalLegos: 0,
        totalSeeds: 0,
        complete: false,
        progress: 0
      });
    }

    const legoPairs = await fs.readJson(legoPairsPath);
    const totalLegos = legoPairs.seeds.reduce((sum, seed) => sum + seed.legos.length, 0);
    const totalSeeds = legoPairs.seeds.length;

    // Check if we have seed_pairs to compare against
    let expectedSeeds = totalSeeds;
    if (await fs.pathExists(seedPairsPath)) {
      const seedPairs = await fs.readJson(seedPairsPath);
      expectedSeeds = seedPairs.seeds?.length || totalSeeds;
    }

    const complete = totalSeeds >= expectedSeeds;
    const progress = expectedSeeds > 0 ? Math.round((totalSeeds / expectedSeeds) * 10000) / 100 : 0;

    // Get metadata if available
    const lastGenerated = legoPairs.metadata?.generated_at || legoPairs.metadata?.last_merged;

    res.json({
      success: true,
      totalLegos,
      totalSeeds,
      expectedSeeds,
      complete,
      progress,
      lastGenerated
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /upload-legos - Receive LEGO extractions directly from Claude Code agents
 *
 * Body: {
 *   course: 'cmn_for_eng',
 *   seed: 'S0532',
 *   agentId: 'agent-01',
 *   seedData: {
 *     seed_id: 'S0532',
 *     seed_pair: ['English', '中文'],
 *     legos: [
 *       { id: 'S0532L01', type: 'A', target: '现在', known: 'now', new: true },
 *       ...
 *     ]
 *   }
 * }
 */
app.post('/upload-legos', async (req, res) => {
  try {
    const { course, seed, seedData, agentId } = req.body;

    if (!course || !seed || !seedData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: course, seed, seedData'
      });
    }

    console.log(`📥 Receiving LEGO upload: ${course} / ${seed} (${seedData.legos?.length || 0} LEGOs)${agentId ? ` from ${agentId}` : ''}`);

    // Course directory
    const courseDir = path.join(VFS_ROOT || process.cwd(), 'public/vfs/courses', course);
    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
    const phase3OutputsDir = path.join(courseDir, 'phase3_outputs');

    // Ensure directories exist
    await fs.ensureDir(phase3OutputsDir);

    // Save individual seed file
    const seedFilePath = path.join(phase3OutputsDir, `seed_${seed}_legos.json`);
    await fs.writeJson(seedFilePath, seedData, { spaces: 2 });
    console.log(`   💾 Saved to ${seedFilePath}`);

    // Load or create lego_pairs.json
    let legoPairs = {
      course_code: course,
      total_seeds: 0,
      seeds: [],
      metadata: {}
    };
    if (await fs.pathExists(legoPairsPath)) {
      legoPairs = await fs.readJson(legoPairsPath);
    }

    // Find if seed already exists
    const existingIndex = legoPairs.seeds.findIndex(s => s.seed_id === seed);
    let addedLegos = 0;
    let updatedLegos = 0;

    if (existingIndex >= 0) {
      // Update existing seed
      legoPairs.seeds[existingIndex] = seedData;
      updatedLegos = seedData.legos?.length || 0;
      console.log(`   🔄 Updated existing seed ${seed}`);
    } else {
      // Add new seed
      legoPairs.seeds.push(seedData);
      addedLegos = seedData.legos?.length || 0;
      console.log(`   ✨ Added new seed ${seed}`);
    }

    // Sort seeds by seed_id
    legoPairs.seeds.sort((a, b) => a.seed_id.localeCompare(b.seed_id));

    // Calculate totals
    const totalSeeds = legoPairs.seeds.length;
    const totalLegos = legoPairs.seeds.reduce((sum, s) => sum + (s.legos?.length || 0), 0);
    const totalNewLegos = legoPairs.seeds.reduce((sum, s) =>
      sum + (s.legos?.filter(l => l.new === true).length || 0), 0);

    legoPairs.total_seeds = totalSeeds;

    // Update metadata with enhanced tracking
    if (!legoPairs.metadata.uploads) {
      legoPairs.metadata.uploads = [];
    }

    legoPairs.metadata = {
      ...legoPairs.metadata,
      last_upload: new Date().toISOString(),
      last_seed: seed,
      last_agent: agentId || 'unknown',
      total_seeds: totalSeeds,
      total_legos: totalLegos,
      total_new_legos: totalNewLegos
    };

    // Record upload event (keep last 50)
    legoPairs.metadata.uploads.push({
      timestamp: new Date().toISOString(),
      seed,
      agentId: agentId || 'unknown',
      legosAdded: addedLegos,
      legosUpdated: updatedLegos,
      totalAfter: totalLegos
    });

    if (legoPairs.metadata.uploads.length > 50) {
      legoPairs.metadata.uploads = legoPairs.metadata.uploads.slice(-50);
    }

    // Save merged file
    await fs.writeJson(legoPairsPath, legoPairs, { spaces: 2 });

    console.log(`   ✅ Merged into lego_pairs.json`);
    console.log(`   📊 Total: ${totalSeeds} seeds, ${totalLegos} LEGOs (${totalNewLegos} new)`);

    res.json({
      success: true,
      seed,
      agentId: agentId || 'unknown',
      timestamp: new Date().toISOString(),
      legosReceived: seedData.legos?.length || 0,
      addedLegos,
      updatedLegos,
      totalSeeds,
      totalLegos,
      totalNewLegos
    });

  } catch (error) {
    console.error('❌ Upload LEGO error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /phase-complete
 * Webhook for segments reporting completion
 */
app.post('/phase-complete', async (req, res) => {
  const { courseCode, segmentNumber, status } = req.body;

  console.log(`\n✅ Segment ${segmentNumber} ${status} for ${courseCode}`);

  const job = activeJobs.get(courseCode);
  if (!job) {
    return res.json({ acknowledged: true });
  }

  job.branchesDetected = (job.branchesDetected || 0) + 1;

  // Check if all segments complete
  if (job.branchesDetected >= job.segmentation.segmentCount) {
    console.log(`\n🎉 All segments complete for ${courseCode}!`);

    // Run deduplication (Phase 3.5)
    await runDeduplication(courseCode);

    // Run automatic LUT check (Phase 3.6)
    const lutViolationsFound = await runAutomaticCollisionCheck(courseCode, job);

    if (lutViolationsFound) {
      console.log(`\n⚠️  LUT violations detected - Phase 3.6 re-extraction in progress`);
      // Job continues - don't mark complete yet
      // Re-extraction will trigger another dedup → LUT check cycle
      return res.json({ acknowledged: true, status: 'reextracting' });
    }

    job.status = 'complete';
    job.merged = true;

    // Notify orchestrator
    await notifyOrchestrator(courseCode, 'complete');
  }

  res.json({ acknowledged: true });
});

/**
 * Notify orchestrator of phase completion
 * Includes Phase 6 (introduction generation) as part of Phase 3
 */
async function notifyOrchestrator(courseCode, status) {
  // If Phase 3 completed successfully, run Phase 6 (introductions) before notifying
  if (status === 'complete') {
    try {
      console.log(`\n[Phase 3→6] Generating introductions for ${courseCode}...`);
      const courseDir = path.join(VFS_ROOT, courseCode);
      const result = await generateIntroductions(courseDir);
      console.log(`[Phase 3→6] ✅ Generated ${result.totalIntroductions} introductions`);
    } catch (error) {
      console.error(`[Phase 3→6] ❌ Introduction generation failed:`, error.message);
      // Don't fail Phase 3 if introductions fail - just warn
      console.warn(`[Phase 3→6] ⚠️  Continuing without introductions...`);
    }
  }

  try {
    const axios = require('axios');
    await axios.post(`${ORCHESTRATOR_URL}/phase-complete`, {
      phase: 3,
      courseCode,
      status,
      timestamp: new Date().toISOString()
    });
    console.log(`✅ Notified orchestrator: Phase 3 ${status} for ${courseCode}`);
  } catch (error) {
    console.error(`⚠️  Failed to notify orchestrator:`, error.message);
  }
}

/**
 * Spawn Claude Code sessions for re-extracting colliding seeds
 * One session per seed with collision-specific chunking instructions
 */
async function spawnReextractionSessions(courseCode, job) {
  console.log(`\n[Phase 3 Re-extraction] Starting spawning for ${job.affectedSeeds.length} seeds...`);

  const spawnClaudeWebAgent = await loadWebAgentSpawner();

  if (!spawnClaudeWebAgent) {
    console.error(`[Phase 3 Re-extraction] ❌ Web agent spawner not available`);
    job.status = 'failed';
    job.error = 'Web agent spawner not available';
    return;
  }

  job.status = 'spawning';

  const courseDir = path.join(VFS_ROOT, courseCode);
  const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
  const seedPairs = await fs.readJson(seedPairsPath);

  // Spawn sessions (batch of 10 at a time to avoid overwhelming system)
  const BATCH_SIZE = 10;
  let spawned = 0;

  for (let i = 0; i < job.affectedSeeds.length; i += BATCH_SIZE) {
    const batch = job.affectedSeeds.slice(i, i + BATCH_SIZE);

    console.log(`\n[Phase 3 Re-extraction] Spawning batch ${Math.floor(i / BATCH_SIZE) + 1}: Seeds ${batch[0]} to ${batch[batch.length - 1]}`);

    for (const seedId of batch) {
      const collisionInstructions = job.collisionManifest[seedId] || [];

      // Generate prompt with collision context
      const prompt = generateReextractionPrompt(courseCode, seedId, seedPairs, collisionInstructions);

      try {
        await spawnClaudeWebAgent(prompt, 3, 'safari');
        spawned++;
        job.milestones.orchestratorsSpawned = spawned;
        console.log(`    ✅ ${seedId} session spawned (${spawned}/${job.affectedSeeds.length})`);

        // Brief delay between spawns (8s works better than 2s)
        if (i + batch.indexOf(seedId) < job.affectedSeeds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 8000));
        }
      } catch (error) {
        console.error(`    ❌ Failed to spawn ${seedId}:`, error.message);
        if (!job.warnings) job.warnings = [];
        job.warnings.push(`Failed to spawn ${seedId}: ${error.message}`);
      }
    }

    // Longer delay between batches
    if (i + BATCH_SIZE < job.affectedSeeds.length) {
      console.log(`    Waiting 10s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  job.status = 'waiting_for_completion';
  console.log(`\n[Phase 3 Re-extraction] ✅ Spawned ${spawned}/${job.affectedSeeds.length} sessions`);
  console.log(`[Phase 3 Re-extraction] Monitor browser tabs for LEGO re-extraction`);

  // Start branch watcher for re-extraction branches
  await startReextractionBranchWatcher(courseCode, job.affectedSeeds.length);
}

/**
 * Generate re-extraction prompt with collision-specific chunking instructions
 */
function generateReextractionPrompt(courseCode, seedId, seedPairs, collisionInstructions) {
  // Get the seed pair
  const seedData = seedPairs.translations?.[seedId];
  if (!seedData) {
    throw new Error(`Seed ${seedId} not found in seed_pairs.json`);
  }

  const [knownSentence, targetSentence] = seedData;

  // Format collision instructions (using proven format from generate-collision-aware-reextraction.cjs)
  let collisionContext = '';
  if (collisionInstructions && collisionInstructions.length > 0) {
    const instructions = collisionInstructions.map(c =>
      `DO NOT extract "${c.collision_key}" as standalone LEGO. ` +
      `Reason: Registry collision - this phrase maps to multiple different TARGETs: ${c.conflicting_targets.join(', ')}. ` +
      `Solution: Chunk "${c.collision_key}" UP with adjacent words from this sentence to create a larger, unique LEGO. ` +
      `Use ONLY words from the source sentence - do not add new words.`
    ).join('\n\n');

    collisionContext = `

## ⚠️ COLLISION FIX MODE - CHUNKING-UP REQUIRED

**This seed has ${collisionInstructions.length} collision(s) that must be resolved:**

${instructions}

---
`;
  }

  return `
# Phase 3 Re-extraction: Fix Collisions for ${seedId}

## 📚 STEP 1: READ PHASE INTELLIGENCE

**GET Phase Intelligence from REST API**:
\`\`\`bash
curl ${ORCHESTRATOR_URL}/api/phase-intelligence/3
\`\`\`

(430 lines - v7.0: Two Heuristics Edition)

---
${collisionContext}

## 📖 YOUR TASK: Re-extract ${seedId}

**Seed Pair:**
- **Known**: ${knownSentence}
- **Target**: ${targetSentence}

**Your job:**
1. Extract LEGOs from this seed following Phase 3 v7.0 methodology
2. Apply the TWO CORE HEURISTICS (from intelligence doc)
3. **CRITICAL**: Apply collision-fixing chunking instructions above
4. POST your results to the orchestrator API

## 🎬 EXECUTE NOW

1. Read the Phase Intelligence doc via API
2. Extract LEGOs with collision-aware chunking
3. POST to API:

\`\`\`bash
curl -X POST ${ORCHESTRATOR_URL}/api/phase3/${courseCode}/submit \\
  -H "Content-Type: application/json" \\
  -d '{
    "lego_pairs": {
      "${seedId}": {
        "seed_pair": ["${knownSentence}", "${targetSentence}"],
        "legos": [
          {
            "id": "${seedId}L01",
            "type": "A",
            "target": "word",
            "known": "word",
            "new": true
          }
        ]
      }
    },
    "introductions": {}
  }'
\`\`\`

Or using fetch:
\`\`\`javascript
fetch('${ORCHESTRATOR_URL}/api/phase3/${courseCode}/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    lego_pairs: {
      "${seedId}": {
        seed_pair: ["${knownSentence}", "${targetSentence}"],
        legos: [
          { id: "${seedId}L01", type: "A", target: "word", known: "word", new: true }
        ]
      }
    },
    introductions: {}
  })
})
.then(res => res.json())
.then(result => console.log(result));
// Expected: { success: true, legoCount: N, savedTo: {...} }
\`\`\`
`;
}

/**
 * POST /reextract
 * Re-extract specific seeds with collision-fixing chunking instructions
 * Called by orchestrator after LUT check finds collisions
 */
app.post('/reextract', async (req, res) => {
  const { courseCode, affectedSeeds, manifest, mode } = req.body;

  if (!courseCode || !affectedSeeds || !Array.isArray(affectedSeeds)) {
    return res.status(400).json({
      error: 'courseCode and affectedSeeds array required'
    });
  }

  console.log(`\n[Phase 3 Re-extraction] Starting collision fix for ${courseCode}`);
  console.log(`[Phase 3 Re-extraction] Affected seeds: ${affectedSeeds.length}`);
  console.log(`[Phase 3 Re-extraction] Mode: ${mode || 'collision_fix'}`);

  try {
    const courseDir = path.join(VFS_ROOT, courseCode);
    const seedPairsPath = path.join(courseDir, 'seed_pairs.json');

    if (!await fs.pathExists(seedPairsPath)) {
      return res.status(404).json({
        error: 'seed_pairs.json not found',
        courseCode
      });
    }

    // Create reextraction job
    const job = {
      courseCode,
      mode: 'reextraction',
      affectedSeeds,
      totalSeeds: affectedSeeds.length,
      collisionManifest: manifest,
      status: 'preparing',
      startedAt: new Date().toISOString(),
      branches: [],
      milestones: {
        orchestratorsSpawned: 0,
        orchestratorsTotal: affectedSeeds.length,
        branchesDetected: 0,
        branchesExpected: affectedSeeds.length,
        mergeStartedAt: null,
        mergeCompletedAt: null
      },
      error: null
    };

    activeJobs.set(courseCode, job);

    console.log(`[Phase 3 Re-extraction] Job created for ${courseCode}`);
    console.log(`[Phase 3 Re-extraction] Will re-extract ${affectedSeeds.length} seeds with chunking instructions`);

    // Return immediately - actual spawning happens async
    res.json({
      success: true,
      courseCode,
      jobId: courseCode,
      affectedSeeds: affectedSeeds.length,
      message: `Re-extraction job started for ${affectedSeeds.length} seeds`,
      status: 'preparing'
    });

    // Spawn re-extraction sessions asynchronously
    setTimeout(async () => {
      await spawnReextractionSessions(courseCode, job);
    }, 100);

  } catch (error) {
    console.error(`[Phase 3 Re-extraction] Error:`, error.message);
    return res.status(500).json({
      error: error.message,
      courseCode
    });
  }
});

/**
 * ==========================================================================
 * PHASE 2: CONFLICT RESOLUTION ENDPOINTS
 * ==========================================================================
 */

/**
 * POST /phase2/detect
 * Detect KNOWN→TARGET conflicts in draft_lego_pairs.json
 *
 * Body: { courseCode: string }
 * Returns: Conflict report with affected LEGOs and suggested upchunks
 */
app.post('/phase2/detect', async (req, res) => {
  const { courseCode } = req.body;

  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode required' });
  }

  const draftPath = path.join(VFS_ROOT, courseCode, 'draft_lego_pairs.json');

  if (!fs.existsSync(draftPath)) {
    return res.status(404).json({
      error: `draft_lego_pairs.json not found for ${courseCode}`,
      path: draftPath
    });
  }

  console.log(`\n🔍 Phase 2: Detecting conflicts for ${courseCode}...`);

  try {
    let draftData = JSON.parse(fs.readFileSync(draftPath, 'utf8'));

    // Handle both array format and {seeds: [...]} format
    const seeds = Array.isArray(draftData) ? draftData : draftData.seeds;

    if (!seeds || seeds.length === 0) {
      return res.status(400).json({ error: 'No seeds found in draft_lego_pairs.json' });
    }

    // Build KNOWN→TARGET collision map
    // Key: normalized known text → Map of target texts → array of {seedId, legoId}
    const knownToTargets = new Map();

    // Helper: normalize text for comparison
    const normalize = (text) => text.toLowerCase().replace(/[.,!?;:'"¿¡]/g, '').trim();

    let totalLegos = 0;

    seeds.forEach((seed) => {
      const seedId = seed.seed_id;

      (seed.legos || []).forEach((lego) => {
        totalLegos++;
        const known = normalize(lego.lego?.known || lego.known || '');
        const target = lego.lego?.target || lego.target || '';
        const legoId = lego.id;

        if (!known || !target) return;

        if (!knownToTargets.has(known)) {
          knownToTargets.set(known, new Map());
        }

        const targetMap = knownToTargets.get(known);
        if (!targetMap.has(target)) {
          targetMap.set(target, []);
        }
        targetMap.get(target).push({ seedId, legoId, target });
      });
    });

    // Find conflicts (same KNOWN → multiple different TARGETs)
    const conflicts = [];

    for (const [known, targetMap] of knownToTargets.entries()) {
      if (targetMap.size > 1) {
        // This KNOWN maps to multiple TARGETs - conflict!
        const targets = [];
        for (const [target, occurrences] of targetMap.entries()) {
          targets.push({
            target,
            occurrences: occurrences.length,
            seeds: occurrences.slice(0, 5).map(o => o.seedId) // First 5 seeds
          });
        }

        conflicts.push({
          known,
          targetCount: targetMap.size,
          targets,
          totalOccurrences: targets.reduce((sum, t) => sum + t.occurrences, 0)
        });
      }
    }

    // Sort by total occurrences (most common conflicts first)
    conflicts.sort((a, b) => b.totalOccurrences - a.totalOccurrences);

    // Generate report
    const report = {
      courseCode,
      timestamp: new Date().toISOString(),
      summary: {
        totalSeeds: seeds.length,
        totalLegos: totalLegos,
        uniqueKnownWords: knownToTargets.size,
        conflictCount: conflicts.length,
        affectedLegos: conflicts.reduce((sum, c) => sum + c.totalOccurrences, 0)
      },
      conflicts: conflicts.slice(0, 50), // Top 50 conflicts
      allConflicts: conflicts
    };

    // Save report to course directory
    const reportPath = path.join(VFS_ROOT, courseCode, 'phase2_conflict_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`   ✅ Found ${conflicts.length} conflicts`);
    console.log(`   📄 Report saved to: ${reportPath}`);

    res.json({
      success: true,
      summary: report.summary,
      topConflicts: conflicts.slice(0, 10),
      reportPath
    });

  } catch (error) {
    console.error(`   ❌ Detection failed:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /phase2/apply
 * Apply conflict resolutions and LEGO reuse tracking
 *
 * Body: {
 *   courseCode: string,
 *   resolutions?: array (optional - if not provided, just does reuse tracking)
 * }
 *
 * Reads: draft_lego_pairs.json, upchunk_resolutions.json (if exists)
 * Writes: lego_pairs.json (conflict-free, with reuse markers)
 */
app.post('/phase2/apply', async (req, res) => {
  const { courseCode, resolutions } = req.body;

  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode required' });
  }

  const draftPath = path.join(VFS_ROOT, courseCode, 'draft_lego_pairs.json');
  const resolutionsPath = path.join(VFS_ROOT, courseCode, 'upchunk_resolutions.json');
  const outputPath = path.join(VFS_ROOT, courseCode, 'lego_pairs.json');

  if (!fs.existsSync(draftPath)) {
    return res.status(404).json({
      error: `draft_lego_pairs.json not found for ${courseCode}`
    });
  }

  console.log(`\n🔧 Phase 2: Applying resolutions for ${courseCode}...`);

  try {
    let draftData = JSON.parse(fs.readFileSync(draftPath, 'utf8'));

    // Handle both array format and {seeds: [...]} format
    const isArrayFormat = Array.isArray(draftData);
    const seeds = isArrayFormat ? draftData : draftData.seeds;

    // Load resolutions if provided or if file exists
    let upchunkResolutions = resolutions || [];
    if (!resolutions && fs.existsSync(resolutionsPath)) {
      const resData = JSON.parse(fs.readFileSync(resolutionsPath, 'utf8'));
      upchunkResolutions = resData.resolutions || resData || [];
      console.log(`   📄 Loaded ${upchunkResolutions.length} resolutions from file`);
    }

    // TODO: Apply upchunk resolutions (for now, just log)
    if (upchunkResolutions.length > 0) {
      console.log(`   ⚠️  Upchunk application not yet implemented - ${upchunkResolutions.length} resolutions pending`);
    }

    // Apply LEGO reuse tracking
    console.log(`   🔍 Running LEGO reuse tracking...`);

    const normalize = (text) => text.toLowerCase().replace(/[.,!?;:'"¿¡]/g, '').trim();
    const containsSubstring = (container, phrase) => {
      if (container === phrase) return false;
      return container.includes(phrase);
    };

    const seenLegos = new Map();
    const recentLegos = [];
    const EMBEDDED_WINDOW = 10;

    let totalLegos = 0;
    let exactDuplicates = 0;
    let embeddedMatches = 0;

    seeds.forEach((seed) => {
      const seedId = seed.seed_id;

      (seed.legos || []).forEach((lego) => {
        totalLegos++;
        const target = lego.lego?.target || lego.target;
        const known = lego.lego?.known || lego.known;

        if (!target || !known) return;

        const normTarget = normalize(target);
        const normKnown = normalize(known);
        const key = `${normTarget}|${normKnown}`;

        // Check 1: Exact match against ALL seen LEGOs
        if (seenLegos.has(key)) {
          lego.new = false;
          lego.ref = seenLegos.get(key);
          exactDuplicates++;

          recentLegos.push({ target: normTarget, known: normKnown });
          if (recentLegos.length > EMBEDDED_WINDOW) recentLegos.shift();
          return;
        }

        // Check 2: Embedded in last 10 LEGOs only
        let isEmbedded = false;
        for (const recent of recentLegos) {
          if (containsSubstring(recent.target, normTarget) &&
              containsSubstring(recent.known, normKnown)) {
            isEmbedded = true;
            break;
          }
        }

        if (isEmbedded) {
          lego.new = false;
          delete lego.ref;
          embeddedMatches++;
        } else {
          lego.new = true;
          delete lego.ref;
        }

        seenLegos.set(key, seedId);
        recentLegos.push({ target: normTarget, known: normKnown });
        if (recentLegos.length > EMBEDDED_WINDOW) recentLegos.shift();
      });
    });

    // Write output (preserve original format)
    const outputData = isArrayFormat ? seeds : { ...draftData, seeds };
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

    const summary = {
      courseCode,
      timestamp: new Date().toISOString(),
      totalSeeds: seeds.length,
      totalLegos,
      exactDuplicates,
      embeddedMatches,
      uniqueNew: seenLegos.size,
      resolutionsApplied: upchunkResolutions.length,
      outputPath
    };

    console.log(`   ✅ Reuse tracking complete!`);
    console.log(`      - Total LEGOs: ${totalLegos}`);
    console.log(`      - Exact duplicates: ${exactDuplicates}`);
    console.log(`      - Embedded (last 10): ${embeddedMatches}`);
    console.log(`      - Unique (new: true): ${seenLegos.size}`);
    console.log(`   📄 Output: ${outputPath}`);

    res.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error(`   ❌ Apply failed:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /phase2/status/:courseCode
 * Get Phase 2 status for a course
 */
app.get('/phase2/status/:courseCode', (req, res) => {
  const { courseCode } = req.params;

  const draftPath = path.join(VFS_ROOT, courseCode, 'draft_lego_pairs.json');
  const reportPath = path.join(VFS_ROOT, courseCode, 'phase2_conflict_report.json');
  const resolutionsPath = path.join(VFS_ROOT, courseCode, 'upchunk_resolutions.json');
  const outputPath = path.join(VFS_ROOT, courseCode, 'lego_pairs.json');

  const status = {
    courseCode,
    files: {
      draft_lego_pairs: fs.existsSync(draftPath),
      conflict_report: fs.existsSync(reportPath),
      upchunk_resolutions: fs.existsSync(resolutionsPath),
      lego_pairs: fs.existsSync(outputPath)
    },
    phase2Ready: fs.existsSync(draftPath),
    conflictsDetected: fs.existsSync(reportPath),
    resolutionsReady: fs.existsSync(resolutionsPath),
    phase2Complete: fs.existsSync(outputPath)
  };

  // If conflict report exists, include summary
  if (fs.existsSync(reportPath)) {
    try {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      status.conflictSummary = report.summary;
    } catch (e) {
      status.conflictSummary = null;
    }
  }

  res.json(status);
});

/**
 * Load web agent spawner
 */
async function loadWebAgentSpawner() {
  try {
    const spawnerPath = path.join(__dirname, '../../shared/spawn-agent.cjs');
    if (await fs.pathExists(spawnerPath)) {
      const { spawnClaudeWebAgent } = require(spawnerPath);
      return spawnClaudeWebAgent;
    }
  } catch (error) {
    console.warn(`⚠️  Web agent spawner not available: ${error.message}`);
  }
  return null;
}

/**
 * Language code to full name mapping
 */
function getLanguageName(code) {
  const names = {
    'eng': 'English', 'spa': 'Spanish', 'ita': 'Italian', 'fra': 'French',
    'deu': 'German', 'por': 'Portuguese', 'cmn': 'Mandarin Chinese'
  };
  return names[code.toLowerCase()] || code.toUpperCase();
}

/**
 * Generate Phase 2 master prompt with retry logic
 */
function generatePhase2MasterPrompt({ courseCode, target, known, orchestratorUrl, workers, relevantConflicts, totalSeeds, mode }) {
  const seedRange = workers.length > 0
    ? `${workers[0].seedIds[0]}-${workers[workers.length - 1].seedIds[workers[workers.length - 1].seedIds.length - 1]}`
    : 'N/A';

  return `# Phase 2 Master: Conflict Resolution + Upchunking

**Course**: ${courseCode}
**Target**: ${getLanguageName(target)} (${target})
**Known**: ${getLanguageName(known)} (${known})
**Seeds**: ${seedRange} (${totalSeeds} seeds total)
**Mode**: ${mode}

---

## YOUR ROLE: CONFLICT RESOLUTION MASTER

You spawn ${workers.length} worker agents via Task tool. Each worker:
1. Fetches their assigned seeds via curl
2. Identifies conflicting LEGOs (same known → multiple targets)
3. Creates M-type upchunks to disambiguate
4. Uploads resolved LEGOs with retry logic

**Worker assignments:**
${workers.map(w => `  - Worker ${w.workerNum}: ${w.seedIds.join(', ')} (${w.seedCount} seeds)`).join('\n')}

---

## CONFLICT SUMMARY (from detection)

${relevantConflicts.length} conflicts affecting these seeds:
${relevantConflicts.slice(0, 15).map(c =>
  `- "${c.known}" → ${c.targets.map(t => `"${t.target}"`).join(' | ')} (${c.totalOccurrences} uses)`
).join('\n')}
${relevantConflicts.length > 15 ? `\n... and ${relevantConflicts.length - 15} more conflicts` : ''}

---

## STEP 1: SPAWN ALL WORKERS IN PARALLEL

Use the Task tool ${workers.length} times in a SINGLE message to spawn all workers in parallel.

**CRITICAL**: Workers fetch their own methodology - do NOT summarize or paraphrase it!

---

${workers.map(w => `
## WORKER ${w.workerNum} PROMPT (copy exactly):

\`\`\`
# Phase 2 Worker ${w.workerNum}: Conflict Resolution

Course: ${courseCode}
**MY ASSIGNED SEEDS**: ${w.seedIds.join(', ')}
**SEED COUNT**: ${w.seedCount}
Orchestrator: ${orchestratorUrl}

---

## STEP 1: FETCH METHODOLOGY (CRITICAL - DO THIS FIRST!)

You MUST fetch and READ the complete methodology before processing any seeds:

curl -s "${orchestratorUrl}/api/phase-intelligence/2"

**READ THE ENTIRE RESPONSE.** It contains:
- ZUT (Zero Uncertainty Test) rules
- Conflict resolution strategies
- Upchunking rules
- Output format specification

**DO NOT PROCEED** until you have read and understood the methodology.

## STEP 2: FETCH MY SEEDS

**CRITICAL: Fetch EXACTLY these seed IDs - no others!**

curl -s "${orchestratorUrl}/api/phase2/${courseCode}/seeds?ids=${w.seedIds.join(',')}"

Verify the response contains ${w.seedCount} seeds with IDs: ${w.seedIds.join(', ')}
If you get different seeds, STOP and report an error.

## STEP 3: APPLY CONFLICT RESOLUTION

Following the methodology you fetched in Step 1:
1. Identify conflicting LEGOs (same known → multiple targets)
2. Create M-type upchunks to disambiguate
3. Mark component A-types as new: false when covered by M-types
4. Ensure every LEGO passes ZUT

## STEP 4: UPLOAD WITH RETRY

curl -X POST "${orchestratorUrl}/api/phase2/${courseCode}/upload-batch" \\
  -H "Content-Type: application/json" \\
  -d '[YOUR_JSON_ARRAY]'

If upload fails, retry up to 3 times with exponential backoff.
\`\`\`
`).join('\n')}

---

## STEP 2: WAIT FOR COMPLETION

After spawning all workers, wait for their Task tool results.
Collect success/failure status from each worker.

## STEP 3: REPORT COMPLETION

\`\`\`bash
curl -X POST "${orchestratorUrl}/api/phase2/${courseCode}/master-complete" \\
  -H "Content-Type: application/json" \\
  -d '{"seedsProcessed": ${totalSeeds}, "workers": ${workers.length}}'
\`\`\`

---

**IMPORTANT: Use curl for all HTTP requests, NOT WebFetch!**
`;
}

/**
 * POST /phase2/launch-test
 * Test Phase 2 with configurable seeds (default: 45 seeds = 3 workers × 15 seeds)
 */
app.post('/phase2/launch-test', async (req, res) => {
  const {
    courseCode,
    target = 'spa',
    known = 'eng',
    seedCount = 45,      // Default: 45 seeds for test
    workersCount = 3,    // Default: 3 workers for test
    seedsPerWorker = 15  // Bigger windows for better consistency
  } = req.body;

  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode required' });
  }

  console.log(`\n[Phase 2] ====================================`);
  console.log(`[Phase 2] TEST LAUNCH: ${seedCount} seeds`);
  console.log(`[Phase 2] ====================================`);
  console.log(`[Phase 2] Course: ${courseCode}`);
  console.log(`[Phase 2] Workers: ${workersCount} × ${seedsPerWorker} seeds each`);

  const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';
  const courseDir = path.join(VFS_ROOT, courseCode);

  // Load conflict report
  const reportPath = path.join(courseDir, 'phase2_conflict_report.json');
  if (!fs.existsSync(reportPath)) {
    return res.status(400).json({
      error: 'Run /phase2/detect first to generate conflict report',
      hint: 'POST /phase2/detect with {"courseCode":"spa_for_eng_v2"}'
    });
  }

  const conflictReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  // Load draft_lego_pairs.json to get seed data
  const draftPath = path.join(courseDir, 'draft_lego_pairs.json');
  const draftData = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
  const seeds = Array.isArray(draftData) ? draftData : draftData.seeds;

  // Get first N seeds
  const testSeeds = seeds.slice(0, seedCount);

  // Find conflicts that affect our test seeds
  const testSeedIds = new Set(testSeeds.map(s => s.seed_id));
  const relevantConflicts = conflictReport.allConflicts.filter(c =>
    c.targets.some(t => t.seeds.some(s => testSeedIds.has(s)))
  );

  console.log(`[Phase 2] Found ${relevantConflicts.length} conflicts affecting first ${seedCount} seeds`);

  // Generate worker assignments
  const workers = [];
  for (let w = 0; w < workersCount; w++) {
    const startIdx = w * seedsPerWorker;
    const endIdx = Math.min(startIdx + seedsPerWorker, seedCount);
    if (startIdx >= seedCount) break;

    const workerSeeds = testSeeds.slice(startIdx, endIdx);
    workers.push({
      workerNum: w + 1,
      seedIds: workerSeeds.map(s => s.seed_id),
      seedCount: workerSeeds.length
    });
  }

  // Generate master prompt for Phase 2 (Conflict Resolution)
  const masterPrompt = generatePhase2MasterPrompt({
    courseCode,
    target,
    known,
    orchestratorUrl,
    workers,
    relevantConflicts,
    totalSeeds: seedCount,
    mode: 'test'
  });

  // Save prompt
  const promptsDir = path.join(courseDir, 'phase2_master_prompts');
  await fs.ensureDir(promptsDir);
  await fs.writeFile(path.join(promptsDir, 'phase2_test_master.md'), masterPrompt);

  console.log(`[Phase 2] ✅ Generated master prompt in ${promptsDir}`);

  // Load web agent spawner and launch
  const spawnClaudeWebAgent = await loadWebAgentSpawner();
  if (!spawnClaudeWebAgent) {
    return res.status(500).json({
      error: 'Web agent spawner not available',
      promptPath: path.join(promptsDir, 'phase2_test_master.md')
    });
  }

  // Launch single master
  console.log(`[Phase 2] Launching Safari window...`);
  try {
    await spawnClaudeWebAgent(masterPrompt, 1, 'safari');
    console.log(`[Phase 2] ✅ Test master launched`);
  } catch (error) {
    console.error(`[Phase 2] ❌ Launch failed:`, error.message);
    return res.status(500).json({ error: error.message });
  }

  res.json({
    success: true,
    message: `Launched Phase 2 test with ${seedCount} seeds`,
    workers: workers.length,
    seedsPerWorker,
    relevantConflicts: relevantConflicts.length,
    promptPath: path.join(promptsDir, 'phase2_test_master.md')
  });
});

/**
 * POST /phase2/upload-batch
 * Receive Phase 2 results from workers
 */
app.post('/phase2/upload-batch', async (req, res) => {
  const courseCode = req.params.courseCode || req.body.courseCode;
  const seeds = req.body.seeds || req.body;

  if (!Array.isArray(seeds)) {
    return res.status(400).json({ error: 'Expected array of seeds' });
  }

  const courseDir = path.join(VFS_ROOT, courseCode || 'spa_for_eng_v2');
  const batchesDir = path.join(courseDir, 'phase2_batches');
  await fs.ensureDir(batchesDir);

  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const filename = `batch_${timestamp}_${randomId}_${seeds.length}seeds.json`;

  await fs.writeFile(path.join(batchesDir, filename), JSON.stringify(seeds, null, 2));

  console.log(`[Phase 2] ✅ Received batch: ${seeds.length} seeds → ${filename}`);

  res.json({
    success: true,
    message: `Saved ${seeds.length} seeds`,
    filename
  });
});

/**
 * POST /phase2/launch-full
 * Full Phase 2 launch: 9 masters × 5 workers × 15 seeds = 675 seeds per wave
 */
app.post('/phase2/launch-full', async (req, res) => {
  const {
    courseCode,
    target = 'spa',
    known = 'eng',
    mastersCount = 9,
    workersPerMaster = 5,
    seedsPerWorker = 15
  } = req.body;

  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode required' });
  }

  const seedsPerMaster = workersPerMaster * seedsPerWorker;
  const totalCapacity = mastersCount * seedsPerMaster;

  console.log(`\n[Phase 2] ====================================`);
  console.log(`[Phase 2] FULL LAUNCH: ${mastersCount} masters`);
  console.log(`[Phase 2] ====================================`);
  console.log(`[Phase 2] Course: ${courseCode}`);
  console.log(`[Phase 2] Config: ${mastersCount} masters × ${workersPerMaster} workers × ${seedsPerWorker} seeds`);
  console.log(`[Phase 2] Capacity: ${totalCapacity} seeds per wave`);

  const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';
  const courseDir = path.join(VFS_ROOT, courseCode);

  // Load conflict report
  const reportPath = path.join(courseDir, 'phase2_conflict_report.json');
  if (!fs.existsSync(reportPath)) {
    return res.status(400).json({
      error: 'Run /phase2/detect first to generate conflict report',
      hint: 'POST /phase2/detect with {"courseCode":"spa_for_eng_v2"}'
    });
  }

  const conflictReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  // Load draft_lego_pairs.json
  const draftPath = path.join(courseDir, 'draft_lego_pairs.json');
  const draftData = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
  const allSeeds = Array.isArray(draftData) ? draftData : draftData.seeds;

  console.log(`[Phase 2] Total seeds: ${allSeeds.length}`);
  console.log(`[Phase 2] Total conflicts: ${conflictReport.allConflicts.length}`);

  // Generate master assignments
  const masters = [];
  for (let m = 0; m < mastersCount; m++) {
    const masterStartIdx = m * seedsPerMaster;
    if (masterStartIdx >= allSeeds.length) break;

    const masterSeeds = allSeeds.slice(masterStartIdx, masterStartIdx + seedsPerMaster);

    // Generate workers for this master
    const workers = [];
    for (let w = 0; w < workersPerMaster; w++) {
      const workerStartIdx = w * seedsPerWorker;
      if (workerStartIdx >= masterSeeds.length) break;

      const workerSeeds = masterSeeds.slice(workerStartIdx, workerStartIdx + seedsPerWorker);
      workers.push({
        workerNum: w + 1,
        seedIds: workerSeeds.map(s => s.seed_id),
        seedCount: workerSeeds.length
      });
    }

    // Find conflicts for this master's seeds
    const masterSeedIds = new Set(masterSeeds.map(s => s.seed_id));
    const relevantConflicts = conflictReport.allConflicts.filter(c =>
      c.targets.some(t => t.seeds.some(s => masterSeedIds.has(s)))
    );

    masters.push({
      masterNum: m + 1,
      workers,
      relevantConflicts,
      seedCount: masterSeeds.length,
      seedRange: `${masterSeeds[0].seed_id}-${masterSeeds[masterSeeds.length - 1].seed_id}`
    });
  }

  // Save prompts and launch masters
  const promptsDir = path.join(courseDir, 'phase2_master_prompts');
  await fs.ensureDir(promptsDir);
  await fs.remove(promptsDir);
  await fs.ensureDir(promptsDir);

  const spawnClaudeWebAgent = await loadWebAgentSpawner();

  for (const master of masters) {
    const prompt = generatePhase2MasterPrompt({
      courseCode,
      target,
      known,
      orchestratorUrl,
      workers: master.workers,
      relevantConflicts: master.relevantConflicts,
      totalSeeds: master.seedCount,
      mode: `full-master-${master.masterNum}`
    });

    await fs.writeFile(
      path.join(promptsDir, `phase2_master_${master.masterNum}.md`),
      prompt
    );

    if (spawnClaudeWebAgent) {
      console.log(`[Phase 2] Launching Master ${master.masterNum}: ${master.seedRange} (${master.seedCount} seeds)`);
      try {
        await spawnClaudeWebAgent(prompt, master.masterNum, 'safari');
        // 8s delay between master spawns for stability
        if (master.masterNum < masters.length) {
          await new Promise(r => setTimeout(r, 8000));
        }
      } catch (error) {
        console.error(`[Phase 2] ❌ Master ${master.masterNum} launch failed:`, error.message);
      }
    }
  }

  res.json({
    success: true,
    message: `Launched ${masters.length} Phase 2 masters`,
    masters: masters.map(m => ({
      masterNum: m.masterNum,
      seedRange: m.seedRange,
      workers: m.workers.length,
      conflicts: m.relevantConflicts.length
    })),
    totalSeeds: allSeeds.length,
    promptsDir
  });
});

/**
 * POST /phase2/finalize
 * Merge Phase 2 batches and deduplicate (first-wins canonicalization)
 */
app.post('/phase2/finalize', async (req, res) => {
  const { courseCode } = req.body;

  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode required' });
  }

  console.log(`\n[Phase 2] ====================================`);
  console.log(`[Phase 2] FINALIZE: Merge + Deduplicate`);
  console.log(`[Phase 2] ====================================`);
  console.log(`[Phase 2] Course: ${courseCode}`);

  const courseDir = path.join(VFS_ROOT, courseCode);
  const batchesDir = path.join(courseDir, 'phase2_batches');

  // Load all batch files
  const batchFiles = await fs.readdir(batchesDir);
  const jsonFiles = batchFiles.filter(f => f.endsWith('.json')).sort();

  console.log(`[Phase 2] Found ${jsonFiles.length} batch files`);

  // Merge all seeds
  const seedMap = new Map();
  let totalLoaded = 0;

  for (const file of jsonFiles) {
    const batch = JSON.parse(await fs.readFile(path.join(batchesDir, file), 'utf8'));
    for (const seed of batch) {
      seedMap.set(seed.seed_id, seed);
      totalLoaded++;
    }
  }

  console.log(`[Phase 2] Loaded ${totalLoaded} seeds, ${seedMap.size} unique`);

  // First-wins canonicalization for LEGOs
  // Track: { known: target } → first seen wins
  const canonicalLegos = new Map();
  const conflictsResolved = [];

  const seeds = Array.from(seedMap.values()).sort((a, b) =>
    parseInt(a.seed_id.slice(1)) - parseInt(b.seed_id.slice(1))
  );

  for (const seed of seeds) {
    if (!seed.legos) continue;

    for (const lego of seed.legos) {
      const known = lego.lego?.known?.toLowerCase();
      if (!known) continue;

      const existing = canonicalLegos.get(known);
      if (!existing) {
        // First occurrence - this becomes canonical
        canonicalLegos.set(known, {
          target: lego.lego.target,
          firstSeed: seed.seed_id,
          legoId: lego.id
        });
      } else if (existing.target !== lego.lego.target) {
        // Conflict! First-wins
        conflictsResolved.push({
          known,
          canonicalTarget: existing.target,
          variantTarget: lego.lego.target,
          canonicalSeed: existing.firstSeed,
          variantSeed: seed.seed_id
        });
        // Update the LEGO to match canonical
        lego.lego.target = existing.target;
        lego.canonicalized = true;
      }
    }
  }

  console.log(`[Phase 2] Resolved ${conflictsResolved.length} conflicts via first-wins`);

  // Mark new:true/false based on first occurrence
  const seenLegos = new Set();
  for (const seed of seeds) {
    if (!seed.legos) continue;

    for (const lego of seed.legos) {
      const key = `${lego.lego?.known?.toLowerCase()}|${lego.lego?.target?.toLowerCase()}`;
      if (seenLegos.has(key)) {
        lego.new = false;
      } else {
        lego.new = true;
        seenLegos.add(key);
      }
    }
  }

  // Save finalized lego_pairs.json
  const outputPath = path.join(courseDir, 'lego_pairs.json');
  await fs.writeFile(outputPath, JSON.stringify({
    metadata: {
      phase: 2,
      action: 'finalize',
      timestamp: new Date().toISOString(),
      totalSeeds: seeds.length,
      totalLegos: Array.from(seenLegos).length,
      conflictsResolved: conflictsResolved.length
    },
    seeds
  }, null, 2));

  console.log(`[Phase 2] ✅ Saved ${seeds.length} seeds to lego_pairs.json`);

  // DATABASE-FIRST: Update is_new flags in database
  let dbUpdates = 0;
  if (courseDataService.USE_DATABASE_WRITES) {
    try {
      // Get all LEGOs for this course from database to update is_new flags
      const dbLegos = await courseDataService.getLegosByCourse(courseCode);
      const legoByKey = new Map();

      // Build lookup by known|target key
      for (const lego of dbLegos) {
        const key = `${lego.known_text?.toLowerCase()}|${lego.target_text?.toLowerCase()}`;
        legoByKey.set(key, lego);
      }

      // Update is_new flags based on seenLegos
      const seenInJson = new Set();
      for (const seed of seeds) {
        if (!seed.legos) continue;
        for (const lego of seed.legos) {
          const key = `${lego.lego?.known?.toLowerCase()}|${lego.lego?.target?.toLowerCase()}`;
          const dbLego = legoByKey.get(key);
          if (dbLego) {
            const isNew = !seenInJson.has(key);
            seenInJson.add(key);

            // Update if different from current state
            if (dbLego.is_new !== isNew) {
              await courseDataService.markLegoAsNew(dbLego.id, isNew);
              dbUpdates++;
            }
          }
        }
      }
      console.log(`[Phase 2] 💾 Database: Updated ${dbUpdates} is_new flags`);
    } catch (dbError) {
      console.error(`[Phase 2] ⚠️  Database update failed:`, dbError.message);
    }
  }

  // Save conflicts report
  if (conflictsResolved.length > 0) {
    const conflictsPath = path.join(courseDir, 'phase2_canonicalization_report.json');
    await fs.writeFile(conflictsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalResolved: conflictsResolved.length,
      conflicts: conflictsResolved
    }, null, 2));
    console.log(`[Phase 2] ✅ Saved canonicalization report`);
  }

  res.json({
    success: true,
    message: `Finalized ${seeds.length} seeds`,
    totalSeeds: seeds.length,
    uniqueLegos: seenLegos.size,
    conflictsResolved: conflictsResolved.length,
    databaseUpdates: dbUpdates,
    outputPath
  });
});

/**
 * POST /phase2/resume
 * Resume Phase 2 for missing seeds (gap-fill)
 */
app.post('/phase2/resume', async (req, res) => {
  const {
    courseCode,
    target = 'spa',
    known = 'eng',
    workersPerMaster = 5,
    seedsPerWorker = 15
  } = req.body;

  if (!courseCode) {
    return res.status(400).json({ error: 'courseCode required' });
  }

  console.log(`\n[Phase 2] ====================================`);
  console.log(`[Phase 2] RESUME: Gap-fill missing seeds`);
  console.log(`[Phase 2] ====================================`);
  console.log(`[Phase 2] Course: ${courseCode}`);

  const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3456';
  const courseDir = path.join(VFS_ROOT, courseCode);
  const batchesDir = path.join(courseDir, 'phase2_batches');

  // Load draft_lego_pairs.json for expected seeds
  const draftPath = path.join(courseDir, 'draft_lego_pairs.json');
  const draftData = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
  const allSeeds = Array.isArray(draftData) ? draftData : draftData.seeds;
  const expectedIds = new Set(allSeeds.map(s => s.seed_id));

  // Scan batches for processed seeds
  const processedIds = new Set();
  if (fs.existsSync(batchesDir)) {
    const batchFiles = await fs.readdir(batchesDir);
    for (const file of batchFiles.filter(f => f.endsWith('.json'))) {
      try {
        const batch = JSON.parse(await fs.readFile(path.join(batchesDir, file), 'utf8'));
        for (const seed of batch) {
          processedIds.add(seed.seed_id);
        }
      } catch (e) {
        console.warn(`[Phase 2] Could not read ${file}`);
      }
    }
  }

  // Find missing seeds
  const missingIds = [...expectedIds].filter(id => !processedIds.has(id));

  console.log(`[Phase 2] Expected: ${expectedIds.size}, Processed: ${processedIds.size}, Missing: ${missingIds.length}`);

  if (missingIds.length === 0) {
    return res.json({
      success: true,
      message: 'All seeds already processed',
      expected: expectedIds.size,
      processed: processedIds.size,
      missing: 0
    });
  }

  // Get missing seed data
  const missingSeeds = allSeeds.filter(s => missingIds.includes(s.seed_id));

  // Load conflict report
  const reportPath = path.join(courseDir, 'phase2_conflict_report.json');
  const conflictReport = fs.existsSync(reportPath)
    ? JSON.parse(fs.readFileSync(reportPath, 'utf8'))
    : { allConflicts: [] };

  // Calculate masters needed
  const seedsPerMaster = workersPerMaster * seedsPerWorker;
  const mastersNeeded = Math.ceil(missingSeeds.length / seedsPerMaster);

  console.log(`[Phase 2] Launching ${mastersNeeded} gap-fill masters`);

  const promptsDir = path.join(courseDir, 'phase2_master_prompts');
  await fs.ensureDir(promptsDir);

  const spawnClaudeWebAgent = await loadWebAgentSpawner();
  const mastersLaunched = [];

  for (let m = 0; m < mastersNeeded; m++) {
    const masterStartIdx = m * seedsPerMaster;
    const masterSeeds = missingSeeds.slice(masterStartIdx, masterStartIdx + seedsPerMaster);

    if (masterSeeds.length === 0) break;

    // Generate workers
    const workers = [];
    for (let w = 0; w < workersPerMaster; w++) {
      const workerStartIdx = w * seedsPerWorker;
      if (workerStartIdx >= masterSeeds.length) break;

      const workerSeeds = masterSeeds.slice(workerStartIdx, workerStartIdx + seedsPerWorker);
      workers.push({
        workerNum: w + 1,
        seedIds: workerSeeds.map(s => s.seed_id),
        seedCount: workerSeeds.length
      });
    }

    // Find relevant conflicts
    const masterSeedIds = new Set(masterSeeds.map(s => s.seed_id));
    const relevantConflicts = conflictReport.allConflicts.filter(c =>
      c.targets.some(t => t.seeds.some(s => masterSeedIds.has(s)))
    );

    const prompt = generatePhase2MasterPrompt({
      courseCode,
      target,
      known,
      orchestratorUrl,
      workers,
      relevantConflicts,
      totalSeeds: masterSeeds.length,
      mode: `resume-master-${m + 1}`
    });

    await fs.writeFile(
      path.join(promptsDir, `phase2_resume_master_${m + 1}.md`),
      prompt
    );

    if (spawnClaudeWebAgent) {
      try {
        await spawnClaudeWebAgent(prompt, m + 1, 'safari');
        mastersLaunched.push({
          masterNum: m + 1,
          seedRange: `${masterSeeds[0].seed_id}-${masterSeeds[masterSeeds.length - 1].seed_id}`,
          seedCount: masterSeeds.length,
          workers: workers.length
        });
        // 8s delay between master spawns for stability
        if (m + 1 < mastersNeeded) {
          await new Promise(r => setTimeout(r, 8000));
        }
      } catch (error) {
        console.error(`[Phase 2] ❌ Resume master ${m + 1} failed:`, error.message);
      }
    }
  }

  res.json({
    success: true,
    message: `Launched ${mastersLaunched.length} gap-fill masters for ${missingIds.length} seeds`,
    expected: expectedIds.size,
    processed: processedIds.size,
    missing: missingIds.length,
    mastersLaunched
  });
});

/**
 * GET /health
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    port: PORT,
    timestamp: new Date().toISOString(),
    vfsRoot: VFS_ROOT,
    activeJobs: activeJobs.size,
    watchers: watchers.size
  });
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log('');
  console.log(`✅ ${SERVICE_NAME} listening on port ${PORT}`);
  console.log(`   VFS Root: ${VFS_ROOT}`);
  console.log(`   Orchestrator: ${ORCHESTRATOR_URL}`);
  console.log('');
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Phase 3 server...');

  // Stop all watchers
  for (const [courseCode, watcher] of watchers.entries()) {
    console.log(`  Stopping watcher for ${courseCode}...`);
    watcher.kill('SIGTERM');
  }

  process.exit(0);
});
