/**
 * CAST LANGUAGE KEY — the entity a voice is cast against.
 *
 * Tom's ruling, 2026-08-31, stated as a DEFINITION rather than a preference:
 *
 *     dialects are different LANGUAGES in this product — different text and
 *     different voices. Mexican Spanish is not a variant of spa, it is its own
 *     language entity with its own script text and its own cast voice; same for
 *     Austrian and Swiss German.
 *
 * So a cast made on `spa` reaching spa_mx_for_eng, or a cast on `deu` reaching
 * deu_at_for_eng, is a DEFECT. It is not a deferred feature and there is no
 * "inherit from the parent language" leg: a parent code and a dialect are two
 * languages that happen to share three letters.
 *
 * ── WHAT WAS WRONG BEFORE ───────────────────────────────────────────────────
 * services/shared/language-voice-cast.cjs read `courses.target_lang`, and
 * target_lang carries the BASE tag for every regional course on the estate —
 * deu_at_for_eng is target_lang 'deu', spa_mx_for_eng is 'spa', cym_n_for_eng
 * is 'cym'. One cast row therefore covered a language and all of its dialects
 * at once, with no way to say anything different about them.
 *
 * ── WHERE THE ANSWER COMES FROM, AND WHY NOT FROM THE COURSE CODE ───────────
 * Two columns already state a course's regional identity, and they are
 * complementary — each covers what the other misses:
 *
 *   1. `courses.voice_pool_key` — the explicit human ruling, added 2026-08-17
 *      (T-21) for exactly this problem on the POD casting path, where
 *      tools/pod-sync.cjs has read it ever since. 'deu_at', 'ara_eg',
 *      'ara_sy', 'spa_mx', 'por_br', 'fra_ca'.
 *   2. `courses.dialect` — "dialect lives on the COURSE, not on the casting"
 *      (Tom, 2026-08-19, services/shared/dialect.cjs). 'north', 'south',
 *      'connemara', 'munster', 'ulster'; everything else is 'standard'.
 *
 * The COURSE CODE is deliberately NOT read. The estate's standing lesson from
 * spa_mx_for_eng is "read the column, never the course code" (pod-sync.cjs),
 * and a code segment is not a dialect statement: `cym_anthem_for_jpn` and
 * `zzz_test2_for_eng` would both become their own castable languages, and
 * `cym_nnew_for_eng` would split from `cym_n_for_eng` although both are stated
 * to be the SAME Northern Welsh. A course whose regional identity is in neither
 * column is reported as a GAP — one column write fixes it, visibly — rather
 * than inferred from a string.
 *
 * ── THE TWO SPELLINGS, WHICH ARE ONE KEY EACH ───────────────────────────────
 * A pool key is spelled as the human wrote it ('deu_at'); a dialect key is
 * spelled '<base>_<dialect>' ('cym_north'). No course carries both a pool key
 * and a non-standard dialect, so every entity has exactly ONE key — which is
 * the property that matters. Two keys for one entity would be the same class of
 * bug as one key for two.
 *
 * ── THE KNOWN SIDE ──────────────────────────────────────────────────────────
 * Keyed on `known_lang`, unchanged. Nothing in the data states a known-side
 * dialect: `courses.dialect` describes the course's TARGET content and no known
 * language on the estate has a regional variant in play. Inventing a key here
 * would be inventing an entity.
 */

'use strict';

const { canonicalDialect, DEFAULT_DIALECT } = require('./dialect.cjs');

/**
 * The columns a cast key is computed from. Every SELECT that will feed a course
 * row to this module must ask for these, or the key silently degrades to the
 * base language — which is the very defect this module exists to remove.
 */
const COURSE_CAST_FIELDS = 'course_code, known_lang, target_lang, voice_pool_key, dialect';

/**
 * The shape of a pool key, borrowed verbatim from tools/pod-sync.cjs so the two
 * casting paths cannot disagree about what a pool key is. Deliberately narrow:
 * the column is an explicit human ruling, so anything that is not obviously a
 * pool key is a typo, and a typo must not become a language.
 */
const POOL_KEY_RE = /^[a-z]{2,3}(_[a-z0-9]{2,4})?$/;

function lower(value) {
  return String(value == null ? '' : value).trim().toLowerCase();
}

/**
 * The cast key for the language a course TEACHES.
 *
 * @param {object} course a row carrying COURSE_CAST_FIELDS
 * @returns {string|null} 'deu_at', 'cym_north', 'spa' — or null for a course
 *   with no target language at all.
 */
function targetCastKey(course) {
  if (!course) return null;
  const base = lower(course.target_lang);

  // 1. The explicit ruling wins, exactly as it does for pods.
  const pool = lower(course.voice_pool_key);
  if (pool && POOL_KEY_RE.test(pool)) return pool;

  // 2. A stated non-standard dialect is its own language.
  const dialect = canonicalDialect(course.dialect);
  if (base && dialect !== DEFAULT_DIALECT) return `${base}_${dialect}`;

  // 3. Nothing stated: the language is itself.
  return base || null;
}

/** The cast key for the language a course is TAUGHT IN. See the header. */
function knownCastKey(course) {
  if (!course) return null;
  return lower(course.known_lang) || null;
}

/**
 * The cast key for one side of a course.
 * @param {object} course
 * @param {'target'|'known'} side
 */
function castKeyForCourse(course, side) {
  return side === 'known' ? knownCastKey(course) : targetCastKey(course);
}

/**
 * The BASE language a cast key belongs to.
 *
 * A dialect is its own language for CASTING — who speaks it — and still the
 * same language for everything a provider knows about: which voices declare it,
 * whether Cartesia covers it, whether it is human-voiced. Those questions are
 * asked of the base, and asking them of 'deu_at' would answer "no voices, no
 * coverage" about a language with plenty of both.
 *
 * Base tags are three letters and never contain an underscore, so the first
 * segment is the base — the same rule tools/pod-sync.cjs uses.
 */
function baseLanguageOfCastKey(key) {
  const k = lower(key);
  if (!k) return null;
  const cut = k.indexOf('_');
  return cut === -1 ? k : k.slice(0, cut);
}

/** Is this key a dialect entity rather than a bare language? */
function isDialectCastKey(key) {
  const k = lower(key);
  return Boolean(k) && k !== baseLanguageOfCastKey(k);
}

/**
 * Which of the two columns produced a key — the sentence the Voice Lab shows
 * beside a dialect row, and the answer to "why does this course have its own
 * cast?" without opening the code.
 *
 * @returns {'voice_pool_key'|'dialect'|null} null when the key is the base
 *   language, i.e. nothing regional was stated.
 */
function castKeySource(course) {
  if (!course) return null;
  const pool = lower(course.voice_pool_key);
  if (pool && POOL_KEY_RE.test(pool)) return 'voice_pool_key';
  if (lower(course.target_lang) && canonicalDialect(course.dialect) !== DEFAULT_DIALECT) return 'dialect';
  return null;
}

/**
 * The estate's castable TARGET entities, computed from course rows.
 *
 * This is the list the Voice Lab's Languages screen is built from, and it is
 * derived rather than curated: a course that gains a `voice_pool_key` tomorrow
 * gains its own castable row with no code change, and a language with no
 * regional course never grows a row it does not need.
 *
 * @param {object[]} courses rows carrying COURSE_CAST_FIELDS
 * @returns {Map<string, {key: string, base: string, courses: object[], source: string|null}>}
 */
function targetCastEntities(courses = []) {
  const out = new Map();
  for (const c of courses) {
    const key = targetCastKey(c);
    if (!key) continue;
    if (!out.has(key)) {
      out.set(key, { key, base: baseLanguageOfCastKey(key), courses: [], source: castKeySource(c) });
    }
    out.get(key).courses.push(c);
  }
  return out;
}

module.exports = {
  COURSE_CAST_FIELDS,
  POOL_KEY_RE,
  castKeyForCourse,
  targetCastKey,
  knownCastKey,
  baseLanguageOfCastKey,
  isDialectCastKey,
  castKeySource,
  targetCastEntities,
};
