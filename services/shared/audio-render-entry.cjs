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
  return {
    courseCode: String(input.courseCode),
    role: String(input.role),
    text: String(input.text),
    purpose: String(input.purpose).slice(0, 300),
    requestedBy: String(input.requestedBy).slice(0, 100),
    language: input.language ? String(input.language) : null,
    voiceId: input.voiceId ? String(input.voiceId) : null,
    legoId: input.legoId ? String(input.legoId) : null,
    dryRun: !!input.dryRun,
  }
}

/**
 * @param {object} input  { courseCode, role, text, purpose, requestedBy, language?, voiceId?, legoId?, dryRun? }
 * @param {object} deps
 *   resolve({courseCode, role, language, voiceId}) → { language, voiceId, provider, providerConfig }   (the course's cast voice unless voiceId is named)
 *   link({...req, language, voiceId})   → { audioId, s3Key, voiceId } | null   library hit linked into the course row
 *   speak(text, provider, config, maxRetries) → { audioBuffer, wordBoundaries, existingClip, charsSpent }   the ONE door
 *   store({...req, language, voiceId, audioBuffer, wordBoundaries}) → { audioId, s3Key, durationMs }   master + S3 + course_audio row + clip_index
 */
async function renderClip(input, deps) {
  const req = validate(input)
  return chain.run(`render:${req.requestedBy}`, async () => {
    const r = await deps.resolve(req)
    const ident = { ...req, language: r.language, voiceId: r.voiceId }

    // 1. library first
    const linked = await deps.link(ident)
    if (linked) return { ok: true, source: 'library', ...(req.dryRun ? { dryRun: true } : {}), charsSpent: 0, ...linked, purpose: req.purpose, requestedBy: req.requestedBy }

    const cfg = { ...r.providerConfig, door: { ...(r.providerConfig.door || {}), courseCode: req.courseCode, language: r.language, dryRun: req.dryRun } }
    // 2 + 3. the door → guard → one provider attempt
    const out = await deps.speak(req.text, r.provider, cfg, 1)
    if (req.dryRun) return { ok: true, source: out.existingClip ? 'library' : 'would-render', dryRun: true, wouldSpendChars: out.wouldSpendChars || 0, charsSpent: 0, purpose: req.purpose, requestedBy: req.requestedBy }
    if (out.existingClip) {
      // A clip appeared between our lookup and the door's own: link it, spend nothing.
      const again = await deps.link(ident)
      if (again) return { ok: true, source: 'library', charsSpent: 0, ...again, purpose: req.purpose, requestedBy: req.requestedBy }
    }
    // 4. write back
    const stored = await deps.store({ ...ident, audioBuffer: out.audioBuffer, wordBoundaries: out.wordBoundaries })
    return { ok: true, source: 'rendered', charsSpent: out.charsSpent, ...stored, purpose: req.purpose, requestedBy: req.requestedBy }
  })
}

module.exports = { renderClip, validate, RenderRequestError }
