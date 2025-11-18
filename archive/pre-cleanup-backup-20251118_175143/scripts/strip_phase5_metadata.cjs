#!/usr/bin/env node

/**
 * Strip Metadata from Phase 5 Output Files
 *
 * Removes redundant metadata before committing to GitHub:
 * - _metadata.whitelist_pairs (huge arrays of translation pairs)
 * - _metadata.available_whitelist_size
 * - _instructions (agent task instructions)
 * - _stats (generation statistics)
 * - Other internal/temporary fields
 *
 * Keeps only essential data needed for the app.
 *
 * Usage:
 *   node scripts/strip_phase5_metadata.cjs <input-file> [output-file]
 *   node scripts/strip_phase5_metadata.cjs --in-place <file>
 *   node scripts/strip_phase5_metadata.cjs --directory <dir>
 *
 * Examples:
 *   # Process single file to new output
 *   node scripts/strip_phase5_metadata.cjs seed_s0001.json seed_s0001_clean.json
 *
 *   # Process file in-place
 *   node scripts/strip_phase5_metadata.cjs --in-place seed_s0001.json
 *
 *   # Process all JSON files in directory
 *   node scripts/strip_phase5_metadata.cjs --directory phase5_outputs/
 */

const fs = require('fs');
const path = require('path');

// Configuration: fields to remove
const FIELDS_TO_STRIP = {
  topLevel: [
    '_instructions',  // Agent task instructions
    '_stats',        // Generation statistics
    'recent_seed_pairs', // Context data (if present)
    'recent_context' // Alternative name for context
  ],
  legoLevel: [
    'current_seed_legos_available', // Available LEGOs list
  ],
  metadataLevel: [
    'whitelist_pairs',              // HUGE array of translation pairs
    'available_whitelist_size',     // Just a count
  ]
};

/**
 * Strip metadata from a Phase 5 data structure
 */
function stripMetadata(data) {
  const cleaned = { ...data };

  // Remove top-level metadata fields
  FIELDS_TO_STRIP.topLevel.forEach(field => {
    delete cleaned[field];
  });

  // Process each LEGO
  if (cleaned.legos) {
    const cleanedLegos = {};

    for (const [legoId, legoData] of Object.entries(cleaned.legos)) {
      const cleanedLego = { ...legoData };

      // Remove LEGO-level fields
      FIELDS_TO_STRIP.legoLevel.forEach(field => {
        delete cleanedLego[field];
      });

      // Clean the _metadata object
      if (cleanedLego._metadata) {
        const cleanedMetadata = { ...cleanedLego._metadata };

        // Remove metadata-level fields
        FIELDS_TO_STRIP.metadataLevel.forEach(field => {
          delete cleanedMetadata[field];
        });

        cleanedLego._metadata = cleanedMetadata;
      }

      cleanedLegos[legoId] = cleanedLego;
    }

    cleaned.legos = cleanedLegos;
  }

  // Process baskets (alternative structure in merged files)
  if (cleaned.baskets) {
    const cleanedBaskets = {};

    for (const [basketId, basketData] of Object.entries(cleaned.baskets)) {
      const cleanedBasket = { ...basketData };

      // Remove LEGO-level fields (same as legos)
      FIELDS_TO_STRIP.legoLevel.forEach(field => {
        delete cleanedBasket[field];
      });

      // Clean the _metadata object
      if (cleanedBasket._metadata) {
        const cleanedMetadata = { ...cleanedBasket._metadata };

        // Remove metadata-level fields
        FIELDS_TO_STRIP.metadataLevel.forEach(field => {
          delete cleanedMetadata[field];
        });

        cleanedBasket._metadata = cleanedMetadata;
      }

      cleanedBaskets[basketId] = cleanedBasket;
    }

    cleaned.baskets = cleanedBaskets;
  }

  return cleaned;
}

/**
 * Calculate size reduction
 */
function calculateSizeReduction(original, cleaned) {
  const originalSize = JSON.stringify(original).length;
  const cleanedSize = JSON.stringify(cleaned).length;
  const reduction = originalSize - cleanedSize;
  const percentage = ((reduction / originalSize) * 100).toFixed(1);

  return {
    originalSize,
    cleanedSize,
    reduction,
    percentage
  };
}

/**
 * Process a single file
 */
function processFile(inputPath, outputPath, inPlace = false) {
  console.log(`\n📄 Processing: ${inputPath}`);

  // Read and parse
  let data;
  try {
    const content = fs.readFileSync(inputPath, 'utf-8');
    data = JSON.parse(content);
  } catch (error) {
    console.error(`   ❌ Failed to read/parse file: ${error.message}`);
    return false;
  }

  // Strip metadata
  const cleaned = stripMetadata(data);

  // Calculate size reduction
  const stats = calculateSizeReduction(data, cleaned);

  console.log(`   Original size: ${(stats.originalSize / 1024).toFixed(1)}KB`);
  console.log(`   Cleaned size:  ${(stats.cleanedSize / 1024).toFixed(1)}KB`);
  console.log(`   Reduction:     ${(stats.reduction / 1024).toFixed(1)}KB (${stats.percentage}%)`);

  // Write output
  const finalOutputPath = inPlace ? inputPath : outputPath;
  try {
    fs.writeFileSync(finalOutputPath, JSON.stringify(cleaned, null, 2));
    console.log(`   ✅ Wrote cleaned file: ${finalOutputPath}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to write file: ${error.message}`);
    return false;
  }
}

/**
 * Process all JSON files in a directory
 */
function processDirectory(dirPath) {
  console.log(`\n📁 Processing directory: ${dirPath}`);

  if (!fs.existsSync(dirPath)) {
    console.error(`   ❌ Directory not found: ${dirPath}`);
    return false;
  }

  const files = fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(dirPath, f));

  if (files.length === 0) {
    console.log(`   ⚠️  No JSON files found in directory`);
    return false;
  }

  console.log(`   Found ${files.length} JSON files`);

  let successCount = 0;
  let totalReduction = 0;

  files.forEach(file => {
    const result = processFile(file, file, true); // In-place for directory mode
    if (result) successCount++;
  });

  console.log(`\n✅ Processed ${successCount}/${files.length} files successfully`);

  return true;
}

/**
 * Main entry point
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(fs.readFileSync(__filename, 'utf-8').split('\n').slice(2, 23).join('\n'));
    process.exit(0);
  }

  // Directory mode
  if (args[0] === '--directory' || args[0] === '-d') {
    if (args.length < 2) {
      console.error('❌ Error: --directory requires a directory path');
      process.exit(1);
    }
    processDirectory(args[1]);
    return;
  }

  // In-place mode
  if (args[0] === '--in-place' || args[0] === '-i') {
    if (args.length < 2) {
      console.error('❌ Error: --in-place requires a file path');
      process.exit(1);
    }
    processFile(args[1], null, true);
    return;
  }

  // Single file mode
  if (args.length < 1) {
    console.error('❌ Error: No input file specified');
    console.error('Usage: node scripts/strip_phase5_metadata.cjs <input-file> [output-file]');
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1] || inputFile.replace('.json', '_clean.json');

  processFile(inputFile, outputFile, args.length === 1);
}

// Run
main();
