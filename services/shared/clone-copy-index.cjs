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
const { voiceSpellings } = require('./clip-identity-lookup.cjs')

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
 * Look up a voice's TTS engine in the `voices` registry.
 *
 * This lookup decides `trusted` below, and an unregistered voice makes the
 * whole pass report SKIP_UNTRUSTED_VOICE — so a spelling miss here is not a
 * cosmetic failure, it silently refuses every copy and sends the slots to paid
 * TTS instead. A course carrying the bare spelling ('es-ES-ElviraNeural') was
 * missing its own registry row for exactly that reason.
 *
 * Every known spelling is tried, canonical first, because THE REGISTRY ITSELF
 * IS NOT CLEAN: as of 2026-08-06 six voices are present under both their
 * canonical and their bare spelling (e.g. 'azure_es-ES-ElviraNeural' AND
 * 'es-ES-ElviraNeural' are both rows). Assuming either spelling alone loses
 * real rows. Read-only — this never writes the registry; reconciling those
 * duplicate rows is a data change and is not done here.
 *
 * @param {object} supabase - Supabase client
 * @param {string} voiceId
 * @param {object} [opts]
 * @param {string} [opts.provider] provider for an unprefixed, opaque voice id
 * @returns {Promise<string|null>} tts_engine for the voice (e.g. 'xai'), or null if unregistered
 */
async function getEngineForVoice(supabase, voiceId, opts = {}) {
  // Canonical first so the clean spelling wins when the registry holds both.
  for (const spelling of voiceSpellings(voiceId, opts)) {
    const { data } = await supabase.from('voices').select('tts_engine').eq('voice_id', spelling).maybeSingle()
    if (data?.tts_engine) return data.tts_engine
  }
  return null
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

function rowsToIndex(rows, voiceId, provider) {
  const real = rows.filter(r => r.s3_key && !r.s3_key.startsWith('pending/'))
  const index = new Map()
  const skipped = []
  for (const r of real) {
    let key
    try {
      // Key on the ROW'S OWN voice_id, not the caller's. The query below now
      // reaches both spellings of the requested voice, so assuming the
      // caller's spelling for every row would be filing rows under a voice
      // they don't state. Both spellings canonicalise to the same value, so
      // matching is unaffected — but a row that canonicalises to a DIFFERENT
      // voice now simply fails to match instead of being mislabelled.
      key = computeAudioKey({ text: r.text, language: r.language, voiceId: r.voice_id || voiceId, provider })
    } catch (e) {
      // A candidate SOURCE row whose own language is not canonicalisable (an
      // 'auto' row, say) cannot be identified, so it cannot be proven to be
      // the same clip. Leaving it out of the index is the safe direction — the
      // slot reports SKIP_NO_SOURCE exactly as it does today — but it is
      // returned to the caller rather than swallowed, because a large skip
      // count means the index is quietly smaller than it looks.
      skipped.push({ id: r.id, courseCode: r.course_code, language: r.language, reason: e.message })
      continue
    }
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
  return { index, skipped }
}

const SELECT_COLS = 'id, course_code, text, language, voice_id, role, s3_key, created_at, duration_ms, file_size_bytes, word_boundaries, text_stripped'

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
 *
 * The voice filter matches EVERY known spelling of the requested voice
 * (canonical, the caller's own, and bare) — 414,061 rows are split between
 * 'azure_en-GB-SoniaNeural' and 'en-GB-SoniaNeural' alone, and an index that
 * sees only one half re-renders the other half. Every row that comes back is
 * still keyed by its canonical identity, so widening the filter widens what can
 * be FOUND without widening what counts as a MATCH.
 *
 * @returns {Promise<{index: Map, trusted: boolean, engine: string|null,
 *   skipped: object[]}>} `skipped` lists candidate rows left out because their
 *   own identity could not be canonicalised — a non-empty list means the index
 *   is smaller than the row count suggests.
 */
async function buildSourceIndex(supabase, { voiceId, language, texts = null, provider }) {
  const engine = await getEngineForVoice(supabase, voiceId, { provider })
  if (!isTrusted1xEngine(engine)) {
    return { index: new Map(), trusted: false, engine, skipped: [] }
  }

  const voiceIds = voiceSpellings(voiceId, { provider })

  let rows
  if (texts) {
    rows = []
    for (const textChunk of chunk([...new Set(texts)], TEXT_CHUNK)) {
      if (!textChunk.length) continue
      const data = await fetchRowsWithRetry(() =>
        supabase.from('course_audio').select(SELECT_COLS)
          .in('voice_id', voiceIds).eq('language', language)
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
          .in('voice_id', voiceIds).eq('language', language)
          .range(offset, offset + PAGE - 1)
      )
      rows.push(...data)
      if (data.length < PAGE) break
      offset += PAGE
    }
  }

  const { index, skipped } = rowsToIndex(rows, voiceId, provider)
  return { index, trusted: true, engine, skipped }
}

module.exports = { getEngineForVoice, buildSourceIndex }
