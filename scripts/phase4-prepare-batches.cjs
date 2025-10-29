#!/usr/bin/env node
/**
 * Phase 5: Prepare Batches with Smart Deduplication
 *
 * Strategy:
 * 1. Identify duplicate LEGOs (same target + known, ignoring case/punctuation)
 * 2. Mark only FIRST occurrence for basket generation
 * 3. Keep ALL LEGOs (including duplicates) in vocabulary context
 * 4. Map duplicates to their canonical (first occurrence) ID
 *
 * Result: Generate 1,808 baskets instead of 2,838 (36% time savings)
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2] || 'spa_for_eng';
const parallelism = parseInt(process.argv[3]) || 8;

const courseDir = path.join(__dirname, '../vfs/courses', courseCode);
const legoFile = path.join(courseDir, 'lego_pairs.json');
const seedFile = path.join(courseDir, 'seed_pairs.json');

console.log('🔧 Phase 5: Preparing Batches with Smart Deduplication\n');
console.log(`Course: ${courseCode}`);
console.log(`Parallelism: ${parallelism} agents\n`);

// Read data
const legoPairs = JSON.parse(fs.readFileSync(legoFile, 'utf8'));
const seedPairs = JSON.parse(fs.readFileSync(seedFile, 'utf8'));

// Extract all LEGOs with positions
const allLegos = [];
let position = 0;

for (const seed of legoPairs.seeds) {
  const [seedId, [seedTarget, seedKnown], legos] = seed;

  for (let i = 0; i < legos.length; i++) {
    const lego = legos[i];
    const [legoId, type, target, known, components] = lego;

    position++;

    allLegos.push({
      id: legoId,
      position,
      seedId,
      positionInSeed: i + 1,
      totalInSeed: legos.length,
      type,
      target,
      known,
      isLast: i === legos.length - 1,
      components
    });
  }
}

console.log(`Total LEGOs extracted: ${allLegos.length}`);

// Normalize for deduplication
function normalize(text) {
  return text.trim().toLowerCase().replace(/[.,;]+$/, '');
}

// Group by normalized target + known
const legoGroups = new Map();

for (const lego of allLegos) {
  const normalizedTarget = normalize(lego.target);
  const normalizedKnown = normalize(lego.known);
  const key = `${normalizedTarget}|||${normalizedKnown}`;

  if (!legoGroups.has(key)) {
    legoGroups.set(key, []);
  }

  legoGroups.get(key).push(lego);
}

// Mark first occurrences and build duplicate map
const legosToGenerate = []; // First occurrences only
const duplicateMap = new Map(); // Maps duplicate ID → canonical ID

for (const [key, group] of legoGroups.entries()) {
  // First occurrence is canonical
  const canonical = group[0];
  legosToGenerate.push(canonical);

  // Map all duplicates to canonical
  for (let i = 1; i < group.length; i++) {
    const duplicate = group[i];
    duplicateMap.set(duplicate.id, canonical.id);
  }
}

console.log(`Unique LEGOs (first occurrences): ${legosToGenerate.length}`);
console.log(`Duplicate LEGOs (skip generation): ${duplicateMap.size}`);
console.log(`Time savings: ${((duplicateMap.size / allLegos.length) * 100).toFixed(1)}%\n`);

// Build vocabulary context (ALL LEGOs for recency bias)
const vocabularyContext = allLegos.map(lego => ({
  id: lego.id,
  position: lego.position,
  target: lego.target,
  known: lego.known,
  type: lego.type,
  seedId: lego.seedId,
  canonical_id: duplicateMap.get(lego.id) || lego.id // Points to canonical if duplicate
}));

// Calculate seed context for recency bias
function getSeedNumber(seedId) {
  return parseInt(seedId.substring(1)); // "S0100" → 100
}

function getRecentWindow(currentPosition, allLegosList, windowSize = 10) {
  // Get current seed number
  const currentLego = allLegosList.find(l => l.position === currentPosition);
  if (!currentLego) return [];

  const currentSeedNum = getSeedNumber(currentLego.seedId);
  const startSeedNum = Math.max(1, currentSeedNum - windowSize);

  // Get all LEGOs from recent seeds
  return allLegosList
    .filter(l => {
      const seedNum = getSeedNumber(l.seedId);
      return seedNum >= startSeedNum && seedNum < currentSeedNum;
    })
    .map(l => l.id);
}

// Prepare batch data
const batchSize = Math.ceil(legosToGenerate.length / parallelism);
const batches = [];

console.log(`Batch size: ~${batchSize} LEGOs per agent\n`);

for (let i = 0; i < legosToGenerate.length; i += batchSize) {
  const batchLegos = legosToGenerate.slice(i, i + batchSize);

  const batch = {
    batch_number: batches.length + 1,
    course_code: courseCode,
    legos_to_generate: batchLegos.map(lego => ({
      lego_id: lego.id,
      position: lego.position,
      target: lego.target,
      known: lego.known,
      type: lego.type,
      seed_id: lego.seedId,
      is_culminating: lego.isLast,

      // Seed context (for culminating LEGO validation)
      seed_sentence: legoPairs.seeds
        .find(s => s[0] === lego.seedId)?.[1] || null,

      // Available vocabulary (all prior LEGOs, including duplicates)
      available_vocab: vocabularyContext
        .filter(v => v.position < lego.position)
        .map(v => v.id),

      // Recent window (for recency bias)
      recent_window: getRecentWindow(lego.position, allLegos)
    })),

    // Full vocabulary context (shared by all LEGOs in this batch)
    vocabulary_context: vocabularyContext,

    // Duplicate map (for reference resolution)
    duplicate_map: Object.fromEntries(duplicateMap)
  };

  batches.push(batch);

  // Write batch file
  const batchDir = path.join(courseDir, 'batches');
  if (!fs.existsSync(batchDir)) {
    fs.mkdirSync(batchDir, { recursive: true });
  }

  const batchFile = path.join(
    batchDir,
    `batch_${String(batch.batch_number).padStart(2, '0')}.json`
  );

  fs.writeFileSync(batchFile, JSON.stringify(batch, null, 2));
  console.log(`✓ Created ${path.basename(batchFile)}: ${batchLegos.length} LEGOs`);
}

// Write batch manifest
const manifest = {
  course_code: courseCode,
  total_legos: allLegos.length,
  unique_legos: legosToGenerate.length,
  duplicate_legos: duplicateMap.size,
  deduplication_savings_pct: ((duplicateMap.size / allLegos.length) * 100).toFixed(1),
  parallelism,
  batch_count: batches.length,
  batch_size: batchSize,
  batches: batches.map(b => ({
    batch_number: b.batch_number,
    lego_count: b.legos_to_generate.length,
    file: `batch_${String(b.batch_number).padStart(2, '0')}.json`
  })),
  estimated_time: {
    per_batch_minutes: Math.ceil(batchSize * 30 / 60),
    total_minutes: Math.ceil(batchSize * 30 / 60),
    note: 'Batches run in parallel'
  }
};

const manifestFile = path.join(courseDir, 'batches', 'manifest.json');
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));

console.log(`\n✓ Created manifest.json`);
console.log(`\n${'='.repeat(60)}`);
console.log('BATCH PREPARATION COMPLETE');
console.log('='.repeat(60));
console.log(`\nBatches: ${batches.length}`);
console.log(`LEGOs per batch: ~${batchSize}`);
console.log(`Total baskets to generate: ${legosToGenerate.length} (saved ${duplicateMap.size})`);
console.log(`Estimated time: ~${manifest.estimated_time.total_minutes} minutes (${parallelism} agents in parallel)`);
console.log(`\nNext step: Run parallel generation`);
console.log(`  node phase5_generate_parallel.cjs ${courseCode} ${parallelism}\n`);
