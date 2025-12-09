#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Phase 2: LEGO Reuse Tracking (with Embedded Detection)
 *
 * Part of Phase 2 (Conflict Resolution) - marks LEGO reuse across seeds.
 * Detects both exact duplicates and LEGOs embedded within recently seen LEGOs
 * (10-LEGO sliding window).
 *
 * Example: If "recordar una palabra" / "to remember a word" was introduced,
 * then "una palabra" / "a word" is marked new: false if it appears within
 * the next 10 LEGOs.
 *
 * Usage: node phase2_lego_reuse_tracking.cjs <course_path>
 * Example: node phase2_lego_reuse_tracking.cjs public/vfs/courses/spa_for_eng
 */

const coursePath = process.argv[2];

if (!coursePath) {
  console.error('❌ Error: Course path required');
  console.error('Usage: node phase2_lego_reuse_tracking.cjs <course_path>');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const fullCoursePath = path.resolve(projectRoot, coursePath);
const legoPairsPath = path.join(fullCoursePath, 'lego_pairs.json');

if (!fs.existsSync(fullCoursePath)) {
  console.error(`❌ Error: Course directory not found: ${fullCoursePath}`);
  process.exit(1);
}

if (!fs.existsSync(legoPairsPath)) {
  console.error(`❌ Error: lego_pairs.json not found: ${legoPairsPath}`);
  process.exit(1);
}

// Helper: normalize text for comparison (lowercase, remove punctuation)
const normalize = (text) => text.toLowerCase().replace(/[.,!?;:'"¿¡]/g, '').trim();

// Helper: check if phrase exists as substring within container (character-level)
const containsSubstring = (container, phrase) => {
  if (container === phrase) return false; // Must be proper subset
  return container.includes(phrase);
};

console.log('🔍 Phase 2: LEGO Reuse Tracking (with embedded detection)');
console.log(`📁 Course: ${coursePath}\n`);

let legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// Handle both formats: array of seeds OR {seeds: [...]}
const isArrayFormat = Array.isArray(legoPairs);
if (isArrayFormat) {
  console.log('📝 Detected array format, wrapping in {seeds: [...]}');
  legoPairs = { seeds: legoPairs };
}

// Track ALL seen LEGOs for exact duplicate detection
const seenLegos = new Map(); // key -> seedId (for ref)

// Track last 10 LEGOs for embedded detection (sliding window)
const recentLegos = []; // Array of {target, known} normalized
const EMBEDDED_WINDOW = 10;

let totalLegos = 0;
let exactDuplicates = 0;
let embeddedMatches = 0;

legoPairs.seeds.forEach((seed) => {
  const seedId = seed.seed_id;

  seed.legos.forEach((lego) => {
    totalLegos++;
    const target = lego.lego?.target || lego.target;
    const known = lego.lego?.known || lego.known;

    const normTarget = normalize(target);
    const normKnown = normalize(known);
    const key = `${normTarget}|${normKnown}`;

    // Check 1: Exact match against ALL seen LEGOs
    if (seenLegos.has(key)) {
      lego.new = false;
      lego.ref = seenLegos.get(key);
      exactDuplicates++;

      // Still add to recent window
      recentLegos.push({ target: normTarget, known: normKnown });
      if (recentLegos.length > EMBEDDED_WINDOW) recentLegos.shift();
      return;
    }

    // Check 2: Embedded in last 10 LEGOs only
    let isEmbedded = false;
    for (const recent of recentLegos) {
      if (containsSubstring(recent.target, normTarget) &&
          containsSubstring(recent.known, normKnown)) {
        isEmbedded = true;
        break;
      }
    }

    if (isEmbedded) {
      lego.new = false;
      delete lego.ref;
      embeddedMatches++;
    } else {
      // First occurrence - mark as debut
      lego.new = true;
      delete lego.ref;
    }

    // Add to both tracking structures
    seenLegos.set(key, seedId);
    recentLegos.push({ target: normTarget, known: normKnown });
    if (recentLegos.length > EMBEDDED_WINDOW) recentLegos.shift();
  });
});

// Write updated file (preserve original format)
const outputData = isArrayFormat ? legoPairs.seeds : legoPairs;
fs.writeFileSync(legoPairsPath, JSON.stringify(outputData, null, 2));

console.log(`📊 Summary:`);
console.log(`   Total seeds: ${legoPairs.seeds.length}`);
console.log(`   Total LEGOs: ${totalLegos}`);
console.log(`   Exact duplicates: ${exactDuplicates}`);
console.log(`   Embedded (within last 10): ${embeddedMatches}`);
console.log(`   Unique (new: true): ${seenLegos.size - embeddedMatches}`);
console.log(`\n✅ Deduplication complete! Updated: ${legoPairsPath}`);
