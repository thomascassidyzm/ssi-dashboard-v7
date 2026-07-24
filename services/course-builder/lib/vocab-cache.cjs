/**
 * Vocabulary cache — LRU cache for course vocabulary.
 * Stateful: operates on ctx.courseVocabCache.
 */

const { isChinese } = require('./language-config.cjs');
const { extractVocab } = require('./text-normalization.cjs');

/**
 * Get cache entry, updating access time. Returns null if expired or missing.
 */
function getCacheEntry(ctx, courseCode) {
  const entry = ctx.courseVocabCache.get(courseCode);
  if (!entry) return null;

  if (Date.now() - entry.lastAccess > ctx.CACHE_TTL_MS) {
    ctx.courseVocabCache.delete(courseCode);
    return null;
  }

  // LRU touch: move to end of Map
  entry.lastAccess = Date.now();
  ctx.courseVocabCache.delete(courseCode);
  ctx.courseVocabCache.set(courseCode, entry);

  return entry.vocab;
}

/**
 * Set cache entry, evicting oldest if at capacity.
 */
function setCacheEntry(ctx, courseCode, vocabSet) {
  if (ctx.courseVocabCache.has(courseCode)) {
    ctx.courseVocabCache.delete(courseCode);
  }

  while (ctx.courseVocabCache.size >= ctx.MAX_CACHE_SIZE) {
    const oldestKey = ctx.courseVocabCache.keys().next().value;
    ctx.courseVocabCache.delete(oldestKey);
  }

  ctx.courseVocabCache.set(courseCode, {
    vocab: vocabSet,
    lastAccess: Date.now(),
  });
}

/**
 * Load existing vocabulary for a course from database.
 */
async function loadCourseVocab(ctx, courseCode) {
  const cached = getCacheEntry(ctx, courseCode);
  if (cached) return cached;

  const chinese = isChinese(courseCode);
  const vocabSet = new Set();

  const { data: legos } = await ctx.supabase
    .from('course_legos')
    .select('target_text, type, components')
    .eq('course_code', courseCode)
    .order('seed_number')
    .order('lego_index');

  for (const lego of legos || []) {
    extractVocab(lego.target_text, chinese).forEach(v => vocabSet.add(v));
    if (lego.type === 'M' && lego.components) {
      for (const comp of lego.components) {
        extractVocab(comp.target, chinese).forEach(v => vocabSet.add(v));
      }
    }
  }

  setCacheEntry(ctx, courseCode, vocabSet);
  return vocabSet;
}

/**
 * Add new vocab to course cache (called after successful LEGO insert).
 */
function addToCourseVocab(ctx, courseCode, lego) {
  const chinese = isChinese(courseCode);

  let vocabSet = getCacheEntry(ctx, courseCode);
  if (!vocabSet) vocabSet = new Set();

  extractVocab(lego.target, chinese).forEach(v => vocabSet.add(v));
  if (lego.type === 'M' && lego.components) {
    for (const comp of lego.components) {
      extractVocab(comp.target, chinese).forEach(v => vocabSet.add(v));
    }
  }

  setCacheEntry(ctx, courseCode, vocabSet);
}

/**
 * Load vocabulary from seed translations (for parallel draft validation).
 * Derives vocab from target_text of all prior seeds + existing LEGOs.
 */
async function loadTranslationVocab(ctx, courseCode, upToSeedNumber) {
  const chinese = isChinese(courseCode);
  const vocabSet = new Set();

  const { data: seeds } = await ctx.supabase
    .from('course_seeds')
    .select('target_text')
    .eq('course_code', courseCode)
    .lt('seed_number', upToSeedNumber)
    .not('target_text', 'is', null);

  for (const seed of seeds || []) {
    extractVocab(seed.target_text, chinese).forEach(v => vocabSet.add(v));
  }

  const { data: legos } = await ctx.supabase
    .from('course_legos')
    .select('target_text, type, components')
    .eq('course_code', courseCode)
    .lt('seed_number', upToSeedNumber)
    .order('seed_number')
    .order('lego_index');

  for (const lego of legos || []) {
    extractVocab(lego.target_text, chinese).forEach(v => vocabSet.add(v));
    if (lego.type === 'M' && lego.components) {
      for (const comp of lego.components) {
        extractVocab(comp.target, chinese).forEach(v => vocabSet.add(v));
      }
    }
  }

  return vocabSet;
}

/**
 * Load the introduced-LEGO list (known → target pairs, introduction order)
 * for server-side vocab injection. Paginated — course_legos can exceed the
 * supabase 1000-row default.
 */
async function loadIntroducedLegoPairs(ctx, courseCode, upToSeedNumber) {
  const pairs = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await ctx.supabase
      .from('course_legos')
      .select('seed_number, lego_index, known_text, target_text')
      .eq('course_code', courseCode)
      .lte('seed_number', upToSeedNumber)
      .order('seed_number')
      .order('lego_index')
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    pairs.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return pairs.map(l => ({ seed: l.seed_number, idx: l.lego_index, known: l.known_text, target: l.target_text }));
}

/**
 * Server-side vocab injection block for /seed/complete round-trips
 * (template-stamp fix 2026-07-24): the builder can never be without its
 * prior-LEGO vocab list regardless of context compaction. Full list when
 * small; recent window + even sample of the earlier estate when large.
 */
function buildVocabInjection(pairs) {
  const fmt = p => `${p.known} → ${p.target}`;
  let legos;
  let coverage = 'complete';
  if (pairs.length <= 300) {
    legos = pairs.map(fmt);
  } else {
    coverage = 'recent-200-plus-sampled-100';
    const recent = pairs.slice(-200);
    const earlier = pairs.slice(0, -200);
    const step = earlier.length / 100;
    const sampled = [];
    for (let i = 0; i < 100; i++) sampled.push(earlier[Math.floor(i * step)]);
    legos = [...sampled.map(fmt), ...recent.map(fmt)];
  }
  return {
    note: 'SERVER-INJECTED introduced-LEGO vocabulary (introduction order). This survives your context compaction — recombine BUILD phrases from THIS list. Never pad with filler tags (", yes/here/again"): the anti-template gate rejects them.',
    total_legos: pairs.length,
    coverage,
    legos,
  };
}

/**
 * Invalidate cache for a course (e.g., after rebuild).
 */
function invalidateVocabCache(ctx, courseCode) {
  ctx.courseVocabCache.delete(courseCode);
}

module.exports = {
  getCacheEntry,
  setCacheEntry,
  loadCourseVocab,
  addToCourseVocab,
  loadTranslationVocab,
  loadIntroducedLegoPairs,
  buildVocabInjection,
  invalidateVocabCache,
};
