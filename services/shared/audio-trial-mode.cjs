/**
 * AUDIO TRIAL MODE — Tom 2026-10-12 03:44Z (job #748): "a test mode: any voice can record anything, no casting checks, no
 * re-record permissions, for one week; test recordings never get connected to a live course; the 260k/day cap stays."
 *
 * A render with `trial: true` on POST /api/audio/render, until config.audioTrialMode.expires (voicing-policy.config.json,
 * UTC date, inclusive):
 *   - skips the voicing policy, the cast gate and the rerecord gate (services/tts-service.cjs speak → door.trial). The
 *     gates that are not Tom's casting rules — child voices, human-voice courses, consent, retired providers (xAI) — still run.
 *   - never touches a course: the clip is mastered and put in S3 under `trial/`, and gets an id `trial_<UUID>`. There is NO
 *     course_audio row, NO clip_index entry and NO LEGO/phrase/pod pointer, so a trial clip cannot be found by the library
 *     lookup and cannot be reused by a live render. That is the by-construction half.
 *   - the other half: every path that points a course at audio asks assertNotTrial(idOrKey) first (linkLegoPresentation,
 *     swapClipInPlace, the re-record). A trial id/key is refused with TRIAL_CLIP_NOT_LINKABLE.
 *   - the spend guard is untouched: trial characters count against the same daily cap.
 *
 * THE STANDING TRIAL LANE (job #23, Kai 2026-10-28, under r-2026-10-27-popty-kai-owns-course-production-aran and
 * r-2026-10-27-elevenlabs-is-available-again-kai-may; Tom's Watson confirmed): the one-week window is replaced by a standing
 * lane (config.audioTrialMode.standing), held to what made the week safe plus three things:
 *   - STARTED, NEVER UNATTENDED (r-2026-10-13): a trial names its purpose AND who started it (startedBy, a person) or the
 *     job it serves ("#23"). A trial with neither is refused before anything is looked up.
 *   - ONE-OFF CLIPS ONLY: maxCharsPerCall caps each trial call (default 300). A script is not a trial; bulk work is Tom's.
 *   - ELEVENLABS PASS-THROUGH, TRIAL ONLY: `model` (ELEVENLABS_TRIAL_MODELS) and `voiceSettings` (stability,
 *     similarity_boost, style 0..1; speed 0.7..1.2) reach the provider. Course renders keep eleven_multilingual_v2 with
 *     the house settings. v3/v4 audio tags ("[slowly]") are the model's stage directions, so a trial on those models may
 *     carry them (audioTagsAllowed); everywhere else a bracket is still a label and refused.
 *   An 'expires' date still closes the lane if one is set without standing (assertTrialOpen).
 */
const config = require('./voicing-policy.config.json')

const TRIAL_ID_PREFIX = 'trial_'
const TRIAL_KEY_PREFIX = 'trial/'

class TrialRefusal extends Error {
  constructor(message, code, status = 403) { super(message); this.name = 'TrialRefusal'; this.code = code; this.status = status }
}

const lane = () => config.audioTrialMode || {}
const expires = (cfg = lane()) => (cfg && cfg.expires) || null

/** Throws unless trial mode is open today (UTC): a standing lane is always open; otherwise until 'expires'. `now`/`cfg` injectable for tests. */
function assertTrialOpen(now = new Date(), cfg = lane()) {
  if (cfg && cfg.standing === true) return
  const end = expires(cfg)
  if (!end || now.toISOString().slice(0, 10) > end) {
    throw new TrialRefusal(`Audio trial mode ended ${end || '(never configured)'} — trial renders are refused; render normally, through the gates (Tom 2026-10-12, job #748).`, 'TRIAL_EXPIRED')
  }
}

const isTrialRef = v => { const s = String(v == null ? '' : v); return s.startsWith(TRIAL_ID_PREFIX) || s.startsWith(TRIAL_KEY_PREFIX) || s.includes(`/${TRIAL_KEY_PREFIX}`) }

/** Every repoint path calls this on the audio id / s3 key it is about to connect to a course. */
function assertNotTrial(...refs) {
  for (const r of refs) {
    if (isTrialRef(r)) throw new TrialRefusal(`${r} is a TRIAL clip — trial clips are never connected to a course (Tom 2026-10-12, job #748). Render it normally to put it in a course.`, 'TRIAL_CLIP_NOT_LINKABLE', 409)
  }
}

// A slowed trial (job #751) carries its speed in the key — trial/<UUID>_x80.mp3 for 0.8 — so two speeds of the same words are two objects, never one.
const speedTag = speed => (speed == null || speed === 1 ? '' : `_x${Math.round(speed * 100)}`)
const trialKey = (uuid, speed) => `${TRIAL_KEY_PREFIX}${String(uuid).toUpperCase()}${speedTag(speed)}.mp3`
const trialIdFromKey = key => `${TRIAL_ID_PREFIX}${String(key).slice(TRIAL_KEY_PREFIX.length).replace(/\.mp3$/, '')}`
const keyFromTrialId = id => `${TRIAL_KEY_PREFIX}${String(id).slice(TRIAL_ID_PREFIX.length)}.mp3`

/** The per-call character cap on a trial render: one-off clips only (job #23). */
const DEFAULT_MAX_CHARS_PER_CALL = 300
const maxCharsPerCall = (cfg = lane()) => (Number.isInteger(cfg && cfg.maxCharsPerCall) && cfg.maxCharsPerCall > 0 ? cfg.maxCharsPerCall : DEFAULT_MAX_CHARS_PER_CALL)

/** ElevenLabs models a trial may name. The course path stays on eleven_multilingual_v2 (tts-service generateElevenLabs). */
const ELEVENLABS_TRIAL_MODELS = Object.freeze(['eleven_multilingual_v2', 'eleven_v3', 'eleven_v4', 'eleven_v4_turbo'])
/** Models that read [bracketed] audio tags as direction, not words. */
const AUDIO_TAG_MODELS = Object.freeze(['eleven_v3', 'eleven_v4', 'eleven_v4_turbo'])
const VOICE_SETTING_RANGES = Object.freeze({ stability: [0, 1], similarity_boost: [0, 1], style: [0, 1], speed: [0.7, 1.2] })

/** Throws (400) on a model outside the allow-list. Returns the model or null. */
function checkModel(model) {
  if (model == null) return null
  const m = String(model)
  if (!ELEVENLABS_TRIAL_MODELS.includes(m)) throw new TrialRefusal(`model ${m} is not on the trial allow-list (${ELEVENLABS_TRIAL_MODELS.join(', ')})`, 'BAD_MODEL', 400)
  return m
}

/** Throws (400) on an unknown key or an out-of-range value. Returns a clean { stability?, similarity_boost?, style?, speed? } or null. */
function checkVoiceSettings(vs) {
  if (vs == null) return null
  if (typeof vs !== 'object' || Array.isArray(vs)) throw new TrialRefusal('voiceSettings is an object { stability, similarity_boost, speed, style }', 'BAD_VOICE_SETTINGS', 400)
  const out = {}
  for (const [k, v] of Object.entries(vs)) {
    const range = VOICE_SETTING_RANGES[k]
    if (!range) throw new TrialRefusal(`voiceSettings.${k} is not passed through — only ${Object.keys(VOICE_SETTING_RANGES).join(', ')}`, 'BAD_VOICE_SETTINGS', 400)
    const n = Number(v)
    if (!Number.isFinite(n) || n < range[0] || n > range[1]) throw new TrialRefusal(`voiceSettings.${k} must be between ${range[0]} and ${range[1]}`, 'BAD_VOICE_SETTINGS', 400)
    out[k] = n
  }
  return Object.keys(out).length ? out : null
}

/** Kai 2026-10-28 (job #23): max stability always for phrase generation — an ElevenLabs trial that does not set stability sends 1.0.
 *  TRIAL LANE ONLY: the course path (tts-service generateElevenLabs) still sends its own 0.5 default; changing that is a separate go. */
const TRIAL_DEFAULT_STABILITY = 1.0
const audioTagsAllowed = model => AUDIO_TAG_MODELS.includes(String(model || ''))
/** Strip [audio tags] (letters, spaces, commas, hyphens, apostrophes; ≤40 chars) — what the speakable check sees on a tag-reading trial. */
const stripAudioTags = text => String(text == null ? '' : text).replace(/\[[\p{L} ,'-]{1,40}\]/gu, ' ')

module.exports = { TRIAL_DEFAULT_STABILITY, TrialRefusal, assertTrialOpen, maxCharsPerCall, checkModel, checkVoiceSettings, audioTagsAllowed, stripAudioTags, ELEVENLABS_TRIAL_MODELS, AUDIO_TAG_MODELS, DEFAULT_MAX_CHARS_PER_CALL, assertNotTrial, isTrialRef, trialKey, trialIdFromKey, keyFromTrialId, expires, TRIAL_ID_PREFIX, TRIAL_KEY_PREFIX }
