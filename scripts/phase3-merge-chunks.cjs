#!/usr/bin/env node
/**
 * Phase 3: Merge Orchestrator Chunks
 *
 * Merges 5 chunk files into final lego_pairs.json
 * No validation needed - seeds are isolated per Phase 3 intelligence
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2];

if (!courseCode) {
  console.error('Usage: node phase3-merge-chunks.cjs <course_code>');
  console.error('Example: node phase3-merge-chunks.cjs spa_for_eng');
  process.exit(1);
}

const courseDir = path.join(__dirname, '../vfs/courses', courseCode);
const orchestratorDir = path.join(courseDir, 'orchestrator_batches', 'phase3');
const outputFile = path.join(courseDir, 'lego_pairs.json');

console.log('🔗 Phase 3: Merging Orchestrator Chunks\n');
console.log(`Course: ${courseCode}\n`);

// Read manifest
const manifestFile = path.join(orchestratorDir, 'manifest.json');
if (!fs.existsSync(manifestFile)) {
  console.error(`❌ manifest.json not found at: ${manifestFile}`);
  console.error('Run phase3-prepare-orchestrator-batches.cjs first');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
console.log(`Expected chunks: ${manifest.orchestrator_count}\n`);

// Read all chunks
const allSeeds = [];
let totalLegos = 0;

for (let i = 1; i <= manifest.orchestrator_count; i++) {
  const chunkFile = path.join(orchestratorDir, `chunk_${String(i).padStart(2, '0')}.json`);

  if (!fs.existsSync(chunkFile)) {
    console.error(`❌ Missing chunk file: chunk_${String(i).padStart(2, '0')}.json`);
    console.error(`Only ${i - 1} of ${manifest.orchestrator_count} chunks found`);
    process.exit(1);
  }

  const chunk = JSON.parse(fs.readFileSync(chunkFile, 'utf8'));

  console.log(`✓ Reading chunk_${String(i).padStart(2, '0')}.json`);
  console.log(`  Seeds: ${chunk.seeds.length}`);
  console.log(`  LEGOs: ${chunk.metadata.total_legos}`);

  allSeeds.push(...chunk.seeds);
  totalLegos += chunk.metadata.total_legos;
}

console.log(`\nTotal seeds merged: ${allSeeds.length}`);
console.log(`Total LEGOs extracted: ${totalLegos}\n`);

// Sort seeds by ID
allSeeds.sort((a, b) => {
  const numA = parseInt(a[0].substring(1));
  const numB = parseInt(b[0].substring(1));
  return numA - numB;
});

// Create final lego_pairs.json in v7.7 format
const legoPairs = {
  version: "7.7.0",
  course: courseCode,
  target: manifest.course_code.split('_')[0],
  known: manifest.course_code.split('_')[2],
  generated: new Date().toISOString(),
  total_seeds: allSeeds.length,
  total_legos: totalLegos,

  seeds: allSeeds
};

// Write output
fs.writeFileSync(outputFile, JSON.stringify(legoPairs, null, 2));

console.log(`✓ Created lego_pairs.json`);
console.log(`\n${'='.repeat(60)}`);
console.log('MERGE COMPLETE');
console.log('='.repeat(60));
console.log(`\nTotal seeds: ${allSeeds.length}`);
console.log(`Total LEGOs: ${totalLegos}`);
console.log(`Average LEGOs per seed: ${(totalLegos / allSeeds.length).toFixed(1)}`);
console.log(`\nOutput: ${outputFile}`);
console.log(`\n✅ Phase 3 complete! Ready for Phase 4 (batch preparation)\n`);
