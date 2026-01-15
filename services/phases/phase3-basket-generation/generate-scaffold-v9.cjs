#!/usr/bin/env node
/**
 * Generate v9 Phase 3 scaffold for a single LEGO
 *
 * v9 format: Plain text with parallel sentence pairs and [bracket] markers
 *
 * Usage:
 *   node generate-scaffold-v9.cjs <courseCode> <legoId>
 *   node generate-scaffold-v9.cjs ita_for_eng S0056L07
 */

require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');

const VFS_ROOT = path.join(__dirname, '../../../public/vfs/courses');

/**
 * Get Supabase client
 */
function getSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Load lego_pairs.json for a course
 */
async function loadLegoPairs(courseCode) {
  const filePath = path.join(VFS_ROOT, courseCode, 'lego_pairs.json');
  if (!await fs.pathExists(filePath)) {
    throw new Error(`lego_pairs.json not found at ${filePath}`);
  }
  return fs.readJson(filePath);
}

/**
 * Load seed sentences from database
 */
async function loadSeedSentences(courseCode, seedNumbers) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', courseCode)
    .in('seed_number', seedNumbers);

  if (error) throw new Error(`Failed to load seeds: ${error.message}`);

  // Create a map for quick lookup
  const seedMap = new Map();
  for (const seed of data || []) {
    seedMap.set(seed.seed_number, {
      known: seed.known_text,
      target: seed.target_text
    });
  }
  return seedMap;
}

/**
 * Parse LEGO ID into seed number and lego index
 * e.g., "S0056L07" -> { seedNumber: 56, legoIndex: 7 }
 */
function parseLegoId(legoId) {
  const match = legoId.match(/S(\d+)L(\d+)/);
  if (!match) throw new Error(`Invalid LEGO ID format: ${legoId}`);
  return {
    seedNumber: parseInt(match[1], 10),
    legoIndex: parseInt(match[2], 10)
  };
}

/**
 * Get seed by number
 */
function getSeed(legoPairs, seedNumber) {
  return legoPairs.seeds.find(s => s.seed_number === seedNumber);
}

/**
 * Get LEGO from seed
 */
function getLego(seed, legoIndex) {
  return seed?.legos?.find(l => {
    const match = l.lego_id.match(/L(\d+)$/);
    return match && parseInt(match[1], 10) === legoIndex;
  });
}

/**
 * Get the 30 most recent NEW LEGOs before a given position
 */
function getRecentNewLegos(legoPairs, seedNumber, legoIndex, count = 30) {
  const result = [];

  for (const seed of legoPairs.seeds) {
    if (seed.seed_number > seedNumber) continue;

    for (const lego of seed.legos || []) {
      const match = lego.lego_id.match(/L(\d+)$/);
      const lIdx = match ? parseInt(match[1], 10) : 0;

      // Only include LEGOs before current position
      if (seed.seed_number === seedNumber && lIdx >= legoIndex) continue;

      // Only include NEW LEGOs
      if (lego.new) {
        result.push({
          seedNumber: seed.seed_number,
          legoIndex: lIdx,
          legoId: lego.lego_id,
          known: lego.known_text,
          target: lego.target_text,
          type: lego.type
        });
      }
    }
  }

  // Sort by position descending (most recent first)
  result.sort((a, b) => {
    if (b.seedNumber !== a.seedNumber) return b.seedNumber - a.seedNumber;
    return b.legoIndex - a.legoIndex;
  });

  return result.slice(0, count);
}

/**
 * Get unique seeds containing the recent LEGOs
 */
function getSeedsForRecentLegos(legoPairs, recentLegos) {
  const seedNumbers = [...new Set(recentLegos.map(l => l.seedNumber))];
  seedNumbers.sort((a, b) => b - a); // Most recent first

  return seedNumbers.map(num => getSeed(legoPairs, num)).filter(Boolean);
}

/**
 * Format a seed sentence with [brackets] around NEW LEGOs
 */
function formatSentenceWithBrackets(sentence, legos, isNew) {
  let result = sentence;

  // Sort LEGOs by length descending (replace longer ones first to avoid partial matches)
  const sortedLegos = [...legos].sort((a, b) => {
    const aLen = (a.known_text || a.known || '').length;
    const bLen = (b.known_text || b.known || '').length;
    return bLen - aLen;
  });

  // Track which parts are already bracketed (to avoid double-bracketing)
  const bracketed = new Map(); // text -> placeholder
  let placeholderIndex = 0;

  for (const lego of sortedLegos) {
    const text = lego.known_text || lego.known;
    const legoIsNew = lego.new !== false; // Default to true if not specified

    if (!text) continue;

    // Create a regex that matches the text as a whole phrase
    // Escape special regex characters
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');

    if (legoIsNew && regex.test(result)) {
      // Replace with placeholder
      const placeholder = `__BRACKET_${placeholderIndex}__`;
      bracketed.set(placeholder, `[${text}]`);
      result = result.replace(regex, placeholder);
      placeholderIndex++;
    }
  }

  // Restore placeholders
  for (const [placeholder, bracketed_text] of bracketed) {
    result = result.replace(placeholder, bracketed_text);
  }

  return result;
}

/**
 * Build parallel sentence pair with brackets for a seed
 * @param {Object} seed - The seed from lego_pairs.json (has legos array)
 * @param {Object} seedSentences - Map of seedNumber -> {known, target} from database
 * @param {number|null} maxLegoIndex - Only bracket LEGOs with index < this value (null = all)
 */
function buildParallelPair(seed, seedSentences, maxLegoIndex = null) {
  const seedNumber = seed.seed_number;

  // Get the seed's sentence from database
  const sentences = seedSentences.get(seedNumber) || {};
  const knownSentence = sentences.known || '';
  const targetSentence = sentences.target || '';

  // Get LEGOs for this seed, optionally filtered by index
  let legos = seed.legos || [];
  if (maxLegoIndex !== null) {
    legos = legos.filter(l => {
      const match = l.lego_id.match(/L(\d+)$/);
      const idx = match ? parseInt(match[1], 10) : 0;
      return idx < maxLegoIndex;
    });
  }

  // Format known sentence with brackets around NEW LEGOs
  const knownFormatted = formatSentenceWithBrackets(knownSentence, legos, true);

  // For target, we need to map the same LEGOs
  // Build a simple mapping approach
  let targetFormatted = targetSentence;

  // Sort by target length descending
  const sortedByTarget = [...legos].sort((a, b) => {
    const aLen = (a.target_text || '').length;
    const bLen = (b.target_text || '').length;
    return bLen - aLen;
  });

  const targetBracketed = new Map();
  let tIdx = 0;

  for (const lego of sortedByTarget) {
    const text = lego.target_text;
    const legoIsNew = lego.new !== false;

    if (!text || !legoIsNew) continue;

    // For target language, be more careful with matching
    // Use case-sensitive for non-Latin scripts, case-insensitive for Latin
    const isLatin = /^[a-zA-Z\s.,!?'"-]+$/.test(text);
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = isLatin
      ? new RegExp(`\\b${escaped}\\b`, 'gi')
      : new RegExp(escaped, 'g');

    if (regex.test(targetFormatted)) {
      const placeholder = `__TBRACKET_${tIdx}__`;
      targetBracketed.set(placeholder, `[${text}]`);
      targetFormatted = targetFormatted.replace(regex, placeholder);
      tIdx++;
    }
  }

  for (const [placeholder, bracketed_text] of targetBracketed) {
    targetFormatted = targetFormatted.replace(placeholder, bracketed_text);
  }

  return {
    seedId: `S${String(seed.seed_number).padStart(4, '0')}`,
    known: knownFormatted,
    target: targetFormatted
  };
}

/**
 * Generate v9 scaffold for a LEGO
 */
async function generateScaffoldV9(courseCode, legoId) {
  const legoPairs = await loadLegoPairs(courseCode);
  const { seedNumber, legoIndex } = parseLegoId(legoId);

  // Get the target LEGO and its seed
  const seed = getSeed(legoPairs, seedNumber);
  if (!seed) throw new Error(`Seed S${String(seedNumber).padStart(4, '0')} not found`);

  const lego = getLego(seed, legoIndex);
  if (!lego) throw new Error(`LEGO ${legoId} not found in seed`);

  // Get 30 most recent NEW LEGOs
  const recentLegos = getRecentNewLegos(legoPairs, seedNumber, legoIndex, 30);

  // Get the seeds containing these LEGOs
  const recentSeeds = getSeedsForRecentLegos(legoPairs, recentLegos);

  // Collect all seed numbers we need sentences for
  const allSeedNumbers = [seedNumber, ...recentSeeds.map(s => s.seed_number)];

  // Load seed sentences from database
  const seedSentences = await loadSeedSentences(courseCode, allSeedNumbers);

  // Determine language names from course code
  const [targetLang, , knownLang] = courseCode.split('_');
  const langNames = {
    'eng': 'English',
    'ita': 'Italian',
    'spa': 'Spanish',
    'zho': 'Chinese',
    'cmn': 'Mandarin',
    'fra': 'French',
    'deu': 'German',
    'por': 'Portuguese',
    'jpn': 'Japanese',
    'kor': 'Korean',
    'cym': 'Welsh'
  };
  const knownName = langNames[knownLang] || knownLang;
  const targetName = langNames[targetLang] || targetLang;

  // Build the current LEGO's seed pair with brackets
  // Only bracket LEGOs BEFORE the current position (future LEGOs aren't available yet)
  const currentPair = buildParallelPair(seed, seedSentences, legoIndex);

  // Build recent pattern pairs
  // For the current seed, filter out future LEGOs (same as currentPair)
  const recentPairs = recentSeeds.slice(0, 12).map(s => {
    const maxIdx = s.seed_number === seedNumber ? legoIndex : null;
    return buildParallelPair(s, seedSentences, maxIdx);
  });

  // Generate plain text scaffold
  let scaffold = `=== PHASE 3: BASKET GENERATION ===

Course: ${courseCode}
Languages: ${knownName} → ${targetName}

---

YOUR LEGO: [${lego.known_text}] / [${lego.target_text}]

From seed ${currentPair.seedId}:
  "${currentPair.known}"
  "${currentPair.target}"

---

RECENT PATTERNS ([brackets] = recently NEW - prioritize these):

`;

  for (const pair of recentPairs) {
    scaffold += `${pair.seedId}: "${pair.known}"
       "${pair.target}"

`;
  }

  scaffold += `---

TASK: Generate 15-20 practice phrases containing [${lego.known_text}] / [${lego.target_text}].

Rules:
- Recombine patterns from above (don't invent new vocabulary)
- Prioritize [bracketed] LEGOs (recently learned)
- Length: from [${lego.known_text}] + one word up to ~12 words
- Order: shortest first, longest last
- Natural in BOTH languages

Output format:
1. "{known}" / "{target}"
2. "{known}" / "{target}"
[... 15-20 phrases ...]
`;

  return scaffold;
}

/**
 * Build taught units for server-side validation (not in scaffold)
 * Returns all A-types, M-types, and M-components for decomposition
 */
async function buildTaughtUnits(courseCode, seedNumber, legoIndex) {
  const legoPairs = await loadLegoPairs(courseCode);

  const knownUnits = [];
  const targetUnits = [];

  for (const seed of legoPairs.seeds) {
    if (seed.seed_number > seedNumber) continue;

    for (const lego of seed.legos || []) {
      const match = lego.lego_id.match(/L(\d+)$/);
      const lIdx = match ? parseInt(match[1], 10) : 0;

      // Only include LEGOs before current position
      if (seed.seed_number === seedNumber && lIdx >= legoIndex) continue;

      // Add the intact LEGO
      if (lego.known_text) knownUnits.push(lego.known_text);
      if (lego.target_text) targetUnits.push(lego.target_text);

      // For M-types, add components
      if (lego.type === 'M' && lego.components && Array.isArray(lego.components)) {
        for (const comp of lego.components) {
          const knownComp = comp.k || comp.known || comp.known_text;
          const targetComp = comp.t || comp.target || comp.target_text;
          if (knownComp) knownUnits.push(knownComp);
          if (targetComp) targetUnits.push(targetComp);
        }
      }
    }
  }

  return {
    known: [...new Set(knownUnits)],
    target: [...new Set(targetUnits)]
  };
}

/**
 * Build ALL vocabulary from seed sentences for validation
 * Includes every word that appears in seeds up to (and possibly including) current position
 *
 * @param {string} courseCode - Course identifier
 * @param {number} seedNumber - Current seed number
 * @param {number} legoIndex - Current lego index within seed
 * @returns {Promise<{known: string[], target: string[]}>} All words heard by this point
 */
async function buildAllHeardVocab(courseCode, seedNumber, legoIndex) {
  const legoPairs = await loadLegoPairs(courseCode);
  const seedSentences = await loadSeedSentences(
    courseCode,
    legoPairs.seeds.filter(s => s.seed_number <= seedNumber).map(s => s.seed_number)
  );

  const knownWords = new Set();
  const targetWords = new Set();

  // Helper to extract words from text
  function extractWords(text) {
    if (!text) return [];
    // Remove punctuation, split on whitespace, filter empties
    return text
      .replace(/[.,!?;:"()\[\]{}]/g, ' ')
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
  }

  // Find the highest LEGO index in current seed
  const currentSeed = legoPairs.seeds.find(s => s.seed_number === seedNumber);
  const maxLegoIndex = currentSeed?.legos?.reduce((max, lego) => {
    const match = lego.lego_id.match(/L(\d+)$/);
    const idx = match ? parseInt(match[1], 10) : 0;
    return Math.max(max, idx);
  }, 0) || 0;

  const isLastLegoInSeed = legoIndex >= maxLegoIndex;

  for (const seed of legoPairs.seeds) {
    if (seed.seed_number > seedNumber) continue;

    // Add sentence words (but skip CURRENT seed's sentence unless last LEGO)
    const isCurrentSeed = seed.seed_number === seedNumber;
    const includeSentence = !isCurrentSeed || isLastLegoInSeed;

    if (includeSentence) {
      const sentences = seedSentences.get(seed.seed_number);
      if (sentences) {
        for (const word of extractWords(sentences.known)) {
          knownWords.add(word.toLowerCase());
        }
        for (const word of extractWords(sentences.target)) {
          targetWords.add(word.toLowerCase());
        }
      }
    }

    // ALWAYS add LEGOs up to this point (they're multi-word units)
    for (const lego of seed.legos || []) {
      const match = lego.lego_id.match(/L(\d+)$/);
      const lIdx = match ? parseInt(match[1], 10) : 0;

      // For current seed, only include LEGOs before current position (unless last)
      if (seed.seed_number === seedNumber && !isLastLegoInSeed && lIdx >= legoIndex) continue;

      if (lego.known_text) knownWords.add(lego.known_text.toLowerCase());
      if (lego.target_text) targetWords.add(lego.target_text.toLowerCase());

      // Add components too
      if (lego.components && Array.isArray(lego.components)) {
        for (const comp of lego.components) {
          const knownComp = comp.k || comp.known || comp.known_text;
          const targetComp = comp.t || comp.target || comp.target_text;
          if (knownComp) knownWords.add(knownComp.toLowerCase());
          if (targetComp) targetWords.add(targetComp.toLowerCase());
        }
      }
    }
  }

  return {
    known: [...knownWords],
    target: [...targetWords]
  };
}

// CLI execution
if (require.main === module) {
  const [,, courseCode, legoId] = process.argv;

  if (!courseCode || !legoId) {
    console.log('Usage: node generate-scaffold-v9.cjs <courseCode> <legoId>');
    console.log('Example: node generate-scaffold-v9.cjs ita_for_eng S0056L07');
    process.exit(1);
  }

  generateScaffoldV9(courseCode, legoId)
    .then(scaffold => {
      console.log(scaffold);
    })
    .catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}

module.exports = { generateScaffoldV9, buildTaughtUnits, buildAllHeardVocab, parseLegoId };
