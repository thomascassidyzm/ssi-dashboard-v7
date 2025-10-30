#!/usr/bin/env node

/**
 * Phase 6: Prepare Segments for Introduction Generation
 *
 * Divides all LEGOs into 3 segments for segmented parallel processing
 * Each segment: 3 orchestrators × 10 sub-agents = 30 concurrent agents
 *
 * Usage: node scripts/phase6-prepare-segments.cjs <course_code>
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2];

if (!courseCode) {
  console.error('Usage: node scripts/phase6-prepare-segments.cjs <course_code>');
  process.exit(1);
}

console.log('🔧 Phase 6: Preparing Segments for Introduction Generation\n');
console.log(`Course: ${courseCode}`);
console.log('Strategy: 3 segments × 3 orchestrators × 10 agents\n');

// Paths
const courseDir = path.join(__dirname, '..', 'vfs', 'courses', courseCode);
const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
const segmentsDir = path.join(courseDir, 'phase6_segments');

// Read lego_pairs.json
if (!fs.existsSync(legoPairsPath)) {
  console.error(`❌ ERROR: ${legoPairsPath} not found`);
  console.error('Run Phase 3 (lego extraction) first');
  process.exit(1);
}

const legoPairsData = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// Extract all LEGO IDs
const allLegoIds = [];
for (const seed of legoPairsData.seeds) {
  const [_, __, legos] = seed;
  for (const lego of legos) {
    allLegoIds.push(lego[0]); // LEGO ID
  }
}

const totalLegos = allLegoIds.length;
console.log(`Total LEGOs: ${totalLegos}`);

// Divide into 3 segments
const segmentSize1 = Math.ceil(totalLegos / 3);
const segmentSize2 = Math.ceil((totalLegos - segmentSize1) / 2);
const segmentSize3 = totalLegos - segmentSize1 - segmentSize2;

const segments = [
  { number: 1, start: 0, end: segmentSize1, size: segmentSize1 },
  { number: 2, start: segmentSize1, end: segmentSize1 + segmentSize2, size: segmentSize2 },
  { number: 3, start: segmentSize1 + segmentSize2, end: totalLegos, size: segmentSize3 }
];

console.log('\nSegment breakdown:');
segments.forEach(seg => {
  console.log(`  Segment ${seg.number}: LEGOs ${seg.start + 1}-${seg.end} (${seg.size} intros)`);
});

// Create segments directory
if (!fs.existsSync(segmentsDir)) {
  fs.mkdirSync(segmentsDir, { recursive: true });
}

// Create each segment file
segments.forEach(segment => {
  const segmentLegoIds = allLegoIds.slice(segment.start, segment.end);
  const orchestratorCount = 3;
  const agentsPerOrch = 10;

  // Divide segment LEGOs into 3 orchestrator batches
  const legosPerOrch = Math.ceil(segmentLegoIds.length / orchestratorCount);
  const orchestratorBatches = [];

  for (let o = 0; o < orchestratorCount; o++) {
    const orchStart = o * legosPerOrch;
    const orchEnd = Math.min((o + 1) * legosPerOrch, segmentLegoIds.length);
    const orchLegoIds = segmentLegoIds.slice(orchStart, orchEnd);

    // Divide orchestrator batch into 10 agent batches
    const legosPerAgent = Math.ceil(orchLegoIds.length / agentsPerOrch);
    const agentBatches = [];

    for (let a = 0; a < agentsPerOrch; a++) {
      const agentStart = a * legosPerAgent;
      const agentEnd = Math.min((a + 1) * legosPerAgent, orchLegoIds.length);
      const agentLegoIds = orchLegoIds.slice(agentStart, agentEnd);
      agentBatches.push(agentLegoIds);
    }

    orchestratorBatches.push({
      orchestrator_id: o + 1,
      total_legos: orchLegoIds.length,
      lego_ids: orchLegoIds,
      agent_batches: agentBatches
    });
  }

  const segmentFile = {
    segment_number: segment.number,
    total_legos: segmentLegoIds.length,
    orchestrator_count: orchestratorCount,
    agents_per_orchestrator: agentsPerOrch,
    orchestrator_batches: orchestratorBatches
  };

  const segmentPath = path.join(segmentsDir, `segment_${String(segment.number).padStart(2, '0')}.json`);
  fs.writeFileSync(segmentPath, JSON.stringify(segmentFile, null, 2));
  console.log(`✓ Created ${path.basename(segmentPath)}: ${segment.size} LEGOs`);

  // Create segment directory structure
  const segmentDir = path.join(segmentsDir, `segment_${String(segment.number).padStart(2, '0')}`);
  if (!fs.existsSync(segmentDir)) {
    fs.mkdirSync(segmentDir, { recursive: true });
  }

  // Create orchestrator subdirectories
  for (let o = 1; o <= orchestratorCount; o++) {
    const orchDir = path.join(segmentDir, `orch_${String(o).padStart(2, '0')}`);
    if (!fs.existsSync(orchDir)) {
      fs.mkdirSync(orchDir, { recursive: true });
    }
  }
});

console.log('\n============================================================');
console.log('SEGMENT PREPARATION COMPLETE');
console.log('============================================================\n');

console.log('Segments: 3');
console.log('Orchestrators per segment: 3');
console.log('Agents per orchestrator: 10');
console.log('Total concurrent agents: 30 per segment\n');

console.log('Next step: Master orchestrator runs Segment 1');
console.log('  Each orchestrator spawns 10 agents');
console.log('  Each agent generates ~95 introductions');
console.log('  Output: segment_01/orch_NN/agent_XX_intros.json');
