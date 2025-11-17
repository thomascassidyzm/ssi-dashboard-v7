#!/usr/bin/env node

/**
 * Phase 5 LUT Validator - Learner Uncertainty Test
 *
 * Core Question: Could the learner be uncertain about what to say?
 *
 * LUT Violation = Multiple target language options for the same known language prompt
 *
 * Example violation:
 *   Known: "I want"
 *   Could be: "我想" (wǒ xiǎng) OR "我要" (wǒ yào)
 *   → Learner uncertain which to use!
 *
 * How we detect:
 * 1. For each practice phrase's known language part
 * 2. Check if there are multiple different target language versions in the course
 * 3. If yes → LUT violation (learner uncertainty)
 *
 * Usage: node scripts/phase5_lut_validator.cjs <course_code>
 * Example: node scripts/phase5_lut_validator.cjs cmn_for_eng
 */

const fs = require('fs');
const path = require('path');

// Parse arguments
const courseCode = process.argv[2];
if (!courseCode) {
  console.error('Usage: node phase5_lut_validator.cjs <course_code>');
  console.error('Example: node scripts/phase5_lut_validator.cjs cmn_for_eng');
  process.exit(1);
}

const coursePath = path.join(__dirname, '..', 'public', 'vfs', 'courses', courseCode);
const legoPairsPath = path.join(coursePath, 'lego_pairs.json');
const phase5OutputsDir = path.join(coursePath, 'phase5_outputs');

// Validate paths
if (!fs.existsSync(legoPairsPath)) {
  console.error(`❌ lego_pairs.json not found: ${legoPairsPath}`);
  process.exit(1);
}

if (!fs.existsSync(phase5OutputsDir)) {
  console.error(`❌ phase5_outputs directory not found: ${phase5OutputsDir}`);
  process.exit(1);
}

console.log('🔍 LUT Validator - Learner Uncertainty Test');
console.log(`📁 Course: ${courseCode}\n`);

// ============================================================================
// BUILD KNOWN → TARGET MAPPING
// ============================================================================

// Map: known phrase (normalized) → Set of target phrases
const knownToTargetMap = new Map();

function normalizeKnown(text) {
  // Normalize known language: lowercase, trim, collapse whitespace
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

// First, build the map from lego_pairs.json (the "correct" mappings)
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

legoPairs.seeds.forEach(seed => {
  seed.legos.forEach(lego => {
    const known = normalizeKnown(lego.known);
    const target = lego.target.trim();

    if (!knownToTargetMap.has(known)) {
      knownToTargetMap.set(known, new Set());
    }
    knownToTargetMap.get(known).add(target);
  });
});

console.log(`✅ Built known→target map from lego_pairs.json`);
console.log(`   ${knownToTargetMap.size} unique known phrases`);

// Count how many have multiple targets (potential ambiguity from course design)
let ambiguousFromCourse = 0;
knownToTargetMap.forEach((targets, known) => {
  if (targets.size > 1) {
    ambiguousFromCourse++;
  }
});

console.log(`   ${ambiguousFromCourse} known phrases have multiple valid targets (course design)`);
console.log();

// ============================================================================
// VALIDATE BASKETS FOR LUT VIOLATIONS
// ============================================================================

const basketFiles = fs.readdirSync(phase5OutputsDir)
  .filter(f => f.match(/^seed_S\d{4}_baskets\.json$/))
  .sort();

console.log(`📦 Checking ${basketFiles.length} basket files\n`);

let totalPhrases = 0;
let totalLUTViolations = 0;
const violationsBySeed = {};

basketFiles.forEach(filename => {
  const seedMatch = filename.match(/seed_S(\d{4})_baskets\.json/);
  if (!seedMatch) return;

  const seedNum = parseInt(seedMatch[1]);
  const basketPath = path.join(phase5OutputsDir, filename);

  try {
    const basketData = JSON.parse(fs.readFileSync(basketPath, 'utf8'));
    const seedViolations = [];

    // Check each LEGO's practice phrases
    Object.entries(basketData).forEach(([legoId, legoData]) => {
      if (!legoData.practice_phrases) return;

      legoData.practice_phrases.forEach((phrase, idx) => {
        totalPhrases++;

        // Phrase format: [known, target, metadata, complexity]
        const knownPhrase = Array.isArray(phrase) ? phrase[0] : null;
        const targetPhrase = Array.isArray(phrase) ? phrase[1] : null;

        if (!knownPhrase || !targetPhrase) return;

        const normalizedKnown = normalizeKnown(knownPhrase);

        // Check: Are there multiple possible targets for this known phrase?
        if (knownToTargetMap.has(normalizedKnown)) {
          const possibleTargets = knownToTargetMap.get(normalizedKnown);

          if (possibleTargets.size > 1) {
            // Multiple options exist - could cause learner uncertainty
            // Only flag if the phrase uses one option, but others exist
            seedViolations.push({
              lego: legoId,
              phrase_index: idx + 1,
              known: knownPhrase,
              target_used: targetPhrase.trim(),
              possible_targets: Array.from(possibleTargets),
              uncertainty_level: possibleTargets.size
            });

            totalLUTViolations++;
          }
        }
      });
    });

    if (seedViolations.length > 0) {
      violationsBySeed[seedNum] = seedViolations;
      console.log(`⚠️  S${String(seedNum).padStart(4, '0')}: ${seedViolations.length} potential uncertainties`);
    } else {
      console.log(`✅ S${String(seedNum).padStart(4, '0')}: No learner uncertainty`);
    }

  } catch (error) {
    console.log(`❌ S${String(seedNum).padStart(4, '0')}: Error - ${error.message}`);
  }
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log();
console.log('═'.repeat(60));
console.log('LUT VALIDATION SUMMARY');
console.log('═'.repeat(60));
console.log();
console.log(`Total phrases checked:           ${totalPhrases}`);
console.log(`Potential uncertainties found:   ${totalLUTViolations}`);
console.log(`Certainty rate:                  ${((totalPhrases - totalLUTViolations) / totalPhrases * 100).toFixed(1)}%`);
console.log();

if (totalLUTViolations > 0) {
  console.log('⚠️  INTERPRETATION:');
  console.log('   These phrases use known language prompts that have multiple');
  console.log('   valid target language translations in the course.');
  console.log();
  console.log('   This MAY cause learner uncertainty, OR it may be intentional');
  console.log('   pedagogical variation (teaching synonyms/alternatives).');
  console.log();
  console.log('Seeds with potential uncertainty:');

  Object.entries(violationsBySeed).forEach(([seedNum, violations]) => {
    console.log(`\n  S${String(seedNum).padStart(4, '0')} - ${violations.length} cases:`);
    violations.slice(0, 3).forEach(v => {
      console.log(`    ${v.lego} phrase ${v.phrase_index}:`);
      console.log(`      Known: "${v.known}"`);
      console.log(`      Used: "${v.target_used}"`);
      console.log(`      Alternatives: ${v.possible_targets.filter(t => t !== v.target_used).join(', ')}`);
    });
    if (violations.length > 3) {
      console.log(`    ... and ${violations.length - 3} more`);
    }
  });
  console.log();

  // Save violations report
  const reportPath = path.join(coursePath, 'phase5_lut_uncertainties.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    course: courseCode,
    timestamp: new Date().toISOString(),
    total_phrases: totalPhrases,
    potential_uncertainties: totalLUTViolations,
    certainty_rate: ((totalPhrases - totalLUTViolations) / totalPhrases * 100).toFixed(1) + '%',
    note: 'These are POTENTIAL uncertainties. Some may be intentional pedagogical variation.',
    violations_by_seed: violationsBySeed
  }, null, 2));

  console.log(`📄 Detailed report saved: ${reportPath}`);
  console.log();
} else {
  console.log('✅ NO LEARNER UNCERTAINTY - All phrases have unambiguous mappings!');
  console.log();
}

console.log('💡 Note: LUT analysis checks for ambiguity in the course design.');
console.log('   Review the report to determine which cases are problems vs. pedagogy.');
console.log();
