/**
 * Shared utilities for brief generation.
 * Extracted from course-builder-api.cjs — these are used by multiple brief modules.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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
  'eng': 'English', 'eus': 'Basque'
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
      if (goldenCount < 1) continue; // skip courses with no golden seeds configured

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

/**
 * Build the grammar checklist section for briefs.
 * Universal principles only — language-specific rules come from quality_rules.grammar_rules.
 */
function buildGrammarChecklist(langName, grammarRules) {
  let section = `## Grammar Error Checklist — Check EVERY Phrase

These patterns cause the most common errors in course builds. Apply your expert knowledge of ${langName} grammar to check every phrase.

### Verb Grammar (Most Common Error Category)
1. **Modal verb + infinitive construction**: Know whether ${langName} modals take a bare infinitive or require a linking particle. Get this right for EVERY modal verb phrase.
2. **Non-modal verbs + infinitive**: Verbs like "try", "begin", "hope", "learn" often have DIFFERENT infinitive constructions from modals. Don't confuse them.
3. **Subject-verb agreement**: Every verb must agree with its subject in person, number, and (where applicable) gender. Third person ≠ first person.
4. **Question inversion**: When subject and verb invert for questions, check whether verb endings change (many languages drop endings in 2nd-person inversion).
5. **Separable/compound verbs**: If ${langName} has separable verbs or verb particles, check they split correctly in main clauses and stay together in subclauses.
6. **Tense consistency**: If context is past tense, all verbs in the phrase should be past. Don't mix tenses.

### Pronouns & Agreement
7. **Reflexive pronouns must match subject**: If the subject is "I", the reflexive must be the first-person form. Never mix persons.
8. **Pronoun ambiguity**: Where a pronoun can mean multiple things (e.g., singular vs plural), ensure the verb form disambiguates correctly.
9. **Formal vs informal**: Stick to the register specified in the translation doctrine. Don't mix formal/informal pronouns.

### Word Order
10. **Subclause word order**: Many languages change verb position in subordinate clauses (after "because", "that", "if", "when"). Check every subclause.
11. **Adverb/adverbial placement**: Check that adverbs are in the correct position for ${langName}, not in English position.
12. **Adjective position**: Pre-nominal vs post-nominal — use ${langName} rules, not English.

### Morphology & Agreement
13. **Adjective agreement**: Check gender, number, and case agreement between adjectives and their nouns.
14. **Article/determiner agreement**: Check that articles match their noun's gender/class.
15. **Capitalisation rules**: Apply ${langName} capitalisation conventions (language names, nationalities, days of week, etc.).
16. **Preposition + pronoun contractions**: Many languages have mandatory contractions or special forms (pronominal adverbs, prepositional pronouns, etc.). Use the correct form.
`;

  if (grammarRules) {
    section += `\n### ${langName}-Specific Rules (from course QA)\n\n${grammarRules}\n`;
  }

  return section;
}

// --- In-memory caches ---

let _methodologyFull = null;
let _methodologyCondensed = null;

/**
 * Load ralph-methodology.md once, cache in memory.
 * Returns full methodology text for embedding in briefs.
 */
function loadMethodology() {
  if (!_methodologyFull) {
    const filePath = path.resolve(__dirname, '../../ralph-methodology.md');
    _methodologyFull = fs.readFileSync(filePath, 'utf8');
  }
  return _methodologyFull;
}

/**
 * Load condensed methodology for checker briefs.
 * Keeps: BUILD/USE rules, LEGO form, ZUT, scoring, vocab constraints, checklist.
 * Drops: decomposition strategy, ordering, multi-language examples, audio doctrine, workflow, QA checkpoints.
 */
function loadCondensedMethodology() {
  if (!_methodologyCondensed) {
    const full = loadMethodology();
    const lines = full.split('\n');
    const sections = [];
    let currentSection = { header: '', lines: [] };

    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (currentSection.header) sections.push(currentSection);
        currentSection = { header: line, lines: [line] };
      } else {
        currentSection.lines.push(line);
      }
    }
    if (currentSection.header) sections.push(currentSection);

    // Keep sections relevant to grammar checking
    const keepHeaders = [
      'Phrase Roles: BUILD vs USE',
      'USE Phrase Scoring',
      'Complete LEGO Submission Format',
      'ZUT (Zero Uncertainty Test)',
      'Vocabulary Constraints',
      'Checklist Before Submitting',
      'Early Seeds',
      'Remember',
      'Lessons Learned'
    ];

    // Also keep LEGO Types from the full doc
    const keepSections = sections.filter(s => {
      const headerText = s.header.replace(/^#+\s*/, '');
      return keepHeaders.some(k => headerText.startsWith(k));
    });

    // Prepend core LEGO types section
    const legoTypesSection = sections.find(s => s.header.includes('LEGO Types'));
    if (legoTypesSection) keepSections.unshift(legoTypesSection);

    _methodologyCondensed = '# SSi Methodology (Condensed for Checker)\n\n' +
      keepSections.map(s => s.lines.join('\n')).join('\n\n');
  }
  return _methodologyCondensed;
}

// Cache for golden seed examples and cross-course summaries
const _goldenCache = new Map();
const _crossCourseCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCached(cache, key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) return entry.value;
  return null;
}

function setCache(cache, key, value) {
  cache.set(key, { value, ts: Date.now() });
}

// Wrap fetchGoldenSeedExamples with cache
const _originalFetchGoldenSeedExamples = fetchGoldenSeedExamples;
async function fetchGoldenSeedExamplesCached(courseCode, seedNumbers = [2, 5, 8]) {
  const key = `${courseCode}:${seedNumbers.join(',')}`;
  const cached = getCached(_goldenCache, key);
  if (cached) return cached;
  const result = await _originalFetchGoldenSeedExamples(courseCode, seedNumbers);
  setCache(_goldenCache, key, result);
  return result;
}

// Wrap buildCrossCourseSummaries with cache
const _originalBuildCrossCourseSummaries = buildCrossCourseSummaries;
async function buildCrossCourseSummariesCached(maxSeed = 5) {
  const key = `${maxSeed}`;
  const cached = getCached(_crossCourseCache, key);
  if (cached) return cached;
  const result = await _originalBuildCrossCourseSummaries(maxSeed);
  setCache(_crossCourseCache, key, result);
  return result;
}

module.exports = {
  getSupabase,
  setSupabase,
  getLanguageName,
  getKnownLanguageName,
  getGoldenSeedCount,
  fetchGoldenSeedExamples: fetchGoldenSeedExamplesCached,
  formatDecompositionPatterns,
  formatGoldenPhraseExamples,
  formatBatchAssignments,
  buildCrossCourseSummaries: buildCrossCourseSummariesCached,
  classifySeedPattern,
  buildGrammarChecklist,
  loadMethodology,
  loadCondensedMethodology,
  LANG_MAP
};
