#!/usr/bin/env node
/**
 * Phase 1: Prepare Orchestrator Batches
 *
 * Divides 668 canonical translations into 3 equal chunks for orchestration.
 * Each chunk will be processed by one orchestrator spawning 10 sub-agents.
 *
 * Strategy:
 * - 3 orchestrators × 10 sub-agents = 30 concurrent agents (safe concurrency)
 * - Each orchestrator handles ~223 seeds (668 ÷ 3)
 * - Each sub-agent translates ~22-23 seeds (223 ÷ 10)
 * - Total capacity: Can handle up to 750 seeds if needed (3 × 10 × 25)
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2];
const numOrchestrators = parseInt(process.argv[3]) || 3;  // Default to 3 (max safe concurrency)
const startSeed = parseInt(process.argv[4]) || 1;
const endSeed = parseInt(process.argv[5]) || null; // null means "all seeds"

if (!courseCode) {
  console.error('Usage: node phase1-prepare-orchestrator-batches.cjs <course_code> [num_orchestrators] [startSeed] [endSeed]');
  console.error('Example: node phase1-prepare-orchestrator-batches.cjs spa_for_eng 3 1 668  # Default: 3 orchestrators');
  console.error('Example: node phase1-prepare-orchestrator-batches.cjs spa_for_eng 3 1 30   # Test with 30 seeds');
  console.error('WARNING: Max 3 orchestrators recommended (30 concurrent agents). More may crash your system.');
  process.exit(1);
}

const courseDir = path.join(__dirname, '../vfs/courses', courseCode);
const canonicalSeedsFile = path.join(__dirname, '../seeds/canonical_seeds.json');
const orchestratorDir = path.join(courseDir, 'orchestrator_batches', 'phase1');

console.log('🔧 Phase 1: Preparing Orchestrator Batches\n');
console.log(`Course: ${courseCode}`);
console.log(`Orchestrators: ${numOrchestrators}\n`);

// Read canonical seeds from source
if (!fs.existsSync(canonicalSeedsFile)) {
  console.error(`❌ canonical_seeds.json not found at: ${canonicalSeedsFile}`);
  process.exit(1);
}

const canonicalData = JSON.parse(fs.readFileSync(canonicalSeedsFile, 'utf8'));

// Filter by seed range if specified
const finalEndSeed = endSeed || canonicalData.length;
let canonicalSeeds = canonicalData.filter(seed => {
  const num = parseInt(seed.seed_id.replace('S', '').replace('C', ''));
  return num >= startSeed && num <= finalEndSeed;
});

console.log(`Total seeds available: ${canonicalData.length}`);
console.log(`Seed range: ${startSeed}-${finalEndSeed} (${canonicalSeeds.length} seeds)`);

// Create orchestrator directory
if (!fs.existsSync(orchestratorDir)) {
  fs.mkdirSync(orchestratorDir, { recursive: true });
}

// Calculate chunk sizes
const chunkSize = Math.ceil(canonicalSeeds.length / numOrchestrators);
console.log(`Seeds per orchestrator: ~${chunkSize}\n`);

// Divide into chunks (just ranges, not actual seed data)
for (let i = 0; i < numOrchestrators; i++) {
  const startIdx = i * chunkSize;
  const endIdx = Math.min((i + 1) * chunkSize, canonicalSeeds.length);
  const chunk = canonicalSeeds.slice(startIdx, endIdx);

  const startSeedNum = parseInt(chunk[0].seed_id.replace('S', '').padStart(4, '0'));
  const endSeedNum = parseInt(chunk[chunk.length - 1].seed_id.replace('S', '').padStart(4, '0'));

  // Minimal batch file - just the range, not all the seed data!
  const orchestratorBatch = {
    orchestrator_id: `phase1_orch_${String(i + 1).padStart(2, '0')}`,
    chunk_number: i + 1,
    total_chunks: numOrchestrators,
    course_code: courseCode,

    // Just the range - orchestrator fetches seeds from API
    seed_range: {
      start: startSeedNum,
      end: endSeedNum,
      total: chunk.length
    },

    // Where to fetch seeds from
    api: {
      seeds_endpoint: "https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/seeds",
      fetch_params: `?start=${startSeedNum}&end=${endSeedNum}`
    },

    config: {
      agents_to_spawn: 10,
      seeds_per_agent: Math.ceil(chunk.length / 10),
      output_file: `chunk_${String(i + 1).padStart(2, '0')}.json`
    }
  };

  const batchFile = path.join(orchestratorDir, `orchestrator_batch_${String(i + 1).padStart(2, '0')}.json`);
  fs.writeFileSync(batchFile, JSON.stringify(orchestratorBatch, null, 2));

  console.log(`✓ Created orchestrator_batch_${String(i + 1).padStart(2, '0')}.json`);
  console.log(`  Seed range: ${startSeedNum}-${endSeedNum} (${chunk.length} seeds)`);
}

// Create manifest
const manifest = {
  course_code: courseCode,
  phase: 1,
  orchestrator_count: numOrchestrators,
  total_seeds: canonicalSeeds.length,
  seeds_per_orchestrator: chunkSize,
  agents_per_orchestrator: 10,
  total_concurrent_agents: numOrchestrators * 10,

  batches: Array.from({ length: numOrchestrators }, (_, i) => ({
    orchestrator_id: `phase1_orch_${String(i + 1).padStart(2, '0')}`,
    batch_file: `orchestrator_batch_${String(i + 1).padStart(2, '0')}.json`,
    output_file: `chunk_${String(i + 1).padStart(2, '0')}.json`
  })),

  next_step: "Spawn orchestrators with dashboard master agent",
  validator_step: "After all chunks complete, spawn Phase 1 validator"
};

const manifestFile = path.join(orchestratorDir, 'manifest.json');
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));

console.log(`\n✓ Created manifest.json`);
console.log(`\n${'='.repeat(60)}`);
console.log('PREPARATION COMPLETE');
console.log('='.repeat(60));
console.log(`\nOrchestrators: ${numOrchestrators}`);
console.log(`Total concurrent agents: ${numOrchestrators * 10}`);
console.log(`Seeds per agent: ~${Math.ceil(chunkSize / 10)}`);
console.log(`\nNext steps:`);
console.log(`  1. Dashboard spawns ${numOrchestrators} orchestrators (30s delay)`);
console.log(`  2. Each orchestrator spawns 10 sub-agents`);
console.log(`  3. Wait for all ${numOrchestrators} chunks to complete`);
console.log(`  4. Spawn Phase 1 validator for consistency checking`);
console.log(`  5. Validator outputs final seed_pairs.json\n`);
