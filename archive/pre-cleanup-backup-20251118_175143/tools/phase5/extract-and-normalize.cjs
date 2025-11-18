#!/usr/bin/env node
/**
 * Extract and Normalize Phase 5 Baskets
 *
 * Reads baskets from staging directory, detects format, normalizes to standard structure.
 * Safe operation - never touches canon lego_baskets.json
 *
 * Usage:
 *   node tools/phase5/extract-and-normalize.cjs <course>
 *   node tools/phase5/extract-and-normalize.cjs cmn_for_eng
 */

const fs = require('fs');
const path = require('path');

// Parse command line args
const course = process.argv[2];

if (!course) {
  console.error('Usage: node extract-and-normalize.cjs <course>');
  console.error('Example: node extract-and-normalize.cjs cmn_for_eng');
  process.exit(1);
}

const STAGING_DIR = path.join(__dirname, '../../public/vfs/courses', course, 'phase5_baskets_staging');
const OUTPUT_PATH = path.join(__dirname, '../../public/vfs/courses', course, 'phase5_baskets_normalized.json');

console.log('=== Phase 5 Extract and Normalize ===\n');
console.log(`Course: ${course}`);
console.log(`Staging: ${STAGING_DIR}`);
console.log(`Output: ${OUTPUT_PATH}\n`);

// Check staging directory exists
if (!fs.existsSync(STAGING_DIR)) {
  console.error(`❌ Staging directory not found: ${STAGING_DIR}`);
  process.exit(1);
}

// Get all JSON files from staging
const files = fs.readdirSync(STAGING_DIR)
  .filter(f => f.endsWith('.json') && f !== '.gitignore');

console.log(`📁 Found ${files.length} files in staging\n`);

if (files.length === 0) {
  console.log('⚠️  No files to process');
  process.exit(0);
}

// Track statistics
const stats = {
  filesProcessed: 0,
  filesSkipped: 0,
  basketsExtracted: 0,
  duplicates: 0,
  validationErrors: 0,
  formats: {
    'data.legos (object)': 0,
    'data.baskets (array)': 0,
    'data.baskets (object)': 0,
    'top-level LEGOs': 0,
    'consolidated format': 0,
    'unknown': 0
  }
};

// Store all extracted baskets
const allBaskets = {};

// Process each file
for (const filename of files) {
  const filePath = path.join(STAGING_DIR, filename);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    let extractedCount = 0;
    let format = 'unknown';

    // Check for top-level LEGO IDs FIRST (most specific)
    const legoIdPattern = /^S\d{4}L\d{2}$/;
    const topLevelKeys = Object.keys(data).filter(k => legoIdPattern.test(k));

    // Format 1: Top-level LEGO IDs
    if (topLevelKeys.length > 0) {
      format = 'top-level LEGOs';

      for (const legoId of topLevelKeys) {
        const legoData = data[legoId];

        // Must have practice_phrases
        if (legoData && legoData.practice_phrases && Array.isArray(legoData.practice_phrases)) {
          const basket = {
            lego: legoData.lego,
            type: legoData.type,
            practice_phrases: legoData.practice_phrases
          };

          if (validateBasket(legoId, basket)) {
            if (allBaskets[legoId]) {
              stats.duplicates++;
            } else {
              allBaskets[legoId] = normalizeBasket(basket);
              extractedCount++;
            }
          } else {
            stats.validationErrors++;
          }
        }
      }
    }
    // Format 2: Consolidated format (baskets at top level)
    else if (data.baskets && typeof data.baskets === 'object' && !Array.isArray(data.baskets)) {
      format = 'consolidated format';

      for (const [legoId, basket] of Object.entries(data.baskets)) {
        if (validateBasket(legoId, basket)) {
          if (allBaskets[legoId]) {
            stats.duplicates++;
          } else {
            allBaskets[legoId] = normalizeBasket(basket);
            extractedCount++;
          }
        } else {
          stats.validationErrors++;
        }
      }
    }
    // Format 3: data.legos (object with basket data)
    else if (data.legos && typeof data.legos === 'object' && !Array.isArray(data.legos)) {
      format = 'data.legos (object)';

      for (const [legoId, legoData] of Object.entries(data.legos)) {
        if (legoData.practice_phrases && Array.isArray(legoData.practice_phrases)) {
          const basket = {
            lego: legoData.lego,
            type: legoData.type,
            practice_phrases: legoData.practice_phrases
          };

          if (validateBasket(legoId, basket)) {
            if (allBaskets[legoId]) {
              stats.duplicates++;
            } else {
              allBaskets[legoId] = normalizeBasket(basket);
              extractedCount++;
            }
          } else {
            stats.validationErrors++;
          }
        }
      }
    }
    // Format 4: data.baskets (array)
    else if (data.baskets && Array.isArray(data.baskets)) {
      format = 'data.baskets (array)';

      for (const basket of data.baskets) {
        const legoId = basket.lego_id || basket.id;
        if (!legoId) continue;

        const normalizedBasket = {
          lego: basket.lego || basket.lego_pair,
          type: basket.type,
          practice_phrases: basket.practice_phrases
        };

        if (validateBasket(legoId, normalizedBasket)) {
          if (allBaskets[legoId]) {
            stats.duplicates++;
          } else {
            allBaskets[legoId] = normalizeBasket(normalizedBasket);
            extractedCount++;
          }
        } else {
          stats.validationErrors++;
        }
      }
    }

    if (extractedCount > 0) {
      stats.filesProcessed++;
      stats.basketsExtracted += extractedCount;
      stats.formats[format]++;
      process.stdout.write(`✅ ${filename}: ${extractedCount} baskets (${format})\n`);
    } else {
      stats.filesSkipped++;
      process.stdout.write(`⚠️  ${filename}: No baskets extracted (${format})\n`);
    }

  } catch (error) {
    stats.filesSkipped++;
    console.error(`❌ ${filename}: ${error.message}`);
  }
}

console.log('\n=== Extraction Complete ===\n');
console.log(`Files processed: ${stats.filesProcessed}`);
console.log(`Files skipped: ${stats.filesSkipped}`);
console.log(`Baskets extracted: ${stats.basketsExtracted}`);
console.log(`Duplicates found: ${stats.duplicates}`);
console.log(`Validation errors: ${stats.validationErrors}`);
console.log('\nFormat distribution:');
for (const [format, count] of Object.entries(stats.formats)) {
  if (count > 0) {
    console.log(`  ${format}: ${count} files`);
  }
}

// Write normalized output
const output = {
  course: course,
  extracted_at: new Date().toISOString(),
  source_files: stats.filesProcessed,
  total_baskets: Object.keys(allBaskets).length,
  duplicates_removed: stats.duplicates,
  validation_errors: stats.validationErrors,
  baskets: allBaskets
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

console.log('\n=== Normalization Complete ===\n');
console.log(`✅ Saved ${Object.keys(allBaskets).length} normalized baskets`);
console.log(`📄 Output: ${OUTPUT_PATH}`);
console.log(`💾 Size: ${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1)} KB`);
console.log('\nNext step: node tools/phase5/preview-merge.cjs ' + course);

/**
 * Validate basket structure
 */
function validateBasket(legoId, basket) {
  // Check LEGO ID format
  if (!/^S\d{4}L\d{2}$/.test(legoId)) {
    return false;
  }

  // Must have practice_phrases
  if (!basket.practice_phrases || !Array.isArray(basket.practice_phrases)) {
    return false;
  }

  // Must have at least one phrase
  if (basket.practice_phrases.length === 0) {
    return false;
  }

  // Each phrase should be an array with [known, target, null, level]
  for (const phrase of basket.practice_phrases) {
    if (!Array.isArray(phrase) || phrase.length < 2) {
      return false;
    }
  }

  return true;
}

/**
 * Normalize basket to standard format
 */
function normalizeBasket(basket) {
  return {
    lego: basket.lego,
    type: basket.type,
    practice_phrases: basket.practice_phrases
  };
}
