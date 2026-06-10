/**
 * voice-engine/db.cjs — all Supabase reads/writes the engine performs,
 * isolated so tests can inject a plain-object fake.
 *
 * READS are paginated (PostgREST max-rows silently truncates un-paginated
 * selects — the INF PLAY lesson).
 * WRITES: course_audio upsert only (origin='human', conflict on the live
 * 5-column unique index that phase8 upserts against), plus the existing
 * link pass (link_all_audio_ids RPC). NO DDL.
 */

const { normalizeForAudio } = require('../shared/text-normalize.cjs')

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
  return pageThrough((from, to) => supabase
    .from('course_legos')
    .select('lego_id, target_text, known_text, type, is_new, seed_number, lego_index')
    .eq('course_code', courseCode)
    .eq('is_new', true)
    .order('lego_id', { ascending: true })
    .range(from, to))
}

async function loadPhrases(supabase, courseCode) {
  return pageThrough((from, to) => supabase
    .from('course_practice_phrases')
    .select('id, target_text, known_text, phrase_role, seed_number, lego_index')
    .eq('course_code', courseCode)
    .order('id', { ascending: true })
    .range(from, to))
}

async function loadSeeds(supabase, courseCode) {
  return pageThrough((from, to) => supabase
    .from('course_seeds')
    .select('id, target_text, known_text, seed_number')
    .eq('course_code', courseCode)
    .order('seed_number', { ascending: true })
    .range(from, to))
}

/** text_normalized values already registered for (course, role, voice). */
async function fetchExistingAudioTexts(supabase, { courseCode, role, voiceId }) {
  const rows = await pageThrough((from, to) => {
    let q = supabase
      .from('course_audio')
      .select('text_normalized')
      .eq('course_code', courseCode)
      .eq('role', role)
      .order('id', { ascending: true })
      .range(from, to)
    if (voiceId) q = q.eq('voice_id', voiceId)
    return q
  })
  return new Set(rows.map(r => r.text_normalized).filter(Boolean))
}

/** All audio rows for a role (any voice) — used by /coverage. */
async function fetchAudioRowsForRole(supabase, { courseCode, role }) {
  return pageThrough((from, to) => supabase
    .from('course_audio')
    .select('text_normalized, voice_id, origin')
    .eq('course_code', courseCode)
    .eq('role', role)
    .order('id', { ascending: true })
    .range(from, to))
}

/**
 * Upsert one human course_audio row. Same conflict key as phase8's working
 * upsert (the live 5-column unique index, audit 06 §1.3 — per-voice rows are
 * representable today). origin is ALWAYS 'human' here: this is the human
 * engine; spliced rows are distinguished via provenance method + the
 * manifest spliced ledger (keystone decision 6 — 'splice' origin is a
 * deferred migration).
 */
async function upsertHumanCourseAudio(supabase, { courseCode, text, language, role, voiceId, s3Key, durationMs }) {
  const { data, error } = await supabase
    .from('course_audio')
    .upsert({
      course_code: courseCode,
      text,
      text_normalized: normalizeForAudio(text),
      language,
      role,
      voice_id: voiceId,
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
 * FK link pass — the existing link machinery (link_all_audio_ids RPC, the
 * same one phase8's linkAudioIds calls first). Note: the RPC has no origin
 * preference today (bare LIMIT 1); the human-preferring ORDER BY lands in
 * the parallel safety build.
 */
async function linkCourseAudio(supabase, courseCode) {
  const { data, error } = await supabase.rpc('link_all_audio_ids', { p_course_code: courseCode })
  if (error) return { ok: false, error: error.message }
  return { ok: true, result: data || {} }
}

module.exports = {
  PAGE_SIZE,
  pageThrough,
  loadCourse,
  loadNewLegos,
  loadPhrases,
  loadSeeds,
  fetchExistingAudioTexts,
  fetchAudioRowsForRole,
  upsertHumanCourseAudio,
  linkCourseAudio,
}
