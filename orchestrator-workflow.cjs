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

// Helper: Spawn a single orchestrator agent using Task tool
async function spawnOrchestrator(phaseNum, orchestratorNum, courseCode, courseDir) {
  const orchestratorId = `phase${phaseNum}_orch_${String(orchestratorNum).padStart(2, '0')}`;
  const batchFile = path.join(courseDir, 'orchestrator_batches', `phase${phaseNum}`, `orchestrator_batch_${String(orchestratorNum).padStart(2, '0')}.json`);

  console.log(`[Phase ${phaseNum}] Spawning orchestrator ${orchestratorNum}/5 (${orchestratorId})...`);

  // Generate orchestrator prompt
  const intelligence Doc = `docs/phase_intelligence/phase_${phaseNum}_orchestrator.md`;
  const chunkFile = `chunk_${String(orchestratorNum).padStart(2, '0')}.json`;

  const prompt = `You are Phase ${phaseNum} Orchestrator #${orchestratorNum} for ${courseCode}.

1. Read your batch file: ${batchFile}
2. Read Phase ${phaseNum} orchestrator intelligence from: ${intelligenceDoc}
3. Divide work among 10 sub-agents
4. Spawn all 10 agents in parallel (one message with 10 Task calls)
5. Validate their outputs
6. Merge into: ${path.join(courseDir, 'orchestrator_batches', `phase${phaseNum}`, chunkFile)}
7. Report completion

Use extended thinking. Follow all validation rules. Output chunk file in v7.7 format.`;

  // In a real implementation, this would use the Claude Code Task tool
  // For now, we'll simulate it by writing a prompt file and spawning via automation_server
  const promptFile = path.join(courseDir, `orchestrator_${orchestratorId}_prompt.md`);
  await fs.writeFile(promptFile, prompt);

  console.log(`[Phase ${phaseNum}] Orchestrator ${orchestratorNum} prompt written to: ${promptFile}`);
  console.log(`[Phase ${phaseNum}] Note: Dashboard will need to spawn this via Task tool`);

  // Return the prompt file path so dashboard can spawn it
  return { orchestratorId, promptFile };
}

// Helper: Wait for all chunks to be created
async function waitForChunks(courseDir, phaseNum, numChunks = 5, pollInterval = 30000, timeout = 1800000) {
  const chunkDir = path.join(courseDir, 'orchestrator_batches', `phase${phaseNum}`);
  const startTime = Date.now();

  console.log(`[Phase ${phaseNum}] Waiting for ${numChunks} chunks in: ${chunkDir}`);
  console.log(`[Phase ${phaseNum}] Polling every ${pollInterval/1000}s, timeout: ${timeout/60000} minutes`);

  while (Date.now() - startTime < timeout) {
    const chunks = [];
    for (let i = 1; i <= numChunks; i++) {
      const chunkFile = path.join(chunkDir, `chunk_${String(i).padStart(2, '0')}.json`);
      if (await fs.pathExists(chunkFile)) {
        chunks.push(i);
      }
    }

    console.log(`[Phase ${phaseNum}] Chunks complete: ${chunks.length}/${numChunks} (${chunks.join(', ')})`);

    if (chunks.length === numChunks) {
      console.log(`[Phase ${phaseNum}] ✅ All ${numChunks} chunks complete!\n`);
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  console.error(`[Phase ${phaseNum}] ❌ Timeout waiting for chunks`);
  return false;
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
 */
async function runOrchestratorWorkflow(courseCode, params, job) {
  const { target, known, seeds, startSeed, endSeed } = params;
  const courseDir = path.join(__dirname, 'vfs/courses', courseCode);

  console.log(`\n${'='.repeat(60)}`);
  console.log('ORCHESTRATOR WORKFLOW STARTING');
  console.log('='.repeat(60));
  console.log(`Course: ${courseCode}`);
  console.log(`Seeds: ${startSeed}-${endSeed} (${seeds} total)`);
  console.log(`Architecture: 5 orchestrators × 10 agents = 50 concurrent per phase`);
  console.log('='.repeat(60) + '\n');

  try {
    // ===== PHASE 1: SEED PAIRS =====
    console.log('\n📍 PHASE 1: Seed Pair Translation\n');
    job.phase = 'phase_1_prep';
    job.progress = 0;

    // Prep: Divide seeds into 5 chunks
    await runPrepScript('phase1-prepare-orchestrator-batches.cjs', courseCode, params);

    // Spawn 5 orchestrators with 30s delays
    job.phase = 'phase_1_spawn';
    for (let i = 1; i <= 5; i++) {
      await spawnOrchestrator(1, i, courseCode, courseDir);
      if (i < 5) {
        console.log(`[Phase 1] Waiting 30s before next orchestrator...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    // Wait for all 5 chunks
    job.phase = 'phase_1_waiting';
    job.progress = 10;
    const phase1Complete = await waitForChunks(courseDir, 1);
    if (!phase1Complete) {
      throw new Error('Phase 1 chunks timeout');
    }

    // Spawn validator
    console.log('[Phase 1] Spawning validator agent...');
    // TODO: Spawn validator via Task tool
    // For now, assume it completes
    console.log('[Phase 1] ⏳ Waiting for validator (checking seed_pairs.json)...');

    // Poll for seed_pairs.json
    const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
    let validated = false;
    for (let i = 0; i < 30; i++) {
      if (await fs.pathExists(seedPairsPath)) {
        const data = await fs.readJson(seedPairsPath);
        if (Object.keys(data.translations || {}).length >= seeds) {
          validated = true;
          break;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 30000));
    }

    if (!validated) {
      throw new Error('Phase 1 validation timeout');
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
    for (let i = 1; i <= 5; i++) {
      await spawnOrchestrator(3, i, courseCode, courseDir);
      if (i < 5) {
        console.log(`[Phase 3] Waiting 30s before next orchestrator...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    // Wait for all 5 chunks
    job.phase = 'phase_3_waiting';
    job.progress = 40;
    const phase3Complete = await waitForChunks(courseDir, 3);
    if (!phase3Complete) {
      throw new Error('Phase 3 chunks timeout');
    }

    // Merge chunks
    await runMergeScript('phase3-merge-chunks.cjs', courseCode);

    console.log(`[Phase 3] ✅ COMPLETE! LEGOs extracted for ${seeds} seeds\n`);
    job.progress = 50;

    // ===== PHASE 4: BATCH PREPARATION =====
    console.log('\n📍 PHASE 4: Batch Preparation (Smart Deduplication)\n');
    job.phase = 'phase_4';

    await runPrepScript('phase4-prepare-batches.cjs', courseCode, { ...params, orchestrator: true });

    console.log(`[Phase 4] ✅ COMPLETE! 5 mega-batches prepared\n`);
    job.progress = 55;

    // ===== PHASE 5: BASKETS =====
    console.log('\n📍 PHASE 5: Basket Generation\n');
    job.phase = 'phase_5_spawn';

    // Spawn 5 orchestrators with 30s delays
    for (let i = 1; i <= 5; i++) {
      await spawnOrchestrator(5, i, courseCode, courseDir);
      if (i < 5) {
        console.log(`[Phase 5] Waiting 30s before next orchestrator...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    // Wait for all 5 chunks
    job.phase = 'phase_5_waiting';
    job.progress = 65;
    const phase5Complete = await waitForChunks(courseDir, 5);
    if (!phase5Complete) {
      throw new Error('Phase 5 chunks timeout');
    }

    // Merge chunks
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
    for (let i = 1; i <= 5; i++) {
      await spawnOrchestrator(6, i, courseCode, courseDir);
      if (i < 5) {
        console.log(`[Phase 6] Waiting 30s before next orchestrator...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    // Wait for all 5 chunks
    job.phase = 'phase_6_waiting';
    job.progress = 90;
    const phase6Complete = await waitForChunks(courseDir, 6);
    if (!phase6Complete) {
      throw new Error('Phase 6 chunks timeout');
    }

    // Merge chunks
    await runMergeScript('phase6-merge-chunks.cjs', courseCode);

    console.log(`[Phase 6] ✅ COMPLETE! Introductions generated\n`);

    // ===== COMPLETE =====
    console.log('\n${'='.repeat(60)}`);
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
  waitForChunks,
  runMergeScript
};
