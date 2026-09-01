/**
 * Course data / stats / resume / vocab routes.
 *
 * Extracted from the monolith course-builder-api.cjs.
 * Factory pattern: module.exports = function(ctx) { ... return router; }
 */

const { Router } = require('express');
const { isChinese, getLanguageName } = require('../lib/language-config.cjs');
const { loadCourseVocab, loadTranslationVocab } = require('../lib/vocab-cache.cjs');
const { getCheckpointStatus, CHECKPOINT_SEEDS } = require('../lib/checkpoint.cjs');
const { recordActivity } = require('../lib/activity-tracker.cjs');
const { calculateLegoBalanceScores } = require('../lib/validation.cjs');

// ─── Inline helpers (not yet extracted to a lib module) ──────────────

/**
 * Extract n-grams from text (used by pattern recency analysis).
 */
function extractNgrams(text, n = 3) {
  const words = text.toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')  // Keep letters/numbers/spaces (Unicode-aware)
    .split(/\s+/)
    .filter(w => w.length > 0);

  const ngrams = [];
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(' '));
  }
  return ngrams;
}

/**
 * Analyze pattern recency for fatigue detection.
 * TODO: Extract to lib/recency.cjs when more recency helpers accumulate.
 */
async function analyzePatternRecency(ctx, courseCode, windowSize) {
  const window = windowSize || ctx.config.RECENCY_WINDOW;

  // Get phrases from recent seeds
  const { data: recentPhrases } = await ctx.supabase
    .from('course_practice_phrases')
    .select('seed_number, known_text, target_text')
    .eq('course_code', courseCode)
    .order('seed_number', { ascending: false })
    .limit(window * 50);  // Estimate ~50 phrases per seed

  if (!recentPhrases || recentPhrases.length === 0) {
    return { overusedPatterns: [], patternCounts: {} };
  }

  // Get the seed numbers in the window
  const seedNumbers = [...new Set(recentPhrases.map(p => p.seed_number))].sort((a, b) => b - a);
  const windowSeeds = new Set(seedNumbers.slice(0, window));

  // Count n-grams in the window (KNOWN LANGUAGE ONLY)
  // Target language repetition is pedagogically useful; known language repetition is boring
  const patternCounts = {};  // pattern -> { count, seeds: Set }

  for (const phrase of recentPhrases) {
    if (!windowSeeds.has(phrase.seed_number)) continue;

    // Only analyze known language text - that's where repetition feels stale
    const knownNgrams = extractNgrams(phrase.known_text, 3);

    for (const ngram of knownNgrams) {
      if (!patternCounts[ngram]) {
        patternCounts[ngram] = { count: 0, seeds: new Set() };
      }
      patternCounts[ngram].count++;
      patternCounts[ngram].seeds.add(phrase.seed_number);
    }
  }

  // Find over-used patterns (appear in too many seeds)
  const overusedPatterns = Object.entries(patternCounts)
    .filter(([_, data]) => data.seeds.size >= ctx.config.PATTERN_FATIGUE_THRESHOLD)
    .map(([pattern, data]) => ({
      pattern,
      seedCount: data.seeds.size,
      totalCount: data.count
    }))
    .sort((a, b) => b.seedCount - a.seedCount)
    .slice(0, 20);  // Top 20 most overused

  return { overusedPatterns, patternCounts };
}

/**
 * Analyze vocabulary recency for reinforcement recommendations.
 * Returns vocabulary that was introduced a while ago but hasn't been practiced recently.
 * TODO: Extract to lib/recency.cjs when more recency helpers accumulate.
 */
async function analyzeVocabRecency(ctx, courseCode) {
  // Get all LEGOs with their introduction seed
  const { data: legos } = await ctx.supabase
    .from('course_legos')
    .select('seed_number, known_text, target_text, is_new')
    .eq('course_code', courseCode)
    .eq('is_new', true)
    .order('seed_number');

  if (!legos || legos.length === 0) {
    return { needsReinforcement: [], recentlyOverused: [] };
  }

  // Get current max seed number
  const { data: maxSeedData } = await ctx.supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', courseCode)
    .order('seed_number', { ascending: false })
    .limit(1);

  const currentSeed = maxSeedData?.[0]?.seed_number || 0;

  // Get recent phrase usage to see what vocabulary is being used
  const { data: recentPhrases } = await ctx.supabase
    .from('course_practice_phrases')
    .select('known_text, target_text, seed_number')
    .eq('course_code', courseCode)
    .gte('seed_number', currentSeed - ctx.config.RECENCY_WINDOW)
    .order('seed_number', { ascending: false });

  // Build vocab usage map from recent phrases
  const recentVocabUsage = new Map();  // word -> lastUsedSeed
  for (const phrase of (recentPhrases || [])) {
    const words = `${phrase.known_text} ${phrase.target_text}`.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 1) {
        const current = recentVocabUsage.get(word) || 0;
        recentVocabUsage.set(word, Math.max(current, phrase.seed_number));
      }
    }
  }

  // Categorize LEGOs by recency
  const needsReinforcement = [];  // Introduced in reinforcement zone, not used recently

  for (const lego of legos) {
    const seedsAgo = currentSeed - lego.seed_number;
    const knownWords = lego.known_text.toLowerCase().split(/\s+/);

    // Check if in reinforcement zone (20-60 seeds ago)
    if (seedsAgo >= ctx.config.REINFORCEMENT_ZONE.min && seedsAgo <= ctx.config.REINFORCEMENT_ZONE.max) {
      // Check if used recently
      const lastUsed = Math.max(...knownWords.map(w => recentVocabUsage.get(w) || 0));
      const seedsSinceUse = currentSeed - lastUsed;

      if (seedsSinceUse > 10) {  // Not used in last 10 seeds
        needsReinforcement.push({
          known: lego.known_text,
          target: lego.target_text,
          introduced_seed: lego.seed_number,
          seeds_ago: seedsAgo,
          last_used_seed: lastUsed || null
        });
      }
    }
  }

  return {
    needsReinforcement: needsReinforcement.slice(0, 15),  // Top 15 needing reinforcement
    currentSeed,
    reinforcementZone: ctx.config.REINFORCEMENT_ZONE
  };
}

/**
 * Helper: fetch a completed seed from DB as JSON (LEGOs + phrases).
 * Used by the /next/:courseCode endpoint for example seeds.
 */
async function fetchCompletedSeed(ctx, courseCode, seedNumber) {
  const { data: seed } = await ctx.supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', courseCode)
    .eq('seed_number', seedNumber)
    .single();

  if (!seed) return null;

  const { data: legos } = await ctx.supabase
    .from('course_legos')
    .select('lego_index, known_text, target_text, type, components')
    .eq('course_code', courseCode)
    .eq('seed_number', seedNumber)
    .order('lego_index');

  if (!legos || legos.length === 0) return null;

  const { data: phrases } = await ctx.supabase
    .from('course_practice_phrases')
    .select('lego_index, known_text, target_text, phrase_role, position')
    .eq('course_code', courseCode)
    .eq('seed_number', seedNumber)
    .order('lego_index')
    .order('position');

  return {
    course_code: courseCode,
    seed_number: seed.seed_number,
    known_text: seed.known_text,
    target_text: seed.target_text,
    legos: legos.map(l => {
      const obj = {
        idx: l.lego_index,
        type: l.type,
        known: l.known_text,
        target: l.target_text
      };
      if (l.type === 'M' && l.components) {
        obj.components = l.components;
      }
      const legoPhrases = (phrases || []).filter(p => p.lego_index === l.lego_index);
      obj.build = legoPhrases
        .filter(p => p.phrase_role === 'build')
        .map(p => ({ known: p.known_text, target: p.target_text }));
      obj.use = legoPhrases
        .filter(p => p.phrase_role === 'use')
        .map(p => ({ known: p.known_text, target: p.target_text }));
      return obj;
    })
  };
}

// ─── Router factory ──────────────────────────────────────────────────

module.exports = function courseDataRoutes(ctx) {
  const router = Router();

  // ─── GET /stats/:courseCode ──────────────────────────────────────────
  router.get('/stats/:courseCode', async (req, res) => {
    const { courseCode } = req.params;

    const { count: legos } = await ctx.supabase
      .from('course_legos')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode);

    // Count only NEW legos (unique introductions, not duplicates)
    const { count: newLegos } = await ctx.supabase
      .from('course_legos')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .eq('is_new', true);

    const { count: phrases } = await ctx.supabase
      .from('course_practice_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode);

    // Get seed_count from courses table (the release target)
    const { data: courseData } = await ctx.supabase
      .from('courses')
      .select('seed_count')
      .eq('course_code', courseCode)
      .single();
    const totalSeeds = courseData?.seed_count || 300;

    // Count completed seeds (those with BOTH known_text and target_text non-empty)
    const { count: completedSeeds } = await ctx.supabase
      .from('course_seeds')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .neq('target_text', '')
      .neq('known_text', '');

    // Count seeds with decomposition done (includes empty seeds where all LEGOs were duplicates)
    const { count: seedsWithLegos } = await ctx.supabase
      .from('course_seeds')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .not('decomposed_at', 'is', null);

    // Ratio based on total legos (phrases per LEGO)
    const totalLegos = legos || 0;
    const ratio = totalLegos > 0 ? (phrases / totalLegos) : 0;
    const quality = ratio >= ctx.config.MIN_BATCH_PHRASE_RATIO ? 'PASS' : 'FAIL';

    // Get vocab size
    const vocabSet = await loadCourseVocab(ctx, courseCode);
    const chinese = isChinese(courseCode);

    // Gender expansion count
    const { count: genderExpansions } = await ctx.supabase
      .from('course_gender_expansions')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode);

    // Draft counts (for parallel builds)
    let draftCount = 0;
    let validDrafts = 0;
    try {
      const { count: dc } = await ctx.supabase
        .from('course_seed_drafts')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode);
      draftCount = dc || 0;

      const { count: vd } = await ctx.supabase
        .from('course_seed_drafts')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .eq('validation_status', 'valid');
      validDrafts = vd || 0;
    } catch (e) {
      // Draft table may not exist yet — ignore
    }

    res.json({
      course_code: courseCode,
      total_seeds: totalSeeds,
      completed_seeds: completedSeeds || 0,
      seeds_with_legos: seedsWithLegos || 0,
      seeds: seedsWithLegos || 0,  // Legacy field, same as seeds_with_legos
      legos: totalLegos,           // Total LEGOs (all records)
      legos_new: newLegos || 0,    // Unique introductions (is_new=true)
      phrases: phrases || 0,
      ratio: ratio.toFixed(1),
      vocab_size: vocabSet.size,
      vocab_mode: chinese ? 'characters' : 'words',
      quality,
      gender_expansions: genderExpansions || 0,
      drafts_total: draftCount,
      drafts_valid: validDrafts,
      thresholds: {
        min: ctx.config.MIN_PHRASES_PER_LEGO,
        target: ctx.config.TARGET_PHRASES_PER_LEGO,
        max: ctx.config.MAX_PHRASES_PER_LEGO,
        min_batch_ratio: ctx.config.MIN_BATCH_PHRASE_RATIO
      }
    });
  });

  // ─── GET /recency/:courseCode ────────────────────────────────────────
  router.get('/recency/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const windowSize = parseInt(req.query.window) || ctx.config.RECENCY_WINDOW;

    try {
      const [patternAnalysis, vocabAnalysis] = await Promise.all([
        analyzePatternRecency(ctx, courseCode, windowSize),
        analyzeVocabRecency(ctx, courseCode)
      ]);

      res.json({
        course_code: courseCode,
        window_size: windowSize,
        pattern_fatigue_threshold: ctx.config.PATTERN_FATIGUE_THRESHOLD,
        reinforcement_zone: ctx.config.REINFORCEMENT_ZONE,

        // Patterns that are overused
        overused_patterns: patternAnalysis.overusedPatterns,
        overused_count: patternAnalysis.overusedPatterns.length,

        // Vocabulary needing reinforcement
        needs_reinforcement: vocabAnalysis.needsReinforcement,
        reinforcement_count: vocabAnalysis.needsReinforcement.length,

        // Summary
        health: patternAnalysis.overusedPatterns.length === 0
          ? 'HEALTHY - Good pattern distribution'
          : patternAnalysis.overusedPatterns.length < 5
          ? 'FAIR - Some patterns overused, watch variety'
          : 'POOR - Many patterns overused, need more variety'
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── GET /resume/:courseCode ─────────────────────────────────────────
  router.get('/resume/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const targetLangName = getLanguageName(courseCode);
    const chinese = isChinese(courseCode);

    // AUTO-HEARTBEAT: Agent is alive and checking for work
    const now = Date.now();
    ctx.agentHeartbeats.set(courseCode, {
      lastHeartbeat: now,
      agentId: 'resume',
      status: 'checking',
      currentSeed: null,
      startedAt: ctx.agentHeartbeats.get(courseCode)?.startedAt || now
    });

    // Get course info including translation_analysis, quality_rules, and seed_count (Two-Pass workflow)
    const { data: courseInfo } = await ctx.supabase
      .from('courses')
      .select('display_name, translation_analysis, quality_rules, seed_count')
      .eq('course_code', courseCode)
      .single();

    // Get target seed count (defaults to 260 if not set)
    const targetSeedCount = courseInfo?.seed_count || 300;

    // Get all seeds with their completion status - FILTERED to target range
    const { data: allSeedsRaw } = await ctx.supabase
      .from('course_seeds')
      .select('seed_number, known_text, target_text')
      .eq('course_code', courseCode)
      .order('seed_number');

    // Filter to only seeds within target range (1 to seed_count)
    const allSeeds = allSeedsRaw?.filter(s => s.seed_number <= targetSeedCount) || [];

    // Get seeds that have been decomposed (completed) - also filtered to range
    const { data: completedData } = await ctx.supabase
      .from('course_seeds')
      .select('seed_number, decomposed_at')
      .eq('course_code', courseCode)
      .not('decomposed_at', 'is', null);

    const completedSeeds = new Set(
      (completedData || [])
        .filter(s => s.seed_number <= targetSeedCount)
        .map(s => s.seed_number)
    );

    // Find next incomplete seed
    const incompleteSeed = allSeeds?.find(s =>
      !completedSeeds.has(s.seed_number) && s.known_text && s.known_text !== ''
    );

    // Get recent completed seeds (last 5)
    const recentCompleted = allSeeds
      ?.filter(s => completedSeeds.has(s.seed_number))
      .slice(-5)
      .map(s => ({
        seed_number: s.seed_number,
        known_text: s.known_text,
        target_text: s.target_text
      }));

    // Get recent LEGOs (last 20 new ones for context)
    const { data: recentLegos } = await ctx.supabase
      .from('course_legos')
      .select('seed_number, lego_index, type, known_text, target_text, is_new')
      .eq('course_code', courseCode)
      .eq('is_new', true)
      .order('seed_number', { ascending: false })
      .order('lego_index', { ascending: false })
      .limit(20);

    // Get ALL LEGOs for full vocabulary access (essential for phrase generation)
    // RECENT FIRST: Nudges agent attention toward recently introduced LEGOs
    const { data: allLegos } = await ctx.supabase
      .from('course_legos')
      .select('seed_number, lego_index, known_text, target_text, type, components')
      .eq('course_code', courseCode)
      .eq('is_new', true)  // Only canonical LEGOs, not re-uses
      .order('seed_number', { ascending: false })  // Recent first - subtle attention nudge
      .order('lego_index', { ascending: false });

    // Get vocab stats
    const vocabSet = await loadCourseVocab(ctx, courseCode);

    // Calculate progress
    const totalSeeds = allSeeds?.length || 0;
    const completedCount = completedSeeds.size;
    const progress = totalSeeds > 0 ? ((completedCount / totalSeeds) * 100).toFixed(1) : 0;

    // Two-Pass workflow: Calculate pass status
    // Pass 1: Translate all seeds in range (1 to seed_count) + save analysis
    // Pass 2: Decompose all seeds in range into LEGOs
    const seedsInRange = allSeeds.length;  // Seeds 1 to targetSeedCount
    const seedsTranslated = allSeeds.filter(s => s.target_text && s.target_text.trim() !== '' && s.known_text && s.known_text.trim() !== '').length;
    const seedsDecomposed = completedSeeds.size;
    const analysisSaved = !!courseInfo?.translation_analysis;

    // Pass 1 complete when ALL seeds in range are translated AND analysis saved
    const pass1Complete = seedsTranslated >= seedsInRange && seedsInRange > 0 && analysisSaved;
    // Pass 2 complete when ALL seeds in range have LEGOs (no gaps!)
    const pass2Complete = seedsDecomposed >= seedsInRange;
    const currentPass = pass1Complete ? 2 : 1;

    // Get recency analysis for pattern/vocab distribution guidance
    const [patternAnalysis, vocabAnalysis] = await Promise.all([
      analyzePatternRecency(ctx, courseCode),
      analyzeVocabRecency(ctx, courseCode)
    ]);

    // Find next seed based on current pass
    // Pass 1: First seed without target_text
    const nextToTranslate = allSeeds?.find(s => !s.target_text || s.target_text.trim() === '');
    // Pass 2: First seed with translation but no LEGOs
    const nextToDecompose = allSeeds?.find(s =>
      s.target_text && s.target_text.trim() !== '' && !completedSeeds.has(s.seed_number)
    );

    // Build action instruction based on pass status
    let actionInstruction;
    if (!pass1Complete) {
      actionInstruction = {
        current_pass: 1,
        action: 'TRANSLATE ONLY - DO NOT CREATE LEGOs',
        description: `Translate all seeds to ${targetLangName}. ${seedsTranslated}/${totalSeeds} done.`,
        next_seed: nextToTranslate?.seed_number || null,
        endpoint: `PATCH /api/seed/${courseCode}/{seed_number}`,
        body: '{"target_text": "your translation"}',
        when_done: `POST /api/course/${courseCode}/analysis`
      };
      // Only show FIRST if just starting pass 1
      if (seedsTranslated === 0) {
        actionInstruction.FIRST = 'Read ralph-methodology.md - covers ZERO VARIATION, cognates, register consistency';
      }
    } else if (!pass2Complete) {
      actionInstruction = {
        current_pass: 2,
        action: 'DECOMPOSE INTO LEGOs',
        description: `Break seeds into LEGOs. ${seedsDecomposed}/${seedsInRange} done (target: seeds 1-${targetSeedCount}).`,
        next_seed: nextToDecompose ? {
          seed_number: nextToDecompose.seed_number,
          known_text: nextToDecompose.known_text,
          target_text: nextToDecompose.target_text
        } : null,
        endpoint: `POST /api/seed/complete`
      };
      // Only show FIRST if just starting pass 2
      if (seedsDecomposed === 0) {
        actionInstruction.FIRST = 'Read ralph-methodology.md for methodology guidance';
      }
    } else {
      actionInstruction = {
        current_pass: 'COMPLETE',
        action: 'COURSE COMPLETE',
        description: `All ${seedsInRange} seeds (1-${targetSeedCount}) translated and decomposed.`
      };
    }

    res.json({
      ACTION: actionInstruction,
      course_code: courseCode,
      target_language: targetLangName,
      translation_analysis: courseInfo?.translation_analysis || null,
      // Strip golden_decompositions from quality_rules (sent separately as GOLDEN_DECOMPOSITIONS in curated form)
      quality_rules: (() => {
        const rules = { ...(courseInfo?.quality_rules || {}) };
        delete rules.golden_decompositions;
        return Object.keys(rules).length > 0 ? rules : null;
      })(),

      // LEARNINGS - Language-pair specific insights from previous builds (APPLY THESE!)
      LEARNINGS: (() => {
        const learnings = courseInfo?.quality_rules?.learnings || [];
        if (learnings.length === 0) return null;

        // Group by category for easy scanning
        const byCategory = {};
        learnings.forEach(l => {
          if (!byCategory[l.category]) byCategory[l.category] = [];
          byCategory[l.category].push(l.learning);
        });

        return {
          _WARNING: `APPLY THESE ${learnings.length} LEARNINGS - they were discovered from previous QA`,
          ...byCategory
        };
      })(),

      // GOLDEN DECOMPOSITIONS - Human-verified examples from calibration (FOLLOW THESE PATTERNS!)
      // Cap at ~5 evenly-spaced examples to keep prompt size manageable (50 golden seeds = ~35KB otherwise)
      GOLDEN_DECOMPOSITIONS: (() => {
        const golden = courseInfo?.quality_rules?.golden_decompositions;
        if (!golden || golden.length === 0) return null;

        const MAX_EXAMPLES = 5;
        let sampled;
        if (golden.length <= MAX_EXAMPLES) {
          sampled = golden;
        } else {
          // Pick evenly-spaced examples: first, last, and evenly distributed between
          const indices = [];
          for (let i = 0; i < MAX_EXAMPLES; i++) {
            indices.push(Math.round(i * (golden.length - 1) / (MAX_EXAMPLES - 1)));
          }
          sampled = indices.map(i => golden[i]);
        }

        return {
          _INSTRUCTION: `FOLLOW THESE ${sampled.length} CALIBRATED EXAMPLES (sampled from ${golden.length} total) - they show the correct M vs A LEGO decisions for this language pair`,
          calibrated_at: courseInfo?.quality_rules?.calibrated_at,
          total_golden_count: golden.length,
          examples: sampled.map(g => ({
            seed: g.seed_number,
            known: g.known_text,
            target: g.target_text,
            legos: g.legos.map(l => ({
              type: l.type,
              known: l.known,
              target: l.target,
              reasoning: l.reasoning || null,
              components: l.components || null,
              build_phrases: l.build_phrases || [],
              use_phrases: l.use_phrases || []
            })),
            key_insight: g.key_insight || null,
            dont_do: g.contrastive_notes?.filter(n => n.includes("DON'T") || n.includes("DON\u2019T")) || [],
            do_this: g.contrastive_notes?.filter(n => n.includes("DO:") || n.includes("DO:")) || []
          }))
        };
      })(),

      // Context from recent work
      recent_seeds: recentCompleted || [],
      recent_legos: recentLegos?.reverse() || [],

      // Seed Range - only work on seeds within this range
      seed_range: {
        target: targetSeedCount,
        seeds_in_range: allSeeds.length,
        completed_in_range: completedCount,
        remaining: allSeeds.length - completedCount,
        note: `Only working on seeds 1-${targetSeedCount}. Seeds ${targetSeedCount + 1}+ are ignored until seed_count is increased.`
      },

      // Stats
      progress: `${progress}%`,
      completed_seeds: completedCount,
      total_seeds: allSeeds.length,  // Now reflects filtered range, not all seeds in DB
      vocab_size: vocabSet.size,
      vocab_mode: chinese ? 'characters' : 'words',

      // Vocabulary summary (full list available via GET /api/vocab/:courseCode if needed)
      vocabulary_summary: {
        total: (allLegos || []).length,
        hint: 'Trust your instincts as a language teacher. Create meaningful M-type chunks for multi-character concepts. The API validates ZUT - it will tell you if you conflict with existing vocabulary.'
      },

      // RECENCY GUIDANCE - Critical for avoiding repetitive patterns
      recency: {
        // Patterns to AVOID - these have been overused in recent seeds
        patterns_to_avoid: patternAnalysis.overusedPatterns.map(p => ({
          pattern: p.pattern,
          used_in_seeds: p.seedCount,
          warning: `Appears in ${p.seedCount} of last ${ctx.config.RECENCY_WINDOW} seeds - use different structures`
        })),

        // Vocabulary needing REINFORCEMENT - introduced a while ago, not practiced recently
        vocab_to_reinforce: vocabAnalysis.needsReinforcement.map(v => ({
          known: v.known,
          target: v.target,
          introduced: `Seed ${v.introduced_seed} (${v.seeds_ago} seeds ago)`,
          action: 'Include in your practice phrases to reinforce this vocabulary'
        })),

        // Guidance summary
        guidance: patternAnalysis.overusedPatterns.length > 0 || vocabAnalysis.needsReinforcement.length > 0
          ? `IMPORTANT: Avoid the ${patternAnalysis.overusedPatterns.length} overused patterns listed above. ` +
            `Try to reinforce the ${vocabAnalysis.needsReinforcement.length} vocabulary items that need practice.`
          : 'Pattern distribution looks healthy. Continue with varied sentence structures.'
      },

      // Full methodology for self-recovery after compaction - INLINE EXAMPLES, no external refs
      methodology: {
        critical_concept: 'You are building a LEARNING EXPERIENCE. Each LEGO combines with PREVIOUS vocabulary to form phrases. LEGOs are SMALL pieces (2-4 words), not whole sentences.',
        seed_decomposition_example: {
          seed: 'I want to speak Chinese with you now',
          legos: [
            'L1 [M]: "I want" \u2192 "\u6211\u60f3" (components: I\u2192\u6211, want\u2192\u60f3)',
            'L2 [A]: "to speak" \u2192 "\u8bf4"',
            'L3 [A]: "Chinese" \u2192 "\u4e2d\u6587"',
            'L4 [M]: "with you" \u2192 "\u548c\u4f60" (components: with\u2192\u548c, you\u2192\u4f60)',
            'L5 [A]: "now" \u2192 "\u73b0\u5728"'
          ],
          note: 'Each LEGO generates BUILD + USE phrases using ONLY vocabulary from previous LEGOs'
        },
        complete_lego_example_markdown: `## L4 [M] "with you" \u2192 "\u548c\u4f60"
Components: with \u2192 \u548c, you \u2192 \u4f60

BUILD:
- with you \u2192 \u548c\u4f60
- speak with you \u2192 \u548c\u4f60\u8bf4
- speak Chinese with you \u2192 \u548c\u4f60\u8bf4\u4e2d\u6587

USE:
- I want to speak with you \u2192 \u6211\u60f3\u548c\u4f60\u8bf4 [7]
- I want to speak Chinese with you \u2192 \u6211\u60f3\u548c\u4f60\u8bf4\u4e2d\u6587 [8]
- I want to learn Chinese with you \u2192 \u6211\u60f3\u548c\u4f60\u5b66\u4e2d\u6587 [8]
- Do you want to speak Chinese with me? \u2192 \u4f60\u60f3\u548c\u6211\u8bf4\u4e2d\u6587\u5417? [9]`,
        workflow: [
          '1. Decompose next_seed into 3-6 SMALL LEGOs (not whole sentences!)',
          '2. For EACH LEGO: generate BUILD (flexible) + USE (min 5) phrases',
          '3. USE phrases must be complete sentences with scores 5-9',
          '4. Phrases can only use THIS LEGO + vocabulary from PREVIOUS LEGOs',
          `5. Submit as markdown: POST /api/seed/complete?course=${courseCode} with Content-Type: text/markdown`,
          '6. Post summary to chat after each seed, check for human feedback',
          '7. Continue to next seed unless human says to stop or redo'
        ],
        phrase_requirements: {
          build: 'Flexible: LEGO + 1-5 syllables, fragments OK, debut only',
          use: 'Minimum 5: LEGO + 5-10 syllables, COMPLETE SENTENCES, scored 5-9, reused in consolidate/review'
        },
        scoring: {
          '9': 'Native-natural both languages, high pedagogical value',
          '7-8': 'Strong, minor stylistic preferences',
          '5-6': 'Functional, correct but unremarkable',
          '4 or below': 'Hard reject - REWRITE before submitting'
        },
        rules: [
          'LEGOs are SMALL pieces (2-4 words) - never whole sentences',
          'Phrases use ONLY this LEGO + previous vocabulary',
          'Use overlapping LEGOs when word order differs between languages',
          'Trust API validation errors - they tell you exactly what to fix'
        ]
      }
    });
  });

  // ─── GET /next/:courseCode ───────────────────────────────────────────
  router.get('/next/:courseCode', async (req, res) => {
    const { courseCode } = req.params;

    // Get course info
    const { data: courseInfo } = await ctx.supabase
      .from('courses')
      .select('display_name, seed_count')
      .eq('course_code', courseCode)
      .single();

    if (!courseInfo) {
      return res.status(404).json({ error: `Course ${courseCode} not found` });
    }

    const targetSeedCount = courseInfo?.seed_count || 300;

    // Find next incomplete seed
    const { data: allSeeds } = await ctx.supabase
      .from('course_seeds')
      .select('seed_number, known_text, target_text, decomposed_at')
      .eq('course_code', courseCode)
      .lte('seed_number', targetSeedCount)
      .order('seed_number');

    const nextSeed = allSeeds?.find(s =>
      s.target_text && s.target_text.trim() !== '' && !s.decomposed_at
    );

    if (!nextSeed) {
      return res.json({
        done: true,
        message: `All ${targetSeedCount} seeds are complete!`,
        seeds_completed: allSeeds?.filter(s => s.decomposed_at).length || 0
      });
    }

    // Get all existing LEGOs for vocabulary display (with recency)
    const { data: allLegos } = await ctx.supabase
      .from('course_legos')
      .select('seed_number, lego_index, known_text, target_text, type, is_new')
      .eq('course_code', courseCode)
      .eq('is_new', true)
      .order('seed_number', { ascending: false })
      .order('lego_index', { ascending: false });

    // Format vocabulary with recency: group by seed, newest first, / separated
    const vocabBySeed = {};
    for (const l of (allLegos || [])) {
      if (!vocabBySeed[l.seed_number]) vocabBySeed[l.seed_number] = [];
      vocabBySeed[l.seed_number].push(`${l.known_text} \u2192 ${l.target_text}`);
    }
    const seedNums = Object.keys(vocabBySeed).map(Number).sort((a, b) => b - a);
    const vocabLines = seedNums.map(sn => {
      const items = vocabBySeed[sn].reverse(); // restore lego_index order within seed
      const marker = sn >= nextSeed.seed_number - 3 ? '\u2605' : ' ';
      return `${marker} ${items.join(' / ')}`;
    });

    // Fetch 3 example seeds: seed 1, seed 10, and N-1
    const prevSeedNum = nextSeed.seed_number - 1;
    const exampleNums = [1, 10, prevSeedNum].filter((n, i, a) => n > 0 && n < nextSeed.seed_number && a.indexOf(n) === i);
    const examples = [];
    for (const sn of exampleNums) {
      const ex = await fetchCompletedSeed(ctx, courseCode, sn);
      if (ex) examples.push(ex);
    }

    // Count completed seeds for progress
    const completedCount = allSeeds?.filter(s => s.decomposed_at).length || 0;

    res.json({
      seed: {
        number: nextSeed.seed_number,
        known: nextSeed.known_text,
        target: nextSeed.target_text
      },
      progress: `${completedCount}/${targetSeedCount} seeds done`,
      vocabulary: vocabLines,
      vocab_count: (allLegos || []).length,
      rules: {
        legos: 'Break seed into LEGOs. A-type = single word. M-type = multi-word chunk (MUST have components array). Use overlapping LEGOs when target language does something the learner can\'t infer from the known language (e.g. essayer d\'expliquer shows the d\' connector). LEGOs can overlap but must cover the full seed with no gaps.',
        build: '3-4 per LEGO. Short fragments. LEGO + prior vocabulary.',
        use: '8-12 per LEGO. Complete natural sentences a real person would say. Variety of vocab, patterns, LEGO position.',
        constraints: 'Every phrase MUST contain its LEGO. Phrases can ONLY use vocabulary listed above + current seed LEGOs. Never conjugate or inflect a LEGO \u2014 use exact forms only.'
      },
      examples: examples,
      template: {
        _note: 'Each LEGO follows this shape. See examples above for real data.',
        lego: {
          idx: '1, 2, 3...',
          type: 'A (single word) or M (multi-word, MUST have components)',
          known: 'English LEGO text',
          target: 'Target language LEGO text',
          components: [{ known: '...', target: '...' }],
          build: '3-4 fragments: LEGO + prior vocab. Fragments OK.',
          use: '8-12 complete sentences a real person would say.'
        }
      },
      submit: {
        method: 'POST',
        url: `http://localhost:3471/api/seed/complete`,
        content_type: 'application/json',
        body: {
          course_code: courseCode,
          seed_number: nextSeed.seed_number,
          known_text: nextSeed.known_text,
          target_text: nextSeed.target_text,
          legos: '[ ... your LEGOs here, same shape as template ... ]'
        }
      },
      next_action: `After submitting, call GET /api/next/${courseCode} for the next seed.`
    });
  });

  // ─── GET /seeds (canonical seeds) ────────────────────────────────────
  router.get('/seeds', async (req, res) => {
    const limit = parseInt(req.query.limit) || 668;
    const offset = parseInt(req.query.offset) || 0;

    const { data: seeds, error } = await ctx.supabase
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

  // ─── GET /seeds/:courseCode (course-specific seeds) ──────────────────
  router.get('/seeds/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const limit = parseInt(req.query.limit) || 300;
    const offset = parseInt(req.query.offset) || 0;

    const { data: seeds, error } = await ctx.supabase
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

  // ─── GET /vocab/:courseCode ──────────────────────────────────────────
  router.get('/vocab/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const seedNumber = parseInt(req.query.seed);
    const chinese = isChinese(courseCode);

    // If ?seed=N provided, use translation-based vocab (all seed translations up to N)
    // Otherwise fall back to live LEGO vocab only
    const vocabSet = seedNumber
      ? await loadTranslationVocab(ctx, courseCode, seedNumber)
      : await loadCourseVocab(ctx, courseCode);

    res.json({
      course_code: courseCode,
      mode: chinese ? 'character' : 'word',
      source: seedNumber ? 'translations' : 'legos',
      vocab_size: vocabSet.size,
      vocab: [...vocabSet].sort().join(chinese ? '' : ', ')
    });
  });

  // ─── GET /balance/:courseCode ────────────────────────────────────────
  router.get('/balance/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const seedNumber = parseInt(req.query.seed || '999');

    try {
      const balanceData = await calculateLegoBalanceScores(ctx.supabase, courseCode, seedNumber);

      res.json({
        course_code: courseCode,
        current_seed: seedNumber,
        avg_practice_score: balanceData.avgScore,
        thresholds: {
          underused: `< ${ctx.config.BALANCE_UNDERUSED_THRESHOLD}`,
          overused: `> ${ctx.config.BALANCE_OVERUSED_THRESHOLD}`
        },
        underused_legos: balanceData.underused,
        overused_legos: balanceData.overused,
        strikes: ctx.balanceViolations[courseCode] || 0,
        hint: 'Include underused LEGOs in your phrases to maintain balance'
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── PATCH /seed/:courseCode/:seedNumber ─────────────────────────────
  router.patch('/seed/:courseCode/:seedNumber', async (req, res) => {
    const { courseCode, seedNumber } = req.params;
    const { target_text, known_text } = req.body;
    const seedNum = parseInt(seedNumber);

    if (!target_text && !known_text) {
      return res.status(400).json({ error: 'target_text or known_text is required' });
    }

    const updateFields = { status: 'released' };
    if (target_text) updateFields.target_text = target_text;
    if (known_text) updateFields.known_text = known_text;

    // This is the proofreading surface the identity ruling came from, so the
    // event carries the before/after text as well as the seed it belongs to.
    const { data: before } = await ctx.supabase
      .from('course_seeds')
      .select('known_text, target_text')
      .eq('course_code', courseCode)
      .eq('seed_number', seedNum)
      .maybeSingle();

    let eventId = null;
    try {
      if (req.contentEdit) {
        eventId = await req.contentEdit.record({
          scope: { seed_numbers: [seedNum] },
          detail: {
            before: { known_text: before?.known_text, target_text: before?.target_text },
            after: { known_text: known_text || before?.known_text, target_text: target_text || before?.target_text },
          },
        });
      }
    } catch (err) {
      return res.status(500).json({ error: `Could not record who made this edit: ${err.message}` });
    }

    const { error } = await ctx.supabase
      .from('course_seeds')
      .update({ ...updateFields, last_edit_event_id: eventId })
      .eq('course_code', courseCode)
      .eq('seed_number', seedNum);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Record activity for stall detection (Pass 1 translations count as progress)
    recordActivity(ctx, courseCode, seedNum);

    console.log(`\u2713 S${String(seedNum).padStart(4, '0')} translation: ${target_text || known_text}`);
    res.json({ ok: true, seed: seedNum, target_text, known_text });
  });

  // ─── DELETE /course/:courseCode ──────────────────────────────────────
  router.delete('/course/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { confirm } = req.query;

    if (confirm !== 'yes') {
      return res.status(400).json({ ok: false, error: 'Add ?confirm=yes to confirm deletion' });
    }

    try {
      // Nothing survives a course delete to carry a stamp, so the event recorded
      // here is the only record that this course ever existed and who removed it.
      if (req.contentEdit) await req.contentEdit.record({ scope: { course_code: courseCode } });

      const results = {};
      const tables = [
        'course_qa_flags',
        'build_jobs',
        'course_practice_phrases',
        'course_legos',
        'course_seed_drafts',
        'course_seeds',
        'course_audio',
        'course_gender_expansions',
        'course_export_states'
      ];

      for (const table of tables) {
        let totalDeleted = 0;
        let batch;
        do {
          const { count, error } = await ctx.supabase
            .from(table)
            .delete({ count: 'exact' })
            .eq('course_code', courseCode)
            .limit(3000);
          batch = count || 0;
          totalDeleted += batch;
          if (error) {
            console.warn(`[DELETE-COURSE] ${table}: ${error.message}`);
            break;
          }
          if (batch > 0) console.log(`[DELETE-COURSE] ${table}: deleted batch of ${batch}`);
        } while (batch >= 3000);
        results[table] = totalDeleted;
        console.log(`[DELETE-COURSE] ${table}: ${totalDeleted} total deleted`);
      }

      // Finally delete the course itself
      const { error: courseErr } = await ctx.supabase
        .from('courses')
        .delete()
        .eq('course_code', courseCode);

      if (courseErr) {
        return res.status(500).json({ ok: false, error: `Course row delete failed: ${courseErr.message}`, results });
      }

      // Clear caches
      ctx.courseVocabCache.delete(courseCode);
      ctx.activeBuilds.delete(courseCode);

      console.log(`[DELETE-COURSE] ${courseCode} completely deleted`);
      res.json({ ok: true, course_code: courseCode, deleted: results });
    } catch (err) {
      console.error('[DELETE-COURSE] Error:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ─── POST /course/:courseCode/wipe ──────────────────────────────────
  // Wipe all content but keep the course shell (code, name, languages).
  // Re-creates 668 empty seed rows with only the English side filled in.
  // Query params: ?confirm=yes (required), ?keep_audio=true (optional)
  router.post('/course/:courseCode/wipe', async (req, res) => {
    const { courseCode } = req.params;
    const { confirm, keep_audio } = req.query;

    if (confirm !== 'yes') {
      return res.status(400).json({ ok: false, error: 'Add ?confirm=yes to confirm wipe' });
    }

    try {
      // Verify course exists
      const { data: course, error: courseErr } = await ctx.supabase
        .from('courses')
        .select('course_code, display_name, known_lang, target_lang')
        .eq('course_code', courseCode)
        .single();

      if (courseErr || !course) {
        return res.status(404).json({ ok: false, error: `Course "${courseCode}" not found` });
      }

      // Recorded before the first delete; the re-created seed shells below carry
      // the same event id, so the wipe and its replacement read as one action.
      const wipeEventId = req.contentEdit
        ? await req.contentEdit.record({ scope: { course_code: courseCode } })
        : null;

      const results = {};
      const tables = [
        'course_qa_flags',
        'build_jobs',
        'course_seed_drafts',
        'course_export_states',
      ];
      if (keep_audio !== 'true') tables.push('course_audio');

      // Delete side tables
      for (const table of tables) {
        let totalDeleted = 0;
        let batch;
        do {
          const { count, error } = await ctx.supabase
            .from(table)
            .delete({ count: 'exact' })
            .eq('course_code', courseCode)
            .limit(3000);
          batch = count || 0;
          totalDeleted += batch;
          if (error) {
            console.warn(`[WIPE] ${table}: ${error.message}`);
            break;
          }
        } while (batch >= 3000);
        results[table] = totalDeleted;
      }

      // Delete seeds (cascades to legos + phrases)
      let seedsDeleted = 0;
      let batch;
      do {
        const { count, error } = await ctx.supabase
          .from('course_seeds')
          .delete({ count: 'exact' })
          .eq('course_code', courseCode)
          .limit(3000);
        batch = count || 0;
        seedsDeleted += batch;
        if (error) {
          console.warn(`[WIPE] course_seeds: ${error.message}`);
          break;
        }
      } while (batch >= 3000);
      results.course_seeds = seedsDeleted;

      // Clear calibration metadata
      await ctx.supabase
        .from('courses')
        .update({ quality_rules: null, translation_analysis: null })
        .eq('course_code', courseCode);

      // Clear caches
      ctx.courseVocabCache.delete(courseCode);
      ctx.activeBuilds.delete(courseCode);

      // Re-create 668 seed shells with only English side filled in
      const parts = courseCode.split('_for_');
      const targetLang = parts[0] || '';
      const knownLang = parts[1] || '';

      const { data: canonical, error: canonicalErr } = await ctx.supabase
        .from('canonical_seeds')
        .select('seed_number, source_text')
        .order('seed_number');

      let seedsCreated = 0;
      if (canonical && canonical.length > 0 && !canonicalErr) {
        const targetLangName = getLanguageName(courseCode);

        const seedRows = canonical.map(c => {
          const engText = c.source_text.replace(/\{target\}/g, targetLangName);
          return {
            course_code: courseCode,
            seed_number: c.seed_number,
            known_text: knownLang === 'eng' ? engText : '',
            target_text: targetLang === 'eng' ? engText : '',
            last_edit_event_id: wipeEventId,
          };
        });

        const { error: insertErr } = await ctx.supabase
          .from('course_seeds')
          .insert(seedRows);

        if (insertErr) {
          console.error('[WIPE] Failed to re-create seeds:', insertErr.message);
        } else {
          seedsCreated = seedRows.length;
        }
      }

      console.log(`[WIPE] ${courseCode}: wiped content, re-created ${seedsCreated} empty seeds`);
      res.json({
        ok: true,
        course_code: courseCode,
        deleted: results,
        seeds_created: seedsCreated,
        audio_kept: keep_audio === 'true',
      });
    } catch (err) {
      console.error('[WIPE] Error:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ─── GET /phrases/:courseCode ────────────────────────────────────────
  // GET /legos/:courseCode?seed=N — LEGO rows for a specific seed (any status)
  router.get('/legos/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const seedNumber = parseInt(req.query.seed);
      if (!seedNumber) return res.status(400).json({ error: 'seed param required' });

      const { data, error } = await ctx.supabase
        .from('course_legos')
        .select('lego_index, lego_id, type, known_text, target_text, components, seed_number')
        .eq('course_code', courseCode)
        .eq('seed_number', seedNumber)
        .order('lego_index');

      if (error) throw error;
      res.json({ course_code: courseCode, seed_number: seedNumber, legos: data || [] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/phrases/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const limit = Math.min(parseInt(req.query.limit) || 100, 500);
      const offset = parseInt(req.query.offset) || 0;
      const seedMin = parseInt(req.query.seed_min) || null;
      const seedMax = parseInt(req.query.seed_max) || null;
      const role = req.query.role || null;  // 'build', 'use', 'practice', 'component'

      let query = ctx.supabase
        .from('course_practice_phrases')
        .select('id, lego_index, known_text, target_text, phrase_role, seed_number, created_at, qa_checked')
        .eq('course_code', courseCode)
        .order('seed_number', { ascending: true })
        .order('lego_index', { ascending: true });

      if (seedMin) query = query.gte('seed_number', seedMin);
      if (seedMax) query = query.lte('seed_number', seedMax);
      if (role) query = query.eq('phrase_role', role);

      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;
      if (error) throw error;

      res.json({
        course_code: courseCode,
        count: data.length,
        offset,
        limit,
        phrases: data
      });
    } catch (err) {
      console.error('[QA] Error getting phrases:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ===========================================================================
  // GET /course/:courseCode/learnings — Fetch agent learnings
  // ===========================================================================
  router.get('/course/:courseCode/learnings', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const { data, error } = await ctx.supabase
        .from('courses')
        .select('quality_rules')
        .eq('course_code', courseCode)
        .single();

      if (error) throw error;

      const learnings = data?.quality_rules?.agent_learnings || [];
      res.json({ course_code: courseCode, learnings });
    } catch (err) {
      console.error('[LEARNINGS] Error fetching learnings:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ===========================================================================
  // POST /course/:courseCode/learnings — Append an agent learning
  // ===========================================================================
  router.post('/course/:courseCode/learnings', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const { learning } = req.body;

      if (!learning || typeof learning !== 'string') {
        return res.status(400).json({ error: 'learning (string) is required' });
      }

      // Fetch current quality_rules
      const { data: course, error: fetchError } = await ctx.supabase
        .from('courses')
        .select('quality_rules')
        .eq('course_code', courseCode)
        .single();

      if (fetchError) throw fetchError;

      const qualityRules = course?.quality_rules || {};
      const learnings = qualityRules.agent_learnings || [];
      learnings.push({ learning, created_at: new Date().toISOString() });
      qualityRules.agent_learnings = learnings;

      const { error: updateError } = await ctx.supabase
        .from('courses')
        .update({ quality_rules: qualityRules })
        .eq('course_code', courseCode);

      if (updateError) throw updateError;

      res.json({ ok: true, count: learnings.length });
    } catch (err) {
      console.error('[LEARNINGS] Error appending learning:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
