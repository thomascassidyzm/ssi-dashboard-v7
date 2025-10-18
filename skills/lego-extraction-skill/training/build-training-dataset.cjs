#!/usr/bin/env node

/**
 * Training Dataset Extractor for LEGO Extraction Skill
 *
 * Purpose: Extract training examples from approved course outputs
 *
 * This script transforms completed LEGO_BREAKDOWNS_COMPLETE.json files
 * into training examples for fine-tuning Sonnet on SSi LEGO extraction.
 *
 * Input: Approved LEGO_BREAKDOWNS_COMPLETE.json from vfs/courses/
 * Output: Training examples in Anthropic fine-tuning format
 *
 * The training dataset is LIVING - it evolves with each generation:
 * - Generation 1: Baseline from existing approved courses
 * - Generation 2+: Baseline + human corrections
 * - Quality improves as system learns from corrections
 */

const fs = require('fs');
const path = require('path');

/**
 * Extract training examples from a single LEGO breakdown
 */
function extractLegoExample(seed, lego, translations) {
  const seedTranslation = translations[seed.seed_id];

  return {
    input: {
      seed_id: seed.seed_id,
      target: seed.original_target || seedTranslation?.[0] || "",
      known: seed.original_known || seedTranslation?.[1] || "",
      task: "Extract LEGO and classify",
      context: {
        target_language: "Spanish", // Will be parameterized
        known_language: "English"
      }
    },
    output: {
      lego_id: lego.lego_id,
      lego_type: lego.lego_type,
      target_chunk: lego.target_chunk,
      known_chunk: lego.known_chunk,
      componentization: lego.componentization || null
    },
    reasoning: generateReasoning(lego, seed)
  };
}

/**
 * Generate reasoning for why this LEGO extraction is correct
 * This helps the model learn the "why" not just the "what"
 */
function generateReasoning(lego, seed) {
  const reasons = [];

  // FD check
  reasons.push(
    `FD passes: Learner sees "${lego.known_chunk}" → exactly one target "${lego.target_chunk}". No alternatives, deterministic.`
  );

  // FCFS check (simplified for Gen 1 - we assume first occurrence)
  reasons.push(
    `FCFS allows: First occurrence of "${lego.known_chunk}" in this course.`
  );

  // Classification reasoning
  if (lego.lego_type === "BASE") {
    reasons.push(
      `Classification: BASE because cannot be meaningfully broken down further. Atomic chunk with pedagogical value.`
    );
  } else if (lego.lego_type === "COMPOSITE") {
    reasons.push(
      `Classification: COMPOSITE because contains multiple meaningful parts. Componentization: "${lego.componentization || 'N/A'}"`
    );
  } else if (lego.lego_type === "FEEDER") {
    reasons.push(
      `Classification: FEEDER because extracted from COMPOSITE parent. Component has pedagogical value independently.`
    );
  }

  return reasons.join(" ");
}

/**
 * Extract training examples from feeder pairs
 */
function extractFeederExample(seed, feeder, translations) {
  const seedTranslation = translations[seed.seed_id];

  return {
    input: {
      seed_id: seed.seed_id,
      target: seed.original_target || seedTranslation?.[0] || "",
      known: seed.original_known || seedTranslation?.[1] || "",
      task: "Extract FEEDER from COMPOSITE",
      context: {
        parent_lego: feeder.parent_lego_id
      }
    },
    output: {
      feeder_id: feeder.feeder_id,
      lego_type: "FEEDER",
      target_chunk: feeder.target_chunk,
      known_chunk: feeder.known_chunk,
      parent_lego_id: feeder.parent_lego_id
    },
    reasoning: `FD passes: "${feeder.known_chunk}" → "${feeder.target_chunk}" deterministic. Classification: FEEDER extracted from parent ${feeder.parent_lego_id}. Component has pedagogical value.`
  };
}

/**
 * Build training dataset from a single course
 */
function buildDatasetFromCourse(courseDir, courseName) {
  console.log(`\n📊 Extracting training data from: ${courseName}`);

  // Read input files
  const breakdownsPath = path.join(courseDir, 'LEGO_BREAKDOWNS_COMPLETE.json');
  const translationsPath = path.join(courseDir, 'translations.json');

  if (!fs.existsSync(breakdownsPath)) {
    console.error(`❌ LEGO_BREAKDOWNS_COMPLETE.json not found in ${courseDir}`);
    return null;
  }

  const breakdowns = JSON.parse(fs.readFileSync(breakdownsPath, 'utf-8'));

  // Translations are optional (for context enrichment)
  let translations = {};
  if (fs.existsSync(translationsPath)) {
    translations = JSON.parse(fs.readFileSync(translationsPath, 'utf-8'));
  }

  const examples = [];
  let legoCount = 0;
  let feederCount = 0;

  // Extract examples from each seed
  for (const seed of breakdowns.lego_breakdowns || []) {
    // Extract LEGOs (lego_pairs)
    for (const lego of seed.lego_pairs || []) {
      examples.push(extractLegoExample(seed, lego, translations));
      legoCount++;
    }

    // Extract FEEDERs (feeder_pairs)
    for (const feeder of seed.feeder_pairs || []) {
      examples.push(extractFeederExample(seed, feeder, translations));
      feederCount++;
    }
  }

  console.log(`  ✅ Extracted ${legoCount} LEGO examples`);
  console.log(`  ✅ Extracted ${feederCount} FEEDER examples`);
  console.log(`  📈 Total: ${examples.length} training examples`);

  return {
    generation: 1,
    source_course: courseName,
    target_language: breakdowns.course_metadata?.target_language || "Unknown",
    known_language: breakdowns.course_metadata?.known_language || "Unknown",
    extraction_date: new Date().toISOString(),
    num_seeds: breakdowns.course_metadata?.num_seeds || (breakdowns.lego_breakdowns || []).length,
    quality_score: "approved", // Gen 1 baseline - human reviewed
    notes: "Generation 1 baseline extracted from approved course output",
    examples: examples,
    stats: {
      total_examples: examples.length,
      lego_examples: legoCount,
      feeder_examples: feederCount
    }
  };
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let courseDir = null;
  let courseName = null;
  let outputPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--course' && i + 1 < args.length) {
      courseDir = args[i + 1];
      courseName = path.basename(courseDir);
      i++;
    } else if (args[i] === '--output' && i + 1 < args.length) {
      outputPath = args[i + 1];
      i++;
    }
  }

  // Default: extract from all 30-seed courses
  if (!courseDir) {
    console.log('🚀 Training Dataset Extractor for LEGO Extraction Skill');
    console.log('📁 Extracting from all approved 30-seed courses...\n');

    const vfsDir = path.join(__dirname, '../../../vfs/courses');
    const courses = [
      'spa_for_eng_30seeds',
      'ita_for_eng_30seeds',
      'fra_for_eng_30seeds',
      'cmn_for_eng_30seeds'
    ];

    const allDatasets = [];
    let totalExamples = 0;

    for (const course of courses) {
      const dir = path.join(vfsDir, course);
      if (fs.existsSync(dir)) {
        const dataset = buildDatasetFromCourse(dir, course);
        if (dataset) {
          allDatasets.push(dataset);
          totalExamples += dataset.examples.length;

          // Save individual course dataset
          const outputFile = path.join(__dirname, `generation-1/${course}.json`);
          fs.writeFileSync(outputFile, JSON.stringify(dataset, null, 2));
          console.log(`  💾 Saved to: ${outputFile}`);
        }
      } else {
        console.log(`  ⚠️  Course not found: ${dir}`);
      }
    }

    // Create combined dataset manifest
    const manifest = {
      generation: 1,
      created_at: new Date().toISOString(),
      total_courses: allDatasets.length,
      total_examples: totalExamples,
      courses: allDatasets.map(d => ({
        name: d.source_course,
        language: `${d.target_language} for ${d.known_language}`,
        examples: d.stats.total_examples
      })),
      notes: "Generation 1 baseline - extracted from approved course outputs. Quality will improve with corrections in future generations."
    };

    const manifestPath = path.join(__dirname, 'generation-1/manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`\n✨ Generation 1 Training Dataset Complete!`);
    console.log(`   📊 Total courses: ${allDatasets.length}`);
    console.log(`   📈 Total examples: ${totalExamples}`);
    console.log(`   💾 Manifest: ${manifestPath}`);

  } else {
    // Extract from single specified course
    console.log('🚀 Training Dataset Extractor for LEGO Extraction Skill');

    const dataset = buildDatasetFromCourse(courseDir, courseName);

    if (dataset) {
      const output = outputPath || path.join(__dirname, `generation-1/${courseName}.json`);
      fs.writeFileSync(output, JSON.stringify(dataset, null, 2));
      console.log(`\n✅ Training dataset saved to: ${output}`);
    }
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { buildDatasetFromCourse, extractLegoExample, extractFeederExample };
