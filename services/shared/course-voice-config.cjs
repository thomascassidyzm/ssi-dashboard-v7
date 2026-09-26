/**
 * A COURSE'S VOICES — Tom's audio model (2026-09-26 ~22:00Z):
 *
 *   "we're going to need 1 voice for every known language in a course - this
 *    will be played at 1.0x speed in the app - / and 1 target male and 1 target
 *    female for the target language which will be played at a slower speed by
 *    the app / SET ON A TARGET VOICE BASIS / as a configuration - per specific
 *    course / this would mean we only ever need to record the same voice but we
 *    slow it down, by ear, at the point of previewing/testing courses"
 *
 * The store is the one that already exists: courses.voice_config.voices —
 * slots `known`, `target1`, `target2` (plus `presentation`, the intro voice,
 * which is a known-language voice and plays at 1.0x like `known`). This adds
 * ONE field to each target slot:
 *
 *   voices.target1.playbackSpeed = 0.85   // the rate the APP plays this voice
 *
 * A course with a playbackSpeed on either target slot is on APP-PLAYED SPEED:
 * the learning app applies it at playback (ssi-learning-app, toSimpleRounds
 * computeCycleSpeed), and every render for the course is made at 1.0 — the
 * speed is never baked into audio, so a voice is recorded once and re-tuned by
 * ear with no re-render. Courses without it keep their baked `settings.speed`
 * exactly as before (their existing clips are already slowed; re-rendering
 * them to un-bake would be spend nobody asked for).
 *
 * Default when unset: null — the app keeps the speed curve it plays today, so
 * nothing changes audibly until Tom tunes a voice by ear.
 */

const TARGET_SLOTS = ['target1', 'target2']
/** Slots the app plays at 1.0x, always: the learner's own language. */
const KNOWN_SPEED = 1.0
/** The app clamps playback to this floor; a config below it would not be honoured. */
const MIN_PLAYBACK_SPEED = 0.7

function voicesOf(voiceConfig) {
  const vc = voiceConfig || {}
  return vc.voices || vc
}

function slotVoiceId(v) {
  if (!v) return null
  return typeof v === 'string' ? v : (v.voiceId || null)
}

/** The rate the app plays one target slot at, or null (app default curve). */
function playbackSpeedFor(voiceConfig, slot) {
  if (!TARGET_SLOTS.includes(slot)) return slot === 'known' || slot === 'presentation' ? KNOWN_SPEED : null
  const v = voicesOf(voiceConfig)[slot]
  const s = v && typeof v === 'object' ? v.playbackSpeed : undefined
  return typeof s === 'number' && Number.isFinite(s) ? s : null
}

/** True when the app, not the audio, carries this course's target speed. */
function isAppPlayedSpeed(voiceConfig) {
  return TARGET_SLOTS.some(slot => playbackSpeedFor(voiceConfig, slot) != null)
}

/**
 * The speed a RENDER for this slot is made at. On app-played speed: 1.0 for
 * every slot, always — the one rule that keeps speed out of the audio. Else the
 * legacy per-slot `settings.speed` (what phase8 has always passed).
 */
function renderSpeedFor(voiceConfig, role) {
  if (isAppPlayedSpeed(voiceConfig)) return 1.0
  const v = voicesOf(voiceConfig)[role]
  return (v && typeof v === 'object' && v.settings && v.settings.speed) || 1.0
}

/**
 * The course's voices in Tom's shape, with what is wrong with them. A course
 * has exactly ONE known voice, ONE target female and ONE target male.
 *
 * @returns {{ known, targetFemale, targetMale, errors: string[] }}
 *   known/targetFemale/targetMale = { slot, voiceId, gender, playbackSpeed }
 */
function courseVoiceShape(voiceConfig) {
  const voices = voicesOf(voiceConfig)
  const errors = []
  const known = voices.known ? { slot: 'known', voiceId: slotVoiceId(voices.known), gender: voices.known.gender || null, playbackSpeed: KNOWN_SPEED } : null
  if (!known || !known.voiceId) errors.push('no known voice')
  // Kai's two-known-voice design (eng_for_hin, 2026-09-23) lives in known.byGender;
  // Tom's model is one known voice. Reported, never rewritten here.
  if (voices.known && voices.known.byGender && Object.keys(voices.known.byGender).length > 1) {
    errors.push('more than one known voice (known.byGender)')
  }
  const targets = TARGET_SLOTS.map(slot => {
    const v = voices[slot]
    return v ? { slot, voiceId: slotVoiceId(v), gender: (typeof v === 'object' && v.gender) || null, playbackSpeed: playbackSpeedFor(voiceConfig, slot) } : null
  }).filter(Boolean)
  const byGender = g => targets.filter(t => t.gender === g)
  const targetFemale = byGender('f')[0] || null
  const targetMale = byGender('m')[0] || null
  if (byGender('f').length !== 1) errors.push(`${byGender('f').length} target female voices (want exactly 1)`)
  if (byGender('m').length !== 1) errors.push(`${byGender('m').length} target male voices (want exactly 1)`)
  for (const t of targets) {
    if (!t.voiceId) errors.push(`${t.slot} has no voiceId`)
    if (t.playbackSpeed != null && (t.playbackSpeed < MIN_PLAYBACK_SPEED || t.playbackSpeed > 1.0)) {
      errors.push(`${t.slot} playbackSpeed ${t.playbackSpeed} outside [${MIN_PLAYBACK_SPEED}, 1.0]`)
    }
  }
  return { known, targetFemale, targetMale, errors }
}

/**
 * Set a target slot's playback speed on a voice_config, returning a NEW config
 * (the caller writes it). Refuses a known slot — known always plays at 1.0.
 */
function withPlaybackSpeed(voiceConfig, slot, speed) {
  if (!TARGET_SLOTS.includes(slot)) throw new Error(`playbackSpeed is per TARGET voice; ${slot} always plays at ${KNOWN_SPEED}x`)
  if (!(typeof speed === 'number' && speed >= MIN_PLAYBACK_SPEED && speed <= 1.0)) {
    throw new Error(`playbackSpeed must be a number in [${MIN_PLAYBACK_SPEED}, 1.0], got ${speed}`)
  }
  const vc = JSON.parse(JSON.stringify(voiceConfig || {}))
  const voices = vc.voices || vc
  if (!voices[slot] || typeof voices[slot] !== 'object') throw new Error(`course has no ${slot} voice to set a speed on`)
  voices[slot].playbackSpeed = speed
  return vc
}

module.exports = {
  TARGET_SLOTS,
  KNOWN_SPEED,
  MIN_PLAYBACK_SPEED,
  playbackSpeedFor,
  isAppPlayedSpeed,
  renderSpeedFor,
  courseVoiceShape,
  withPlaybackSpeed,
}
