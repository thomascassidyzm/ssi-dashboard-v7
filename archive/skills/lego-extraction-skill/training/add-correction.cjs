#!/usr/bin/env node

/**
 * Correction Capture Script for LEGO Extraction Skill
 *
 * Purpose: Capture human corrections to LEGO extractions and add to training dataset
 *
 * This script is the foundation of the AI OS self-learning loop:
 * - Human reviews LEGO extractions
 * - Identifies errors (FCFS violations, wrong classification, etc.)
 * - Provides correction with reasoning
 * - System learns from correction
 * - Same error won't recur in next generation
 *
 * Usage:
 *   node add-correction.cjs \
 *     --course spa_for_eng_30seeds \
 *     --seed S0005 \
 *     --before '{"lego_id":"S0005L01","known_chunk":"I am","target_chunk":"Soy","lego_type":"BASE"}' \
 *     --after '{"lego_id":"S0005L01","known_chunk":"I am a teacher","target_chunk":"Soy un profesor","lego_type":"COMPOSITE","componentization":"..."}' \
 *     --reason "FCFS violation: 'I am' already mapped to 'Estoy' in S0001. Chunked up with context." \
 *     --error-type "FCFS_VIOLATION"
 */

const fs = require('fs');
const path = require('path');

/**
 * Error type taxonomy for tracking correction patterns
 */
const ERROR_TYPES = {
  FCFS_VIOLATION: "Known chunk mapped to different target (FCFS conflict)",
  FD_VIOLATION: "Known chunk is not functionally deterministic",
  WRONG_CLASSIFICATION: "Incorrect BASE/COMPOSITE/FEEDER classification",
  MISSING_COMPONENTIZATION: "COMPOSITE LEGO missing componentization field",
  INVALID_COMPONENTIZATION: "Componentization format or content incorrect",
  WRONG_CHUNKING: "Chunk boundaries incorrect (too large/small)",
  MISSING_FEEDER: "COMPOSITE missing required FEEDER extraction",
  PEDAGOGICAL_ISSUE: "Valid technically but poor pedagogical choice"
};

/**
 * Create correction training example
 */
function createCorrectionExample(seedId, seedContext, before, after, reason, errorType) {
  return {
    input: {
      seed_id: seedId,
      target: seedContext.target || "",
      known: seedContext.known || "",
      task: "Extract LEGO and classify",
      context: {
        target_language: seedContext.target_language || "Spanish",
        known_language: seedContext.known_language || "English"
      },
      incorrect_output: before // Show model what it did wrong
    },
    output: after, // Show correct extraction
    reasoning: reason,
    metadata: {
      correction_type: "human_review",
      error_type: errorType,
      corrected_at: new Date().toISOString(),
      learning_priority: "high" // Corrections are high-priority training data
    }
  };
}

/**
 * Add correction to course training dataset
 */
function addCorrectionToCourse(courseName, correction) {
  // Find the course training file
  const generationDir = path.join(__dirname, 'generation-1');
  const courseFile = path.join(generationDir, `${courseName}.json`);

  if (!fs.existsSync(courseFile)) {
    console.error(`❌ Course training file not found: ${courseFile}`);
    return false;
  }

  // Load existing dataset
  const dataset = JSON.parse(fs.readFileSync(courseFile, 'utf-8'));

  // Add correction to examples
  dataset.examples.push(correction);

  // Update stats
  dataset.stats.total_examples = dataset.examples.length;
  dataset.stats.corrections = (dataset.stats.corrections || 0) + 1;

  // Add generation notes if not present
  if (!dataset.corrections_added) {
    dataset.corrections_added = [];
  }
  dataset.corrections_added.push({
    date: new Date().toISOString(),
    error_type: correction.metadata.error_type,
    seed_id: correction.input.seed_id
  });

  // Save updated dataset
  fs.writeFileSync(courseFile, JSON.stringify(dataset, null, 2));

  return true;
}

/**
 * Update manifest with correction stats
 */
function updateManifest(courseName) {
  const manifestPath = path.join(__dirname, 'generation-1/manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ Manifest not found: ${manifestPath}`);
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  // Update course stats
  const courseEntry = manifest.courses.find(c => c.name === courseName);
  if (courseEntry) {
    // Recalculate from course file
    const courseFile = path.join(__dirname, 'generation-1', `${courseName}.json`);
    const dataset = JSON.parse(fs.readFileSync(courseFile, 'utf-8'));

    courseEntry.examples = dataset.stats.total_examples;
    courseEntry.corrections = dataset.stats.corrections || 0;
  }

  // Recalculate total examples
  manifest.total_examples = manifest.courses.reduce((sum, c) => sum + c.examples, 0);
  manifest.total_corrections = manifest.courses.reduce((sum, c) => sum + (c.corrections || 0), 0);

  // Update notes
  if (manifest.total_corrections > 0) {
    manifest.notes = `Generation 1 baseline with ${manifest.total_corrections} human corrections applied. Quality improves with each correction.`;
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  let courseName = null;
  let seedId = null;
  let beforeJSON = null;
  let afterJSON = null;
  let reason = null;
  let errorType = null;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--course' && i + 1 < args.length) {
      courseName = args[i + 1];
      i++;
    } else if (args[i] === '--seed' && i + 1 < args.length) {
      seedId = args[i + 1];
      i++;
    } else if (args[i] === '--before' && i + 1 < args.length) {
      beforeJSON = args[i + 1];
      i++;
    } else if (args[i] === '--after' && i + 1 < args.length) {
      afterJSON = args[i + 1];
      i++;
    } else if (args[i] === '--reason' && i + 1 < args.length) {
      reason = args[i + 1];
      i++;
    } else if (args[i] === '--error-type' && i + 1 < args.length) {
      errorType = args[i + 1];
      i++;
    } else if (args[i] === '--help') {
      console.log(`
Correction Capture Script for LEGO Extraction Skill

Usage:
  node add-correction.cjs \\
    --course spa_for_eng_30seeds \\
    --seed S0005 \\
    --before '{"lego_id":"S0005L01","known_chunk":"I am","target_chunk":"Soy","lego_type":"BASE"}' \\
    --after '{"lego_id":"S0005L01","known_chunk":"I am a teacher","target_chunk":"Soy un profesor","lego_type":"COMPOSITE"}' \\
    --reason "FCFS violation: 'I am' already mapped to 'Estoy' in S0001" \\
    --error-type FCFS_VIOLATION

Error types:
${Object.entries(ERROR_TYPES).map(([k, v]) => `  ${k}: ${v}`).join('\n')}
      `);
      return;
    }
  }

  // Validate required arguments
  if (!courseName || !seedId || !beforeJSON || !afterJSON || !reason || !errorType) {
    console.error('❌ Missing required arguments. Use --help for usage.');
    return;
  }

  // Validate error type
  if (!ERROR_TYPES[errorType]) {
    console.error(`❌ Invalid error type: ${errorType}`);
    console.error(`Valid types: ${Object.keys(ERROR_TYPES).join(', ')}`);
    return;
  }

  // Parse JSON
  let before, after;
  try {
    before = JSON.parse(beforeJSON);
    after = JSON.parse(afterJSON);
  } catch (e) {
    console.error('❌ Invalid JSON in --before or --after');
    console.error(e.message);
    return;
  }

  console.log('🔧 Adding correction to training dataset...\n');
  console.log(`Course: ${courseName}`);
  console.log(`Seed: ${seedId}`);
  console.log(`Error Type: ${errorType}`);
  console.log('\nBEFORE (incorrect):');
  console.log(JSON.stringify(before, null, 2));
  console.log('\nAFTER (correct):');
  console.log(JSON.stringify(after, null, 2));
  console.log(`\nReasoning: ${reason}\n`);

  // Load seed context from course
  const courseDir = path.join(__dirname, '../../../vfs/courses', courseName);
  const breakdownsPath = path.join(courseDir, 'LEGO_BREAKDOWNS_COMPLETE.json');
  const translationsPath = path.join(courseDir, 'translations.json');

  let seedContext = {
    target: "",
    known: "",
    target_language: "Spanish",
    known_language: "English"
  };

  // Try to get seed context
  if (fs.existsSync(translationsPath)) {
    const translations = JSON.parse(fs.readFileSync(translationsPath, 'utf-8'));
    if (translations[seedId]) {
      seedContext.target = translations[seedId][0] || "";
      seedContext.known = translations[seedId][1] || "";
    }
  }

  if (fs.existsSync(breakdownsPath)) {
    const breakdowns = JSON.parse(fs.readFileSync(breakdownsPath, 'utf-8'));
    seedContext.target_language = breakdowns.course_metadata?.target_language || "Spanish";
    seedContext.known_language = breakdowns.course_metadata?.known_language || "English";
  }

  // Create correction example
  const correction = createCorrectionExample(seedId, seedContext, before, after, reason, errorType);

  // Add to course dataset
  if (addCorrectionToCourse(courseName, correction)) {
    console.log('✅ Correction added to course dataset');

    // Update manifest
    updateManifest(courseName);
    console.log('✅ Manifest updated');

    console.log('\n🎯 System learned from this correction!');
    console.log('   Next generation will apply this pattern automatically.');
  } else {
    console.error('❌ Failed to add correction');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createCorrectionExample, addCorrectionToCourse, ERROR_TYPES };
