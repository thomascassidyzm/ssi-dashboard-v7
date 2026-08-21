/**
 * voice-engine/db.cjs — all Supabase reads/writes the engine performs,
 * isolated so tests can inject a plain-object fake.
 *
 * READS: count + one unordered fetch, ordered-pager fallback. ORDER BY +
 * OFFSET pagination re-scans and re-sorts the whole match set on every page,
 * and PostgREST's parameterized statements get generic plans — on big
 * courses that hit the DB statement timeout (live 2026-06-11, fra_for_eng
 * coverage). A single unordered fetch is one cheap scan; the exact count
 * makes max-rows truncation DETECTABLE (the INF PLAY lesson — never trust
 * an un-checked big select), and only then do we pay for the ordered pager.
 * WRITES: course_audio upsert only (origin='human', conflict on the live
 * 5-column unique index that phase8 upserts against), plus the existing
 * link pass (link_all_audio_ids RPC). NO DDL.
 */

const { normalizeForAudio } = require('../shared/text-normalize.cjs')
const { canonicalLanguage, canonicalVoiceId } = require('../shared/clip-identity.cjs')
const { voiceSpellings } = require('../shared/clip-identity-lookup.cjs')

const PAGE_SIZE = 1000

async function pageThrough(buildQuery) {
  const all = []
  let offset = 0
  for (;;) {
    const { data, error } = await buildQuery(offset, offset + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    if (!data?.length) break
    all.push(...data)
    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  return all
}

/**
 * Fetch every row matching a filter.
 * @param {() => any} countQuery  builder returning select(..., {count:'exact', head:true}) + filters
 * @param {() => any} dataQuery   builder returning the unordered filtered select (no order/range)
 * @param {(from,to) => any} pagedQuery  ordered+ranged fallback builder
 */
async function fetchAll(countQuery, dataQuery, pagedQuery) {
  const { count, error: countError } = await countQuery()
  if (countError) throw new Error(countError.message)
  const expected = count ?? 0
  if (expected === 0) return []
  const { data, error } = await dataQuery().limit(expected + PAGE_SIZE)
  if (!error && data && data.length >= expected) return data
  // max-rows truncated the single fetch (or it errored) — correctness over
  // speed: fall back to the ordered pager.
  return pageThrough(pagedQuery)
}

async function loadCourse(supabase, courseCode) {
  const { data, error } = await supabase
    .from('courses')
    .select('course_code, known_lang, target_lang, voice_config')
    .eq('course_code', courseCode)
    .single()
  if (error) throw new Error(`course load failed: ${error.message}`)
  return data
}

/** New LEGOs only — the splice universe (matches the planner). */
async function loadNewLegos(supabase, courseCode) {
  return fetchAll(
    () => supabase.from('course_legos').select('lego_id', { count: 'exact', head: true })
      .eq('course_code', courseCode).eq('is_new', true),
    () => supabase.from('course_legos')
      .select('lego_id, target_text, known_text, type, is_new, seed_number, lego_index')
      .eq('course_code', courseCode).eq('is_new', true),
    (from, to) => supabase.from('course_legos')
      .select('lego_id, target_text, known_text, type, is_new, seed_number, lego_index')
      .eq('course_code', courseCode).eq('is_new', true)
      .order('lego_id', { ascending: true }).range(from, to))
}

async function loadPhrases(supabase, courseCode) {
  return fetchAll(
    () => supabase.from('course_practice_phrases').select('id', { count: 'exact', head: true })
      .eq('course_code', courseCode),
    () => supabase.from('course_practice_phrases')
      .select('id, target_text, known_text, phrase_role, seed_number, lego_index')
      .eq('course_code', courseCode),
    (from, to) => supabase.from('course_practice_phrases')
      .select('id, target_text, known_text, phrase_role, seed_number, lego_index')
      .eq('course_code', courseCode)
      .order('id', { ascending: true }).range(from, to))
}

async function loadSeeds(supabase, courseCode) {
  return fetchAll(
    () => supabase.from('course_seeds').select('id', { count: 'exact', head: true })
      .eq('course_code', courseCode),
    () => supabase.from('course_seeds')
      .select('id, target_text, known_text, seed_number')
      .eq('course_code', courseCode),
    (from, to) => supabase.from('course_seeds')
      .select('id, target_text, known_text, seed_number')
      .eq('course_code', courseCode)
      .order('seed_number', { ascending: true }).range(from, to))
}

/**
 * text_normalized → s3_key already registered for (course, role, voice).
 * A Map (not a Set) so the job can tell "registered from THIS take" apart
 * from "registered from an older take or a splice" — re-records supersede.
 * (.has() keeps working for the splice planner.)
 *
 * The voice filter matches EITHER spelling (see clip-identity-lookup.cjs).
 * This drives "which texts still need recording", so a spelling miss tells the
 * recordist a text is unrecorded when a take already exists — a wasted human
 * session, and a second human row on the same text. Widening the read is the
 * cheap side of that trade: the worst case is correctly reporting a text as
 * already recorded.
 */
async function fetchExistingAudioTexts(supabase, { courseCode, role, voiceId }) {
  const spellings = voiceId ? voiceSpellings(voiceId) : null
  const filters = (q) => {
    q = q.eq('course_code', courseCode).eq('role', role)
    return spellings ? q.in('voice_id', spellings) : q
  }
  const rows = await fetchAll(
    () => filters(supabase.from('course_audio').select('id', { count: 'exact', head: true })),
    () => filters(supabase.from('course_audio').select('text_normalized, s3_key')),
    (from, to) => filters(supabase.from('course_audio').select('text_normalized, s3_key'))
      .order('id', { ascending: true }).range(from, to))
  const map = new Map()
  for (const r of rows) {
    if (r.text_normalized) map.set(r.text_normalized, r.s3_key ?? null)
  }
  return map
}

/** All audio rows for a role (any voice) — used by /coverage. */
async function fetchAudioRowsForRole(supabase, { courseCode, role }) {
  return fetchAll(
    () => supabase.from('course_audio').select('id', { count: 'exact', head: true })
      .eq('course_code', courseCode).eq('role', role),
    () => supabase.from('course_audio').select('text_normalized, voice_id, origin')
      .eq('course_code', courseCode).eq('role', role),
    (from, to) => supabase.from('course_audio').select('text_normalized, voice_id, origin')
      .eq('course_code', courseCode).eq('role', role)
      .order('id', { ascending: true }).range(from, to))
}

/**
 * Find the human course_audio row a take would land on, on the SAME 5-column
 * key upsertHumanCourseAudio conflicts against, canonicalised the SAME way.
 *
 * That sameness is the whole contract: the caller uses this to decide between
 * "first take of this line" (plain insert) and "a re-record superseding an
 * existing clip" (versioned swap). If the two disagreed by so much as a
 * normalisation, a re-record would look like a first take and overwrite the
 * clip with no revision bump and no ledger row — which is exactly the bug the
 * lookup exists to prevent. Any change to the upsert's canonicalisation must be
 * made here in the same commit.
 *
 * @returns {Promise<{id, s3_key, audio_revision}|null>}
 */
async function findHumanCourseAudio(supabase, { courseCode, text, language, role, voiceId, provider }) {
  const { data, error } = await supabase
    .from('course_audio')
    .select('id, s3_key, audio_revision')
    .eq('course_code', courseCode)
    .eq('text_normalized', normalizeForAudio(text))
    .eq('language', canonicalLanguage(language))
    .eq('role', role)
    .eq('voice_id', canonicalVoiceId(voiceId, { provider }))
    .maybeSingle()
  if (error) throw new Error(`course_audio lookup failed for "${text}": ${error.message}`)
  return data || null
}

/**
 * Upsert one human course_audio row. Same conflict key as phase8's working
 * upsert (the live 5-column unique index, audit 06 §1.3 — per-voice rows are
 * representable today). origin is ALWAYS 'human' here: this is the human
 * engine; spliced rows are distinguished via provenance method + the
 * manifest spliced ledger (keystone decision 6 — 'splice' origin is a
 * deferred migration).
 */
async function upsertHumanCourseAudio(supabase, { courseCode, text, language, role, voiceId, provider, s3Key, durationMs }) {
  const { data, error } = await supabase
    .from('course_audio')
    .upsert({
      course_code: courseCode,
      text,
      text_normalized: normalizeForAudio(text),
      language: canonicalLanguage(language),
      role,
      voice_id: canonicalVoiceId(voiceId, { provider }),
      origin: 'human',
      s3_key: s3Key,
      duration_ms: durationMs ?? null,
    }, {
      onConflict: 'course_code,text_normalized,language,role,voice_id',
    })
    .select('id')
    .single()
  if (error) throw new Error(`course_audio upsert failed for "${text}": ${error.message}`)
  return data.id
}

/**
 * FK link pass — phase8's linkAudioIds (human-preference pre-pass, then the
 * link_all_audio_ids RPC) so freshly recorded/spliced human rows win
 * duplicate-text links. The RPC itself still links arbitrarily (it's DDL,
 * untouchable); the pre-pass is what guarantees human-first. Falls back to
 * the bare RPC only if phase8 can't be loaded (e.g. stripped test envs).
 */
async function linkCourseAudio(supabase, courseCode) {
  try {
    const phase8 = require('../phases/phase8-audio-v13.cjs')
    if (typeof phase8.linkAudioIds === 'function') {
      const result = await phase8.linkAudioIds(courseCode)
      return { ok: true, result: result || {} }
    }
  } catch (err) {
    // fall through to the bare RPC
  }
  const { data, error } = await supabase.rpc('link_all_audio_ids', { p_course_code: courseCode })
  if (error) return { ok: false, error: error.message }
  return { ok: true, result: data || {} }
}

module.exports = {
  PAGE_SIZE,
  pageThrough,
  fetchAll,
  loadCourse,
  loadNewLegos,
  loadPhrases,
  loadSeeds,
  fetchExistingAudioTexts,
  fetchAudioRowsForRole,
  findHumanCourseAudio,
  upsertHumanCourseAudio,
  linkCourseAudio,
}
