/**
 * recording-speech-gate.cjs — "is there a READ on this take, or just the room?"
 *
 * THE CASE THIS EXISTS FOR. Tom, 2026-08-23, having listened to the four takes
 * Catrin made that afternoon for cym_n_for_eng:pod-0:
 *
 *   "the first voice recording you gave me is perfect, but the other three are
 *    just not even voice recordings. They're long bits of background noise...
 *    There was even a sheep in one of them."
 *
 * All four passed every gate on the upload path, because every gate on that
 * path is a LEVEL gate — input peak above -60 dBFS, output longer than 100 ms
 * after the trim. The room was recorded through Apple/Chrome's voice profile
 * with automatic gain control on (`capture:voice`, confirmed in the take's own
 * recording_device string), and AGC lifts a quiet room until it reads at voice
 * level. Measured on those four clips: the good take's noise floor sat at
 * -76 dBFS with 62.7 dB of dynamic range; the three empty ones sat at -37 to
 * -53 dBFS with 20-37 dB. An empty take does not measure as empty any more.
 * A level check cannot see this and never will.
 *
 * THE MEASUREMENT, and it is Tom's own from the audio-intelligence engine
 * (services/audio-intelligence/tiers/duration.cjs): "we should be able to
 * easily ascertain the voice speed and proxy for length as syllables / words
 * are useless, but syllables are pretty consistent". Count the syllables in
 * the line the recordist was asked to read, multiply by the slowest plausible
 * seconds-per-syllable, add a grace, and you have a ceiling. Measured on the
 * four real clips, seconds-per-syllable of actual speech span:
 *
 *   take 1  "Bore da. Sut wyt ti?"        3.25 s   0.45 s/syllable   a read
 *   take 2  (four clauses)               96.80 s   4.4  s/syllable   the room
 *   take 3  "Esgusodwch fi..."           46.65 s   3.1  s/syllable   the room
 *   take 4  "Nac ydy, mae hi'n rhydd..." 31.46 s   2.6  s/syllable   the room
 *
 * Nobody speaks at three seconds per syllable. The separation is a factor of
 * six and it does not depend on the language, the microphone or the room.
 *
 * ⚠️ WHY NOT THE VERACITY CHECK (services/audio-veracity.cjs), which is the
 * obvious reach. It was run on all four clips on 2026-08-23 and it CANNOT
 * separate them — measured, not assumed:
 *
 *   take 1 (good)  decoded "Poreddaa. Siwtwit'i."  -> CER 0.50, FAILED
 *   take 2 (room)  decoded a paragraph of fluent-looking Welsh, hallucinated
 *                  wholesale out of 96 seconds of noise
 *   take 3 (room)  decoded "Rwyf yn ffwrdd."       -> plausible Welsh, no speech
 *
 * It fails the good take and hallucinates speech onto two of the empty ones.
 * Its own header says it was validated on silence and truncation only, on
 * German and English; whisper-small has no useful Welsh. Making an ASR decode
 * the verdict here would lose real takes AND pass empty ones. It is the wrong
 * instrument for this question, and this is the measurement that says so.
 *
 * ⚠️ THE VAD ALONE CANNOT DO IT EITHER, for the reason its own header predicts:
 * "a neural VAD is better at separating speech from BACKGROUND NOISE — which
 * is a problem we do not have... if we ever ingest recorded-in-the-wild audio
 * it should be revisited." This IS recorded-in-the-wild audio. The energy VAD
 * called 96.5 of take 2's 96.8 seconds "voiced", because under AGC the room
 * genuinely is loud. So the VAD is used here only to MEASURE the span, never
 * to judge it — exactly the division of labour that header asks for.
 *
 * THREE OUTCOMES, NEVER TWO. `pass: true`, `pass: false`, and `pass: null`
 * meaning "I could not check this" — no script text, an uncountable script, or
 * no decoder. A gate that cannot tell a pass from an unchecked take is the bug
 * that bit this estate repeatedly on 2026-08-04. Callers MUST branch on
 * `checked`, and an unchecked take is FLAGGED, never refused: an infrastructure
 * absence must never cost a recordist a good read.
 *
 * COST. The ceiling is tested against a duration the upload path has ALREADY
 * measured, so a normal take costs nothing at all — no decode, no ffmpeg, no
 * model. Only a take that trips the ceiling is decoded, and only to confirm
 * that the length is real speech-span rather than padding before refusing it.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const decode = require('./audio-intelligence/decode.cjs')
const vad = require('./audio-intelligence/tiers/vad.cjs')
const syllables = require('./audio-intelligence/syllables.cjs')

/**
 * Which language is the line in? Pure.
 *
 * The syllable counter only has fitted counters for English and German, so the
 * one thing this has to get right is that a pod's KNOWN-side line is English
 * and its TARGET-side line is not — a known-side line counted by the generic
 * vowel-group counter gets a slightly wrong ceiling for no reason when the
 * fitted English counter is right there.
 *
 * Course codes are `<target>_for_<known>`, and the target half may carry a
 * regional suffix (`cym_n`, `spa_mx`) that is not a language code. Only the
 * leading segment is one.
 */
function languageForTake (courseCode, kind) {
  const parts = String(courseCode || '').split('_for_')
  if (parts.length !== 2) return null
  return kind === 'known' ? parts[1] : parts[0].split('_')[0]
}

/**
 * The slowest anybody reads a scripted line, in seconds per syllable.
 *
 * Measured against the only labelled evidence that exists (2026-08-23, the four
 * cym_n takes): the one genuine read sits at 0.45 s/syllable and the three
 * empty ones at 2.6, 3.1 and 4.4. 1.2 is 2.7x slower than the real read and
 * 2.2x faster than the fastest empty one — deliberately parked nearer the
 * empty end, because the cost of the two errors is not symmetric. Refusing a
 * good take costs a recordist a re-read of one line; passing an empty one puts
 * a sheep in front of a learner.
 *
 * For scale: 1.2 s/syllable is under 0.85 syllables per second. Conversational
 * speech runs 4-6 and the slowest deliberate scripted read this estate has
 * measured is around 2. A take at this rate is not a slow read.
 *
 * DEFAULT, not a ruling. Fitted on four clips in one language — say so
 * wherever this number travels, the way audio-veracity's header does.
 */
const MAX_SEC_PER_SYLLABLE = Number(process.env.RECORDING_GATE_SEC_PER_SYLLABLE || 1.2)

/**
 * Flat headroom on top of the ceiling, in seconds.
 *
 * A ratio alone punishes short lines: "Ie" is one syllable, and without this a
 * recordist who takes a breath, coughs and then reads it has a take three times
 * its "expected" length. Four seconds is more dead air than any real take
 * carries after the server's silence trim, and it is what keeps the gate off
 * the one-word lines that fill a pod script.
 *
 * DEFAULT, not a ruling.
 */
const GRACE_SEC = Number(process.env.RECORDING_GATE_GRACE_SEC || 4)

/** What the recordist is told. Plain, actionable, no numbers they cannot use. */
const MESSAGES = {
  no_voice_detected:
    "That take didn't capture any speech — check the right microphone is selected, then read the line again.",
  speech_span_far_exceeds_script:
    "That take came out far longer than the line, so it looks like it caught the room rather than your voice. It hasn't been saved — please read the line again.",
}

/**
 * How long a take of this line could plausibly be.
 * Pure, so it is the part the tests pin.
 *
 * @param {string} text     the line the recordist was asked to read
 * @param {string} language course/pod language, 639-3-ish or ISO-639-1
 * @returns {{ceilingSec: number|null, syllables: number, calibrated: boolean,
 *            uncountable: string|null}}
 */
function ceilingFor (text, language) {
  const s = syllables.count(text, language)
  if (!s.syllables) {
    return { ceilingSec: null, syllables: 0, calibrated: s.calibrated, uncountable: 'no countable words in the script' }
  }
  return {
    ceilingSec: s.syllables * MAX_SEC_PER_SYLLABLE + GRACE_SEC,
    syllables: s.syllables,
    calibrated: s.calibrated,
    uncountable: s.uncountable,
  }
}

/**
 * Does this take contain a read of this line, or the room around it?
 *
 * @param {object} o
 * @param {Buffer} [o.buffer]      the mastered take's bytes (decoded only if needed)
 * @param {string} [o.filePath]    ...or a path to it. One of the two is required.
 * @param {string} o.expectedText  the line the recordist was asked to read
 * @param {string} o.language      pod/course language
 * @param {number} o.durationMs    the take's duration, already measured upstream
 * @returns {Promise<{pass:boolean|null, checked:boolean, reason:string,
 *                    message:string|null, detail:object}>}
 */
async function checkTakeHasSpeech ({ buffer, filePath, expectedText, language, durationMs }) {
  const durationSec = Number(durationMs) / 1000
  const base = { message: null, detail: { durationSec, language: language || null } }

  const c = ceilingFor(expectedText, language)
  if (c.ceilingSec == null || c.uncountable) {
    // No script, or a script we cannot size (digits). Not a pass — unchecked.
    return {
      pass: null, checked: false, reason: 'unchecked_no_countable_script',
      ...base,
      detail: { ...base.detail, why: c.uncountable || 'no expected text supplied' },
    }
  }

  const detail = {
    ...base.detail,
    syllables: c.syllables,
    ceilingSec: +c.ceilingSec.toFixed(2),
    secPerSyllable: Number.isFinite(durationSec) ? +(durationSec / c.syllables).toFixed(3) : null,
    syllableCounterCalibrated: c.calibrated,
  }

  // The free test. A take inside the ceiling is a take, and costs no decode.
  if (!Number.isFinite(durationSec) || durationSec <= c.ceilingSec) {
    return { pass: true, checked: true, reason: 'within_expected_duration', message: null, detail }
  }

  // Over the ceiling. Before refusing, confirm the length is SPEECH SPAN and
  // not padding — a take with a long silent lead is a good take badly trimmed,
  // and refusing it would be exactly the mistake this gate exists to avoid.
  const av = await decode.availability()
  if (!av.available) {
    return {
      pass: null, checked: false, reason: 'unchecked_no_decoder',
      message: null,
      detail: { ...detail, missing: av.missing },
    }
  }

  // ffmpeg takes a file, not a pipe, so a buffer is spilled to a temp path and
  // removed in the finally below whatever happens.
  let spilled = null
  let d = null
  try {
    if (!filePath) {
      spilled = path.join(os.tmpdir(), `take-gate-${crypto.randomBytes(8).toString('hex')}.audio`)
      fs.writeFileSync(spilled, buffer)
    }
    d = await decode.decode(filePath || spilled)
  } catch (e) {
    if (spilled) { try { fs.unlinkSync(spilled) } catch { /* already gone */ } }
    return {
      pass: null, checked: false, reason: 'unchecked_decode_error',
      message: null,
      detail: { ...detail, error: String(e && e.message).slice(0, 200) },
    }
  }

  try {
    const v = vad.analyse(d.samples, d.sampleRate)
    detail.speechSpanSec = +Number(v.speechDurationSec || 0).toFixed(2)
    detail.speechSecPerSyllable = +(detail.speechSpanSec / c.syllables).toFixed(3)
    detail.leadingSilenceSec = v.leadingSilenceSec == null ? null : +v.leadingSilenceSec.toFixed(3)
    detail.trailingSilenceSec = v.trailingSilenceSec == null ? null : +v.trailingSilenceSec.toFixed(3)
    detail.dynamicRangeDb = (v.levels && v.levels.speechDb != null && v.levels.noiseDb != null)
      ? +(v.levels.speechDb - v.levels.noiseDb).toFixed(1)
      : null

    if (!v.voiced) {
      return {
        pass: false, checked: true, reason: 'no_voice_detected',
        message: MESSAGES.no_voice_detected, detail,
      }
    }

    if (detail.speechSpanSec <= c.ceilingSec) {
      // Long file, short read: padding the trim left on. Let it through.
      return { pass: true, checked: true, reason: 'long_file_but_short_speech', message: null, detail }
    }

    return {
      pass: false, checked: true, reason: 'speech_span_far_exceeds_script',
      message: MESSAGES.speech_span_far_exceeds_script, detail,
    }
  } finally {
    d.dispose()
    if (spilled) { try { fs.unlinkSync(spilled) } catch { /* already gone */ } }
  }
}

module.exports = {
  checkTakeHasSpeech,
  ceilingFor,
  languageForTake,
  MESSAGES,
  MAX_SEC_PER_SYLLABLE,
  GRACE_SEC,
}
