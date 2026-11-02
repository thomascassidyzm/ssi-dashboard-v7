/**
 * A LINE THAT IS ALREADY RECORDED IN ITS LANGUAGE IS NEVER RENDERED AGAIN — the per-language stop on the one
 * render route (job #352, 2026-11-02).
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
 *   - this course's own two-voice partner: a phrase's target1 and target2 seats speak the same words in two voices
 *     by design (drill-cut-guard.cjs says the same), so the other seat of the SAME course is not a prior recording
 *     of this seat;
 *   - a presentation (intro) slot: "intros ALWAYS rendered fresh, never reused" (Tom 2026-08-07) — and a
 *     shared-role or trial render, which never reaches this guard (trials are stored apart from every course and
 *     link nothing: audio-trial-mode.cjs).
 *
 * THE ONE WAY PAST IT is the route's existing re-record authority, nothing new: a Tom-signed
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
 * @param {{ voiceId, courseCode, role }} slot
 */
function priorRecordings(found, { voiceId, courseCode, role }) {
  if (!guardsSlot(role)) return []
  return (found || []).filter(c =>
    !sameVoice(c.voice_id, voiceId) &&
    !(c.course_code === courseCode && TWO_SEATS.has(role) && TWO_SEATS.has(c.role) && c.role !== role))
}

/** The 409 refusal naming every existing clip (id, voice, course, side), or null. */
function existsInLanguageRefusal(found, { voiceId, courseCode, role, language, text }) {
  const prior = priorRecordings(found, { voiceId, courseCode, role })
  if (!prior.length) return null
  const existing = prior.slice(0, 20).map(c => ({ audioId: c.id, voiceId: c.voice_id, courseCode: c.course_code, side: c.role || null }))
  const named = existing.map(e => `${e.audioId} (voice ${e.voiceId}, ${e.courseCode} ${e.side || '?'})`).join('; ')
  const message = `"${String(text).slice(0, 60)}" is already recorded in ${language} — ${prior.length} clip(s): ${named}${prior.length > existing.length ? ' …' : ''}. ` +
    `Recordings are per language: link an existing clip (POST /api/production/${courseCode}/link-clip), or take the voice question to a person. ` +
    `A second performance in ${voiceId} needs a re-record grant for ${courseCode} ${role} (Tom's tts_rerecord_permissions row, or Kai's approval token) — do not retry or route around this.`
  return { status: 409, code: EXISTS_IN_LANGUAGE, message, existing }
}

module.exports = { EXISTS_IN_LANGUAGE, existsInLanguageRefusal, priorRecordings, guardsSlot, sameVoice }
