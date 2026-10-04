/**
 * THE ONE ENTRY INTO THE POPTY AUDIO CHAIN — what any agent, worker or human
 * calls to get a line of audio made.
 *
 * Tom, 2026-09-29 00:45Z: "Single route for audio from now on. Always. Popty is
 * the only way to do it. If Kai tells his Watson to make audio, it has to use the
 * standard Popty chain itself."
 *
 * Callers never import this: they POST /api/audio/render on production Popty
 * (`node tools/audio/render.cjs`, which authenticates and prints the result). The
 * route runs `renderClip` inside the phase8 service, and that is the whole chain:
 *
 *   1. LIBRARY FIRST  the clip library is asked for these words (any voice,
 *                     every course); a hit is linked into the course row and
 *                     costs nothing — the route is idempotent, asking twice
 *                     never pays twice.
 *   2. SPEND GUARD    only on a miss, and only inside this chain marker
 *                     (services/shared/chain-context.cjs) does the door hand
 *                     the provider call a ticket; the guard then enforces the
 *                     50k-chars/day total cap, the repeat cap, provider trips
 *                     and Tom-signed exemptions (services/shared/tts-spend-guard.cjs).
 *   3. RENDER ONCE    one provider attempt (maxRetries 1). A refusal or a
 *                     failure is returned to the caller as it is; nothing here
 *                     re-rolls, and the guard never re-rolls a refusal either.
 *   4. WRITE BACK     master, S3, the course_audio row, the clip_index entry.
 *
 * Every step that touches the outside world is a dep, so the chain is testable
 * end to end without a provider. Nothing here spends a character on its own.
 */
const chain = require('./chain-context.cjs')

const REQUIRED = ['courseCode', 'role', 'text', 'purpose', 'requestedBy']

class RenderRequestError extends Error {
  constructor(message, status = 400, code = 'BAD_REQUEST') { super(message); this.status = status; this.code = code }
}

/** Refuse a malformed request before anything is looked up. */
function validate(input) {
  const missing = REQUIRED.filter(k => !input || input[k] == null || String(input[k]).trim() === '')
  if (missing.length) throw new RenderRequestError(`missing required field(s): ${missing.join(', ')} — a render says which course, which line, why, and who is asking`)
  if (String(input.text).length > 1000) throw new RenderRequestError('text longer than 1,000 characters — this is one clip, not a script')
  const out = {
    courseCode: String(input.courseCode),
    role: String(input.role),
    text: String(input.text),
    purpose: String(input.purpose).slice(0, 300),
    requestedBy: String(input.requestedBy).slice(0, 100),
    language: input.language ? String(input.language) : null,
    voiceId: input.voiceId ? String(input.voiceId) : null,
    legoId: input.legoId ? String(input.legoId) : null,
    dryRun: !!input.dryRun,
    // Answer only with a clip in THIS voice. A two-voice phrase's male and female
    // slots are told apart by voice alone; any-voice reuse files one in the other.
    // DEFAULT ON (job #944): reuse matches voice identity; only an explicit voiceBound:false opts out.
    voiceBound: input.voiceBound !== false,
    // RE-RECORD: replace this course_audio row's bytes in place (same id, next
    // audio_revision). The library is never asked to answer it.
    replaceAudioId: input.replaceAudioId ? String(input.replaceAudioId) : null,
    // What to SAY when it differs from the stored text (qualcos'altro-style
    // pronunciation fixes). The stored text is never changed by it.
    spokenText: input.spokenText ? String(input.spokenText) : null,
    // The job this render belongs to ("#913"). It rides into the spend ledger, and a
    // job Tom has approved (tools/tts-cap.cjs approve) spends from its own
    // allowance up to the 300k ceiling instead of the automatic 100k (job #913).
    job: input.job ? String(input.job).slice(0, 100) : null,
  }
  if (out.job && !/#\d+/.test(out.job)) throw new RenderRequestError('job names the job the way the estate writes it, e.g. "#913"')
  if (out.spokenText && !out.replaceAudioId) throw new RenderRequestError('spokenText only applies to a re-record — name replaceAudioId')
  if (out.spokenText && out.spokenText.length > 1000) throw new RenderRequestError('spokenText longer than 1,000 characters — this is one clip, not a script')
  return out
}

/**
 * @param {object} input  { courseCode, role, text, purpose, requestedBy, language?, voiceId?, legoId?, dryRun? }
 * @param {object} deps
 *   resolve({courseCode, role, language, voiceId}) → { language, voiceId, provider, providerConfig }   (the course's cast voice unless voiceId is named)
 *   link({...req, language, voiceId})   → { audioId, s3Key, voiceId } | null   library hit linked into the course row
 *   speak(text, provider, config, maxRetries) → { audioBuffer, wordBoundaries, existingClip, charsSpent }   the ONE door
 *   store({...req, language, voiceId, audioBuffer, wordBoundaries}) → { audioId, s3Key, durationMs }   master + S3 + course_audio row + clip_index
 *   linkLego({courseCode, legoId, audioId}) → { linked, previous }   optional; presentation role + legoId only, never in a dry run
 * Re-record only (replaceAudioId):
 *   loadClip(audioId) → { id, course_code, role, language, voice_id, s3_key, origin } | null
 *   replace({...ident, replaceAudioId, s3Key?, audioBuffer?, wordBoundaries?}) → { audioId, s3Key, durationMs, revision }
 *        make-before-break: master + upload the new object (or take an existing library clip's key), verify it is
 *        alive, THEN swap the row onto it (versioned). The old object is retained, never deleted here.
 */
/**
 * A presentation clip is only heard when course_legos.presentation_audio_id points
 * at it, so a presentation render that names its LEGO binds it itself (job #394·J
 * had to link 43 by hand). Repoint only — the previous clip is never deleted.
 */
async function bindPresentation(req, result, deps) {
  if (req.role !== 'presentation' || !req.legoId || req.dryRun || !deps.linkLego || !result.audioId) return result
  const { linked } = await deps.linkLego({ courseCode: req.courseCode, legoId: req.legoId, audioId: result.audioId })
  return { ...result, legoLinked: !!linked }
}

async function renderClip(input, deps) {
  const req = validate(input)
  return chain.run(`render:${req.requestedBy}`, async () => {
    if (req.replaceAudioId) return rerecord(req, deps)
    const r = await deps.resolve(req)
    const ident = { ...req, language: r.language, voiceId: r.voiceId }

    // 1. library first
    const linked = await deps.link(ident)
    if (linked) return bindPresentation(req, { ok: true, source: 'library', ...(req.dryRun ? { dryRun: true } : {}), charsSpent: 0, ...linked, purpose: req.purpose, requestedBy: req.requestedBy }, deps)

    const cfg = { ...r.providerConfig, door: { ...(r.providerConfig.door || {}), courseCode: req.courseCode, language: r.language, dryRun: req.dryRun, voiceBound: req.voiceBound, job: req.job } }
    // 2 + 3. the door → guard → one provider attempt
    const out = await deps.speak(req.text, r.provider, cfg, 1)
    if (req.dryRun) return { ok: true, source: out.existingClip ? 'library' : 'would-render', dryRun: true, wouldSpendChars: out.wouldSpendChars || 0, charsSpent: 0, purpose: req.purpose, requestedBy: req.requestedBy }
    if (out.existingClip) {
      // A clip appeared between our lookup and the door's own: link it, spend nothing.
      const again = await deps.link(ident)
      if (again) return bindPresentation(req, { ok: true, source: 'library', charsSpent: 0, ...again, purpose: req.purpose, requestedBy: req.requestedBy }, deps)
    }
    // 4. write back
    const stored = await deps.store({ ...ident, audioBuffer: out.audioBuffer, wordBoundaries: out.wordBoundaries, wordTimings: out.wordTimings || null })
    return bindPresentation(req, { ok: true, source: 'rendered', charsSpent: out.charsSpent, ...stored, purpose: req.purpose, requestedBy: req.requestedBy }, deps)
  })
}

/**
 * Re-record one named clip in its OWN voice. The voice is the row's, never the
 * course cast's, so a male slot is re-recorded male. The row is refused when it
 * belongs to another course, or is a human recording (precious).
 */
async function rerecord(req, deps) {
  const row = await deps.loadClip(req.replaceAudioId)
  if (!row) throw new RenderRequestError(`no course_audio row ${req.replaceAudioId}`, 404, 'NO_CLIP')
  if (row.course_code !== req.courseCode) throw new RenderRequestError(`${req.replaceAudioId} belongs to ${row.course_code}, not ${req.courseCode}`, 409, 'WRONG_COURSE')
  if (row.origin === 'human') throw new RenderRequestError(`${req.replaceAudioId} is a human recording — never re-rendered over`, 409, 'HUMAN_CLIP')
  if (req.role !== row.role) throw new RenderRequestError(`${req.replaceAudioId} is a ${row.role} clip, request said ${req.role}`, 409, 'WRONG_ROLE')
  if (req.voiceId && req.voiceId !== row.voice_id) throw new RenderRequestError(`a re-record keeps the clip's own voice (${row.voice_id}); voiceId ${req.voiceId} differs`, 409, 'VOICE_MISMATCH')
  const said = req.spokenText || req.text
  const r = await deps.resolve({ ...req, language: row.language, voiceId: row.voice_id })
  const ident = { ...req, language: r.language, voiceId: r.voiceId }
  // voiceBound + replacing: the door can only answer with a same-voice clip other than the one being replaced.
  const cfg = { ...r.providerConfig, door: { ...(r.providerConfig.door || {}), courseCode: req.courseCode, language: r.language, dryRun: req.dryRun, voiceBound: true, replacing: [row.s3_key], job: req.job } }
  const out = await deps.speak(said, r.provider, cfg, 1)
  const echo = { purpose: req.purpose, requestedBy: req.requestedBy, replaceAudioId: row.id, spoken: said }
  if (req.dryRun) return { ok: true, source: out.existingClip ? 'library' : 'would-render', dryRun: true, wouldSpendChars: out.wouldSpendChars || 0, charsSpent: 0, ...echo }
  const swapped = out.existingClip
    ? await deps.replace({ ...ident, replaceAudioId: row.id, s3Key: out.existingClip.s3_key, wordBoundaries: out.wordBoundaries || null, wordTimings: out.wordTimings || null })   // the row now points at the library clip's bytes, so it takes that clip's timings with it
    : await deps.replace({ ...ident, replaceAudioId: row.id, audioBuffer: out.audioBuffer, wordBoundaries: out.wordBoundaries, wordTimings: out.wordTimings || null })
  return { ok: true, source: out.existingClip ? 'library' : 'rendered', charsSpent: out.charsSpent, ...swapped, ...echo }
}

/**
 * The language a role natively speaks in a course. Presentation clips are
 * known-language audio, so presentation resolves to the known side with 'known';
 * target1/target2 stay target-language and keep the cast gate's full strictness.
 */
function roleNativeLanguage(role, course) {
  return role === 'known' || role === 'presentation' ? course.known_lang : course.target_lang
}

/** The course_audio patch a re-record writes. Timings only when supplied. Note swapClipInPlace nulls word_timings unless the patch brings them (they describe bytes), so every branch that moves s3_key must supply the new bytes' timings. */
function rerecordPatch({ voiceId, wordBoundaries, wordTimings }) {
  return { origin: 'tts', voice_id: voiceId, ...(wordBoundaries !== undefined && { word_boundaries: wordBoundaries || null }), ...(wordTimings !== undefined && { word_timings: wordTimings || null }) }
}

module.exports = { rerecordPatch, roleNativeLanguage, renderClip, validate, RenderRequestError }
