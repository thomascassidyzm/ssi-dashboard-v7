/**
 * ONE-SLOT VOICE EXCEPTIONS: a named slot that may hold a voice other than the one resolveVoice rules for it.
 *
 * resolveVoice (./resolve-voice.cjs) answers a voice per (course, role) and both voice checks refuse anything else:
 * the render route (services/phases/phase8-audio-v13.cjs, VOICE_POLICY) and link-clip (./link-clip.cjs, VOICE_MISMATCH).
 * This list is the ONLY way past them, and it is deliberately narrow: each entry names ONE course, ONE slot (a LEGO id),
 * ONE role and ONE voice, with the ruling that allowed it. There is no wildcard, no course-wide entry and no flag that
 * turns the checks off. A slot not listed here — every other slot in the estate — is checked exactly as before.
 *
 * Adding an entry needs a person's ruling for that one slot; quote it in `ruling`.
 */
const { sameVoice } = require('./resolve-voice.cjs')

const EXCEPTIONS = Object.freeze([
  // swe_for_eng's intros are Charlotte (resolveVoice rule intro-charlotte). Kai ruled 2026-11-11 14:44Z (job #205·AH,
  // following #203·AH's VOICE_POLICY refusal) that the intro of S0059L02 alone — "The Swedish for: 'does', is:" — is
  // rendered in Tom-006 with 'does' said "duz" (the IPA rule in ./pronunciation-overrides.cjs swe_for_eng).
  Object.freeze({
    courseCode: 'swe_for_eng',
    legoId: 'S0059L02',
    role: 'presentation',
    voiceId: 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9', // Tom-006
    ruling: 'Kai 2026-11-11 14:44Z, job #205·AH: S0059L02 intro only, Tom-006',
  }),
  // spa_for_eng's intros are Charlotte splices. Kai ruled 2026-11-11 15:03Z (job #212·AH) that the intro of S0182L04
  // alone — "The Spanish for: 'anywhere', as in — 'have you seen my keys anywhere?', is:" (the as-in that shows
  // en algún sitio's question sense) — is rendered whole in Tom-006, as for swe S0059L02, not spliced.
  Object.freeze({
    courseCode: 'spa_for_eng',
    legoId: 'S0182L04',
    role: 'presentation',
    voiceId: 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9', // Tom-006
    ruling: 'Kai 2026-11-11 15:03Z, job #212·AH: S0182L04 intro only, Tom-006',
  }),
])

/** The exception that lets `voiceId` into this one slot, or null (the normal voice check applies). */
function slotVoiceException({ courseCode, legoId, role, voiceId }, list = EXCEPTIONS) {
  if (!courseCode || !legoId || !role || !voiceId) return null
  return list.find((e) => e.courseCode === String(courseCode) && e.legoId === String(legoId)
    && e.role === String(role) && sameVoice(e.voiceId, voiceId)) || null
}

module.exports = { EXCEPTIONS, slotVoiceException }
