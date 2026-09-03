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
 *
 * ── THE SECOND DEFECT: A TAKE CUT AT ITS OWN BOUNDARY (2026-08-23, Aran) ─────
 *
 * Tom, the same evening, having listened to Aran's Welsh-north Pod 1 takes:
 *
 *   "Aran's are all junk. All clipped badly at either or both ends"
 *
 * checkTakeBoundaries below is the instrument for that one, and it is a
 * DIFFERENT question from the one above: not "is there a read in here" but
 * "does the read run off the edge of the file". A truncated take has a
 * perfectly respectable speech span — the VAD's own header says so — so the
 * check above passes it, every level gate passes it, and the technical QC pass
 * of 2026-08-14 declared all 111 of these clips clean because it measured
 * decode, silence and levels and never measured the boundary.
 *
 * WHY NOT AN ABSOLUTE dB GATE, and this is the whole design. Automatic gain
 * control lifts a quiet room until it reads at voice level (the case above), so
 * "how loud is the first frame" is not a question with a stable answer across
 * takes. What IS stable is the ratio inside one file: the margin is measured
 * against a NEAR-SPEECH level derived from the take's own speech level, so it
 * means the same thing on a whispered take, a shouted one, and an AGC-lifted
 * one. No absolute threshold appears in it.
 *
 * WHAT IT MEASURED, on the real clips, mastered bytes pulled from S3
 * (scripts/measure-boundaries.cjs, 2026-08-23, 20 clips):
 *
 *   Catrin take 1, the read Tom called perfect   lead 0.35 s   tail 0.41 s
 *   Aran, 16 clips across both his voices and
 *   both his recording days                      lead 0.00-0.08 s
 *                                                tail 0.015-0.264 s
 *
 * Aran's clips are flush against the file at the front — 13 of the 16 begin at
 * frame zero — and inside 40 ms of the end on 15 of 16. Tom's ear and the
 * measurement agree exactly, and the separation from the known-good take is a
 * factor of four at its narrowest.
 *
 * WHY THAT NUMBER IS 0.35 ON THE GOOD TAKE AND NOT AN ACCIDENT: the server's
 * own trim (audio-processor.cjs, TRIM_MARGIN_SEC) cuts 0.35 s OUTSIDE the read
 * it detects. Every take mastered since 2026-08-21 carries that margin by
 * construction unless the raw capture had no margin to give. Aran's takes are
 * all from 2026-06-15/16 and 2026-08-10 — every one predates that fix and went
 * through the old flush cut. So this gate fires on exactly two populations: a
 * legacy clip, and a live take whose recordist started or stopped over their
 * own voice. Both need re-reading and no server-side repair can invent the
 * missing audio.
 *
 * WHY NOT PAD THE GAP INSTEAD, which is the obvious cheaper move: silence
 * bolted onto the front of an amputated consonant makes the clip LOOK unclipped
 * to every downstream check while sounding exactly as wrong to a learner. It
 * would hide this defect rather than catch it. The chain leaves real room where
 * real room exists and this gate refuses the take where it does not.
 *
 * COST of this second check: one decode per upload, unconditionally — unlike
 * the ceiling above there is no free precondition to test first. That is ~50 ms
 * of ffmpeg on a human-paced path that already does several S3 round trips.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const decode = require('./audio-intelligence/decode.cjs')
const vad = require('./audio-intelligence/tiers/vad.cjs')
const envelope = require('./audio-intelligence/envelope.cjs')
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
  speech_truncated_at_start:
    "That take starts right on your first word, so the beginning of it is cut off. It hasn't been saved — press record, take a breath, then read the line again.",
  speech_truncated_at_end:
    "That take runs off the end, so your last word is cut off. It hasn't been saved — leave a beat after the line before you stop recording, then read the line again.",
  speech_truncated_at_both_ends:
    "That take is cut off at both ends, the first word and the last. It hasn't been saved — press record, take a breath, read the line again, then wait a beat before you stop.",
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

// ── BOUNDARY TRUNCATION ──────────────────────────────────────────────────────
// See the second half of the header for the case, the measurements and the
// reason none of these numbers is an absolute level.

/**
 * How far under the take's own speech level counts as "the read has begun".
 *
 * Relative, never absolute — that is the whole point. 10 dB under the speech
 * level is still unmistakably part of the read (a word's onset climbs through
 * it in tens of milliseconds) and is far above any noise floor this estate has
 * measured on a real take, INCLUDING the AGC-lifted ones: Catrin's worst empty
 * take had 19.9 dB of range, so its floor still sits a clear 10 dB under this
 * line. A gate placed at the noise floor instead would move with the room.
 *
 * DEFAULT, not a ruling.
 */
const NEAR_SPEECH_BELOW_DB = Number(process.env.RECORDING_GATE_NEAR_SPEECH_DB || 10)

/**
 * The margin of room a take must have outside its read, at each end.
 *
 * 0.10 s. Chosen from the two real populations rather than from taste: the
 * known-good take carries 0.35 s and 0.41 s, and the 16 measured Aran clips
 * carry 0.00-0.08 s at the front. 0.10 sits above every clipped clip and at
 * less than a third of what the server's own trim leaves on a healthy take, so
 * it has to be a genuinely flush boundary to fire, not a tight one.
 *
 * DEFAULT, not a ruling.
 */
const BOUNDARY_MIN_MARGIN_SEC = Number(process.env.RECORDING_GATE_BOUNDARY_MARGIN_SEC || 0.10)

/**
 * Below this much dynamic range the near-speech line is meaningless — a hard-
 * limited or constant-level file has no "under the speech" to measure, and the
 * margin would read as zero on every such take whether or not it is truncated.
 * Those come back UNCHECKED. Refusing a take on a measurement that cannot
 * separate is the failure mode this whole module exists to avoid.
 */
const BOUNDARY_MIN_RANGE_DB = Number(process.env.RECORDING_GATE_BOUNDARY_MIN_RANGE_DB || 12)

/**
 * How long a near-speech run has to be before it counts as the FIRST or LAST
 * word rather than a tick.
 *
 * ── WHY THIS EXISTS (Tom's zzz session, 2026-09-03 00:15-00:18 UTC) ─────────
 *
 * Four of twelve takes were refused as truncated. None of them was truncated.
 * Measured on the archived raw bytes of all four, frame envelope, same code
 * path as below — what the boundary was being taken from, against what the
 * read actually was:
 *
 *   take        edge run the gate stopped on      the real first/last word
 *   3A0B0B65    0.06 s,  10 ms, -34.4 dB          1.96 s, 240 ms, -16.8 dB
 *   A82355A4    0.05 s,  20 ms, -33.5 dB          2.24 s, 420 ms, -13.2 dB
 *   1D8D62DA    0.05 s,  20 ms, -38.1 dB          1.73 s, 200 ms, -17.4 dB
 *   C5143A1C    7.03 s (tail), 10 ms, -34.4 dB    ends 5.84 s, 1.29 s of room
 *
 * Every one is a 10-30 ms tick at the very edge of the capture -- the stream
 * start/stop transient -- sitting 17 to 21 dB under the read. The 90th-
 * percentile speech level on those takes is low enough that the tick clears
 * `speechDb - 10`, so it was being read as the first word, the lead margin came
 * out at 0.05-0.06 s against a 0.10 s floor, and four good reads with one and
 * two SECONDS of room in front of them were thrown away.
 *
 * A LENGTH TEST, NOT A LOUDER LINE. Moving the dB line would have to move it
 * past a genuinely quiet first consonant, which is the one thing this gate must
 * never do. What separates these two populations cleanly is duration: 10-30 ms
 * against 200-840 ms on the same eight takes, a factor of nearly seven at its
 * narrowest. 60 ms sits 2x above the longest tick measured and 3.3x below the
 * shortest real word measured. No adult voice puts a syllable in 60 ms.
 *
 * SAFE IN THE DIRECTION THAT MATTERS. A genuinely clipped take -- Aran's, the
 * population this gate was built for -- opens at frame zero on a whole WORD,
 * hundreds of milliseconds long. That run passes this floor, the lead is still
 * 0.00 s, and it is still refused. And if no run anywhere in a take reaches the
 * floor, `found` goes false, which the caller treats as UNCHECKED and flags --
 * never as a refusal. This can lose a refusal; it cannot lose a take.
 *
 * DEFAULT, not a ruling.
 */
const EDGE_MIN_RUN_SEC = Number(process.env.RECORDING_GATE_EDGE_MIN_RUN_SEC || 0.06)

/**
 * How much room is there outside the read, at each end? Pure — this is the part
 * the tests pin, and it takes samples so a test can build its own signal.
 *
 * @returns {{leadSec, tailSec, totalSec, speechDb, noiseDb, rangeDb,
 *            nearSpeechDb, found: boolean}}
 */
function boundaryMargins (samples, sampleRate, opts = {}) {
  const belowDb = opts.belowDb != null ? opts.belowDb : NEAR_SPEECH_BELOW_DB
  const fr = envelope.frames(samples, sampleRate)
  const lv = envelope.levels(fr.db)
  const totalSec = samples.length / sampleRate
  const base = {
    totalSec,
    speechDb: lv.speechDb,
    noiseDb: lv.noiseDb,
    rangeDb: (lv.speechDb != null && lv.noiseDb != null) ? lv.speechDb - lv.noiseDb : null,
  }
  if (!fr.db.length || lv.speechDb == null || lv.speechDb <= -119) {
    return { ...base, nearSpeechDb: null, leadSec: null, tailSec: null, found: false }
  }
  const nearSpeechDb = lv.speechDb - belowDb
  // The first and last frames of a near-speech run LONG ENOUGH TO BE A WORD.
  // A bare "first frame over the line" stops on the capture's own start/stop
  // tick -- see EDGE_MIN_RUN_SEC above for the four takes that cost.
  const minRun = Math.max(1, Math.round(
    (opts.minRunSec != null ? opts.minRunSec : EDGE_MIN_RUN_SEC) * 1000 / fr.hopMs
  ))
  let first = -1
  let last = -1
  let runStart = -1
  for (let i = 0; i <= fr.db.length; i++) {
    const over = i < fr.db.length && fr.db[i] >= nearSpeechDb
    if (over) { if (runStart < 0) runStart = i; continue }
    if (runStart >= 0) {
      if (i - runStart >= minRun) { if (first < 0) first = runStart; last = i - 1 }
      runStart = -1
    }
  }
  if (first < 0) return { ...base, nearSpeechDb, leadSec: null, tailSec: null, found: false }
  const hopSec = fr.hopMs / 1000
  return {
    ...base,
    nearSpeechDb,
    // Frame i covers [i*hop, i*hop + window). The lead is the time before the
    // first near-speech frame opens; the tail is the time after the last one
    // closes, measured at its hop edge so the two are symmetric.
    leadSec: first * hopSec,
    tailSec: Math.max(0, totalSec - (last + 1) * hopSec),
    found: true,
  }
}

/**
 * Is this take cut off at either end?
 *
 * Same three-outcome contract as checkTakeHasSpeech: `pass: true`,
 * `pass: false`, `pass: null` with `checked: false` when the instrument could
 * not run. An unchecked take is FLAGGED by the caller, never refused.
 *
 * @param {object} o
 * @param {Buffer} [o.buffer]   the mastered take's bytes
 * @param {string} [o.filePath] ...or a path to it. One of the two is required.
 * @param {number} [o.minMarginSec] override, for calibration
 * @returns {Promise<{pass:boolean|null, checked:boolean, reason:string,
 *                    message:string|null, detail:object}>}
 */
async function checkTakeBoundaries ({ buffer, filePath, minMarginSec } = {}) {
  const minMargin = minMarginSec != null ? minMarginSec : BOUNDARY_MIN_MARGIN_SEC
  const detail = { minMarginSec: minMargin }

  const av = await decode.availability()
  if (!av.available) {
    return { pass: null, checked: false, reason: 'unchecked_no_decoder', message: null, detail: { ...detail, missing: av.missing } }
  }

  let spilled = null
  let d = null
  try {
    if (!filePath) {
      if (!buffer) {
        return { pass: null, checked: false, reason: 'unchecked_no_audio', message: null, detail }
      }
      spilled = path.join(os.tmpdir(), `take-bounds-${crypto.randomBytes(8).toString('hex')}.audio`)
      fs.writeFileSync(spilled, buffer)
    }
    d = await decode.decode(filePath || spilled)
  } catch (e) {
    if (spilled) { try { fs.unlinkSync(spilled) } catch { /* already gone */ } }
    return {
      pass: null, checked: false, reason: 'unchecked_decode_error', message: null,
      detail: { ...detail, error: String(e && e.message).slice(0, 200) },
    }
  }

  try {
    const m = boundaryMargins(d.samples, d.sampleRate)
    detail.durationSec = +m.totalSec.toFixed(3)
    detail.speechDb = m.speechDb == null ? null : +m.speechDb.toFixed(1)
    detail.noiseDb = m.noiseDb == null ? null : +m.noiseDb.toFixed(1)
    detail.dynamicRangeDb = m.rangeDb == null ? null : +m.rangeDb.toFixed(1)
    detail.nearSpeechDb = m.nearSpeechDb == null ? null : +m.nearSpeechDb.toFixed(1)
    detail.leadMarginSec = m.leadSec == null ? null : +m.leadSec.toFixed(3)
    detail.tailMarginSec = m.tailSec == null ? null : +m.tailSec.toFixed(3)

    // Nothing that reads as a voice in here at all. That is checkTakeHasSpeech's
    // verdict to give, not this one's — this check has no opinion on it.
    if (!m.found) {
      return { pass: null, checked: false, reason: 'unchecked_no_speech_level', message: null, detail }
    }

    // No usable dynamic range: the near-speech line cannot separate anything.
    if (m.rangeDb == null || m.rangeDb < BOUNDARY_MIN_RANGE_DB) {
      return { pass: null, checked: false, reason: 'unchecked_low_dynamic_range', message: null, detail }
    }

    const startCut = m.leadSec < minMargin
    const endCut = m.tailSec < minMargin
    if (!startCut && !endCut) {
      return { pass: true, checked: true, reason: 'boundaries_have_room', message: null, detail }
    }
    const reason = (startCut && endCut) ? 'speech_truncated_at_both_ends'
      : startCut ? 'speech_truncated_at_start'
        : 'speech_truncated_at_end'
    return { pass: false, checked: true, reason, message: MESSAGES[reason], detail }
  } finally {
    d.dispose()
    if (spilled) { try { fs.unlinkSync(spilled) } catch { /* already gone */ } }
  }
}

module.exports = {
  checkTakeHasSpeech,
  checkTakeBoundaries,
  boundaryMargins,
  ceilingFor,
  languageForTake,
  MESSAGES,
  MAX_SEC_PER_SYLLABLE,
  GRACE_SEC,
  NEAR_SPEECH_BELOW_DB,
  BOUNDARY_MIN_MARGIN_SEC,
  BOUNDARY_MIN_RANGE_DB,
  EDGE_MIN_RUN_SEC,
}
