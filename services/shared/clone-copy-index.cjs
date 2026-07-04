/**
 * Clone-once, copy-everywhere — DB-backed source index.
 *
 * Thin I/O layer over the pure matching logic in clone-copy-match.cjs. Takes
 * a Supabase client as a parameter (no client construction here) so both the
 * standalone tool (tools/course-optimization/clone-copy-pass.cjs) and the
 * live service (services/phases/phase8-audio-v13.cjs) share one
 * implementation and can never drift into different copy semantics.
 */
const { computeAudioKey } = require('./clone-copy-match.cjs')

const PAGE = 2000

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
 * A voice's speed setting only matters for the match if the render engine
 * actually applies it. xAI has no speed param (see buildTTSConfig in
 * voice-config-service.cjs) — its renders are speed-invariant, so folding a
 * possibly-stale voice_config speed into the key would only produce false
 * negatives, never protect against anything real.
 */
async function speedMattersForVoice(supabase, voiceId) {
  const engine = await getEngineForVoice(supabase, voiceId)
  return engine !== 'xai'
}

/**
 * Build the global index of every rendered course_audio row for (role, voiceId),
 * keyed by computeAudioKey — one entry per (course, text) pair, from ANY course.
 */
async function buildSourceIndex(supabase, { role, voiceId, speedMatters }) {
  const rows = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('course_audio')
      .select('id, course_code, text, language, s3_key, created_at, duration_ms, file_size_bytes, word_boundaries, text_stripped')
      .eq('role', role)
      .eq('voice_id', voiceId)
      .range(offset, offset + PAGE - 1)
    if (error) throw new Error(`course_audio source index: ${error.message}`)
    rows.push(...data)
    if (data.length < PAGE) break
    offset += PAGE
  }
  const real = rows.filter(r => r.s3_key && !r.s3_key.startsWith('pending/'))

  let speedByCourse = new Map()
  if (speedMatters) {
    const courseCodes = [...new Set(real.map(r => r.course_code))]
    for (let i = 0; i < courseCodes.length; i += 200) {
      const chunk = courseCodes.slice(i, i + 200)
      const { data: courses, error } = await supabase.from('courses').select('course_code, voice_config').in('course_code', chunk)
      if (error) throw new Error(`voice_config batch: ${error.message}`)
      for (const c of (courses || [])) {
        speedByCourse.set(c.course_code, c.voice_config?.voices?.[role]?.settings?.speed || 1.0)
      }
    }
  }

  const index = new Map()
  for (const r of real) {
    const key = computeAudioKey({
      text: r.text,
      language: r.language,
      role,
      voiceId,
      speed: speedMatters ? speedByCourse.get(r.course_code) : undefined,
    }, speedMatters)
    const entry = {
      courseCode: r.course_code,
      s3Key: r.s3_key,
      text: r.text,
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
  return index
}

module.exports = { getEngineForVoice, speedMattersForVoice, buildSourceIndex }
