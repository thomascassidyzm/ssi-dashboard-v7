#!/usr/bin/env node

/**
 * Automatic Upchunking Algorithm for Collision Resolution
 *
 * Mechanical boundary expansion - no AI needed!
 *
 * Algorithm:
 * 1. Detect collision on KNOWN field (same known → different targets)
 * 2. Use FCFS: Keep first LEGO unchanged, upchunk subsequent ones
 * 3. For each subsequent collision:
 *    a. Find KNOWN phrase position in source English sentence
 *    b. Find TARGET phrase position in source target-language sentence
 *    c. Expand boundaries (prepend/append adjacent words) until unique
 *    d. Update both KNOWN and TARGET to match expanded boundaries
 * 4. Repeat until all collisions resolved
 *
 * Example:
 * Collision: "you are correct"
 * - LEGO1 (S0042): "you are correct" → "你是对的" [KEEP - FCFS winner]
 * - LEGO2 (S0087): "you are correct" → "你们是对的" [UPCHUNK]
 *
 * S0087 sentence: "I think | you are correct | about that"
 * Upchunk S0087L12:
 *   Option A (prepend): "I think you are correct" → "我觉得你们是对的"
 *   Option B (append): "you are correct about that" → "你们是对的关于那个"
 *
 * USAGE:
 * node auto-upchunk-collisions.cjs <course_code>
 *
 * INPUTS:
 * - lego_pairs_fd_report.json (collision list with FCFS decisions)
 * - lego_pairs.json (current LEGOs)
 * - seed_pairs.json (source sentences for boundary expansion)
 *
 * OUTPUTS:
 * - lego_pairs.json (modified - subsequent LEGOs upchunked)
 * - upchunking_report.json (what was changed and how)
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2];

if (!courseCode) {
  console.error('❌ Error: Course code required');
  console.error('Usage: node auto-upchunk-collisions.cjs <course_code>');
  console.error('Example: node auto-upchunk-collisions.cjs spa_for_eng');
  process.exit(1);
}

const VFS_ROOT = path.join(__dirname, '../../public/vfs/courses');
const coursePath = path.join(VFS_ROOT, courseCode);

const fdReportPath = path.join(coursePath, 'lego_pairs_fd_report.json');
const legoPairsPath = path.join(coursePath, 'lego_pairs.json');
const seedPairsPath = path.join(coursePath, 'seed_pairs.json');

// Validate inputs
if (!fs.existsSync(fdReportPath)) {
  console.error(`❌ Error: FD report not found: ${fdReportPath}`);
  console.error('   Run check-lego-fd-violations.cjs first.');
  process.exit(1);
}

if (!fs.existsSync(legoPairsPath)) {
  console.error(`❌ Error: lego_pairs.json not found`);
  process.exit(1);
}

if (!fs.existsSync(seedPairsPath)) {
  console.error(`❌ Error: seed_pairs.json not found`);
  process.exit(1);
}

console.log('🔧 Automatic Upchunking for Collision Resolution\n');
console.log(`   Course: ${courseCode}\n`);

// Load data
const fdReport = JSON.parse(fs.readFileSync(fdReportPath, 'utf8'));
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));
const seedPairs = JSON.parse(fs.readFileSync(seedPairsPath, 'utf8'));

// Create seed lookup map
const seedMap = new Map();
if (seedPairs.translations) {
  // Format: { translations: { "S0001": [known, target], ... } }
  Object.entries(seedPairs.translations).forEach(([seedId, [known, target]]) => {
    seedMap.set(seedId, { seed_id: seedId, known, target });
  });
}

// Helper: Find phrase position in sentence (word-based tokenization)
function findPhrasePosition(sentence, phrase) {
  const sentenceWords = sentence.toLowerCase().split(/\s+/);
  const phraseWords = phrase.toLowerCase().split(/\s+/);

  for (let i = 0; i <= sentenceWords.length - phraseWords.length; i++) {
    const match = phraseWords.every((word, j) => sentenceWords[i + j] === word);
    if (match) {
      return { startWordIndex: i, endWordIndex: i + phraseWords.length };
    }
  }

  return null; // Not found
}

// Helper: Expand boundaries by adding adjacent words
function expandBoundaries(sentence, currentPhrase, direction = 'both', steps = 1) {
  const words = sentence.split(/\s+/);
  const position = findPhrasePosition(sentence, currentPhrase);

  if (!position) {
    return null; // Can't find phrase in sentence
  }

  let { startWordIndex, endWordIndex } = position;

  // Expand based on direction
  if (direction === 'prepend' || direction === 'both') {
    startWordIndex = Math.max(0, startWordIndex - steps);
  }

  if (direction === 'append' || direction === 'both') {
    endWordIndex = Math.min(words.length, endWordIndex + steps);
  }

  return words.slice(startWordIndex, endWordIndex).join(' ');
}

// Track upchunking changes
const upchunkingChanges = [];
let totalUpchunked = 0;

// Process each collision
fdReport.violations.forEach(violation => {
  const collisionKey = violation.known;

  // Get all LEGO IDs involved
  const allLegos = [];
  violation.mappings.forEach(mapping => {
    mapping.legos.forEach(lego => {
      allLegos.push({
        lego_id: lego.lego_id,
        seed_id: lego.seed_id,
        target: mapping.target,
        known: collisionKey
      });
    });
  });

  // FCFS: First is kept, rest are upchunked
  const firstLego = allLegos[0];
  const subsequentLegos = allLegos.slice(1);

  console.log(`\n📝 Collision: "${collisionKey}"`);
  console.log(`   KEEP (FCFS): ${firstLego.lego_id} "${firstLego.target}"`);
  console.log(`   UPCHUNK (${subsequentLegos.length}): ${subsequentLegos.map(l => l.lego_id).join(', ')}\n`);

  // Upchunk each subsequent LEGO
  subsequentLegos.forEach(lego => {
    const seed = seedMap.get(lego.seed_id);

    if (!seed) {
      console.log(`   ⚠️  ${lego.lego_id}: Seed not found, skipping`);
      return;
    }

    const englishSentence = seed.known;
    const targetSentence = seed.target;

    // Try expanding boundaries progressively
    let upchunkedKnown = null;
    let upchunkedTarget = null;
    let expansionSteps = 1;
    let direction = 'prepend'; // Try prepend first, then append, then both

    while (!upchunkedKnown && expansionSteps <= 5) {
      const expandedKnown = expandBoundaries(englishSentence, lego.known, direction, expansionSteps);

      if (expandedKnown && expandedKnown !== lego.known) {
        // Check if this makes it unique
        const wouldCollide = allLegos.some(otherLego =>
          otherLego.lego_id !== lego.lego_id &&
          otherLego.known.toLowerCase() === expandedKnown.toLowerCase()
        );

        if (!wouldCollide) {
          upchunkedKnown = expandedKnown;

          // Now expand target phrase to match
          const knownPosition = findPhrasePosition(englishSentence, lego.known);
          const targetPosition = findPhrasePosition(targetSentence, lego.target);

          if (knownPosition && targetPosition) {
            const targetWords = targetSentence.split(/\s+/);
            const expandedTargetStart = Math.max(0, targetPosition.startWordIndex - (direction === 'prepend' || direction === 'both' ? expansionSteps : 0));
            const expandedTargetEnd = Math.min(targetWords.length, targetPosition.endWordIndex + (direction === 'append' || direction === 'both' ? expansionSteps : 0));

            upchunkedTarget = targetWords.slice(expandedTargetStart, expandedTargetEnd).join(' ');
          }
        }
      }

      // Try different expansion strategies
      if (!upchunkedKnown) {
        if (direction === 'prepend') {
          direction = 'append';
        } else if (direction === 'append') {
          direction = 'both';
        } else {
          direction = 'prepend';
          expansionSteps++;
        }
      }
    }

    if (upchunkedKnown && upchunkedTarget) {
      // Find and update the LEGO in lego_pairs
      const seedData = legoPairs.seeds.find(s => s.seed_id === lego.seed_id);
      if (seedData && seedData.legos) {
        const legoData = seedData.legos.find(l => l.id === lego.lego_id);
        if (legoData) {
          upchunkingChanges.push({
            lego_id: lego.lego_id,
            seed_id: lego.seed_id,
            collision_key: collisionKey,
            before: {
              known: legoData.known,
              target: legoData.target
            },
            after: {
              known: upchunkedKnown,
              target: upchunkedTarget
            },
            expansion: { direction, steps: expansionSteps }
          });

          // Apply the change
          legoData.known = upchunkedKnown;
          legoData.target = upchunkedTarget;

          console.log(`   ✅ ${lego.lego_id}: "${legoData.known}" → "${legoData.target}"`);
          totalUpchunked++;
        }
      }
    } else {
      console.log(`   ❌ ${lego.lego_id}: Could not find unique expansion`);
    }
  });
});

// Save updated lego_pairs
fs.writeFileSync(legoPairsPath, JSON.stringify(legoPairs, null, 2));

// Save upchunking report
const report = {
  timestamp: new Date().toISOString(),
  course_code: courseCode,
  collision_count: fdReport.violation_count,
  total_upchunked: totalUpchunked,
  changes: upchunkingChanges
};

const reportPath = path.join(coursePath, 'upchunking_report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`\n\n📊 SUMMARY:`);
console.log(`   Collisions detected: ${fdReport.violation_count}`);
console.log(`   LEGOs upchunked: ${totalUpchunked}`);
console.log(`   Updated lego_pairs.json`);
console.log(`   Report saved: ${reportPath}\n`);

console.log('✅ Automatic upchunking complete!');
console.log('   Next steps:');
console.log('   1. Run deduplication (Phase 3.5)');
console.log('   2. Re-validate collisions (should be 0 now)');
console.log('   3. Generate baskets for upchunked LEGOs (Phase 5)\n');
