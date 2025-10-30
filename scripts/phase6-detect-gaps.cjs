#!/usr/bin/env node

/**
 * Phase 6: Detect Gaps in Agent Output Files
 *
 * Detects missing agent output files in a segment
 *
 * Usage: node scripts/phase6-detect-gaps.cjs <course> <segment>
 *
 * Expected: 3 orchestrators × 10 agents = 30 agent files
 *
 * Exit codes:
 *   0 - All files present
 *   1 - Gaps found or validation error
 */

const fs = require('fs');
const path = require('path');

// Parse arguments
const courseCode = process.argv[2];
const segmentNum = process.argv[3];

if (!courseCode || !segmentNum) {
  console.error('Usage: node scripts/phase6-detect-gaps.cjs <course> <segment>');
  console.error('');
  console.error('Example: node scripts/phase6-detect-gaps.cjs spa_for_eng 1');
  process.exit(1);
}

const segmentId = String(segmentNum).padStart(2, '0');

console.log('🔍 Phase 6: Gap Detection');
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

console.log(`Expected: ${orchestratorCount} orchestrators × ${agentsPerOrch} agents = ${orchestratorCount * agentsPerOrch} files`);
console.log('');

// Check for missing files
const missing = [];
const found = [];

for (let orch = 1; orch <= orchestratorCount; orch++) {
  const orchId = String(orch).padStart(2, '0');
  const orchDir = path.join(segmentDir, `orch_${orchId}`);

  console.log(`Checking orch_${orchId}/:`);

  if (!fs.existsSync(orchDir)) {
    console.log(`  ⚠️  Directory not found: orch_${orchId}/`);
    for (let agent = 1; agent <= agentsPerOrch; agent++) {
      const agentId = String(agent).padStart(2, '0');
      missing.push(`orch_${orchId}/agent_${agentId}_intros.json`);
    }
    continue;
  }

  for (let agent = 1; agent <= agentsPerOrch; agent++) {
    const agentId = String(agent).padStart(2, '0');
    const agentFile = path.join(orchDir, `agent_${agentId}_intros.json`);
    const relativePath = `orch_${orchId}/agent_${agentId}_intros.json`;

    if (fs.existsSync(agentFile)) {
      found.push(relativePath);
      console.log(`  ✓ agent_${agentId}_intros.json`);
    } else {
      missing.push(relativePath);
      console.log(`  ✗ agent_${agentId}_intros.json [MISSING]`);
    }
  }
  console.log('');
}

// Summary
console.log('='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`Found: ${found.length}/${orchestratorCount * agentsPerOrch}`);
console.log(`Missing: ${missing.length}/${orchestratorCount * agentsPerOrch}`);
console.log('');

if (missing.length > 0) {
  console.log('❌ MISSING FILES:');
  missing.forEach(file => {
    console.log(`   - ${file}`);
  });
  console.log('');
  console.log('To regenerate missing agents, use orchestrator to spawn them.');
  console.log('');
  process.exit(1);
} else {
  console.log('✅ All agent files present!');
  console.log('');
  console.log('Ready to merge. Run:');
  console.log(`node scripts/phase6-merge-segment.cjs ${courseCode} ${segmentNum}`);
  console.log('');
  process.exit(0);
}
