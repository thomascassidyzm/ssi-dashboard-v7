#!/usr/bin/env node

/**
 * Phase 6: Generate LEGO Introductions
 *
 * Purpose: Generate contextual introductions for each unique LEGO using seed sentence context
 *
 * Input files:
 *   - LEGO_BREAKDOWNS_COMPLETE.json (Phase 3 output)
 *   - lego_provenance_map.json (Phase 5.5 output)
 *
 * Output file:
 *   - introductions.json
 *
 * Logic:
 *   - Only generate introductions for non-duplicate LEGOs
 *   - For COMPOSITE LEGOs, include componentization
 *   - For feeders mentioned in componentization, annotate if already known
 *
 * Expected counts (after deduplication):
 *   - Spanish: 105 introductions (10 duplicates removed)
 *   - Italian: 106 introductions (9 duplicates removed)
 *   - French: 105 introductions (11 duplicates removed)
 *   - Mandarin: 101 introductions (2 duplicates removed)
 */

const fs = require('fs');
const path = require('path');

function generateIntroductions(courseDir) {
  console.log(`\n=== Processing ${courseDir} ===\n`);

  // Read input files
  const breakdownsPath = path.join(courseDir, 'LEGO_BREAKDOWNS_COMPLETE.json');
  const provenancePath = path.join(courseDir, 'lego_provenance_map.json');

  if (!fs.existsSync(breakdownsPath)) {
    console.error(`ERROR: ${breakdownsPath} not found`);
    return;
  }

  if (!fs.existsSync(provenancePath)) {
    console.error(`ERROR: ${provenancePath} not found`);
    return;
  }

  const breakdowns = JSON.parse(fs.readFileSync(breakdownsPath, 'utf-8'));
  const provenanceMap = JSON.parse(fs.readFileSync(provenancePath, 'utf-8'));

  const targetLanguage = breakdowns.course_metadata.target_language;
  const knownLanguage = breakdowns.course_metadata.known_language;

  const introductions = [];
  let skippedCount = 0;

  // Process each seed's LEGOs
  for (const seed of breakdowns.lego_breakdowns) {
    const seedId = seed.seed_id;
    const originalKnown = seed.original_known;

    // Process lego_pairs
    for (const lego of seed.lego_pairs || []) {
      const legoId = lego.lego_id;

      // Skip if this is a duplicate
      if (provenanceMap[legoId]) {
        console.log(`  SKIP ${legoId}: duplicate of ${provenanceMap[legoId]}`);
        skippedCount++;
        continue;
      }

      // Generate introduction
      const intro = {
        lego_id: legoId,
        lego_type: lego.lego_type,
        target_chunk: lego.target_chunk,
        known_chunk: lego.known_chunk,
        seed_context: originalKnown,
        introduction_text: generateIntroductionText(
          targetLanguage,
          lego.known_chunk,
          originalKnown,
          lego.target_chunk,
          lego.componentization,
          seed.feeder_pairs || [],
          provenanceMap
        )
      };

      introductions.push(intro);
      console.log(`  ✓ ${legoId}: ${lego.known_chunk}`);
    }

    // Process feeder_pairs
    for (const feeder of seed.feeder_pairs || []) {
      const feederId = feeder.feeder_id;

      // Skip if this is a duplicate
      if (provenanceMap[feederId]) {
        console.log(`  SKIP ${feederId}: duplicate of ${provenanceMap[feederId]}`);
        skippedCount++;
        continue;
      }

      // Generate introduction for non-duplicate feeder
      const intro = {
        feeder_id: feederId,
        lego_type: 'FEEDER',
        target_chunk: feeder.target_chunk,
        known_chunk: feeder.known_chunk,
        parent_lego_id: feeder.parent_lego_id,
        seed_context: originalKnown,
        introduction_text: generateIntroductionText(
          targetLanguage,
          feeder.known_chunk,
          originalKnown,
          feeder.target_chunk,
          null, // feeders don't have componentization
          [],
          provenanceMap
        )
      };

      introductions.push(intro);
      console.log(`  ✓ ${feederId}: ${feeder.known_chunk}`);
    }
  }

  // Write output
  const output = {
    course_metadata: {
      ...breakdowns.course_metadata,
      phase: 6,
      generation_date: new Date().toISOString()
    },
    introductions
  };

  const outputPath = path.join(courseDir, 'introductions.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n✓ Generated ${introductions.length} introductions`);
  console.log(`✓ Skipped ${skippedCount} duplicates`);
  console.log(`✓ Saved to: ${outputPath}\n`);
}

function generateIntroductionText(
  targetLanguage,
  knownChunk,
  seedContext,
  targetChunk,
  componentization,
  feederPairs,
  provenanceMap
) {
  // Base introduction format
  let text = `The ${targetLanguage} for ${knownChunk}, as in ${seedContext}, is: ${targetChunk}`;

  // Add componentization if present
  if (componentization) {
    // Check if any feeders mentioned in componentization are already known
    let enhancedComponentization = componentization;

    // Look for feeders that are duplicates and annotate them
    for (const feeder of feederPairs) {
      if (provenanceMap[feeder.feeder_id]) {
        // This feeder is a duplicate - mark it as "you know already"
        const feederPattern = new RegExp(
          `(${escapeRegex(feeder.known_chunk)}\\s*=\\s*${escapeRegex(feeder.target_chunk)})`,
          'gi'
        );
        enhancedComponentization = enhancedComponentization.replace(
          feederPattern,
          `$1 (you know already)`
        );
      }
    }

    text += `, ${enhancedComponentization}`;
  }

  return text;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Main execution
if (require.main === module) {
  const coursesDir = __dirname;
  const courses = ['spa_for_eng_30seeds', 'ita_for_eng_30seeds', 'fra_for_eng_30seeds', 'cmn_for_eng_30seeds'];

  for (const course of courses) {
    const courseDir = path.join(coursesDir, course);
    if (fs.existsSync(courseDir)) {
      generateIntroductions(courseDir);
    } else {
      console.error(`WARNING: Course directory not found: ${courseDir}`);
    }
  }

  console.log('=== Phase 6 Complete ===');
}

module.exports = { generateIntroductions };
