/**
 * Clone-once, copy-everywhere — DB-backed source index.
 *
 * Thin I/O layer over the pure matching logic in clone-copy-match.cjs. Takes
 * a Supabase client as a parameter (no client construction here) so both the
 * standalone tool (tools/course-optimization/clone-copy-pass.cjs) and the
 * live service (services/phases/phase8-audio-v13.cjs) share one
 * implementation and can never drift into different copy semantics.
 *
 * STORAGE MODEL (Tom's ruling): logical ownership is per-course (every course
 * gets its own course_audio row), but PHYSICAL storage is shared — multiple
 * rows across many courses/roles can point at the SAME s3_key. This is safe
 * ONLY because of the immutability rule: a canonical mastered/<uuid>.mp3
 * object is write-once. Any re-master/fix mints a NEW key and repoints rows
 * explicitly; nothing ever overwrites bytes at an existing key. Rows may be
 * deleted freely (a course dropping a phrase just drops its row) — canonical
 * objects are never deleted by course-level operations (storage is trivial;
 * no refcounting, ever, by design).
 */
const { computeAudioKey, isTrusted1xEngine } = require('./clone-copy-match.cjs')

const PAGE = 2000
const MAX_RETRIES = 3

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

/**
 * @param {object} supabase - Supabase client
 * @param {string} voiceId
 * @returns {Promise<string|null>} tts_engine for the voice (e.g. 'xai'), or null if unregistered
 */
async function getEngineForVoice(supabase, voiceId) {
  const { data } = await supabase.from('voices').select('tts_engine').eq('voice_id', voiceId).maybeSingle()
  return data?.tts_engine || null
}

/**
 * Build the global index of every rendered course_audio row for (language,
 * voiceId) — ACROSS ALL ROLES (known, target1, target2, ...) and both course
 * families (X_for_eng known-side, eng_for_X target-side). One entry per
 * (course, text) pair, from ANY course.
 *
 * Refuses to build an index for a voice whose engine isn't verified
 * speed-invariant at render (see isTrusted1xEngine) — a legacy Azure clip may
 * have a non-1x rate physically baked into it, and course_audio has no
 * persisted per-row speed to check, so it cannot be trusted as a canonical
 * copy source. Callers get { index: empty Map, trusted: false } in that case
 * and should report/flag it rather than silently proceeding.
 */
async function buildSourceIndex(supabase, { voiceId, language }) {
  const engine = await getEngineForVoice(supabase, voiceId)
  if (!isTrusted1xEngine(engine)) {
    return { index: new Map(), trusted: false, engine }
  }

  const rows = []
  let offset = 0
  while (true) {
    let data, error
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      ;({ data, error } = await supabase
        .from('course_audio')
        .select('id, course_code, text, language, role, s3_key, created_at, duration_ms, file_size_bytes, word_boundaries, text_stripped')
        .eq('voice_id', voiceId)
        .eq('language', language)
        .range(offset, offset + PAGE - 1))
      if (!error) break
      if (attempt === MAX_RETRIES) throw new Error(`course_audio source index: ${error.message}`)
      await sleep(500 * (attempt + 1)) // transient DB load (statement timeout) — backoff and retry
    }
    rows.push(...data)
    if (data.length < PAGE) break
    offset += PAGE
  }
  const real = rows.filter(r => r.s3_key && !r.s3_key.startsWith('pending/'))

  const index = new Map()
  for (const r of real) {
    const key = computeAudioKey({ text: r.text, language: r.language, voiceId })
    const entry = {
      courseCode: r.course_code,
      s3Key: r.s3_key,
      text: r.text,
      role: r.role,
      id: r.id,
      createdAt: r.created_at,
      durationMs: r.duration_ms,
      fileSizeBytes: r.file_size_bytes,
      wordBoundaries: r.word_boundaries,
      textStripped: r.text_stripped,
    }
    if (!index.has(key)) index.set(key, [])
    index.get(key).push(entry)
  }
  return { index, trusted: true, engine }
}

module.exports = { getEngineForVoice, buildSourceIndex }
