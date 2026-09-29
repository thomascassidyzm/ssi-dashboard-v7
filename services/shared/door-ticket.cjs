/**
 * PROOF OF LOOKUP — the ticket the spend guard demands before any paid TTS call.
 *
 * Tom, 2026-09-28 23:41Z: "I spent an evening building a proper clips library and
 * … the code is not using it, or something is not referencing it … it's a licence
 * to spank money on stuff." The library (public.clip_index + course_audio, read by
 * services/shared/clip-library.cjs) was already asked by the one TTS door; what
 * nothing ENFORCED was that a paid call had been preceded by that question. The
 * spend guard counted money and repeats, but would reserve for any caller that
 * reached it — a door that forgot to look, or a second door that never did
 * (google-tts-service, the bake-off's httpSynthesise), paid all the same.
 *
 * So a ticket is issued in exactly one place — clip-library.lookupForRender(),
 * after it has asked the library for (language, words, voice) — and
 * tts-spend-guard.beforeProviderCall() refuses without one. The ticket carries:
 *
 *   language, voiceKey, textKey   what was looked up (clip-index keys);
 *   inLibrary                     the usable clips IN THE SAME VOICE the lookup
 *                                 saw and the caller is NOT replacing — the guard
 *                                 refuses a render whenever this is non-empty, so
 *                                 a planted duplicate (a door whose pick is wrong)
 *                                 is refused by the guard, not merely unpicked;
 *   replacing                     what a regenerate named as the take it replaces;
 *   issuedAt                      a ticket is good for TICKET_TTL_MS, one render.
 *
 * Tickets are registered in a module-private WeakSet, so a hand-built object with
 * the same fields is not a ticket. This is proof that the lookup RAN in this
 * process, not a secret: code that calls lookupForRender has, by construction,
 * asked the library — which is the whole point. A script that fetches a provider
 * with no guard at all is caught by tools/check-tts-door.cjs, not here.
 */

const { clipTextKey } = require('./clip-index.cjs')
const { tryCanonicalVoiceId } = require('./clip-identity.cjs')
const chain = require('./chain-context.cjs')

/** A lookup older than this is not evidence about the library now. */
const TICKET_TTL_MS = 15 * 60 * 1000

const issued = new WeakSet()

/** The voice as both sides compare it: canonical where it can be named, else as given. */
function voiceKey(v) {
  if (v == null || v === '') return null
  return tryCanonicalVoiceId(v) || String(v)
}

/**
 * Issue a ticket. Called ONLY by clip-library.lookupForRender — the check-tts-door
 * gate fails the run if any other file calls it.
 */
function issueTicket({ language, voiceId, text, inLibrary = [], replacing = [], now = Date.now() }) {
  // One route for audio (Tom 2026-09-29): no ticket, so no paid call, outside the Popty chain.
  if (!chain.inChain()) return null
  const t = Object.freeze({
    language: language || null,
    voiceKey: voiceKey(voiceId),
    textKey: clipTextKey(text),
    inLibrary: Object.freeze((inLibrary || []).map(r => Object.freeze({ id: r.id, course_code: r.course_code || null, voice_id: r.voice_id || null, s3_key: r.s3_key || null }))),
    replacing: Object.freeze([].concat(replacing || []).filter(Boolean).map(String)),
    issuedAt: now,
  })
  issued.add(t)
  return t
}

/**
 * Why this ticket does NOT license this provider call, or null when it does.
 * Returns { code, message } — the guard turns it into a refusal.
 */
function ticketProblem(ticket, { voiceId, text, now = Date.now() }) {
  if (!ticket && !chain.inChain()) return { code: 'NOT_IN_CHAIN', message: 'this render did not come through the one Popty audio chain — call POST /api/audio/render (node tools/audio/render.cjs …), never a provider or tts-service directly' }
  if (!ticket) return { code: 'NO_DOOR', message: 'no proof of a clip-library lookup came with this call — every paid render must first ask the library (services/shared/clip-library.cjs lookupForRender)' }
  if (typeof ticket !== 'object' || !issued.has(ticket)) return { code: 'NO_DOOR', message: 'the ticket on this call was not issued by the clip-library lookup — a hand-made ticket proves nothing' }
  if (now - ticket.issuedAt > TICKET_TTL_MS) return { code: 'NO_DOOR', message: `the clip-library lookup behind this call is ${Math.round((now - ticket.issuedAt) / 60000)} minutes old — look again` }
  if (ticket.textKey !== clipTextKey(text)) return { code: 'NO_DOOR', message: `the lookup was for other words ("${ticket.textKey.slice(0, 40)}") than the ones being sent ("${clipTextKey(text).slice(0, 40)}")` }
  if (ticket.voiceKey !== voiceKey(voiceId)) return { code: 'NO_DOOR', message: `the lookup was for voice ${ticket.voiceKey}, not ${voiceKey(voiceId)}` }
  if (ticket.inLibrary.length) {
    const c = ticket.inLibrary[0]
    return { code: 'IN_LIBRARY', message: `these words are already in the clip library in this voice (${c.voice_id}, clip ${c.id}${c.course_code ? `, ${c.course_code}` : ''}${ticket.inLibrary.length > 1 ? `, +${ticket.inLibrary.length - 1} more` : ''}) — link it; a regenerate must name the take it replaces` }
  }
  return null
}

module.exports = { issueTicket, ticketProblem, voiceKey, TICKET_TTL_MS }
