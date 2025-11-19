#!/usr/bin/env node

/**
 * Generate simple JSON scaffolds for Phase 5
 * Creates scaffolds with known/target labels (NOT language-specific names)
 * Populates actual LEGO data and vocabulary from lego_pairs.json
 */

const fs = require('fs-extra');
const path = require('path');

const courseDir = process.argv[2] || 'public/vfs/courses/spa_for_eng';
const outputDir = path.join(courseDir, 'phase5_scaffolds');

console.log(`[Scaffold Gen] Reading from: ${courseDir}`);
console.log(`[Scaffold Gen] Writing to: ${outputDir}`);

// Read lego_pairs.json
const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
const legoPairs = require(path.resolve(legoPairsPath));

// Ensure output directory exists
fs.ensureDirSync(outputDir);

// Process each seed
for (let i = 0; i < legoPairs.seeds.length; i++) {
  const seed = legoPairs.seeds[i];
  const seedId = seed.seed_id;
  const seedNum = seedId.substring(1); // Remove 'S' prefix

  // Build recent seed pairs (10 most recent)
  const recentSeedPairs = [];
  const startIdx = Math.max(0, i - 10);
  for (let j = startIdx; j < i; j++) {
    const recentSeed = legoPairs.seeds[j];
    recentSeedPairs.push({
      seed_id: recentSeed.seed_id,
      known: recentSeed.seed_pair.known,
      target: recentSeed.seed_pair.target
    });
  }

  // Build recent new LEGOs (30 most recent)
  const recentNewLegos = [];
  for (let j = i - 1; j >= 0 && recentNewLegos.length < 30; j--) {
    const recentSeed = legoPairs.seeds[j];
    for (let k = recentSeed.legos.length - 1; k >= 0 && recentNewLegos.length < 30; k--) {
      const lego = recentSeed.legos[k];
      if (lego.new) {
        recentNewLegos.unshift({
          id: lego.id,
          known: lego.lego.known,
          target: lego.lego.target,
          type: lego.type
        });
      }
    }
  }

  // Build legos object
  const legos = {};
  for (let j = 0; j < seed.legos.length; j++) {
    const lego = seed.legos[j];
    if (!lego.new) continue; // Only include NEW LEGOs

    const legoId = lego.id;

    // Build current seed earlier LEGOs
    const currentSeedEarlierLegos = [];
    for (let k = 0; k < j; k++) {
      const earlierLego = seed.legos[k];
      if (earlierLego.new) {
        currentSeedEarlierLegos.push({
          id: earlierLego.id,
          known: earlierLego.lego.known,
          target: earlierLego.lego.target,
          type: earlierLego.type
        });
      }
    }

    // Check if final LEGO
    let isFinalLego = false;
    for (let k = j + 1; k < seed.legos.length; k++) {
      if (seed.legos[k].new) {
        isFinalLego = false;
        break;
      } else if (k === seed.legos.length - 1) {
        isFinalLego = true;
      }
    }
    if (j === seed.legos.length - 1) {
      isFinalLego = true;
    }

    legos[legoId] = {
      lego: [lego.lego.known, lego.lego.target], // Array format
      type: lego.type,
      is_final_lego: isFinalLego,
      current_seed_earlier_legos: currentSeedEarlierLegos
    };
  }

  // Create scaffold
  const scaffold = {
    seed_id: seedId,
    seed_pair: {
      known: seed.seed_pair.known,
      target: seed.seed_pair.target
    },
    recent_seed_pairs: recentSeedPairs,
    recent_new_legos: recentNewLegos,
    legos: legos
  };

  // Write scaffold (compact inline format like lego_pairs.json)
  const outputPath = path.join(outputDir, `seed_s${seedNum.toLowerCase()}.json`);

  // Custom formatter: inline for small objects, multi-line for arrays
  let json = JSON.stringify(scaffold, null, 2);

  // Make seed_pair inline
  json = json.replace(/"seed_pair": \{\s+"known": (".*?"),\s+"target": (".*?")\s+\}/g, '"seed_pair": {"known": $1, "target": $2}');

  // Make recent_seed_pairs array items inline
  json = json.replace(/\{\s+"seed_id": (".*?"),\s+"known": (".*?"),\s+"target": (".*?")\s+\}/g, '{"seed_id": $1, "known": $2, "target": $3}');

  // Make recent_new_legos array items inline
  json = json.replace(/\{\s+"id": (".*?"),\s+"known": (".*?"),\s+"target": (".*?"),\s+"type": (".*?")\s+\}/g, '{"id": $1, "known": $2, "target": $3, "type": $4}');

  // Make current_seed_earlier_legos array items inline
  json = json.replace(/\{\s+"id": (".*?"),\s+"known": (".*?"),\s+"target": (".*?"),\s+"type": (".*?")\s+\}/g, '{"id": $1, "known": $2, "target": $3, "type": $4}');

  fs.writeFileSync(outputPath, json + '\n');

  if ((i + 1) % 50 === 0) {
    console.log(`[Scaffold Gen] Processed ${i + 1}/${legoPairs.seeds.length} seeds`);
  }
}

console.log(`[Scaffold Gen] ✅ Complete! Generated ${legoPairs.seeds.length} scaffolds`);
console.log(`[Scaffold Gen] Output: ${outputDir}`);
