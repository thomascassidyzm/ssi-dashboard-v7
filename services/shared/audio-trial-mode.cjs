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
 */
const config = require('./voicing-policy.config.json')

const TRIAL_ID_PREFIX = 'trial_'
const TRIAL_KEY_PREFIX = 'trial/'

class TrialRefusal extends Error {
  constructor(message, code, status = 403) { super(message); this.name = 'TrialRefusal'; this.code = code; this.status = status }
}

const expires = () => (config.audioTrialMode && config.audioTrialMode.expires) || null

/** Throws unless trial mode is open today (UTC). `now` is injectable for tests. */
function assertTrialOpen(now = new Date()) {
  const end = expires()
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

const trialKey = uuid => `${TRIAL_KEY_PREFIX}${String(uuid).toUpperCase()}.mp3`
const trialIdFromKey = key => `${TRIAL_ID_PREFIX}${String(key).slice(TRIAL_KEY_PREFIX.length).replace(/\.mp3$/, '')}`
const keyFromTrialId = id => `${TRIAL_KEY_PREFIX}${String(id).slice(TRIAL_ID_PREFIX.length)}.mp3`

module.exports = { TrialRefusal, assertTrialOpen, assertNotTrial, isTrialRef, trialKey, trialIdFromKey, keyFromTrialId, expires, TRIAL_ID_PREFIX, TRIAL_KEY_PREFIX }
