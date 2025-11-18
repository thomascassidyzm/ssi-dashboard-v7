#!/usr/bin/env node
/**
 * Phase 6: Merge Orchestrator Chunks
 *
 * Merges 5 chunk files into final lego_intros.json
 * No validation needed - introductions are independent
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2];

if (!courseCode) {
  console.error('Usage: node phase6-merge-chunks.cjs <course_code>');
  console.error('Example: node phase6-merge-chunks.cjs spa_for_eng');
  process.exit(1);
}

const courseDir = path.join(__dirname, '../vfs/courses', courseCode);
const orchestratorDir = path.join(courseDir, 'orchestrator_batches', 'phase6');
const outputFile = path.join(courseDir, 'lego_intros.json');

console.log('🔗 Phase 6: Merging Orchestrator Chunks\n');
console.log(`Course: ${courseCode}\n`);

// Read manifest
const manifestFile = path.join(orchestratorDir, 'manifest.json');
if (!fs.existsSync(manifestFile)) {
  console.error(`❌ manifest.json not found at: ${manifestFile}`);
  console.error('Run phase6-prepare-orchestrator-batches.cjs first');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
console.log(`Expected chunks: ${manifest.orchestrator_count}\n`);

// Read all chunks
const allIntroductions = {};
let totalIntros = 0;

for (let i = 1; i <= manifest.orchestrator_count; i++) {
  const chunkFile = path.join(orchestratorDir, `chunk_${String(i).padStart(2, '0')}.json`);

  if (!fs.existsSync(chunkFile)) {
    console.error(`❌ Missing chunk file: chunk_${String(i).padStart(2, '0')}.json`);
    console.error(`Only ${i - 1} of ${manifest.orchestrator_count} chunks found`);
    process.exit(1);
  }

  const chunk = JSON.parse(fs.readFileSync(chunkFile, 'utf8'));

  console.log(`✓ Reading chunk_${String(i).padStart(2, '0')}.json`);
  console.log(`  Introductions: ${Object.keys(chunk.introductions).length}`);

  Object.assign(allIntroductions, chunk.introductions);
  totalIntros += Object.keys(chunk.introductions).length;
}

console.log(`\nTotal introductions merged: ${totalIntros}\n`);

// Create final lego_intros.json in v7.7 format
const legoIntros = {
  version: "7.7.0",
  course: courseCode,
  target: manifest.course_code.split('_')[0],
  known: manifest.course_code.split('_')[2],
  generated: new Date().toISOString(),
  total_introductions: totalIntros,

  introductions: allIntroductions
};

// Write output
fs.writeFileSync(outputFile, JSON.stringify(legoIntros, null, 2));

console.log(`✓ Created lego_intros.json`);
console.log(`\n${'='.repeat(60)}`);
console.log('MERGE COMPLETE');
console.log('='.repeat(60));
console.log(`\nTotal introductions: ${totalIntros}`);
console.log(`Output: ${outputFile}`);

// Sample a few introductions
console.log(`\n${'='.repeat(60)}`);
console.log('SAMPLE INTRODUCTIONS');
console.log('='.repeat(60));

const sampleIds = Object.keys(allIntroductions).slice(0, 3);

for (const id of sampleIds) {
  const intro = allIntroductions[id];
  console.log(`\n${id}: "${intro.target}" / "${intro.known}"`);
  console.log(`  ${intro.intro.substring(0, 80)}${intro.intro.length > 80 ? '...' : ''}`);
}

console.log(`\n✅ Phase 6 complete! Introductions ready for course assembly\n`);
