/**
 * ARAN'S CLONE AS A STAND-IN FOR HIS OWN ENGLISH, on the two new Welsh courses only.
 *
 * RULING, Aran (Welsh methodology lead), 2026-10-29 14:41Z, job #557: fill every English KNOWN slot of
 * cym_nv2_for_eng and cym_sv2_for_eng that has no real Aran take with his own Cartesia clone (STANDIN_VOICE —
 * since 2026-11-03 his PRO clone; first the instant clone aran_english_003), and let
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
 * Aran's Cartesia PROFESSIONAL clone, "Aran PRO (cym_n archive) 2026-10-29 - V0": fine-tuned on his archive English
 * takes by Tom's job #560 (branch cs/560-aran-pvc, ops/pvc-560/pvc.json — every PVC render on the comparison page is
 * this id). Tom judged it on that page "much more authentic, sounds like Aran"; Aran picked it 2026-11-03 (job #568).
 */
const ARAN_ENGLISH_PRO_CLONE = 'cartesia_5b7a17f4-3850-4dee-ab54-2967a9c042ef'

/**
 * THE SWITCH — the one voice that stands in. Aran 2026-10-29 14:46Z: HOLD the fill; Tom is having a Cartesia PRO
 * clone of Aran built (Tom's Watson job #560·AA) and the fill uses whichever voice Aran and Tom pick from its
 * side-by-side. To switch: put the chosen voice here (provider-prefixed, e.g. 'cartesia_<uuid>'), make sure it is
 * a consented, registered owned clone (the TTS consent gate refuses anything else), and nothing else changes —
 * resolveVoice, the render door and the booth's take-replaces-stand-in rule all read this value.
 */
const STANDIN_VOICE = ARAN_ENGLISH_PRO_CLONE // switched from the instant clone 2026-11-03, job #568 (Aran's pick)
/**
 * Voices that STOOD IN before and may still sit in a slot. They can no longer be rendered by this rule (only
 * STANDIN_VOICE can — tts-provider-policy asks isStandInVoice), but a real take must still be able to replace
 * one, so isReplaceableStandIn accepts them too.
 */
const RETIRED_STANDIN_VOICES = Object.freeze([ARAN_ENGLISH_CLONE])
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
  return isCloneStandInCourse(courseCode) && role === 'known' &&
    (isStandInVoice(voiceId) || (!!voiceId && RETIRED_STANDIN_VOICES.some((v) => bare(v) === bare(voiceId))))
}

/**
 * PACE BY BELT — Aran's ruling 2026-11-03 (job #579), after the 20-line PRO-clone probe: the clone's pace is
 * right for white and yellow belt but "frustratingly slow" from orange on. So the stand-in speaks faster as the
 * course goes on: white/yellow at today's pace (1.0, the course's own known speed), orange/green a bit quicker,
 * blue and up close to natural conversational speed.
 *
 * The value is a TEMPO applied to the rendered clip (1.0 = the clone's own pace; 1.25 = the same take played
 * 25% faster, i.e. ~20% shorter, pitch unchanged) — NOT Cartesia's generation_config.speed. Job #579 sent it as
 * that native speed and Aran heard 1.25 come out SLOWER than 1.0 (job #590 measured all four pairs on the probe
 * page: every "faster" clip was 13-41% longer). Cause: this voice is a Cartesia PROFESSIONAL clone, and Cartesia's
 * docs say "Professional Voice Clones take their pacing from their source recordings and don't support
 * request-time speed adjustments" — the speed was ignored and the differences were take-to-take wander. So the
 * render route sends Cartesia its default speed and the pace is applied after the render, by ffmpeg atempo
 * (audio-processor changeTempoToWav), before mastering. A line's belt is the course position of the seed or LEGO it belongs to (seed number; a
 * phrase's LEGO id S0014L01 → seed 14). A clip shared by several slots takes its EARLIEST position — the first
 * time a learner hears it decides its pace.
 *
 * Belt thresholds are the course's own (seed position): White 1-7, Yellow 8-19, Orange 20-39, Green 40-79,
 * Blue 80-149, Purple 150-279, Brown 280-399, Black 400+.
 */
const BELTS = Object.freeze([
  { belt: 'white', from: 1 }, { belt: 'yellow', from: 8 }, { belt: 'orange', from: 20 }, { belt: 'green', from: 40 },
  { belt: 'blue', from: 80 }, { belt: 'purple', from: 150 }, { belt: 'brown', from: 280 }, { belt: 'black', from: 400 },
])
const STANDIN_PACE = Object.freeze({ white: 1.0, yellow: 1.0, orange: 1.1, green: 1.1, blue: 1.25, purple: 1.25, brown: 1.25, black: 1.25 })
/** No position known → today's pace: never faster than the ruling allows for a line we cannot place. */
const STANDIN_DEFAULT_PACE = 1.0

/** The belt of a seed position (1-based), or null when there is no usable position. */
function beltOf(seedPosition) {
  const n = Number(seedPosition)
  if (!Number.isInteger(n) || n < 1) return null
  let b = null
  for (const x of BELTS) if (n >= x.from) b = x.belt
  return b
}

/** The tempo the stand-in speaks a line at, from the line's seed position (applied after the render — see above). */
function standInSpeed(seedPosition) {
  const b = beltOf(seedPosition)
  return b ? STANDIN_PACE[b] : STANDIN_DEFAULT_PACE
}

/** True for a voice whose pace Cartesia ignores at request time (a Professional Voice Clone), so pace is a post-render tempo. */
function paceIsPostRender(voiceId) { return isStandInVoice(voiceId) }

/** The fastest speed the stand-in may be asked for (the trial lane lets this voice go up to it, no further). */
const STANDIN_MAX_PACE = Math.max(...Object.values(STANDIN_PACE))

/** The seed position of a slot: { seedNumber } or { phraseId: 'course:S0014L01B08' } or { legoId: 'S0014L01' }. */
function seedPositionOfSlot(slot = {}) {
  if (Number.isInteger(slot.seedNumber) && slot.seedNumber > 0) return slot.seedNumber
  const m = /(?:^|:)S(\d{3,5})L\d+/.exec(String(slot.phraseId || slot.legoId || ''))
  return m ? Number(m[1]) : null
}

module.exports = {
  BELTS,
  STANDIN_PACE,
  STANDIN_DEFAULT_PACE,
  STANDIN_MAX_PACE,
  beltOf,
  standInSpeed,
  paceIsPostRender,
  seedPositionOfSlot,
  ARAN_ENGLISH_CLONE,
  ARAN_ENGLISH_PRO_CLONE,
  RETIRED_STANDIN_VOICES,
  ARAN_CLONE_STANDIN_COURSES,
  RULING,
  isCloneStandInCourse,
  isCloneStandInSlot,
  isStandInVoice,
  STANDIN_VOICE,
  isReplaceableStandIn,
}
