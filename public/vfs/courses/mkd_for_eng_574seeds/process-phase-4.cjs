#!/usr/bin/env node

/**
 * Phase 4: Deduplication
 *
 * Merges duplicate LEGOs (same text) while preserving all provenance.
 * Creates deduplicated LEGO amino acids with consolidated provenance arrays.
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const LEGOS_DIR = path.join(__dirname, 'amino_acids', 'legos');
const DEDUPE_DIR = path.join(__dirname, 'amino_acids', 'legos_deduplicated');
const OUTPUT_FILE = path.join(__dirname, 'phase_outputs', 'phase_4_deduplication.json');

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate deterministic UUID from content
 */
function generateUUID(content) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(content));
  return hash.digest('hex').substring(0, 32);
}

/**
 * Load all LEGO amino acids
 */
async function loadLEGOs() {
  const files = await fs.readdir(LEGOS_DIR);
  const legos = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const data = await fs.readJson(path.join(LEGOS_DIR, file));
      legos.push(data);
    }
  }

  return legos;
}

/**
 * Normalize text for deduplication comparison
 */
function normalize(text) {
  return text.toLowerCase().trim();
}

/**
 * Group LEGOs by normalized text
 */
function groupByText(legos) {
  const groups = new Map();

  legos.forEach(lego => {
    const normalizedText = normalize(lego.text);

    if (!groups.has(normalizedText)) {
      groups.set(normalizedText, []);
    }

    groups.get(normalizedText).push(lego);
  });

  return groups;
}

/**
 * Merge duplicate LEGOs into a single deduplicated amino acid
 */
function mergeLEGOs(legoGroup) {
  // Sort by provenance to establish canonical order
  const sorted = legoGroup.sort((a, b) => a.provenance.localeCompare(b.provenance));

  // Use first LEGO as template
  const canonical = sorted[0];

  // Collect all provenance info
  const provenanceArray = sorted.map(lego => ({
    provenance: lego.provenance,
    source_translation_uuid: lego.source_translation_uuid,
    source_seed_id: lego.source_seed_id,
    original_uuid: lego.uuid
  }));

  // Calculate merged scores (average)
  const avgFCFS = sorted.reduce((sum, l) => sum + (l.fcfs_score || 0), 0) / sorted.length;
  const avgUtility = sorted.reduce((sum, l) => sum + (l.utility_score || 0), 0) / sorted.length;
  const avgPedagogical = sorted.reduce((sum, l) => sum + (l.pedagogical_score || 0), 0) / sorted.length;

  // Create deduplicated amino acid
  const deduplicated = {
    uuid: generateUUID({
      text: canonical.text,
      type: 'lego_deduplicated',
      provenance_count: provenanceArray.length
    }),
    type: 'lego_deduplicated',
    text: canonical.text,

    // Provenance array preserves ALL sources
    provenance: provenanceArray,

    // Merged scores
    fcfs_score: Math.round(avgFCFS * 10) / 10,
    utility_score: Math.round(avgUtility),
    pedagogical_score: Math.round(avgPedagogical),

    metadata: {
      course_code: 'mkd_for_eng_574seeds',
      phase: 'phase_4',
      duplicate_count: legoGroup.length,
      canonical_provenance: canonical.provenance,
      all_sources: provenanceArray.map(p => p.provenance).join(', '),
      created_at: new Date().toISOString()
    }
  };

  return deduplicated;
}

// =============================================================================
// MAIN PROCESSOR
// =============================================================================

async function processPhase4() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('Phase 4: Deduplication');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Load LEGOs
  console.log('🧬 Loading LEGO amino acids...');
  const legos = await loadLEGOs();
  console.log(`   Found ${legos.length} LEGOs\n`);

  // Group by text
  console.log('📋 Grouping LEGOs by text...');
  const groups = groupByText(legos);
  console.log(`   Found ${groups.size} unique LEGO texts\n`);

  // Identify duplicates
  const duplicateGroups = Array.from(groups.entries()).filter(([_, group]) => group.length > 1);
  const uniqueGroups = Array.from(groups.entries()).filter(([_, group]) => group.length === 1);

  console.log(`   Duplicates: ${duplicateGroups.length} texts with multiple instances`);
  console.log(`   Unique: ${uniqueGroups.length} texts with single instance\n`);

  // Ensure output directory exists
  await fs.ensureDir(DEDUPE_DIR);

  // Process all groups (both duplicates and uniques)
  console.log('🔄 Merging duplicates and preserving provenance...');

  let deduplicatedCount = 0;
  const mergeLog = [];

  for (const [text, group] of groups.entries()) {
    const deduplicated = mergeLEGOs(group);

    // Save deduplicated amino acid
    const dedupeFile = path.join(DEDUPE_DIR, `${deduplicated.uuid}.json`);
    await fs.writeJson(dedupeFile, deduplicated, { spaces: 2 });

    deduplicatedCount++;

    if (group.length > 1) {
      mergeLog.push({
        text: deduplicated.text,
        original_count: group.length,
        provenance_preserved: deduplicated.provenance.length,
        canonical_provenance: deduplicated.metadata.canonical_provenance,
        all_sources: deduplicated.metadata.all_sources
      });
    }

    if (deduplicatedCount % 50 === 0) {
      console.log(`   Processed ${deduplicatedCount}/${groups.size} unique LEGOs...`);
    }
  }

  console.log(`   ✓ Created ${deduplicatedCount} deduplicated LEGOs\n`);

  // Generate deduplication report
  console.log('📊 Generating deduplication report...');

  const report = {
    version: '7.0',
    phase: '4',
    generated_at: new Date().toISOString(),
    course_code: 'mkd_for_eng_574seeds',

    statistics: {
      original_legos: legos.length,
      unique_legos: groups.size,
      deduplicated_legos: deduplicatedCount,
      duplicate_groups: duplicateGroups.length,
      compression_ratio: `${legos.length}:${deduplicatedCount}`,
      reduction_percentage: Math.round(((legos.length - deduplicatedCount) / legos.length) * 100)
    },

    merge_log: mergeLog,

    provenance_preservation: {
      description: 'All provenance preserved in provenance arrays',
      format: '[{ provenance, source_translation_uuid, source_seed_id, original_uuid }, ...]',
      example: mergeLog.length > 0 ? mergeLog[0] : null
    },

    next_phase: {
      phase: '5',
      name: 'Pattern-Aware Baskets',
      purpose: 'Group LEGOs into pedagogically optimal baskets using graph patterns'
    }
  };

  await fs.writeJson(OUTPUT_FILE, report, { spaces: 2 });
  console.log(`   Saved to: ${OUTPUT_FILE}\n`);

  // Display top duplicates
  if (mergeLog.length > 0) {
    console.log('🔍 Top Duplicates (by frequency):\n');
    const topDuplicates = mergeLog
      .sort((a, b) => b.original_count - a.original_count)
      .slice(0, 5);

    topDuplicates.forEach((dup, idx) => {
      console.log(`   ${idx + 1}. "${dup.text}"`);
      console.log(`      Instances: ${dup.original_count}`);
      console.log(`      Sources: ${dup.all_sources}`);
      console.log('');
    });
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ Phase 4 Complete!');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Original LEGOs: ${legos.length}`);
  console.log(`Deduplicated LEGOs: ${deduplicatedCount}`);
  console.log(`Reduction: ${report.statistics.reduction_percentage}%`);
  console.log(`Duplicate Groups: ${duplicateGroups.length}`);
  console.log(`Provenance: 100% preserved`);
  console.log('\nNext: Run Phase 5 (Pattern-Aware Baskets)');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Run processor
processPhase4()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Phase 4 failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
