/**
 * ARAN'S CLONE AS A STAND-IN FOR HIS OWN ENGLISH, on the two new Welsh courses only.
 *
 * RULING, Aran (Welsh methodology lead), 2026-10-29 14:41Z, job #557: fill every English KNOWN slot of
 * cym_nv2_for_eng and cym_sv2_for_eng that has no real Aran take with his own Cartesia clone,
 * aran_english_003 (cartesia_33890587-a29f-4416-ba61-2615c74f92fe, an owned clone of his voice), and let
 * each real booth take REPLACE the clone clip as it lands, make-before-break.
 *
 * Why this does not reopen the human-voice rule (services/shared/human-voice-courses.cjs): every reason
 * that rule gives is about the WELSH side ("a synthesised Welsh clip reaching a learner is a defect"), and
 * Tom already narrowed it for the English known side on 2026-09-03 ("the English lines will be TTS,
 * because it is fast and cheap" — tts-service.isKnownSideOfHumanVoiceCourse). The Welsh-no-Tom-clone
 * hard rule (welsh-no-tom-clone.cjs, 2026-10-13) is untouched: this voice is Aran's, not Tom's.
 *
 * NARROW BY CONSTRUCTION — this is the ONE definition, and every guard asks it rather than carving its own:
 *   - two course codes, listed here; the live cym_n_for_eng / cym_s_for_eng and every other cym_* course
 *     are NOT in it, so they stay exactly as human-only as before;
 *   - the 'known' role only: target1/target2 (Welsh) and presentation (intros, spliced from Aran's own
 *     takes — job #210) are refused as before;
 *   - English only: a known-role call that names any other language is refused (silence is resolved to
 *     the role's own side, English, by the caller — never treated as permission here);
 *   - one voice: STANDIN_VOICE below. Nothing else may be cast there by this rule.
 * Pod lines are not course slots and never reach this (the render route takes course slots only).
 */

const ARAN_ENGLISH_CLONE = 'cartesia_33890587-a29f-4416-ba61-2615c74f92fe' // aran_english_003 (instant clone)

/**
 * THE SWITCH — the one voice that stands in. Aran 2026-10-29 14:46Z: HOLD the fill; Tom is having a Cartesia PRO
 * clone of Aran built (Tom's Watson job #560·AA) and the fill uses whichever voice Aran and Tom pick from its
 * side-by-side. To switch: put the chosen voice here (provider-prefixed, e.g. 'cartesia_<uuid>'), make sure it is
 * a consented, registered owned clone (the TTS consent gate refuses anything else), and nothing else changes —
 * resolveVoice, the render door and the booth's take-replaces-stand-in rule all read this value.
 */
const STANDIN_VOICE = ARAN_ENGLISH_CLONE
const ARAN_CLONE_STANDIN_COURSES = Object.freeze(['cym_nv2_for_eng', 'cym_sv2_for_eng'])
const RULING = 'Aran 2026-10-29 14:41Z (job #557): his own clone (STANDIN_VOICE) stands in on the nv2/sv2 English known side until his real take replaces it'

const bare = (v) => String(v || '').trim().toLowerCase().replace(/^(cartesia|xai|elevenlabs|azure)_/, '')
const isEnglish = (lang) => ['eng', 'en'].includes(String(lang || '').trim().toLowerCase().split(/[-_]/)[0])
const codeOf = (course) => (course && typeof course === 'object' ? course.course_code : course)

/** Is this course one of the two stand-in courses? */
function isCloneStandInCourse(course) {
  return ARAN_CLONE_STANDIN_COURSES.includes(String(codeOf(course) || ''))
}

/**
 * May the clone speak this slot? Only course ∈ the two, role 'known', language English (stated).
 * @param {{courseCode?:string, course?:object, role:string, language:string}} slot
 */
function isCloneStandInSlot({ courseCode, course, role, language } = {}) {
  return isCloneStandInCourse(courseCode || course) && role === 'known' && isEnglish(language)
}

/** Is this voice id the stand-in voice (any provider-prefix spelling)? */
function isStandInVoice(voiceId) {
  return !!voiceId && bare(voiceId) === bare(STANDIN_VOICE)
}

/**
 * Is a clip in this slot a STAND-IN a real take may replace? The clone's clip, in a stand-in course's
 * known slot. Anything else — a human take, another synthetic voice, any other course — is not.
 */
function isReplaceableStandIn({ courseCode, role, voiceId }) {
  return isCloneStandInCourse(courseCode) && role === 'known' && isStandInVoice(voiceId)
}

module.exports = {
  ARAN_ENGLISH_CLONE,
  ARAN_CLONE_STANDIN_COURSES,
  RULING,
  isCloneStandInCourse,
  isCloneStandInSlot,
  isStandInVoice,
  STANDIN_VOICE,
  isReplaceableStandIn,
}
