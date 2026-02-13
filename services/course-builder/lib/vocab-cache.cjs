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
  invalidateVocabCache,
};
