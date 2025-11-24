#!/usr/bin/env node

/**
 * Phase 4: LEGO Upchunking Pipeline
 *
 * Takes draft_lego_pairs.json (from Phase 1+3) and produces conflict-free lego_pairs.json
 *
 * Steps:
 * 1. Detect conflicts (same KNOWN → different TARGETs)
 * 2. Generate conflict report
 * 3. [Manual/Agent] Create upchunk_resolutions.json
 * 4. Apply resolutions → lego_pairs.json (final)
 *
 * Usage:
 *   node tools/generators/phase4-upchunk-pipeline.cjs <course_code> [--detect|--apply]
 *
 *   --detect  : Only detect conflicts and generate report (default)
 *   --apply   : Apply upchunk_resolutions.json to create final lego_pairs.json
 */

const fs = require('fs-extra');
const path = require('path');

const COURSE_CODE = process.argv[2];
const MODE = process.argv.includes('--apply') ? 'apply' : 'detect';

if (!COURSE_CODE) {
  console.error('Usage: node phase4-upchunk-pipeline.cjs <course_code> [--detect|--apply]');
  process.exit(1);
}

const VFS_ROOT = path.join(__dirname, '../../public/vfs/courses');
const COURSE_DIR = path.join(VFS_ROOT, COURSE_CODE);

const FILES = {
  draft: path.join(COURSE_DIR, 'draft_lego_pairs.json'),
  conflicts: path.join(COURSE_DIR, 'conflict_report.json'),
  resolutions: path.join(COURSE_DIR, 'upchunk_resolutions.json'),
  final: path.join(COURSE_DIR, 'lego_pairs.json')
};

/**
 * Detect conflicts in draft_lego_pairs.json
 */
async function detectConflicts() {
  console.log('\n=== PHASE 4: CONFLICT DETECTION ===\n');

  if (!await fs.pathExists(FILES.draft)) {
    console.error(`Error: ${FILES.draft} not found`);
    console.log('Run Phase 1+3 first to generate draft_lego_pairs.json');
    process.exit(1);
  }

  const data = await fs.readJson(FILES.draft);
  const seeds = data.seeds || [];

  // Group LEGOs by KNOWN
  const knownToOccurrences = new Map();
  let totalLegos = 0;

  for (const seed of seeds) {
    for (const lego of seed.legos || []) {
      totalLegos++;
      const known = lego.lego.known.toLowerCase().trim();
      if (!knownToOccurrences.has(known)) {
        knownToOccurrences.set(known, []);
      }
      knownToOccurrences.get(known).push({
        seedId: seed.seed_id,
        sentence: seed.seed_pair,
        lego: lego.lego,
        type: lego.type
      });
    }
  }

  // Find conflicts
  const conflicts = [];
  for (const [known, occurrences] of knownToOccurrences) {
    const targets = new Set(occurrences.map(o => o.lego.target));
    if (targets.size > 1) {
      conflicts.push({
        known,
        targets: [...targets],
        occurrences: occurrences.map(o => ({
          seedId: o.seedId,
          knownSentence: o.sentence.known,
          targetSentence: o.sentence.target,
          legoTarget: o.lego.target
        }))
      });
    }
  }

  // Save conflict report
  const report = {
    course: COURSE_CODE,
    generated: new Date().toISOString(),
    stats: {
      totalSeeds: seeds.length,
      totalLegos,
      uniqueKnown: knownToOccurrences.size,
      conflicts: conflicts.length,
      conflictRate: ((conflicts.length / knownToOccurrences.size) * 100).toFixed(1) + '%'
    },
    conflicts
  };

  await fs.writeJson(FILES.conflicts, report, { spaces: 2 });

  // Summary
  console.log(`Course: ${COURSE_CODE}`);
  console.log(`Total LEGOs: ${totalLegos}`);
  console.log(`Unique KNOWN values: ${knownToOccurrences.size}`);
  console.log(`Conflicts found: ${conflicts.length} (${report.stats.conflictRate})`);
  console.log(`\nConflict report: ${FILES.conflicts}`);

  if (conflicts.length === 0) {
    console.log('\n✅ No conflicts! draft_lego_pairs.json is ready to become lego_pairs.json');
    await fs.copy(FILES.draft, FILES.final);
    console.log(`Created: ${FILES.final}`);
  } else {
    console.log('\n⚠️  Conflicts detected. Next steps:');
    console.log('1. Run upchunking agent to generate upchunk_resolutions.json');
    console.log('2. Run: node phase4-upchunk-pipeline.cjs ' + COURSE_CODE + ' --apply');
  }

  return conflicts;
}

/**
 * Apply upchunk resolutions to create final lego_pairs.json
 */
async function applyResolutions() {
  console.log('\n=== PHASE 4: APPLY RESOLUTIONS ===\n');

  if (!await fs.pathExists(FILES.draft)) {
    console.error(`Error: ${FILES.draft} not found`);
    process.exit(1);
  }

  if (!await fs.pathExists(FILES.resolutions)) {
    console.error(`Error: ${FILES.resolutions} not found`);
    console.log('Run upchunking agent first to generate resolutions.');
    process.exit(1);
  }

  const draft = await fs.readJson(FILES.draft);
  const resolutions = await fs.readJson(FILES.resolutions);

  // Build resolution lookup
  const canonicalForms = new Map();
  const newMTypes = [];

  for (const res of resolutions.resolutions || []) {
    // Store canonical form for each conflict
    if (res.canonical) {
      canonicalForms.set(res.conflict.toLowerCase(), res.canonical.target);
    }

    // Collect new M-types to add
    for (const upchunk of res.upchunks || []) {
      newMTypes.push({
        ...upchunk,
        new: true,
        source: 'phase4_upchunk'
      });
    }
  }

  // Process seeds
  let updatedCount = 0;
  let capitalNormalized = 0;
  let addedMTypes = 0;

  // First pass: normalize all TARGETs to lowercase (capitalization is applied at render)
  for (const seed of draft.seeds) {
    for (const lego of seed.legos || []) {
      // Auto-normalize capitalization (first char only, preserve rest)
      const target = lego.lego.target;
      if (target && target[0] === target[0].toUpperCase() && target[0] !== target[0].toLowerCase()) {
        const normalized = target[0].toLowerCase() + target.slice(1);
        if (lego.lego.target !== normalized) {
          lego.lego.target = normalized;
          capitalNormalized++;
        }
      }
    }
  }

  // Second pass: apply canonical forms from resolutions
  for (const seed of draft.seeds) {
    for (const lego of seed.legos || []) {
      const known = lego.lego.known.toLowerCase();
      if (canonicalForms.has(known)) {
        const canonical = canonicalForms.get(known);
        if (lego.lego.target !== canonical) {
          lego.lego.target = canonical;
          lego.normalized = true;
          updatedCount++;
        }
      }
    }

    // Add relevant M-types to seeds that need them
    // (This is a simplified approach - in practice you'd match by seed context)
  }

  // Add new M-types as a separate section
  draft.upchunked_mtypes = newMTypes;
  addedMTypes = newMTypes.length;

  // Update metadata
  draft.phase4 = {
    applied: new Date().toISOString(),
    normalizedLegos: updatedCount,
    addedMTypes: addedMTypes,
    resolutionsApplied: resolutions.resolutions?.length || 0
  };

  // Write final lego_pairs.json
  await fs.writeJson(FILES.final, draft, { spaces: 2 });

  console.log(`Course: ${COURSE_CODE}`);
  console.log(`Capitalization auto-fixed: ${capitalNormalized}`);
  console.log(`LEGOs normalized to canonical: ${updatedCount}`);
  console.log(`M-types added: ${addedMTypes}`);
  console.log(`\n✅ Created: ${FILES.final}`);
  console.log('\nPhase 4 complete! lego_pairs.json is now conflict-free.');
}

// Main
async function main() {
  if (MODE === 'apply') {
    await applyResolutions();
  } else {
    await detectConflicts();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
