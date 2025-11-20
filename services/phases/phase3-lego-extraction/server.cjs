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
const AGENT_SPAWN_DELAY = process.env.AGENT_SPAWN_DELAY || 3000;

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
 * Calculate segmentation strategy based on course size
 *
 * Strategies:
 * - SMALL_TEST: ≤20 seeds → 2 segments, 2 agents/segment, ~3 seeds/agent
 * - MEDIUM_SINGLE: 21-100 seeds → 1 segment, 5-10 agents, 10 seeds/agent
 * - LARGE_MULTI: >100 seeds → 100 seeds/segment, 10 agents/segment, 10 seeds/agent
 */
function calculateSegmentation(totalSeeds) {
  let segmentSize, seedsPerAgent;

  // Determine segment size and seeds per agent based on course size
  if (totalSeeds <= 20) {
    // SMALL TEST COURSES (≤20 seeds)
    segmentSize = Math.ceil(totalSeeds / 2); // 2 segments
    seedsPerAgent = Math.ceil(segmentSize / 2); // ~2-3 seeds/agent
  } else if (totalSeeds <= 100) {
    // MEDIUM COURSES (21-100 seeds)
    segmentSize = totalSeeds; // No segmentation
    seedsPerAgent = 10; // 10 seeds per agent
  } else {
    // LARGE COURSES (>100 seeds)
    segmentSize = 100;
    seedsPerAgent = 10;
  }

  // Calculate segments
  const segments = [];
  for (let i = 0; i < totalSeeds; i += segmentSize) {
    const segmentStart = i + 1;
    const segmentEnd = Math.min(i + segmentSize, totalSeeds);
    const segmentSeeds = segmentEnd - segmentStart + 1;
    const agentsNeeded = Math.ceil(segmentSeeds / seedsPerAgent);

    segments.push({
      segmentNumber: segments.length + 1,
      startSeed: segmentStart,
      endSeed: segmentEnd,
      seedCount: segmentSeeds,
      agentCount: agentsNeeded,
      seedsPerAgent: Math.ceil(segmentSeeds / agentsNeeded)
    });
  }

  const totalAgents = segments.reduce((sum, seg) => sum + seg.agentCount, 0);

  return {
    totalSeeds,
    segmentSize,
    seedsPerAgent,
    segmentCount: segments.length,
    totalAgents,
    segments,
    strategy: totalSeeds <= 20 ? 'SMALL_TEST' :
              totalSeeds <= 100 ? 'MEDIUM_SINGLE' :
              'LARGE_MULTI'
  };
}

/**
 * Generate Phase 3 Master Prompt
 */
function generatePhase3MasterPrompt(courseCode, params) {
  const { target, known, startSeed, endSeed } = params;
  const totalSeeds = endSeed - startSeed + 1;

  // Quick Test mode: 10 seeds = 5 agents × 2 seeds each
  // Normal mode: 10 seeds per agent
  const seedsPerAgent = totalSeeds === 10 ? 2 : 10;
  const agentCount = Math.ceil(totalSeeds / seedsPerAgent);

  // Calculate segment number from startSeed
  const segmentNum = Math.floor((startSeed - 1) / 100) + 1;

  return `# Phase 3 Master Orchestrator: LEGO Extraction (Segment-Based)

**Course**: ${courseCode}
**Segment Seeds**: ${totalSeeds} (S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')})
**Sub-Agents**: ${agentCount} parallel agents
**Seeds per agent**: ${seedsPerAgent}

---

## 🎯 YOUR MISSION

You are the **Master Orchestrator** for this segment. Your job is to:

1. **Read Phase 3 intelligence** (v7.0 - Two Heuristics Edition)
2. **Spawn ${agentCount} sub-agents in parallel** (ONE message with ${agentCount} Task tool calls)
3. **Each sub-agent extracts ${seedsPerAgent} seeds** with IDENTICAL prompt (only seed range differs)
4. **Wait for all ${agentCount} to complete**
5. **Verify all sub-agents successfully POSTed** to API
6. **Done** - Vercel auto-deploys results

**CRITICAL**: Use ONE message with multiple Task tool calls to spawn all agents simultaneously.

**OUTPUT METHOD**: Each sub-agent commits to segment-specific branch:
- Calculate segment: Math.floor((startSeed - 1) / 100) + 1
- Branch name: \`phase3-segment-${segmentNum}-${courseCode}\`
- All agents push to SAME branch (git handles concurrent commits)

---

## 📚 PHASE 3 INTELLIGENCE (Single Source of Truth)

**YOU AND YOUR SUB-AGENTS MUST READ**: https://ssi-dashboard-v7.vercel.app/api/intelligence/3

(Raw markdown for Phase 3 v7.0 - Two Heuristics Edition)

Or if local files are available: \`public/docs/phase_intelligence/phase_3_lego_pairs_v7.md\`

This is the **ONLY authoritative source** for Phase 3 extraction methodology.

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

You will spawn ${agentCount} sub-agents, each handling ${seedsPerAgent} seeds.

**Seed distribution**:
${Array.from({length: agentCount}, (_, i) => {
  const agentStart = startSeed + (i * seedsPerAgent);
  const agentEnd = Math.min(startSeed + ((i + 1) * seedsPerAgent) - 1, endSeed);
  return `- Agent ${i + 1}: S${String(agentStart).padStart(4, '0')}-S${String(agentEnd).padStart(4, '0')}`;
}).join('\n')}

**Input file**: Read from \`seed_pairs.json\` (or segment file if using segmentation)

---

## 📋 SUB-AGENT PROMPT TEMPLATE

**CRITICAL**: Give IDENTICAL prompts to all ${agentCount} agents - only the seed range changes!

\`\`\`markdown
# Phase 3 Sub-Agent: Extract S00XX-S00YY

## 📚 STEP 1: READ PHASE INTELLIGENCE

**Read this document NOW** (430 lines - v7.0):
- https://ssi-dashboard-v7.vercel.app/docs/phase_intelligence/phase_3_lego_pairs_v7.md
- Or local: \`public/docs/phase_intelligence/phase_3_lego_pairs_v7.md\`

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

**Get seed_pairs.json from**:
- **Local**: \`public/vfs/courses/${courseCode}/seed_pairs.json\` (try this first - you're running in the repo!)
- **Fallback**: https://ssi-dashboard-v7.vercel.app/vfs/courses/${courseCode}/seed_pairs.json (if local not available)

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

## 📤 STEP 5: OUTPUT

**File**: \`public/vfs/courses/${courseCode}/segments/segment_${segmentNum}/agent_XX_output.json\`

**Format**:
\`\`\`json
{
  "agent_id": "agent_0Y",
  "seed_range": "S00XX-S00YY",
  "extracted_at": "<ISO timestamp>",
  "methodology": "Phase 3 v7.0 - Two Heuristics Edition",
  "seeds": [
    {
      "seed_id": "S00XX",
      "seed_pair": ["target sentence", "known sentence"],
      "legos": [
        {
          "id": "S00XXL01",
          "type": "A",
          "target": "word",
          "known": "word",
          "new": true
        },
        {
          "id": "S00XXL02",
          "type": "M",
          "target": "multi word",
          "known": "multi word",
          "new": true,
          "components": [["multi", "multi"], ["word", "word"]]
        }
      ]
    }
  ]
}
\`\`\`

**IMPORTANT**: Save the file using the Write tool, then commit and push to your session branch (Claude Code on Web handles git automatically).
\`\`\`

---

## 🎬 EXECUTE NOW

### Step 1: Spawn All ${agentCount} Sub-Agents in Parallel

**CRITICAL**: Use ONE message with ${agentCount} Task tool calls.

For each agent, use this exact prompt structure (changing only the seed range):

\`\`\`
[Copy the entire "Phase 3 Sub-Agent" prompt template above]
[Change only: "Extract S00XX through S00YY" to match agent's range]
\`\`\`

### Step 2: Monitor Completion

Watch for all ${agentCount} sub-agents to report successful API POST.

Each will show:
\`\`\`
✅ Successfully POSTed 10 seeds to API
   Total seeds in lego_pairs.json: XX
\`\`\`

### Step 3: Verify

Once all complete, verify results at:
https://ssi-dashboard-v7.vercel.app/courses/${courseCode}

### Step 4: Done!

All agents will commit to their session branches. The master orchestrator will merge them automatically.

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

  // Calculate segmentation
  const segmentation = calculateSegmentation(totalSeeds);

  console.log(`   Segmentation: ${segmentation.strategy}`);
  console.log(`   Segments: ${segmentation.segmentCount}`);
  console.log(`   Total agents: ${segmentation.totalAgents}`);

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
 * Run deduplication (Phase 3.5) after all segments merged
 * Marks duplicate LEGOs with new: false and ref: firstSeedId
 */
async function runDeduplication(courseCode) {
  console.log(`\n🔍 Running deduplication (Phase 3.5) for ${courseCode}...`);

  const legoPairsPath = path.join(VFS_ROOT, courseCode, 'phase_3', 'lego_pairs.json');

  if (!fs.existsSync(legoPairsPath)) {
    console.log(`   ⚠️  lego_pairs.json not found, skipping deduplication`);
    return;
  }

  try {
    // Read lego_pairs.json
    const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

    // Track seen LEGOs: key = "target|known", value = first seed_id
    const seenLegos = new Map();
    let duplicateCount = 0;
    let totalLegos = 0;

    // Process each seed in order
    legoPairs.seeds.forEach((seed) => {
      const seedId = seed.seed_id;

      seed.legos.forEach((lego) => {
        totalLegos++;
        const key = `${lego.target}|${lego.known}`;

        if (seenLegos.has(key)) {
          // Duplicate found - mark as repeat
          const firstSeedId = seenLegos.get(key);
          lego.new = false;
          lego.ref = firstSeedId;
          duplicateCount++;
        } else {
          // First occurrence - mark as debut
          seenLegos.set(key, seedId);
          lego.new = true;
          delete lego.ref; // Remove ref if exists from previous runs
        }
      });
    });

    // Write updated file
    fs.writeFileSync(legoPairsPath, JSON.stringify(legoPairs, null, 2));

    console.log(`   ✅ Deduplication complete!`);
    console.log(`      Total LEGOs: ${totalLegos}`);
    console.log(`      Unique (new: true): ${seenLegos.size}`);
    console.log(`      Duplicates (new: false): ${duplicateCount}`);

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
  const legoPairsPath = path.join(courseDir, 'phase_3', 'lego_pairs.json');

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

    console.log(`\n  Segment ${segment.segmentNumber}/${segments.length}:`);
    console.log(`    Seed range: S${String(segmentStart).padStart(4, '0')}-S${String(segmentEnd).padStart(4, '0')}`);
    console.log(`    Agents: ${segment.agentCount}`);

    // Generate master prompt for this segment
    const prompt = generatePhase3MasterPrompt(courseCode, {
      target,
      known,
      startSeed: segmentStart,
      endSeed: segmentEnd
    });

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

        // Brief delay between spawns
        if (i + batch.indexOf(seedId) < job.affectedSeeds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
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

**Read this document NOW** (430 lines - v7.0):
- https://ssi-dashboard-v7.vercel.app/docs/phase_intelligence/phase_3_lego_pairs_v7.md
- Or local: \`public/docs/phase_intelligence/phase_3_lego_pairs_v7.md\`

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
4. Save output to: \`public/vfs/courses/${courseCode}/reextraction/${seedId}_legos.json\`

**Output Format:**
\`\`\`json
{
  "seed_id": "${seedId}",
  "seed_pair": ["${knownSentence}", "${targetSentence}"],
  "reextracted_at": "<ISO timestamp>",
  "collision_fixes_applied": ${collisionInstructions.length},
  "legos": [
    {
      "id": "${seedId}L01",
      "type": "A" or "M",
      "target": "word",
      "known": "word",
      "new": true,
      "components": [["word", "word"]]  // For M-types only
    }
  ]
}
\`\`\`

## 🎬 EXECUTE NOW

1. Read the Phase Intelligence doc
2. Extract LEGOs with collision-aware chunking
3. Save the JSON file
4. Commit and push (Claude Code on Web handles git automatically)
5. Branch name: \`claude/phase3-reextract-${seedId}-${courseCode}\`
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
 * GET /health
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    status: 'healthy',
    port: PORT,
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
