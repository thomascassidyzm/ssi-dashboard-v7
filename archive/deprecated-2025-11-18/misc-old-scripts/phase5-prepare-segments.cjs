#!/usr/bin/env node

/**
 * Phase 5: Prepare Segments for Basket Generation
 *
 * Divides 1,766 unique LEGOs into 3 segments for segmented parallel processing
 * Each segment: 3 orchestrators × 10 sub-agents = 30 concurrent agents
 *
 * Usage: node scripts/phase5-prepare-segments.cjs <course_code>
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2];

if (!courseCode) {
  console.error('Usage: node scripts/phase5-prepare-segments.cjs <course_code>');
  process.exit(1);
}

console.log('🔧 Phase 5: Preparing Segments for Basket Generation\n');
console.log(`Course: ${courseCode}`);
console.log('Strategy: 3 segments × 3 orchestrators × 10 agents\n');

// Paths
const courseDir = path.join(__dirname, '..', 'vfs', 'courses', courseCode);
const batchDir = path.join(courseDir, 'orchestrator_batches', 'phase5');
const canonicalOrderPath = path.join(batchDir, 'canonical_order.json');
const segmentsDir = path.join(courseDir, 'phase5_segments');

// Read canonical order
if (!fs.existsSync(canonicalOrderPath)) {
  console.error(`❌ ERROR: ${canonicalOrderPath} not found`);
  console.error('Run phase4-prepare-batches.cjs first');
  process.exit(1);
}

const canonicalOrderData = JSON.parse(fs.readFileSync(canonicalOrderPath, 'utf8'));
const canonicalOrder = canonicalOrderData.canonical_order;
const totalLegos = canonicalOrder.length;

console.log(`Total unique LEGOs: ${totalLegos}`);

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
  console.log(`  Segment ${seg.number}: LEGOs ${seg.start + 1}-${seg.end} (${seg.size} baskets)`);
});

// Create segments directory
if (!fs.existsSync(segmentsDir)) {
  fs.mkdirSync(segmentsDir, { recursive: true });
}

// Create each segment file
segments.forEach(segment => {
  const segmentLegos = canonicalOrder.slice(segment.start, segment.end);
  const orchestratorCount = 3;
  const agentsPerOrch = 10;

  // Divide segment LEGOs into 3 orchestrator batches
  const legosPerOrch = Math.ceil(segmentLegos.length / orchestratorCount);
  const orchestratorBatches = [];

  for (let o = 0; o < orchestratorCount; o++) {
    const orchStart = o * legosPerOrch;
    const orchEnd = Math.min((o + 1) * legosPerOrch, segmentLegos.length);
    const orchLegos = segmentLegos.slice(orchStart, orchEnd);

    // Divide orchestrator batch into 10 agent batches
    const legosPerAgent = Math.ceil(orchLegos.length / agentsPerOrch);
    const agentBatches = [];

    for (let a = 0; a < agentsPerOrch; a++) {
      const agentStart = a * legosPerAgent;
      const agentEnd = Math.min((a + 1) * legosPerAgent, orchLegos.length);
      const agentLegos = orchLegos.slice(agentStart, agentEnd);
      agentBatches.push(agentLegos);
    }

    orchestratorBatches.push({
      orchestrator_id: o + 1,
      total_legos: orchLegos.length,
      lego_ids: orchLegos,
      agent_batches: agentBatches
    });
  }

  const segmentFile = {
    segment_number: segment.number,
    total_legos: segmentLegos.length,
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
console.log('  Each agent generates ~20 baskets');
console.log('  Output: segment_01/orch_NN/agent_XX_baskets.json');
