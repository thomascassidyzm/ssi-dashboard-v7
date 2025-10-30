#!/usr/bin/env node

/**
 * Phase 5: Spawn Missing Agent (Manual Instructions)
 *
 * Provides instructions for manually spawning a missing agent.
 * Does NOT automate iTerm2 spawning (too complex and environment-specific).
 *
 * Usage: node scripts/phase5-spawn-missing-agent.cjs <course> <segment> <orch> <agent>
 *
 * Example: node scripts/phase5-spawn-missing-agent.cjs spa_for_eng 1 3 2
 */

const fs = require('fs');
const path = require('path');

// Parse arguments
const courseCode = process.argv[2];
const segmentNum = process.argv[3];
const orchNum = process.argv[4];
const agentNum = process.argv[5];

if (!courseCode || !segmentNum || !orchNum || !agentNum) {
  console.error('Usage: node scripts/phase5-spawn-missing-agent.cjs <course> <segment> <orch> <agent>');
  console.error('');
  console.error('Example: node scripts/phase5-spawn-missing-agent.cjs spa_for_eng 1 3 2');
  console.error('         (spawns agent 2 in orchestrator 3 of segment 1)');
  process.exit(1);
}

const segmentId = String(segmentNum).padStart(2, '0');
const orchId = String(orchNum).padStart(2, '0');
const agentId = String(agentNum).padStart(2, '0');

console.log('🚀 Phase 5: Spawn Missing Agent');
console.log('='.repeat(60));
console.log(`Course: ${courseCode}`);
console.log(`Segment: ${segmentId}`);
console.log(`Orchestrator: ${orchId}`);
console.log(`Agent: ${agentId}`);
console.log('');

// Paths
const courseDir = path.join(__dirname, '..', 'vfs', 'courses', courseCode);
const segmentsDir = path.join(courseDir, 'phase5_segments');
const segmentConfigPath = path.join(segmentsDir, `segment_${segmentId}.json`);
const segmentDir = path.join(segmentsDir, `segment_${segmentId}`);
const orchDir = path.join(segmentDir, `orch_${orchId}`);
const outputFile = path.join(orchDir, `agent_${agentId}_baskets.json`);

// Validate segment config exists
if (!fs.existsSync(segmentConfigPath)) {
  console.error(`❌ ERROR: Segment config not found: ${segmentConfigPath}`);
  process.exit(1);
}

// Read segment config
const segmentConfig = JSON.parse(fs.readFileSync(segmentConfigPath, 'utf8'));
const orchestratorBatch = segmentConfig.orchestrator_batches.find(
  batch => batch.orchestrator_id === parseInt(orchNum)
);

if (!orchestratorBatch) {
  console.error(`❌ ERROR: Orchestrator ${orchNum} not found in segment config`);
  process.exit(1);
}

const agentBatch = orchestratorBatch.agent_batches[parseInt(agentNum) - 1];

if (!agentBatch) {
  console.error(`❌ ERROR: Agent ${agentNum} not found in orchestrator ${orchNum} config`);
  process.exit(1);
}

console.log('AGENT CONFIGURATION:');
console.log('-'.repeat(60));
console.log(`LEGOs assigned: ${agentBatch.length}`);
console.log(`LEGO IDs: ${agentBatch.join(', ')}`);
console.log('');

// Check if orchestrator directory exists
if (!fs.existsSync(orchDir)) {
  console.log(`⚠️  Orchestrator directory does not exist: ${orchDir}`);
  console.log('Creating directory...');
  fs.mkdirSync(orchDir, { recursive: true });
  console.log('✓ Directory created');
  console.log('');
}

// Check if output file already exists
if (fs.existsSync(outputFile)) {
  console.log('⚠️  WARNING: Output file already exists!');
  console.log(`File: ${outputFile}`);
  console.log('');
  console.log('Delete it first if you want to regenerate:');
  console.log(`rm "${outputFile}"`);
  console.log('');
  process.exit(1);
}

console.log('='.repeat(60));
console.log('MANUAL SPAWN INSTRUCTIONS');
console.log('='.repeat(60));
console.log('');
console.log('This script does NOT automatically spawn agents in iTerm2.');
console.log('Follow these manual steps:');
console.log('');
console.log('1. Open iTerm2 and create a new window/tab');
console.log('');
console.log('2. Navigate to the project directory:');
console.log(`   cd "${path.join(__dirname, '..')}")`);
console.log('');
console.log('3. Start Claude Code and paste this prompt:');
console.log('');
console.log('-'.repeat(60));
console.log('You are a Phase 5 Basket Generation Agent.');
console.log('');
console.log('**Context:**');
console.log(`- Course: ${courseCode}`);
console.log(`- Segment: ${segmentId}`);
console.log(`- Orchestrator: ${orchId}`);
console.log(`- Agent: ${agentId}`);
console.log(`- LEGOs: ${agentBatch.length} total`);
console.log('');
console.log('**Task:**');
console.log('Generate baskets for these LEGO IDs:');
console.log(`${agentBatch.join(', ')}`);
console.log('');
console.log('**Output:**');
console.log(`Write to: ${outputFile}`);
console.log('');
console.log('**Return ONLY:**');
console.log(`"✅ Agent ${agentId} complete: {count} baskets written"`);
console.log('');
console.log('DO NOT return full JSON (exceeds token limits).');
console.log('-'.repeat(60));
console.log('');
console.log('4. Wait for completion message');
console.log('');
console.log('5. Verify output file exists:');
console.log(`   ls -lh "${outputFile}"`);
console.log('');
console.log('6. Run gap detection again:');
console.log(`   node scripts/phase5-detect-gaps.cjs ${courseCode} ${segmentNum}`);
console.log('');
