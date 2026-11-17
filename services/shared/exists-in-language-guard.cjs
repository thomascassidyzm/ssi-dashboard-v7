/**
 * A LINE ALREADY RECORDED IN ITS LANGUAGE IS NOT RE-PERFORMED IN AN OFF-CAST VOICE — the per-language stop on the
 * one render route (job #352, 2026-11-02; narrowed to caller-named voices by job #446, 2026-11-17).
 *
 * Recordings are per LANGUAGE, not per course (Tom 2026-09-13; 2026-11-02: "pods are done by language, not by
 * course — once we have Japanese, we have it as both target and known languages"). The route is library-first,
 * but voice-bound (job #303: no slot plays another slot's voice), so a clip of the same words in the same language
 * in ANOTHER voice — another course, the known side of some course — used to fall straight through to a paid
 * render: a second performance and a second voice for a line the estate already has. This refuses it
 * (409 EXISTS_IN_LANGUAGE) and names every existing clip, so the caller can link one, or take the casting/voice
 * question to a person. The refusal is the answer: nothing here links another voice's clip into a slot by itself.
 *
 * NOT refused, deliberately:
 *   - a clip in THIS voice: library-first already linked it (or the door will);
 *   - a render in the slot's CAST VOICE OF RECORD (job #446, Kai 2026-11-17): clips are keyed language + text + VOICE
 *     and coverage is counted per language per voice (r-2026-10-17-ssi-audio-architecture-clips-keyed-language), so a
 *     line missing in the cast voice is a coverage gap in that voice, and filling it is expected
 *     (r-2026-10-14-never-re-render-applies-only-to; r-2026-10-29-tom-006-stays-the-english-known: Tom-006 is the
 *     English known voice in every course). Other voices' clips are a learner preference played where they exist
 *     (r-2026-10-15-ssi-learners-may-pick-a-preferred) — not a reason to leave the cast voice silent. So the stop
 *     bites only when the CALLER NAMED a voice of its own (req.voiceId) — a second, off-cast performance of a line
 *     the estate already has, which is what #352 was built to stop (mem:recordings-per-language-pointer-ids;
 *     r-2026-10-26-pod-audio-is-per-language-a). The specimen: fry_for_eng known "I can speak with you" — cast
 *     Tom-006 — was refused for three azure_en-GB-SoniaNeural clips in other courses (#428), ~1,400 cues silent. Pod lines
 *     (podSentenceId) and a caller who names even the cast voice explicitly keep the full stop (conservative);
 *   - this course's own two-voice partner: a phrase's target1 and target2 seats speak the same words in two voices
 *     by design (drill-cut-guard.cjs says the same), so the other seat of the SAME course is not a prior recording
 *     of this seat;
 *   - a presentation (intro) slot: "intros ALWAYS rendered fresh, never reused" (Tom 2026-08-07) — and a
 *     shared-role or trial render, which never reaches this guard (trials are stored apart from every course and
 *     link nothing: audio-trial-mode.cjs).
 *
 * THE ONE WAY PAST IT (for a caller-named voice) is the route's existing re-record authority, nothing new: a Tom-signed
 * tts_rerecord_permissions row covering this course + role (rerecord-gate.cjs permissionCovers — e.g. #343's
 * scene-21 grants), or Kai's `kai:YYYY-MM-DD:<reason>` approval token on the request
 * (r-2026-10-30-kai-can-authorise-any-audio-work). Anything else is refused, dry run included, so a costing pass
 * sees it too.
 *
 * Pure rule here; the lookup is clip-library.cjs existingClipsInLanguage, wired in phase8 buildRenderDeps.
 */
const { tryCanonicalVoiceId } = require('./clip-identity.cjs')
const { bareVoiceId } = require('./relink-voice-guard.cjs')

const EXISTS_IN_LANGUAGE = 'EXISTS_IN_LANGUAGE'
const TWO_SEATS = new Set(['target1', 'target2'])

function sameVoice(a, b) {
  if (!a || !b) return false
  if (a === b) return true
  const ca = tryCanonicalVoiceId(a), cb = tryCanonicalVoiceId(b)
  if (ca && cb && ca === cb) return true
  return bareVoiceId(a) === bareVoiceId(b)
}

/** Does this slot take part in the per-language stop at all? */
function guardsSlot(role) {
  return role !== 'presentation'
}

/**
 * The clips that make this render a second performance, or [] when it may go ahead.
 * @param {object[]} found  existingClipsInLanguage rows
 * @param {{ voiceId, courseCode, role, castVoice? }} slot  castVoice: true when the route resolved voiceId from the
 *   course's cast (no voiceId named by the caller) — see the header; a cast-voice render is a coverage fill, never refused.
 */
function priorRecordings(found, { voiceId, courseCode, role, castVoice = false }) {
  if (!guardsSlot(role)) return []
  // CAST VOICE FILLS ITS OWN GAP (job #446): r-2026-10-17 keys clips on voice, r-2026-10-14 / r-2026-10-29 make the
  // cast-voice fill expected; only a caller-named off-cast voice is a second performance (09-13 memory, 10-26 ruling).
  if (castVoice) return []
  return (found || []).filter(c =>
    !sameVoice(c.voice_id, voiceId) &&
    !(c.course_code === courseCode && TWO_SEATS.has(role) && TWO_SEATS.has(c.role) && c.role !== role))
}

/** The 409 refusal naming every existing clip (id, voice, course, side), or null. */
function existsInLanguageRefusal(found, { voiceId, courseCode, role, language, text, castVoice = false }) {
  const prior = priorRecordings(found, { voiceId, courseCode, role, castVoice })
  if (!prior.length) return null
  const existing = prior.slice(0, 20).map(c => ({ audioId: c.id, voiceId: c.voice_id, courseCode: c.course_code, side: c.role || null }))
  const named = existing.map(e => `${e.audioId} (voice ${e.voiceId}, ${e.courseCode} ${e.side || '?'})`).join('; ')
  const message = `"${String(text).slice(0, 60)}" is already recorded in ${language} — ${prior.length} clip(s): ${named}${prior.length > existing.length ? ' …' : ''}. ` +
    `Recordings are per language: link an existing clip (POST /api/production/${courseCode}/link-clip), or take the voice question to a person. ` +
    `A second performance in ${voiceId} needs a re-record grant for ${courseCode} ${role} (Tom's tts_rerecord_permissions row, or Kai's approval token sent from a Kai-seat conversation with its x-cs-conv header) — do not retry or route around this.`
  return { status: 409, code: EXISTS_IN_LANGUAGE, message, existing }
}

module.exports = { EXISTS_IN_LANGUAGE, existsInLanguageRefusal, priorRecordings, guardsSlot, sameVoice }
