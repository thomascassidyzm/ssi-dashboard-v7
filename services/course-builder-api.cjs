/**
 * Course Builder API - Simple endpoint for LLM agents to insert LEGOs and phrases
 *
 * IMPORTANT: DATABASE-ONLY ARCHITECTURE (January 2026)
 * =====================================================
 * Course data is stored EXCLUSIVELY in Supabase, NOT in JSON files.
 * This service writes directly to Supabase tables:
 * - course_legos: LEGO definitions
 * - course_practice_phrases: Practice phrases for each LEGO
 *
 * JSON files (lego_pairs.json, lego_baskets.json) are DEPRECATED.
 * Do NOT read course data from JSON files - always query Supabase.
 *
 * POST /api/lego - Insert a LEGO with its phrases
 */

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// CORS - allow dashboard from any origin (popty.app, localhost, etc.)
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const PORT = process.env.COURSE_BUILDER_PORT || 3471;

// =============================================================================
// PER-COURSE VOCABULARY TRACKING
// Each course has its own vocab set built from LEGOs in insertion order
// =============================================================================

// LRU Cache with TTL for course vocabulary
// Stores: course_code -> { vocab: Set, lastAccess: timestamp }
const MAX_CACHE_SIZE = 10;
const CACHE_TTL_MS = 30 * 60 * 1000;  // 30 minutes
const courseVocabCache = new Map();  // course_code -> { vocab: Set, lastAccess: number }

/**
 * Get cache entry, updating access time. Returns null if expired or missing.
 */
function getCacheEntry(courseCode) {
  const entry = courseVocabCache.get(courseCode);
  if (!entry) return null;

  // Check TTL expiration
  if (Date.now() - entry.lastAccess > CACHE_TTL_MS) {
    courseVocabCache.delete(courseCode);
    return null;
  }

  // Update access time (LRU touch)
  entry.lastAccess = Date.now();
  // Move to end of Map (most recently used)
  courseVocabCache.delete(courseCode);
  courseVocabCache.set(courseCode, entry);

  return entry.vocab;
}

/**
 * Set cache entry, evicting oldest if at capacity.
 */
function setCacheEntry(courseCode, vocabSet) {
  // If already exists, delete first (to update position)
  if (courseVocabCache.has(courseCode)) {
    courseVocabCache.delete(courseCode);
  }

  // Evict oldest entries if at capacity
  while (courseVocabCache.size >= MAX_CACHE_SIZE) {
    // Map iterates in insertion order, so first key is oldest
    const oldestKey = courseVocabCache.keys().next().value;
    courseVocabCache.delete(oldestKey);
  }

  courseVocabCache.set(courseCode, {
    vocab: vocabSet,
    lastAccess: Date.now()
  });
}

/**
 * Detect if course is Chinese-based (character-level vocab)
 */
function isChinese(courseCode) {
  return courseCode.startsWith('zho') || courseCode.includes('_zho');
}

/**
 * Normalize text for vocab comparison
 */
function normalizeText(text, chinese = false) {
  if (!text) return '';
  let normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
    .replace(/[¿¡.,;:!?'"«»""''。，！？、：；""'']/g, '')  // Punctuation
    .trim();
  if (!chinese) {
    normalized = normalized.replace(/\s+/g, ' ');
  }
  return normalized;
}

/**
 * Extract vocab units from text (characters for Chinese, words for European)
 */
function extractVocab(text, chinese = false) {
  const normalized = normalizeText(text, chinese);
  if (chinese) {
    return [...normalized].filter(c => c.trim() && !c.match(/\s/));
  } else {
    return normalized.split(/\s+/).filter(w => w);
  }
}

/**
 * Load existing vocabulary for a course from database
 */
async function loadCourseVocab(courseCode) {
  // Check cache first (handles TTL and LRU ordering)
  const cached = getCacheEntry(courseCode);
  if (cached) {
    return cached;
  }

  const chinese = isChinese(courseCode);
  const vocabSet = new Set();

  // Load all LEGOs in order
  const { data: legos } = await supabase
    .from('course_legos')
    .select('target_text, type, components')
    .eq('course_code', courseCode)
    .order('seed_number')
    .order('lego_index');

  for (const lego of legos || []) {
    // Add LEGO vocab
    extractVocab(lego.target_text, chinese).forEach(v => vocabSet.add(v));

    // Add M-type components
    if (lego.type === 'M' && lego.components) {
      for (const comp of lego.components) {
        extractVocab(comp.target, chinese).forEach(v => vocabSet.add(v));
      }
    }
  }

  // Store in cache (handles LRU eviction)
  setCacheEntry(courseCode, vocabSet);
  return vocabSet;
}

/**
 * Add new vocab to course cache (called after successful LEGO insert)
 */
function addToCourseVocab(courseCode, lego) {
  const chinese = isChinese(courseCode);

  // Get existing vocab set or create new one
  let vocabSet = getCacheEntry(courseCode);
  if (!vocabSet) {
    vocabSet = new Set();
  }

  // Add LEGO vocab
  extractVocab(lego.target, chinese).forEach(v => vocabSet.add(v));

  // Add M-type components
  if (lego.type === 'M' && lego.components) {
    for (const comp of lego.components) {
      extractVocab(comp.target, chinese).forEach(v => vocabSet.add(v));
    }
  }

  // Update cache (this refreshes the access time and handles LRU)
  setCacheEntry(courseCode, vocabSet);
}

/**
 * Check phrases for vocabulary violations
 * Returns array of violations: [{ phrase, unknown: [...] }]
 */
function checkVocabViolations(phrases, vocabSet, courseCode) {
  const chinese = isChinese(courseCode);
  const violations = [];

  for (const phrase of phrases) {
    const phraseVocab = extractVocab(phrase.target, chinese);
    const unknown = phraseVocab.filter(v => !vocabSet.has(v));
    if (unknown.length > 0) {
      violations.push({
        phrase: phrase.target,
        unknown: chinese ? unknown.join('') : unknown.join(', ')
      });
    }
  }

  return violations;
}

// =============================================================================
// M-LEGO BUILD-UP: Particles and Component Filtering
// =============================================================================

// Chinese particles that don't get their own build-up phrase (they appear in the
// full LEGO but don't need separate practice)
const PARTICLES = ['了', '着', '过', '的', '地', '得', '吗', '呢', '吧', '啊', '把', '被'];

/**
 * Check if a target text is a particle (should skip in build-up)
 */
function isParticle(target) {
  if (!target) return false;
  return PARTICLES.includes(target.trim());
}

/**
 * Get meaningful components for M-LEGO build-up.
 * Filters out:
 * 1. Particles (了, 着, etc.)
 * 2. Components where target === the LEGO's target_text itself
 */
function getMeaningfulComponents(components, legoTarget) {
  if (!components || !Array.isArray(components)) return [];
  return components.filter(c =>
    c && c.target && !isParticle(c.target) && c.target !== legoTarget
  );
}

/**
 * Generate build-up phrases for M-type LEGO.
 * Returns array of phrase objects ready for insertion.
 *
 * Build-up structure:
 * - P1..PN: Each meaningful component {known, target}
 * - P(N+1): LEGO itself {known, target}
 * - P(N+2)+: Agent's practice phrases
 */
function generateBuildupPhrases(lego, courseCode) {
  const { seed, idx, known, target, components } = lego;
  const meaningful = getMeaningfulComponents(components, target);

  const buildupPhrases = [];

  // Add component build-up phrases (P1, P2, ... PN)
  for (let i = 0; i < meaningful.length; i++) {
    const comp = meaningful[i];
    buildupPhrases.push({
      course_code: courseCode,
      seed_number: seed,
      lego_index: idx,
      position: i + 1,
      known_text: comp.known,
      target_text: comp.target,
      word_count: comp.target.length,
      lego_count: 1,
      metadata: { buildup: 'component', component_index: i },
      status: 'draft',
      version: 1
    });
  }

  // Add LEGO itself at P(N+1)
  const legoPosition = meaningful.length + 1;
  buildupPhrases.push({
    course_code: courseCode,
    seed_number: seed,
    lego_index: idx,
    position: legoPosition,
    known_text: known,
    target_text: target,
    word_count: target.length,
    lego_count: 1,
    metadata: { buildup: 'lego' },
    status: 'draft',
    version: 1
  });

  return { buildupPhrases, startPosition: legoPosition + 1 };
}

// =============================================================================
// LEGO CONFLICT DETECTION (ZUT Violations)
// =============================================================================

/**
 * Check for LEGO conflicts before insertion.
 *
 * Returns:
 * - { conflict: false } - No conflict, proceed with is_new: true
 * - { conflict: 'duplicate', existing } - Same known+target exists, use is_new: false
 * - { conflict: 'zut', existing, error } - Same known, different target = ZUT violation
 */
async function checkLegoConflict(courseCode, knownText, targetText) {
  // Find any existing LEGOs with the same known_text
  const { data: existing, error } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text')
    .eq('course_code', courseCode)
    .eq('known_text', knownText);

  if (error) {
    throw new Error(`Conflict check failed: ${error.message}`);
  }

  if (!existing || existing.length === 0) {
    return { conflict: false };
  }

  // Check if any have the same target (duplicate) or different target (ZUT)
  const sameTarget = existing.find(e => e.target_text === targetText);

  if (sameTarget) {
    // Duplicate - same known + same target
    return {
      conflict: 'duplicate',
      existing: sameTarget,
      legoId: `S${String(sameTarget.seed_number).padStart(4,'0')}L${String(sameTarget.lego_index).padStart(2,'0')}`
    };
  }

  // ZUT violation - same known + different target
  const existingTargets = existing.map(e => ({
    target: e.target_text,
    legoId: `S${String(e.seed_number).padStart(4,'0')}L${String(e.lego_index).padStart(2,'0')}`
  }));

  return {
    conflict: 'zut',
    existing: existingTargets,
    error: `ZUT violation: "${knownText}" already maps to "${existing[0].target_text}"`,
    suggestions: [
      `UPCHUNK: Add context to disambiguate (recommended)`,
      `  - "${knownText}" → "${existing[0].target_text}" (existing)`,
      `  - "[more specific phrase]" → "${targetText}" (new)`,
      `SYNONYM: Use different known text`,
      `  - Find a synonym or variant for "${knownText}"`
    ]
  };
}

// =============================================================================
// VALIDATION GATES - Enforce quality, prevent lazy agents
// =============================================================================
const MIN_PHRASES_PER_LEGO = 7;       // Each LEGO must have at least 7 phrases
const MAX_PHRASES_PER_LEGO = 13;      // Cap at 13 (diminishing returns)
const TARGET_PHRASES_PER_LEGO = 10;   // Ideal target
const MIN_BATCH_PHRASE_RATIO = 7.0;   // Batch must have ≥7.0 phrases per LEGO

// Phrase length tiers (by target character/word count)
const PHRASE_TIERS = {
  SHORT: { min: 2, max: 5 },     // 2-5 chars/words
  MEDIUM: { min: 6, max: 8 },    // 6-8 chars/words
  LONG: { min: 9, max: 11 },     // 9-11 chars/words
  ETERNAL: { min: 12, max: 999 } // 12+ chars/words
};

// Minimum ETERNAL phrases per LEGO (for spaced repetition)
const MIN_ETERNAL_PHRASES = 4;

// Allow bypass for testing (set SKIP_VALIDATION=true in request body)
const allowValidationBypass = (body) => body.SKIP_VALIDATION === true;

// =============================================================================
// TILING VALIDATION - Seed must be constructable from LEGO targets
// =============================================================================

/**
 * Check if seed target_text can be "tiled" (fully constructed) from LEGO targets.
 *
 * For Chinese: Characters in seed must be subset of characters in all LEGO targets
 * For European: Words in seed must be subset of words in all LEGO targets
 *
 * Returns: { valid: true } or { valid: false, untiled: [...], message }
 */
function checkTiling(seedTarget, legos, courseCode) {
  const chinese = isChinese(courseCode);

  // Extract all vocabulary units from LEGOs (including M-LEGO components)
  const availableVocab = new Set();

  for (const lego of legos) {
    // Add LEGO target vocab
    extractVocab(lego.target, chinese).forEach(v => availableVocab.add(v));

    // Add M-type component vocab
    if (lego.type === 'M' && lego.components) {
      for (const comp of lego.components) {
        extractVocab(comp.target, chinese).forEach(v => availableVocab.add(v));
      }
    }
  }

  // Check seed target can be built from available vocab
  const seedVocab = extractVocab(seedTarget, chinese);
  const untiled = seedVocab.filter(v => !availableVocab.has(v));

  if (untiled.length > 0) {
    return {
      valid: false,
      untiled: chinese ? untiled.join('') : untiled.join(', '),
      seed_vocab: seedVocab.length,
      lego_vocab: availableVocab.size,
      message: `Seed target contains vocabulary not covered by LEGOs: [${chinese ? untiled.join('') : untiled.join(', ')}]`
    };
  }

  return { valid: true };
}

// =============================================================================
// PHRASE COMPLEXITY VALIDATION - Ensure SHORT→MEDIUM→LONG→ETERNAL progression
// =============================================================================

/**
 * Categorize phrases by length tier and check for minimum ETERNAL count.
 *
 * Returns: { valid: true, tiers: {...} } or { valid: false, error, tiers: {...} }
 */
function checkPhraseComplexity(phrases, courseCode) {
  const chinese = isChinese(courseCode);

  const tiers = {
    SHORT: [],
    MEDIUM: [],
    LONG: [],
    ETERNAL: []
  };

  for (const phrase of phrases) {
    const length = chinese
      ? phrase.target.replace(/[\s\u3000。，！？、：；""'']/g, '').length
      : phrase.target.split(/\s+/).length;

    if (length >= PHRASE_TIERS.ETERNAL.min) {
      tiers.ETERNAL.push({ target: phrase.target, length });
    } else if (length >= PHRASE_TIERS.LONG.min) {
      tiers.LONG.push({ target: phrase.target, length });
    } else if (length >= PHRASE_TIERS.MEDIUM.min) {
      tiers.MEDIUM.push({ target: phrase.target, length });
    } else {
      tiers.SHORT.push({ target: phrase.target, length });
    }
  }

  const tierCounts = {
    SHORT: tiers.SHORT.length,
    MEDIUM: tiers.MEDIUM.length,
    LONG: tiers.LONG.length,
    ETERNAL: tiers.ETERNAL.length
  };

  // Check for minimum ETERNAL phrases
  if (tiers.ETERNAL.length < MIN_ETERNAL_PHRASES) {
    return {
      valid: false,
      tiers: tierCounts,
      error: `Need ${MIN_ETERNAL_PHRASES}+ ETERNAL phrases (12+ ${chinese ? 'characters' : 'words'}), got ${tiers.ETERNAL.length}`,
      hint: `See /ssi-build-phrases for phrase length requirements. ETERNAL phrases are critical for spaced repetition.`
    };
  }

  return { valid: true, tiers: tierCounts };
}

// =============================================================================
// METHODOLOGY COMMAND HINTS - Guide agents to methodology on rejection
// =============================================================================

const METHODOLOGY_HINTS = {
  tiling: `
📚 See /ssi-decompose-seed for how to break seeds into LEGOs:
   - Every word/character in seed must appear in a LEGO target
   - Order LEGOs SHORT→LONG (by target length)
   - Use M-LEGOs for multi-word chunks`,

  phrases: `
📚 See /ssi-build-phrases for phrase requirements:
   - 6+ practice phrases per LEGO
   - 4+ ETERNAL phrases (12+ characters/words)
   - Build: SHORT (2-5) → MEDIUM (6-8) → LONG (9-11) → ETERNAL (12+)`,

  vocab: `
📚 See /ssi-learner-pattern for how vocabulary builds:
   - Phrases can only use vocabulary from prior LEGOs
   - LEGO N can use: (all prior seeds) + (LEGOs 1..N of current seed)`,

  zut: `
📚 See /ssi-decompose-seed for handling ZUT conflicts:
   - Same known text cannot map to different targets
   - UPCHUNK: Add context to disambiguate
   - Or use a synonym for the known text`
};

/**
 * POST /api/lego
 *
 * Body:
 * {
 *   "course_code": "zho_for_eng",
 *   "seed": 1,
 *   "idx": 1,
 *   "type": "M",
 *   "known": "I want to",
 *   "target": "我想",
 *   "components": [{"known": "I", "target": "我"}, {"known": "want to", "target": "想"}],
 *   "phrases": [
 *     {"known": "I want to", "target": "我想"},
 *     {"known": "I want to speak", "target": "我想说"},
 *     {"known": "I want to speak Chinese", "target": "我想说中文"}
 *   ]
 * }
 */
app.post('/api/lego', async (req, res) => {
  try {
    const { course_code, seed, idx, type, known, target, components, phrases } = req.body;

    if (!course_code || !seed || !idx || !known || !target) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // VALIDATION GATE: Minimum phrases per LEGO (position-aware)
    // Early LEGOs have fewer combinations available - be lenient
    const phraseCount = phrases?.length || 0;
    const legoId = `S${String(seed).padStart(4,'0')}L${String(idx).padStart(2,'0')}`;

    // Calculate global position (approximate) - seed 1 LEGOs are first ~5, etc.
    const globalPosition = (seed - 1) * 3 + idx; // Rough estimate

    // Graduated minimum: early LEGOs can have fewer phrases
    let minRequired = MIN_PHRASES_PER_LEGO;
    if (globalPosition <= 3) minRequired = 1;       // First 3 LEGOs
    else if (globalPosition <= 6) minRequired = 2;  // LEGOs 4-6
    else if (globalPosition <= 10) minRequired = 3; // LEGOs 7-10

    if (phraseCount < minRequired && !allowValidationBypass(req.body)) {
      console.log(`✗ ${legoId}: REJECTED - Only ${phraseCount} phrases (need ${minRequired}+ at position ~${globalPosition})`);
      return res.status(400).json({
        error: 'Insufficient phrases',
        lego_id: legoId,
        got: phraseCount,
        required: minRequired,
        global_position: globalPosition,
        hint: `LEGO at position ~${globalPosition} needs at least ${minRequired} phrases.`
      });
    }

    // Warn if over max (but don't reject - just truncate later if needed)
    if (phraseCount > MAX_PHRASES_PER_LEGO) {
      console.log(`⚠ ${legoId}: ${phraseCount} phrases exceeds max ${MAX_PHRASES_PER_LEGO} (will use first ${MAX_PHRASES_PER_LEGO})`);
    }

    // CONFLICT DETECTION: Check for duplicate or ZUT violation
    let isNew = true;
    let skipBaskets = false;

    if (!allowValidationBypass(req.body)) {
      const conflictResult = await checkLegoConflict(course_code, known, target);

      if (conflictResult.conflict === 'zut') {
        // ZUT violation - same known, different target = REJECT
        console.log(`✗ ${legoId}: REJECTED - ${conflictResult.error}`);
        return res.status(400).json({
          error: 'ZUT violation: ambiguous prompt',
          lego_id: legoId,
          known_text: known,
          new_target: target,
          existing: conflictResult.existing,
          suggestions: conflictResult.suggestions,
          hint: 'Same known text cannot map to different targets. Upchunk with context or use synonym.'
        });
      }

      if (conflictResult.conflict === 'duplicate') {
        // Duplicate - same known + same target = mark as re-introduction, skip baskets
        isNew = false;
        skipBaskets = true;
        console.log(`  ${legoId}: Duplicate of ${conflictResult.legoId} - marking is_new=false, skipping baskets`);
      }
    }

    // VOCABULARY VALIDATION: Load course vocab and check phrases
    const vocabSet = await loadCourseVocab(course_code);

    // Add THIS LEGO's vocab first (so its phrases can use it)
    const newLego = { target, type, components };
    addToCourseVocab(course_code, newLego);

    // Check phrases for vocab violations (only if not skipping baskets)
    if (phrases && phrases.length > 0 && !skipBaskets && !allowValidationBypass(req.body)) {
      const violations = checkVocabViolations(phrases, vocabSet, course_code);
      if (violations.length > 0) {
        // Remove the vocab we just added since we're rejecting
        courseVocabCache.delete(course_code);  // Force reload on next request

        console.log(`✗ ${legoId}: REJECTED - Vocabulary violations:`);
        violations.forEach(v => console.log(`   "${v.phrase}" uses unknown: [${v.unknown}]`));

        return res.status(400).json({
          error: 'Vocabulary violation',
          lego_id: legoId,
          violations: violations.slice(0, 5),  // Show first 5
          total_violations: violations.length,
          vocab_size: vocabSet.size,
          hint: `Phrases must only use vocabulary already introduced. Unknown: ${violations[0].unknown}`
        });
      }
    }

    // Insert LEGO
    const { error: legoError } = await supabase
      .from('course_legos')
      .upsert({
        course_code,
        seed_number: seed,
        lego_index: idx,
        type: type || 'A',
        is_new: isNew,
        known_text: known,
        target_text: target,
        components: components || null,
        status: 'draft',
        version: 1
      }, { onConflict: 'course_code,seed_number,lego_index' });

    if (legoError) throw legoError;

    // Insert phrases (with M-LEGO build-up auto-generation)
    // Skip if this is a duplicate LEGO (already has baskets from first introduction)
    let allPhraseRows = [];
    let buildupCount = 0;
    let practiceStartPosition = 1;
    const practiceCount = phrases?.length || 0;

    if (!skipBaskets) {
      // M-TYPE BUILD-UP: Auto-generate build-up phrases for M-type LEGOs
      // NEVER trust agent to provide build-up - always generate it ourselves
      if (type === 'M' && components && components.length > 0) {
        const { buildupPhrases, startPosition } = generateBuildupPhrases(
          { seed, idx, known, target, components },
          course_code
        );
        allPhraseRows = [...buildupPhrases];
        buildupCount = buildupPhrases.length;
        practiceStartPosition = startPosition;

        console.log(`  M-LEGO build-up: ${buildupCount} phrases (${buildupPhrases.length - 1} components + LEGO)`);
      }

      // Add agent's practice phrases after build-up
      if (phrases && phrases.length > 0) {
        // Sort by target syllable count (Chinese characters = syllables roughly)
        const sorted = [...phrases].sort((a, b) => a.target.length - b.target.length);

        const practicePhrases = sorted.map((p, i) => ({
          course_code,
          seed_number: seed,
          lego_index: idx,
          position: practiceStartPosition + i,  // Start after build-up
          known_text: p.known,
          target_text: p.target,
          word_count: p.target.length,
          lego_count: (p.known.match(/\s+/g) || []).length + 1,
          metadata: {},
          status: 'draft',
          version: 1
        }));

        allPhraseRows = [...allPhraseRows, ...practicePhrases];
      }

      // Insert all phrases (build-up + practice)
      if (allPhraseRows.length > 0) {
        const { error: phraseError } = await supabase
          .from('course_practice_phrases')
          .upsert(allPhraseRows, { onConflict: 'course_code,seed_number,lego_index,position' });

        if (phraseError) throw phraseError;
      }
    }

    const totalPhrases = allPhraseRows.length;
    const buildupInfo = buildupCount > 0 ? ` [${buildupCount} buildup + ${practiceCount} practice]` : '';
    const dupInfo = skipBaskets ? ' (duplicate, no baskets)' : '';
    console.log(`✓ S${String(seed).padStart(4,'0')}L${String(idx).padStart(2,'0')}: ${known} → ${target} (${totalPhrases} phrases${buildupInfo})${dupInfo}`);

    res.json({
      ok: true,
      lego_id: `S${String(seed).padStart(4,'0')}L${String(idx).padStart(2,'0')}`,
      is_new: isNew,
      skipped_baskets: skipBaskets,
      phrases: totalPhrases,
      buildup_phrases: buildupCount,
      practice_phrases: practiceCount
    });

  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/batch - Insert multiple LEGOs at once
 */
app.post('/api/batch', async (req, res) => {
  try {
    const { course_code, legos } = req.body;

    // VALIDATION GATE: Check phrase ratio before processing
    let totalPhrases = 0;
    const underperformers = [];

    for (const lego of legos) {
      const phraseCount = lego.phrases?.length || 0;
      totalPhrases += phraseCount;

      if (phraseCount < MIN_PHRASES_PER_LEGO) {
        underperformers.push({
          lego_id: `S${String(lego.seed).padStart(4,'0')}L${String(lego.idx).padStart(2,'0')}`,
          known: lego.known,
          phrases: phraseCount
        });
      }
    }

    const ratio = legos.length > 0 ? totalPhrases / legos.length : 0;

    // Reject if ratio is too low (unless bypassed)
    if (ratio < MIN_BATCH_PHRASE_RATIO && !allowValidationBypass(req.body)) {
      console.log(`✗ Batch REJECTED - Ratio ${ratio.toFixed(1)} < ${MIN_BATCH_PHRASE_RATIO} required`);
      return res.status(400).json({
        error: 'Insufficient phrase coverage',
        got_ratio: ratio.toFixed(1),
        required_ratio: MIN_BATCH_PHRASE_RATIO,
        legos: legos.length,
        total_phrases: totalPhrases,
        underperformers: underperformers.slice(0, 10), // Show first 10 offenders
        hint: `Batch rejected. Each LEGO should have ~10 practice phrases combining it with previous LEGOs. Current ratio: ${ratio.toFixed(1)}, need: ${MIN_BATCH_PHRASE_RATIO}+`
      });
    }

    // Warn about individual underperformers (but don't reject if batch ratio is OK)
    if (underperformers.length > 0) {
      console.log(`⚠ Batch has ${underperformers.length} LEGOs with <${MIN_PHRASES_PER_LEGO} phrases (ratio ${ratio.toFixed(1)} OK)`);
    }

    // Reset for actual insertion count
    totalPhrases = 0;
    let totalBuildupPhrases = 0;
    let totalPracticePhrases = 0;

    let zutViolations = [];
    let duplicates = 0;

    for (const lego of legos) {
      const legoId = `S${String(lego.seed).padStart(4,'0')}L${String(lego.idx).padStart(2,'0')}`;

      // CONFLICT DETECTION: Check for duplicate or ZUT violation
      let isNew = true;
      let skipBaskets = false;

      if (!allowValidationBypass(req.body)) {
        const conflictResult = await checkLegoConflict(course_code, lego.known, lego.target);

        if (conflictResult.conflict === 'zut') {
          // Collect ZUT violations but continue processing (report all at end)
          zutViolations.push({
            lego_id: legoId,
            known: lego.known,
            new_target: lego.target,
            existing: conflictResult.existing
          });
          continue;  // Skip this LEGO entirely
        }

        if (conflictResult.conflict === 'duplicate') {
          isNew = false;
          skipBaskets = true;
          duplicates++;
          console.log(`  ${legoId}: Duplicate of ${conflictResult.legoId} - is_new=false, skipping baskets`);
        }
      }

      // Insert LEGO
      const { error: legoError } = await supabase
        .from('course_legos')
        .upsert({
          course_code,
          seed_number: lego.seed,
          lego_index: lego.idx,
          type: lego.type || 'A',
          is_new: isNew,
          known_text: lego.known,
          target_text: lego.target,
          components: lego.components || null,
          status: 'draft',
          version: 1
        }, { onConflict: 'course_code,seed_number,lego_index' });

      if (legoError) throw legoError;

      // Insert phrases (with M-LEGO build-up auto-generation)
      // Skip if duplicate LEGO
      let allPhraseRows = [];
      let buildupCount = 0;
      let practiceStartPosition = 1;

      if (!skipBaskets) {
        // M-TYPE BUILD-UP: Auto-generate build-up phrases for M-type LEGOs
        if (lego.type === 'M' && lego.components && lego.components.length > 0) {
          const { buildupPhrases, startPosition } = generateBuildupPhrases(
            { seed: lego.seed, idx: lego.idx, known: lego.known, target: lego.target, components: lego.components },
            course_code
          );
          allPhraseRows = [...buildupPhrases];
          buildupCount = buildupPhrases.length;
          practiceStartPosition = startPosition;
          totalBuildupPhrases += buildupCount;
        }

        // Add agent's practice phrases after build-up
        if (lego.phrases && lego.phrases.length > 0) {
          const sorted = [...lego.phrases].sort((a, b) => a.target.length - b.target.length);

          const practicePhrases = sorted.map((p, i) => ({
            course_code,
            seed_number: lego.seed,
            lego_index: lego.idx,
            position: practiceStartPosition + i,
            known_text: p.known,
            target_text: p.target,
            word_count: p.target.length,
            lego_count: (p.known.match(/\s+/g) || []).length + 1,
            metadata: {},
            status: 'draft',
            version: 1
          }));

          allPhraseRows = [...allPhraseRows, ...practicePhrases];
          totalPracticePhrases += lego.phrases.length;
        }

        // Insert all phrases (build-up + practice)
        if (allPhraseRows.length > 0) {
          const { error: phraseError } = await supabase
            .from('course_practice_phrases')
            .upsert(allPhraseRows, { onConflict: 'course_code,seed_number,lego_index,position' });

          if (phraseError) throw phraseError;
          totalPhrases += allPhraseRows.length;
        }
      }

      const buildupInfo = buildupCount > 0 ? ` [${buildupCount} buildup]` : '';
      const dupInfo = skipBaskets ? ' (dup)' : '';
      console.log(`✓ ${legoId}: ${lego.known} → ${lego.target}${buildupInfo}${dupInfo}`);
    }

    // If any ZUT violations, report them
    if (zutViolations.length > 0) {
      console.log(`✗ Batch had ${zutViolations.length} ZUT violations (skipped)`);
      return res.status(400).json({
        error: 'ZUT violations detected',
        zut_violations: zutViolations,
        processed_before_error: totalPhrases,
        hint: 'Some LEGOs have same known text mapping to different targets. Upchunk or use synonyms.'
      });
    }

    res.json({
      ok: true,
      legos: legos.length,
      duplicates_skipped: duplicates,
      phrases: totalPhrases,
      buildup_phrases: totalBuildupPhrases,
      practice_phrases: totalPracticePhrases
    });

  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/seed/complete - Submit a complete seed with translation and all LEGOs
 *
 * THE GOLDEN PATH: Agent submits everything for one seed atomically.
 * Validates everything upfront, inserts all or nothing.
 *
 * Body:
 * {
 *   "course_code": "zho_for_eng",
 *   "seed_number": 42,
 *   "known_text": "I want to learn Chinese",
 *   "target_text": "我想学中文",
 *   "legos": [
 *     {
 *       "idx": 1,
 *       "type": "A",
 *       "known": "I",
 *       "target": "我",
 *       "phrases": [{"known": "I", "target": "我"}, ...]
 *     },
 *     {
 *       "idx": 2,
 *       "type": "M",
 *       "known": "want to learn",
 *       "target": "想学",
 *       "components": [{"known": "want", "target": "想"}, {"known": "learn", "target": "学"}],
 *       "phrases": [...]
 *     }
 *   ]
 * }
 */
app.post('/api/seed/complete', async (req, res) => {
  try {
    const { course_code, seed_number, known_text, target_text, legos, SKIP_VALIDATION } = req.body;
    const seedId = `S${String(seed_number).padStart(4, '0')}`;

    // Basic validation
    if (!course_code || !seed_number || !known_text || !target_text || !legos) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['course_code', 'seed_number', 'known_text', 'target_text', 'legos']
      });
    }

    if (!Array.isArray(legos) || legos.length === 0) {
      return res.status(400).json({
        error: 'legos must be a non-empty array',
        seed: seedId
      });
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`SEED COMPLETE: ${seedId} "${known_text}" → "${target_text}"`);
    console.log(`${'='.repeat(60)}`);

    // =========================================================================
    // VALIDATION PHASE (all checks before any inserts)
    // =========================================================================

    const errors = [];
    const warnings = [];

    // 1. ZUT VALIDATION: Check for conflicts with existing LEGOs
    const zutViolations = [];
    const duplicateLegos = [];

    for (const lego of legos) {
      const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;

      if (!SKIP_VALIDATION) {
        const conflictResult = await checkLegoConflict(course_code, lego.known, lego.target);

        if (conflictResult.conflict === 'zut') {
          zutViolations.push({
            lego_id: legoId,
            known: lego.known,
            new_target: lego.target,
            existing: conflictResult.existing,
            suggestions: conflictResult.suggestions
          });
        } else if (conflictResult.conflict === 'duplicate') {
          duplicateLegos.push({
            lego_id: legoId,
            known: lego.known,
            target: lego.target,
            original: conflictResult.legoId
          });
          console.log(`  ${legoId}: Duplicate of ${conflictResult.legoId} (will skip baskets)`);
        }
      }
    }

    if (zutViolations.length > 0) {
      errors.push({
        type: 'zut',
        message: `${zutViolations.length} ZUT violation(s) - same known text maps to different targets`,
        violations: zutViolations,
        methodology: METHODOLOGY_HINTS.zut
      });
    }

    // 2. TILING VALIDATION: Seed target must be constructable from LEGO targets
    if (!SKIP_VALIDATION) {
      const tilingResult = checkTiling(target_text, legos, course_code);
      if (!tilingResult.valid) {
        errors.push({
          type: 'tiling',
          message: tilingResult.message,
          untiled: tilingResult.untiled,
          seed_target: target_text,
          legos_provided: legos.map(l => ({ idx: l.idx, target: l.target })),
          methodology: METHODOLOGY_HINTS.tiling
        });
        console.log(`✗ ${seedId}: TILING FAILED - untiled: [${tilingResult.untiled}]`);
      } else {
        console.log(`✓ ${seedId}: Tiling valid (${tilingResult.seed_vocab || 'ok'} → ${legos.length} LEGOs)`);
      }
    }

    // 3. VOCAB VALIDATION: For each LEGO, add its vocab THEN check phrases
    // Rule: LEGO N can use vocab from seeds 1..S-1 plus LEGOs 1..N of current seed (including itself)
    const vocabSet = await loadCourseVocab(course_code);

    const vocabViolations = [];
    for (const lego of legos) {
      const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
      const isDuplicate = duplicateLegos.some(d => d.lego_id === legoId);

      // Add THIS LEGO's vocab first (so its phrases can use it)
      addToCourseVocab(course_code, { target: lego.target, type: lego.type, components: lego.components });

      // THEN check phrases (can use this LEGO + all prior vocab)
      if (!isDuplicate && lego.phrases && lego.phrases.length > 0) {
        const violations = checkVocabViolations(lego.phrases, vocabSet, course_code);
        if (violations.length > 0 && !SKIP_VALIDATION) {
          vocabViolations.push({
            lego_id: legoId,
            violations: violations.slice(0, 3)  // First 3
          });
        }
      }
    }

    if (vocabViolations.length > 0) {
      // Clear vocab cache since we're rejecting
      courseVocabCache.delete(course_code);
      errors.push({
        type: 'vocab',
        message: 'Vocabulary violations - phrases use unknown vocabulary',
        legos_with_violations: vocabViolations,
        methodology: METHODOLOGY_HINTS.vocab
      });
    }

    // 4. PHRASE COUNT VALIDATION
    const globalPosition = (seed_number - 1) * 3;  // Rough estimate
    for (const lego of legos) {
      const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
      const isDuplicate = duplicateLegos.some(d => d.lego_id === legoId);
      if (isDuplicate) continue;

      const phraseCount = lego.phrases?.length || 0;
      const legoPosition = globalPosition + lego.idx;

      let minRequired = MIN_PHRASES_PER_LEGO;
      if (legoPosition <= 3) minRequired = 1;
      else if (legoPosition <= 6) minRequired = 2;
      else if (legoPosition <= 10) minRequired = 3;

      if (phraseCount < minRequired && !SKIP_VALIDATION) {
        errors.push({
          type: 'phrases',
          message: `${legoId}: Only ${phraseCount} phrases (need ${minRequired}+ at position ~${legoPosition})`,
          lego_id: legoId,
          methodology: METHODOLOGY_HINTS.phrases
        });
      }
    }

    // 5. PHRASE COMPLEXITY VALIDATION (ETERNAL phrases for spaced repetition)
    // Only check for non-early LEGOs (position > 10 means enough vocab exists)
    if (!SKIP_VALIDATION && globalPosition > 10) {
      for (const lego of legos) {
        const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
        const isDuplicate = duplicateLegos.some(d => d.lego_id === legoId);
        if (isDuplicate) continue;

        if (lego.phrases && lego.phrases.length > 0) {
          const complexityResult = checkPhraseComplexity(lego.phrases, course_code);
          if (!complexityResult.valid) {
            errors.push({
              type: 'phrase_complexity',
              message: complexityResult.error,
              lego_id: legoId,
              tiers: complexityResult.tiers,
              methodology: METHODOLOGY_HINTS.phrases
            });
            console.log(`✗ ${legoId}: PHRASE COMPLEXITY - ${complexityResult.error}`);
          }
        }
      }
    }

    // If any errors, reject everything
    if (errors.length > 0) {
      console.log(`✗ ${seedId}: REJECTED - ${errors.length} validation error(s)`);
      return res.status(400).json({
        error: 'Validation failed',
        seed: seedId,
        errors,
        warnings,
        hint: 'Fix all errors and resubmit. Nothing was inserted.'
      });
    }

    // =========================================================================
    // INSERT PHASE (all validations passed)
    // =========================================================================

    console.log(`\nInserting ${seedId}...`);

    // 1. Insert/update seed
    const { error: seedError } = await supabase
      .from('course_seeds')
      .upsert({
        course_code,
        seed_number,
        known_text,
        target_text,
        status: 'released',
        version: 1
      }, { onConflict: 'course_code,seed_number' });

    if (seedError) throw new Error(`Seed insert failed: ${seedError.message}`);
    console.log(`✓ Seed: "${known_text}" → "${target_text}"`);

    // 2. Insert LEGOs and phrases
    let totalPhrases = 0;
    let totalBuildupPhrases = 0;
    let skippedDuplicates = 0;

    for (const lego of legos) {
      const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
      const isDuplicate = duplicateLegos.some(d => d.lego_id === legoId);

      // Insert LEGO
      const { error: legoError } = await supabase
        .from('course_legos')
        .upsert({
          course_code,
          seed_number,
          lego_index: lego.idx,
          type: lego.type || 'A',
          is_new: !isDuplicate,
          known_text: lego.known,
          target_text: lego.target,
          components: lego.components || null,
          status: 'draft',
          version: 1
        }, { onConflict: 'course_code,seed_number,lego_index' });

      if (legoError) throw new Error(`LEGO insert failed: ${legoError.message}`);

      // Skip baskets for duplicates
      if (isDuplicate) {
        skippedDuplicates++;
        console.log(`  ${legoId}: ${lego.known} → ${lego.target} (duplicate, no baskets)`);
        continue;
      }

      // Generate phrases (with M-LEGO build-up)
      let allPhraseRows = [];
      let buildupCount = 0;
      let practiceStartPosition = 1;

      // M-TYPE BUILD-UP
      if (lego.type === 'M' && lego.components && lego.components.length > 0) {
        const { buildupPhrases, startPosition } = generateBuildupPhrases(
          { seed: seed_number, idx: lego.idx, known: lego.known, target: lego.target, components: lego.components },
          course_code
        );
        allPhraseRows = [...buildupPhrases];
        buildupCount = buildupPhrases.length;
        practiceStartPosition = startPosition;
        totalBuildupPhrases += buildupCount;
      }

      // Practice phrases
      if (lego.phrases && lego.phrases.length > 0) {
        const sorted = [...lego.phrases].sort((a, b) => a.target.length - b.target.length);

        const practicePhrases = sorted.map((p, i) => ({
          course_code,
          seed_number,
          lego_index: lego.idx,
          position: practiceStartPosition + i,
          known_text: p.known,
          target_text: p.target,
          word_count: p.target.length,
          lego_count: (p.known.match(/\s+/g) || []).length + 1,
          metadata: {},
          status: 'draft',
          version: 1
        }));

        allPhraseRows = [...allPhraseRows, ...practicePhrases];
      }

      // Insert all phrases
      if (allPhraseRows.length > 0) {
        const { error: phraseError } = await supabase
          .from('course_practice_phrases')
          .upsert(allPhraseRows, { onConflict: 'course_code,seed_number,lego_index,position' });

        if (phraseError) throw new Error(`Phrase insert failed: ${phraseError.message}`);
        totalPhrases += allPhraseRows.length;
      }

      const buildupInfo = buildupCount > 0 ? ` [${buildupCount} buildup + ${lego.phrases?.length || 0} practice]` : '';
      console.log(`  ${legoId}: ${lego.known} → ${lego.target} (${allPhraseRows.length} phrases${buildupInfo})`);
    }

    console.log(`\n✓ ${seedId} COMPLETE`);
    console.log(`  LEGOs: ${legos.length} (${skippedDuplicates} duplicates)`);
    console.log(`  Phrases: ${totalPhrases} (${totalBuildupPhrases} buildup)`);
    console.log(`${'='.repeat(60)}\n`);

    res.json({
      ok: true,
      seed: seedId,
      known_text,
      target_text,
      legos: legos.length,
      duplicates_skipped: skippedDuplicates,
      phrases: totalPhrases,
      buildup_phrases: totalBuildupPhrases,
      warnings: warnings.length > 0 ? warnings : undefined
    });

  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/stats/:courseCode - Get course stats with quality metrics
 */
app.get('/api/stats/:courseCode', async (req, res) => {
  const { courseCode } = req.params;

  const { count: legos } = await supabase
    .from('course_legos')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode);

  const { count: phrases } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode);

  // Count DISTINCT seed numbers (not all LEGO rows)
  const { data: seedData } = await supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', courseCode);
  const seeds = new Set(seedData?.map(r => r.seed_number)).size;

  const ratio = legos > 0 ? (phrases/legos) : 0;
  const quality = ratio >= MIN_BATCH_PHRASE_RATIO ? 'PASS' : 'FAIL';

  // Get vocab size
  const vocabSet = await loadCourseVocab(courseCode);
  const chinese = isChinese(courseCode);

  res.json({
    course_code: courseCode,
    seeds: seeds || 0,
    legos: legos || 0,
    phrases: phrases || 0,
    ratio: ratio.toFixed(1),
    vocab_size: vocabSet.size,
    vocab_mode: chinese ? 'characters' : 'words',
    quality,
    thresholds: {
      min: MIN_PHRASES_PER_LEGO,
      target: TARGET_PHRASES_PER_LEGO,
      max: MAX_PHRASES_PER_LEGO,
      min_batch_ratio: MIN_BATCH_PHRASE_RATIO
    }
  });
});

/**
 * GET /api/seeds - Get canonical seeds (668 master English seeds)
 * These have {target} placeholder for the target language name
 */
app.get('/api/seeds', async (req, res) => {
  const limit = parseInt(req.query.limit) || 668;
  const offset = parseInt(req.query.offset) || 0;

  const { data: seeds, error } = await supabase
    .from('canonical_seeds')
    .select('seed_number, seed_id, source_text')
    .order('seed_number')
    .range(offset, offset + limit - 1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({
    source: 'canonical_seeds',
    total: 668,
    count: seeds?.length || 0,
    offset,
    seeds: seeds || []
  });
});

/**
 * GET /api/seeds/:courseCode - Get course-specific seeds (legacy)
 * Use canonical_seeds endpoint instead for new courses
 */
app.get('/api/seeds/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const limit = parseInt(req.query.limit) || 260;
  const offset = parseInt(req.query.offset) || 0;

  const { data: seeds, error } = await supabase
    .from('course_seeds')
    .select('seed_number, seed_id, known_text, target_text')
    .eq('course_code', courseCode)
    .order('seed_number')
    .range(offset, offset + limit - 1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({
    course_code: courseCode,
    count: seeds?.length || 0,
    offset,
    seeds: seeds || []
  });
});

/**
 * GET /api/vocab/:courseCode - Get current vocabulary for a course
 * Useful for agents to check what's available before submitting
 */
app.get('/api/vocab/:courseCode', async (req, res) => {
  const { courseCode } = req.params;
  const vocabSet = await loadCourseVocab(courseCode);
  const chinese = isChinese(courseCode);

  res.json({
    course_code: courseCode,
    mode: chinese ? 'character' : 'word',
    vocab_size: vocabSet.size,
    vocab: [...vocabSet].sort().join(chinese ? '' : ', ')
  });
});

/**
 * PATCH /api/seed/:courseCode/:seedNumber - Update seed's target translation
 * Call this after completing all LEGOs for a seed to set the full translation
 */
app.patch('/api/seed/:courseCode/:seedNumber', async (req, res) => {
  const { courseCode, seedNumber } = req.params;
  const { target_text } = req.body;
  const seedNum = parseInt(seedNumber);

  if (!target_text) {
    return res.status(400).json({ error: 'target_text is required' });
  }

  const { error } = await supabase
    .from('course_seeds')
    .update({ target_text, status: 'released' })
    .eq('course_code', courseCode)
    .eq('seed_number', seedNum);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  console.log(`✓ S${String(seedNum).padStart(4,'0')} translation: ${target_text}`);
  res.json({ ok: true, seed: seedNum, target_text });
});

/**
 * POST /api/phrases - Add phrases to an existing LEGO basket
 * Used for topping up baskets that need more phrases
 */
app.post('/api/phrases', async (req, res) => {
  const { course_code, seed_number, lego_index, phrases } = req.body;

  if (!course_code || !seed_number || !lego_index || !phrases || !Array.isArray(phrases)) {
    return res.status(400).json({
      error: 'Required: course_code, seed_number, lego_index, phrases (array)'
    });
  }

  // Verify LEGO exists
  const { data: lego, error: legoErr } = await supabase
    .from('course_legos')
    .select('id, known_text, target_text')
    .eq('course_code', course_code)
    .eq('seed_number', seed_number)
    .eq('lego_index', lego_index)
    .single();

  if (legoErr || !lego) {
    return res.status(404).json({
      error: `LEGO not found: ${course_code} S${seed_number}L${lego_index}`
    });
  }

  // Get current max position
  const { data: existing } = await supabase
    .from('course_practice_phrases')
    .select('position')
    .eq('course_code', course_code)
    .eq('seed_number', seed_number)
    .eq('lego_index', lego_index)
    .order('position', { ascending: false })
    .limit(1);

  let nextPosition = (existing?.[0]?.position || 0) + 1;

  // VOCABULARY VALIDATION
  const chinese = isChinese(course_code);
  const vocabSet = await loadCourseVocab(course_code);

  const violations = [];
  const validPhrases = [];

  for (const phrase of phrases) {
    const { known, target } = phrase;
    if (!known || !target) continue;

    // Check vocab
    const phraseChars = chinese
      ? [...target].filter(c => c.trim() && !/[\s\u3000。，！？、：；""'']/.test(c))
      : target.toLowerCase().split(/\s+/);

    const unknown = phraseChars.filter(c => !vocabSet.has(c));

    if (unknown.length > 0) {
      violations.push({
        phrase: target,
        unknown: chinese ? unknown.join('') : unknown.join(', ')
      });
    } else {
      validPhrases.push({
        course_code,
        seed_number,
        lego_index,
        position: nextPosition++,
        known_text: known,
        target_text: target
      });
    }
  }

  if (violations.length > 0) {
    return res.status(400).json({
      error: 'Vocabulary violations detected',
      violations,
      message: 'These phrases use characters not yet introduced'
    });
  }

  if (validPhrases.length === 0) {
    return res.status(400).json({ error: 'No valid phrases to insert' });
  }

  // Insert phrases
  const { error: insertErr } = await supabase
    .from('course_practice_phrases')
    .insert(validPhrases);

  if (insertErr) {
    return res.status(500).json({ error: insertErr.message });
  }

  const legoId = `S${String(seed_number).padStart(4,'0')}L${String(lego_index).padStart(2,'0')}`;
  console.log(`✓ Added ${validPhrases.length} phrases to ${legoId}`);

  res.json({
    ok: true,
    lego: legoId,
    added: validPhrases.length,
    phrases: validPhrases.map(p => ({ position: p.position, target: p.target_text }))
  });
});

/**
 * DELETE /api/course/:courseCode - Clear a course
 */
app.delete('/api/course/:courseCode', async (req, res) => {
  const { courseCode } = req.params;

  await supabase.from('course_practice_phrases').delete().eq('course_code', courseCode);
  await supabase.from('course_legos').delete().eq('course_code', courseCode);

  // Clear vocab cache
  courseVocabCache.delete(courseCode);

  console.log(`Cleared course: ${courseCode}`);
  res.json({ ok: true, cleared: courseCode });
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  Course Builder API - Port ${PORT}                            ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  VALIDATION GATES:                                           ║`);
  console.log(`║  1. TILING: Seed target must be tileable from LEGO targets   ║`);
  console.log(`║  2. ZUT: Same known → same target (or reject)                ║`);
  console.log(`║  3. VOCAB: Phrases only use introduced vocabulary            ║`);
  console.log(`║  4. COUNT: min ${MIN_PHRASES_PER_LEGO}, target ${TARGET_PHRASES_PER_LEGO}, max ${MAX_PHRASES_PER_LEGO} phrases/LEGO           ║`);
  console.log(`║  5. ETERNAL: ${MIN_ETERNAL_PHRASES}+ phrases with 12+ chars (spaced repetition)     ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  METHODOLOGY COMMANDS (shown on rejection):                  ║`);
  console.log(`║  • /ssi-decompose-seed - LEGO decomposition & tiling         ║`);
  console.log(`║  • /ssi-build-phrases  - Phrase requirements & progression   ║`);
  console.log(`║  • /ssi-learner-pattern - What the learner experiences       ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  GOLDEN PATH:                                                ║`);
  console.log(`║  POST /api/seed/complete - Atomic seed+LEGOs+phrases         ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Other Endpoints:                                            ║`);
  console.log(`║  GET  /api/seeds/:code - Canonical seeds from database       ║`);
  console.log(`║  POST /api/lego   - Insert single LEGO                       ║`);
  console.log(`║  POST /api/batch  - Insert multiple LEGOs                    ║`);
  console.log(`║  PATCH /api/seed/:code/:num - Update seed translation        ║`);
  console.log(`║  GET  /api/stats/:code - Quality metrics + vocab size        ║`);
  console.log(`║  GET  /api/vocab/:code - Current vocabulary set              ║`);
  console.log(`║  DELETE /api/course/:code - Clear course + vocab cache       ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);
});
