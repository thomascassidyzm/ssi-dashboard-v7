/**
 * Validation gates — tiling, phrase complexity, balance, ZUT, vocab.
 * Mix of pure and DB-dependent functions.
 * DB-dependent functions receive ctx or supabase as parameter.
 */

const { isChinese, getTargetLang, getCharThresholds, getGoldenSeedCount, CHARS_PER_SYLLABLE, PREPOSITIONS } = require('./language-config.cjs');
const { extractVocab, normalizeForZUT, normalizeForStorage, normalizeForContainment, checkWordContainment } = require('./text-normalization.cjs');

// ─── Methodology command hints (guide agents on rejection) ─────────────

const METHODOLOGY_HINTS = {
  tiling: `
📚 See ralph-methodology.md for how to break seeds into LEGOs:
   - Every word/character in seed must appear in a LEGO target
   - Order LEGOs SHORT→LONG (by target length)
   - Use M-LEGOs for multi-word chunks`,

  phrases: `
📚 See ralph-methodology.md for phrase requirements:
   BUILD: flexible quantity based on LEGO length (LEGO + 1-5 syllables)
   - Fragments OK, debut only
   - Quantity depends on LEGO complexity

   USE: minimum 5 per LEGO (LEGO + 5-10 syllables)
   - Full sentences PREFERRED, not required (Kai, 2026-08-17): the test is
     standalone-sayable — clear, unambiguous course-wide, and longish
   - Reused in consolidate/review phases
   - ALL are eternal-eligible (go into spaced repetition)

   Graduated: relaxed (seeds 1-5), softened (6-20), hard (21+)`,

  build_use: `
📚 See ralph-methodology.md for BUILD/USE phrase structure:
   BUILD phrases (flexible quantity):
   - Lock in the pattern, get the LEGO "in"
   - Fragments OK (don't need complete sentences)
   - LEGO + 1-5 syllables
   - Debut only, NOT eternal-eligible

   USE phrases (minimum 5):
   - Natural production, put the LEGO "out"
   - Full sentences PREFERRED but NOT a hard rule (Kai, 2026-08-17). The test is
     "something you could say on its own in a conversation" — people say incomplete
     things. A shorter USE phrase passes if it is clear, unambiguous for the rest of
     the course (forward-checked), and longish. Check it harder; don't reject on shape.
   - LEGO + 5-10 syllables
   - ALL eternal-eligible (go into spaced repetition)
   - Reused in consolidate/review phases
   - Each USE phrase MUST have a score (5-9)

   SCORING (5-9) - self-assess each USE phrase:
   9 = grammatically perfect, semantically excellent, high value in both languages
   7-8 = strong phrase, minor stylistic preferences possible
   5-6 = solid, functional, no issues but not remarkable
   4 or below = hard reject, REWRITE before submitting`,

  vocab: `
📚 See ralph-methodology.md for how vocabulary builds:
   - Phrases can only use vocabulary from prior LEGOs
   - LEGO N can use: (all prior seeds) + (LEGOs 1..N of current seed)`,

  zut: `
📚 See ralph-methodology.md for handling ZUT conflicts:
   - Same known text cannot map to different targets
   - UPCHUNK: Add context to disambiguate
   - Or use a synonym for the known text`,

  overlap: `
📚 See ralph-methodology.md for overlapping LEGOs guidance:
   When word order differs between languages, use BOTH atomic LEGOs AND a chunk M-LEGO.

   Example: "blue thing" = "cosa azul" in Spanish (reversed order)
   - A-LEGO: "blue" → "azul"
   - A-LEGO: "thing" → "cosa"
   - M-LEGO: "blue thing" → "cosa azul" (chunk handles the transformation)

   This is NOT a ZUT conflict because the known_texts are different.`,

  balance: `
📚 See ralph-methodology.md for balance requirements:
   - Prioritize recent, underused LEGOs in new phrases
   - Avoid over-relying on common vocabulary (>1.5x avg usage)
   - Include underused LEGOs (<0.3x avg usage) in your phrases
   - Each LEGO needs balanced practice exposure`,

  length_mismatch: `
📚 PHRASE LENGTH MISMATCH - Translation Fidelity Issue:
   - known_text and target_text must express the SAME meaning
   - If one is much longer, you likely added extra content
   - DO NOT pad phrases with available vocabulary to hit length targets
   - If you need longer phrases, make BOTH languages longer together`,
};

// ─── Tiling validation ─────────────────────────────────────────────────

/**
 * Check if seed target_text can be "tiled" from LEGO targets.
 * Returns: { valid: true } or { valid: false, untiled, message }
 *
 * Collects complete LEGO targets (and component targets) as vocab units.
 * Non-Chinese: derives words from those units, checks each seed word is covered.
 * Chinese: DP segmentation to check the seed can be composed from LEGO targets.
 */
function checkTiling(seedTarget, legos, courseCode, existingVocab) {
  const chinese = isChinese(courseCode);
  const legoTargets = existingVocab ? new Set(existingVocab) : new Set();

  for (const lego of legos) {
    extractVocab(lego.target, chinese).forEach(v => legoTargets.add(v));
    if (lego.type === 'M' && lego.components) {
      for (const comp of lego.components) {
        extractVocab(comp.target, chinese).forEach(v => legoTargets.add(v));
      }
    }
  }

  if (chinese) {
    const normalized = normalizeForStorage(seedTarget, true);
    const uncovered = findUncoveredChinese(normalized, legoTargets);
    if (uncovered) {
      return {
        valid: false,
        untiled: uncovered,
        seed_vocab: normalized.length,
        lego_vocab: legoTargets.size,
        message: `Seed target contains vocabulary not covered by LEGOs: [${uncovered}]`,
      };
    }
  } else {
    // Derive word set from LEGO targets
    const wordSet = new Set();
    for (const entry of legoTargets) {
      for (const word of entry.split(' ')) {
        if (word) wordSet.add(word);
      }
    }

    const seedNorm = normalizeForStorage(seedTarget, false);
    const seedWords = seedNorm.split(' ').filter(w => w);
    const untiled = seedWords.filter(w => !wordSet.has(w));

    if (untiled.length > 0) {
      return {
        valid: false,
        untiled: untiled.join(', '),
        seed_vocab: seedWords.length,
        lego_vocab: wordSet.size,
        message: `Seed target contains vocabulary not covered by LEGOs: [${untiled.join(', ')}]`,
      };
    }
  }

  return { valid: true };
}

// ─── Phrase complexity validation ──────────────────────────────────────

/**
 * Categorize phrases by length tier and check for minimum counts.
 * Returns: { valid: true, tiers } or { valid: false, error, tiers }
 */
function checkPhraseComplexity(phrases, courseCode, seedNumber = 999) {
  const thresholds = getCharThresholds(courseCode);
  const targetLang = getTargetLang(courseCode);
  const charsPerSyl = CHARS_PER_SYLLABLE[targetLang] || CHARS_PER_SYLLABLE.DEFAULT;

  const tiers = { SHORT: [], MEDIUM: [], LONG: [] };
  const middleMin = Math.round(5 * charsPerSyl);
  const middleMax = Math.round(10 * charsPerSyl);
  const middleRange = [];

  for (const phrase of phrases) {
    const length = phrase.target
      .replace(/[\s\u3000。，！？、：；""''.,!?;:'"()-]/g, '')
      .length;

    if (length >= thresholds.LONG.min) {
      tiers.LONG.push({ target: phrase.target, length });
    } else if (length >= thresholds.MEDIUM.min) {
      tiers.MEDIUM.push({ target: phrase.target, length });
    } else if (length >= thresholds.SHORT.min) {
      tiers.SHORT.push({ target: phrase.target, length });
    }

    if (length >= middleMin && length <= middleMax) {
      middleRange.push({ target: phrase.target, length });
    }
  }

  const tierCounts = {
    SHORT: tiers.SHORT.length,
    MEDIUM: tiers.MEDIUM.length,
    LONG: tiers.LONG.length,
    middleRange: middleRange.length,
  };

  if (seedNumber <= 5) {
    return { valid: true, tiers: tierCounts, mode: 'relaxed (seed 1-5)' };
  }

  let minShort, minMedium, minLong, minMiddle;
  if (seedNumber <= 20) {
    minShort = 1; minMedium = 1; minLong = 2; minMiddle = 1;
  } else {
    minShort = 2; minMedium = 2; minLong = 3; minMiddle = 2;
  }

  const errors = [];
  if (tiers.SHORT.length < minShort) {
    errors.push(`SHORT: need ${minShort}+, got ${tiers.SHORT.length} (${thresholds.SHORT.min}-${thresholds.SHORT.max} chars ≈ 3-5 syllables)`);
  }
  if (tiers.MEDIUM.length < minMedium) {
    errors.push(`MEDIUM: need ${minMedium}+, got ${tiers.MEDIUM.length} (${thresholds.MEDIUM.min}-${thresholds.MEDIUM.max} chars ≈ 6-9 syllables)`);
  }
  if (tiers.LONG.length < minLong) {
    errors.push(`LONG: need ${minLong}+, got ${tiers.LONG.length} (${thresholds.LONG.min}+ chars ≈ 10+ syllables)`);
  }
  if (middleRange.length < minMiddle) {
    errors.push(`MIDDLE: need ${minMiddle}+, got ${middleRange.length} (${middleMin}-${middleMax} chars ≈ 5-10 syllables)`);
  }

  if (errors.length > 0) {
    const mode = seedNumber <= 20 ? 'softened (seed 6-20)' : 'hard (seed 21+)';
    return {
      valid: false,
      tiers: tierCounts,
      thresholds,
      mode,
      error: `Phrase balance failed: ${errors.join('; ')}`,
      hint: seedNumber <= 20
        ? `Softened mode: 1+ SHORT (${thresholds.SHORT.min}+ chars), 1+ MEDIUM (${thresholds.MEDIUM.min}+ chars), 2+ LONG (${thresholds.LONG.min}+ chars)`
        : `Hard mode: 2+ SHORT, 2+ MEDIUM, 3+ LONG (${thresholds.LONG.min}+ chars for ${targetLang})`,
    };
  }

  return { valid: true, tiers: tierCounts, thresholds, mode: seedNumber <= 20 ? 'softened' : 'hard' };
}

// ─── Vocabulary violation check ────────────────────────────────────────

/**
 * Check phrases for vocabulary violations.
 * Returns array of violations: [{ phrase, unknown: [...] }]
 *
 * vocabSet contains complete LEGO targets and component targets.
 * A phrase must be tileable entirely from these chunks — no word-level splitting,
 * no free recombination. This prevents conjugations, inversions, and contractions
 * that were never actually taught in any LEGO.
 *
 * For space-delimited languages: DP word-sequence tiling against known chunks.
 * For Chinese/Japanese (no spaces): DP character-sequence tiling.
 */
function checkVocabViolations(phrases, vocabSet, courseCode) {
  const chinese = isChinese(courseCode);
  const violations = [];

  if (chinese) {
    for (const phrase of phrases) {
      const normalized = normalizeForStorage(phrase.target, true);
      if (!normalized) continue;
      const uncovered = findUncoveredChinese(normalized, vocabSet);
      if (uncovered) {
        violations.push({
          phrase: phrase.target,
          unknown: uncovered,
        });
      }
    }
  } else {
    // Build a set of known chunks as word arrays for DP matching.
    // Each chunk is a complete LEGO target or component target — never split further.
    // Index by first word for fast lookup.
    const chunksByFirstWord = new Map();
    for (const legoTarget of vocabSet) {
      const words = normalizeForContainment(legoTarget).split(' ').filter(w => w);
      if (words.length === 0) continue;
      const first = words[0];
      if (!chunksByFirstWord.has(first)) chunksByFirstWord.set(first, []);
      chunksByFirstWord.get(first).push(words);
    }

    for (const phrase of phrases) {
      const normalized = normalizeForContainment(phrase.target);
      const phraseWords = normalized.split(' ').filter(w => w);
      const n = phraseWords.length;
      if (n === 0) continue;

      // dp[i] = true means phraseWords[0..i-1] can be tiled by known chunks
      const dp = new Array(n + 1).fill(false);
      dp[0] = true;

      for (let i = 0; i < n; i++) {
        if (!dp[i]) continue;
        const candidates = chunksByFirstWord.get(phraseWords[i]);
        if (!candidates) continue;
        for (const chunk of candidates) {
          const len = chunk.length;
          if (i + len > n) continue;
          let match = true;
          for (let j = 0; j < len; j++) {
            if (phraseWords[i + j] !== chunk[j]) { match = false; break; }
          }
          if (match) dp[i + len] = true;
        }
      }

      if (!dp[n]) {
        // Find the first untileable position for error reporting
        let lastReachable = 0;
        for (let i = 0; i <= n; i++) {
          if (dp[i]) lastReachable = i;
        }
        const uncoveredWords = phraseWords.slice(lastReachable);
        violations.push({
          phrase: phrase.target,
          unknown: uncoveredWords.join(' '),
        });
      }
    }
  }

  return violations;
}

/**
 * Check if a Chinese phrase can be fully segmented from known LEGO targets.
 * Returns null if OK, or the uncovered substring if not.
 */
function findUncoveredChinese(phrase, vocabSet) {
  const n = phrase.length;
  if (n === 0) return null;

  // dp[i] = true means phrase[0..i-1] can be covered by known LEGOs
  const dp = new Array(n + 1).fill(false);
  dp[0] = true;

  for (let i = 1; i <= n; i++) {
    for (const entry of vocabSet) {
      const len = entry.length;
      if (len <= i && dp[i - len] && phrase.substring(i - len, i) === entry) {
        dp[i] = true;
        break;
      }
    }
  }

  if (dp[n]) return null;

  // Find the first position we can't get past
  let lastReachable = 0;
  for (let i = 0; i <= n; i++) {
    if (dp[i]) lastReachable = i;
  }
  return phrase.substring(lastReachable);
}

// ─── LEGO balance scoring (DB-dependent) ───────────────────────────────

/**
 * Calculate practice scores for all LEGOs in a course.
 * practice_score = phrase_count / seeds_since_introduction
 */
async function calculateLegoBalanceScores(supabase, courseCode, currentSeedNumber) {
  const { data: legos, error: legoError } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, is_new')
    .eq('course_code', courseCode)
    .eq('is_new', true);

  if (legoError) throw new Error(`Balance check failed: ${legoError.message}`);
  if (!legos || legos.length === 0) return { legoScores: new Map(), underused: [], overused: [], avgScore: 0 };

  const { data: phraseCounts, error: phraseError } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index')
    .eq('course_code', courseCode);

  if (phraseError) throw new Error(`Balance check failed: ${phraseError.message}`);

  const phrasesByLego = {};
  (phraseCounts || []).forEach(p => {
    const key = `${p.seed_number}-${p.lego_index}`;
    phrasesByLego[key] = (phrasesByLego[key] || 0) + 1;
  });

  const legoScores = new Map();
  const underused = [];
  const overused = [];
  let totalScore = 0;

  const BALANCE_UNDERUSED_THRESHOLD = 0.3;
  const BALANCE_OVERUSED_THRESHOLD = 1.5;

  for (const lego of legos) {
    const key = `${lego.seed_number}-${lego.lego_index}`;
    const phraseCount = phrasesByLego[key] || 0;
    const seedsSince = Math.max(1, currentSeedNumber - lego.seed_number + 1);
    const score = phraseCount / seedsSince;

    legoScores.set(lego.target_text, {
      known: lego.known_text,
      target: lego.target_text,
      phraseCount,
      seedsSince,
      score: Math.round(score * 100) / 100,
    });

    totalScore += score;

    if (score < BALANCE_UNDERUSED_THRESHOLD) {
      underused.push({ known: lego.known_text, target: lego.target_text, score: Math.round(score * 100) / 100 });
    } else if (score > BALANCE_OVERUSED_THRESHOLD) {
      overused.push({ known: lego.known_text, target: lego.target_text, score: Math.round(score * 100) / 100 });
    }
  }

  const avgScore = legos.length > 0 ? totalScore / legos.length : 0;

  return {
    legoScores,
    underused: underused.sort((a, b) => a.score - b.score).slice(0, 10),
    overused: overused.sort((a, b) => b.score - a.score).slice(0, 10),
    avgScore: Math.round(avgScore * 100) / 100,
  };
}

/**
 * Check if new phrases have balanced vocabulary usage.
 */
function checkPhraseBalance(phrases, balanceData, courseCode) {
  const { legoScores, underused, overused } = balanceData;

  if (legoScores.size === 0 || underused.length === 0) {
    return { balanced: true, reason: 'insufficient_data' };
  }

  const overusedTargets = new Set(overused.map(l => l.target));
  const underusedTargets = new Set(underused.map(l => l.target));

  let overusedCount = 0;
  let underusedCount = 0;
  let totalVocabRefs = 0;

  for (const phrase of phrases) {
    const target = phrase.target;
    for (const [legoTarget] of legoScores) {
      if (target.includes(legoTarget)) {
        totalVocabRefs++;
        if (overusedTargets.has(legoTarget)) overusedCount++;
        if (underusedTargets.has(legoTarget)) underusedCount++;
      }
    }
  }

  const overusedRatio = totalVocabRefs > 0 ? overusedCount / totalVocabRefs : 0;
  const hasUnderusedUsage = underusedCount > 0;

  if (overusedRatio > 0.5 && !hasUnderusedUsage && underused.length > 0) {
    return {
      balanced: false,
      overusedRatio: Math.round(overusedRatio * 100),
      overusedInPhrases: overused.filter(l =>
        phrases.some(p => p.target.includes(l.target))
      ).slice(0, 5),
      underusedAvailable: underused.slice(0, 5),
      message: `${Math.round(overusedRatio * 100)}% of vocabulary refs are overused LEGOs, with 0 underused LEGOs included`,
    };
  }

  return { balanced: true };
}

// ─── LEGO conflict detection (ZUT + overlap) ───────────────────────────

/**
 * Check for LEGO conflicts before insertion.
 * Returns: { conflict: false } | { conflict: 'duplicate', ... } | { conflict: 'zut', ... }
 */
async function checkLegoConflict(supabase, courseCode, knownText, targetText, currentSeedNumber = null) {
  let query = supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, type')
    .eq('course_code', courseCode)
    .eq('known_text', knownText);

  if (currentSeedNumber !== null) {
    query = query.lt('seed_number', currentSeedNumber);
  }

  const { data: existing, error } = await query;

  if (error) throw new Error(`Conflict check failed: ${error.message}`);
  if (!existing || existing.length === 0) return { conflict: false };

  const sameTarget = existing.find(e => e.target_text === targetText);

  if (sameTarget) {
    return {
      conflict: 'duplicate',
      existing: sameTarget,
      legoId: `S${String(sameTarget.seed_number).padStart(4,'0')}L${String(sameTarget.lego_index).padStart(2,'0')}`,
    };
  }

  const existingTargets = existing.map(e => ({
    target: e.target_text,
    legoId: `S${String(e.seed_number).padStart(4,'0')}L${String(e.lego_index).padStart(2,'0')}`,
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
      `  - Find a synonym or variant for "${knownText}"`,
      `OVERLAP: If word order differs in target language, you may need BOTH atomic and chunk LEGOs`,
    ],
  };
}

/**
 * Check if a LEGO represents an overlapping chunk.
 */
async function checkLegoOverlap(supabase, courseCode, knownText, targetText) {
  const { data: allLegos, error } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, type')
    .eq('course_code', courseCode);

  if (error || !allLegos) return { isOverlap: false, containedLegos: [] };

  const knownLower = knownText.toLowerCase();
  const targetLower = targetText.toLowerCase();
  const knownWords = knownLower.split(/\s+/);
  const containedLegos = [];

  for (const lego of allLegos) {
    const legoKnown = lego.known_text.toLowerCase();
    const legoTarget = lego.target_text.toLowerCase();

    if (knownWords.includes(legoKnown)) {
      const targetWords = targetLower.split(/\s+/).concat([...targetLower]);
      if (targetWords.some(w => w.includes(legoTarget) || legoTarget.includes(w))) {
        containedLegos.push({
          legoId: `S${String(lego.seed_number).padStart(4,'0')}L${String(lego.lego_index).padStart(2,'0')}`,
          known: lego.known_text,
          target: lego.target_text,
          type: lego.type,
        });
      }
    }
  }

  return {
    isOverlap: containedLegos.length > 0,
    containedLegos,
    note: containedLegos.length > 0
      ? `This M-LEGO contains ${containedLegos.length} existing A-LEGO(s). This is VALID for word-order differences.`
      : null,
  };
}

// ─── Pattern classification (for briefs) ───────────────────────────────

function classifySeedPattern(seed) {
  if (!seed.legos || seed.legos.length === 0) return 'unknown';
  const mLegos = seed.legos.filter(l => l.type === 'M');
  const aLegos = seed.legos.filter(l => l.type === 'A');
  const hasOverlap = seed.legos.some(l =>
    seed.legos.some(other => other.target !== l.target && other.target.includes(l.target))
  );
  const hasWrappedPrep = mLegos.some(m => {
    const words = m.target.split(' ');
    return words.length >= 3 && words.slice(1, -1).some(w => PREPOSITIONS.includes(w));
  });
  if (hasOverlap) return 'overlapping';
  if (hasWrappedPrep) return 'preposition_wrapping';
  if (mLegos.length === 0) return 'simple_tiling';
  if (aLegos.length > 0 && mLegos.length > 0) return 'mixed';
  return 'all_bundled';
}

function formatDecompositionPatterns(goldenSeeds) {
  if (!goldenSeeds || goldenSeeds.length === 0) return '';
  const lines = [];

  for (const seed of goldenSeeds) {
    if (!seed.legos || seed.legos.length === 0) continue;
    const patternType = classifySeedPattern(seed);
    const hasOverlap = patternType === 'overlapping';

    const patternLabels = {
      overlapping: 'Overlapping — smaller LEGO introduced before its containing molecule',
      preposition_wrapping: 'Preposition wrapping — preposition absorbed inside M-LEGO, not at edge',
      simple_tiling: 'Simple tiling — all clear atoms',
      mixed: 'Mixed — some atoms, some bundles',
      all_bundled: 'All bundled — every piece needs context',
    };
    const pattern = patternLabels[patternType] || patternType;

    lines.push(`**${pattern}**`);
    lines.push(`${seed.known_text}`);

    if (hasOverlap) {
      for (const lego of seed.legos) {
        const label = lego.type === 'M' ? 'M' : 'A';
        lines.push(`  ${label}: ${lego.target}`);
      }
    } else {
      lines.push(seed.legos.map(l => l.target).join(' | '));
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Phrase-level ZUT (production-direction uniqueness) ─────────────────
// The LEGO-level checkLegoConflict enforces one-known→one-target for LEGOs,
// but practice PHRASES had no such gate — so a decomposition could gloss
// "I think" as 我觉得 in one seed and 我想 in another. That is a ZUT
// violation: the learner, prompted with one English thought, cannot know
// which target to produce. This checks each submitted phrase's known→target
// against the existing course (prior seeds). Punctuation/whitespace is
// normalised away (你准备好了吗？ vs 你准备好了吗 = same spoken answer, NOT a
// collision); only a genuinely different target for the same English collides.
// Resolution (the builder must do one): CONSOLIDATE to the existing target, or
// DIFFERENTIATE the English prompt so each maps uniquely.
async function checkPhraseZUT(supabase, courseCode, phrases, currentSeedNumber = null) {
  const nk = s => (s || '').toLowerCase().trim().replace(/[.?!,，。？！、]+$/, '');
  const nt = s => (s || '').replace(/[\s。，？！、.?!,]/g, '');
  const subByKnown = new Map(); // normKnown -> { known, target, normTarget }
  const rawKnowns = [];
  for (const p of phrases || []) {
    if (!p.known || !p.target) continue;
    const k = nk(p.known);
    if (!subByKnown.has(k)) { subByKnown.set(k, { known: p.known, target: p.target, normTarget: nt(p.target) }); rawKnowns.push(p.known); }
  }
  if (!rawKnowns.length) return [];

  const fetch = async (table) => {
    let q = supabase.from(table).select('known_text, target_text, seed_number').eq('course_code', courseCode).in('known_text', [...new Set(rawKnowns)]);
    if (currentSeedNumber !== null) q = q.lt('seed_number', currentSeedNumber);
    const { data } = await q;
    return data || [];
  };
  const existing = [...(await fetch('course_practice_phrases')), ...(await fetch('course_legos'))];

  const collisions = [], seen = new Set();
  for (const e of existing) {
    const sub = subByKnown.get(nk(e.known_text));
    if (!sub) continue;
    if (nt(e.target_text) !== sub.normTarget) {
      const key = `${nk(e.known_text)}|${nt(e.target_text)}`;
      if (seen.has(key)) continue; seen.add(key);
      collisions.push({ known: sub.known, new_target: sub.target, existing_target: e.target_text, existing_seed: e.seed_number });
    }
  }
  return collisions;
}

// ─── Frame coverage (7th principle) — WARN-ONLY ────────────────────────
// "Vary along the axis that carries the new distinction." A USE basket whose
// phrases differ only by the filler of one slot (pronoun swaps, topic swaps)
// spends production cycles where the learner gains no new pattern. BUILD may
// repeat frames (chunk automatization); USE must buy new frames — USE phrases
// are eternal spaced-repetition stock.
// Signature = phrase with the LEGO slotted out (◇) and pronouns collapsed (Ⓟ),
// so subject swaps count as ONE pattern. Non-blocking by design: the metric
// has known false positives (e.g. a negator like 没 legitimately varies verbs
// = "lexical" variety IS its axis), so a human/agent adjudicates warnings.
// KNOWN LIMITATION: catches pronoun paradigms and literal repeats, but NOT
// topic-swaps ([X]很有用 ×N — unique signatures, one frame). Those need the
// language-aware frame-family analysis in tools/audit-frame-diversity.cjs,
// run per-course as an audit, not per-submission here.
const FRAME_PRONOUNS_CJK = ['我们', '你们', '他们', '她们', '大家', '我', '你', '他', '她', '它'];
// Latin-script subject/clitic pronouns across the major _for_eng target families, so the
// frame lens collapses subject-swaps in space-separated languages too (was CJK-only, which
// is why frame-coverage read 0 on French). Union is safe — pronoun collisions across langs
// are harmless for a frame signature.
const FRAME_PRONOUNS_LATIN = new Set([
  'je', 'j', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'me', 'te', 'se',          // fr
  'yo', 'tú', 'él', 'ella', 'usted', 'nosotros', 'nosotras', 'vosotros', 'vosotras', 'ellos', 'ellas', 'ustedes', // es
  'io', 'lui', 'lei', 'noi', 'voi', 'loro',                                                         // it
  'eu', 'você', 'voce', 'ele', 'ela', 'nós', 'nos', 'eles', 'elas',                                 // pt
  'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr',                                                     // de
  'i', 'you', 'he', 'she', 'we', 'they', 'it',                                                      // en
]);
const FRAME_CJK_RE = /[㐀-鿿぀-ヿ가-힯]/;

function phraseFrameSignature(target, legoTarget) {
  const t = target || '', lg = legoTarget || '';
  if (FRAME_CJK_RE.test(t)) {
    // char-based (CJK): strip spaces, slot out the LEGO, collapse pronoun chars (original behaviour)
    let s = t.replace(/[？。，！、?!,.\s]/g, '');
    const lego = lg.replace(/[？。，！、?!,.\s]/g, '');
    const i = s.indexOf(lego);
    if (i === -1) return null;
    s = s.slice(0, i) + '◇' + s.slice(i + lego.length);
    for (const p of FRAME_PRONOUNS_CJK) s = s.split(p).join('Ⓟ');
    return s;
  }
  // space-separated (latin etc.): token-based — slot out the LEGO token-span, collapse pronoun WORDS
  const norm = x => x.toLowerCase().replace(/[.,!?;:'"¿¡()«»]/g, '').trim();
  const toks = t.split(/\s+/).map(norm).filter(Boolean);
  const ltoks = lg.split(/\s+/).map(norm).filter(Boolean);
  if (!ltoks.length) return null;
  let idx = -1;
  for (let i = 0; i + ltoks.length <= toks.length; i++) { if (ltoks.every((w, j) => toks[i + j] === w)) { idx = i; break; } }
  if (idx === -1) return null;
  const out = [...toks.slice(0, idx), '◇', ...toks.slice(idx + ltoks.length)]
    .map(w => (w === '◇' ? '◇' : (FRAME_PRONOUNS_LATIN.has(w) ? 'Ⓟ' : w)));
  return out.join('·');
}

function checkBasketFrameCoverage(phrases, legoTarget) {
  const use = (phrases || []).filter(p => {
    const r = p.role || p.phrase_role;
    return !r || r === 'use';
  });
  if (use.length < 3) return [];

  const stripT = s => (s || '').replace(/[？。，！、?!,.\s]/g, '');
  // Count DISTINCT TARGETS per signature, not raw phrases — so CONVERGENCE PAIRS
  // (same target, different English prompt = deliberate many-known→one-target
  // teaching) collapse to one and can't read as monotony, while real pronoun/
  // topic swaps (different targets sharing a collapsed signature) still flag.
  const sigTargets = new Map();
  for (const p of use) {
    const sig = phraseFrameSignature(p.target, legoTarget);
    if (sig == null) continue;
    if (!sigTargets.has(sig)) sigTargets.set(sig, new Set());
    sigTargets.get(sig).add(stripT(p.target));
  }
  const distinctTotal = [...sigTargets.values()].reduce((a, s) => a + s.size, 0);
  if (!distinctTotal) return [];

  let nakedSwaps = 0;
  const warnings = [];
  for (const [sig, targets] of sigTargets) {
    const count = targets.size;
    if (/^Ⓟ*◇Ⓟ*$/.test(sig.replace(/·/g, ''))) nakedSwaps += count;
    if (count >= 3) {
      warnings.push({
        code: 'repeated_frame',
        detail: `${count} distinct USE phrases share one plug-in pattern "${sig}" — vary the frame (question/negation/time/embedding/connective), not the slot filler`,
      });
    }
  }
  if (nakedSwaps > 2) {
    warnings.push({
      code: 'naked_swaps',
      detail: `${nakedSwaps} USE phrases are just [pronoun]+LEGO — subject variation is one pattern, worth at most 2 slots`,
    });
  }
  const diversity = sigTargets.size / distinctTotal;
  if (distinctTotal >= 4 && diversity < 0.6) {
    warnings.push({
      code: 'low_frame_diversity',
      detail: `${sigTargets.size} distinct plug-in patterns across ${distinctTotal} USE phrases (${diversity.toFixed(2)}) — each USE phrase should show a new way the LEGO combines with prior vocabulary`,
    });
  }
  return warnings;
}

// ─── Metadata-gloss check (least-action-to-confidence) ─────────────────
// A debut must hand the learner a producible communicative INTENTION, not a
// grammatical label. "把 = object marker", "条 = measure word for long thin
// objects", "吧 = softening particle" cost cognitive effort and yield zero
// confidence — the learner can produce nothing from them. This is the
// learner-facing form of the methodology's "honest whole-intention gloss, no
// grammar metadata" principle, and it subsumes the older bare-particle idea:
// classifiers and aspect/structural markers are construction-features too, and
// belong INSIDE an M-LEGO (introduce:false), never as a bare debut.
// WARN, not reject: some flags are an intention WITH a parenthetical note
// (杯 "cup/glass (measure word)") that just needs the note stripped, vs pure
// metadata (把 "object marker") that needs upchunking. A human/agent triages.
const METADATA_GLOSS = /\b(marker|particle|classifier|measure word|copula|aspect|disposal|structural|grammatical|degree (?:particle|complement))\b|\((?:ba|de|le|guo|zhe|bei)\)|\((?:disposal|object|passive|progressive|perfective|measure word)\)/i;

function checkMetadataGloss(legos) {
  const warnings = [];
  for (const lego of legos || []) {
    const known = lego.known || lego.known_text || '';
    if (METADATA_GLOSS.test(known)) {
      warnings.push({
        code: 'metadata_gloss',
        lego_index: lego.idx ?? lego.lego_index,
        target: lego.target || lego.target_text,
        known,
        detail: `Debut gloss "${known}" is grammar metadata, not a communicative intention. A learner can produce nothing from it (high action, zero confidence). Strip a parenthetical note if the intention is there (杯 "cup/glass"), or upchunk a true construction-feature into a whole-thought M-LEGO (把/条/吧).`,
      });
    }
  }
  return warnings;
}

// ─── Known-side reconstructability (both-sides tiling — Principle 1 in full) ───
// Pure + POSITION-AGNOSTIC: callers pass currentPos + a compiled ctx whose maps
// use the SAME unit (round for the reorder CLI, seed for generation). A prompt
// must compose from introduced known-glosses + the free class (glue / inflection
// / NPI-under-negation) + construction licenses whose carrier has debuted.
function stemKnownGloss(tok) {
  // EXACT-FORM normaliser (Tom 2026-06-15): NO inflection allowance. A form is usable only if it
  // was introduced as a LEGO or a COMPONENT of an M-LEGO — exact form. Previously this stripped
  // ing/ed/s/e/d, which wrongly let any inflection through; that is expressly disallowed. Lowercase
  // + strip non-letters only. (Genuine glue/NPI stay free via the contract's freeGlue/npiTokens.)
  return (tok || '').toLowerCase().replace(/[^a-z']/g, '');
}
// Expand English contractions so the base word + function word are checked
// separately (shouldn't → should not; that's → that is; I've → I have).
function expandContractions(s) {
  return (s || '').toLowerCase()
    .replace(/n['’]t\b/g, ' not')
    .replace(/['’]ve\b/g, ' have').replace(/['’]re\b/g, ' are').replace(/['’]m\b/g, ' am')
    .replace(/['’]ll\b/g, ' will').replace(/['’]d\b/g, ' would').replace(/['’]s\b/g, ' is');
}
const tokenizeKnown = (s) => expandContractions(s).split(/[^a-z']+/).filter(Boolean);
// English machinery tokens → governing construction id(s). Known-language-specific
// (valid for *_for_eng; a non-English-known contract restates this).
const KNOWN_GRAMMAR = {
  been: ['have-you-been'], got: ['have-got'], going: ['going-to'],
  have: ['have-you-been', 'have-got', 'want-to-have'], "'ve": ['have-you-been', 'have-got', 'want-to-have'],
  ve: ['have-you-been', 'have-got', 'want-to-have'],
};
// Dummy auxiliaries: always free at the token level. The do-support QUESTION
// word-order is gated by its construction regex, not the bare token (so "do not"
// from an expanded contraction never trips do-support).
const DO_AUX = new Set(['do', 'does', 'did']);

// Position-independent free-class sets compiled from a contract.
function compileKnownContract(contract) {
  return {
    contract,
    glue: new Set((contract.freeGlue || []).map(stemKnownGloss)),
    npi: new Set((contract.npiTokens || []).map(stemKnownGloss)),
    neg: new Set([...(contract.negationWords || []), ...(contract.negationWords || []).map(stemKnownGloss)]),
    grammar: KNOWN_GRAMMAR,
  };
}

// ctx = { ...compileKnownContract, stemFirstPos:Map(stem->pos), consPos:{id->pos}, unitPos:[{phrase,pos}] }
function checkKnownSide(known, currentPos, ctx) {
  const C = ctx.contract;
  const probs = [];
  const negRe = C.negationMarkers instanceof RegExp ? C.negationMarkers : new RegExp(C.negationMarkers, 'i');
  const negated = negRe.test(known);
  for (const con of C.constructions || []) {
    const test = con.test instanceof RegExp ? con.test : new RegExp(con.test, 'i');
    if (test.test(known)) {
      const cp = ctx.consPos[con.id];
      if (cp == null || currentPos < cp) probs.push(`construction '${con.id}' not licensed until ${cp === Infinity ? '∞' : cp}`);
    }
  }
  let masked = ' ' + known.toLowerCase() + ' ';
  for (const u of ctx.unitPos || []) {
    const re = new RegExp('\\b' + u.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
    if (re.test(masked)) {
      if (u.pos == null || currentPos < u.pos) probs.push(`gloss-unit "${u.phrase}" not introduced until ${u.pos === Infinity ? '∞' : u.pos}`);
      masked = masked.replace(re, ' ');
    }
  }
  for (const raw of tokenizeKnown(masked)) {
    const s = stemKnownGloss(raw);
    if (!s) continue;
    if (ctx.glue.has(s)) continue;
    if (DO_AUX.has(raw)) continue;
    if (ctx.neg.has(raw) || ctx.neg.has(s)) {
      const cp = ctx.consPos['negation'];
      if (cp != null) {
        if (currentPos < cp) probs.push(`negation "${raw}" not licensed until ${cp === Infinity ? '∞' : cp}`);
        continue;
      }
      // Contract defines no negation construction (e.g. the _default_eng fallback):
      // fall through and require the negation word itself to be an introduced gloss.
    }
    if (ctx.npi.has(s)) { if (negated) continue; probs.push(`NPI token "${raw}" without negation`); continue; }
    if (ctx.grammar[raw] || ctx.grammar[s]) {
      const govs = ctx.grammar[raw] || ctx.grammar[s];
      const ok = govs.some((g) => currentPos >= (ctx.consPos[g] ?? Infinity));
      if (!ok) probs.push(`machinery "${raw}" needs ${govs.join('/')} (unlicensed)`);
      continue;
    }
    const fp = ctx.stemFirstPos.get(s);
    if (fp == null) probs.push(`unknown gloss "${raw}"`);
    else if (fp > currentPos) probs.push(`gloss "${raw}" not introduced until ${fp}`);
  }
  return probs;
}

// Load a pair-contract by course_code; falls back to the shared _default_eng scaffold
// for any English-known course without its own contract (vocab-gate fix 2026-07-27 —
// the silent skip on contract-less courses is how "yes I want to speak" reached
// glg_for_eng). Null only for non-English-known pairs with no contract. Cached.
const _contractCache = new Map();
function loadPairContract(courseCode) {
  if (_contractCache.has(courseCode)) return _contractCache.get(courseCode);
  let contract = null;
  // Strip a trailing "_vN" so a versioned course (e.g. zho_for_eng_v2) inherits the base
  // pair's contract. The full course_code stays the DB partition key elsewhere.
  const contractCode = courseCode.replace(/_v\d+$/, '');
  try { contract = require(`../../../docs/pair-contracts/${contractCode}.contract.cjs`); } catch (_) { contract = null; }
  if (!contract && /_for_eng$/.test(contractCode)) {
    try { contract = require('../../../docs/pair-contracts/_default_eng.contract.cjs'); } catch (_) { contract = null; }
  }
  _contractCache.set(courseCode, contract);
  return contract;
}

// Which known-side problems are hard vocab breaches (block the submit) vs
// construction/licensing advisories (warn — contract maturity dependent).
// "unknown gloss" / "not introduced until" = the learner is prompted with a word
// they were never given ("yes" in glg_for_eng seed 1) — never acceptable.
function isKnownVocabBreach(problem) {
  return /^unknown gloss/.test(problem) || /not introduced until/.test(problem);
}

// ─── BUILD anti-template gate (template-stamp audit 2026-07-24) ────────
//
// Compaction-degenerate builders emit one template per LEGO: the bare LEGO
// plus a tacked-on filler tag (", sí" / ", bien" / ", again") or one of the
// lego's own USE phrases with the same tag. Fillers are known vocab, so every
// pre-existing gate passes. This gate promotes the audit classifier
// (docs/course-optimization/build-phrase-template-stamp-audit-2026-07-24.md)
// into the submit path. Kept in lockstep with scripts/build-audit/classify-builds.cjs.

// Trailing ", <short tag>" — the stamp signature (classifier's regex).
const FILLER_TAG_RE = /,\s*¿?[^,]{1,18}$/;

/**
 * Classify a single BUILD phrase against its lego + the lego's own USE stems
 * + previously-introduced chunks. Mirrors the audit classifier's classes.
 *
 * @param {string} target - the BUILD phrase target text
 * @param {string} legoTarget - the lego's target text
 * @param {Set<string>} useStemNorms - normalized targets of this lego's USE phrases
 * @param {boolean} isFirstRow - first build row may be the bare LEGO (debut convention)
 * @returns {{cls: string, detail?: string}} cls ∈ debut-row|bare-repeat|comma-tag|use-stem+tag|ok
 */
function classifyBuildPhrase(target, legoTarget, useStemNorms, isFirstRow) {
  const nT = normalizeForContainment(target);
  const nL = normalizeForContainment(legoTarget);
  // A first-row bare LEGO is not hard-rejected here (agents lead with it), but it
  // is never counted toward the phrase floor and never written as a row — see
  // isBareLegoPhrase in phrase-structure.cjs. 'debut-row' means tolerated, not kept.
  if (nT === nL) return { cls: isFirstRow ? 'debut-row' : 'bare-repeat' };
  if (FILLER_TAG_RE.test((target || '').trim())) {
    const stem = normalizeForContainment((target || '').trim().replace(/,[^,]*$/, ''));
    if (stem === nL) return { cls: 'comma-tag', detail: (target || '').replace(/^.*,/, ',') };
    if (useStemNorms && useStemNorms.has(stem)) return { cls: 'use-stem+tag', detail: (target || '').replace(/^.*,/, ',') };
  }
  return { cls: 'ok' };
}

/**
 * Anti-template + recombination gate for one lego's BUILD basket.
 *
 * Rejects (hard):
 *   - bare-repeat: bare LEGO in a non-debut row
 *   - comma-tag / use-stem+tag: LEGO-or-own-USE-stem + trailing short tag
 *   - insufficient recombination: too few BUILD rows whose non-LEGO material
 *     draws on previously-introduced chunks (per introduction order)
 *
 * @param {object} lego - {idx, target, build[], use[]}
 * @param {string} courseCode
 * @param {number} seedNumber
 * @param {Set<string>} priorVocab - chunk targets introduced BEFORE this lego
 *   (prior seeds + earlier legos of this seed; NOT this lego's own vocab)
 * @returns {{valid: boolean, rejects: Array, recombining: number, required: number}}
 */
function checkBuildRecombination(lego, courseCode, seedNumber, priorVocab) {
  const chinese = isChinese(courseCode);
  const build = lego.build || [];
  const legoTarget = lego.target || '';
  const nL = normalizeForContainment(legoTarget);
  const useStemNorms = new Set((lego.use || []).map(p => normalizeForContainment(p.target || '')));

  // Word set of previously-introduced chunks (chars for char-based languages)
  const priorWords = new Set();
  for (const chunk of priorVocab || []) {
    if (chinese) for (const ch of chunk) priorWords.add(ch);
    else for (const w of normalizeForContainment(chunk).split(' ')) if (w) priorWords.add(w);
  }

  // Ramp-aware recombination floor (matches checkBuildUsePhrases' minBuild ramp)
  let minBuild = 3;
  if (seedNumber === 1 && lego.idx === 1) minBuild = 0;
  else if (seedNumber <= 3) minBuild = 1;
  const required = priorWords.size > 0 ? Math.min(2, minBuild) : 0;

  const rejects = [];
  let recombining = 0;
  build.forEach((p, i) => {
    const target = p.target || '';
    const nT = normalizeForContainment(target);
    // Component rows (don't contain the lego) are filtered elsewhere — skip.
    if (!chinese ? !checkWordContainment(legoTarget, target) : !nT.includes(nL)) return;
    const { cls, detail } = classifyBuildPhrase(target, legoTarget, useStemNorms, i === 0);
    if (cls === 'bare-repeat' || cls === 'comma-tag' || cls === 'use-stem+tag') {
      rejects.push({ target, known: p.known, class: cls, detail });
      return;
    }
    if (cls === 'debut-row') return;
    // Recombination: leftover after removing the LEGO's words must touch prior chunks
    let leftover;
    if (chinese) leftover = nT.replace(nL, '').split('').filter(Boolean);
    else {
      const legoCounts = {};
      for (const w of nL.split(' ')) if (w) legoCounts[w] = (legoCounts[w] || 0) + 1;
      leftover = nT.split(' ').filter(w => {
        if (w && legoCounts[w] > 0) { legoCounts[w]--; return false; }
        return !!w;
      });
    }
    if (leftover.length > 0 && leftover.some(w => priorWords.has(w))) recombining++;
  });

  return {
    valid: rejects.length === 0 && recombining >= required,
    rejects,
    recombining,
    required,
  };
}

module.exports = {
  METHODOLOGY_HINTS,
  checkTiling,
  checkMetadataGloss,
  stemKnownGloss,
  tokenizeKnown,
  compileKnownContract,
  checkKnownSide,
  isKnownVocabBreach,
  loadPairContract,
  checkPhraseComplexity,
  checkVocabViolations,
  calculateLegoBalanceScores,
  checkPhraseBalance,
  checkLegoConflict,
  checkLegoOverlap,
  checkPhraseZUT,
  checkBasketFrameCoverage,
  classifySeedPattern,
  formatDecompositionPatterns,
  classifyBuildPhrase,
  checkBuildRecombination,
};
