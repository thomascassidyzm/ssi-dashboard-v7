/**
 * THE IN-TRAY OF THE POPTY AUDIO CHAIN — "add a recording" (job #703).
 *
 * Tom, 2026-09-29 00:49Z: "human recordings are tracked as named voices (voice
 * artist, language/dialect, gender, text) and enter the SAME library through an
 * 'add a recording' in-tray that is part of the one Popty chain."
 *
 * It is the human twin of services/shared/audio-render-entry.cjs: callers never
 * import it, they POST /api/audio/add-recording on production Popty
 * (`node tools/audio/add-recording.cjs`, which authenticates and prints the
 * result). The route runs `addRecording` inside the chain, and that is the whole
 * door:
 *
 *   1. NAME       the recording says whose voice it is: an artist already in the
 *                 voices registry (voice id or name), or a `register` block that
 *                 adds one. Its gender and language/dialect must agree with the
 *                 registry — a Southern take is refused into a Northern artist,
 *                 never filed and fixed later.
 *   2. LIBRARY    if the library already holds these words in this artist's
 *                 voice, that clip is the answer and nothing is stored twice.
 *   3. STORE      the ONE human-take path the recording booth uses (raw take
 *                 archived first, then processed, S3, course_audio, provenance),
 *                 filed under the artist's own voice id — never a slot's cast.
 *   4. INDEX      the clip goes into public.clip_index under the artist's name
 *                 and the words as written, so the next lookup finds it.
 *
 * Nothing here spends a character of TTS; a human take is bytes, not a render.
 * Every step that touches the outside world is a dep, so the door is testable
 * without a database or an audio file.
 */
const chain = require('./chain-context.cjs')
const { tryCanonicalLanguage } = require('./clip-identity.cjs')

class IntakeError extends Error {
  constructor(message, status = 400, code = 'BAD_REQUEST', extra = {}) { super(message); this.status = status; this.code = code; this.extra = extra }
}

const REQUIRED = ['text', 'audio', 'purpose', 'requestedBy']

function validate(input) {
  const missing = REQUIRED.filter(k => !input || input[k] == null || String(input[k]).trim() === '')
  if (!input || (!input.artist && !input.register)) missing.push('artist (or register)')
  if (missing.length) throw new IntakeError(`missing required field(s): ${missing.join(', ')} — a recording says whose voice it is, what the words are, why it is being added and who is adding it`)
  if (String(input.text).length > 1000) throw new IntakeError('text longer than 1,000 characters — this is one clip, not a script')
  if (input.gender != null && !['f', 'm'].includes(input.gender)) throw new IntakeError('gender is f or m — or leave it out')
  return {
    artist: input.artist ? String(input.artist).trim() : null,
    register: input.register || null,
    text: String(input.text).trim(),
    audio: input.audio,
    mimeType: input.mimeType ? String(input.mimeType) : 'audio/webm',
    purpose: String(input.purpose).slice(0, 300),
    requestedBy: String(input.requestedBy).slice(0, 100),
    language: input.language ? String(input.language) : null,
    gender: input.gender || null,
    courseCode: input.courseCode ? String(input.courseCode) : null,
    role: input.role ? String(input.role) : null,
    replace: !!input.replace,
  }
}

/** The clip-language key a request names ('cym_n', 'cym', 'es-MX'), reduced to its base for comparison. */
const baseOf = key => tryCanonicalLanguage(String(key || '').split('_')[0]) || tryCanonicalLanguage(key)

/**
 * @param {object} input  { artist | register, text, audio (base64), mimeType?, purpose, requestedBy, language?, gender?, courseCode?, role?, replace? }
 *                        register: { name, gender?: 'f'|'m', clip_language, dialect?, language? } — adds a NEW artist
 * @param {object} deps
 *   findArtist(nameOrId)     → [{ voice_id, human_name, gender, clip_language, dialect }]   (0, 1 or several)
 *   registerArtist(register) → the registered artist
 *   homeCourse(clipLanguage, courseCode?) → { course_code, target_lang, known_lang }   the course the clip is filed in
 *   libraryHas({ language, text, voiceId }) → { audioId } | null
 *   store({ courseCode, role, text, voiceId, artist, audio, mimeType, requestedBy })  → { audioId, s3Key, durationMs, filing }
 *   index(audioId)           → number of index entries written
 */
async function addRecording(input, deps) {
  const req = validate(input)
  return chain.run(`intake:${req.requestedBy}`, async () => {
    // 1. NAME
    let artist
    if (req.artist) {
      const found = await deps.findArtist(req.artist)
      if (found.length > 1) throw new IntakeError(`"${req.artist}" names ${found.length} artists — say which by voice id: ${found.map(f => f.voice_id).join(', ')}`, 409, 'AMBIGUOUS_ARTIST')
      artist = found[0]
      if (!artist && !req.register) throw new IntakeError(`no artist "${req.artist}" in the voices registry — add them with a register block { name, gender, clip_language, dialect } or pick an existing artist`, 404, 'UNKNOWN_ARTIST')
    }
    if (!artist) {
      const r = req.register
      if (!r || !r.name || !r.clip_language) throw new IntakeError('register needs at least { name, clip_language } — the artist\'s name and the language key their clips carry (cym_n, cym_s, deu_at…)')
      if (r.gender != null && !['f', 'm'].includes(r.gender)) throw new IntakeError('register.gender is f or m — or leave it out; it is never inferred from a name')
      artist = await deps.registerArtist(r)
    }
    if (req.gender && artist.gender && req.gender !== artist.gender) throw new IntakeError(`${artist.human_name} is registered as gender ${artist.gender}, this recording says ${req.gender}`, 409, 'GENDER_MISMATCH')
    if (req.language) {
      const same = req.language.includes('_') ? req.language === artist.clip_language : baseOf(req.language) === baseOf(artist.clip_language)
      if (!same) throw new IntakeError(`${artist.human_name} records ${artist.clip_language}; this recording says ${req.language} — a different dialect is a different language here`, 409, 'LANGUAGE_MISMATCH')
    }

    // 2. LIBRARY
    const course = await deps.homeCourse(artist.clip_language, req.courseCode)
    const held = await deps.libraryHas({ language: artist.clip_language, text: req.text, voiceId: artist.voice_id })
    if (held && !req.replace) {
      return { ok: true, source: 'library', filed: false, audioId: held.audioId, voiceId: artist.voice_id, artist: artist.human_name, language: artist.clip_language, purpose: req.purpose, requestedBy: req.requestedBy }
    }

    // 3. STORE — the booth's own path, under the artist's voice
    const role = req.role || (baseOf(course.known_lang) === baseOf(artist.clip_language) ? 'known' : 'target1')
    const stored = await deps.store({ courseCode: course.course_code, role, text: req.text, voiceId: artist.voice_id, artist, audio: req.audio, mimeType: req.mimeType, requestedBy: req.requestedBy })
    if (!stored || !stored.audioId) throw new IntakeError(`the recording was saved but not filed as a clip${stored && stored.filing && stored.filing.message ? ': ' + stored.filing.message : ''}`, 502, 'NOT_FILED', { stored })

    // 4. INDEX
    const indexed = await deps.index(stored.audioId)
    return { ok: true, source: 'recorded', filed: true, audioId: stored.audioId, s3Key: stored.s3Key || null, durationMs: stored.durationMs || null, courseCode: course.course_code, role, voiceId: artist.voice_id, artist: artist.human_name, language: artist.clip_language, indexed, charsSpent: 0, purpose: req.purpose, requestedBy: req.requestedBy }
  })
}

module.exports = { addRecording, validate, IntakeError }
