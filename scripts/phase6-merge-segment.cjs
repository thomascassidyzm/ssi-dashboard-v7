#!/usr/bin/env node

/**
 * Phase 6: Merge Segment Agent Files
 *
 * Merges all agent intro files (30 files: 3 orchestrators × 10 agents)
 * into a single segment introductions.json file
 *
 * Usage: node scripts/phase6-merge-segment.cjs <course_code> <segment_number>
 *
 * Output: vfs/courses/<course>/phase6_segments/segment_0X/introductions.json
 *
 * Idempotent: Running multiple times produces identical output
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2];
const segmentNum = process.argv[3];

if (!courseCode || !segmentNum) {
  console.error('Usage: node scripts/phase6-merge-segment.cjs <course_code> <segment_number>');
  console.error('');
  console.error('Example: node scripts/phase6-merge-segment.cjs spa_for_eng 1');
  process.exit(1);
}

const segmentId = String(segmentNum).padStart(2, '0');

console.log('🔗 Phase 6: Merge Segment Agent Files');
console.log('='.repeat(60));
console.log(`Course: ${courseCode}`);
console.log(`Segment: ${segmentId}`);
console.log('');

// Paths
const courseDir = path.join(__dirname, '..', 'vfs', 'courses', courseCode);
const segmentsDir = path.join(courseDir, 'phase6_segments');
const segmentConfigPath = path.join(segmentsDir, `segment_${segmentId}.json`);
const segmentDir = path.join(segmentsDir, `segment_${segmentId}`);

// Validate segment config exists
if (!fs.existsSync(segmentConfigPath)) {
  console.error(`❌ ERROR: Segment config not found: ${segmentConfigPath}`);
  process.exit(1);
}

// Read segment config
const segmentConfig = JSON.parse(fs.readFileSync(segmentConfigPath, 'utf8'));
const orchestratorCount = segmentConfig.orchestrator_count || 3;
const agentsPerOrch = segmentConfig.agents_per_orchestrator || 10;
const expectedFiles = orchestratorCount * agentsPerOrch;

console.log(`Expected: ${orchestratorCount} orchestrators × ${agentsPerOrch} agents = ${expectedFiles} files`);
console.log('');

// Find all agent files
const agentFiles = [];
const missingFiles = [];

for (let orch = 1; orch <= orchestratorCount; orch++) {
  const orchId = String(orch).padStart(2, '0');
  const orchDir = path.join(segmentDir, `orch_${orchId}`);

  for (let agent = 1; agent <= agentsPerOrch; agent++) {
    const agentId = String(agent).padStart(2, '0');
    const agentFile = path.join(orchDir, `agent_${agentId}_intros.json`);
    const relativePath = `orch_${orchId}/agent_${agentId}_intros.json`;

    if (fs.existsSync(agentFile)) {
      agentFiles.push({ path: agentFile, name: relativePath });
    } else {
      missingFiles.push(relativePath);
    }
  }
}

console.log(`Found: ${agentFiles.length}/${expectedFiles} agent files`);

if (missingFiles.length > 0) {
  console.error('');
  console.error(`❌ ERROR: ${missingFiles.length} agent files missing:`);
  missingFiles.forEach(file => {
    console.error(`   - ${file}`);
  });
  console.error('');
  console.error('Run gap detection to identify all missing files:');
  console.error(`node scripts/phase6-detect-gaps.cjs ${courseCode} ${segmentNum}`);
  process.exit(1);
}

console.log('');

// Merge all agent outputs
const merged = {};
let totalIntros = 0;
const legosSeen = new Set();

console.log('Reading agent files:');
for (const { path: agentFile, name: fileName } of agentFiles) {
  const agentData = JSON.parse(fs.readFileSync(agentFile, 'utf8'));
  const introCount = Object.keys(agentData).length;

  // Track unique LEGOs
  Object.keys(agentData).forEach(legoId => legosSeen.add(legoId));

  console.log(`  ✓ ${fileName}: ${introCount} intros`);

  Object.assign(merged, agentData);
  totalIntros += introCount;
}

console.log('');
console.log('='.repeat(60));
console.log('MERGE STATISTICS');
console.log('='.repeat(60));
console.log(`Total intros read: ${totalIntros}`);
console.log(`Unique LEGO IDs: ${Object.keys(merged).length}`);
console.log(`LEGOs seen across agents: ${legosSeen.size}`);

// Check for duplicates
if (totalIntros !== Object.keys(merged).length) {
  const duplicateCount = totalIntros - Object.keys(merged).length;
  console.log(`⚠️  WARNING: ${duplicateCount} duplicate LEGO IDs (last occurrence kept)`);
}

console.log('');

// Write segment introductions file
const outputFile = path.join(segmentDir, 'introductions.json');
fs.writeFileSync(outputFile, JSON.stringify(merged, null, 2));

console.log('='.repeat(60));
console.log('SEGMENT MERGE COMPLETE');
console.log('='.repeat(60));
console.log(`Output: ${outputFile}`);
console.log(`Total introductions: ${Object.keys(merged).length}`);
console.log('');
console.log(`✅ Segment ${segmentId} merged successfully!`);
console.log('');
