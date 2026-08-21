/**
 * Seed completion routes — the golden path + individual LEGO/batch endpoints.
 *
 * POST /api/seed/complete  — Submit a complete seed atomically (golden path)
 * POST /api/lego           — Insert a single LEGO with phrases
 * POST /api/batch          — Insert multiple LEGOs at once
 */

const { Router } = require('express');

// Lib imports
const { isChinese, getGoldenSeedCount, getLanguageName, getLangFamily, checkLegoSyllables } = require('../lib/language-config.cjs');
const { extractVocab, normalizeForContainment, normalizePhrase, checkWordContainment, normalizeSubmissionCasing } = require('../lib/text-normalization.cjs');
const {
  makePhraseId, computePhraseRole, computeLegoPosition,
  extractNgrams, usesBuildUseFormat, checkBuildUsePhrases,
  generateBuildupPhrases, partitionBareLegoPhrases,
} = require('../lib/phrase-structure.cjs');
const {
  METHODOLOGY_HINTS, checkTiling, checkPhraseComplexity,
  checkVocabViolations, calculateLegoBalanceScores, checkPhraseBalance,
  checkLegoConflict, checkPhraseZUT, checkBasketFrameCoverage, checkMetadataGloss,
  loadPairContract, checkKnownSide, isKnownVocabBreach, compileKnownContract, stemKnownGloss, tokenizeKnown,
  checkBuildRecombination,
} = require('../lib/validation.cjs');
const { loadCourseVocab, addToCourseVocab, loadTranslationVocab, loadIntroducedLegoPairs, buildVocabInjection } = require('../lib/vocab-cache.cjs');
const { escalateBuildPhrases } = require('../lib/build-escalation.cjs');

// Build a SEED-indexed known-side context (mirror of the round-indexed CLI ctx):
// gloss-stems & construction/unit carriers keyed by debut SEED, from prior-seed
// legos (DB) folded with the current submission's legos.
async function buildKnownSideSeedCtx(supabase, courseCode, currentSeed, currentLegos, contract) {
  const prior = [];
  for (let from = 0; ; from += 1000) {
    // PostgREST offset paging without an ORDER BY can return the same row twice and
    // drop another, so the known-side context silently loses legos on courses with
    // >1000 prior ones. That makes the gate stricter than it should be: it rejects a
    // gloss the course really did introduce. Measured on fin_for_eng (1,425 legos),
    // it manufactured a false "unknown gloss" breach at S0644L01.
    const { data, error } = await supabase.from('course_legos')
      .select('target_text,known_text,components,seed_number')
      .eq('course_code', courseCode).lt('seed_number', currentSeed)
      .order('seed_number').order('lego_index').range(from, from + 999);
    if (error) throw new Error(error.message);
    prior.push(...data);
    if (data.length < 1000) break;
  }
  const cur = (currentLegos || []).map(l => ({
    target_text: l.target, known_text: l.known, components: l.components || [], seed_number: currentSeed,
  }));
  const all = [...prior, ...cur];
  const stemFirstPos = new Map();
  const addStem = (s, seed) => { const k = stemKnownGloss(s); if (!k) return; if (!stemFirstPos.has(k) || stemFirstPos.get(k) > seed) stemFirstPos.set(k, seed); };
  for (const l of all) {
    for (const t of tokenizeKnown(l.known_text)) addStem(t, l.seed_number);
    for (const c of l.components || []) for (const t of tokenizeKnown(c.known)) addStem(t, l.seed_number);
  }
  const carrierSeed = (carrier) => {
    let min = Infinity;
    for (const l of all) {
      const hit = l.target_text === carrier || (l.components || []).some(c => c.target === carrier);
      if (hit && l.seed_number < min) min = l.seed_number;
    }
    return min;
  };
  for (const [carrier, syns] of Object.entries(contract.glossSynonyms || {})) {
    const seed = carrierSeed(carrier);
    if (seed < Infinity) for (const syn of syns) addStem(syn, seed);
  }
  const consPos = {};
  for (const con of contract.constructions || []) {
    consPos[con.id] = con.cluster ? (contract.clusterSeeds?.[con.cluster] ?? contract.clusterRounds?.[con.cluster] ?? Infinity) : carrierSeed(con.carrier);
  }
  const unitPos = (contract.glossUnits || []).map(u => ({ phrase: u.phrase, pos: carrierSeed(u.carrier) }));
  return { ...compileKnownContract(contract), stemFirstPos, consPos, unitPos };
}
const { recordActivity } = require('../lib/activity-tracker.cjs');
const { isMarkdownSubmission, extractMarkdown, parseMarkdownSeed } = require('../lib/markdown-parser.cjs');
const { bumpCourseVersion } = require('../../shared/course-version.cjs');
const { decoratePhrasesWithDecomposition } = require('../../phrase-decomposition-writer.cjs');
const {
  isBlockedByCheckpoint, getCheckpointStatus, getCheckpointConfig,
  isCheckpointRequired, approveCheckpoint, isQAPending,
  CHECKPOINT_SEEDS, QA_DRIFT_THRESHOLD,
} = require('../lib/checkpoint.cjs');
const { emitProgress, emitProgressThrottled } = require('../../shared/emit-progress.cjs');

// ─── Local helpers (only used by these routes) ────────────────────────

const allowValidationBypass = (body) => body.SKIP_VALIDATION === true && (body.seed_number || body.seed) <= 3;

// Languages with no capitalisation concept — skip target lowercasing
const NO_CAP_TARGET_LANGS = new Set(['jpn', 'zho', 'cmn', 'ara', 'kor', 'heb', 'tha', 'mya', 'lao', 'khm']);

// Legacy backstop list of inherently capitalised words. NOT the main defence —
// capitalisation is decided from evidence in the submission itself
// (collectCasingEvidence), so this list never needs to grow.
const KEEP_CAP_WORDS = new Set([
  'I',
  'English', 'French', 'German', 'Dutch', 'Spanish', 'Portuguese', 'Italian',
  'Welsh', 'Irish', 'Scottish', 'Japanese', 'Chinese', 'Korean', 'Arabic',
  'Hebrew', 'Swedish', 'Greek', 'Russian', 'Polish', 'Turkish', 'Hindi',
  'Mandarin', 'Cantonese', 'Gaelic',
  'Nederlands', 'Deutsch', 'Español', 'Português', 'Italiano', 'Français',
  'Cymraeg', 'Gaeilge', 'Gàidhlig',
  'Thai', 'Burmese', 'Lao', 'Khmer',
]);

/**
 * Strip bookend punctuation and undo accidental sentence-case across a LEGO submission.
 * Mutates in place for efficiency.
 */
function normalizeLegoTexts(legos, courseCode) {
  const parts = (courseCode || '').split('_for_');
  normalizeSubmissionCasing(legos, {
    skipTarget: NO_CAP_TARGET_LANGS.has(parts[0] || ''),
    skipKnown: NO_CAP_TARGET_LANGS.has(parts[1] || ''),
    keepCapSet: KEEP_CAP_WORDS,
  });
}

/**
 * Record a lesson in build_lessons table when a validation error occurs.
 * Fire-and-forget — never blocks the response.
 */
async function recordLessonFromError(ctx, courseCode, errorType, errorDetails) {
  try {
    const langCode = courseCode.split('_')[0];
    const langFamilyMap = {
      jpn: 'japanese', kor: 'korean', zho: 'cjk', cmn: 'cjk',
      deu: 'germanic', nld: 'germanic', swe: 'germanic',
      spa: 'romance', fra: 'romance', ita: 'romance', por: 'romance',
      ara: 'semitic', heb: 'semitic',
      cym: 'celtic', gle: 'celtic', gla: 'celtic',
    };
    const langFamily = langFamilyMap[langCode] || '*';

    let lesson = '';
    let exampleWrong = '';
    let exampleRight = '';

    switch (errorType) {
      case 'zut':
        lesson = `ZUT conflict: Same known text "${errorDetails.known}" already maps to "${errorDetails.existing}". Use consistent translations.`;
        exampleWrong = `known: "${errorDetails.known}" → target: "${errorDetails.new_target}"`;
        exampleRight = `known: "${errorDetails.known}" → target: "${errorDetails.existing}" (existing)`;
        break;
      case 'tiling':
        lesson = `Tiling error: Seed target must be constructable from LEGO targets. Missing: [${errorDetails.untiled}]`;
        exampleWrong = `seed_target not covered by LEGO targets`;
        exampleRight = `Every character in seed target appears in at least one LEGO target`;
        break;
      case 'vocab':
        lesson = `Vocabulary violation: Phrases used unknown words. Only use vocabulary from prior seeds and current LEGOs.`;
        exampleWrong = errorDetails.violations?.[0]?.phrase?.substring(0, 50) || 'phrase with unknown vocab';
        exampleRight = `Use only introduced vocabulary in phrases`;
        break;
      case 'phrases':
      case 'no_phrases':
        lesson = `Phrase count error: Each LEGO needs sufficient phrases. Use build[] (flexible) + use[] (min 5 phrases with scores).`;
        exampleWrong = `phrases: [] or missing build/use arrays`;
        exampleRight = `build: [{known, target}, ...], use: [{known, target, score}, ...]`;
        break;
      case 'build_use':
        lesson = `BUILD/USE format error: ${errorDetails.error || 'Invalid structure'}`;
        exampleWrong = errorDetails.details || 'malformed build/use arrays';
        exampleRight = `build: [flexible], use: [min 5 phrases with score 5-9]`;
        break;
      case 'overlap':
        lesson = `Use overlapping LEGOs when word order differs between languages.`;
        exampleWrong = `Single M-LEGO without atomic components`;
        exampleRight = `Both A-LEGOs for atoms AND M-LEGO for the combined chunk`;
        break;
      case 'balance':
        lesson = `Balance violation: Phrases over-rely on common vocabulary. Include underused LEGOs in practice phrases.`;
        exampleWrong = `Overused: ${errorDetails.overused_in_phrases?.join(', ') || 'common words'}`;
        exampleRight = `Include underused LEGOs: ${errorDetails.underused_available?.slice(0, 3).join(', ') || 'varied vocabulary'}`;
        break;
      default:
        lesson = `Validation error (${errorType}): ${errorDetails.message || JSON.stringify(errorDetails).substring(0, 100)}`;
        exampleWrong = errorDetails.message || 'See error details';
        exampleRight = 'Fix the validation error and resubmit';
    }

    const { data: existing } = await ctx.supabase
      .from('build_lessons')
      .select('id')
      .eq('lesson_type', errorType)
      .eq('language_family', langFamily)
      .ilike('lesson', `%${errorDetails.known || errorDetails.untiled || errorType}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`[RALPH] Lesson already exists for ${errorType} in ${langFamily}`);
      return;
    }

    const { error: insertError } = await ctx.supabase
      .from('build_lessons')
      .insert({
        lesson_type: errorType,
        lesson,
        example_wrong: exampleWrong.substring(0, 500),
        example_right: exampleRight.substring(0, 500),
        language_family: langFamily,
        active: true,
        created_at: new Date().toISOString(),
        source_course: courseCode,
      });

    if (insertError) {
      console.log(`[RALPH] Failed to record lesson: ${insertError.message}`);
    } else {
      console.log(`[RALPH] ✓ Recorded lesson: ${errorType} for ${langFamily}`);
    }
  } catch (e) {
    console.log(`[RALPH] Error recording lesson: ${e.message}`);
  }
}

/**
 * Analyze pattern recency for a course — returns over-used patterns to avoid.
 */
async function analyzePatternRecency(ctx, courseCode, windowSize) {
  const RECENCY_WINDOW = windowSize || ctx.config.RECENCY_WINDOW;
  const PATTERN_FATIGUE_THRESHOLD = ctx.config.PATTERN_FATIGUE_THRESHOLD;

  const { data: recentPhrases } = await ctx.supabase
    .from('course_practice_phrases')
    .select('seed_number, known_text, target_text')
    .eq('course_code', courseCode)
    .order('seed_number', { ascending: false })
    .limit(RECENCY_WINDOW * 50);

  if (!recentPhrases || recentPhrases.length === 0) {
    return { overusedPatterns: [], patternCounts: {} };
  }

  const seedNumbers = [...new Set(recentPhrases.map(p => p.seed_number))].sort((a, b) => b - a);
  const windowSeeds = new Set(seedNumbers.slice(0, RECENCY_WINDOW));

  const patternCounts = {};
  for (const phrase of recentPhrases) {
    if (!windowSeeds.has(phrase.seed_number)) continue;
    const knownNgrams = extractNgrams(phrase.known_text, 3);
    for (const ngram of knownNgrams) {
      if (!patternCounts[ngram]) {
        patternCounts[ngram] = { count: 0, seeds: new Set() };
      }
      patternCounts[ngram].count++;
      patternCounts[ngram].seeds.add(phrase.seed_number);
    }
  }

  const overusedPatterns = Object.entries(patternCounts)
    .filter(([_, data]) => data.seeds.size >= PATTERN_FATIGUE_THRESHOLD)
    .map(([pattern, data]) => ({
      pattern,
      seedCount: data.seeds.size,
      totalCount: data.count,
    }))
    .sort((a, b) => b.seedCount - a.seedCount)
    .slice(0, 20);

  return { overusedPatterns, patternCounts };
}

/**
 * Initialize course_seeds from canonical_seeds for a new course.
 */
// Versioned-course support: a trailing "_vN" isolates a regenerated course in its own DB
// partition (the FULL course_code stays the partition key everywhere) while inheriting the
// base pair's language config + pair-contract. Strip the suffix ONLY for language derivation
// and contract lookup — NEVER for DB keys.
const baseCourseCode = (c) => (c || '').replace(/_v\d+$/, '');

async function initializeCourseSeeds(ctx, courseCode) {
  const parts = baseCourseCode(courseCode).split('_for_');
  const targetLang = parts[0] || '';
  const knownLang = parts[1] || '';
  const knownIsEng = knownLang === 'eng';
  const targetIsEng = targetLang === 'eng';

  const { count: existingCount } = await ctx.supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode);

  if (existingCount > 0) {
    console.log(`Course ${courseCode} already has ${existingCount} seeds`);
    return { initialized: false, count: existingCount };
  }

  const { data: canonical, error: canonicalError } = await ctx.supabase
    .from('canonical_seeds')
    .select('seed_number, source_text')
    .order('seed_number');

  if (canonicalError || !canonical || canonical.length === 0) {
    throw new Error('Failed to fetch canonical seeds: ' + (canonicalError?.message || 'no data'));
  }

  const targetLangName = getLanguageName(courseCode);

  let knownTranslations = new Map();
  if (!knownIsEng) {
    // Rows stamped QUARANTINE_* in source_course are known-bad and are never reused as
    // canon. The Welsh cym_n/cym_s rows are the case this was written for: they are the
    // old Welsh courses' sentences filed positionally under unrelated canon English, so
    // reusing them would silently mistranslate a whole new course. Filtered here in JS
    // rather than in the query, because `not like` also discards the NULL source_course
    // rows, and NULL is what almost every legitimate row carries.
    const { data: translations } = await ctx.supabase
      .from('canonical_seed_translations')
      .select('seed_number, translated_text, source_course')
      .eq('language_code', knownLang);
    if (translations && translations.length > 0) {
      const usable = translations.filter(t => !String(t.source_course || '').startsWith('QUARANTINE'));
      usable.forEach(t => knownTranslations.set(t.seed_number, t.translated_text));
      console.log(`Found ${usable.length} usable canonical translations for ${knownLang} (${translations.length - usable.length} quarantined)`);
    }
  }

  let targetTranslations = new Map();
  if (!targetIsEng) {
    const { data: translations } = await ctx.supabase
      .from('canonical_seed_translations')
      .select('seed_number, translated_text, source_course')
      .eq('language_code', targetLang);
    if (translations && translations.length > 0) {
      const usable = translations.filter(t => !String(t.source_course || '').startsWith('QUARANTINE'));
      usable.forEach(t => targetTranslations.set(t.seed_number, t.translated_text));
      console.log(`Found ${usable.length} usable canonical translations for ${targetLang} (${translations.length - usable.length} quarantined)`);
    }
  }

  const courseSeeds = canonical.map(c => {
    const canonicalText = c.source_text.replace(/\{target\}/g, targetLangName);
    let knownText = '';
    let targetText = '';

    if (knownIsEng) knownText = canonicalText;
    if (targetIsEng) targetText = canonicalText;
    if (!knownIsEng && knownTranslations.has(c.seed_number)) {
      knownText = knownTranslations.get(c.seed_number).replace(/\{target\}/g, targetLangName);
    }
    if (!targetIsEng && targetTranslations.has(c.seed_number)) {
      targetText = targetTranslations.get(c.seed_number).replace(/\{target\}/g, targetLangName);
    }

    return {
      course_code: courseCode,
      seed_number: c.seed_number,
      known_text: knownText,
      target_text: targetText,
    };
  });

  const { error: insertError } = await ctx.supabase
    .from('course_seeds')
    .insert(courseSeeds);

  if (insertError) {
    throw new Error('Failed to initialize course seeds: ' + insertError.message);
  }

  const modeParts = [];
  if (knownIsEng) modeParts.push('known=eng (instant)');
  if (targetIsEng) modeParts.push('target=eng (instant)');
  if (!knownIsEng && knownTranslations.size > 0) modeParts.push(`known=${knownLang} (${knownTranslations.size} from translations)`);
  if (!knownIsEng && knownTranslations.size === 0) modeParts.push(`known=${knownLang} (agent translates)`);
  if (!targetIsEng && targetTranslations.size > 0) modeParts.push(`target=${targetLang} (${targetTranslations.size} from translations)`);
  if (!targetIsEng && targetTranslations.size === 0) modeParts.push(`target=${targetLang} (agent translates)`);
  const mode = modeParts.join(', ');
  console.log(`Initialized ${courseCode} with ${courseSeeds.length} seeds [${mode}]`);
  return { initialized: true, count: courseSeeds.length, mode, targetLangName, knownTranslations: knownTranslations.size, targetTranslations: targetTranslations.size };
}

/**
 * Server-side vocab injection (template-stamp fix 2026-07-24): every
 * /seed/complete round-trip — success, rejection, draft, canonical-mismatch —
 * carries the introduced-LEGO vocab list, so a compacted builder session can
 * never be without it. Failure to build the block never blocks the response.
 */
async function vocabInjectionFor(ctx, courseCode, seedNumber) {
  try {
    return buildVocabInjection(await loadIntroducedLegoPairs(ctx, courseCode, seedNumber));
  } catch (e) {
    console.log(`[vocab-injection] ${courseCode}: ${e.message}`);
    return undefined;
  }
}

// ─── Route factory ────────────────────────────────────────────────────

module.exports = function seedCompleteRoutes(ctx) {
  const router = Router();

  // ───────────────────────────────────────────────────────────────────
  // POST /lego — Insert a single LEGO with phrases
  // ───────────────────────────────────────────────────────────────────
  router.post('/lego', async (req, res) => {
    try {
      // Normalize bookend punctuation before destructuring
      if (req.body.course_code) {
        normalizeLegoTexts([req.body], req.body.course_code);
      }

      const { course_code, seed, idx, type, known, target, components } = req.body;
      let phrases = req.body.phrases;

      if (!course_code || !seed || !idx || !known || !target) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Drop bare-LEGO copies BEFORE the count check — the floor is a floor of
      // real practice, never met by copying the LEGO out as its own phrase.
      let droppedBare = 0;
      if (phrases && phrases.length > 0) {
        const bareSplit = partitionBareLegoPhrases(phrases, target);
        droppedBare = bareSplit.bare.length;
        phrases = bareSplit.kept;
        if (droppedBare > 0) {
          console.log(`  ⚠ S${String(seed).padStart(4,'0')}L${String(idx).padStart(2,'0')}: dropped ${droppedBare} bare-LEGO phrase(s) ("${target}") — the LEGO alone is not a practice phrase`);
        }
      }

      const phraseCount = phrases?.length || 0;
      const legoId = `S${String(seed).padStart(4,'0')}L${String(idx).padStart(2,'0')}`;
      const { MIN_PHRASES_PER_LEGO, MAX_PHRASES_PER_LEGO } = ctx.config;
      let zutHeldOut = 0;            // phrase-granular ZUT: count held out of `phrases`
      const zutCollisionsOut = [];   // surfaced in the response (never rejects the lego)

      let minRequired = MIN_PHRASES_PER_LEGO;
      if (seed === 1 && idx === 1) minRequired = 0;
      else if (seed === 1) minRequired = 1;
      else if (seed <= 3) minRequired = 3;
      else if (seed <= 5) minRequired = 8;
      else if (seed <= 10) minRequired = 8;

      const globalPosition = (seed - 1) * 3;

      if (phraseCount < minRequired && !allowValidationBypass(req.body)) {
        console.log(`✗ ${legoId}: REJECTED - Only ${phraseCount} phrases (need ${minRequired}+ at position ~${globalPosition})`);
        return res.status(400).json({
          error: 'Insufficient phrases',
          lego_id: legoId,
          got: phraseCount,
          required: minRequired,
          global_position: globalPosition,
          skills: ['ralph-methodology.md'],
          hint: `LEGO at position ~${globalPosition} needs at least ${minRequired} phrases. Review ralph-methodology.md for phrase generation guidance.`,
        });
      }

      if (phraseCount > MAX_PHRASES_PER_LEGO) {
        console.log(`⚠ ${legoId}: ${phraseCount} phrases exceeds max ${MAX_PHRASES_PER_LEGO} (will use first ${MAX_PHRASES_PER_LEGO})`);
      }

      let isNew = true;
      let skipBaskets = false;

      if (!allowValidationBypass(req.body)) {
        const conflictResult = await checkLegoConflict(ctx.supabase, course_code, known, target, seed);

        if (conflictResult.conflict === 'zut') {
          console.log(`✗ ${legoId}: REJECTED - ${conflictResult.error}`);
          return res.status(400).json({
            error: 'ZUT violation: ambiguous prompt',
            lego_id: legoId,
            known_text: known,
            new_target: target,
            existing: conflictResult.existing,
            suggestions: conflictResult.suggestions,
            skills: ['ralph-methodology.md'],
            hint: 'Same known text cannot map to different targets. Upchunk with context or use synonym. See ralph-methodology.md for overlap patterns.',
          });
        }

        if (conflictResult.conflict === 'duplicate') {
          isNew = false;
          skipBaskets = true;
          console.log(`  ${legoId}: Duplicate of ${conflictResult.legoId} - marking is_new=false, skipping baskets`);
        }
      }

      // Load vocab scoped to this seed — prior seeds + current seed's LEGOs
      const vocabSet = await loadTranslationVocab(ctx, course_code, seed);
      // Add this LEGO's own vocab (phrases must contain the LEGO, so its vocab is available)
      const chinese = isChinese(course_code);
      extractVocab(target, chinese).forEach(v => vocabSet.add(v));
      if (type === 'M' && components) {
        for (const comp of components) {
          extractVocab(comp.target, chinese).forEach(v => vocabSet.add(v));
        }
      }
      // Also add other LEGOs from this same seed (already in DB)
      const { data: siblingLegos } = await ctx.supabase
        .from('course_legos')
        .select('target_text, type, components')
        .eq('course_code', course_code)
        .eq('seed_number', seed);
      for (const sl of siblingLegos || []) {
        extractVocab(sl.target_text, chinese).forEach(v => vocabSet.add(v));
        if (sl.type === 'M' && sl.components) {
          for (const c of sl.components) {
            extractVocab(c.target, chinese).forEach(v => vocabSet.add(v));
          }
        }
      }

      if (phrases && phrases.length > 0 && !skipBaskets && !allowValidationBypass(req.body)) {
        const legoTargetNorm = normalizeForContainment(target);
        const containmentFails = phrases.filter(p =>
          !normalizeForContainment(p.target).includes(legoTargetNorm)
        );
        if (containmentFails.length > 0) {
          console.log(`✗ ${legoId}: REJECTED - ${containmentFails.length} phrases missing LEGO target "${target}"`);
          return res.status(400).json({
            error: 'LEGO containment violation',
            lego_id: legoId,
            lego_target: target,
            failing_phrases: containmentFails.slice(0, 5).map(p => p.target),
            total_failures: containmentFails.length,
            hint: 'Every phrase MUST contain the exact LEGO target text as a substring. No conjugation changes, no substitutions, no omissions.',
          });
        }

        const violations = checkVocabViolations(phrases, vocabSet, course_code);
        if (violations.length > 0) {
          console.log(`✗ ${legoId}: REJECTED - Vocabulary violations:`);
          violations.forEach(v => console.log(`   "${v.phrase}" uses unknown: [${v.unknown}]`));

          return res.status(400).json({
            error: 'Vocabulary violation',
            lego_id: legoId,
            violations: violations.slice(0, 5),
            total_violations: violations.length,
            vocab_size: vocabSet.size,
            skills: ['ralph-methodology.md'],
            hint: `Phrases must only use vocabulary already introduced. Unknown: ${violations[0].unknown}. Review ralph-methodology.md for vocabulary rules.`,
          });
        }

        // ZUT gate (production-direction): same English prompt must not map to a different target
        // than the course already teaches. PHRASE-GRANULAR (Tom 2026-06-14): hold out ONLY the
        // transgressing phrase(s) from this lego's basket (so a known collision never enters the
        // course) and still insert the lego + every conforming phrase. Surfaced, never rejected.
        if (!allowValidationBypass(req.body)) {
          const zutCollisions = await checkPhraseZUT(ctx.supabase, course_code, phrases, seed);
          if (zutCollisions.length > 0) {
            const nkZut = s => (s || '').toLowerCase().trim().replace(/[.?!,，。？！、]+$/, '');
            const flaggedKnowns = new Set(zutCollisions.map(c => nkZut(c.known)));
            for (let i = phrases.length - 1; i >= 0; i--) {
              if (phrases[i] && phrases[i].known && flaggedKnowns.has(nkZut(phrases[i].known))) {
                phrases.splice(i, 1);
                zutHeldOut++;
              }
            }
            zutCollisionsOut.push(...zutCollisions);
            console.log(`⚠ ${legoId}: ZUT (phrase) — held out ${zutHeldOut} transgressing phrase(s), ${zutCollisions.length} collision(s); lego proceeds`);
            zutCollisions.forEach(c => console.log(`   "${c.known}" → new "${c.new_target}" vs existing "${c.existing_target}" (S${c.existing_seed})`));
          }
        }
      }

      // Frame-coverage check (7th principle) — WARN-ONLY, never rejects.
      // The metric has known false positives (lexical variety IS the axis for
      // negators/nouns), so warnings are surfaced for adjudication, not blocked on.
      let frameWarnings = [];
      if (phrases && phrases.length > 0 && !skipBaskets) {
        frameWarnings = checkBasketFrameCoverage(phrases, target);
        if (frameWarnings.length > 0) {
          console.log(`⚠ ${legoId}: frame-coverage warnings:`);
          frameWarnings.forEach(w => console.log(`   [${w.code}] ${w.detail}`));
        }
      }

      const { error: legoError } = await ctx.supabase
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
          version: 1,
        }, { onConflict: 'course_code,seed_number,lego_index' });

      if (legoError) throw legoError;

      let allPhraseRows = [];
      let buildupCount = 0;
      let practiceStartPosition = 1;
      const practiceCount = phrases?.length || 0;

      if (!skipBaskets) {
        let roleCounts = { component: 0, build: 0, use: 0 };

        if (type === 'M' && components && components.length > 0) {
          const buildupResult = generateBuildupPhrases(
            { seed, idx, known, target, components },
            course_code
          );
          allPhraseRows = [...buildupResult.buildupPhrases];
          buildupCount = buildupResult.buildupPhrases.length;
          practiceStartPosition = buildupResult.startPosition;
          roleCounts = { ...buildupResult.roleCounts };
          console.log(`  M-LEGO build-up: ${buildupCount} component phrase(s)`);
        }

        if (phrases && phrases.length > 0) {
          const buildupNormalized = new Set(allPhraseRows.map(p => normalizePhrase(p.target_text)));
          const seenNormalized = new Set();
          const dedupedPhrases = phrases.filter(p => {
            const norm = normalizePhrase(p.target);
            if (buildupNormalized.has(norm) || seenNormalized.has(norm)) return false;
            seenNormalized.add(norm);
            return true;
          });
          const dedupedCount = phrases.length - dedupedPhrases.length;
          if (dedupedCount > 0) {
            console.log(`    Deduped ${dedupedCount} phrases (normalized: case/punctuation insensitive)`);
          }

          const sorted = [...dedupedPhrases].sort((a, b) => a.target.length - b.target.length);

          const practicePhrases = sorted.map((p, i) => {
            const position = practiceStartPosition + i;
            const role = computePhraseRole(position);
            roleCounts[role] = (roleCounts[role] || 0) + 1;
            return {
              id: makePhraseId(course_code, seed, idx, role, roleCounts[role]),
              course_code,
              seed_number: seed,
              lego_index: idx,
              position,
              known_text: p.known,
              target_text: p.target,
              target_text_roman: p.target_roman || null,
              word_count: p.target.length,
              lego_count: ((p.known || '').match(/\s+/g) || []).length + 1,
              phrase_role: role,
              connected_lego_ids: [],
              lego_position: computeLegoPosition(p.target, target),
              metadata: p.score ? { score: p.score } : {},
              introduce: true,
              status: 'draft',
              version: 1,
            };
          });

          allPhraseRows = [...allPhraseRows, ...practicePhrases];
        }

        if (allPhraseRows.length > 0) {
          const { error: phraseError } = await ctx.supabase
            .from('course_practice_phrases')
            .upsert(allPhraseRows, { onConflict: 'course_code,seed_number,lego_index,position' });
          if (phraseError) throw phraseError;

          // Build-time phrase decomposition. Non-blocking by contract (see
          // phrase-decomposition-writer.cjs) — failures log + skip, leaving
          // decomposition NULL so the runtime fallback picks up.
          await decoratePhrasesWithDecomposition(ctx.supabase, allPhraseRows);
        }
      }

      const totalPhrases = allPhraseRows.length;
      const buildupInfo = buildupCount > 0 ? ` [${buildupCount} buildup + ${practiceCount} practice]` : '';
      const dupInfo = skipBaskets ? ' (duplicate, no baskets)' : '';
      console.log(`✓ S${String(seed).padStart(4,'0')}L${String(idx).padStart(2,'0')}: ${known} → ${target} (${totalPhrases} phrases${buildupInfo})${dupInfo}`);

      ctx.emitPipelineEvent(course_code, 'seed:lego_complete', { seed_number: seed, lego_id: legoId, phrases: totalPhrases });

      await bumpCourseVersion(ctx.supabase, course_code, 'minor');

      res.json({
        ok: true,
        lego_id: legoId,
        is_new: isNew,
        skipped_baskets: skipBaskets,
        phrases: totalPhrases,
        buildup_phrases: buildupCount,
        practice_phrases: practiceCount,
        ...(droppedBare > 0 ? {
          bare_lego_phrases_dropped: droppedBare,
          bare_lego_hint: 'A practice phrase that IS the LEGO teaches nothing — the learner meets the bare LEGO at intro and debut. Submit the LEGO used IN a phrase with already-introduced vocabulary instead.',
        } : {}),
        ...(frameWarnings.length > 0 ? {
          frame_warnings: frameWarnings,
          frame_hint: 'Non-blocking. 7th principle: vary along the axis that carries the new distinction — see ralph-methodology.md.',
        } : {}),
        ...(zutHeldOut > 0 ? {
          zut_held_out: zutHeldOut,
          zut_collisions: zutCollisionsOut.slice(0, 10),
          zut_hint: 'ZUT (phrase) — these transgressing phrase(s) were held out (not inserted); the lego + conforming phrases were saved. CONSOLIDATE to the existing target or DIFFERENTIATE the English prompt, then resubmit the held-out phrase(s).',
        } : {}),
      });

    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ───────────────────────────────────────────────────────────────────
  // POST /batch — Insert multiple LEGOs at once
  // ───────────────────────────────────────────────────────────────────
  router.post('/batch', async (req, res) => {
    try {
      // Normalize bookend punctuation before processing
      if (req.body.course_code && req.body.legos) {
        normalizeLegoTexts(req.body.legos, req.body.course_code);
      }

      const { course_code, legos } = req.body;
      const { MIN_PHRASES_PER_LEGO, MIN_BATCH_PHRASE_RATIO } = ctx.config;

      let totalPhrases = 0;
      const underperformers = [];

      for (const lego of legos) {
        const phraseCount = lego.phrases?.length || 0;
        totalPhrases += phraseCount;
        if (phraseCount < MIN_PHRASES_PER_LEGO) {
          underperformers.push({
            lego_id: `S${String(lego.seed).padStart(4,'0')}L${String(lego.idx).padStart(2,'0')}`,
            known: lego.known,
            phrases: phraseCount,
          });
        }
      }

      const ratio = legos.length > 0 ? totalPhrases / legos.length : 0;

      if (ratio < MIN_BATCH_PHRASE_RATIO && !allowValidationBypass(req.body)) {
        console.log(`✗ Batch REJECTED - Ratio ${ratio.toFixed(1)} < ${MIN_BATCH_PHRASE_RATIO} required`);
        return res.status(400).json({
          error: 'Insufficient phrase coverage',
          got_ratio: ratio.toFixed(1),
          required_ratio: MIN_BATCH_PHRASE_RATIO,
          legos: legos.length,
          total_phrases: totalPhrases,
          underperformers: underperformers.slice(0, 10),
          hint: `Batch rejected. Each LEGO should have ~10 practice phrases combining it with previous LEGOs. Current ratio: ${ratio.toFixed(1)}, need: ${MIN_BATCH_PHRASE_RATIO}+`,
        });
      }

      if (underperformers.length > 0) {
        console.log(`⚠ Batch has ${underperformers.length} LEGOs with <${MIN_PHRASES_PER_LEGO} phrases (ratio ${ratio.toFixed(1)} OK)`);
      }

      totalPhrases = 0;
      let totalBuildupPhrases = 0;
      let totalPracticePhrases = 0;
      let zutViolations = [];
      let duplicates = 0;

      for (const lego of legos) {
        const legoId = `S${String(lego.seed).padStart(4,'0')}L${String(lego.idx).padStart(2,'0')}`;

        let isNew = true;
        let skipBaskets = false;

        if (!allowValidationBypass(req.body)) {
          const conflictResult = await checkLegoConflict(ctx.supabase, course_code, lego.known, lego.target, lego.seed);

          if (conflictResult.conflict === 'zut') {
            zutViolations.push({
              lego_id: legoId,
              known: lego.known,
              new_target: lego.target,
              existing: conflictResult.existing,
            });
            continue;
          }

          if (conflictResult.conflict === 'duplicate') {
            isNew = false;
            skipBaskets = true;
            duplicates++;
            console.log(`  ${legoId}: Duplicate of ${conflictResult.legoId} - is_new=false, skipping baskets`);
          }
        }

        const { error: legoError } = await ctx.supabase
          .from('course_legos')
          .upsert({
            course_code,
            seed_number: lego.seed,
            lego_index: lego.idx,
            type: lego.type || 'A',
            is_new: isNew,
            known_text: lego.known,
            target_text: lego.target,
            target_text_roman: lego.target_roman || null,
            components: lego.components || null,
            status: 'draft',
            version: 1,
          }, { onConflict: 'course_code,seed_number,lego_index' });

        if (legoError) throw legoError;

        let allPhraseRows = [];
        let buildupCount = 0;
        let practiceStartPosition = 1;

        if (!skipBaskets) {
          let roleCounts = { component: 0, build: 0, use: 0 };

          if (lego.type === 'M' && lego.components && lego.components.length > 0) {
            const buildupResult = generateBuildupPhrases(
              { seed: lego.seed, idx: lego.idx, known: lego.known, target: lego.target, components: lego.components },
              course_code
            );
            allPhraseRows = [...buildupResult.buildupPhrases];
            buildupCount = buildupResult.buildupPhrases.length;
            practiceStartPosition = buildupResult.startPosition;
            roleCounts = { ...buildupResult.roleCounts };
            totalBuildupPhrases += buildupCount;
          }

          if (lego.phrases && lego.phrases.length > 0) {
            const sorted = [...lego.phrases].sort((a, b) => a.target.length - b.target.length);

            const practicePhrases = sorted.map((p, i) => {
              const position = practiceStartPosition + i;
              const role = computePhraseRole(position);
              roleCounts[role] = (roleCounts[role] || 0) + 1;
              return {
                id: makePhraseId(course_code, lego.seed, lego.idx, role, roleCounts[role]),
                course_code,
                seed_number: lego.seed,
                lego_index: lego.idx,
                position,
                known_text: p.known,
                target_text: p.target,
                target_text_roman: p.target_roman || null,
                word_count: p.target.length,
                lego_count: ((p.known || '').match(/\s+/g) || []).length + 1,
                phrase_role: role,
                connected_lego_ids: [],
                lego_position: computeLegoPosition(p.target, lego.target),
                metadata: p.score ? { score: p.score } : {},
                status: 'draft',
                version: 1,
              };
            });

            allPhraseRows = [...allPhraseRows, ...practicePhrases];
            totalPracticePhrases += lego.phrases.length;
          }

          if (allPhraseRows.length > 0) {
            const { error: phraseError } = await ctx.supabase
              .from('course_practice_phrases')
              .upsert(allPhraseRows, { onConflict: 'course_code,seed_number,lego_index,position' });
            if (phraseError) throw phraseError;
            totalPhrases += allPhraseRows.length;

            // Build-time phrase decomposition (see PHRASE_DECOMPOSITION_SPEC.md).
            // Non-blocking — failures leave decomposition NULL for runtime fallback.
            await decoratePhrasesWithDecomposition(ctx.supabase, allPhraseRows);
          }
        }

        const buildupInfo = buildupCount > 0 ? ` [${buildupCount} buildup]` : '';
        const dupInfo = skipBaskets ? ' (dup)' : '';
        console.log(`✓ ${legoId}: ${lego.known} → ${lego.target}${buildupInfo}${dupInfo}`);
      }

      if (zutViolations.length > 0) {
        console.log(`✗ Batch had ${zutViolations.length} ZUT violations (skipped)`);
        return res.status(400).json({
          error: 'ZUT violations detected',
          zut_violations: zutViolations,
          processed_before_error: totalPhrases,
          skills: ['ralph-methodology.md'],
          hint: 'Some LEGOs have same known text mapping to different targets. Upchunk or use synonyms. See ralph-methodology.md for overlap patterns.',
        });
      }

      ctx.emitPipelineEvent(course_code, 'seed:complete', { seed_number: null, legos_count: legos.length, phrases_count: totalPhrases });

      await bumpCourseVersion(ctx.supabase, course_code, 'minor');

      res.json({
        ok: true,
        legos: legos.length,
        duplicates_skipped: duplicates,
        phrases: totalPhrases,
        buildup_phrases: totalBuildupPhrases,
        practice_phrases: totalPracticePhrases,
      });

    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ───────────────────────────────────────────────────────────────────
  // POST /seed/complete — The golden path (atomic seed submission)
  // ───────────────────────────────────────────────────────────────────
  router.post('/seed/complete', async (req, res) => {
    try {
      // ── Role guard: only checker (or no role specified) can submit ──
      const agentRole = req.headers['x-agent-role'] || req.query.agent_role;
      if (agentRole === 'creator') {
        return res.status(403).json({
          error: 'Creator agents cannot submit directly',
          hint: 'Send your decomposition to checker via SendMessage. Checker reviews and submits.',
        });
      }

      // ── Markdown detection & parsing ──
      let parsedData;
      const isMarkdown = isMarkdownSubmission(req);

      if (isMarkdown) {
        const markdown = extractMarkdown(req);
        if (!markdown) {
          return res.status(400).json({
            error: 'Could not extract markdown content',
            hint: 'Send markdown as request body with Content-Type: text/markdown or text/plain',
          });
        }

        const courseCodeFromQuery = req.query.course || req.query.course_code;
        const courseCodeFromBody = req.body?.course_code;
        const courseCode = courseCodeFromQuery || courseCodeFromBody;

        if (!courseCode) {
          return res.status(400).json({
            error: 'course_code required for markdown submissions',
            hint: 'Add ?course=xxx query param or wrap: {"course_code": "xxx", "markdown": "..."}',
          });
        }

        parsedData = parseMarkdownSeed(markdown, courseCode);
        if (req.body?.SKIP_VALIDATION || req.query.skip_validation) {
          parsedData.SKIP_VALIDATION = true;
        }
        console.log(`[MARKDOWN] Parsed seed ${parsedData.seed_number} with ${parsedData.legos.length} LEGOs`);
      } else {
        parsedData = req.body;
        if (req.query.skip_validation) {
          parsedData.SKIP_VALIDATION = true;
        }
      }

      const { course_code, seed_number, known_text: agent_known_text, target_text: agent_target_text, legos, SKIP_VALIDATION: rawSkipValidation } = parsedData;
      // Only allow skip_validation for seeds 1-3 (early seeds with sparse vocab)
      const SKIP_VALIDATION = rawSkipValidation && seed_number <= 3;
      const seedId = `S${String(seed_number).padStart(4, '0')}`;
      let isDraft = req.query.draft === 'true';

      // Auto-convert legacy phrases[] to build/use
      if (legos) {
        for (const lego of legos) {
          if (lego.phrases && !lego.build && !lego.use) {
            const phrases = lego.phrases;
            console.log(`[FORMAT] ${seedId}L${String(lego.idx).padStart(2, '0')}: Auto-converting legacy phrases[] → build/use (${phrases.length} phrases)`);
            const sorted = [...phrases].sort((a, b) => (a.target || '').length - (b.target || '').length);
            lego.build = sorted.slice(0, Math.min(3, sorted.length));
            lego.use = sorted.slice(Math.min(3, sorted.length));
            delete lego.phrases;
          }
        }
      }

      // Normalize bookend punctuation on all incoming text
      if (course_code && legos) {
        normalizeLegoTexts(legos, course_code);
      }

      // Force draft mode if parallel build in progress
      // But NOT when auto-finalizing from golden approval (skip_validation=true means golden finalize)
      const isAutoFinalize = req.query.skip_validation === 'true';
      if (!isDraft && !isAutoFinalize && course_code) {
        const { count: draftCount } = await ctx.supabase
          .from('course_seed_drafts')
          .select('*', { count: 'exact', head: true })
          .eq('course_code', course_code);
        if (draftCount > 0) {
          console.log(`[SAFETY] Forcing draft mode for ${seedId} — ${draftCount} drafts exist for ${course_code}`);
          isDraft = true;
        }
      }

      const courseParts = baseCourseCode(course_code).split('_for_');
      const targetLang = courseParts[0] || '';
      const knownLang = courseParts[1] || '';
      const knownIsEng = knownLang === 'eng';
      const targetIsEng = targetLang === 'eng';

      if (!course_code || !seed_number || !legos) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['course_code', 'seed_number', 'legos'],
          note: 'known_text/target_text requirements depend on course: X_for_eng needs target_text, eng_for_X needs known_text, X_for_Y needs both',
        });
      }

      if (!Array.isArray(legos) || legos.length === 0) {
        return res.status(400).json({
          error: 'legos must be a non-empty array',
          seed: seedId,
        });
      }

      // Auto-heartbeat
      const now = Date.now();
      ctx.agentHeartbeats.set(course_code, {
        lastHeartbeat: now,
        agentId: 'submission',
        status: 'submitting',
        currentSeed: seed_number,
        startedAt: ctx.agentHeartbeats.get(course_code)?.startedAt || now,
      });

      // Canonical seed lookup
      let { data: canonicalSeed, error: seedLookupError } = await ctx.supabase
        .from('course_seeds')
        .select('known_text, target_text')
        .eq('course_code', course_code)
        .eq('seed_number', seed_number)
        .single();

      if (seedLookupError || !canonicalSeed) {
        console.log(`Seed ${seedId} not found for ${course_code}, attempting auto-initialization...`);
        try {
          const initResult = await initializeCourseSeeds(ctx, course_code);
          if (initResult.initialized) {
            console.log(`Auto-initialized ${course_code}: ${initResult.count} seeds (${initResult.language})`);
            const retry = await ctx.supabase
              .from('course_seeds')
              .select('known_text, target_text')
              .eq('course_code', course_code)
              .eq('seed_number', seed_number)
              .single();
            canonicalSeed = retry.data;
            seedLookupError = retry.error;
          }
        } catch (initError) {
          console.error('Auto-initialization failed:', initError.message);
        }
      }

      if (seedLookupError || !canonicalSeed) {
        return res.status(400).json({
          error: 'Canonical seed not found',
          seed: seedId,
          course_code,
          hint: 'Seeds must be pre-populated in the database. Check /api/seeds/:courseCode for available seeds.',
        });
      }

      // Translation validation
      const needsKnownFromAgent = !knownIsEng && !canonicalSeed.known_text;
      const needsTargetFromAgent = !targetIsEng && !canonicalSeed.target_text;

      if (needsKnownFromAgent && !agent_known_text) {
        return res.status(400).json({
          error: 'known_text required',
          seed: seedId,
          course_code,
          hint: `For ${course_code} (known=${knownLang}), agent must provide known_text translation from English canonical.`,
        });
      }
      if (needsTargetFromAgent && !agent_target_text) {
        return res.status(400).json({
          error: 'target_text required',
          seed: seedId,
          course_code,
          hint: `For ${course_code} (target=${targetLang}), agent must provide target_text translation.`,
        });
      }

      // Check if seed already fully built (skip for drafts)
      const hasTranslation = canonicalSeed.known_text && canonicalSeed.known_text.length > 0 &&
                             canonicalSeed.target_text && canonicalSeed.target_text.length > 0;

      if (!isDraft && hasTranslation) {
        const { data: existingLegos, error: legoCheckError } = await ctx.supabase
          .from('course_legos')
          .select('id')
          .eq('course_code', course_code)
          .eq('seed_number', seed_number)
          .limit(1);

        if (!legoCheckError && existingLegos && existingLegos.length > 0) {
          return res.status(400).json({
            error: 'Seed already fully built',
            seed: seedId,
            existing_known: canonicalSeed.known_text,
            existing_target: canonicalSeed.target_text,
            has_legos: true,
            hint: 'This seed has translation and LEGOs. Use a different seed number.',
          });
        }
        console.log(`  Seed has translation but no LEGOs - proceeding with LEGO addition`);
      }

      // Canonical validation
      if (agent_known_text && canonicalSeed.known_text) {
        const normalize = (s) => s.trim().replace(/\s+/g, ' ').toLowerCase();
        const agentNorm = normalize(agent_known_text);
        const canonicalNorm = normalize(canonicalSeed.known_text);

        if (agentNorm !== canonicalNorm) {
          return res.status(400).json({
            error: 'CANONICAL MISMATCH: Your known_text does not match the canonical seed',
            seed: seedId,
            you_sent: agent_known_text,
            canonical: canonicalSeed.known_text,
            action_required: `GET /api/resume/${course_code} to get the correct next seed and context`,
            skills: ['/course-resume'],
            hint: 'After context compaction, ALWAYS call /api/resume first. Do NOT guess seed text. Review /course-resume for recovery guidance.',
            introduced_vocab: await vocabInjectionFor(ctx, course_code, seed_number),
          });
        }
      }

      const known_text = canonicalSeed.known_text || agent_known_text;
      const target_text = canonicalSeed.target_text || agent_target_text;

      const knownSource = canonicalSeed.known_text ? 'canonical (eng)' : 'agent';
      const targetSource = canonicalSeed.target_text ? 'canonical (eng)' : 'agent';

      console.log(`\n${'='.repeat(60)}`);
      console.log(`SEED COMPLETE: ${seedId}`);
      console.log(`  known:  "${known_text}" [${knownSource}]`);
      console.log(`  target: "${target_text}" [${targetSource}]`);
      console.log(`${'='.repeat(60)}`);

      // ── VALIDATION PHASE ──

      const errors = [];
      const warnings = [];

      // 1. ZUT + DUPLICATE DETECTION (skip for drafts)
      const zutViolations = [];
      const duplicateLegos = [];

      if (!isDraft) {
        for (const lego of legos) {
          const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
          const conflictResult = await checkLegoConflict(ctx.supabase, course_code, lego.known, lego.target, seed_number);

          if (conflictResult.conflict === 'zut') {
            zutViolations.push({
              lego_id: legoId,
              known: lego.known,
              new_target: lego.target,
              existing: conflictResult.existing,
              suggestions: conflictResult.suggestions,
            });
          } else if (conflictResult.conflict === 'duplicate') {
            duplicateLegos.push({
              lego_id: legoId,
              known: lego.known,
              target: lego.target,
              original: conflictResult.legoId,
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
          methodology: METHODOLOGY_HINTS.zut,
        });
      }

      // 1b. LEGO SYLLABLE CAP (cognitive load guard — always runs, even with skip_validation)
      {
        const oversizedLegos = [];
        for (const lego of legos) {
          const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
          const check = checkLegoSyllables(lego.target, course_code);
          if (!check.ok) {
            oversizedLegos.push({ lego_id: legoId, target: lego.target, syllables: check.syllables, max: check.max });
          }
        }
        if (oversizedLegos.length > 0) {
          errors.push({
            type: 'lego_too_large',
            message: `${oversizedLegos.length} LEGO(s) exceed ${oversizedLegos[0].max}-syllable cap. Break into smaller pieces.`,
            oversized: oversizedLegos,
            hint: 'LEGOs should be small cognitive chunks (2-4 words, max 8 syllables). If the seed needs a long phrase, decompose it into multiple smaller LEGOs.',
          });
          console.log(`✗ ${seedId}: LEGO SIZE - ${oversizedLegos.map(l => `${l.lego_id} "${l.target}" (${l.syllables} syl)`).join(', ')}`);
        }
      } // end syllable cap

      // Load vocab from prior seeds
      const vocabSet = await loadTranslationVocab(ctx, course_code, seed_number);

      // 2. TILING VALIDATION (always runs — even golden seeds must tile)
      {
        const tilingResult = checkTiling(target_text, legos, course_code, vocabSet);
        if (!tilingResult.valid) {
          errors.push({
            type: 'tiling',
            message: tilingResult.message,
            untiled: tilingResult.untiled,
            seed_target: target_text,
            legos_provided: legos.map(l => ({ idx: l.idx, target: l.target })),
            methodology: METHODOLOGY_HINTS.tiling,
          });
          console.log(`✗ ${seedId}: TILING FAILED - untiled: [${tilingResult.untiled}]`);
        } else {
          console.log(`✓ ${seedId}: Tiling valid (${tilingResult.seed_vocab || 'ok'} → ${legos.length} LEGOs)`);
        }
      } // end tiling check

      // 3. VOCAB VALIDATION
      // Sort LEGOs by idx so vocab accumulates in correct order —
      // prevents forward references (L2 phrase using L3's vocab)
      legos.sort((a, b) => a.idx - b.idx);
      const vocabViolations = [];
      const buildGateFailures = [];   // anti-template gate (template-stamp fix 2026-07-24)
      const chinese = isChinese(course_code);
      for (const lego of legos) {
        const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
        const isDuplicate = duplicateLegos.some(d => d.lego_id === legoId);

        // BUILD anti-template gate — runs against vocab introduced BEFORE this
        // lego (prior seeds + earlier legos of this seed), so snapshot now,
        // before this lego's own vocab is added below.
        if (!isDuplicate && !SKIP_VALIDATION && usesBuildUseFormat(lego)) {
          const priorVocab = new Set(vocabSet);
          const gate = checkBuildRecombination(lego, course_code, seed_number, priorVocab);
          if (!gate.valid) {
            buildGateFailures.push({ lego, legoId, gate, priorVocab });
          }
        }

        // Add this LEGO's vocab
        if (isDraft) {
          extractVocab(lego.target, chinese).forEach(v => vocabSet.add(v));
          if (lego.type === 'M' && lego.components) {
            for (const comp of lego.components) {
              extractVocab(comp.target, chinese).forEach(v => vocabSet.add(v));
            }
          }
        } else {
          extractVocab(lego.target, chinese).forEach(v => vocabSet.add(v));
          if (lego.type === 'M' && lego.components) {
            for (const comp of lego.components) {
              extractVocab(comp.target, chinese).forEach(v => vocabSet.add(v));
            }
          }
          addToCourseVocab(ctx, course_code, { target: lego.target, type: lego.type, components: lego.components });
        }

        // Check phrases for violations
        if (!isDuplicate) {
          let allPhrases = [];
          if (usesBuildUseFormat(lego)) {
            allPhrases = [...(lego.build || []), ...(lego.use || [])];
          } else if (lego.phrases) {
            allPhrases = lego.phrases;
          }

          if (allPhrases.length > 0) {
            const violations = checkVocabViolations(allPhrases, vocabSet, course_code);
            if (violations.length > 0) {
              vocabViolations.push({
                lego_id: legoId,
                violations: violations.slice(0, 3),
              });
            }

            // LEGO CONTAINMENT
            {
              // Character-based languages (Thai, Chinese, Japanese, Korean) use substring containment
              // because they have no word spaces. Space-delimited languages use word-based containment.
              const charBased = isChinese(course_code);
              const useWordContainment = !charBased && req.query.strict_containment !== 'true';
              const legoTargetNorm = normalizeForContainment(lego.target);
              const containmentFails = allPhrases.filter(p => {
                if (charBased) {
                  return !normalizeForContainment(p.target).includes(legoTargetNorm);
                }
                if (useWordContainment) {
                  return !checkWordContainment(lego.target, p.target);
                }
                return !normalizeForContainment(p.target).includes(legoTargetNorm);
              });
              if (containmentFails.length > 0) {
                const mode = charBased ? 'substring' : (useWordContainment ? 'word-based' : 'substring');
                errors.push({
                  type: 'lego_containment',
                  message: `${legoId}: ${containmentFails.length} phrase(s) fail ${mode} containment for LEGO target "${lego.target}"`,
                  lego_id: legoId,
                  lego_target: lego.target,
                  failing_phrases: containmentFails.slice(0, 3).map(p => p.target),
                  hint: (charBased || !useWordContainment)
                    ? 'Every BUILD and USE phrase MUST contain the exact LEGO target text. No conjugation changes, no substitutions, no omissions.'
                    : 'Every BUILD and USE phrase must contain ALL words from the LEGO target (German word-order mode).',
                });
                console.log(`✗ ${legoId}: CONTAINMENT (${mode}) - ${containmentFails.length} phrases missing LEGO target "${lego.target}"`);
              }
            }
          }
        }
      }

      // 3a-BUILD. ANTI-TEMPLATE GATE + 3-STRIKE OPUS ESCALATION.
      // A gate failure rejects and re-rolls (builder stays Sonnet). On the 3rd
      // consecutive rejection of the same lego, the server escalates JUST that
      // generation call to Opus via the Claude CLI, re-validates the output
      // through the same gates, and proceeds if clean. No blanket model switch.
      if (buildGateFailures.length > 0) {
        if (!ctx.buildGateStrikes) ctx.buildGateStrikes = new Map();
        if (!ctx.buildEscalationStats) ctx.buildEscalationStats = { attempts: 0, successes: 0, failures: 0 };

        for (const f of buildGateFailures) {
          const strikeKey = `${course_code}:${f.legoId}`;
          f.strikes = (ctx.buildGateStrikes.get(strikeKey) || 0) + 1;
          ctx.buildGateStrikes.set(strikeKey, f.strikes);
          let escalated = false;

          if (f.strikes >= 3) {
            ctx.buildEscalationStats.attempts++;
            console.log(`⚡ ${f.legoId}: BUILD gate strike ${f.strikes} — escalating generation to Opus`);
            try {
              const priorPairs = [
                ...await loadIntroducedLegoPairs(ctx, course_code, seed_number - 1),
                ...legos.filter(l => l.idx < f.lego.idx).map(l => ({ known: l.known, target: l.target })),
              ];
              const rejectedNorms = new Set(f.gate.rejects.map(r => normalizeForContainment(r.target)));
              const keptBuild = (f.lego.build || []).filter(p => !rejectedNorms.has(normalizeForContainment(p.target || '')));
              const need = Math.max(f.gate.rejects.length, (f.gate.required || 0) - (f.gate.recombining || 0), 1);
              let fresh = await escalateBuildPhrases({
                courseCode: course_code,
                lego: { known: f.lego.known, target: f.lego.target },
                usePhrases: f.lego.use || [],
                priorPairs,
                need: Math.min(need, 6),
                rejected: f.gate.rejects,
              });
              // Containment ran in section 3 before escalation — enforce it on fresh rows here.
              fresh = (fresh || []).filter(p => chinese
                ? normalizeForContainment(p.target).includes(normalizeForContainment(f.lego.target))
                : checkWordContainment(f.lego.target, p.target));
              if (fresh && fresh.length > 0) {
                const candidate = { ...f.lego, build: [...keptBuild, ...fresh] };
                const regate = checkBuildRecombination(candidate, course_code, seed_number, f.priorVocab);
                const withLego = new Set(f.priorVocab);
                extractVocab(f.lego.target, chinese).forEach(v => withLego.add(v));
                if (f.lego.type === 'M' && f.lego.components) {
                  for (const comp of f.lego.components) extractVocab(comp.target, chinese).forEach(v => withLego.add(v));
                }
                const freshViolations = checkVocabViolations(fresh, withLego, course_code);
                if (regate.valid && freshViolations.length === 0) {
                  f.lego.build = candidate.build;
                  escalated = true;
                  ctx.buildEscalationStats.successes++;
                  ctx.buildGateStrikes.delete(strikeKey);
                  warnings.push({
                    type: 'build_escalated',
                    lego_id: f.legoId,
                    message: `BUILD basket regenerated by Opus after ${f.strikes} gate rejections (${f.gate.rejects.length} template-stamp row(s) replaced).`,
                    replaced: f.gate.rejects.map(r => r.target),
                    added: fresh.map(p => p.target),
                  });
                  console.log(`⚡ ${f.legoId}: Opus escalation SUCCEEDED — ${fresh.length} replacement BUILD phrase(s)`);
                } else {
                  ctx.buildEscalationStats.failures++;
                  console.log(`⚡ ${f.legoId}: Opus escalation output failed re-validation (gate=${regate.valid}, vocab violations=${freshViolations.length})`);
                }
              } else {
                ctx.buildEscalationStats.failures++;
                console.log(`⚡ ${f.legoId}: Opus escalation returned no usable phrases`);
              }
            } catch (e) {
              ctx.buildEscalationStats.failures++;
              console.log(`⚡ ${f.legoId}: Opus escalation error — ${e.message}`);
            }
          }

          if (!escalated) {
            errors.push({
              type: 'build_template',
              message: `${f.legoId}: BUILD anti-template gate — ${f.gate.rejects.length} template-stamp row(s), ${f.gate.recombining}/${f.gate.required} recombining BUILD phrase(s)`,
              lego_id: f.legoId,
              lego_target: f.lego.target,
              rejects: f.gate.rejects.slice(0, 6),
              recombining: f.gate.recombining,
              required: f.gate.required,
              strikes: f.strikes,
              hint: 'BUILD phrases must show the new LEGO plugging into previously-introduced LEGOs (see introduced_vocab in this response). Bare-LEGO repeats and "<stem>, <short tag>" filler stamps are rejected. Re-roll using the injected vocab list.',
            });
            console.log(`✗ ${f.legoId}: BUILD TEMPLATE — ${f.gate.rejects.map(r => `${r.class} "${r.target}"`).join('; ') || `recombining ${f.gate.recombining}/${f.gate.required}`} (strike ${f.strikes})`);
          }
        }
      }

      if (vocabViolations.length > 0) {
        ctx.courseVocabCache.delete(course_code);
        errors.push({
          type: 'vocab',
          message: 'Vocabulary violations - phrases use unknown vocabulary',
          legos_with_violations: vocabViolations,
          methodology: METHODOLOGY_HINTS.vocab,
        });
      }

      // 3a-ZUT. PHRASE-LEVEL ZUT (production direction): the same English prompt must not map to a
      // different target than the course already teaches. PHRASE-GRANULAR (Tom 2026-06-14): a
      // collision holds out ONLY the transgressing phrase(s) — they are not inserted, so a known
      // collision never enters the course (the ZUT guarantee holds) — while the seed and every
      // conforming phrase still insert. The held-out phrases are surfaced (not silently dropped) so
      // the author can CONSOLIDATE (use the existing target) or DIFFERENTIATE (specialise the English
      // prompt) and resubmit just those. NEVER rejects the whole seed.
      if (!SKIP_VALIDATION) {
        const zutPhrases = [];
        for (const lego of legos) {
          const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
          if (duplicateLegos.some(d => d.lego_id === legoId)) continue;
          if (usesBuildUseFormat(lego)) zutPhrases.push(...(lego.build || []), ...(lego.use || []));
          else if (lego.phrases) zutPhrases.push(...lego.phrases);
        }
        if (zutPhrases.length > 0) {
          const zutCollisions = await checkPhraseZUT(ctx.supabase, course_code, zutPhrases, seed_number);
          if (zutCollisions.length > 0) {
            const nkZut = s => (s || '').toLowerCase().trim().replace(/[.?!,，。？！、]+$/, '');
            const flaggedKnowns = new Set(zutCollisions.map(c => nkZut(c.known)));
            let heldOut = 0;
            const holdOut = (arr) => {
              if (!Array.isArray(arr)) return arr;
              const kept = arr.filter(p => !(p && p.known && flaggedKnowns.has(nkZut(p.known))));
              heldOut += arr.length - kept.length;
              return kept;
            };
            for (const lego of legos) {
              const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
              if (duplicateLegos.some(d => d.lego_id === legoId)) continue;
              if (usesBuildUseFormat(lego)) { lego.build = holdOut(lego.build); lego.use = holdOut(lego.use); }
              else if (lego.phrases) lego.phrases = holdOut(lego.phrases);
            }
            warnings.push({
              type: 'zut_phrase',
              message: 'ZUT (phrase) — transgressing phrase(s) held out; the seed and all conforming phrases were inserted',
              held_out: heldOut,
              collisions: zutCollisions.slice(0, 10),
              total_collisions: zutCollisions.length,
              hint: `One English prompt → one target (Zero Uncertainty). "${zutCollisions[0].known}" already maps to "${zutCollisions[0].existing_target}" (S${zutCollisions[0].existing_seed}); you submitted "${zutCollisions[0].new_target}". CONSOLIDATE to the existing target or DIFFERENTIATE the English prompt, then resubmit the held-out phrase(s).`,
              methodology: METHODOLOGY_HINTS.zut,
            });
            console.log(`⚠ ${seedId}: ZUT (phrase) — held out ${heldOut} transgressing phrase(s) across ${zutCollisions.length} collision(s); seed proceeds`);
          }
        }
      }

      // 3a-META. METADATA-GLOSS (warn): a debut must give a producible intention,
      // not a grammar label (least action to confidence). Surfaces classifiers /
      // markers / aspect-notes glossed as metadata for re-gloss-or-upchunk.
      {
        const metaWarnings = checkMetadataGloss(legos);
        for (const w of metaWarnings) {
          warnings.push({ type: 'metadata_gloss', ...w });
          console.log(`⚠ ${seedId}L${String(w.lego_index).padStart(2, '0')}: metadata gloss "${w.known}"`);
        }
      }

      // 3a-FRAME. FRAME-COVERAGE (warn): each USE basket should vary along the axis
      // that carries the new distinction (Principle 7), not just swap the slot filler.
      // Convergence pairs are exempt by construction. Was enforced only on /lego.
      for (const lego of legos) {
        const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
        if (duplicateLegos.some(d => d.lego_id === legoId)) continue;
        let basket = [];
        if (usesBuildUseFormat(lego)) basket = [...(lego.build || []), ...(lego.use || [])];
        else if (lego.phrases) basket = lego.phrases;
        const fw = checkBasketFrameCoverage(basket, lego.target);
        for (const w of fw) {
          warnings.push({ type: 'frame_coverage', lego_id: legoId, lego_target: lego.target, ...w });
          console.log(`⚠ ${legoId}: frame-coverage [${w.code}]`);
        }
      }

      // 3a-KNOWN. KNOWN-SIDE reconstructability (warn, contract-gated): every prompt
      // must compose from introduced glosses + licensed constructions (Principle 1 in
      // both languages). Fires ONLY when a pair-contract exists AND its known language
      // matches — English machinery must not be applied to a non-English-known course.
      {
        const contract = loadPairContract(course_code);
        if (contract && (!contract.known_lang || contract.known_lang === knownLang)) {
          const knownCtx = await buildKnownSideSeedCtx(ctx.supabase, course_code, seed_number, legos, contract);
          for (const lego of legos) {
            const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
            if (duplicateLegos.some(d => d.lego_id === legoId)) continue;
            let basket = [];
            if (usesBuildUseFormat(lego)) basket = [...(lego.build || []), ...(lego.use || [])];
            else if (lego.phrases) basket = lego.phrases;
            for (const phrase of basket) {
              if (!phrase.known) continue;
              const probs = checkKnownSide(phrase.known, seed_number, knownCtx);
              if (!probs.length) continue;
              // Vocab breaches BLOCK (2026-07-27 "yes I want to speak" fix): a prompt
              // using a known-language word never introduced at this position forks
              // production exactly like a target-side vocab violation. Construction /
              // licensing advisories stay warnings (contracts are mostly unratified).
              const breaches = probs.filter(isKnownVocabBreach);
              const advisories = probs.filter(p => !isKnownVocabBreach(p));
              if (breaches.length) {
                errors.push({
                  type: 'known_vocab',
                  message: `${legoId}: known-side prompt "${phrase.known}" uses vocabulary not yet introduced`,
                  lego_id: legoId,
                  known: phrase.known,
                  target: phrase.target,
                  problems: breaches.slice(0, 4),
                  hint: 'The KNOWN side is a controlled language too — every word of the English prompt must already be introduced as a LEGO/component gloss (exact form) or belong to the free glue class. Rewrite the prompt from introduced vocabulary.',
                });
                console.log(`✗ ${legoId}: KNOWN-VOCAB "${phrase.known}" — ${breaches[0]}`);
              }
              if (advisories.length) {
                warnings.push({ type: 'known_side', lego_id: legoId, known: phrase.known, target: phrase.target, problems: advisories.slice(0, 4) });
                console.log(`⚠ ${legoId}: known-side "${phrase.known}" — ${advisories[0]}`);
              }
            }
          }
        }
      }

      // 3b. PHRASE LENGTH RATIO VALIDATION
      const LOGOGRAPHIC_LANGS = ['zho', 'cmn', 'jpn', 'kor', 'tha', 'mya', 'lao', 'khm'];
      const isLogographic = LOGOGRAPHIC_LANGS.includes(targetLang) || LOGOGRAPHIC_LANGS.includes(knownLang);
      const LENGTH_RATIO_THRESHOLD = 2.5;
      const lengthMismatches = [];

      for (const lego of legos) {
        const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
        const isDuplicate = duplicateLegos.some(d => d.lego_id === legoId);
        if (isDuplicate) continue;

        let allPhrases = [];
        if (usesBuildUseFormat(lego)) {
          allPhrases = [...(lego.build || []), ...(lego.use || [])];
        } else if (lego.phrases) {
          allPhrases = lego.phrases;
        }

        for (const phrase of allPhrases) {
          if (!phrase.known || !phrase.target) continue;
          const knownLen = phrase.known.length;
          const targetLen = phrase.target.length;
          if (knownLen === 0 || targetLen === 0) continue;

          const ratio = Math.max(knownLen, targetLen) / Math.min(knownLen, targetLen);
          if (ratio > LENGTH_RATIO_THRESHOLD) {
            lengthMismatches.push({
              lego_id: legoId,
              known: phrase.known.substring(0, 50),
              target: phrase.target.substring(0, 50),
              known_len: knownLen,
              target_len: targetLen,
              ratio: Math.round(ratio * 10) / 10,
            });
          }
        }
      }

      if (lengthMismatches.length > 0 && !isLogographic) {
        errors.push({
          type: 'length_mismatch',
          message: `Phrase length mismatch - known and target should express same content (ratio > ${LENGTH_RATIO_THRESHOLD}x)`,
          mismatches: lengthMismatches.slice(0, 5),
          total_mismatches: lengthMismatches.length,
          hint: 'If target is much longer than known (or vice versa), you may have added extra content. Both languages must express the SAME meaning.',
          methodology: 'Each phrase pair is a translation. known_text and target_text must be semantically equivalent - no additions, no omissions.',
        });
        console.log(`✗ ${seedId}: LENGTH MISMATCH - ${lengthMismatches.length} phrases with ratio > ${LENGTH_RATIO_THRESHOLD}x`);
      } else if (isLogographic && lengthMismatches.length > 0) {
        console.log(`ℹ ${seedId}: Skipping length check for logographic language (${lengthMismatches.length} would have flagged)`);
      }

      // 4. PHRASE VALIDATION
      const globalPosition = (seed_number - 1) * 3;
      const { MIN_PHRASES_PER_LEGO } = ctx.config;

      for (const lego of legos) {
        const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
        const isDuplicate = duplicateLegos.some(d => d.lego_id === legoId);
        if (isDuplicate) continue;

        if (usesBuildUseFormat(lego)) {
          const buildUseResult = checkBuildUsePhrases(lego, course_code, seed_number);
          if (!buildUseResult.valid && !SKIP_VALIDATION) {
            errors.push({
              type: 'build_use',
              message: `${legoId}: ${buildUseResult.error}`,
              lego_id: legoId,
              details: buildUseResult.details,
              methodology: METHODOLOGY_HINTS.build_use,
            });
            console.log(`✗ ${legoId}: BUILD/USE - ${buildUseResult.error}`);
          }
        } else if (lego.phrases) {
          const phraseCount = lego.phrases.length;
          let minRequired = MIN_PHRASES_PER_LEGO;
          if (seed_number === 1 && lego.idx === 1) minRequired = 0;
          else if (seed_number === 1) minRequired = 1;
          else if (seed_number <= 3) minRequired = 3;
          else if (seed_number <= 5) minRequired = 4;
          else if (seed_number <= 10) minRequired = 5;

          if (phraseCount < minRequired && !SKIP_VALIDATION) {
            errors.push({
              type: 'phrases',
              message: `${legoId}: Only ${phraseCount} phrases (need ${minRequired}+ for seed ${seed_number})`,
              lego_id: legoId,
              methodology: METHODOLOGY_HINTS.phrases,
            });
          }
        } else {
          errors.push({
            type: 'no_phrases',
            message: `${legoId}: LEGO has NO PHRASES! Must include build[] + use[] arrays (see ralph-methodology.md)`,
            lego_id: legoId,
            hint: 'Each LEGO needs: build (flexible) + use (min 5 phrases with scores 5-9)',
            methodology: METHODOLOGY_HINTS.build_use,
          });
          console.log(`✗ ${legoId}: NO PHRASES - LEGO submitted without build/use/phrases arrays`);
        }
      }

      // 5. PHRASE COMPLEXITY (warning only)
      {
        for (const lego of legos) {
          const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
          const isDuplicate = duplicateLegos.some(d => d.lego_id === legoId);
          if (isDuplicate) continue;
          if (usesBuildUseFormat(lego)) continue;

          if (lego.phrases && lego.phrases.length > 0) {
            const complexityResult = checkPhraseComplexity(lego.phrases, course_code, seed_number);
            if (!complexityResult.valid) {
              console.log(`⚠ ${legoId}: PHRASE TIERS (warning, not blocking) - ${complexityResult.error}`);
            }
          }
        }
      }

      // 6. LEGO BALANCE VALIDATION (three-strike escalation)
      const { BALANCE_MAX_STRIKES } = ctx.config;
      if (!isDraft && seed_number > 20) {
        const allNewPhrases = [];
        for (const lego of legos) {
          const isDuplicate = duplicateLegos.some(d => d.lego_id === `${seedId}L${String(lego.idx).padStart(2, '0')}`);
          if (!isDuplicate) {
            if (usesBuildUseFormat(lego)) {
              allNewPhrases.push(...(lego.build || []), ...(lego.use || []));
            } else if (lego.phrases) {
              allNewPhrases.push(...lego.phrases);
            }
          }
        }

        if (allNewPhrases.length > 0) {
          const balanceData = await calculateLegoBalanceScores(ctx.supabase, course_code, seed_number);
          const balanceResult = checkPhraseBalance(allNewPhrases, balanceData, course_code);

          if (!balanceResult.balanced) {
            ctx.balanceViolations[course_code] = (ctx.balanceViolations[course_code] || 0) + 1;
            const strikes = ctx.balanceViolations[course_code];

            if (strikes >= BALANCE_MAX_STRIKES) {
              errors.push({
                type: 'balance',
                message: `Balance violation #${strikes} - REJECTED. Phrases over-rely on overused vocabulary.`,
                strikes,
                overused_in_phrases: balanceResult.overusedInPhrases,
                underused_available: balanceResult.underusedAvailable,
                hint: `Include underused LEGOs in your phrases. Strike counter resets on compliant submission.`,
                methodology: METHODOLOGY_HINTS.balance,
              });
              console.log(`✗ ${seedId}: BALANCE STRIKE ${strikes}/${BALANCE_MAX_STRIKES} - REJECTED`);
            } else {
              warnings.push({
                type: 'balance',
                message: `Balance warning ${strikes}/${BALANCE_MAX_STRIKES} - next violation will reject`,
                strikes,
                overused_ratio: balanceResult.overusedRatio + '%',
                overused_in_phrases: balanceResult.overusedInPhrases,
                underused_available: balanceResult.underusedAvailable,
                methodology: METHODOLOGY_HINTS.balance,
              });
              console.log(`⚠️ ${seedId}: BALANCE STRIKE ${strikes}/${BALANCE_MAX_STRIKES} - warned`);
            }
          } else {
            if (ctx.balanceViolations[course_code] > 0) {
              console.log(`✓ ${seedId}: Balance OK - strike counter reset`);
            }
            ctx.balanceViolations[course_code] = 0;
          }
        }
      }

      // Reject if any errors
      if (errors.length > 0) {
        console.log(`✗ ${seedId}: REJECTED - ${errors.length} validation error(s)`);
        for (const err of errors) {
          recordLessonFromError(ctx, course_code, err.type, err).catch(() => {});
        }

        return res.status(400).json({
          error: 'Validation failed',
          seed: seedId,
          errors,
          warnings,
          skills: ['ralph-methodology.md'],
          hint: 'Fix all errors and resubmit. Nothing was inserted. Review ralph-methodology.md for methodology guidance.',
          introduced_vocab: await vocabInjectionFor(ctx, course_code, seed_number),
        });
      }

      // ── HAIKU PHRASE SCORING — REMOVED ──
      // Previously called Haiku API directly for phrase quality scoring on every
      // seed submission. Removed because the build-team process (Opus checker +
      // Sonnet creator) already validates quality before submission, making this
      // redundant and expensive (~$38/day in API costs for zero additional value).
      let scoringResult = null;

      // ── DRAFT PATH ──
      if (isDraft) {
        const { error: draftError } = await ctx.supabase
          .from('course_seed_drafts')
          .upsert({
            course_code,
            seed_number,
            known_text,
            target_text,
            submission_data: { legos },
            validation_status: 'valid',
            validation_notes: {
              validated_at: new Date().toISOString(),
              validations_passed: ['tiling', 'vocab', 'build_use', 'phrase_counts', 'complexity', 'length_ratio'],
              validations_skipped: ['zut', 'balance'],
            },
            updated_at: new Date().toISOString(),
          }, { onConflict: 'course_code,seed_number' });

        if (draftError) throw new Error(`Draft upsert failed: ${draftError.message}`);

        console.log(`✓ ${seedId} DRAFTED (parallel mode)`);
        console.log(`  LEGOs: ${legos.length}`);
        console.log(`${'='.repeat(60)}\n`);

        return res.json({
          ok: true,
          seed: seedId,
          status: 'DRAFTED',
          action: 'PROCEED TO NEXT SEED',
          known_text,
          target_text,
          legos: legos.length,
          phrases: legos.reduce((sum, l) => sum + (l.build?.length || 0) + (l.use?.length || 0) + (l.phrases?.length || 0), 0),
          warnings: warnings.length > 0 ? { note: 'Warnings for next seed', items: warnings } : undefined,
          hint: 'Draft saved. Run POST /api/course/:code/finalize when all seeds are drafted.',
          introduced_vocab: await vocabInjectionFor(ctx, course_code, seed_number),
        });
      }

      // ── INSERT PHASE ──
      console.log(`\nInserting ${seedId}...`);

      const { error: seedError } = await ctx.supabase
        .from('course_seeds')
        .upsert({
          course_code,
          seed_number,
          known_text,
          target_text,
          target_text_roman: parsedData.target_roman || null,
          status: 'released',
          decomposed_at: new Date().toISOString(),
          version: 1,
        }, { onConflict: 'course_code,seed_number' });

      if (seedError) throw new Error(`Seed insert failed: ${seedError.message}`);
      console.log(`✓ Seed: "${known_text}" → "${target_text}"`);

      let totalPhrases = 0;
      let totalBuildupPhrases = 0;
      let skippedDuplicates = 0;
      let droppedBarePhrases = 0;

      for (const lego of legos) {
        const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
        const isDuplicate = duplicateLegos.some(d => d.lego_id === legoId);

        const { error: legoError } = await ctx.supabase
          .from('course_legos')
          .upsert({
            course_code,
            seed_number,
            lego_index: lego.idx,
            type: lego.type || 'A',
            is_new: !isDuplicate,
            known_text: lego.known,
            target_text: lego.target,
            target_text_roman: lego.target_roman || null,
            components: lego.components || null,
            status: 'draft',
            version: 1,
          }, { onConflict: 'course_code,seed_number,lego_index' });

        if (legoError) throw new Error(`LEGO insert failed: ${legoError.message}`);

        if (isDuplicate) {
          skippedDuplicates++;
          console.log(`  ${legoId}: ${lego.known} → ${lego.target} (duplicate, no baskets)`);
          continue;
        }

        let allPhraseRows = [];
        let buildupCount = 0;
        let practiceStartPosition = 1;
        let roleCounts = { component: 0, build: 0, use: 0 };

        // M-TYPE BUILD-UP
        if (lego.type === 'M' && lego.components && lego.components.length > 0) {
          const buildupResult = generateBuildupPhrases(
            { seed: seed_number, idx: lego.idx, known: lego.known, target: lego.target, components: lego.components },
            course_code
          );
          allPhraseRows = [...buildupResult.buildupPhrases];
          buildupCount = buildupResult.buildupPhrases.length;
          practiceStartPosition = buildupResult.startPosition;
          roleCounts = { ...buildupResult.roleCounts };
          totalBuildupPhrases += buildupCount;
        }

        // BUILD/USE format
        if (usesBuildUseFormat(lego)) {
          // Dedup against already-inserted buildup phrases (e.g. LEGO debut)
          const buildupNorms = new Set(allPhraseRows.map(p => normalizePhrase(p.target_text)));
          // Never write the LEGO out as its own practice phrase — it pads the
          // per-LEGO count without adding practice (phrase-structure.cjs).
          const buildBare = partitionBareLegoPhrases(lego.build || [], lego.target);
          const useBare = partitionBareLegoPhrases(lego.use || [], lego.target);
          if (buildBare.bare.length + useBare.bare.length > 0) {
            console.log(`    ⚠ ${legoId}: dropped ${buildBare.bare.length + useBare.bare.length} bare-LEGO phrase(s) ("${lego.target}") — not practice, not padding`);
            droppedBarePhrases += buildBare.bare.length + useBare.bare.length;
          }
          const rawBuild = buildBare.kept;
          const rawUse = useBare.kept;
          const buildPhrases = rawBuild.filter(p => {
            const norm = normalizePhrase(p.target);
            if (buildupNorms.has(norm)) { console.log(`    Deduped BUILD phrase (matches buildup): "${p.target}"`); return false; }
            buildupNorms.add(norm);
            return true;
          });
          const usePhrases = rawUse.filter(p => {
            const norm = normalizePhrase(p.target);
            if (buildupNorms.has(norm)) { console.log(`    Deduped USE phrase (matches buildup/build): "${p.target}"`); return false; }
            buildupNorms.add(norm);
            return true;
          });

          const buildRows = buildPhrases.map((p, i) => {
            roleCounts.build++;
            return {
              id: makePhraseId(course_code, seed_number, lego.idx, 'build', roleCounts.build),
              course_code,
              seed_number,
              lego_index: lego.idx,
              position: practiceStartPosition + i,
              known_text: p.known,
              target_text: p.target,
              target_text_roman: p.target_roman || null,
              word_count: p.target.length,
              lego_count: ((p.known || '').match(/\s+/g) || []).length + 1,
              phrase_role: 'build',
              connected_lego_ids: [],
              lego_position: computeLegoPosition(p.target, lego.target),
              metadata: { format: 'build_use' },
              introduce: true,
              status: 'draft',
              version: 1,
            };
          });

          const useRows = usePhrases.map((p, i) => {
            roleCounts.use++;
            return {
              id: makePhraseId(course_code, seed_number, lego.idx, 'use', roleCounts.use),
              course_code,
              seed_number,
              lego_index: lego.idx,
              position: practiceStartPosition + buildPhrases.length + i,
              known_text: p.known,
              target_text: p.target,
              target_text_roman: p.target_roman || null,
              word_count: p.target.length,
              lego_count: ((p.known || '').match(/\s+/g) || []).length + 1,
              phrase_role: 'use',
              connected_lego_ids: [],
              lego_position: computeLegoPosition(p.target, lego.target),
              metadata: {
                format: 'build_use',
                score: p.score,
                scored_at: new Date().toISOString(),
              },
              introduce: true,
              status: 'draft',
              version: 1,
            };
          });

          const avgScore = usePhrases.length > 0
            ? (usePhrases.reduce((sum, p) => sum + p.score, 0) / usePhrases.length).toFixed(1)
            : 0;

          allPhraseRows = [...allPhraseRows, ...buildRows, ...useRows];
          console.log(`    BUILD/USE format: ${buildRows.length} build + ${useRows.length} use phrases (avg score: ${avgScore})`);

        } else if (lego.phrases && lego.phrases.length > 0) {
          // Legacy format
          const legacyBare = partitionBareLegoPhrases(lego.phrases, lego.target);
          if (legacyBare.bare.length > 0) {
            console.log(`    ⚠ ${legoId}: dropped ${legacyBare.bare.length} bare-LEGO phrase(s) ("${lego.target}") — the LEGO alone is not a practice phrase`);
            droppedBarePhrases += legacyBare.bare.length;
          }
          const buildupNormalized = new Set(allPhraseRows.map(p => normalizePhrase(p.target_text)));
          const seenNormalized = new Set();
          const dedupedPhrases = legacyBare.kept.filter(p => {
            const norm = normalizePhrase(p.target);
            if (buildupNormalized.has(norm) || seenNormalized.has(norm)) return false;
            seenNormalized.add(norm);
            return true;
          });
          const dedupedCount = legacyBare.kept.length - dedupedPhrases.length;
          if (dedupedCount > 0) {
            console.log(`    Deduped ${dedupedCount} phrases (normalized: case/punctuation insensitive)`);
          }

          const sorted = [...dedupedPhrases].sort((a, b) => a.target.length - b.target.length);

          const practicePhrases = sorted.map((p, i) => {
            const position = practiceStartPosition + i;
            const role = computePhraseRole(position);
            roleCounts[role] = (roleCounts[role] || 0) + 1;
            return {
              id: makePhraseId(course_code, seed_number, lego.idx, role, roleCounts[role]),
              course_code,
              seed_number,
              lego_index: lego.idx,
              position,
              known_text: p.known,
              target_text: p.target,
              word_count: p.target.length,
              lego_count: ((p.known || '').match(/\s+/g) || []).length + 1,
              phrase_role: role,
              connected_lego_ids: [],
              lego_position: computeLegoPosition(p.target, lego.target),
              metadata: p.score ? { score: p.score } : {},
              introduce: true,
              status: 'draft',
              version: 1,
            };
          });

          allPhraseRows = [...allPhraseRows, ...practicePhrases];
        }

        // Insert all phrases
        if (allPhraseRows.length > 0) {
          const { error: phraseError } = await ctx.supabase
            .from('course_practice_phrases')
            .upsert(allPhraseRows, { onConflict: 'course_code,seed_number,lego_index,position' });
          if (phraseError) throw new Error(`Phrase insert failed: ${phraseError.message}`);
          totalPhrases += allPhraseRows.length;
        }

        const buildupInfo = buildupCount > 0 ? ` [${buildupCount} buildup + ${lego.phrases?.length || 0} practice]` : '';
        console.log(`  ${legoId}: ${lego.known} → ${lego.target} (${allPhraseRows.length} phrases${buildupInfo})`);
      }

      // EMPTY SEED HANDLING: add seed sentence as USE phrase for newest-word LEGO
      if (skippedDuplicates === legos.length && skippedDuplicates > 0) {
        const { data: allNewLegos } = await ctx.supabase
          .from('course_legos')
          .select('seed_number, lego_index, target_text')
          .eq('course_code', course_code)
          .eq('is_new', true)
          .lt('seed_number', seed_number)
          .order('seed_number');

        const wordIntroducedBy = {};
        for (const l of (allNewLegos || [])) {
          const words = extractVocab(l.target_text, chinese);
          for (const w of words) {
            if (!wordIntroducedBy[w]) {
              wordIntroducedBy[w] = { seed_number: l.seed_number, lego_index: l.lego_index, target_text: l.target_text };
            }
          }
        }

        const seedWords = extractVocab(target_text, chinese);
        let bestSeedNum = -1;
        let bestLegoIdx = -1;
        let bestLegoTarget = null;

        for (const w of seedWords) {
          const intro = wordIntroducedBy[w];
          if (!intro) continue;
          if (intro.seed_number > bestSeedNum ||
              (intro.seed_number === bestSeedNum && intro.lego_index > bestLegoIdx)) {
            bestSeedNum = intro.seed_number;
            bestLegoIdx = intro.lego_index;
            bestLegoTarget = intro.target_text;
          }
        }

        if (bestSeedNum >= 0) {
          const bestLegoId = `S${String(bestSeedNum).padStart(4,'0')}L${String(bestLegoIdx).padStart(2,'0')}`;

          const { data: existingPhrases } = await ctx.supabase
            .from('course_practice_phrases')
            .select('position, phrase_role')
            .eq('course_code', course_code)
            .eq('seed_number', bestSeedNum)
            .eq('lego_index', bestLegoIdx);

          const maxPos = existingPhrases?.reduce((max, p) => Math.max(max, p.position), 0) || 0;
          const existingUseCount = existingPhrases?.filter(p => p.phrase_role === 'use').length || 0;

          const { error: seedPhraseError } = await ctx.supabase
            .from('course_practice_phrases')
            .insert({
              id: makePhraseId(course_code, bestSeedNum, bestLegoIdx, 'use', existingUseCount + 1),
              course_code,
              seed_number: bestSeedNum,
              lego_index: bestLegoIdx,
              position: maxPos + 1,
              known_text: known_text,
              target_text: target_text,
              word_count: target_text.length,
              lego_count: (known_text.match(/\s+/g) || []).length + 1,
              phrase_role: 'use',
              connected_lego_ids: [],
              lego_position: computeLegoPosition(target_text, bestLegoTarget),
              metadata: {
                format: 'build_use',
                source: 'seed_sentence',
                source_seed: seed_number,
                score: 8,
              },
              introduce: true,
              status: 'draft',
              version: 1,
            });

          if (seedPhraseError) {
            console.warn(`  ⚠ Could not add seed as USE phrase: ${seedPhraseError.message}`);
          } else {
            totalPhrases++;
            console.log(`  ✓ Empty seed → USE phrase for ${bestLegoId} (${bestLegoTarget})`);
          }
        } else {
          console.log(`  ⚠ Empty seed but no introducing LEGO found for any word`);
        }
      }

      console.log(`\n✓ ${seedId} COMPLETE`);
      console.log(`  LEGOs: ${legos.length} (${skippedDuplicates} duplicates)`);
      console.log(`  Phrases: ${totalPhrases} (${totalBuildupPhrases} buildup)`);
      console.log(`${'='.repeat(60)}\n`);

      // Find next incomplete seed
      const { data: allSeeds } = await ctx.supabase
        .from('course_seeds')
        .select('seed_number, known_text, decomposed_at')
        .eq('course_code', course_code)
        .gt('seed_number', seed_number)
        .order('seed_number')
        .limit(50);

      const nextSeed = allSeeds?.find(s => !s.decomposed_at && s.known_text);

      // Recency hints for next iteration
      let recencyHints = null;
      let goldenCountForRecency = 10;
      try {
        const { data: courseForRecency } = await ctx.supabase
          .from('courses').select('quality_rules').eq('course_code', course_code).single();
        goldenCountForRecency = getGoldenSeedCount(courseForRecency);
      } catch (e) { /* default to 10 */ }
      if (nextSeed && seed_number > goldenCountForRecency) {
        try {
          const { overusedPatterns } = await analyzePatternRecency(ctx, course_code, 30);
          if (overusedPatterns.length > 0) {
            recencyHints = {
              patterns_to_avoid: overusedPatterns.slice(0, 5).map(p => p.pattern),
              warning: `These ${overusedPatterns.length} patterns are overused - use different sentence structures`,
            };
          }
        } catch (e) {
          // Non-critical
        }
      }

      // Update build_jobs with progress + activity log (fire-and-forget)
      const progressTimestamp = new Date().toISOString();
      const newLegosCount = legos.length - skippedDuplicates;
      const activityEntry = {
        at: progressTimestamp,
        seed: seed_number,
        legos: legos.length,
        new_legos: newLegosCount,
        phrases: totalPhrases,
        msg: `Seed ${seed_number}: ${newLegosCount} new LEGOs, ${totalPhrases} phrases`
      };
      ctx.supabase.from('build_jobs')
        .select('metadata')
        .eq('course_code', course_code)
        .eq('status', 'running')
        .single()
        .then(({ data: jobRow }) => {
          const meta = jobRow?.metadata || {};
          const log = Array.isArray(meta.activity_log) ? meta.activity_log : [];
          log.push(activityEntry);
          // FIFO ring buffer: keep last 20 entries
          while (log.length > 20) log.shift();
          meta.activity_log = log;
          return ctx.supabase.from('build_jobs')
            .update({
              current_seed: seed_number,
              seeds_completed: seed_number,
              last_heartbeat: progressTimestamp,
              last_progress_at: progressTimestamp,
              machine_name: ctx.MACHINE_NAME,
              metadata: meta,
            })
            .eq('course_code', course_code)
            .eq('status', 'running');
        })
        .then((result) => {
          if (result?.error) console.error(`[BUILD] build_jobs update failed:`, result.error.message);
        })
        .catch((err) => {
          console.error(`[BUILD] build_jobs activity log update failed:`, err.message);
        });

      ctx.emitPipelineEvent(course_code, 'seed:complete', { seed_number: seed_number, legos_count: legos.length, phrases_count: totalPhrases });

      // Emit progress every 25 seeds with real counts from DB
      emitProgressThrottled(ctx.supabase, course_code, 'build', {
        every: 25,
        getProgress: async () => {
          const { count: done } = await ctx.supabase
            .from('course_seeds')
            .select('*', { count: 'exact', head: true })
            .eq('course_code', course_code)
            .not('decomposed_at', 'is', null);
          const { data: courseInfo } = await ctx.supabase
            .from('courses')
            .select('seed_count')
            .eq('course_code', course_code)
            .single();
          return { done: done || 0, total: courseInfo?.seed_count || 300 };
        },
        message: (done, total) => `Build progress: ${done}/${total} seeds decomposed (${Math.round(done / total * 100)}%)`
      });

      await bumpCourseVersion(ctx.supabase, course_code, 'minor');

      res.json({
        ok: true,
        seed: seedId,
        status: 'INSERTED',
        action: 'PROCEED TO NEXT SEED',
        known_text,
        target_text,
        legos: legos.length,
        duplicates_skipped: skippedDuplicates,
        phrases: totalPhrases,
        buildup_phrases: totalBuildupPhrases,
        ...(droppedBarePhrases > 0 ? {
          bare_lego_phrases_dropped: droppedBarePhrases,
          bare_lego_hint: 'A practice phrase that IS the LEGO teaches nothing — the learner meets the bare LEGO at intro and debut. Use the LEGO IN a phrase with already-introduced vocabulary.',
        } : {}),

        warnings: warnings.length > 0 ? {
          note: 'THESE ARE FOR YOUR NEXT SEED - this seed is already saved. Do NOT resubmit.',
          items: warnings,
        } : undefined,

        quality_reminder: {
          role: 'You are a world-class language teacher creating speakable phrases.',
          goal: 'Maximum VARIETY in sentence structures, within vocabulary constraints.',
          anti_pattern: 'Never use the same sentence formula twice in a row. Each phrase should feel fresh and natural.',
          examples: [
            'GOOD: "I think we should go tomorrow" → "Maybe she wants to come too" → "The weather looks nice today"',
            'BAD: "I don\'t know if..." → "I\'m not sure if..." → "I don\'t know if..." (formulaic, lazy)',
          ],
          mantra: 'If you catch yourself repeating a pattern, STOP and create something different.',
        },

        session: (() => {
          const activity = ctx.courseActivity.get(course_code);
          const seedsThisSession = activity?.seedsThisSession || 1;
          return {
            seeds_this_session: seedsThisSession,
            suggestion: 'CONTINUE',
            message: 'Keep building. Full course in one context window.',
          };
        })(),

        next_seed: nextSeed ? {
          instruction: 'BUILD THIS SEED NOW - do not resubmit the previous one',
          seed_number: nextSeed.seed_number,
          known_text: nextSeed.known_text,
          recency_hints: recencyHints,
        } : {
          instruction: 'ALL SEEDS COMPLETE - say BATCH COMPLETE and exit',
        },

        introduced_vocab: await vocabInjectionFor(ctx, course_code, seed_number),
      });

      // Fire-and-forget: when seed 5 lands and the course hasn't yet been
      // checked, run the Haiku gender-prep detector. Picking seed 5 means
      // there's enough first-person content to sample. Doesn't block response.
      if (seed_number === 5) {
        (async () => {
          try {
            const { data: courseRow } = await ctx.supabase.from('courses').select('needs_gender_prep').eq('course_code', course_code).single().catch(() => ({ data: null }));
            if (courseRow && courseRow.needs_gender_prep === null) {
              const { detectNeedsGenderPrep } = require('../../gender-prep-detector.cjs');
              detectNeedsGenderPrep(course_code).then(r => {
                console.log(`[gender-prep auto-check] ${course_code}: needs_gender_prep=${r.needs_gender_prep} persisted=${r.persisted}`);
              }).catch(e => {
                console.warn(`[gender-prep auto-check] ${course_code} failed:`, e.message);
              });
            }
          } catch (e) {
            // Migration may not be applied yet — silently skip auto-check
          }
        })();
      }

    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
