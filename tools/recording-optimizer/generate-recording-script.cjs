#!/usr/bin/env node
/**
 * Recording Script Generator
 *
 * Uses the GuaranteedCoverage algorithm (greedy set cover) to find the
 * minimum set of phrases to record that covers all LEGOs for a course.
 *
 * For minority languages without TTS, this reduces recording effort by 80-90%:
 * - Instead of recording 5000+ individual phrases
 * - Record ~300-500 optimized phrases
 * - AI splice tool extracts and recombines LEGOs
 *
 * Usage:
 *   node tools/recording-optimizer/generate-recording-script.cjs <course_code>
 *   node tools/recording-optimizer/generate-recording-script.cjs spa_for_eng --output script.json
 *   node tools/recording-optimizer/generate-recording-script.cjs cym_for_eng --verbose
 *
 * Output:
 *   - Recording script with optimal phrase order
 *   - Direct record list (LEGOs that can't be spliced)
 *   - Coverage statistics
 *   - Estimated recording time
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  // Estimated seconds per phrase (natural speed recording)
  SECONDS_PER_PHRASE: 4,
  // Estimated seconds per direct LEGO recording
  SECONDS_PER_DIRECT: 3,
  // Minimum words for a phrase to be considered (short phrases splice poorly)
  MIN_PHRASE_WORDS: 2,
  // Prefer phrases from actual course content (seeds) over generated practice phrases
  PREFER_SEED_PHRASES: true,
};

// =============================================================================
// GREEDY SET COVER ALGORITHM
// =============================================================================

/**
 * Normalize text for matching:
 * - Lowercase
 * - Remove accents
 * - Normalize quotes (curly → straight)
 * - Strip punctuation
 */
function normalizeForMatching(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // Curly single quotes → straight
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // Curly double quotes → straight
    .replace(/[?!.,;:'"()[\]{}]/g, '') // Remove punctuation
    .trim();
}

/**
 * Tokenize a phrase into words (normalized)
 */
function tokenize(text) {
  return normalizeForMatching(text)
    .split(/\s+/)
    .filter(w => w.length > 0);
}

/**
 * Get all substrings (for M-type LEGO matching)
 * "quiero hablar español" → ["quiero", "hablar", "español", "quiero hablar", "hablar español", "quiero hablar español"]
 */
function getAllSubsequences(words) {
  const result = new Set();

  // Single words
  for (const w of words) {
    result.add(w);
  }

  // Multi-word subsequences (for M-type LEGOs)
  // Increased to 8 words to catch longer phrases
  for (let len = 2; len <= Math.min(words.length, 8); len++) {
    for (let start = 0; start <= words.length - len; start++) {
      result.add(words.slice(start, start + len).join(' '));
    }
  }

  return result;
}

/**
 * Greedy set cover algorithm
 *
 * @param {Set} universe - All LEGOs to cover (normalized text)
 * @param {Array} candidates - Array of { phrase, originalPhrase, covers: Set }
 * @returns {Object} { selected, uncovered, iterations }
 */
function greedySetCover(universe, candidates) {
  const uncovered = new Set(universe);
  const selected = [];
  let iterations = 0;

  while (uncovered.size > 0) {
    iterations++;

    // Find candidate covering most uncovered LEGOs
    let best = null;
    let bestCoverage = [];

    for (const candidate of candidates) {
      const coverage = [...candidate.covers].filter(c => uncovered.has(c));
      if (coverage.length > bestCoverage.length) {
        best = candidate;
        bestCoverage = coverage;
      }
    }

    // No progress possible
    if (!best || bestCoverage.length === 0) {
      break;
    }

    // Add to selected, update uncovered
    selected.push({
      phrase: best.originalPhrase,
      coversCount: bestCoverage.length,
      covers: bestCoverage,
      wordCount: tokenize(best.phrase).length,
    });

    for (const c of bestCoverage) {
      uncovered.delete(c);
    }
  }

  return { selected, uncovered, iterations };
}

// =============================================================================
// DATABASE QUERIES
// =============================================================================

async function getCourseInfo(courseCode) {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('course_code', courseCode)
    .single();

  if (error) throw new Error(`Course not found: ${courseCode}`);
  return data;
}

async function getAllLegos(courseCode) {
  const { data, error } = await supabase
    .from('course_legos')
    .select('target_text, known_text, type, is_new, seed_number, lego_index')
    .eq('course_code', courseCode)
    .eq('is_new', true);

  if (error) throw error;
  return data || [];
}

async function getAllPracticePhrases(courseCode) {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('target_text, known_text, seed_number, lego_index, position')
    .eq('course_code', courseCode);

  if (error) throw error;
  return data || [];
}

async function getAllSeeds(courseCode) {
  const { data, error } = await supabase
    .from('course_seeds')
    .select('target_text, known_text, seed_number')
    .eq('course_code', courseCode);

  if (error) throw error;
  return data || [];
}

// =============================================================================
// MAIN ALGORITHM
// =============================================================================

async function generateRecordingScript(courseCode, options = {}) {
  const { verbose = false } = options;

  console.log(`\n🎙️  Recording Script Generator`);
  console.log(`   Course: ${courseCode}`);
  console.log(`${'─'.repeat(50)}\n`);

  // 1. Get course info
  if (verbose) console.log('📚 Loading course data...');
  const course = await getCourseInfo(courseCode);

  // 2. Get all NEW LEGOs (the universe to cover)
  const legos = await getAllLegos(courseCode);
  if (legos.length === 0) {
    console.log('❌ No LEGOs found for course. Run Phase 1 & 2 first.');
    return null;
  }

  // Build universe with both normalized and original text
  // Also track which seed each LEGO came from (for source-seed coverage)
  const universe = new Map(); // normalized → original
  const legoSourceSeeds = new Map(); // normalized → seed_number (where this LEGO was first introduced)
  for (const lego of legos) {
    const normalized = normalizeForMatching(lego.target_text);
    if (!universe.has(normalized)) {
      universe.set(normalized, {
        original: lego.target_text,
        known: lego.known_text,
        type: lego.type,
        legoId: `S${String(lego.seed_number).padStart(4, '0')}L${String(lego.lego_index).padStart(2, '0')}`,
        sourceSeedNumber: lego.seed_number,
      });
      legoSourceSeeds.set(normalized, lego.seed_number);
    }
  }

  console.log(`📊 LEGOs to cover: ${universe.size}`);

  // 3. Get candidate phrases (practice phrases + seeds)
  const practicePhrases = await getAllPracticePhrases(courseCode);
  const seeds = await getAllSeeds(courseCode);

  // Deduplicate and build candidate list
  const phraseMap = new Map(); // normalized → { original, source }

  // Add seeds first (preferred)
  for (const seed of seeds) {
    const normalized = normalizeForMatching(seed.target_text);
    if (!phraseMap.has(normalized)) {
      phraseMap.set(normalized, {
        original: seed.target_text,
        known: seed.known_text,
        source: 'seed',
        seedNumber: seed.seed_number,
      });
    }
  }

  // Add practice phrases
  for (const phrase of practicePhrases) {
    const normalized = normalizeForMatching(phrase.target_text);
    if (!phraseMap.has(normalized)) {
      phraseMap.set(normalized, {
        original: phrase.target_text,
        known: phrase.known_text,
        source: 'practice',
        seedNumber: phrase.seed_number,
      });
    }
  }

  console.log(`📝 Candidate phrases: ${phraseMap.size}`);
  console.log(`   - From seeds: ${seeds.length}`);
  console.log(`   - From practice: ${practicePhrases.length}`);

  // 4. Build coverage sets for each candidate
  if (verbose) console.log('\n🔍 Computing LEGO coverage for each phrase...');

  const candidates = [];
  const universeKeys = new Set(universe.keys());

  // Build a map of seed_number → set of LEGO normalized texts that came from it
  const seedToLegos = new Map();
  for (const [normalized, seedNum] of legoSourceSeeds) {
    if (!seedToLegos.has(seedNum)) {
      seedToLegos.set(seedNum, new Set());
    }
    seedToLegos.get(seedNum).add(normalized);
  }

  for (const [normalized, phraseInfo] of phraseMap) {
    const words = tokenize(normalized);

    // Skip very short phrases
    if (words.length < CONFIG.MIN_PHRASE_WORDS) continue;

    // Get all possible LEGO extractions from this phrase
    const subsequences = getAllSubsequences(words);

    // Filter to only LEGOs in our universe
    const covers = new Set();
    for (const subseq of subsequences) {
      if (universeKeys.has(subseq)) {
        covers.add(subseq);
      }
    }

    // CRITICAL: If this is a seed phrase, it automatically covers ALL LEGOs
    // that were extracted from it (handles mutations, non-contiguous matches, etc.)
    if (phraseInfo.source === 'seed' && seedToLegos.has(phraseInfo.seedNumber)) {
      for (const legoKey of seedToLegos.get(phraseInfo.seedNumber)) {
        covers.add(legoKey);
      }
    }

    if (covers.size > 0) {
      candidates.push({
        phrase: normalized,
        originalPhrase: phraseInfo.original,
        known: phraseInfo.known,
        source: phraseInfo.source,
        seedNumber: phraseInfo.seedNumber,
        covers,
      });
    }
  }

  console.log(`🎯 Viable candidates (cover at least 1 LEGO): ${candidates.length}`);

  // 5. Run greedy set cover
  if (verbose) console.log('\n⚙️  Running GuaranteedCoverage algorithm...');

  const startTime = Date.now();
  const result = greedySetCover(universeKeys, candidates);
  const elapsed = Date.now() - startTime;

  console.log(`✅ Algorithm complete in ${elapsed}ms`);
  console.log(`   Iterations: ${result.iterations}`);

  // 6. Identify direct record items (uncovered LEGOs)
  const directRecord = [];
  for (const normalized of result.uncovered) {
    const legoInfo = universe.get(normalized);
    directRecord.push({
      target: legoInfo.original,
      known: legoInfo.known,
      type: legoInfo.type,
      legoId: legoInfo.legoId,
      reason: 'Not contained in any practice phrase',
    });
  }

  // 7. Calculate statistics
  const totalRecordings = result.selected.length + directRecord.length;
  const totalLegos = universe.size;
  const coverage = ((totalLegos - result.uncovered.size) / totalLegos * 100).toFixed(1);
  const reduction = ((1 - totalRecordings / totalLegos) * 100).toFixed(1);

  // Estimated time (rough)
  const phraseTime = result.selected.length * CONFIG.SECONDS_PER_PHRASE;
  const directTime = directRecord.length * CONFIG.SECONDS_PER_DIRECT;
  const totalSeconds = (phraseTime + directTime) * 2; // x2 for slow pass
  const estimatedMinutes = Math.ceil(totalSeconds / 60);

  // 8. Build output
  const output = {
    courseCode,
    generatedAt: new Date().toISOString(),

    statistics: {
      totalLegos,
      coveredByPhrases: totalLegos - result.uncovered.size,
      directRecordNeeded: directRecord.length,
      totalRecordings,
      coveragePercent: parseFloat(coverage),
      reductionPercent: parseFloat(reduction),
      estimatedMinutes,
      algorithmIterations: result.iterations,
    },

    recordingScript: {
      instructions: [
        'Record each phrase twice:',
        '  Pass 1: Natural speed (for prosody)',
        '  Pass 2: Slow with gaps between words (for splicing)',
        '',
        'Tips for good splices:',
        '  - Pause briefly (~200ms) between words in slow pass',
        '  - Maintain consistent volume throughout',
        '  - Keep room tone consistent (same session)',
      ],
      phrases: result.selected.map((s, i) => ({
        index: i + 1,
        target: s.phrase,
        wordCount: s.wordCount,
        coversLegos: s.coversCount,
      })),
    },

    directRecord: {
      instructions: [
        'These LEGOs do not appear in any phrase.',
        'Record them directly (both natural and slow).',
      ],
      items: directRecord,
    },
  };

  // 9. Print summary
  console.log(`\n${'═'.repeat(50)}`);
  console.log('📊 RESULTS');
  console.log('═'.repeat(50));
  console.log(`Total LEGOs:          ${totalLegos}`);
  console.log(`Phrases to record:    ${result.selected.length}`);
  console.log(`Direct record items:  ${directRecord.length}`);
  console.log(`Total recordings:     ${totalRecordings}`);
  console.log(`Coverage:             ${coverage}%`);
  console.log(`Effort reduction:     ${reduction}%`);
  console.log(`Est. recording time:  ~${estimatedMinutes} minutes (both passes)`);

  console.log(`\n📝 Top 10 phrases by coverage:`);
  for (let i = 0; i < Math.min(10, result.selected.length); i++) {
    const s = result.selected[i];
    console.log(`  ${i + 1}. "${s.phrase.slice(0, 50)}${s.phrase.length > 50 ? '...' : ''}" (${s.coversCount} LEGOs)`);
  }

  if (directRecord.length > 0) {
    console.log(`\n⚠️  Direct record items (${directRecord.length}):`);
    for (const d of directRecord.slice(0, 5)) {
      console.log(`  - "${d.target}" (${d.known})`);
    }
    if (directRecord.length > 5) {
      console.log(`  ... and ${directRecord.length - 5} more`);
    }
  }

  return output;
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Recording Script Generator - GuaranteedCoverage Algorithm

Usage:
  node generate-recording-script.cjs <course_code> [options]

Options:
  --output <file>   Write JSON output to file
  --verbose         Show detailed progress
  --help            Show this help

Examples:
  node generate-recording-script.cjs spa_for_eng
  node generate-recording-script.cjs cym_for_eng --output recording-script.json
  node generate-recording-script.cjs bre_for_eng --verbose
`);
    process.exit(0);
  }

  const courseCode = args[0];
  const verbose = args.includes('--verbose');
  const outputIdx = args.indexOf('--output');
  const outputFile = outputIdx !== -1 ? args[outputIdx + 1] : null;

  try {
    const result = await generateRecordingScript(courseCode, { verbose });

    if (result && outputFile) {
      const outputPath = path.resolve(outputFile);
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
      console.log(`\n💾 Output written to: ${outputPath}`);
    }

    console.log('\n✨ Done!\n');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

// Run CLI if called directly
if (require.main === module) {
  main();
}

// Export for API use
module.exports = { generateRecordingScript };
