#!/usr/bin/env node

/**
 * Transform Dashboard Output to Learning App v2 Manifest
 *
 * Converts Phase 2/3 outputs (lego_pairs.json, lego_baskets.json) into the
 * simplified CourseManifest format expected by ssi-learning-app.
 *
 * Input Files:
 *   - lego_pairs.json: Seeds with LEGOs (from Phase 2)
 *   - lego_baskets.json: Practice baskets (from Phase 3)
 *   - s3_durations.json: Audio durations from S3
 *   - samples_database/voices/[voice_id]/samples.json: MAR (Master Audio Registry)
 *
 * Output:
 *   - course_manifest_v2.json: Simplified manifest for learning app
 *
 * Usage:
 *   node tools/generators/transform-to-v2-manifest.cjs <course_code> [--dry-run]
 *
 * Example:
 *   node tools/generators/transform-to-v2-manifest.cjs spa_for_eng
 *   node tools/generators/transform-to-v2-manifest.cjs spa_for_eng --dry-run
 */

const fs = require('fs-extra');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const COURSE_TITLES = {
  'spa_for_eng': 'Spanish for English Speakers',
  'cmn_for_eng': 'Mandarin for English Speakers',
  'ita_for_eng': 'Italian for English Speakers',
  'fra_for_eng': 'French for English Speakers',
  'bre_for_eng': 'Breton for English Speakers',
  'eng_for_cmn': 'English for Mandarin Speakers'
};

const LANGUAGE_CODE_MAP = {
  'spa': 'es',
  'cmn': 'zh',
  'ita': 'it',
  'fra': 'fr',
  'bre': 'br',
  'eng': 'en'
};

const S3_BASE_URL = 'https://popty-bach-lfs.s3.eu-west-1.amazonaws.com/courses';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert 3-letter language code to ISO 639-1 (2-letter)
 */
function toISO6391(code) {
  return LANGUAGE_CODE_MAP[code] || code;
}

/**
 * Parse course code into language components
 */
function parseCourseCode(courseCode) {
  const parts = courseCode.split('_for_');
  if (parts.length !== 2) {
    throw new Error(`Invalid course code format: ${courseCode}`);
  }
  return {
    target: parts[0],
    known: parts[1],
    target_iso: toISO6391(parts[0]),
    known_iso: toISO6391(parts[1])
  };
}

/**
 * Build S3 URL for audio file
 */
function buildS3Url(courseCode, uuid) {
  return `${S3_BASE_URL}/${courseCode}/audio/${uuid}.mp3`;
}

/**
 * Load MAR (Master Audio Registry) from samples database
 * Optimized to create a text→UUID lookup index for faster searching
 */
function loadMAR(rootDir, targetLang, knownLang) {
  const samplesDir = path.join(rootDir, 'samples_database', 'voices');
  const textIndex = {}; // text.toLowerCase() → [{ uuid, voiceId, sample }]

  if (!fs.existsSync(samplesDir)) {
    console.warn('⚠️  MAR not found - audio references will be null');
    return textIndex;
  }

  const voiceDirs = fs.readdirSync(samplesDir);

  for (const voiceDir of voiceDirs) {
    const samplesFile = path.join(samplesDir, voiceDir, 'samples.json');
    if (fs.existsSync(samplesFile)) {
      const stats = fs.statSync(samplesFile);
      const sizeMB = Math.round(stats.size / 1024 / 1024);

      // Skip very large files that aren't relevant to this course
      if (sizeMB > 10 && !voiceDir.includes(targetLang) && !voiceDir.includes(knownLang)) {
        console.log(`   ⏭️  Skipping ${voiceDir} (${sizeMB}MB, not relevant to ${targetLang}/${knownLang})`);
        continue;
      }

      console.log(`   📖 Reading ${voiceDir} (${sizeMB}MB)...`);

      const voiceData = JSON.parse(fs.readFileSync(samplesFile, 'utf8'));
      const voiceId = voiceData.voice_id || voiceDir;
      let indexedCount = 0;

      // Build text index for faster lookups
      if (voiceData.samples) {
        Object.entries(voiceData.samples).forEach(([uuid, sample]) => {
          const key = `${sample.text.toLowerCase().trim()}|${sample.language}|${sample.role}|${sample.cadence}`;

          if (!textIndex[key]) {
            textIndex[key] = [];
          }

          textIndex[key].push({
            uuid,
            voiceId,
            sample: {
              text: sample.text,
              language: sample.language,
              role: sample.role,
              cadence: sample.cadence,
              duration: sample.duration
            }
          });
          indexedCount++;
        });
      }

      console.log(`      ✓ Indexed ${indexedCount} samples`);
    }
  }

  return textIndex;
}

/**
 * Load S3 durations
 */
function loadS3Durations(courseDir) {
  const durationsFile = path.join(courseDir, 's3_durations.json');
  if (!fs.existsSync(durationsFile)) {
    console.warn('⚠️  s3_durations.json not found - using MAR durations only');
    return {};
  }

  const data = JSON.parse(fs.readFileSync(durationsFile, 'utf8'));
  return data.durations || {};
}

/**
 * Find audio UUID from MAR text index
 */
function findAudioUUID(textIndex, text, language, role, cadence = 'slow') {
  // Build lookup key
  const key = `${text.toLowerCase().trim()}|${language}|${role}|${cadence}`;

  const matches = textIndex[key];
  if (!matches || matches.length === 0) {
    return null;
  }

  // Return first match
  const match = matches[0];
  return {
    uuid: match.uuid,
    duration: match.sample.duration
  };
}

/**
 * Get audio references for a language pair
 */
function getAudioRefs(textIndex, s3Durations, courseCode, languagePair, targetLang, knownLang) {
  if (!textIndex || Object.keys(textIndex).length === 0) {
    return null; // No MAR available
  }

  // MAR uses 'source' for known language, not 'known'
  // MAR language codes are inconsistent:
  //   - English uses "en" (ISO 639-1)
  //   - Spanish uses "spa" (ISO 639-3)
  // So we use the 3-letter codes for target, 2-letter for known
  const knownLangMAR = toISO6391(knownLang); // Convert eng→en
  const targetLangMAR = targetLang; // Keep spa as-is

  const knownAudio = findAudioUUID(textIndex, languagePair.known, knownLangMAR, 'source', 'natural');

  // Find target language audio (voice1 and voice2)
  const targetAudio1 = findAudioUUID(textIndex, languagePair.target, targetLangMAR, 'target1', 'slow');
  const targetAudio2 = findAudioUUID(textIndex, languagePair.target, targetLangMAR, 'target2', 'slow');

  // If any required audio is missing, return null
  if (!knownAudio || !targetAudio1 || !targetAudio2) {
    return null;
  }

  return {
    known: {
      id: knownAudio.uuid,
      url: buildS3Url(courseCode, knownAudio.uuid),
      duration_ms: Math.round((s3Durations[knownAudio.uuid] || knownAudio.duration || 0) * 1000)
    },
    target: {
      voice1: {
        id: targetAudio1.uuid,
        url: buildS3Url(courseCode, targetAudio1.uuid),
        duration_ms: Math.round((s3Durations[targetAudio1.uuid] || targetAudio1.duration || 0) * 1000)
      },
      voice2: {
        id: targetAudio2.uuid,
        url: buildS3Url(courseCode, targetAudio2.uuid),
        duration_ms: Math.round((s3Durations[targetAudio2.uuid] || targetAudio2.duration || 0) * 1000)
      }
    }
  };
}

/**
 * Count total audio references in manifest
 */
function countAudioRefs(seeds) {
  let count = 0;

  for (const seed of seeds) {
    if (seed.audioRefs) count += 3; // known + target voice1 + voice2

    for (const lego of seed.legos) {
      if (lego.audioRefs) count += 3;

      if (lego.components) {
        for (const comp of lego.components) {
          if (comp.audioRefs) count += 3;
        }
      }
    }
  }

  return count;
}

/**
 * Calculate estimated hours based on audio count
 */
function estimateHours(audioCount) {
  // Rough estimate: 3 seconds avg per audio = 10 hours per 12,000 audio files
  const avgDurationSec = 3;
  const totalSeconds = audioCount * avgDurationSec;
  return Math.round(totalSeconds / 3600);
}

// ============================================================================
// MAIN TRANSFORMATION
// ============================================================================

/**
 * Transform dashboard output to v2 manifest
 */
function transformToV2Manifest(courseCode, rootDir, courseDir, options = {}) {
  console.log('\n🔄 Starting transformation to v2 manifest...\n');

  const langs = parseCourseCode(courseCode);

  // Load input files
  console.log('📂 Loading input files...');

  const legoPairsFile = path.join(courseDir, 'lego_pairs.json');
  const legoBasketsFile = path.join(courseDir, 'lego_baskets.json');

  if (!fs.existsSync(legoPairsFile)) {
    throw new Error(`lego_pairs.json not found at: ${legoPairsFile}`);
  }

  if (!fs.existsSync(legoBasketsFile)) {
    throw new Error(`lego_baskets.json not found at: ${legoBasketsFile}`);
  }

  const legoPairsData = JSON.parse(fs.readFileSync(legoPairsFile, 'utf8'));
  const legoBasketsData = JSON.parse(fs.readFileSync(legoBasketsFile, 'utf8'));

  console.log(`   ✓ Loaded ${legoPairsData.seeds.length} seeds from lego_pairs.json`);
  console.log(`   ✓ Loaded ${Object.keys(legoBasketsData.baskets).length} baskets from lego_baskets.json`);

  // Load MAR and durations
  console.log('\n🎵 Loading audio metadata...');
  const textIndex = loadMAR(rootDir, langs.target, langs.known);
  const s3Durations = loadS3Durations(courseDir);

  console.log(`   ✓ Indexed ${Object.keys(textIndex).length} unique audio entries from MAR`);
  console.log(`   ✓ Loaded ${Object.keys(s3Durations).length} durations from S3`);

  // Transform seeds
  console.log('\n🔨 Transforming seeds...');

  const transformedSeeds = [];
  let audioFoundCount = 0;
  let audioMissingCount = 0;

  for (const seed of legoPairsData.seeds) {
    // Get audio refs for seed
    const seedAudioRefs = getAudioRefs(
      textIndex,
      s3Durations,
      courseCode,
      seed.seed_pair,
      langs.target,
      langs.known
    );

    if (seedAudioRefs) audioFoundCount++;
    else audioMissingCount++;

    // Transform LEGOs
    const transformedLegos = [];

    for (const lego of seed.legos) {
      // Get audio refs for LEGO
      const legoAudioRefs = getAudioRefs(
        textIndex,
        s3Durations,
        courseCode,
        lego.lego,
        langs.target,
        langs.known
      );

      if (legoAudioRefs) audioFoundCount++;
      else audioMissingCount++;

      const transformedLego = {
        id: lego.id,
        type: lego.type,
        new: lego.new,
        lego: lego.lego,
        audioRefs: legoAudioRefs
      };

      // Add components for M-type LEGOs
      if (lego.type === 'M' && lego.components) {
        transformedLego.components = lego.components.map(comp => ({
          ...comp,
          audioRefs: getAudioRefs(textIndex, s3Durations, courseCode, comp, langs.target, langs.known)
        }));
      }

      transformedLegos.push(transformedLego);
    }

    transformedSeeds.push({
      seed_id: seed.seed_id,
      seed_pair: seed.seed_pair,
      legos: transformedLegos,
      audioRefs: seedAudioRefs
    });
  }

  console.log(`   ✓ Transformed ${transformedSeeds.length} seeds`);
  console.log(`   ✓ Found audio for ${audioFoundCount} items`);
  console.log(`   ✓ Missing audio for ${audioMissingCount} items`);

  // Build manifest
  console.log('\n📦 Building manifest...');

  const audioCount = countAudioRefs(transformedSeeds);
  const estimatedHours = estimateHours(audioCount);

  const manifest = {
    course_id: courseCode,
    title: COURSE_TITLES[courseCode] || courseCode,
    known_language: langs.known_iso,
    target_language: langs.target_iso,
    version: '2.0.0',
    generated_at: new Date().toISOString(),
    seeds: transformedSeeds,
    audio_count: audioCount,
    estimated_hours: estimatedHours
  };

  console.log(`   ✓ Course: ${manifest.title}`);
  console.log(`   ✓ Languages: ${manifest.known_language} → ${manifest.target_language}`);
  console.log(`   ✓ Total audio references: ${audioCount}`);
  console.log(`   ✓ Estimated hours: ${estimatedHours}h`);

  return manifest;
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Transform Dashboard Output to Learning App v2 Manifest

Usage:
  node tools/generators/transform-to-v2-manifest.cjs <course_code> [options]

Options:
  --dry-run    Preview transformation without writing file
  --help       Show this help message

Examples:
  node tools/generators/transform-to-v2-manifest.cjs spa_for_eng
  node tools/generators/transform-to-v2-manifest.cjs spa_for_eng --dry-run

Course Codes:
  spa_for_eng  Spanish for English Speakers
  cmn_for_eng  Mandarin for English Speakers
  ita_for_eng  Italian for English Speakers
  fra_for_eng  French for English Speakers
    `);
    process.exit(0);
  }

  const courseCode = args[0];
  const isDryRun = args.includes('--dry-run');

  const rootDir = path.resolve(__dirname, '../..');
  const courseDir = path.join(rootDir, 'public/vfs/courses', courseCode);

  if (!fs.existsSync(courseDir)) {
    console.error(`❌ Course directory not found: ${courseDir}`);
    process.exit(1);
  }

  try {
    const manifest = transformToV2Manifest(courseCode, rootDir, courseDir);

    // Output file
    const outputFile = path.join(courseDir, 'course_manifest_v2.json');

    if (isDryRun) {
      console.log('\n📋 DRY RUN - Manifest preview:');
      console.log(JSON.stringify(manifest, null, 2).substring(0, 1000) + '...\n');
      console.log(`Would write to: ${outputFile}`);
      console.log(`File size: ~${Math.round(JSON.stringify(manifest).length / 1024)}KB`);
    } else {
      // Write manifest
      fs.writeFileSync(outputFile, JSON.stringify(manifest, null, 2));

      const stats = fs.statSync(outputFile);
      console.log(`\n✅ Transformation complete!`);
      console.log(`   📄 Output: ${outputFile}`);
      console.log(`   📊 Size: ${Math.round(stats.size / 1024)}KB`);
      console.log(`   🎵 Audio refs: ${manifest.audio_count}`);
    }

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { transformToV2Manifest };
