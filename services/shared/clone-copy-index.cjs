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
const TEXT_CHUNK = 80 // course_audio has no index on voice_id alone; chunking by an IN-list on text_normalized keeps every query on the (text_normalized, language) index regardless of table size (1.7M+ rows). Kept small: some long-text chunks near 200 items triggered UND_ERR_HEADERS_OVERFLOW (the querystring gets echoed back in PostgREST's response on certain errors).

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * @param {object} supabase - Supabase client
 * @param {string} voiceId
 * @returns {Promise<string|null>} tts_engine for the voice (e.g. 'xai'), or null if unregistered
 */
async function getEngineForVoice(supabase, voiceId) {
  const { data } = await supabase.from('voices').select('tts_engine').eq('voice_id', voiceId).maybeSingle()
  return data?.tts_engine || null
}

async function fetchRowsWithRetry(buildQuery) {
  // buildQuery is a factory (fresh builder per attempt) not a builder — a
  // Supabase PostgrestBuilder is a one-shot thenable, so re-awaiting the
  // SAME instance on retry silently returns/repeats its first result rather
  // than re-issuing the request. Also catches thrown network errors (e.g.
  // 'fetch failed'), not just the { error } shape Postgrest returns.
  let lastErrMessage
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await buildQuery()
      if (!error) return data
      lastErrMessage = error.message
    } catch (e) {
      lastErrMessage = e.message
    }
    if (attempt === MAX_RETRIES) throw new Error(`course_audio source index: ${lastErrMessage}`)
    await sleep(500 * (attempt + 1)) // transient DB/network failure — backoff and retry
  }
}

function rowsToIndex(rows, voiceId) {
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
  return index
}

const SELECT_COLS = 'id, course_code, text, language, role, s3_key, created_at, duration_ms, file_size_bytes, word_boundaries, text_stripped'

/**
 * Build the index of rendered course_audio rows for (language, voiceId) that
 * could match one of `texts` (normalized) — ACROSS ALL ROLES (known,
 * target1, target2, ...) and both course families (X_for_eng known-side,
 * eng_for_X target-side). One entry per (course, text) pair, from ANY course.
 *
 * `texts` (array of normalizeForAudio'd strings) is REQUIRED in practice:
 * course_audio has no index on voice_id alone (only on
 * (text_normalized, language) and (course_code, ...)), so a scan filtered by
 * voice_id across this table's 1.7M+ rows reliably blows the statement
 * timeout. Filtering by text_normalized IN (...) keeps every query on the
 * indexed column and scales with the caller's need, not the table size.
 * Pass texts=null only for small/legacy callers that truly need everything.
 *
 * Refuses to build an index for a voice whose engine isn't verified
 * speed-invariant at render (see isTrusted1xEngine) — a legacy Azure clip may
 * have a non-1x rate physically baked into it, and course_audio has no
 * persisted per-row speed to check, so it cannot be trusted as a canonical
 * copy source. Callers get { index: empty Map, trusted: false } in that case
 * and should report/flag it rather than silently proceeding.
 */
async function buildSourceIndex(supabase, { voiceId, language, texts = null }) {
  const engine = await getEngineForVoice(supabase, voiceId)
  if (!isTrusted1xEngine(engine)) {
    return { index: new Map(), trusted: false, engine }
  }

  let rows
  if (texts) {
    rows = []
    for (const textChunk of chunk([...new Set(texts)], TEXT_CHUNK)) {
      if (!textChunk.length) continue
      const data = await fetchRowsWithRetry(() =>
        supabase.from('course_audio').select(SELECT_COLS)
          .eq('voice_id', voiceId).eq('language', language)
          .in('text_normalized', textChunk)
      )
      rows.push(...data)
    }
  } else {
    rows = []
    let offset = 0
    while (true) {
      const data = await fetchRowsWithRetry(() =>
        supabase.from('course_audio').select(SELECT_COLS)
          .eq('voice_id', voiceId).eq('language', language)
          .range(offset, offset + PAGE - 1)
      )
      rows.push(...data)
      if (data.length < PAGE) break
      offset += PAGE
    }
  }

  return { index: rowsToIndex(rows, voiceId), trusted: true, engine }
}

module.exports = { getEngineForVoice, buildSourceIndex }
