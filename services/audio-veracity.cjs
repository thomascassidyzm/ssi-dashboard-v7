/**
 * audio-veracity.cjs — "are the words we asked for actually in this clip?"
 *
 * THE PROBLEM THIS EXISTS FOR (Tom, 2026-08-04): "this is all audio content so
 * it appears in all environments immediately... if there's a problem, we need
 * to fix it faster because it's in front of learners — and also, we need to be
 * sure." There is no staging environment between a TTS render and a learner's
 * ear: the moment a row lands in course_audio and its object is on S3, someone
 * can hear it. So the check has to happen BEFORE the write, not after.
 *
 * THE METHOD, and it is not the obvious one.
 * An UNPRIMED ASR round-trip: decode the mastered audio with whisper having
 * NEVER seen the expected text, then compare the two strings afterwards.
 * Measured on 165 real SSi clips (docs/forced-alignment-2026-08-04/findings.md):
 * 98.8% recall, 1.2% false-alarm rate across silent stubs, near-silent clips
 * and truncations.
 *
 * ⚠️ DO NOT "IMPROVE" THIS INTO FORCED ALIGNMENT OR A CONFIDENCE SCORE.
 * That route was tested and it fails. Constraining the decode to the expected
 * text (whisper.cpp --grammar) scored a TRUNCATED clip 1.000 and its healthy
 * twin 0.979 — "once the grammar removes the alternatives, the softmax
 * renormalises over what is left and the reported probability goes to ~1
 * regardless of the acoustics" (findings §5). Whisper's free-decode token
 * probabilities are just as useless: healthy and broken distributions overlap,
 * and min_tok_p is WORSE for healthy clips than for silent stubs (findings §1).
 * The method works BECAUSE the decode is free. If you find yourself reaching
 * for a confidence number, you have taken the wrong turn.
 *
 * ⚠️ VALIDATED ON SILENCE AND TRUNCATION ONLY.
 * Mispronunciation was NOT tested — no ground truth for it exists — and it is
 * precisely the class where a free decode could launder a wrong word into the
 * expected one, because the acoustic evidence is present but wrong and the
 * language model has something to guess from. Silence and truncation are safe
 * from that failure mode for a structural reason: they remove the evidence
 * entirely, so there is nothing left to guess from. Do not let the 98.8%
 * headline travel without this qualifier (findings §5, §7).
 *
 * OTHER LIMITS carried from the findings, stated rather than buried:
 *  - the CER threshold was fitted on German and English;
 *  - the truncation ground truth is one course (deu_for_eng), three voices;
 *  - whisper's own error rate is a floor on precision — on a 10k sweep at ~1%
 *    that is ~100 healthy clips into a human queue.
 *
 * THREE OUTCOMES, NEVER TWO. `pass: true`, `pass: false`, and `pass: null`
 * meaning "I could not check this". A gate that cannot tell a pass from an
 * unchecked clip is the exact bug that bit this estate three times on
 * 2026-08-04 (the xAI phonology gate silently disabling itself on missing
 * macOS paths being the headline one). Callers MUST branch on `checked`.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const { execFile } = require('child_process')

// ---------------------------------------------------------------------------
// Operating point
// ---------------------------------------------------------------------------

/**
 * THE OPERATING POINT, quoted verbatim from
 * docs/forced-alignment-2026-08-04/findings.md §1:
 *
 *   "Flag when the decode is empty or a non-speech marker ([BLANK_AUDIO],
 *    [Musik]), OR CER >= 0.3."
 *
 * At that point: silent_stub 25/25 caught, near_silent 21/21, truncated 24/25,
 * good_paired 0/50 flagged, good_unflagged 0/27 flagged.
 *
 * DEFAULT, not a ruling — Tom has not been asked to sign off on 0.3. It is a
 * named constant so a future ruling is a one-line change.
 */
const CER_THRESHOLD = Number(process.env.AUDIO_VERACITY_CER_THRESHOLD || 0.3)

/**
 * Whisper's own non-speech markers are a first-class signal, not noise: they
 * fire on 18/25 silent stubs and 15/21 near-silent clips and 0/94 good clips
 * (findings §1). The marker vocabulary is localised by the decode language
 * ([BLANK_AUDIO], [Musik], [Musique], (silence), *sighs*), so the rule is
 * structural — a decode made ENTIRELY of bracketed/parenthesised/asterisked
 * annotations contains no transcribed speech, whatever the language.
 * (The rule itself lives in isNonSpeechDecode below.)
 */

/** whisper wants ISO-639-1; course_audio.language is 639-3-ish. */
const WHISPER_ISO1 = {
  deu: 'de', eng: 'en', fra: 'fr', spa: 'es', ita: 'it', por: 'pt', nld: 'nl',
  cat: 'ca', glg: 'gl', ron: 'ro', ell: 'el', rus: 'ru', ukr: 'uk', pol: 'pl',
  ces: 'cs', slk: 'sk', slv: 'sl', hrv: 'hr', srp: 'sr', bul: 'bg', mkd: 'mk',
  hun: 'hu', fin: 'fi', est: 'et', lav: 'lv', lit: 'lt', swe: 'sv', dan: 'da',
  nor: 'no', nob: 'no', isl: 'is', tur: 'tr', aze: 'az', kaz: 'kk', hye: 'hy',
  kat: 'ka', heb: 'he', ara: 'ar', fas: 'fa', urd: 'ur', hin: 'hi', ben: 'bn',
  pan: 'pa', guj: 'gu', mar: 'mr', tam: 'ta', tel: 'te', kan: 'kn', mal: 'ml',
  sin: 'si', nep: 'ne', tha: 'th', vie: 'vi', ind: 'id', msa: 'ms', zsm: 'ms',
  tgl: 'tl', jpn: 'ja', kor: 'ko', zho: 'zh', cmn: 'zh', yue: 'yue', cym: 'cy',
  gle: 'ga', gla: 'gd', bre: 'br', eus: 'eu', afr: 'af', swa: 'sw', yor: 'yo',
  hau: 'ha', amh: 'am', mya: 'my', khm: 'km', lao: 'lo', mlt: 'mt', sqi: 'sq',
  bos: 'bs', bel: 'be', mon: 'mn', uzb: 'uz', tat: 'tt', occ: 'oc', ltz: 'lb',
}

/**
 * Languages where 0.3 has NOT been fitted, so a slacker threshold is used.
 *
 * findings §7, explicit gap: "CER thresholds are language-dependent. 0.3 was
 * fitted on German and English. zho, jpn and tha have no word boundaries and
 * will need a different normalisation entirely." Enforcing an unfitted 0.3 on
 * a live jpn build risks mass-quarantining healthy audio, which is a worse
 * failure than not checking.
 *
 * But NOT checking at all is also wrong, and the replay proved it: a
 * near-silent Chinese clip ("十二点。") decoded as the subtitle-credit
 * hallucination "字幕:J Chong" — whisper's signature output on silence — and
 * sailed through when CER was merely advisory here. So these languages get
 * CER_THRESHOLD_UNVALIDATED instead: at 1.0 the decode has to differ from the
 * expected text by more characters than the expected text contains, i.e. be
 * essentially unrelated content. No plausible healthy render scores that, in
 * any script, so it cannot mass-quarantine — and it catches the hallucination
 * class, which is the one that actually matters here.
 *
 * DEFAULT, not a ruling. Measure CER on real clips in one of these languages
 * and this whole special case goes away.
 */
const CER_UNVALIDATED_LANGUAGES = new Set(['zh', 'yue', 'ja', 'th', 'lo', 'my', 'km'])
const CER_THRESHOLD_UNVALIDATED = Number(process.env.AUDIO_VERACITY_CER_THRESHOLD_UNVALIDATED || 1.0)

/**
 * Languages where the DECODER ITSELF does not work, so there is nothing to gate.
 *
 * whisper.cpp accepts every code in WHISPER_ISO1 — `-l si` does not error, it
 * decodes. What comes back for Sinhala is a degenerate repetition loop:
 *
 *   text   අද අපිට ප්‍රශ්නේ ගැන සාකච්ඡා කරන්න අවශ්‍යයි
 *   decode වවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවව…
 *
 * The gate reads that as "the words are not in this clip" and refuses the
 * render. It is a FALSE NEGATIVE every time, and it blocked eng_for_sin lego
 * S0225L01 three times before anyone worked out why. A gate that cannot read a
 * language is not protecting it — it is only blocking it.
 *
 * MEASURED, not assumed. tools/whisper-capability-probe/ (committed alongside)
 * ran two independent experiments over 50 estate languages, ~20 live clips each:
 *
 *  1. DISCRIMINATION. Score each free decode against its own text and against
 *     distractor texts from the same language. A decoder that reads the language
 *     separates the two by 0.29-0.92 CER. These six separate by 0.06-0.15 —
 *     their decodes are no closer to what was said than to anything else,
 *     because the output does not depend on the input.
 *
 *  2. FALSE NEGATIVES ON PROVEN AUDIO. Restrict to clips whose Azure
 *     word_boundaries independently record the full script as spoken, with the
 *     last word landing at the end of the clip — so the words ARE there, on
 *     evidence that does not come from whisper. Every gate failure on that set
 *     is a false negative by construction:
 *
 *       si 15/15   bn 15/15   gu 15/15   te 15/15   kn 15/15   pa 14/15
 *       controls:  en 0/15    hi 0/15    es 0/15    it 0/15    sw 0/15
 *
 * Both experiments pick out the SAME six, with a ~2x gap to the next language.
 * The tell is the reason mix: these six fail 100% on cer_above_threshold with
 * ZERO last_word_missing — the signature of unrelated output, not of damage.
 *
 * WHAT IS DELIBERATELY *NOT* HERE, though it fails often. Languages whose decoder
 * works but whose COMPARISON is mismatched are a different bug and must not be
 * silently un-gated by this set:
 *   de  Austrian dialect script vs standard orthography ("a Glasl Wossa" ->
 *       "Akklassewasser"): separation 0.61, so the decoder hears it fine.
 *   hy  numerals — "100. … 200." decoded correctly as "հարյուր, երկու հարյուր".
 *   eu  word segmentation trips the last-word rule.
 *   is  genuinely sloppy but still separating at 0.37.
 * Those want a threshold or normalisation fix, not a capability guard. They are
 * written up in docs/whisper-decoder-capability-2026-08-19.md.
 *
 * ONLY these six are skipped. Every other language keeps its gate — including
 * the ones this probe never reached. That is a deliberate choice against the
 * "skip anything unverified" default: unchecked audio reaching a learner is the
 * worse failure (there is no staging environment), and a gate that wrongly
 * BLOCKS fails loudly and gets investigated, which is exactly how the Sinhala
 * case surfaced. The measured-nothing languages are named in the doc.
 *
 * Measured 2026-08-19 against ggml-small. A bigger model would move this list;
 * re-run the probe before assuming it still holds.
 */
const DECODER_NOT_VALIDATED = new Set(['si', 'bn', 'pa', 'gu', 'te', 'kn'])

/** Can the decoder actually read this language? Takes 639-3 or ISO-639-1. */
function decoderValidated (language) {
  const raw = String(language || '').toLowerCase()
  const iso1 = WHISPER_ISO1[raw] || (raw.length === 2 ? raw : null)
  return !(iso1 && DECODER_NOT_VALIDATED.has(iso1))
}

/**
 * A CER threshold ALONE is not enough, and the estate proved it on the first
 * real run of this module.
 *
 * CER is a ratio. On a two-character text the denominator is two, so any ASR
 * near-miss is a catastrophic-looking score. Measured 2026-08-04 on the first
 * 12 deu_for_eng clips this tool ever checked, all of them healthy:
 *
 *     "mir"       -> "Mia."       CER 0.33   (1 character out)
 *     "er"        -> "Ja."        CER 1.00   (2 characters out)
 *     "sie"       -> "Z."         CER 1.00   (3 characters out)
 *     "Fehler"    -> "Fila."      CER 0.67   (3 characters out)
 *     "verändert" -> "verinnern." CER 0.33   (3 characters out)
 *
 * Whisper cannot reliably transcribe a two-letter word with no context, and
 * single-LEGO clips are everywhere in this estate. Left alone, CER 0.3 would
 * have filled every repair queue with healthy short clips.
 *
 * So a clip must ALSO be wrong by an absolute number of characters. Replaying
 * the 165 labelled clips at floors 0/2/3/4/5/6, recall is FLAT at 97.6%
 * throughout — no real defect in the set is a near-miss — and at 6 the last
 * genuine false alarm ("etwas stecken" -> "Etwas schm...", 5 characters out)
 * goes too, taking the false-alarm rate to 0/81. Every genuinely bad SHORT clip
 * in the set is caught by the non-speech rule instead, which is unaffected by
 * this floor.
 *
 * The independent argument, which is why this is not curve-fitting: a clip that
 * differs from its script by five characters is not a learner-facing audio
 * defect worth spending a re-render on. Silence and truncation — the two things
 * this gate is validated against — are never five-character events.
 *
 * DEFAULT, not a ruling. Derived 2026-08-04 from the replay, not from the
 * original findings memo.
 */
const MIN_EDIT_DISTANCE = Number(process.env.AUDIO_VERACITY_MIN_EDITS || 6)

// ---------------------------------------------------------------------------
// Binaries — same env conventions as services/tts-service.cjs's phonology gate,
// which was itself broken for weeks by hard-coded macOS paths (commit 428844e3).
// ---------------------------------------------------------------------------

const WHISPER_BIN = process.env.WHISPER
  || (fs.existsSync('/opt/homebrew/bin/whisper-cli') ? '/opt/homebrew/bin/whisper-cli'
    : path.join(os.homedir(), '.local/bin/whisper-cli'))
/**
 * ggml-small, deliberately. findings §6: small separates at 98.8% recall /
 * 1.2% false alarm; medium would cost roughly 3x for headroom the result does
 * not need (and its runtime was never measured — an explicit gap in §6).
 */
const WHISPER_MODEL = process.env.WHISPER_MODEL
  || path.join(os.homedir(), '.local/share/whisper-models/ggml-small.bin')
const FFMPEG_BIN = process.env.FFMPEG
  || (fs.existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg')
const WHISPER_THREADS = Number(process.env.AUDIO_VERACITY_THREADS || 2)

/**
 * Measured 1.71 s/clip at 4 concurrency x 2 threads on this 8-core VM
 * (findings §6). The render is network-bound and this is CPU-bound, so they
 * overlap well — but an unbounded fan-out behind a 20-worker render would
 * thrash the box, so the gate holds its own semaphore.
 */
const MAX_CONCURRENT = Number(process.env.AUDIO_VERACITY_CONCURRENCY || 4)

let active = 0
const waiting = []
function acquire () {
  if (active < MAX_CONCURRENT) { active++; return Promise.resolve() }
  return new Promise(resolve => waiting.push(resolve))
}
function release () {
  const next = waiting.shift()
  if (next) next(); else active--
}

// ---------------------------------------------------------------------------
// Enablement / availability — the third state, made explicit
// ---------------------------------------------------------------------------

const OFF_VALUES = new Set(['0', 'off', 'false', 'no'])

/** False only when someone has deliberately switched the gate off. */
function isGateEnabled () {
  return !OFF_VALUES.has(String(process.env.AUDIO_VERACITY_GATE || '').toLowerCase())
}

/** What is missing, if anything, that stops the gate running. */
function availability () {
  const missing = []
  if (!fs.existsSync(WHISPER_BIN)) missing.push(`whisper-cli (${WHISPER_BIN})`)
  if (!fs.existsSync(WHISPER_MODEL)) missing.push(`model (${WHISPER_MODEL})`)
  return { available: missing.length === 0, missing, bin: WHISPER_BIN, model: WHISPER_MODEL }
}

let announced = false
/**
 * One LOUD line per process saying what state the gate is in. Silence about a
 * disabled gate is how the phonology gate went unchecked for weeks.
 * @returns {{enabled:boolean, available:boolean, missing:string[]}}
 */
function announceStatus (logger = console) {
  const warn = (m) => (logger.warn || logger.log || console.warn).call(logger, m)
  const info = (m) => (logger.info || logger.log || console.log).call(logger, m)
  const av = availability()
  const enabled = isGateEnabled()
  if (!announced) {
    announced = true
    if (!enabled) {
      warn('[audio-veracity] ⚠️  DISABLED via AUDIO_VERACITY_GATE — every clip this process renders is being PUBLISHED UNCHECKED for silence and truncation.')
    } else if (!av.available) {
      warn(`[audio-veracity] ⚠️  CANNOT CHECK — missing ${av.missing.join(' and ')}. Clips are being PUBLISHED UNCHECKED for silence and truncation. This is NOT a pass.`)
    } else {
      info(`[audio-veracity] ON — unprimed whisper round-trip, model ${path.basename(WHISPER_MODEL)}, CER threshold ${CER_THRESHOLD}. Validated on silence + truncation only; mispronunciation is NOT covered. Decoder not validated for ${[...DECODER_NOT_VALIDATED].sort().join(', ')} — clips in those languages are SKIPPED, not passed.`)
    }
  }
  return { enabled, available: av.available, missing: av.missing }
}

/**
 * One LOUD line the FIRST time each unreadable language is skipped.
 *
 * Per language, not per clip: a course build is thousands of clips and a
 * per-clip line would be scrolled past as noise. Per process and per language
 * it is a single unmissable statement that this render published without the
 * silence-and-truncation check — which is the one thing that must never become
 * invisible. The counts still land in stats.uncheckedReasons, so the render
 * report carries the total as well.
 */
const skipAnnounced = new Set()
function announceSkip (iso1, logger = console) {
  if (skipAnnounced.has(iso1)) return
  skipAnnounced.add(iso1)
  ;(logger.warn || logger.log || console.warn).call(logger,
    `[audio-veracity] ⚠️  SKIPPING veracity for '${iso1}' — the whisper decoder is not validated for this language (it returns unrelated output for every clip, good or bad, so gating it only ever produces false negatives). These clips are being PUBLISHED UNCHECKED for silence and truncation. This is NOT a pass.`)
}

/** Test seam: forget that we already announced. */
function _resetAnnouncement () { announced = false; skipAnnounced.clear() }

// ---------------------------------------------------------------------------
// Scoring — pure, and therefore the part that is unit-tested
// ---------------------------------------------------------------------------

/**
 * Normalise for comparison: case, diacritics and punctuation are not what we
 * are measuring. Matches scripts/fa-exp/score.cjs, which produced the numbers
 * in the findings — changing it invalidates the threshold.
 */
function normalise (s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Levenshtein distance, two-row. */
function levenshtein (a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  const cur = new Array(b.length + 1)
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    prev = cur.slice()
  }
  return prev[b.length]
}

/**
 * Character error rate of `decode` against `expected`, both normalised.
 *
 * CER, not word coverage — deliberately. Word coverage false-alarmed on the
 * German compound "um zu bringen" decoded as "umzubringen." (identical audio,
 * different segmentation); CER scored that clip 0.25 (findings §1).
 * @returns {number} 0 = perfect. Unbounded above (insertions can exceed 1).
 */
function characterErrorRate (expected, decode) {
  const e = normalise(expected)
  const d = normalise(decode)
  if (!e.length) return d.length ? 1 : 0
  return levenshtein(e, d) / e.length
}

/** True when the decode carries no transcribed speech at all. */
function isNonSpeechDecode (decode) {
  const raw = String(decode == null ? '' : decode).trim()
  if (!raw) return true
  // Strip whisper's annotation tokens; if nothing survives, nothing was heard.
  const stripped = raw
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\*[^*]*\*/g, ' ')
    .replace(/♪[^♪]*♪/g, ' ')
    .trim()
  if (!stripped) return true
  return normalise(raw).length === 0
}

/**
 * The verdict, given a decode that has already happened. Pure — this is the
 * function the operating point lives in and the one the tests pin.
 *
 * @param {string} decode  what whisper heard, having never seen `expected`
 * @param {string} expected  the text actually sent to TTS
 * @param {string} [iso1]  the pinned decode language, which picks the threshold
 * @returns {{pass:boolean, reason:string, cer:number, threshold:number}}
 */
function verdictFromDecode (decode, expected, iso1) {
  const e = normalise(expected)
  const d = normalise(decode)
  const edits = e.length ? levenshtein(e, d) : (d.length ? 1 : 0)
  const cer = e.length ? edits / e.length : (d.length ? 1 : 0)

  // Rule 1, language-independent: nothing was transcribed at all.
  if (isNonSpeechDecode(decode)) {
    return { pass: false, reason: 'non_speech_decode', cer, edits, threshold: 0 }
  }

  // Rule 2: wrong by a large FRACTION of the script AND by an absolute number
  // of characters. Both, always — see MIN_EDIT_DISTANCE for why the ratio
  // alone flags healthy one-word clips.
  const unfitted = CER_UNVALIDATED_LANGUAGES.has(String(iso1 || ''))
  const threshold = unfitted ? CER_THRESHOLD_UNVALIDATED : CER_THRESHOLD
  if (cer >= threshold && edits >= MIN_EDIT_DISTANCE) {
    return {
      pass: false,
      reason: unfitted ? 'cer_above_unvalidated_language_threshold' : 'cer_above_threshold',
      cer,
      edits,
      threshold,
    }
  }
  // Rule 3: the LAST WORD of the script must be audible in the decode.
  //
  // Tom, 2026-08-07, listening to fra_for_eng: "the audio is losing its LAST
  // WORD. About 1 in 3 files. Both languages. The final word is wholly missing
  // and the clip ends in a gap." Rules 1 and 2 are both blind to that:
  // the clip is full of speech, and dropping one short word off the end is a
  // handful of character edits, so it lands under MIN_EDIT_DISTANCE or under
  // the CER threshold or both. Measured: "I want to speak French" without
  // "French" scores CER 0.27 against a 0.3 threshold — a pass.
  //
  // So the last word is checked as its own event, not as a fraction. Fuzzily,
  // and only against the TAIL of the decode, because whisper's spelling of a
  // final word is unreliable while its PRESENCE is exactly what we are asking
  // about.
  const lw = lastWordVerdict(e, d)
  if (!lw.ok) {
    return { pass: false, reason: 'last_word_missing', cer, edits, threshold, lastWord: lw.word }
  }

  return { pass: true, reason: 'ok', cer, edits, threshold }
}

/**
 * Is the script's final word present at the end of the decode?
 *
 * Tolerance scales with word length: a 3-letter word has to match exactly
 * (whisper does not mangle "you" in context, and a loose match on short words
 * would find one anywhere), a longer word gets 1-2 edits of slack for
 * transcription spelling. Only the last three decoded words are searched, so a
 * word that appears EARLIER in the clip cannot vouch for a missing ending —
 * which is the whole defect being hunted.
 *
 * Single-word scripts are exempt: if the only word is gone there is no speech
 * left, and Rule 1 has already failed the clip.
 *
 * @param {string} e normalised expected text
 * @param {string} d normalised decode
 */
function lastWordVerdict (e, d) {
  const ew = e.split(' ').filter(Boolean)
  const dw = d.split(' ').filter(Boolean)
  if (ew.length < 2) return { ok: true, word: null }

  const word = ew[ew.length - 1]
  const tolerance = word.length <= 3 ? 0 : word.length <= 6 ? 1 : 2
  const tail = dw.slice(-3)
  for (const cand of tail) {
    if (levenshtein(word, cand) <= tolerance) return { ok: true, word }
  }
  return { ok: false, word }
}

// ---------------------------------------------------------------------------
// The decode itself
// ---------------------------------------------------------------------------

const run = (cmd, args, opts = {}) => new Promise((resolve, reject) => {
  execFile(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 24, ...opts }, (err, stdout, stderr) => {
    if (err) return reject(new Error((stderr || err.message || '').toString().slice(0, 300)))
    resolve(stdout)
  })
})

/**
 * Free, unprimed decode of one clip.
 *
 * NO --prompt, NO --grammar, NO priming of any kind. The expected text is
 * never given to whisper; it is used only afterwards by verdictFromDecode.
 * Feeding the model the answer is what makes it able to hallucinate a pass.
 */
async function decodeAudio (input, iso1) {
  const base = path.join(os.tmpdir(), `veracity-${crypto.randomUUID()}`)
  const src = Buffer.isBuffer(input) ? `${base}.src` : input
  const wav = `${base}.wav`
  const json = `${base}.json`
  const made = []
  try {
    if (Buffer.isBuffer(input)) { fs.writeFileSync(src, input); made.push(src) }
    await run(FFMPEG_BIN, ['-y', '-loglevel', 'error', '-i', src, '-ar', '16000', '-ac', '1', wav])
    made.push(wav)
    // JSON output, NOT `-nt` stdout. Measured 2026-08-04 while validating this
    // module: on a two-segment German clip, `-nt` printed only the first
    // segment ("Aber ich will nicht fertig sein,") while `-oj` carried the
    // whole transcript ("...weil ich mehr vertreibte."). Reading stdout would
    // have manufactured a truncation false alarm on every multi-segment clip
    // in the estate. The JSON path is also exactly what scripts/fa-exp/score.cjs
    // used, so the thresholds in the findings apply to this code unchanged.
    await run(WHISPER_BIN, [
      '-m', WHISPER_MODEL,
      '-l', iso1 || 'auto',
      '-t', String(WHISPER_THREADS),
      '-np',              // no progress spam in the render log
      '-oj', '-of', base, // -> `${base}.json`
      '-f', wav,
    ])
    made.push(json)
    const parsed = JSON.parse(fs.readFileSync(json, 'utf8'))
    return (parsed.transcription || []).map(s => s.text).join(' ').trim()
  } finally {
    for (const f of made) { try { fs.unlinkSync(f) } catch {} }
  }
}

/**
 * Check one clip. THE function both the pre-publish gate and the repair loop
 * call — there is deliberately only one implementation of the operating point.
 *
 * @param {Buffer|string} input   mastered audio buffer, or a path to a file
 * @param {string} expectedText   the text ACTUALLY sent to TTS (post gender
 *                                expansion — using the pre-expansion text
 *                                false-alarms on every gendered clip)
 * @param {string} language       course_audio.language (639-3-ish), or ISO-639-1
 * @returns {Promise<{pass:boolean|null, checked:boolean, reason:string,
 *                    cer:number|null, decode:string|null, language:string|null,
 *                    ms:number, detail?:string}>}
 *   `pass === null` means NOT CHECKED. It is never a pass. Branch on `checked`.
 */
async function checkAudioVeracity (input, expectedText, language, opts = {}) {
  const t0 = Date.now()
  const unchecked = (reason, detail) => ({
    pass: null, checked: false, reason, detail, cer: null, decode: null,
    language: null, ms: Date.now() - t0,
  })

  if (!isGateEnabled()) return unchecked('unchecked_disabled', 'AUDIO_VERACITY_GATE is off')
  if (!String(expectedText || '').trim()) return unchecked('unchecked_no_text', 'no expected text to compare against')
  const av = availability()
  if (!av.available) return unchecked('unchecked_no_whisper', av.missing.join(' and '))

  const raw = String(language || '').toLowerCase()
  const iso1 = WHISPER_ISO1[raw] || (raw.length === 2 ? raw : null)

  // The decoder cannot read this language, so its verdict would be noise. Say
  // "not checked" — never "pass" — and do it BEFORE acquire(), so a blind
  // language does not sit in the whisper queue ahead of one we can actually
  // read. See DECODER_NOT_VALIDATED for the measurement.
  if (iso1 && DECODER_NOT_VALIDATED.has(iso1)) {
    announceSkip(iso1, opts.logger)
    return { ...unchecked('unchecked_decoder_not_validated', `whisper decoder is not validated for '${iso1}' — every verdict it gives in this language is noise`), language: iso1 }
  }

  await acquire()
  let decode
  try {
    decode = await decodeAudio(input, iso1 || 'auto')
  } catch (e) {
    return unchecked('unchecked_decode_error', String(e.message).slice(0, 200))
  } finally {
    release()
  }

  const v = verdictFromDecode(decode, expectedText, iso1)
  return {
    pass: v.pass,
    checked: true,
    reason: v.reason,
    cer: +v.cer.toFixed(4),
    edits: v.edits,
    threshold: v.threshold,
    decode,
    expected: String(expectedText),
    language: iso1 || 'auto',
    languageUnmapped: !iso1,
    ms: Date.now() - t0,
    ...(opts.meta ? { meta: opts.meta } : {}),
  }
}

// ---------------------------------------------------------------------------
// Quarantine — a durable record plus the failing bytes, never a silent skip
// ---------------------------------------------------------------------------

const QUARANTINE_DIR = process.env.AUDIO_VERACITY_QUARANTINE_DIR
  || path.join(__dirname, '..', 'scripts', 'audio-veracity-quarantine')

/**
 * Park a clip that failed every attempt. The audio is kept so it can be
 * listened to — a quarantined clip is evidence, and the one thing the findings
 * are explicit they could not do is listen (findings §7).
 * Never throws: losing the record is bad, killing the render is worse.
 * @returns {{dir:string, audioPath:string|null}|null}
 */
function quarantine (record, audioBuffer, logger = console) {
  try {
    const course = String(record.courseCode || 'unknown').replace(/[^\w.-]/g, '_')
    const dir = path.join(QUARANTINE_DIR, course)
    fs.mkdirSync(dir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const slug = crypto.createHash('sha1')
      .update(`${record.text || ''}|${record.role || ''}|${record.language || ''}`)
      .digest('hex').slice(0, 10)
    let audioPath = null
    if (Buffer.isBuffer(audioBuffer)) {
      audioPath = path.join(dir, `${stamp}-${slug}.mp3`)
      fs.writeFileSync(audioPath, audioBuffer)
    }
    const entry = { quarantined_at: new Date().toISOString(), audio_path: audioPath, ...record }
    fs.appendFileSync(path.join(QUARANTINE_DIR, 'quarantine.jsonl'), JSON.stringify(entry) + '\n')
    return { dir, audioPath }
  } catch (e) {
    ;(logger.error || logger.log || console.error).call(logger,
      `[audio-veracity] QUARANTINE RECORD FAILED for "${String(record.text || '').slice(0, 40)}": ${e.message} — the clip was still NOT published.`)
    return null
  }
}

// ---------------------------------------------------------------------------
// Counters for the render report
// ---------------------------------------------------------------------------

/** The counts Tom asked to see on every render. */
function newStats () {
  return { checked: 0, passed: 0, failed: 0, rerendered: 0, quarantined: 0, unchecked: 0, uncheckedReasons: {} }
}

/** Fold one verdict into a stats object. */
function recordVerdict (stats, verdict) {
  if (!stats) return
  if (!verdict || verdict.checked !== true) {
    stats.unchecked++
    const r = verdict?.reason || 'unchecked_unknown'
    stats.uncheckedReasons[r] = (stats.uncheckedReasons[r] || 0) + 1
    return
  }
  stats.checked++
  if (verdict.pass) stats.passed++; else stats.failed++
}

// ---------------------------------------------------------------------------
// The gate itself — render, check, re-render, quarantine
// ---------------------------------------------------------------------------

/**
 * DEFAULT: the first render plus 2 more attempts, then quarantine.
 * A default, not a ruling. Two re-rolls is what tools/repair-silent-clips.cjs
 * uses for the same class of transient provider damage.
 */
const DEFAULT_ATTEMPTS = Number(process.env.AUDIO_VERACITY_ATTEMPTS || 3)

/**
 * Render a clip and refuse to hand it back unless it passes the gate.
 *
 * THE ONE PLACE the publish decision is made. Callers get either audio that is
 * safe to publish, or `published: false` and a clip that has already been
 * quarantined — they never get a failing buffer with a warning attached,
 * because a warning next to a returned buffer is a buffer that gets published.
 *
 * @param {object} o
 * @param {() => Promise<{buffer:Buffer, durationMs:number, wordBoundaries?:any}>} o.render
 *        renders AND masters one attempt. Called up to `attempts` times.
 *        Must return the buffer that would ACTUALLY be published — mastering
 *        is part of what can damage a clip, so the gate checks its output.
 * @param {string} o.expectedText  the text sent to TTS, POST gender expansion.
 *        Using the pre-expansion text false-alarms on every gendered clip.
 * @param {string} o.language      course_audio.language
 * @param {object} [o.meta]        recorded on the quarantine entry
 * @param {object} [o.stats]       a newStats() object to fold counts into
 * @returns {Promise<{published:boolean, buffer?:Buffer, durationMs?:number,
 *                    wordBoundaries?:any, verdict:object, attempts:number,
 *                    verdicts:object[], quarantine?:object}>}
 */
async function renderChecked (o) {
  const { render, expectedText, language, meta = {}, stats, logger = console } = o
  const attempts = Number(o.attempts || DEFAULT_ATTEMPTS)
  // Test seam only. Production callers never pass this.
  const check = o.check || checkAudioVeracity
  const warn = (m) => (logger.warn || logger.log || console.warn).call(logger, m)
  const err = (m) => (logger.error || logger.log || console.error).call(logger, m)
  const label = `${meta.role || '?'} "${String(expectedText).slice(0, 40)}"`

  const verdicts = []
  let last = null
  for (let attempt = 1; attempt <= attempts; attempt++) {
    last = await render(attempt)
    const verdict = await check(last.buffer, expectedText, language, { meta })
    verdicts.push({ attempt, ...verdict, decode: verdict.decode })

    if (!verdict.checked) {
      // NOT a pass — an admission. Publish (the alternative is halting the
      // estate on a missing binary) but never let it count as verified.
      recordVerdict(stats, verdict)
      return { published: true, ...last, verdict, attempts: attempt, verdicts }
    }
    if (verdict.pass) {
      recordVerdict(stats, verdict)
      if (attempt > 1 && stats) stats.rerendered++
      if (attempt > 1) {
        warn(`[audio-veracity] ${label}: passed on attempt ${attempt}/${attempts} (CER ${verdict.cer}) — first render was defective and was NOT published`)
      }
      return { published: true, ...last, verdict, attempts: attempt, verdicts }
    }
    warn(`[audio-veracity] ${label}: FAILED attempt ${attempt}/${attempts} — ${verdict.reason}, CER ${verdict.cer}, heard ${JSON.stringify(String(verdict.decode).slice(0, 60))}${attempt < attempts ? ' — re-rendering' : ''}`)
  }

  // Every attempt failed. Nothing is uploaded, nothing is inserted, nothing is
  // bound — and the clip is parked with its audio so it can be listened to.
  if (stats) { stats.checked++; stats.failed++; stats.quarantined++ }
  const q = quarantine({
    ...meta,
    text: expectedText,
    language,
    attempts,
    verdicts: verdicts.map(v => ({ attempt: v.attempt, reason: v.reason, cer: v.cer, decode: v.decode })),
  }, last?.buffer, logger)
  err(`[audio-veracity] ${label}: QUARANTINED after ${attempts} attempts — NOT published.${q?.audioPath ? ` Audio kept at ${q.audioPath}` : ''}`)
  return { published: false, verdict: verdicts[verdicts.length - 1], attempts, verdicts, quarantine: q }
}

/** One line for a log or a completion message. */
function formatStats (stats) {
  if (!stats) return 'veracity: no data'
  const bits = [
    `${stats.checked} checked`,
    `${stats.failed} failed`,
    `${stats.rerendered} re-rendered`,
    `${stats.quarantined} quarantined`,
    `${stats.unchecked} UNCHECKED`,
  ]
  const why = Object.entries(stats.uncheckedReasons || {}).map(([k, v]) => `${k}=${v}`).join(', ')
  return `veracity: ${bits.join(', ')}${why ? ` (${why})` : ''}`
}

module.exports = {
  renderChecked,
  DEFAULT_ATTEMPTS,
  checkAudioVeracity,
  verdictFromDecode,
  characterErrorRate,
  isNonSpeechDecode,
  normalise,
  decodeAudio,
  availability,
  isGateEnabled,
  announceStatus,
  quarantine,
  newStats,
  recordVerdict,
  formatStats,
  CER_THRESHOLD,
  CER_UNVALIDATED_LANGUAGES,
  CER_THRESHOLD_UNVALIDATED,
  DECODER_NOT_VALIDATED,
  decoderValidated,
  MIN_EDIT_DISTANCE,
  WHISPER_ISO1,
  QUARANTINE_DIR,
  _resetAnnouncement,
}
