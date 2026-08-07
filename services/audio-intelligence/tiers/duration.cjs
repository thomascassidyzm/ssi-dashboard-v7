/**
 * TIER 1 — the syllable-rate duration model. Tom's own design, and the cheapest
 * true signal in the engine.
 *
 * His sizing argument, verbatim, 2026-08-06, on a clip both incumbent checks
 * had just certified clean:
 *
 *   "I mean it's 1 second as a clip - how can it get that whole phrase in, in
 *    one second???!!!! / even length is easy on this one"
 *
 * and then the refinement that makes it implementable:
 *
 *   "we should be able to easily ascertain the voice speed and proxy for length
 *    as syllables / words are useless, but syllables are pretty consistent"
 *
 * THE MEASUREMENT. Count syllables from the script text. Divide the clip's
 * SPEECH span (tier 3's, not the file duration) by that count to get seconds
 * per syllable. Compare against the distribution of seconds-per-syllable that
 * THIS VOICE produces on its own known-good clips. A clip materially faster
 * than the voice has ever spoken is not a fast clip, it is a short clip — audio
 * is missing.
 *
 * WHY IT IS FIRST. It needs no decode of the speech content at all, it costs
 * one ffprobe plus an energy pass, and it is the tier that catches the case
 * that started this: a six-syllable English phrase in a 1.1-second file. It
 * also catches the batch case Tom found in R9, where the same tail is cut from
 * every clip in a set — because a systematically-short set is systematically
 * fast, and the rate model sees that even when the decoder hallucinates the
 * missing word back in from context.
 *
 * ⚠️ WHAT IT CANNOT DO. It sizes, it does not read. A clip where the wrong word
 * was rendered at the right length passes tier 1 perfectly. A clip with a long
 * deliberate pause in it looks slow, not damaged — the model flags SHORT only,
 * never long, and "long" is reported as evidence rather than as a fault.
 *
 * ⚠️ AND IT IS ONLY AS GOOD AS THE SYLLABLE COUNT. For a language without a
 * fitted counter (see syllables.cjs) this tier reports `calibrated: false` and
 * the engine treats it as advisory. English and German are fitted; nothing else
 * is. Do not let that qualifier get lost — the veracity check's German-and-
 * English fitting caveat already got lost once.
 */

const syllables = require('../syllables.cjs')

/**
 * How far below the voice's own good-clip rate counts as "materially shorter".
 *
 * Expressed in standard deviations of that voice's seconds-per-syllable
 * distribution rather than as a fixed percentage, because a fixed percentage
 * asks every voice to be equally consistent and they are not — a voice with a
 * tight delivery should be flagged on a smaller deviation than a variable one.
 * This is the taste-safe default the brief called for.
 *
 * 2.5 sigma: on a normal distribution that is roughly a 0.6% one-sided false
 * alarm rate, which over a 50,000-clip course is ~300 clips into the ambiguous
 * band — affordable for tier 4, and deliberately chosen so that tier 1 is
 * ESCALATING rather than convicting. See engine.cjs for how the bands compose.
 */
const SHORT_SIGMA = Number(process.env.AIE_DURATION_SIGMA || 2.5)

/**
 * A hard floor independent of the statistics: no voice in this estate speaks
 * faster than this, so anything below it is short regardless of what the
 * calibration says. It exists so an UNCALIBRATED voice still gets the benefit
 * of Tom's one-second argument, and so a calibration polluted by damaged clips
 * cannot normalise damage into acceptability.
 *
 * 9 syllables/sec is far above conversational (4-6) and above fast read speech
 * (~7-8). Anything faster is not a speaking rate.
 */
const IMPOSSIBLE_SYL_PER_SEC = Number(process.env.AIE_MAX_SYL_PER_SEC || 9)

/**
 * @param {object} args
 * @param {string} args.text        the script text the clip was rendered from
 * @param {string} args.language    language code (course_audio.language)
 * @param {number} args.speechDurationSec  tier 3's speech span
 * @param {object} [args.voiceStats] {meanSecPerSyl, sdSecPerSyl, n} for this voice
 * @returns {object} verdict with its evidence attached
 */
function analyse ({ text, language, speechDurationSec, totalDurationSec, voiceStats }) {
  const syl = syllables.count(text, language)

  const base = {
    tier: 'duration',
    syllables: syl.syllables,
    words: syl.words,
    syllableCounter: syl.counter,
    speechDurationSec,
    totalDurationSec,
  }

  if (!syl.syllables || syl.uncountable) {
    return {
      ...base,
      flag: false,
      calibrated: false,
      reason: syl.uncountable || 'no syllables counted; tier 1 cannot size this clip',
    }
  }
  if (!speechDurationSec || speechDurationSec <= 0) {
    return { ...base, flag: false, calibrated: false, reason: 'no speech span; tier 1 has nothing to divide' }
  }

  const secPerSyl = speechDurationSec / syl.syllables
  const sylPerSec = syl.syllables / speechDurationSec

  // The absolute floor first — it does not need calibration and it is the check
  // that expresses Tom's argument directly.
  if (sylPerSec > IMPOSSIBLE_SYL_PER_SEC) {
    return {
      ...base,
      flag: true,
      severity: 'hard',
      calibrated: syl.calibrated,
      secPerSyl,
      sylPerSec,
      reason: `${syl.syllables} syllables in ${speechDurationSec.toFixed(2)}s of speech `
        + `= ${sylPerSec.toFixed(1)} syllables/sec, above the ${IMPOSSIBLE_SYL_PER_SEC}/sec `
        + 'physical ceiling — audio is missing, not fast',
    }
  }

  if (!voiceStats || !voiceStats.n || !(voiceStats.sdSecPerSyl > 0)) {
    return {
      ...base,
      flag: false,
      calibrated: false,
      secPerSyl,
      sylPerSec,
      reason: 'voice not calibrated; only the absolute ceiling was applied',
    }
  }

  const z = (secPerSyl - voiceStats.meanSecPerSyl) / voiceStats.sdSecPerSyl
  const expectedSec = voiceStats.meanSecPerSyl * syl.syllables
  const shortfallSec = expectedSec - speechDurationSec

  return {
    ...base,
    flag: z <= -SHORT_SIGMA,
    severity: z <= -SHORT_SIGMA ? (z <= -4 ? 'hard' : 'suspect') : null,
    calibrated: syl.calibrated,
    secPerSyl,
    sylPerSec,
    z,
    expectedSpeechSec: expectedSec,
    shortfallSec,
    voiceMeanSecPerSyl: voiceStats.meanSecPerSyl,
    voiceSdSecPerSyl: voiceStats.sdSecPerSyl,
    voiceN: voiceStats.n,
    reason: z <= -SHORT_SIGMA
      ? `${syl.syllables} syllables would take ${expectedSec.toFixed(2)}s at this voice's own rate; `
        + `the clip has ${speechDurationSec.toFixed(2)}s of speech — ${shortfallSec.toFixed(2)}s short, `
        + `${Math.abs(z).toFixed(1)} sigma below the voice's good-clip distribution`
      : `within this voice's normal range (${z.toFixed(1)} sigma)`,
  }
}

module.exports = { analyse, SHORT_SIGMA, IMPOSSIBLE_SYL_PER_SEC }
