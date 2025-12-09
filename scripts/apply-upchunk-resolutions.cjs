#!/usr/bin/env node

/**
 * Phase 2 Application Agent
 * Applies upchunk resolutions to lego_pairs.json
 */

const fs = require('fs');
const path = require('path');

// File paths
const LEGO_PAIRS_PATH = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng_v2/lego_pairs.json';
const OUTPUT_PATH = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng_v2/lego_pairs.json';

const RESOLUTION_FILES = [
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng_v2/batch1_conflict_resolutions.json',
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng_v2/batch2_resolutions.json',
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/batch3_resolutions.json',
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/batch4_resolutions.json',
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/batch5_resolutions.json',
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/batch_6_resolutions.json',
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/batch7_resolutions.json'
];

// Manual resolutions for batch 8 & 9 (not written to files)
const BATCH_8_9_RESOLUTIONS = [
  { seedId: 'S0510', known: 'there must be another way', target: '别的办法' },
  { seedId: 'S0440', known: 'want to travel', target: '去旅行' },
  { seedId: 'S0643', known: 'follow the crowd', target: '随大流' },
  { seedId: 'S0398', known: 'patient with', target: '对' },
  { seedId: 'S0640', known: 'get to the point', target: '直奔主题' },
  { seedId: 'S0437', known: 'raise as much money as possible', target: '尽可能多的钱' },
  { seedId: 'S0633', known: 'hit the nail on the head', target: '一针见血' },
  { seedId: 'S0451', known: 'they said', target: '他们说了' },
  { seedId: 'S0453', known: 'did they say', target: '他们说了' },
  { seedId: 'S0513', known: 'too late to change', target: '改不了' },
  { seedId: 'S0600', known: 'that\'s how things are', target: '事情就是这样' },
  { seedId: 'S0516', known: 'last time', target: '上次什么时候' },
  { seedId: 'S0574', known: 'easier said than done', target: '做起来' },
  { seedId: 'S0597', known: 'very happy', target: '非常开心' }
];

// Fixes for malformed resolutions
const RESOLUTION_FIXES = {
  // "to know" conflict fixes (batch 2)
  'S0230': { known: 'I know (a person)', target: '我认识' },
  'S0231': { known: 'I know (a person)', target: '我认识' },
  'S0232': { known: 'I know (a person)', target: '我认识' },
  'S0233': { known: 'I know (a person)', target: '我认识' },
  'S0236': { known: 'I know (a person)', target: '我认识' },
  'S0553': { known: 'pleasure to know you', target: '高兴认识你' },

  // "this" conflict fixes (batch 2)
  'S0261': { known: 'I think this', target: '我想这' },
  'S0511': { known: 'this doesn\'t concern', target: '这不关' },
  'S0588': { known: 'this is simple', target: '这很简单' },
  'S0590': { known: 'this is expensive', target: '这很贵' },

  // "learn ing" fix (batch 2)
  'S0096': { known: 'learning', target: '我在学习' }
};

function countWords(str) {
  return str.trim().split(/\s+/).length;
}

function countChars(str) {
  return str.length;
}

function determineType(known, target) {
  const knownWords = countWords(known);
  const targetChars = countChars(target);
  return (knownWords >= 2 && targetChars >= 2) ? 'M' : 'A';
}

// Load and parse JSON files
console.log('Loading lego_pairs.json...');
const legoPairs = JSON.parse(fs.readFileSync(LEGO_PAIRS_PATH, 'utf8'));

// Collect all resolutions
console.log('Loading resolution files...');
const allResolutions = [];

// Load from batch files
for (const file of RESOLUTION_FILES) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));

    // Different batch files have different structures
    if (data.resolutions && Array.isArray(data.resolutions)) {
      // Batch 1, 2, 3 format
      for (const conflict of data.resolutions) {
        if (conflict.upchunks) {
          for (const upchunk of conflict.upchunks) {
            allResolutions.push({
              seedId: upchunk.seedId,
              original: upchunk.original,
              upchunked: upchunk.upchunked,
              source: path.basename(file)
            });
          }
        } else if (conflict.conflicts) {
          // Batch 5 format
          for (const item of conflict.conflicts) {
            if (item.resolution === 'UPCHUNK') {
              allResolutions.push({
                seedId: item.seedId,
                original: {
                  known: item.original_known,
                  target: item.original_target
                },
                upchunked: {
                  known: item.new_known,
                  target: item.original_target
                },
                source: path.basename(file)
              });
            }
          }
        } else if (conflict.seedId) {
          // Batch 4, 6 format - resolutions array
          if (Array.isArray(conflict.resolutions)) {
            for (const res of conflict.resolutions) {
              if (res.action === 'upchunk') {
                allResolutions.push({
                  seedId: res.seedId,
                  original: res.original_lego || { known: res.old_known, target: res.target },
                  upchunked: res.upchunked_lego || { known: res.new_known, target: res.target },
                  source: path.basename(file)
                });
              }
            }
          } else {
            // Batch 6 individual format
            allResolutions.push({
              seedId: conflict.seedId,
              original: conflict.original,
              upchunked: conflict.upchunked,
              source: path.basename(file)
            });
          }
        }
      }
    } else if (data.batch === 7) {
      // Batch 7 format
      for (const conflict of data.resolutions) {
        if (conflict.resolutions) {
          for (const res of conflict.resolutions) {
            if (res.action === 'upchunk') {
              allResolutions.push({
                seedId: res.seedId,
                original: { known: res.old_known, target: res.target },
                upchunked: { known: res.new_known, target: res.target },
                source: 'batch7_resolutions.json'
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error loading ${file}: ${err.message}`);
  }
}

// Add batch 8 & 9 manual resolutions
for (const res of BATCH_8_9_RESOLUTIONS) {
  allResolutions.push({
    seedId: res.seedId,
    original: { known: '', target: '' }, // Will match by seedId
    upchunked: { known: res.known, target: res.target },
    source: 'batch8-9-manual'
  });
}

console.log(`\nTotal resolutions loaded: ${allResolutions.length}`);

// Apply resolutions
let upchunkCount = 0;
let errorCount = 0;
let foundSeeds = 0;

for (const resolution of allResolutions) {
  const seed = legoPairs.seeds.find(s => s.seed_id === resolution.seedId);

  if (!seed) {
    console.warn(`Warning: Seed ${resolution.seedId} not found`);
    errorCount++;
    continue;
  }

  foundSeeds++;

  // Check for fixes first
  if (RESOLUTION_FIXES[resolution.seedId]) {
    const fix = RESOLUTION_FIXES[resolution.seedId];
    console.log(`\nApplying FIX for ${resolution.seedId}:`);
    console.log(`  Original: "${resolution.upchunked.known}" → "${resolution.upchunked.target}"`);
    console.log(`  Fixed:    "${fix.known}" → "${fix.target}"`);

    // Find and update the LEGO
    for (const legoItem of seed.legos) {
      // For batch 8-9, we don't have original known/target, so just update first matching LEGO
      if (resolution.source === 'batch8-9-manual') {
        legoItem.lego.known = fix.known;
        legoItem.lego.target = fix.target;
        legoItem.type = determineType(fix.known, fix.target);
        legoItem.upchunked = true;
        upchunkCount++;
        break;
      } else if (legoItem.lego.known === resolution.original.known && legoItem.lego.target === resolution.original.target) {
        legoItem.lego.known = fix.known;
        legoItem.lego.target = fix.target;
        legoItem.type = determineType(fix.known, fix.target);
        legoItem.upchunked = true;
        upchunkCount++;
        break;
      }
    }
  } else {
    // Apply normal resolution
    for (const legoItem of seed.legos) {
      // For batch 8-9, we don't have original known/target
      if (resolution.source === 'batch8-9-manual') {
        legoItem.lego.known = resolution.upchunked.known;
        legoItem.lego.target = resolution.upchunked.target;
        legoItem.type = determineType(resolution.upchunked.known, resolution.upchunked.target);
        legoItem.upchunked = true;
        upchunkCount++;
        break;
      } else if (legoItem.lego.known === resolution.original.known && legoItem.lego.target === resolution.original.target) {
        legoItem.lego.known = resolution.upchunked.known;
        legoItem.lego.target = resolution.upchunked.target;
        legoItem.type = determineType(resolution.upchunked.known, resolution.upchunked.target);
        legoItem.upchunked = true;
        upchunkCount++;
        break;
      }
    }
  }
}

console.log(`\n✅ Found ${foundSeeds} seeds`);

console.log(`\n✅ Applied ${upchunkCount} upchunks`);
if (errorCount > 0) {
  console.warn(`⚠️  ${errorCount} errors encountered`);
}

// Apply LEGO reuse tracking
console.log('\n\nApplying LEGO reuse tracking...');
const seenLegos = new Map(); // key: "known|target", value: { legoId, seedId }
let newCount = 0;
let reusedCount = 0;

for (const seed of legoPairs.seeds) {
  for (const legoItem of seed.legos) {
    const key = `${legoItem.lego.known}|${legoItem.lego.target}`;

    if (seenLegos.has(key)) {
      // Reused LEGO
      const original = seenLegos.get(key);
      legoItem.new = false;
      legoItem.ref = original.legoId;
      reusedCount++;
    } else {
      // New LEGO
      legoItem.new = true;
      delete legoItem.ref;
      seenLegos.set(key, { legoId: legoItem.id, seedId: seed.seed_id });
      newCount++;
    }
  }
}

console.log(`✅ Tracked ${newCount} unique LEGOs (new: true)`);
console.log(`✅ Tracked ${reusedCount} reused LEGOs (new: false)`);

// Write output
console.log(`\n\nWriting updated lego_pairs.json...`);
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(legoPairs, null, 2), 'utf8');

console.log('\n✅ COMPLETE!');
console.log('\nSummary:');
console.log(`  - LEGOs upchunked: ${upchunkCount}`);
console.log(`  - Unique LEGOs: ${newCount}`);
console.log(`  - Reused LEGOs: ${reusedCount}`);
console.log(`  - Errors: ${errorCount}`);

// Verification: Check for remaining conflicts
console.log('\n\nRunning conflict verification...');
const conflicts = new Map();

for (const seed of legoPairs.seeds) {
  for (const legoItem of seed.legos) {
    const key = legoItem.lego.known;
    if (!conflicts.has(key)) {
      conflicts.set(key, []);
    }
    conflicts.get(key).push({ seedId: seed.seed_id, target: legoItem.lego.target });
  }
}

let conflictCount = 0;
for (const [known, instances] of conflicts) {
  const uniqueTargets = new Set(instances.map(i => i.target));
  if (uniqueTargets.size > 1) {
    conflictCount++;
    console.warn(`\n⚠️  Conflict on "${known}":`);
    for (const instance of instances) {
      console.warn(`    ${instance.seedId}: "${instance.target}"`);
    }
  }
}

if (conflictCount === 0) {
  console.log('✅ No conflicts found!');
} else {
  console.warn(`\n⚠️  ${conflictCount} conflicts remain`);
}
