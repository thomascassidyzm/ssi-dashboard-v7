/**
 * THE CLIP LIBRARY — the lookup half of the one TTS door (services/tts-service.cjs `speak`).
 *
 * Tom's audio rulings, as the door applies them:
 *
 *   - Recordings are per LANGUAGE, not per course; course rows hold ids that
 *     POINT at the shared clip (Tom, 2026-09-13: "We have all recordings
 *     already. We just create IDs per course so that the per course IDs point
 *     to the same recordings.").
 *   - The key of a clip is (language, words) — never the course, and never
 *     the voice. A recast applies to NEW content only (Tom, 2026-09-26 21:31Z,
 *     r-2026-09-26-a-recast-applies-to-new-content): if a clip of these words
 *     exists in this language in ANY voice, anywhere in the estate, that clip
 *     answers. The language's cast (voice_language_roles) decides the voice of
 *     a render only when no clip exists. This supersedes voice-identity-keyed
 *     reuse (E1, "a second voice is a different take").
 *   - So before ANY provider is paid, every course's clips are asked. A render
 *     happens only when no clip in any course has these words in this language.
 *   - The one voice-bound caller is a pod (want.voiceBound): a conversation's
 *     speakers are told apart by voice, so a pod line is answered only by a
 *     clip in its own speaker's voice.
 *
 * What the key does NOT include, deliberately:
 *   - course_code: that is the whole point.
 *   - voice: see above. The requested voice is the ONLY preference among hits.
 *   - role: there is no role. Tom, 2026-09-26 21:45Z: "target and known voices
 *     are not distinguished AT ALL — a voice's phrase is matched to the voice
 *     and the text and the language and NO ROLE; the app plays the voices at
 *     different speeds." A clip recorded as known in one course answers a
 *     target slot in another, and vice versa. Nothing here reads a row's role;
 *     tts-door.test.cjs fails if anything starts to.
 *
 * What it refuses:
 *   - pending/ placeholders (no audio behind them);
 *   - rows a veracity check marked failed (veracity_pass === false);
 *   - whatever the caller is REPLACING (door.replacing) — a regenerate asks for
 *     a different take than the one it names, not the same one handed back;
 *   - for an INTRO slot (want.ownCourseOnly), any other course's clip:
 *     "intros ALWAYS rendered fresh, never reused" (Tom, 2026-08-07). Keyed on
 *     the slot being filled, never on what a stored row was recorded as.
 *
 * Words are compared with normalizeForAudio, which keeps ?/! — a question and a
 * statement are different takes. The DB lookup uses audioKeyCandidates because
 * text_normalized is written by the SQL trigger's convention (see text-normalize.cjs).
 */

const { normalizeForAudio, audioKeyCandidates } = require('./text-normalize.cjs')
const { tryCanonicalLanguage, tryCanonicalVoiceId } = require('./clip-identity.cjs')
const clipIndex = require('./clip-index.cjs')

const PAGE = 1000
const MAX_PAGES = 20

/**
 * The identity the door looks up, from a provider config. Returns
 * { language, voiceId } in canonical form, or null for a field it cannot name.
 *
 * Azure's voice name carries its locale ('hi-IN-SwaraNeural'); Cartesia's
 * config carries `locale`/`language`. An explicit door.language wins.
 */
function identityFromConfig(provider, config = {}) {
  const door = config.door || {}
  const rawVoice = provider === 'azure' ? config.voiceName : config.voiceId
  const voiceId = rawVoice ? tryCanonicalVoiceId(rawVoice, { provider }) : null
  let lang = door.language || config.locale || config.language || null
  if (!lang && provider === 'azure' && config.voiceName) {
    const m = String(config.voiceName).match(/^([a-z]{2,3})-[A-Za-z]{2,4}-/)
    if (m) lang = m[1]
  }
  const language = lang && lang !== 'auto' ? tryCanonicalLanguage(lang) : null
  return { language, voiceId }
}

/**
 * Pick the clip that answers this request from candidate rows, or null.
 * Pure — the rule, separate from the database, so the tests can pin it.
 *
 * @param {object[]} rows  course_audio rows (any course)
 * @param {object} want    { text, language, voiceId?, courseCode?, ownCourseOnly?, replacing?: string[], voiceBound? }
 */
function pickExistingClip(rows, want) {
  const words = normalizeForAudio(want.text)
  const excluded = new Set((want.replacing || []).filter(Boolean).map(String))
  const usable = (rows || []).filter(row =>
    row && row.s3_key &&
    !String(row.s3_key).startsWith('pending/') &&
    !excluded.has(String(row.s3_key)) && !excluded.has(String(row.id)) &&
    row.veracity_pass !== false &&
    row.text != null && normalizeForAudio(row.text) === words &&
    tryCanonicalLanguage(row.language) === want.language &&
    (!want.voiceBound || tryCanonicalVoiceId(row.voice_id) === want.voiceId) &&
    // An intro slot is answered only by its own course (Tom, 2026-08-07).
    (!want.ownCourseOnly || (want.courseCode != null && row.course_code === want.courseCode)))
  if (!usable.length) return null
  // The requested voice first — the one real preference. Then, among equals,
  // this course's own row (pointing at it writes nothing), a human take over a
  // TTS twin, and id, so the answer is deterministic. Never by role.
  const rank = row => [
    want.voiceId && tryCanonicalVoiceId(row.voice_id) === want.voiceId ? 0 : 1,
    row.course_code === want.courseCode ? 0 : 1,
    row.origin === 'human' ? 0 : 1,
  ]
  const cmp = (a, b) => {
    const ra = rank(a), rb = rank(b)
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i]
    return String(a.id).localeCompare(String(b.id))
  }
  return usable.slice().sort(cmp)[0]
}

const COLUMNS = 'id, course_code, text, language, voice_id, s3_key, origin, duration_ms, word_boundaries, word_timings, veracity_pass'

/**
 * The live library: course_audio in Supabase, bytes from S3. Created lazily so
 * requiring tts-service stays free of network setup.
 */
function supabaseClipLibrary({ supabase, s3, bucket } = {}) {
  let client = supabase
  let s3Client = s3
  const Bucket = bucket || process.env.S3_BUCKET || 'ssi-audio-stage'
  const db = () => {
    if (!client) {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
        throw new Error('TTS door: the clip library is unreachable (SUPABASE_URL / SUPABASE_SERVICE_KEY not set) — it will not render without first asking every course for the clip')
      }
      const { createClient } = require('@supabase/supabase-js')
      client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
    }
    return client
  }
  let source = null
  return {
    name: 'supabase',
    // The clip index first (services/shared/clip-index.cjs): one keyed read of
    // public.clip_index for (language, words), falling back to the paged
    // course_audio question below only when the index cannot answer.
    async resolve(want, pick) {
      if (!source) source = clipIndex.supabaseClipSource(db(), { indexedBy: 'door:write-through' })
      return clipIndex.resolveClip(source, { ...want, includeOwnCourse: true }, pick)
    },
    async candidates(text) {
      const keys = audioKeyCandidates(text)
      if (!keys.length) return []
      const out = []
      for (let page = 0; page < MAX_PAGES; page++) {
        const { data, error } = await db()
          .from('course_audio')
          .select(COLUMNS)
          .in('text_normalized', keys)
          .not('s3_key', 'like', 'pending/%')
          .order('id')
          .range(page * PAGE, page * PAGE + PAGE - 1)
        // A failed lookup must never read as "no clip exists" — that is how
        // a library outage turns into a render bill. Refuse instead.
        if (error) throw new Error(`TTS door: clip lookup failed (${error.message}) — refusing to render blind`)
        out.push(...(data || []))
        if (!data || data.length < PAGE) return out
      }
      throw new Error(`TTS door: more than ${PAGE * MAX_PAGES} clips share the words "${String(text).slice(0, 40)}" — refusing to render on a truncated lookup`)
    },
    async bytes(row) {
      if (!s3Client) {
        const { S3Client } = require('@aws-sdk/client-s3')
        s3Client = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' })
      }
      const { GetObjectCommand } = require('@aws-sdk/client-s3')
      const r = await s3Client.send(new GetObjectCommand({ Bucket, Key: row.s3_key }))
      const chunks = []
      for await (const chunk of r.Body) chunks.push(chunk)
      return Buffer.concat(chunks)
    },
  }
}

let active = null

/** The library the door asks. Tests inject one; everything else gets the live one. */
function clipLibrary() {
  if (!active) {
    if (process.env.VITEST) {
      throw new Error('TTS door: no clip library injected — tests must call useClipLibrary() (a test never reads the live course_audio)')
    }
    active = supabaseClipLibrary()
  }
  return active
}

function useClipLibrary(lib) { active = lib }

/** A library with fixed rows — for tests and dry runs over a snapshot. */
function memoryClipLibrary(rows = [], bytesFor = () => Buffer.from('existing-clip')) {
  return {
    name: 'memory',
    rows,
    async candidates(text) {
      const keys = new Set(audioKeyCandidates(text))
      const words = normalizeForAudio(text)
      return rows.filter(r => keys.has(r.text_normalized) || normalizeForAudio(r.text || '') === words)
    },
    async bytes(row) { return bytesFor(row) },
  }
}

/**
 * A library backed by a clip-index source over fixed rows — tests and dry runs
 * that must exercise the index path exactly as the live door does.
 */
function indexedMemoryClipLibrary({ index = [], rows = [], courses = [] } = {}, bytesFor = () => Buffer.from('existing-clip')) {
  const source = clipIndex.memoryClipSource({ index, rows, courses })
  return {
    name: 'memory-indexed',
    source,
    async resolve(want, pick) { return clipIndex.resolveClip(source, { ...want, includeOwnCourse: true }, pick) },
    async candidates(text) { return source.fallback(text, {}) },
    async bytes(row) { return bytesFor(row) },
  }
}

/** Look one request up. Returns the row that answers it, or null. */
async function findExistingClip(want, lib = clipLibrary()) {
  if (!want.language || (want.voiceBound && !want.voiceId)) return null
  if (typeof lib.resolve === 'function') return lib.resolve(want, rows => pickExistingClip(rows, want))
  const rows = await lib.candidates(want.text)
  return pickExistingClip(rows, want)
}

module.exports = {
  identityFromConfig,
  pickExistingClip,
  findExistingClip,
  clipLibrary,
  useClipLibrary,
  supabaseClipLibrary,
  memoryClipLibrary,
  indexedMemoryClipLibrary,
}
