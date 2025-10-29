#!/usr/bin/env node
/**
 * Phase 1: Prepare Orchestrator Batches
 *
 * Divides 668 canonical translations into 5 equal chunks for parallel orchestration.
 * Each chunk will be processed by one orchestrator spawning 10 sub-agents.
 *
 * Strategy:
 * - 5 orchestrators × 10 sub-agents = 50 concurrent agents
 * - Each orchestrator handles ~134 seeds
 * - Each sub-agent translates ~13-14 seeds
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2];
const numOrchestrators = parseInt(process.argv[3]) || 5;
const startSeed = parseInt(process.argv[4]) || 1;
const endSeed = parseInt(process.argv[5]) || null; // null means "all seeds"

if (!courseCode) {
  console.error('Usage: node phase1-prepare-orchestrator-batches.cjs <course_code> [num_orchestrators] [startSeed] [endSeed]');
  console.error('Example: node phase1-prepare-orchestrator-batches.cjs spa_for_eng 5 1 668');
  console.error('Example: node phase1-prepare-orchestrator-batches.cjs spa_for_eng 5 1 30  # Test with 30 seeds');
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
let canonicalSeeds = Object.entries(canonicalData).sort((a, b) => {
  const numA = parseInt(a[0].replace('S', '').replace('C', ''));
  const numB = parseInt(b[0].replace('S', '').replace('C', ''));
  return numA - numB;
});

// Filter by seed range if specified
const finalEndSeed = endSeed || canonicalSeeds.length;
canonicalSeeds = canonicalSeeds.filter(([seedId]) => {
  const num = parseInt(seedId.substring(1));
  return num >= startSeed && num <= finalEndSeed;
});

console.log(`Total seeds available: ${Object.keys(translations.canonical).length}`);
console.log(`Seed range: ${startSeed}-${finalEndSeed} (${canonicalSeeds.length} seeds)`);

// Create orchestrator directory
if (!fs.existsSync(orchestratorDir)) {
  fs.mkdirSync(orchestratorDir, { recursive: true });
}

// Calculate chunk sizes
const chunkSize = Math.ceil(canonicalSeeds.length / numOrchestrators);
console.log(`Seeds per orchestrator: ~${chunkSize}\n`);

// Divide into chunks
for (let i = 0; i < numOrchestrators; i++) {
  const startIdx = i * chunkSize;
  const endIdx = Math.min((i + 1) * chunkSize, canonicalSeeds.length);
  const chunk = canonicalSeeds.slice(startIdx, endIdx);

  const orchestratorBatch = {
    orchestrator_id: `phase1_orch_${String(i + 1).padStart(2, '0')}`,
    chunk_number: i + 1,
    total_chunks: numOrchestrators,
    course_code: courseCode,

    seeds: chunk.map(([seedId, canonicalText]) => ({
      seed_id: seedId,
      canonical: canonicalText
    })),

    metadata: {
      total_seeds: chunk.length,
      seed_range: `${chunk[0][0]} - ${chunk[chunk.length - 1][0]}`,
      agents_to_spawn: 10,
      seeds_per_agent: Math.ceil(chunk.length / 10)
    },

    instructions: {
      task: "Translate canonical seeds using Phase 1 intelligence",
      intelligence_url: "GET /api/phase-intelligence/1",
      output_file: `chunk_${String(i + 1).padStart(2, '0')}.json`,
      validation: [
        "Apply TWO ABSOLUTE RULES (never change meaning, prefer cognates)",
        "Maintain Zero Variation in seeds 1-100",
        "Ensure grammatical perfection in both languages",
        "Validate tiling and functional determinism"
      ]
    }
  };

  const batchFile = path.join(orchestratorDir, `orchestrator_batch_${String(i + 1).padStart(2, '0')}.json`);
  fs.writeFileSync(batchFile, JSON.stringify(orchestratorBatch, null, 2));

  console.log(`✓ Created orchestrator_batch_${String(i + 1).padStart(2, '0')}.json`);
  console.log(`  Seeds: ${chunk.length} (${chunk[0][0]} - ${chunk[chunk.length - 1][0]})`);
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
