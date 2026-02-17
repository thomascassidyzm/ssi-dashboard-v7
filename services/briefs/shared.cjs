/**
 * Shared utilities for brief generation.
 * Extracted from course-builder-api.cjs — these are used by multiple brief modules.
 */

const { createClient } = require('@supabase/supabase-js');

// Lazy-init Supabase client (same instance as course-builder-api)
let _supabase;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  }
  return _supabase;
}

/**
 * Allow injection of an existing supabase client (used when mounting from course-builder-api).
 */
function setSupabase(client) {
  _supabase = client;
}

// Language name lookup
const LANG_MAP = {
  'zho': 'Chinese', 'ita': 'Italian', 'spa': 'Spanish', 'fra': 'French',
  'deu': 'German', 'por': 'Portuguese', 'jpn': 'Japanese', 'kor': 'Korean',
  'ara': 'Arabic', 'rus': 'Russian', 'cym': 'Welsh', 'nld': 'Dutch',
  'eng': 'English'
};

function getLanguageName(courseCode) {
  const targetLang = courseCode.split('_')[0];
  return LANG_MAP[targetLang] || targetLang;
}

function getKnownLanguageName(courseCode) {
  const knownLang = courseCode.split('_for_')[1] || 'eng';
  return LANG_MAP[knownLang] || knownLang;
}

function getGoldenSeedCount(courseInfo) {
  return courseInfo?.quality_rules?.golden_seed_count || 10;
}

/**
 * Fetch golden seed examples with full LEGO + phrase data.
 * Returns structured objects suitable for embedding in briefs.
 */
async function fetchGoldenSeedExamples(courseCode, seedNumbers = [2, 5, 8]) {
  const supabase = getSupabase();
  const examples = [];
  for (const seedNum of seedNumbers) {
    const { data: seed } = await supabase
      .from('course_seeds')
      .select('seed_number, known_text, target_text')
      .eq('course_code', courseCode)
      .eq('seed_number', seedNum)
      .single();
    if (!seed) continue;

    const { data: legos } = await supabase
      .from('course_legos')
      .select('lego_index, type, known_text, target_text, components')
      .eq('course_code', courseCode)
      .eq('seed_number', seedNum)
      .order('lego_index');

    const { data: phrases } = await supabase
      .from('course_practice_phrases')
      .select('lego_index, known_text, target_text, phrase_role, metadata')
      .eq('course_code', courseCode)
      .eq('seed_number', seedNum)
      .order('lego_index')
      .order('position');

    if (!legos || legos.length === 0) continue;

    const legoArray = legos.map(lego => {
      const legoPhrases = (phrases || []).filter(p => p.lego_index === lego.lego_index);
      const buildPhrases = legoPhrases
        .filter(p => p.phrase_role === 'build' || p.phrase_role === 'practice')
        .map(p => ({ known: p.known_text, target: p.target_text }));
      const usePhrases = legoPhrases
        .filter(p => p.phrase_role === 'use')
        .map(p => ({ known: p.known_text, target: p.target_text, score: p.metadata?.score || 7 }));

      const entry = {
        idx: lego.lego_index,
        type: lego.type,
        known: lego.known_text,
        target: lego.target_text,
        build: buildPhrases,
        use: usePhrases
      };
      if (lego.components && lego.components.length > 0) {
        entry.components = lego.components;
      }
      return entry;
    });

    examples.push({
      course_code: courseCode,
      seed_number: seedNum,
      known_text: seed.known_text,
      target_text: seed.target_text,
      legos: legoArray
    });
  }
  return examples;
}

// Preposition list for pattern classification
const PREPOSITIONS = ['à', 'de', 'du', 'des', 'en', 'au', 'aux', 'avec', 'pour', 'dans', 'sur', 'von', 'mit', 'zu', 'für', 'auf', 'の', 'に', 'で', 'を', 'と', 'com', 'em', 'por', 'para', 'con', 'di', 'da', 'del'];

function classifySeedPattern(seed) {
  if (!seed.legos || seed.legos.length === 0) return 'unknown';
  const mLegos = seed.legos.filter(l => l.type === 'M');
  const aLegos = seed.legos.filter(l => l.type === 'A');
  const hasOverlap = seed.legos.some(l =>
    seed.legos.some(other => other.target !== l.target && other.target.includes(l.target))
  );
  const hasWrappedPrep = mLegos.some(m => {
    const words = m.target.split(/[\s']/);
    return words.length >= 3 && words.slice(1, -1).some(w => PREPOSITIONS.includes(w));
  });
  if (hasOverlap) return 'overlapping';
  if (hasWrappedPrep) return 'preposition_wrapping';
  if (mLegos.length === 0) return 'simple_tiling';
  if (aLegos.length > 0 && mLegos.length > 0) return 'mixed';
  return 'all_bundled';
}

/**
 * Format golden seed decompositions as compact pattern examples.
 * Shows LEGO choices (not phrases) — that's where agents need guidance.
 */
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
      all_bundled: 'All bundled — every piece needs context'
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

/**
 * Format golden seed examples as phrase examples (for phrase generation briefs).
 * Shows BUILD + USE phrases from real golden seeds.
 */
function formatGoldenPhraseExamples(goldenSeeds) {
  if (!goldenSeeds || goldenSeeds.length === 0) return '(No golden examples available yet)';

  const lines = [];
  for (const seed of goldenSeeds.slice(0, 3)) {
    const legoExample = seed.legos?.[0];
    if (!legoExample) continue;
    lines.push(`Seed ${seed.seed_number}, "${seed.target_text}":`);
    lines.push(`  LEGO: "${legoExample.known}" → "${legoExample.target}"`);
    if (legoExample.build && legoExample.build.length > 0) {
      lines.push(`  BUILD: ${legoExample.build.slice(0, 2).map(p => `"${p.known}" → "${p.target}"`).join(', ')}`);
    }
    if (legoExample.use && legoExample.use.length > 0) {
      lines.push(`  USE: ${legoExample.use.slice(0, 3).map(p => `"${p.known}" → "${p.target}" (score: ${p.score || 7})`).join(', ')}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * Split work items into batches for parallel sub-agent execution.
 * Returns array of { index, items } objects.
 */
function formatBatchAssignments(items, batchSize = 10) {
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push({
      index: batches.length + 1,
      items: items.slice(i, i + batchSize)
    });
  }
  return batches;
}

/**
 * Build cross-course summaries for seeds 1-N (compact format for briefs).
 */
async function buildCrossCourseSummaries(maxSeed = 5) {
  const supabase = getSupabase();
  const lines = [];
  for (let n = 1; n <= maxSeed; n++) {
    const { data: courses } = await supabase
      .from('courses')
      .select('course_code, display_name, quality_rules')
      .not('quality_rules', 'is', null);

    if (!courses || courses.length === 0) continue;

    const comparisons = [];
    for (const course of courses) {
      const goldenCount = course.quality_rules?.golden_seed_count || 10;
      if (goldenCount < 50) continue;

      const golden = course.quality_rules?.golden_decompositions || [];
      const seed = golden.find(g => g.seed_number === n);
      if (!seed) continue;

      const legoSummary = (seed.legos || []).map(l => {
        const label = l.type === 'M' ? 'M' : 'A';
        return `${label}: "${l.known}" → "${l.target}"`;
      });

      comparisons.push({
        course: course.course_code,
        name: course.display_name,
        known: seed.known_text,
        target: seed.target_text,
        legos: legoSummary,
        insight: seed.key_insight || ''
      });
    }

    if (comparisons.length === 0) continue;

    lines.push(`### Seed ${n}: "${comparisons[0].known}"`);
    for (const c of comparisons) {
      lines.push(`**${c.course}** (${c.name}): ${c.target}`);
      lines.push(`  LEGOs: ${c.legos.join(' | ')}`);
      if (c.insight) lines.push(`  Insight: ${c.insight}`);
    }
    lines.push('');
  }

  return lines.length > 0 ? lines.join('\n') : null;
}

module.exports = {
  getSupabase,
  setSupabase,
  getLanguageName,
  getKnownLanguageName,
  getGoldenSeedCount,
  fetchGoldenSeedExamples,
  formatDecompositionPatterns,
  formatGoldenPhraseExamples,
  formatBatchAssignments,
  buildCrossCourseSummaries,
  classifySeedPattern,
  LANG_MAP
};
