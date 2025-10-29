#!/usr/bin/env node
/**
 * Phase 6: Prepare Orchestrator Batches for Introduction Generation
 *
 * Divides all LEGOs into 5 equal chunks for parallel introduction generation.
 * Each chunk will be processed by one orchestrator spawning 10 sub-agents.
 *
 * Strategy:
 * - 5 orchestrators × 10 sub-agents = 50 concurrent agents
 * - Each orchestrator handles ~362 LEGOs
 * - Each sub-agent generates introductions for ~36 LEGOs
 * - No validator needed (introductions are independent)
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2];
const numOrchestrators = parseInt(process.argv[3]) || 5;
const startSeed = parseInt(process.argv[4]) || 1;
const endSeed = parseInt(process.argv[5]) || null; // null means "all seeds"

if (!courseCode) {
  console.error('Usage: node phase6-prepare-orchestrator-batches.cjs <course_code> [num_orchestrators] [startSeed] [endSeed]');
  console.error('Example: node phase6-prepare-orchestrator-batches.cjs spa_for_eng 5 1 668');
  console.error('Example: node phase6-prepare-orchestrator-batches.cjs spa_for_eng 5 1 30  # Test with 30 seeds');
  process.exit(1);
}

const courseDir = path.join(__dirname, '../vfs/courses', courseCode);
const legoPairsFile = path.join(courseDir, 'lego_pairs.json');
const orchestratorDir = path.join(courseDir, 'orchestrator_batches', 'phase6');

console.log('🔧 Phase 6: Preparing Orchestrator Batches for Introduction Generation\n');
console.log(`Course: ${courseCode}`);
console.log(`Orchestrators: ${numOrchestrators}\n`);

// Read LEGO pairs
if (!fs.existsSync(legoPairsFile)) {
  console.error(`❌ lego_pairs.json not found at: ${legoPairsFile}`);
  console.error('Run Phase 3 first to generate lego_pairs.json');
  process.exit(1);
}

const legoPairs = JSON.parse(fs.readFileSync(legoPairsFile, 'utf8'));

// Determine final end seed
const finalEndSeed = endSeed || legoPairs.seeds.length;

// Extract all LEGOs with metadata (filter by seed range if specified)
const allLegos = [];
for (const seed of legoPairs.seeds) {
  const [seedId, [targetSeed, knownSeed], legos] = seed;

  // Filter by seed range
  const seedNum = parseInt(seedId.substring(1));
  if (seedNum < startSeed || seedNum > finalEndSeed) {
    continue;
  }

  for (const lego of legos) {
    const [legoId, type, target, known, components] = lego;

    allLegos.push({
      lego_id: legoId,
      seed_id: seedId,
      type,
      target,
      known,
      components,
      seed_sentence: {
        target: targetSeed,
        known: knownSeed
      }
    });
  }
}

console.log(`Total seeds in lego_pairs.json: ${legoPairs.seeds.length}`);
console.log(`Seed range: ${startSeed}-${finalEndSeed}`);
console.log(`Total LEGOs: ${allLegos.length}`);

// Create orchestrator directory
if (!fs.existsSync(orchestratorDir)) {
  fs.mkdirSync(orchestratorDir, { recursive: true });
}

// Calculate chunk sizes
const chunkSize = Math.ceil(allLegos.length / numOrchestrators);
console.log(`LEGOs per orchestrator: ~${chunkSize}\n`);

// Divide into chunks
for (let i = 0; i < numOrchestrators; i++) {
  const startIdx = i * chunkSize;
  const endIdx = Math.min((i + 1) * chunkSize, allLegos.length);
  const chunk = allLegos.slice(startIdx, endIdx);

  const orchestratorBatch = {
    orchestrator_id: `phase6_orch_${String(i + 1).padStart(2, '0')}`,
    chunk_number: i + 1,
    total_chunks: numOrchestrators,
    course_code: courseCode,

    legos: chunk,

    metadata: {
      total_legos: chunk.length,
      lego_range: `${chunk[0].lego_id} - ${chunk[chunk.length - 1].lego_id}`,
      agents_to_spawn: 10,
      legos_per_agent: Math.ceil(chunk.length / 10)
    },

    instructions: {
      task: "Generate introductions for LEGOs using Phase 6 intelligence",
      intelligence_url: "GET /api/phase-intelligence/6",
      output_file: `chunk_${String(i + 1).padStart(2, '0')}.json`,
      requirements: [
        "Each introduction should be 2-3 sentences",
        "Focus on real-world usage and practical scenarios",
        "Use simple, accessible language",
        "Motivate the learner about why this LEGO is useful",
        "For COMPOSITE LEGOs, explain the idiomatic meaning"
      ]
    }
  };

  const batchFile = path.join(orchestratorDir, `orchestrator_batch_${String(i + 1).padStart(2, '0')}.json`);
  fs.writeFileSync(batchFile, JSON.stringify(orchestratorBatch, null, 2));

  console.log(`✓ Created orchestrator_batch_${String(i + 1).padStart(2, '0')}.json`);
  console.log(`  LEGOs: ${chunk.length} (${chunk[0].lego_id} - ${chunk[chunk.length - 1].lego_id})`);
}

// Create manifest
const manifest = {
  course_code: courseCode,
  phase: 6,
  orchestrator_count: numOrchestrators,
  total_legos: allLegos.length,
  legos_per_orchestrator: chunkSize,
  agents_per_orchestrator: 10,
  total_concurrent_agents: numOrchestrators * 10,

  batches: Array.from({ length: numOrchestrators }, (_, i) => ({
    orchestrator_id: `phase6_orch_${String(i + 1).padStart(2, '0')}`,
    batch_file: `orchestrator_batch_${String(i + 1).padStart(2, '0')}.json`,
    output_file: `chunk_${String(i + 1).padStart(2, '0')}.json`
  })),

  next_step: "Spawn orchestrators with dashboard master agent",
  merge_step: "After all chunks complete, merge into lego_intros.json (no validator needed)"
};

const manifestFile = path.join(orchestratorDir, 'manifest.json');
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));

console.log(`\n✓ Created manifest.json`);
console.log(`\n${'='.repeat(60)}`);
console.log('PREPARATION COMPLETE');
console.log('='.repeat(60));
console.log(`\nOrchestrators: ${numOrchestrators}`);
console.log(`Total concurrent agents: ${numOrchestrators * 10}`);
console.log(`LEGOs per agent: ~${Math.ceil(chunkSize / 10)}`);
console.log(`\nNext steps:`);
console.log(`  1. Dashboard spawns ${numOrchestrators} orchestrators (30s delay)`);
console.log(`  2. Each orchestrator spawns 10 sub-agents`);
console.log(`  3. Wait for all ${numOrchestrators} chunks to complete`);
console.log(`  4. Merge chunks into lego_intros.json (no validator needed)`);
console.log(`\nNote: Phase 6 introductions are independent - no consistency checking needed\n`);
