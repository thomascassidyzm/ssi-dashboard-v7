#!/usr/bin/env node
/**
 * Phase 5 CLI Regeneration - Quick Fix for Spanish Course
 *
 * Uses Claude CLI directly for speed
 * No browser automation, no ngrok - just fast basket generation
 *
 * Usage:
 *   node scripts/phase5-cli-regenerate.cjs spa_for_eng --seeds 109-668 --parallel 10
 */

const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

// Parse args
const args = process.argv.slice(2);
const courseCode = args[0];
const seedRange = args.find(a => a.startsWith('--seeds'))?.split('=')[1] || '1-668';
const parallel = parseInt(args.find(a => a.startsWith('--parallel'))?.split('=')[1] || '10');

const [startSeed, endSeed] = seedRange.split('-').map(Number);

console.log(`
╔═══════════════════════════════════════════════════════╗
║  Phase 5 CLI Regeneration (Fast Mode)                ║
╚═══════════════════════════════════════════════════════╝

Course: ${courseCode}
Seeds: ${startSeed}-${endSeed} (${endSeed - startSeed + 1} seeds)
Parallel: ${parallel} workers
Method: Claude CLI (direct filesystem)

`);

const courseDir = path.join(__dirname, '../public/vfs/courses', courseCode);
const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
const outputDir = path.join(courseDir, 'phase5_baskets_staging');

// Ensure output dir exists
fs.ensureDirSync(outputDir);

// Load lego_pairs to identify LEGOs
const legoPairs = fs.readJsonSync(legoPairsPath);

// Find all LEGOs in seed range
const targetLegos = [];
for (const seed of legoPairs.seeds || []) {
  const seedNum = parseInt(seed.seed_id.replace('S', ''));
  if (seedNum >= startSeed && seedNum <= endSeed) {
    for (const lego of seed.legos || []) {
      if (lego.new) {
        targetLegos.push({
          legoId: lego.id,
          seed: seed.seed_id,
          target: lego.target,
          known: lego.known,
          type: lego.type || 'M'
        });
      }
    }
  }
}

console.log(`Found ${targetLegos.length} LEGOs to process\n`);

// Divide LEGOs among workers
const legosPerWorker = Math.ceil(targetLegos.length / parallel);
const workers = [];

for (let i = 0; i < parallel; i++) {
  const startIdx = i * legosPerWorker;
  const endIdx = Math.min(startIdx + legosPerWorker, targetLegos.length);
  const workerLegos = targetLegos.slice(startIdx, endIdx);

  if (workerLegos.length > 0) {
    workers.push({
      id: i + 1,
      legos: workerLegos
    });
  }
}

console.log(`Starting ${workers.length} workers...\n`);

// Spawn workers
const promises = workers.map(worker => spawnWorker(worker, courseCode, courseDir));

Promise.all(promises)
  .then(() => {
    console.log(`\n✅ All ${workers.length} workers complete!`);
    console.log(`\nBaskets saved to: ${outputDir}`);
    console.log(`\nNext steps:`);
    console.log(`  1. Review: ls ${outputDir}`);
    console.log(`  2. Validate: node tools/validators/phase-deep-validator.cjs ${courseCode} phase5`);
    console.log(`  3. Merge: node tools/phase5/extract-and-normalize.cjs ${courseCode}`);
  })
  .catch(err => {
    console.error(`\n❌ Error:`, err);
    process.exit(1);
  });

async function spawnWorker(worker, courseCode, courseDir) {
  const prompt = generateWorkerPrompt(worker, courseCode, courseDir);

  // Save prompt to temp file
  const promptFile = path.join('/tmp', `phase5_worker_${worker.id}.md`);
  await fs.writeFile(promptFile, prompt);

  console.log(`[Worker ${worker.id}] Starting (${worker.legos.length} LEGOs)...`);

  return new Promise((resolve, reject) => {
    const claude = spawn('claude', [
      '--prompt', promptFile,
      '--output', path.join(courseDir, 'phase5_baskets_staging', `worker_${worker.id}.json`)
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';

    claude.stdout.on('data', (data) => {
      output += data.toString();
    });

    claude.stderr.on('data', (data) => {
      console.error(`[Worker ${worker.id}] Error: ${data}`);
    });

    claude.on('close', (code) => {
      if (code === 0) {
        console.log(`[Worker ${worker.id}] ✅ Complete (${worker.legos.length} LEGOs)`);
        resolve();
      } else {
        reject(new Error(`Worker ${worker.id} failed with code ${code}`));
      }
    });
  });
}

function generateWorkerPrompt(worker, courseCode, courseDir) {
  const legoList = worker.legos.map(l => l.legoId).join(', ');

  return `# Phase 5 CLI Worker ${worker.id}

You are generating practice baskets for ${courseCode}.

## Your Assignment

Generate baskets for these ${worker.legos.length} LEGOs:
${legoList}

## Instructions

1. Read lego_pairs.json from ${courseDir}/lego_pairs.json
2. For each LEGO in your list:
   - Generate 10 practice phrases (2-2-2-4 difficulty progression)
   - Use extended thinking for linguistic quality
   - Follow GATE compliance (vocabulary restrictions)
   - Validate grammar in both languages

3. Save output to ${courseDir}/phase5_baskets_staging/worker_${worker.id}.json

## Output Format

\`\`\`json
{
  "S0109L01": {
    "lego": ["target", "known"],
    "type": "M",
    "practice_phrases": [
      ["known phrase", "target phrase", null, 1],
      ...
    ]
  }
}
\`\`\`

## CRITICAL Rules

- Use extended thinking for EVERY LEGO
- Check grammar before saving
- Only use vocabulary from recent_context (GATE)
- Generate meaningful, natural phrases

START NOW: Generate all ${worker.legos.length} baskets.`;
}
