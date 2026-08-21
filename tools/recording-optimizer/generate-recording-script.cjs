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
// The chunk floor lives with the engine's chunker so the two copies of the
// tiling logic (this planner and services/voice-engine/chunking.cjs) cannot
// drift on the one number a recordist actually hears. See SHORT_CHUNK_CHARS
// there for the calibration behind it.
const { mergeShortChunks } = require('../../services/voice-engine/chunking.cjs');

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
 * Merge glue chunks (words not covered by a LEGO) into adjacent LEGO chunks.
 *
 * Short glue words (pronouns, articles, particles) are splice-hostile because
 * they're brief, heavily coarticulated, and have no stable acoustic target.
 * Merging them into neighbouring LEGO chunks means the speaker says them
 * without a preceding/following pause, producing bigger, easier-to-splice units.
 *
 * Direction: left-attach by default (glue joins the previous LEGO). If glue
 * appears at the start of the phrase with no previous LEGO, it attaches to
 * the next (right) LEGO instead. Consecutive glue words group together.
 *
 * The LEGO identity is preserved — the merged chunk still carries the legoId
 * of the LEGO it absorbs into. Glue tokens are tracked separately in
 * `mergedGlue` for downstream tools that need to recover the true boundary.
 *
 * @param {Array} chunks - Output of chunkPhraseByLegos
 * @param {string} direction - 'left' (default) or 'right'
 * @returns {Array} merged chunks — each carries a LEGO id and may include glue
 */
function mergeGlueIntoLegos(chunks, direction = 'left') {
  if (chunks.length === 0) return chunks;
  // If the phrase is all glue (no LEGOs), nothing to merge into. Return as-is.
  if (chunks.every(c => !c.isLego)) return chunks;

  const result = [];
  let pendingGlue = [];  // glue tokens waiting for a LEGO to attach to

  const flushLeading = (legoChunk) => {
    if (pendingGlue.length === 0) return legoChunk;
    const glueText = pendingGlue.map(g => g.text).join(' ');
    const merged = {
      ...legoChunk,
      text: glueText + ' ' + legoChunk.text,
      mergedGlue: [...(legoChunk.mergedGlue || []), ...pendingGlue.map(g => g.text)],
    };
    pendingGlue = [];
    return merged;
  };

  for (const chunk of chunks) {
    if (chunk.isLego) {
      // If there's pending leading glue, prepend to this LEGO.
      result.push(flushLeading({ ...chunk }));
    } else {
      if (direction === 'left' && result.length > 0) {
        // Attach to the previous chunk
        const prev = result[result.length - 1];
        prev.text = prev.text + ' ' + chunk.text;
        prev.mergedGlue = [...(prev.mergedGlue || []), chunk.text];
      } else {
        // No previous chunk yet (or right-direction) — buffer for next LEGO
        pendingGlue.push(chunk);
      }
    }
  }

  // Any glue still pending (all-glue tail) — merge into the last LEGO.
  if (pendingGlue.length > 0 && result.length > 0) {
    const last = result[result.length - 1];
    const glueText = pendingGlue.map(g => g.text).join(' ');
    last.text = last.text + ' ' + glueText;
    last.mergedGlue = [...(last.mergedGlue || []), ...pendingGlue.map(g => g.text)];
  }

  return result;
}

/**
 * Chunk a phrase into LEGO-sized pieces via maximum-munch left-to-right.
 *
 * At each position, pick the longest LEGO that matches starting there.
 * Words not covered by any LEGO become singleton "glue" chunks.
 *
 * Returns: chunks preserving the ORIGINAL phrase text (not normalized), so the
 * autocue shows correct accents and casing. Normalization is used only for
 * matching against the LEGO universe.
 *
 * @param {string} originalPhrase - The phrase as the speaker will see it
 * @param {Map} universe - Map of normalized LEGO text → { legoId, type, original }
 * @returns {Array} [{ text, legoId, type, isLego }] in reading order
 */
function chunkPhraseByLegos(originalPhrase, universe) {
  // Align original tokens with normalized tokens position-by-position.
  // Normalized phrase removes diacritics and punctuation but preserves word count.
  const originalTokens = originalPhrase.trim().split(/\s+/);
  const normalizedTokens = tokenize(originalPhrase);

  // Defensive: if tokenization mismatches word count (punctuation-only tokens dropped), bail gracefully.
  if (originalTokens.length !== normalizedTokens.length) {
    return [{ text: originalPhrase, legoId: null, type: null, isLego: false }];
  }

  const chunks = [];
  let i = 0;
  while (i < normalizedTokens.length) {
    // Find the longest LEGO starting at position i
    let matchLen = 0;
    let matchLegoInfo = null;
    const maxLen = Math.min(normalizedTokens.length - i, 8);
    for (let len = maxLen; len >= 1; len--) {
      const candidate = normalizedTokens.slice(i, i + len).join(' ');
      if (universe.has(candidate)) {
        matchLen = len;
        matchLegoInfo = universe.get(candidate);
        break;
      }
    }

    if (matchLen > 0) {
      // Emit LEGO chunk preserving original casing/diacritics
      const chunkText = originalTokens.slice(i, i + matchLen).join(' ');
      chunks.push({
        text: chunkText,
        legoId: matchLegoInfo.legoId,
        type: matchLegoInfo.type,
        isLego: true,
      });
      i += matchLen;
    } else {
      // Glue word — no LEGO match. Speaker still pauses around it.
      chunks.push({
        text: originalTokens[i],
        legoId: null,
        type: null,
        isLego: false,
      });
      i += 1;
    }
  }
  return chunks;
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
      known: best.known || '',
      source: best.source || '',
      seedNumber: best.seedNumber || null,
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

/**
 * Optional `maxSeed` caps every fetch to seeds 1..N. The optimizer orders by
 * LEGO coverage, not by seed, so an uncapped script for a 668-seed course opens
 * somewhere in the 300s — fine for a full recording campaign, useless for a
 * test session where you want something listenable from the start of the
 * course. Capping at the query keeps the greedy set cover honest: the universe
 * it tries to cover is only the LEGOs that exist within the cap.
 */
function applySeedCap(query, maxSeed) {
  return maxSeed ? query.lte('seed_number', maxSeed) : query;
}

async function getAllLegos(courseCode, maxSeed) {
  const { data, error } = await applySeedCap(supabase
    .from('course_legos')
    .select('target_text, known_text, type, is_new, seed_number, lego_index')
    .eq('course_code', courseCode)
    .eq('is_new', true), maxSeed);

  if (error) throw error;
  return data || [];
}

async function getAllPracticePhrases(courseCode, maxSeed) {
  const { data, error } = await applySeedCap(supabase
    .from('course_practice_phrases')
    .select('target_text, known_text, seed_number, lego_index, position')
    .eq('course_code', courseCode), maxSeed);

  if (error) throw error;
  return data || [];
}

async function getAllSeeds(courseCode, maxSeed) {
  const { data, error } = await applySeedCap(supabase
    .from('course_seeds')
    .select('target_text, known_text, seed_number')
    .eq('course_code', courseCode), maxSeed);

  if (error) throw error;
  return data || [];
}

/**
 * Existing HUMAN recordings for a course IN ONE VOICE SLOT — the "already in
 * the can" pool. Minority-language courses like cym build up thousands of
 * these over real recording sessions; the optimizer originally ran as if
 * starting from zero every time, which re-asked for phrases already recorded.
 * Used to prune the LEGO universe before greedy set cover runs, so the output
 * is a GAP list (what's actually still missing), not a from-scratch script.
 *
 * `role` MUST scope the query. Each target voice needs its OWN complete set of
 * recordings — they are different people and are not interchangeable for
 * splicing. Pruning target2's script by target1's takes would hand the second
 * recorder a short script and leave that voice permanently incomplete. This
 * defaulted to 'target1' for every caller, which was correct only ever for the
 * first voice.
 */
async function getExistingHumanAudioTexts(courseCode, role = 'target1') {
  const PAGE = 1000;
  const texts = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('course_audio')
      .select('text')
      .eq('course_code', courseCode)
      .eq('role', role)
      .eq('origin', 'human')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    texts.push(...(data || []).map(r => r.text));
    if (!data || data.length < PAGE) break;
  }
  return texts;
}

// =============================================================================
// MAIN ALGORITHM
// =============================================================================

async function generateRecordingScript(courseCode, options = {}) {
  const { verbose = false, excludeRecorded = false, maxSeed = null, role = 'target1' } = options;

  console.log(`\n🎙️  Recording Script Generator`);
  console.log(`   Course: ${courseCode}`);
  if (maxSeed) console.log(`   Capped to seeds 1-${maxSeed}`);
  console.log(`${'─'.repeat(50)}\n`);

  // 1. Get course info
  if (verbose) console.log('📚 Loading course data...');
  const course = await getCourseInfo(courseCode);

  // 2. Get all NEW LEGOs (the universe to cover)
  const legos = await getAllLegos(courseCode, maxSeed);
  if (legos.length === 0) {
    console.log(maxSeed
      ? `❌ No LEGOs found in seeds 1-${maxSeed} for ${courseCode}.`
      : '❌ No LEGOs found for course. Run Phase 1 & 2 first.');
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
  const practicePhrases = await getAllPracticePhrases(courseCode, maxSeed);
  const seeds = await getAllSeeds(courseCode, maxSeed);

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

  // 4b. Already-recorded pruning: LEGOs already reachable by splicing an
  // EXISTING human recording need no new phrase. Only the residual (the real
  // gap) goes through greedy set cover.
  let coverUniverse = universeKeys;
  let alreadyCoveredCount = 0;
  if (excludeRecorded) {
    if (verbose) console.log(`\n🎧 Checking existing human recordings for ${role}...`);
    const existingTexts = await getExistingHumanAudioTexts(courseCode, role);
    const alreadyCovered = new Set();
    for (const text of existingTexts) {
      const words = tokenize(text);
      for (const subseq of getAllSubsequences(words)) {
        if (universeKeys.has(subseq)) alreadyCovered.add(subseq);
      }
    }
    alreadyCoveredCount = alreadyCovered.size;
    console.log(`🎙️  Already coverable by existing human recordings: ${alreadyCoveredCount}/${universeKeys.size} LEGOs`);
    coverUniverse = new Set([...universeKeys].filter(k => !alreadyCovered.has(k)));
  }

  // 5. Run greedy set cover (over the residual/gap universe)
  if (verbose) console.log('\n⚙️  Running GuaranteedCoverage algorithm...');

  const startTime = Date.now();
  const result = greedySetCover(coverUniverse, candidates);
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

  // 7. Calculate statistics. When excludeRecorded is on, "coverage"/"reduction"
  // describe the residual gap (coverUniverse), not the whole course, so a
  // near-finished course correctly reports near-100% already covered.
  const totalRecordings = result.selected.length + directRecord.length;
  const totalLegos = universe.size;
  const gapLegos = coverUniverse.size;
  const coverage = gapLegos === 0 ? '100.0' : ((gapLegos - result.uncovered.size) / gapLegos * 100).toFixed(1);
  const reduction = gapLegos === 0 ? '100.0' : ((1 - totalRecordings / gapLegos) * 100).toFixed(1);

  // Estimated time (rough)
  const phraseTime = result.selected.length * CONFIG.SECONDS_PER_PHRASE;
  const directTime = directRecord.length * CONFIG.SECONDS_PER_DIRECT;
  const totalSeconds = (phraseTime + directTime) * 2; // x2 for slow pass
  const estimatedMinutes = Math.ceil(totalSeconds / 60);

  // 8. Build output
  const output = {
    courseCode,
    generatedAt: new Date().toISOString(),
    maxSeed,
    role,

    statistics: {
      totalLegos,
      coveredByPhrases: totalLegos - result.uncovered.size,
      directRecordNeeded: directRecord.length,
      totalRecordings,
      coveragePercent: parseFloat(coverage),
      reductionPercent: parseFloat(reduction),
      estimatedMinutes,
      algorithmIterations: result.iterations,
      excludeRecorded,
      alreadyCoveredByExistingRecordings: alreadyCoveredCount,
    },

    recordingScript: {
      instructions: [
        'Record each phrase twice:',
        '  Pass 1: Natural speed (for prosody)',
        '  Pass 2: Slow with pauses between LEGO chunks (for splicing)',
        '',
        'Tips for good splices:',
        '  - Pause briefly (~200ms) between LEGO chunks in slow pass',
        '  - Do NOT pause between words within a single chunk',
        '  - Maintain consistent volume throughout',
        '  - Keep room tone consistent (same session)',
      ],
      phrases: result.selected.map((s, i) => {
        const rawChunks = chunkPhraseByLegos(s.phrase, universe);
        // Glue first, then the short-chunk floor: a one-word LEGO that survived
        // the glue pass is still a one-word chunk, and asking a recordist to
        // stop dead around "des" is what made Sascha's first session sound
        // unnatural.
        const recordingChunks = mergeShortChunks(mergeGlueIntoLegos(rawChunks, 'left'));
        const glueCount = rawChunks.filter(c => !c.isLego).length;
        return {
          index: i + 1,
          target: s.phrase,
          known: s.known || '',
          source: s.source || '',
          seedNumber: s.seedNumber || null,
          wordCount: s.wordCount,
          coversLegos: s.coversCount,
          // True LEGO boundaries (for reference — which LEGOs tile the phrase)
          legoChunks: rawChunks,
          legoChunkCount: rawChunks.filter(c => c.isLego).length,
          glueTokensAbsorbed: glueCount,
          // Recording chunks — glue absorbed into adjacent LEGOs. THIS is what
          // the autocue shows and what align-audio.cjs consumes via --chunks.
          recordingChunks,
          chunksString: recordingChunks.map(c => c.text).join('|'),
          chunkCount: recordingChunks.length,
        };
      }),
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

  console.log(`\n📝 Top 10 phrases by coverage (| = pause point for speaker):`);
  for (let i = 0; i < Math.min(10, result.selected.length); i++) {
    const s = result.selected[i];
    const raw = chunkPhraseByLegos(s.phrase, universe);
    // Same tiling as the script above, so the preview shows what is served.
    const merged = mergeShortChunks(mergeGlueIntoLegos(raw, 'left'));
    const display = merged
      .map(c => c.mergedGlue ? `${c.text}*` : c.text)  // * marks chunks with absorbed glue
      .join(' | ');
    const truncated = display.length > 80 ? display.slice(0, 80) + '...' : display;
    const glueCount = raw.filter(c => !c.isLego).length;
    console.log(`  ${i + 1}. ${truncated}  (${s.coversCount} LEGOs, ${merged.length} chunks${glueCount > 0 ? `, ${glueCount} glue absorbed` : ''})`);
  }
  console.log(`  (* = chunk contains absorbed glue words alongside the LEGO)`);

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
  --gap             Exclude LEGOs already coverable by existing HUMAN
                    recordings — output is the residual gap list, not a
                    from-scratch script
  --help            Show this help

Examples:
  node generate-recording-script.cjs spa_for_eng
  node generate-recording-script.cjs cym_for_eng --output recording-script.json
  node generate-recording-script.cjs bre_for_eng --verbose
  node generate-recording-script.cjs cym_n_for_eng --gap --output gap.json
`);
    process.exit(0);
  }

  const courseCode = args[0];
  const verbose = args.includes('--verbose');
  const excludeRecorded = args.includes('--gap');
  const outputIdx = args.indexOf('--output');
  const outputFile = outputIdx !== -1 ? args[outputIdx + 1] : null;
  const maxSeedIdx = args.indexOf('--max-seed');
  const maxSeed = maxSeedIdx !== -1 ? parseInt(args[maxSeedIdx + 1], 10) : null;
  const roleIdx = args.indexOf('--role');
  const role = roleIdx !== -1 ? args[roleIdx + 1] : 'target1';

  try {
    const result = await generateRecordingScript(courseCode, { verbose, excludeRecorded, maxSeed, role });

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
module.exports = { generateRecordingScript, getExistingHumanAudioTexts };
