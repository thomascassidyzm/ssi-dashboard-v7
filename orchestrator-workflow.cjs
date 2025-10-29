/**
 * New Orchestrator Workflow Implementation
 *
 * This file contains the new parallelized orchestrator workflow.
 * Will be integrated into automation_server.cjs to replace the old batch system.
 *
 * Architecture:
 * - 5 orchestrators × 10 sub-agents = 50 concurrent agents per phase
 * - 30-second delays between orchestrator spawns
 * - Phases: 1 (seed pairs) → 3 (LEGOs) → 4 (prep) → 5 (baskets) → 6 (intros)
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const { generateOrchestratorPrompt, generateValidatorPrompt } = require('./orchestrator-prompt-helpers.cjs');

// Helper: Run a preparation script
async function runPrepScript(scriptName, courseCode, params) {
  const { startSeed, endSeed } = params;
  const scriptPath = path.join(__dirname, 'scripts', scriptName);

  const args = [courseCode, '5', String(startSeed), String(endSeed)];

  console.log(`[Prep] Running ${scriptName}...`);
  console.log(`[Prep] Command: node ${scriptName} ${args.join(' ')}`);

  return new Promise((resolve, reject) => {
    const proc = spawn('node', [scriptPath, ...args], {
      cwd: __dirname,
      stdio: 'inherit'
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`[Prep] ✅ ${scriptName} complete\n`);
        resolve();
      } else {
        reject(new Error(`${scriptName} failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

// Helper: Spawn a single orchestrator agent using spawnPhaseAgent
// Note: This function should be called from automation_server.cjs context where spawnPhaseAgent is available
async function spawnOrchestrator(phaseNum, orchestratorNum, courseCode, courseDir, spawnPhaseAgent, trainingUrl) {
  const orchestratorId = `phase${phaseNum}_orch_${String(orchestratorNum).padStart(2, '0')}`;
  const batchFile = path.join(courseDir, 'orchestrator_batches', `phase${phaseNum}`, `orchestrator_batch_${String(orchestratorNum).padStart(2, '0')}.json`);
  const chunkFile = `chunk_${String(orchestratorNum).padStart(2, '0')}.json`;
  const chunkPath = path.join(courseDir, 'orchestrator_batches', `phase${phaseNum}`, chunkFile);

  console.log(`[Phase ${phaseNum}] Spawning orchestrator ${orchestratorNum}/5 (${orchestratorId})...`);

  // Verify batch file exists
  if (!await fs.pathExists(batchFile)) {
    throw new Error(`Batch file not found: ${batchFile}`);
  }

  // Generate orchestrator prompt
  const intelligenceUrl = `${trainingUrl}/phase-intelligence/${phaseNum}-orchestrator`;

  const prompt = `# Phase ${phaseNum} Orchestrator #${orchestratorNum}

**Course**: ${courseCode}
**Orchestrator ID**: ${orchestratorId}
**Role**: Coordinate 10 sub-agents to process ~134 items in parallel

---

## YOUR TASK

1. **Read orchestrator intelligence**: Fetch ${intelligenceUrl}
2. **Read your batch file**: ${batchFile}
3. **Divide work** among 10 sub-agents (~13-14 items each)
4. **Spawn all 10 agents in parallel** (one message with 10 Task tool calls)
5. **Validate outputs** against Phase ${phaseNum} rules
6. **Merge into chunk file**: ${chunkPath}
7. **Report completion**

---

## CRITICAL REQUIREMENTS

✅ Use **extended thinking** for planning
✅ Spawn all 10 agents in **one message** (parallel execution)
✅ Validate using Phase ${phaseNum} rules (cognates, zero variation, etc.)
✅ Output in **v7.7 format**
✅ Include validation metadata in chunk file

---

## OUTPUT FORMAT

Write chunk file to: \`${chunkPath}\`

\`\`\`json
{
  "orchestrator_id": "${orchestratorId}",
  "chunk_number": ${orchestratorNum},
  "total_items": <count>,
  "translations": { ... } or "legos": { ... } or "baskets": { ... },
  "metadata": {
    "generated_by": "${orchestratorId}",
    "agents_used": 10,
    "validation_passed": true,
    "issues_found": 0
  }
}
\`\`\`

When complete, report: "✅ ${orchestratorId} complete - ${chunkFile} written"
`;

  // Spawn the agent using the existing spawnPhaseAgent infrastructure
  const windowId = await spawnPhaseAgent(`${phaseNum}-orch-${orchestratorNum}`, prompt, courseDir, courseCode);

  console.log(`[Phase ${phaseNum}] Orchestrator ${orchestratorNum} spawned (window: ${windowId})`);

  return { orchestratorId, windowId, chunkFile, chunkPath };
}

// Helper: Spawn Phase 1 validator (special case - needs to check cross-chunk consistency)
async function spawnPhase1Validator(courseCode, courseDir, spawnPhaseAgent, trainingUrl, seeds) {
  console.log('[Phase 1] Spawning validator agent...');

  const intelligenceUrl = `${trainingUrl}/phase-intelligence/1-validator`;
  const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
  const chunksDir = path.join(courseDir, 'orchestrator_batches', 'phase1');

  const prompt = `# Phase 1 Validator

**Course**: ${courseCode}
**Role**: Ensure vocabulary consistency across all ${seeds} seeds
**Input**: 5 chunk files from orchestrators
**Output**: ${seedPairsPath}

---

## YOUR TASK

1. **Read validator intelligence**: Fetch ${intelligenceUrl}
2. **Read all 5 chunks**: ${chunksDir}/chunk_01.json through chunk_05.json
3. **Detect vocabulary conflicts** across chunks
4. **Auto-fix conflicts** using Phase 1 rules:
   - First Word Wins
   - Prefer Cognate
   - Zero Variation (seeds 1-100)
5. **Output final seed_pairs.json**: ${seedPairsPath}
6. **Report validation results**

---

## CRITICAL REQUIREMENTS

✅ Use **extended thinking** for conflict detection
✅ **Auto-fix >90%** of conflicts mechanically
✅ **Enforce zero variation** in seeds 1-100
✅ **Prefer cognates** when available
✅ Output in **v7.7 format**
✅ Include validation statistics

---

## OUTPUT FORMAT

Write to: \`${seedPairsPath}\`

\`\`\`json
{
  "version": "7.7.0",
  "course": "${courseCode}",
  "total_seeds": ${seeds},
  "translations": {
    "S0001": ["target phrase", "known phrase"],
    ...
  },
  "validation": {
    "total_conflicts": <count>,
    "auto_fixed": <count>,
    "flagged_for_review": <count>,
    "fixes_applied": [...]
  }
}
\`\`\`

When complete, report: "✅ Phase 1 Validation Complete - ${seeds} seeds validated"
`;

  const windowId = await spawnPhaseAgent('1-validator', prompt, courseDir, courseCode);

  console.log(`[Phase 1] Validator spawned (window: ${windowId})`);

  return { windowId };
}

// Helper: Wait for all chunks to be created
async function waitForChunks(courseDir, phaseNum, numChunks = 5, pollInterval = 30000, timeout = 1800000) {
  const chunkDir = path.join(courseDir, 'orchestrator_batches', `phase${phaseNum}`);
  const startTime = Date.now();

  console.log(`[Phase ${phaseNum}] Waiting for ${numChunks} chunks in: ${chunkDir}`);
  console.log(`[Phase ${phaseNum}] Polling every ${pollInterval/1000}s, timeout: ${timeout/60000} minutes`);

  while (Date.now() - startTime < timeout) {
    const chunks = [];
    const missingChunks = [];

    for (let i = 1; i <= numChunks; i++) {
      const chunkFile = path.join(chunkDir, `chunk_${String(i).padStart(2, '0')}.json`);
      if (await fs.pathExists(chunkFile)) {
        // Verify chunk file is valid JSON and not empty
        try {
          const data = await fs.readJson(chunkFile);
          if (data && Object.keys(data).length > 0) {
            chunks.push(i);
          } else {
            missingChunks.push(i);
          }
        } catch (err) {
          console.warn(`[Phase ${phaseNum}] Warning: chunk_${String(i).padStart(2, '0')}.json is invalid JSON`);
          missingChunks.push(i);
        }
      } else {
        missingChunks.push(i);
      }
    }

    if (chunks.length === numChunks) {
      console.log(`[Phase ${phaseNum}] ✅ All ${numChunks} chunks complete!\n`);
      return { success: true, chunks };
    }

    console.log(`[Phase ${phaseNum}] Chunks complete: ${chunks.length}/${numChunks} (missing: ${missingChunks.join(', ')})`);

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  // Timeout - return info about what's missing
  const chunks = [];
  const failedChunks = [];
  for (let i = 1; i <= numChunks; i++) {
    const chunkFile = path.join(chunkDir, `chunk_${String(i).padStart(2, '0')}.json`);
    if (await fs.pathExists(chunkFile)) {
      chunks.push(i);
    } else {
      failedChunks.push(i);
    }
  }

  console.error(`[Phase ${phaseNum}] ❌ Timeout waiting for chunks`);
  console.error(`[Phase ${phaseNum}] Complete: ${chunks.length}/${numChunks}`);
  console.error(`[Phase ${phaseNum}] Failed: ${failedChunks.join(', ')}`);

  return { success: false, chunks, failedChunks };
}

// Helper: Run a merge script
async function runMergeScript(scriptName, courseCode, orchestratorMode = false) {
  const scriptPath = path.join(__dirname, 'scripts', scriptName);
  const args = orchestratorMode ? [courseCode, '--orchestrator'] : [courseCode];

  console.log(`[Merge] Running ${scriptName}...`);
  console.log(`[Merge] Command: node ${scriptName} ${args.join(' ')}`);

  return new Promise((resolve, reject) => {
    const proc = spawn('node', [scriptPath, ...args], {
      cwd: __dirname,
      stdio: 'inherit'
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`[Merge] ✅ ${scriptName} complete\n`);
        resolve();
      } else {
        reject(new Error(`${scriptName} failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * Main orchestrator workflow
 * Replaces spawnCourseOrchestrator() and pollAndContinue()
 *
 * @param {string} courseCode - Course code (e.g., "spa_for_eng")
 * @param {Object} params - Job parameters { target, known, seeds, startSeed, endSeed }
 * @param {Object} job - Job state object from STATE.jobs
 * @param {Function} spawnPhaseAgent - Function to spawn agents in iTerm2
 * @param {Function} closeAgentWindows - Function to close iTerm2 windows and free RAM
 * @param {string} trainingUrl - Base URL for training documentation
 */
async function runOrchestratorWorkflow(courseCode, params, job, spawnPhaseAgent, closeAgentWindows, trainingUrl) {
  const { target, known, seeds, startSeed, endSeed } = params;
  const courseDir = path.join(__dirname, 'vfs/courses', courseCode);

  console.log(`\n${'='.repeat(60)}`);
  console.log('ORCHESTRATOR WORKFLOW STARTING');
  console.log('='.repeat(60));
  console.log(`Course: ${courseCode}`);
  console.log(`Seeds: ${startSeed}-${endSeed} (${seeds} total)`);
  console.log(`Architecture: 5 orchestrators × 10 agents = 50 concurrent per phase`);
  console.log('='.repeat(60) + '\n');

  // Retry configuration
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 10000; // 10 seconds

  try {
    // ===== PHASE 1: SEED PAIRS =====
    console.log('\n📍 PHASE 1: Seed Pair Translation\n');
    job.phase = 'phase_1_prep';
    job.progress = 0;

    // Prep: Divide seeds into 5 chunks
    await runPrepScript('phase1-prepare-orchestrator-batches.cjs', courseCode, params);

    // Spawn 5 orchestrators with 30s delays
    job.phase = 'phase_1_spawn';
    const phase1Orchestrators = [];
    for (let i = 1; i <= 5; i++) {
      const orch = await spawnOrchestrator(1, i, courseCode, courseDir, spawnPhaseAgent, trainingUrl);
      phase1Orchestrators.push(orch);

      if (i < 5) {
        console.log(`[Phase 1] Waiting 30s before next orchestrator...\n`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    // Wait for all 5 chunks
    job.phase = 'phase_1_waiting';
    job.progress = 10;
    const phase1Result = await waitForChunks(courseDir, 1, 5, 30000, 1800000);

    // Handle failed chunks with retries
    if (!phase1Result.success && phase1Result.failedChunks && phase1Result.failedChunks.length > 0) {
      console.log(`[Phase 1] Retrying ${phase1Result.failedChunks.length} failed chunks...`);

      for (const chunkNum of phase1Result.failedChunks) {
        let retrySuccess = false;

        for (let retry = 1; retry <= MAX_RETRIES && !retrySuccess; retry++) {
          console.log(`[Phase 1] Retry ${retry}/${MAX_RETRIES} for chunk ${chunkNum}...`);

          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          await spawnOrchestrator(1, chunkNum, courseCode, courseDir, spawnPhaseAgent, trainingUrl);

          // Wait specifically for this chunk
          const retryResult = await waitForChunks(courseDir, 1, chunkNum, 30000, 600000);
          if (retryResult.success) {
            retrySuccess = true;
            console.log(`[Phase 1] ✅ Chunk ${chunkNum} completed on retry ${retry}`);
          }
        }

        if (!retrySuccess) {
          throw new Error(`Phase 1 chunk ${chunkNum} failed after ${MAX_RETRIES} retries`);
        }
      }
    }

    if (!phase1Result.success) {
      throw new Error('Phase 1 chunks incomplete after retries');
    }

    // Close orchestrator windows to free RAM
    const phase1WindowIds = phase1Orchestrators.map(o => o.windowId).filter(Boolean);
    if (phase1WindowIds.length > 0) {
      console.log(`[Phase 1] Closing ${phase1WindowIds.length} orchestrator windows to free RAM...`);
      await closeAgentWindows(phase1WindowIds);
    }

    // Spawn validator
    job.phase = 'phase_1_validation';
    job.progress = 15;
    await spawnPhase1Validator(courseCode, courseDir, spawnPhaseAgent, trainingUrl, seeds);

    // Poll for seed_pairs.json
    console.log('[Phase 1] ⏳ Waiting for validator to produce seed_pairs.json...');
    const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
    let validated = false;
    const validationTimeout = 30; // 30 polls × 30s = 15 minutes

    for (let i = 0; i < validationTimeout; i++) {
      if (await fs.pathExists(seedPairsPath)) {
        try {
          const data = await fs.readJson(seedPairsPath);
          const actualSeeds = Object.keys(data.translations || {}).length;

          if (actualSeeds >= seeds) {
            console.log(`[Phase 1] ✅ Validation complete! Found ${actualSeeds}/${seeds} seed pairs`);
            validated = true;
            break;
          } else {
            console.log(`[Phase 1] Validator in progress... (${actualSeeds}/${seeds} seeds)`);
          }
        } catch (err) {
          console.log(`[Phase 1] Waiting for valid seed_pairs.json...`);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 30000));
    }

    if (!validated) {
      throw new Error('Phase 1 validation timeout - seed_pairs.json incomplete');
    }

    console.log(`[Phase 1] ✅ COMPLETE! ${seeds} seed pairs generated and validated\n`);
    job.progress = 30;

    // ===== PHASE 3: LEGO PAIRS =====
    console.log('\n📍 PHASE 3: LEGO Extraction\n');
    job.phase = 'phase_3_prep';

    // Prep: Divide seeds into 5 chunks
    await runPrepScript('phase3-prepare-orchestrator-batches.cjs', courseCode, params);

    // Spawn 5 orchestrators with 30s delays
    job.phase = 'phase_3_spawn';
    const phase3Orchestrators = [];
    for (let i = 1; i <= 5; i++) {
      const orch = await spawnOrchestrator(3, i, courseCode, courseDir, spawnPhaseAgent, trainingUrl);
      phase3Orchestrators.push(orch);

      if (i < 5) {
        console.log(`[Phase 3] Waiting 30s before next orchestrator...\n`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    // Wait for all 5 chunks
    job.phase = 'phase_3_waiting';
    job.progress = 40;
    const phase3Result = await waitForChunks(courseDir, 3, 5, 30000, 1800000);

    // Handle failed chunks with retries
    if (!phase3Result.success && phase3Result.failedChunks && phase3Result.failedChunks.length > 0) {
      console.log(`[Phase 3] Retrying ${phase3Result.failedChunks.length} failed chunks...`);

      for (const chunkNum of phase3Result.failedChunks) {
        let retrySuccess = false;

        for (let retry = 1; retry <= MAX_RETRIES && !retrySuccess; retry++) {
          console.log(`[Phase 3] Retry ${retry}/${MAX_RETRIES} for chunk ${chunkNum}...`);

          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          await spawnOrchestrator(3, chunkNum, courseCode, courseDir, spawnPhaseAgent, trainingUrl);

          const retryResult = await waitForChunks(courseDir, 3, chunkNum, 30000, 600000);
          if (retryResult.success) {
            retrySuccess = true;
            console.log(`[Phase 3] ✅ Chunk ${chunkNum} completed on retry ${retry}`);
          }
        }

        if (!retrySuccess) {
          throw new Error(`Phase 3 chunk ${chunkNum} failed after ${MAX_RETRIES} retries`);
        }
      }
    }

    if (!phase3Result.success) {
      throw new Error('Phase 3 chunks incomplete after retries');
    }

    // Close orchestrator windows to free RAM
    const phase3WindowIds = phase3Orchestrators.map(o => o.windowId).filter(Boolean);
    if (phase3WindowIds.length > 0) {
      console.log(`[Phase 3] Closing ${phase3WindowIds.length} orchestrator windows to free RAM...`);
      await closeAgentWindows(phase3WindowIds);
    }

    // Merge chunks
    job.phase = 'phase_3_merge';
    job.progress = 45;
    await runMergeScript('phase3-merge-chunks.cjs', courseCode);

    console.log(`[Phase 3] ✅ COMPLETE! LEGOs extracted for ${seeds} seeds\n`);
    job.progress = 50;

    // ===== PHASE 4: BATCH PREPARATION =====
    console.log('\n📍 PHASE 4: Batch Preparation (Smart Deduplication)\n');
    job.phase = 'phase_4';

    // Phase 4 doesn't use orchestrators - it's a prep script that creates batches for Phase 5
    // Call with --orchestrator flag to create 5 mega-batches
    const phase4Script = path.join(__dirname, 'scripts', 'phase4-prepare-batches.cjs');
    const phase4Args = [courseCode, '--orchestrator'];

    console.log(`[Phase 4] Running phase4-prepare-batches.cjs with --orchestrator flag...`);

    await new Promise((resolve, reject) => {
      const proc = spawn('node', [phase4Script, ...phase4Args], {
        cwd: __dirname,
        stdio: 'inherit'
      });

      proc.on('close', (code) => {
        if (code === 0) {
          console.log(`[Phase 4] ✅ Smart deduplication complete\n`);
          resolve();
        } else {
          reject(new Error(`phase4-prepare-batches.cjs failed with code ${code}`));
        }
      });

      proc.on('error', reject);
    });

    console.log(`[Phase 4] ✅ COMPLETE! 5 mega-batches prepared\n`);
    job.progress = 55;

    // ===== PHASE 5: BASKETS =====
    console.log('\n📍 PHASE 5: Basket Generation\n');
    job.phase = 'phase_5_spawn';

    // Spawn 5 orchestrators with 30s delays
    const phase5Orchestrators = [];
    for (let i = 1; i <= 5; i++) {
      const orch = await spawnOrchestrator(5, i, courseCode, courseDir, spawnPhaseAgent, trainingUrl);
      phase5Orchestrators.push(orch);

      if (i < 5) {
        console.log(`[Phase 5] Waiting 30s before next orchestrator...\n`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    // Wait for all 5 chunks
    job.phase = 'phase_5_waiting';
    job.progress = 65;
    const phase5Result = await waitForChunks(courseDir, 5, 5, 30000, 1800000);

    // Handle failed chunks with retries
    if (!phase5Result.success && phase5Result.failedChunks && phase5Result.failedChunks.length > 0) {
      console.log(`[Phase 5] Retrying ${phase5Result.failedChunks.length} failed chunks...`);

      for (const chunkNum of phase5Result.failedChunks) {
        let retrySuccess = false;

        for (let retry = 1; retry <= MAX_RETRIES && !retrySuccess; retry++) {
          console.log(`[Phase 5] Retry ${retry}/${MAX_RETRIES} for chunk ${chunkNum}...`);

          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          await spawnOrchestrator(5, chunkNum, courseCode, courseDir, spawnPhaseAgent, trainingUrl);

          const retryResult = await waitForChunks(courseDir, 5, chunkNum, 30000, 600000);
          if (retryResult.success) {
            retrySuccess = true;
            console.log(`[Phase 5] ✅ Chunk ${chunkNum} completed on retry ${retry}`);
          }
        }

        if (!retrySuccess) {
          throw new Error(`Phase 5 chunk ${chunkNum} failed after ${MAX_RETRIES} retries`);
        }
      }
    }

    if (!phase5Result.success) {
      throw new Error('Phase 5 chunks incomplete after retries');
    }

    // Close orchestrator windows to free RAM
    const phase5WindowIds = phase5Orchestrators.map(o => o.windowId).filter(Boolean);
    if (phase5WindowIds.length > 0) {
      console.log(`[Phase 5] Closing ${phase5WindowIds.length} orchestrator windows to free RAM...`);
      await closeAgentWindows(phase5WindowIds);
    }

    // Merge chunks
    job.phase = 'phase_5_merge';
    job.progress = 75;
    await runMergeScript('phase5-merge-batches.cjs', courseCode, true);

    console.log(`[Phase 5] ✅ COMPLETE! Baskets generated\n`);
    job.progress = 80;

    // ===== PHASE 6: INTRODUCTIONS =====
    console.log('\n📍 PHASE 6: Introduction Generation\n');
    job.phase = 'phase_6_prep';

    // Prep: Divide LEGOs into 5 chunks
    await runPrepScript('phase6-prepare-orchestrator-batches.cjs', courseCode, params);

    // Spawn 5 orchestrators with 30s delays
    job.phase = 'phase_6_spawn';
    const phase6Orchestrators = [];
    for (let i = 1; i <= 5; i++) {
      const orch = await spawnOrchestrator(6, i, courseCode, courseDir, spawnPhaseAgent, trainingUrl);
      phase6Orchestrators.push(orch);

      if (i < 5) {
        console.log(`[Phase 6] Waiting 30s before next orchestrator...\n`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    // Wait for all 5 chunks
    job.phase = 'phase_6_waiting';
    job.progress = 90;
    const phase6Result = await waitForChunks(courseDir, 6, 5, 30000, 1800000);

    // Handle failed chunks with retries
    if (!phase6Result.success && phase6Result.failedChunks && phase6Result.failedChunks.length > 0) {
      console.log(`[Phase 6] Retrying ${phase6Result.failedChunks.length} failed chunks...`);

      for (const chunkNum of phase6Result.failedChunks) {
        let retrySuccess = false;

        for (let retry = 1; retry <= MAX_RETRIES && !retrySuccess; retry++) {
          console.log(`[Phase 6] Retry ${retry}/${MAX_RETRIES} for chunk ${chunkNum}...`);

          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          await spawnOrchestrator(6, chunkNum, courseCode, courseDir, spawnPhaseAgent, trainingUrl);

          const retryResult = await waitForChunks(courseDir, 6, chunkNum, 30000, 600000);
          if (retryResult.success) {
            retrySuccess = true;
            console.log(`[Phase 6] ✅ Chunk ${chunkNum} completed on retry ${retry}`);
          }
        }

        if (!retrySuccess) {
          throw new Error(`Phase 6 chunk ${chunkNum} failed after ${MAX_RETRIES} retries`);
        }
      }
    }

    if (!phase6Result.success) {
      throw new Error('Phase 6 chunks incomplete after retries');
    }

    // Close orchestrator windows to free RAM
    const phase6WindowIds = phase6Orchestrators.map(o => o.windowId).filter(Boolean);
    if (phase6WindowIds.length > 0) {
      console.log(`[Phase 6] Closing ${phase6WindowIds.length} orchestrator windows to free RAM...`);
      await closeAgentWindows(phase6WindowIds);
    }

    // Merge chunks
    job.phase = 'phase_6_merge';
    job.progress = 95;
    await runMergeScript('phase6-merge-chunks.cjs', courseCode);

    console.log(`[Phase 6] ✅ COMPLETE! Introductions generated\n`);

    // ===== COMPLETE =====
    console.log('\n' + '='.repeat(60));
    console.log('✅ COURSE GENERATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`\nCourse: ${courseCode}`);
    console.log(`Seeds: ${seeds}`);
    console.log(`\nDeliverables:`);
    console.log(`  ✓ seed_pairs.json`);
    console.log(`  ✓ lego_pairs.json`);
    console.log(`  ✓ lego_baskets.json`);
    console.log(`  ✓ lego_intros.json`);
    console.log('\n' + '='.repeat(60) + '\n');

    job.status = 'completed';
    job.phase = 'completed';
    job.progress = 100;
    job.endTime = new Date();

  } catch (error) {
    console.error(`\n[Orchestrator] ❌ Error: ${error.message}\n`);
    job.status = 'failed';
    job.error = error.message;
    throw error;
  }
}

module.exports = {
  runOrchestratorWorkflow,
  runPrepScript,
  spawnOrchestrator,
  spawnPhase1Validator,
  waitForChunks,
  runMergeScript,
  generateOrchestratorPrompt,
  generateValidatorPrompt
};
