/**
 * THE CLIP INDEX — Tom's audio model as code (2026-09-26 ~22:00Z):
 *
 *   "we have text that needs audio / what is the text - character by character
 *    / what language is it / … which voice is it - e.g named clone / that's it /
 *    check to see if we have it - using some kind of better system than we
 *    currently use - anywhere in the estate"
 *
 * A CLIP is (language, text_key, voice_id). No role, no course. The table
 * public.clip_index (database/changes/20260926_clip_index.sql) holds one row
 * per clip pointing at ONE canonical course_audio row; its primary key makes
 * "which voices have these words in this language" a single index range, so no
 * lookup pages course_audio or trips a row cap.
 *
 * THE INDEX CAN ONLY MAKE A HIT FASTER, NEVER TURN A HIT INTO A MISS.
 * Entries are written by tools/clip-index-backfill.cjs, by phase8's render
 * write, and — for every other writer of course_audio (human uploads, repair
 * tools) — by write-through here whenever the fallback finds a clip the index
 * did not hold. So an absent entry is a cache miss, never a verdict:
 * resolveClip() falls back to the keyed course_audio question (text_normalized
 * index, not a scan) whenever the index yields no usable clip in the requested
 * voice, and writes what it finds through. The fallback still FAILS CLOSED —
 * an error or a truncated page throws; it never reads as "no clip exists".
 */

const { normalizeForAudio, audioKeyCandidates } = require('./text-normalize.cjs')
const { tryCanonicalLanguage, tryCanonicalVoiceId } = require('./clip-identity.cjs')
/**
 * THE LANGUAGE OF A CLIP IS ITS COURSE'S LANGUAGE CODE. Tom, 2026-09-26/27:
 * "region is a different language - north/south welsh have very different
 * accents, as does Mexican spanish"; "no tags, the regions are different
 * languages"; and the test: "if it's a different target language in a course,
 * then it counts as a different language".
 *
 * So there is no region tag and no mapping. The language code is the one the
 * course itself is named by: the part of course_code before '_for_' is the
 * language it teaches ('spa_mx', 'cym_n', 'cym_s', 'spa'), the part after is
 * the language it is taught in ('eng', 'cym'). Two courses with different
 * target codes never share a clip, in any voice — the lookup reuses across
 * voices, so the voice cannot be what keeps them apart. This is the same code
 * the pods already key their canonical text on (pod-language-text.cjs,
 * split_part(course_code, '_for_', 1)). courses.target_lang cannot serve: it
 * carries 'spa' for spa_mx_for_eng and 'cym' for both Welsh courses.
 *
 * Which side a clip is on is read from its stored language against the
 * course's target_lang / known_lang (course_audio.language is the base tag, or
 * an unreconciled BCP-47 one — 'es-MX', 'cy'):
 *   - the course's TARGET base -> the code before '_for_';
 *   - the course's KNOWN base  -> the code after '_for_';
 *   - both (eng_template)      -> the two codes if they agree, else null;
 *   - neither (an English line in spa_for_jpn) -> the base code: no course
 *     names it any other way;
 *   - no course (a request with no course)     -> the base code.
 *
 * @param {string} language  any spelling ('es-MX', 'spa', 'cy')
 * @param {object|null} course  { course_code, known_lang, target_lang }
 * @returns {string|null}
 */
function clipLanguageKey(language, course) {
  const base = tryCanonicalLanguage(language)
  if (!base) return null
  if (!course || !course.course_code) return base
  const cut = String(course.course_code).indexOf('_for_')
  if (cut < 0) return base
  const targetCode = course.course_code.slice(0, cut)
  const knownCode = course.course_code.slice(cut + 5)
  const t = tryCanonicalLanguage(course.target_lang) === base ? targetCode : null
  const k = tryCanonicalLanguage(course.known_lang) === base ? knownCode : null
  if (t && k) return t === k ? t : null
  return t || k || base
}

/** The columns clipLanguageKey reads from a courses row. */
const COURSE_LANGUAGE_FIELDS = 'course_code, known_lang, target_lang'

/** The base language of a clip language key ('spa_mx' -> 'spa'). */
function baseOfClipLanguage(key) {
  const k = String(key || '')
  const cut = k.indexOf('_')
  return cut === -1 ? k : k.slice(0, cut)
}

/**
 * THE TEXT OF A CLIP. Tom: "character by character". The key is the words as
 * the pipeline stores them, with ONLY the normalisation the door already
 * applied before this index existed (normalizeForAudio):
 *   - trim the ends and collapse runs of whitespace;
 *   - strip trailing . ! 。 ！ (bookend punctuation — intake strips it anyway);
 *   - lowercase (course intake already lowercases known/target text; this
 *     only folds the "I"-allowlist and pre-intake rows onto the same clip).
 * A trailing ? is KEPT — a question and a statement are different takes.
 * No Unicode normalisation, no accent folding, no internal punctuation change:
 * "facile" and "fácil" are different words, and so are "ca va" and "ça va".
 */
function clipTextKey(text) {
  return normalizeForAudio(String(text == null ? '' : text))
}

/**
 * The index entry a course_audio row would hold, or { skip: reason }.
 * Language and voice are canonicalised, never guessed: a row whose language is
 * 'auto' or whose voice is a sentinel cannot be named, so it is counted, not
 * indexed (tryCanonical* return null for those).
 */
function indexEntryFor(row, indexedBy, courseOf = noCourses, resolvers = null) {
  if (!row || !row.id) return { skip: 'no-row' }
  if (!row.s3_key || String(row.s3_key).startsWith('pending/')) return { skip: 'pending' }
  if (row.veracity_pass === false) return { skip: 'veracity-failed' }
  // `resolvers` (services/shared/named-voices.cjs) is how a clip whose voice or words are
  // not what course_audio stores gets its true identity; absent, nothing changes.
  const text_key = clipTextKey(resolvers && resolvers.spokenText ? resolvers.spokenText(row) : row.text)
  if (!text_key) return { skip: 'empty-text' }
  if (!tryCanonicalLanguage(row.language)) return { skip: 'language-unnamed' }
  const language = clipLanguageKey(row.language, courseOf(row.course_code))
  if (!language) return { skip: 'language-ambiguous' }
  const voice_id = resolvers && resolvers.voiceOf ? resolvers.voiceOf(row) : tryCanonicalVoiceId(row.voice_id)
  if (!voice_id) return { skip: 'voice-unnamed' }
  return {
    language, text_key, voice_id,
    audio_id: row.id,
    origin: row.origin === 'human' ? 'human' : 'tts',
    indexed_by: indexedBy,
  }
}

/**
 * Which of two rows for the same clip is canonical: a human take over a TTS
 * one, a veracity-passed row over an unchecked one, then the lower id — so the
 * answer never depends on the order rows were read in.
 */
function betterCanonical(a, b) {
  const rank = r => [r.origin === 'human' ? 0 : 1, r.veracity_pass === true ? 0 : 1]
  const ra = rank(a), rb = rank(b)
  for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] < rb[i] ? a : b
  return String(a.id) <= String(b.id) ? a : b
}

/** A course lookup that knows no course: every clip keys on its base language. */
const noCourses = () => null

/** One entry per key from a set of rows, canonical row winning. Returns { entries, collisions, skipped }. */
function entriesFromRows(rows, indexedBy, courseOf = noCourses, resolvers = null) {
  const best = new Map()
  const skipped = {}
  let collisions = 0
  for (const row of rows || []) {
    const e = indexEntryFor(row, indexedBy, courseOf, resolvers)
    if (e.skip) { skipped[e.skip] = (skipped[e.skip] || 0) + 1; continue }
    const k = `${e.language}\u001f${e.text_key}\u001f${e.voice_id}`
    const prev = best.get(k)
    if (!prev) { best.set(k, { e, row }); continue }
    collisions++
    const win = betterCanonical(prev.row, row)
    if (win === row) best.set(k, { e, row })
  }
  return { entries: [...best.values()].map(v => v.e), collisions, skipped }
}

const ROW_COLUMNS = 'id, course_code, text, language, voice_id, role, s3_key, origin, duration_ms, word_boundaries, word_timings, veracity_checked_at, veracity_pass, veracity_reason, veracity_cer, veracity_attempts, veracity_checker'

const FALLBACK_PAGE = 1000
const FALLBACK_MAX_PAGES = 20

/** The indexed clips of these words in this language — every voice, one range read. */
async function lookupIndexed(supabase, language, text) {
  const { data, error } = await supabase
    .from('clip_index')
    .select(`voice_id, course_audio!inner(${ROW_COLUMNS})`)
    .eq('language', language)
    .eq('text_key', clipTextKey(text))
  if (error) throw new Error(`clip index lookup failed (${error.message}) — refusing to decide blind`)
  return (data || []).map(r => r.course_audio).filter(Boolean)
}

/** This course's own rows for these words (keyed: course_code + text_normalized). */
async function ownCourseRows(supabase, courseCode, text) {
  const { data, error } = await supabase
    .from('course_audio')
    .select(ROW_COLUMNS)
    .eq('course_code', courseCode)
    .in('text_normalized', audioKeyCandidates(text))
    .not('s3_key', 'like', 'pending/%')
  if (error) throw new Error(`own-course clip lookup failed (${error.message}) — refusing to decide blind`)
  return data || []
}

/**
 * The pre-index question, kept as the fallback: every course_audio row whose
 * text_normalized is one of this text's stored forms (idx_course_audio_text).
 * Paged; a group larger than the pages allow THROWS rather than truncating.
 */
async function fallbackRows(supabase, text, { courseCode = null, ownCourseOnly = false } = {}) {
  const keys = audioKeyCandidates(text)
  if (!keys.length) return []
  const out = []
  for (let page = 0; page < FALLBACK_MAX_PAGES; page++) {
    let q = supabase.from('course_audio').select(ROW_COLUMNS)
    if (ownCourseOnly) q = q.eq('course_code', courseCode)
    const { data, error } = await q
      .in('text_normalized', keys)
      .not('s3_key', 'like', 'pending/%')
      .order('id')
      .range(page * FALLBACK_PAGE, page * FALLBACK_PAGE + FALLBACK_PAGE - 1)
    if (error) throw new Error(`clip lookup failed (${error.message}) — refusing to render blind`)
    out.push(...(data || []))
    if (!data || data.length < FALLBACK_PAGE) return out
  }
  throw new Error(`more than ${FALLBACK_PAGE * FALLBACK_MAX_PAGES} clips share the words "${String(text).slice(0, 40)}" — refusing to decide on a truncated lookup`)
}

/**
 * Write index entries for rows that answered a lookup (or were just written).
 * Never overwrites an existing entry. A failed write is logged and swallowed:
 * the clip is in course_audio, the fallback still finds it, and a cache write
 * must never fail a render or a link.
 */
async function writeThrough(supabase, rows, indexedBy, log = console, courseOf = noCourses) {
  const { entries } = entriesFromRows(rows, indexedBy, courseOf)
  if (!entries.length) return 0
  try {
    const { error } = await supabase
      .from('clip_index')
      .upsert(entries, { onConflict: 'language,text_key,voice_id', ignoreDuplicates: true })
    if (error) throw new Error(error.message)
    stats.writtenThrough += entries.length
    return entries.length
  } catch (e) {
    stats.writeErrors++
    log.warn && log.warn(`[clip-index] write-through failed (${e.message}) — the fallback still answers`)
    return 0
  }
}

const stats = { indexHits: 0, fallbacks: 0, writtenThrough: 0, writeErrors: 0 }

const COURSES_TTL_MS = 5 * 60 * 1000

/**
 * The courses table (~150 rows) as a lookup, cached. A code the cache does not
 * hold forces ONE re-read — a course created a minute ago must not have its
 * clips keyed by their base code for five minutes. A read that fails THROWS: keying a
 * clip without knowing its course's language code is how a Castilian clip would be
 * filed where a Mexican course finds it.
 */
function supabaseCourseLookup(supabase) {
  let map = null, at = 0
  const load = async () => {
    const { data, error } = await supabase.from('courses').select(COURSE_LANGUAGE_FIELDS)
    if (error) throw new Error(`clip index: courses unreadable (${error.message}) — refusing to key a clip without its course's language code`)
    map = new Map((data || []).map(c => [c.course_code, c])); at = Date.now()
  }
  return async (codes = []) => {
    if (!map || Date.now() - at > COURSES_TTL_MS) await load()
    else if (codes.some(c => c && !map.has(c))) await load()
    return code => (code && map.get(code)) || null
  }
}

/** The live source: clip_index + course_audio in Supabase. */
function supabaseClipSource(supabase, { log = console, indexedBy = 'write-through' } = {}) {
  const courses = supabaseCourseLookup(supabase)
  return {
    name: 'supabase',
    courses,
    indexed: (language, text) => lookupIndexed(supabase, language, text),
    own: (courseCode, text) => ownCourseRows(supabase, courseCode, text),
    fallback: (text, opts) => fallbackRows(supabase, text, opts),
    write: async rows => writeThrough(supabase, rows, indexedBy, log, await courses(rows.map(r => r.course_code))),
  }
}

/**
 * A source over fixed rows — tests and dry runs. `index` is a list of
 * clip_index entries ({ language, text_key, voice_id, audio_id }); `rows` is
 * course_audio. Written-through entries land in `index`, so a test can see them.
 */
function memoryClipSource({ index = [], rows = [], courses = [] } = {}) {
  const byId = new Map(rows.map(r => [r.id, r]))
  const courseMap = new Map(courses.map(c => [c.course_code, c]))
  const courseOf = code => (code && courseMap.get(code)) || null
  const calls = { indexed: 0, own: 0, fallback: 0 }
  const matches = (r, text) => {
    const keys = new Set(audioKeyCandidates(text))
    return r.s3_key && !String(r.s3_key).startsWith('pending/') &&
      (keys.has(r.text_normalized) || clipTextKey(r.text) === clipTextKey(text))
  }
  return {
    name: 'memory',
    index,
    calls,
    async courses() { return courseOf },
    async indexed(language, text) {
      calls.indexed++
      const key = clipTextKey(text)
      return index.filter(e => e.language === language && e.text_key === key).map(e => byId.get(e.audio_id)).filter(Boolean)
    },
    async own(courseCode, text) { calls.own++; return rows.filter(r => r.course_code === courseCode && matches(r, text)) },
    async fallback(text, { courseCode = null, ownCourseOnly = false } = {}) {
      calls.fallback++
      return rows.filter(r => matches(r, text) && (!ownCourseOnly || r.course_code === courseCode))
    },
    async write(written) {
      const { entries } = entriesFromRows(written, 'memory', courseOf)
      let n = 0
      for (const e of entries) {
        if (index.some(x => x.language === e.language && x.text_key === e.text_key && x.voice_id === e.voice_id)) continue
        index.push(e); n++
      }
      return n
    },
  }
}

/**
 * THE LOOKUP every reuse decision goes through. `pick(rows)` is the caller's
 * own rule (clip-library pickExistingClip, phase8 findSiblingCourseClip) — the
 * index only changes which candidate rows are fetched, never how one is chosen.
 *
 *   1. ownCourseOnly (an intro slot): only this course's rows, straight from
 *      course_audio — the index holds one canonical row per clip and that row
 *      may be another course's.
 *   2. the index's rows for (language, words), plus this course's own rows when
 *      asked (its own row wins a tie and writes nothing);
 *   3. if that yields no pick, or a pick in a voice other than the one asked
 *      for, the keyed course_audio fallback — whose rows are written through.
 *
 * @param {object} source  supabaseClipSource(...) or memoryClipSource(...)
 * @param {object} want    { text, language (any spelling), voiceId?, courseCode?, includeOwnCourse?, ownCourseOnly?, readOnly? }
 * @param {(rows: object[]) => object|null} pick
 */
async function resolveClip(source, want, pick) {
  if (!tryCanonicalLanguage(want.language)) return pick([])
  const courseOf = source.courses ? await source.courses([want.courseCode]) : noCourses
  const language = clipLanguageKey(want.language, courseOf(want.courseCode))
  if (!language) return pick([])
  // EVERY candidate, from every path, must be in the asked language INCLUDING
  // ITS REGION — the pick rules compare base languages only, so this filter is
  // what keeps a Castilian row from answering a Mexican slot.
  const inLanguage = async rows => {
    const of = source.courses ? await source.courses(rows.map(r => r && r.course_code)) : noCourses
    return rows.filter(r => r && clipLanguageKey(r.language, of(r.course_code)) === language)
  }
  if (want.ownCourseOnly) {
    return pick(await inLanguage(await source.fallback(want.text, { courseCode: want.courseCode, ownCourseOnly: true })))
  }
  const voice = want.voiceId ? tryCanonicalVoiceId(want.voiceId) : null
  const indexed = await inLanguage(await source.indexed(language, want.text))
  const own = (want.includeOwnCourse && want.courseCode) ? await inLanguage(await source.own(want.courseCode, want.text)) : []
  const first = pick(dedupeById([...own, ...indexed]))
  if (first && (!voice || tryCanonicalVoiceId(first.voice_id) === voice)) {
    stats.indexHits++
    return first
  }
  stats.fallbacks++
  const rows = await source.fallback(want.text, {})
  // readOnly (a dry run): answer from what was read, write nothing anywhere.
  if (!want.readOnly) await source.write(rows)
  return pick(dedupeById([...own, ...indexed, ...await inLanguage(rows)])) || first
}

function dedupeById(rows) {
  const seen = new Set()
  return rows.filter(r => r && !seen.has(r.id) && seen.add(r.id))
}

module.exports = {
  clipLanguageKey,
  COURSE_LANGUAGE_FIELDS,
  baseOfClipLanguage,
  supabaseCourseLookup,
  clipTextKey,
  indexEntryFor,
  betterCanonical,
  entriesFromRows,
  lookupIndexed,
  fallbackRows,
  writeThrough,
  resolveClip,
  supabaseClipSource,
  memoryClipSource,
  stats,
  ROW_COLUMNS,
}
