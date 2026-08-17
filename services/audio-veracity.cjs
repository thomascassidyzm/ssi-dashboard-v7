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
      info(`[audio-veracity] ON — unprimed whisper round-trip, model ${path.basename(WHISPER_MODEL)}, CER threshold ${CER_THRESHOLD}. GRADUATED SAMPLING, PER COURSE: ${(SAMPLE_RATE_FIRST * 100).toFixed(0)}% opening, ${(SAMPLE_RATE_TRUSTED * 100).toFixed(0)}% after ${SAMPLE_STEP_CLEAN} clean sampled clips, relaxing a rung per further ${SAMPLE_STEP_CLEAN} down to a ${(SAMPLE_RATE_FLOOR * 100).toFixed(1)}% floor — a failure snaps it back and every course starts fresh. Validated on silence + truncation only; mispronunciation is NOT covered.`)
    }
  }
  return { enabled, available: av.available, missing: av.missing }
}

/** Test seam: forget that we already announced. */
function _resetAnnouncement () { announced = false }

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

// ---------------------------------------------------------------------------
// Numerals — "£48" and "forty-eight pounds" are the same clip
// ---------------------------------------------------------------------------

/**
 * WHY THIS EXISTS (the 2026-08-13 pod-0 English render).
 *
 * Whisper writes what the orthography prefers, and English orthography prefers
 * digits: a clip whose script reads "That's forty-eight pounds altogether" comes
 * back "That's £48 altogether". Nothing is missing — the transcript is shorter by
 * fifteen characters purely because a number was SPELT differently. CER is a
 * character ratio, so that lands at 0.5 on a 30-character script and Rule 2
 * convicts every price, room number and time in the estate. Tonight's render
 * quarantined 35 clips and all 35 are this: 12,500 for "twelve thousand and five
 * hundred", 709 for "seven hundred and nine", £12.50 for "twelve pound fifty".
 *
 * Same shape of mistake as the last-word rule before d951ddae: the check asked
 * how a number is WRITTEN when the question is which number was SAID.
 *
 * THE FIX IS A CANONICALISATION, NOT AN EXEMPTION. Both strings are re-read into
 * the same currency — words — before any comparison, and the comparison then runs
 * unchanged at the same operating point. A number that is genuinely wrong or
 * genuinely absent is still a difference after canonicalisation, so it is still
 * caught; only the spelling difference disappears.
 *
 * READINGS, PLURAL. "709" is "seven hundred and nine" in one clip and "seven zero
 * nine" in the next, and "1250" is "one thousand two hundred and fifty" or
 * "twelve hundred and fifty". A single canonical reading would just move the false
 * alarm somewhere else, so each numeral offers its plausible readings and the
 * scoring takes the best-fitting combination. The unmodified text is always among
 * the candidates, which is what makes this change a no-op for every clip that
 * contains no digits on either side.
 *
 * Canonicalisation alone would then LOSE sensitivity: once "£150" reads as "one
 * hundred and fifty", the difference between it and "two hundred and fifty" is
 * three characters, well under MIN_EDIT_DISTANCE. So the numerals are also checked
 * as their own event (Rule 4 in verdictFromDecode), the same way the last word is.
 */

const NUM_SMALL = {
  zero: 0, oh: 0, nought: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
}
const NUM_TENS = {
  twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
}
const NUM_SCALES = { thousand: 1e3, million: 1e6, billion: 1e9 }
const ONES_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS_WORDS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const ORDINAL_WORDS = {
  1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth', 7: 'seventh',
  8: 'eighth', 9: 'ninth', 10: 'tenth', 11: 'eleventh', 12: 'twelfth', 13: 'thirteenth',
  20: 'twentieth', 21: 'twenty first', 30: 'thirtieth',
}

/** British long form, "and" included: 709 -> "seven hundred and nine". */
function numberToWords (n) {
  n = Math.trunc(Math.abs(Number(n) || 0))
  if (n < 20) return ONES_WORDS[n]
  if (n < 100) return (TENS_WORDS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES_WORDS[n % 10] : ''))
  if (n < 1000) {
    const rest = n % 100
    return ONES_WORDS[Math.floor(n / 100)] + ' hundred' + (rest ? ' and ' + numberToWords(rest) : '')
  }
  for (const [word, scale] of [['billion', 1e9], ['million', 1e6], ['thousand', 1e3]]) {
    if (n >= scale) {
      const rest = n % scale
      return numberToWords(Math.floor(n / scale)) + ' ' + word
        + (rest ? (rest < 100 ? ' and ' : ' ') + numberToWords(rest) : '')
    }
  }
  return String(n)
}

/** Digit-by-digit, how a room number or a phone number is often read. */
function digitwiseWords (digits) {
  return String(digits).split('').map(c => ONES_WORDS[Number(c)]).join(' ')
}

/**
 * A currency symbol IS a spoken word, and it is the word the script writes out:
 * "£48" is read "forty-eight pounds", "£12.50" is read "twelve pounds fifty".
 * Whisper writes the symbol, the script writes the word, and without this the
 * word looks dropped — which fired Rule 3 on "a hundred and fifty pounds" heard
 * as "£150". English puts the word after the amount, or between the parts of a
 * price, so both placements are offered as readings and the best fit wins.
 */
const CURRENCY_WORDS = {
  '£': 'pounds', $: 'dollars', '€': 'euros', '¥': 'yen', '₹': 'rupees',
  '₩': 'won', '₪': 'shekels', '₺': 'lira', '₫': 'dong', '₴': 'hryvnia', '₦': 'naira',
}

/**
 * The plausible spoken readings of one numeric token, RAW FORM FIRST so that
 * leaving the text untouched is always one of the candidates.
 */
function numeralReadings (token) {
  const cur = CURRENCY_WORDS[token[0]]
  if (cur) {
    const base = numeralReadings(token.slice(1))
    const dec = /^(\d+)\.(\d{2})$/.exec(token.slice(1))
    const out = [token, ...base.slice(1).map(r => `${r} ${cur}`)]
    // "twelve pounds fifty" — the word sits between the parts of a price.
    if (dec) out.push(`${numberToWords(Number(dec[1]))} ${cur} ${numberToWords(Number(dec[2]))}`)
    return [...new Set(out)]
  }
  const out = [token]
  const ord = /^(\d+)(st|nd|rd|th)$/i.exec(token)
  if (ord) {
    const n = Number(ord[1])
    out.push(ORDINAL_WORDS[n] || (numberToWords(n) + 'th'))
    return out
  }
  const dec = /^(\d+)\.(\d+)$/.exec(token)
  if (dec) {
    const whole = Number(dec[1])
    // "12.50" is a price: "twelve fifty". Anything else gets read out as digits.
    if (dec[2].length === 2) out.push(`${numberToWords(whole)} ${numberToWords(Number(dec[2]))}`)
    out.push(`${numberToWords(whole)} point ${digitwiseWords(dec[2])}`)
    return out
  }
  if (!/^\d+$/.test(token)) return out
  const n = Number(token)
  if (!Number.isFinite(n) || token.length > 12) return out
  out.push(numberToWords(n))
  // "twelve hundred and fifty" — the hundreds reading of a four-digit number.
  if (n >= 1000 && n <= 9999) {
    const rest = n % 100
    out.push(numberToWords(Math.floor(n / 100)) + ' hundred' + (rest ? ' and ' + numberToWords(rest) : ''))
  }
  if (token.length >= 2) out.push(digitwiseWords(token))
  return [...new Set(out)]
}

const NUMERAL_TOKEN = /[£$€¥₹₩₪₺₫₴₦]?\d+(?:\.\d+)?(?:st|nd|rd|th)?/gi
/** Thousands separators are punctuation, not structure: 12,500 -> 12500. */
function stripGrouping (s) { return String(s == null ? '' : s).replace(/(\d),(?=\d{3}(?:\D|$))/g, '$1') }

/**
 * Every normalised reading of `text` worth scoring against. Index 0 is the plain
 * normalisation, so a text with no digits yields exactly one candidate and this
 * whole mechanism is a no-op — which is why the 5,341 remembered decodes re-judge
 * identically except where a numeral is actually involved.
 */
const MAX_NUMERAL_VARIANTS = 12
function numeralVariants (text) {
  const raw = stripGrouping(text)
  const plain = normalise(raw)
  const tokens = raw.match(NUMERAL_TOKEN)
  if (!tokens || !tokens.length) return [plain]

  const readings = tokens.map(numeralReadings)
  const combos = readings.reduce((acc, r) => acc * r.length, 1)
  // Too many numerals to enumerate: score the plain text, the all-long-form
  // reading and the all-digitwise reading, and let the best one speak.
  const picks = combos > MAX_NUMERAL_VARIANTS
    ? [0, 1, readings[0].length - 1].map(i => readings.map(r => r[Math.min(i, r.length - 1)]))
    : cartesian(readings)

  const out = new Set([plain])
  for (const pick of picks) {
    let i = 0
    // Padded, because whisper writes "12's" and an unpadded swap would make one
    // unparseable word of "twelve's".
    out.add(normalise(raw.replace(NUMERAL_TOKEN, () => ` ${pick[i++]} `)))
  }
  return [...out]
}

function cartesian (lists) {
  return lists.reduce((acc, list) => acc.flatMap(prefix => list.map(v => [...prefix, v])), [[]])
}

/**
 * The cardinal numbers a text says, in order, whatever notation it used.
 * Digits are read into words first, so ONE parser serves both sides.
 */
function cardinalsOf (text) {
  return parseCardinals(cardinalWords(text))
}

/** The text with every numeral token spelt out, as a word array. */
function cardinalWords (text) {
  const raw = stripGrouping(text)
  const asWords = normalise(raw.replace(NUMERAL_TOKEN, t => {
    const r = numeralReadings(t)
    return ` ${r.length > 1 ? r[1] : r[0]} `
  }))
  return asWords.split(' ').filter(Boolean)
}

/**
 * The digit strings a text could be saying — plural, because a run of
 * single-digit words is genuinely ambiguous between a sum and a digit sequence.
 * "room seven zero nine" is 709 read out digit by digit, not 7 + 0 + 9; but
 * "twenty twenty" really is two numbers. Both readings are offered and Rule 4
 * accepts any agreement.
 */
function digitStringsOf (text) {
  const words = cardinalWords(text)
  const out = new Set([parseCardinals(words).map(String).join('')])
  out.add(parseCardinals(words, { digitRuns: true }).map(String).join(''))
  return out
}

/**
 * Word-stream cardinal parser: "nine thousand and one" -> [9001].
 * With `digitRuns`, a run of two or more single-digit words is read as one
 * number spoken digit by digit: "seven zero nine" -> [709].
 */
function parseCardinals (words, o = {}) {
  const values = []
  let total = 0, current = 0, started = false
  const flush = () => { if (started) values.push(total + current); total = 0; current = 0; started = false }
  const isNumWord = (w) => w != null && (w in NUM_SMALL || w in NUM_TENS || w === 'hundred' || w in NUM_SCALES)

  const isDigitWord = (w) => w != null && w in NUM_SMALL && NUM_SMALL[w] <= 9

  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    if (o.digitRuns && isDigitWord(w) && isDigitWord(words[i + 1])) {
      flush()
      let run = ''
      while (isDigitWord(words[i])) run += String(NUM_SMALL[words[i++]])
      i--
      values.push(run)
      continue
    }
    // A new atom EXTENDS the number being built only where English lets it:
    // after a hundred/thousand ("seven hundred and nine"), or a unit after a ten
    // ("twenty five"). Otherwise it starts a new number — "twelve fifty" is a
    // price, twelve and fifty, not sixty-two.
    const atom = w in NUM_SMALL ? NUM_SMALL[w] : (w in NUM_TENS ? NUM_TENS[w] : null)
    // A spoken "zero" is never a summand — it is a digit in its own right.
    if (atom === 0) { flush(); values.push(0); continue }
    if (atom != null) {
      const extends_ = current === 0 || current >= 100 || (current >= 20 && current % 10 === 0 && atom < 10)
      if (!extends_) flush()
      current += atom
      started = true
      continue
    }
    if (w === 'hundred') { current = (current || 1) * 100; started = true; continue }
    if (w in NUM_SCALES) { total += (current || 1) * NUM_SCALES[w]; current = 0; started = true; continue }
    // "and" and "a" belong to the number only when a number follows them.
    if (w === 'and' && started && isNumWord(words[i + 1])) continue
    if (w === 'a' && (words[i + 1] === 'hundred' || words[i + 1] in NUM_SCALES)) { started = true; continue }
    flush()
  }
  flush()
  return values
}

/** Does `needle` appear as a contiguous run of words inside `hay`? */
function containsWordRun (hayWords, needleWords) {
  if (!needleWords.length) return true
  for (let i = 0; i + needleWords.length <= hayWords.length; i++) {
    let ok = true
    for (let j = 0; j < needleWords.length; j++) if (hayWords[i + j] !== needleWords[j]) { ok = false; break }
    if (ok) return true
  }
  return false
}

/**
 * Rule 4: the numbers in the script must be the numbers in the decode.
 *
 * Canonicalisation makes a wrong number CHEAP in character terms — "£150" read as
 * "one hundred and fifty" is three edits away from "two hundred and fifty", far
 * under MIN_EDIT_DISTANCE — so the numbers are checked as their own event rather
 * than left to a ratio. Two ways to satisfy it, because two different things can
 * go right:
 *
 *  1. The digits agree end to end. Grouping and notation are ignored: "twelve
 *     pound fifty" and "£12.50" are both 12·50, "seven zero nine" and "709" are
 *     both 709.
 *  2. Failing that, every number the script says still appears, spelt out, inside
 *     the decode's own reading. This is the escape hatch for whisper absorbing a
 *     neighbouring word into the numeral — "nine thousand won altogether" comes
 *     back "9001, altogether", and "nine thousand" is plainly still in there.
 *
 * ABSTENTION, and it is deliberate: when the decode carries NO number at all,
 * this rule says nothing. A dropped number leaves the script's numeral words
 * wholly unaccounted for, which is a large CER event that Rule 2 already convicts
 * on ("that's 250 pesos" heard as "that's pesos" is 22 edits). Convicting here as
 * well would only add false alarms on the "one moment" / "a moment" class, where
 * the script's "one" is not really a quantity.
 *
 * WHAT THIS GIVES UP: path 2 tolerates EXTRA numeric material in the decode, so
 * "room seven" heard as "room 79" passes this rule. That is Rule 2's business —
 * an inserted number is a whole-string difference — and the alternative is
 * convicting the "won"→1 class, which is healthy audio.
 *
 * @returns {{ok:boolean, via?:string, expected?:string, heard?:string}}
 */
function numeralVerdict (expectedText, decodeText) {
  const eNums = cardinalsOf(expectedText)
  if (!eNums.length) return { ok: true }
  const dNums = cardinalsOf(decodeText)
  if (!dNums.length) return { ok: true, via: 'decode_has_no_numerals' }

  const eDigits = [...digitStringsOf(expectedText)]
  const dDigits = [...digitStringsOf(decodeText)]
  if (eDigits.some(x => dDigits.includes(x))) return { ok: true }

  const dVariants = numeralVariants(decodeText).map(v => v.split(' ').filter(Boolean))
  const allHeard = eNums.every(n => {
    const readings = [...new Set([numberToWords(n), digitwiseWords(String(n)), String(n)])]
      .map(r => r.split(' ').filter(Boolean))
    return readings.some(r => dVariants.some(dv => containsWordRun(dv, r)))
  })
  if (allHeard) return { ok: true, via: 'numerals_spelt_out_in_decode' }
  return { ok: false, expected: eDigits[0], heard: dDigits[0] }
}

/**
 * The best-fitting pair of readings of (expected, decode) and the edit distance
 * between them. With no digits on either side this is plain normalisation and one
 * levenshtein, exactly as before.
 */
function alignedPair (expected, decode) {
  const eVars = numeralVariants(expected)
  const dVars = numeralVariants(decode)
  let best = { e: eVars[0], d: dVars[0], edits: levenshtein(eVars[0], dVars[0]) }
  if (eVars.length === 1 && dVars.length === 1) return best
  for (const e of eVars) {
    for (const d of dVars) {
      const edits = levenshtein(e, d)
      if (edits < best.edits) best = { e, d, edits }
    }
  }
  return best
}

/**
 * The verdict, given a decode that has already happened. Pure — this is the
 * function the operating point lives in and the one the tests pin.
 *
 * @param {string} decode  what whisper heard, having never seen `expected`
 * @param {string} expected  the text actually sent to TTS
 * @param {string} [iso1]  the pinned decode language, which picks the threshold
 * @param {object} [opts]
 * @param {number} [opts.cerThreshold]  override the fitted operating point for ONE call.
 *   Absent — which is every production caller — the shipped thresholds apply unchanged.
 *   It exists so VOICELAB can put the operating point on a slider and have the gate
 *   actually honour it; a lab control the gate ignores is worse than no control. The
 *   MIN_EDIT_DISTANCE floor underneath is NOT overridable: it is what stops a ratio
 *   flagging a healthy one-word clip, and no experiment needs that switched off.
 * @returns {{pass:boolean, reason:string, cer:number, threshold:number}}
 */
function verdictFromDecode (decode, expected, iso1, opts = {}) {
  // Both sides are re-read into the same currency before anything is measured:
  // whisper spells numbers with digits and the scripts spell them with words, and
  // that difference is orthography, not audio (see numeralVariants above). With no
  // digits anywhere this is plain normalisation and the old code path exactly.
  const aligned = alignedPair(expected, decode)
  const e = aligned.e
  const d = aligned.d
  const edits = e.length ? aligned.edits : (d.length ? 1 : 0)
  const cer = e.length ? edits / e.length : (d.length ? 1 : 0)

  // Rule 1, language-independent: nothing was transcribed at all.
  if (isNonSpeechDecode(decode)) {
    return { pass: false, reason: 'non_speech_decode', cer, edits, threshold: 0 }
  }

  // Rule 2: wrong by a large FRACTION of the script AND by an absolute number
  // of characters. Both, always — see MIN_EDIT_DISTANCE for why the ratio
  // alone flags healthy one-word clips.
  const unfitted = CER_UNVALIDATED_LANGUAGES.has(String(iso1 || ''))
  const threshold = Number.isFinite(Number(opts.cerThreshold))
    ? Number(opts.cerThreshold)
    : (unfitted ? CER_THRESHOLD_UNVALIDATED : CER_THRESHOLD)
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

  // Rule 4: the numbers said must be the numbers asked for. Canonicalisation
  // above deliberately made a numeral's SPELLING free; this is what stops it
  // making a numeral's VALUE free with it. See numeralVerdict.
  const nv = numeralVerdict(expected, decode)
  if (!nv.ok) {
    return { pass: false, reason: 'numeral_mismatch', cer, edits, threshold, numerals: { expected: nv.expected, heard: nv.heard } }
  }

  // A pass that only survived because the final word was heard in a DIFFERENT
  // shape is still a pass, but it is worth carrying: it is the class this rule
  // used to fail wholesale, and it is the class a future mispronunciation check
  // would want to look at first. Reported, never acted on.
  const extra = {}
  if (lw.via) extra.lastWordVia = lw.via
  if (nv.via) extra.numeralsVia = nv.via
  return { pass: true, reason: 'ok', cer, edits, threshold, ...extra }
}

/**
 * How badly the decode's opening may fit the script-minus-its-last-word before
 * this rule stops having an opinion at all. Same 0.3 as the CER operating point,
 * and for the same reason: past it the two strings are not the same utterance.
 */
const LAST_WORD_HEAD_FIT_MAX = Number(process.env.AUDIO_VERACITY_HEAD_FIT_MAX || 0.3)

/**
 * Is the script's final word present at the end of the decode?
 *
 * TWO TESTS, and the second one exists because the first one alone was wrong.
 *
 * Test 1 — the word is spelt roughly as expected, somewhere in the last three
 * decoded words. Tolerance scales with word length: a 3-letter word has to match
 * exactly (whisper does not mangle "you" in context, and a loose match on short
 * words would find one anywhere), a longer word gets 1-2 edits of slack. Only
 * the tail is searched, so a word appearing EARLIER cannot vouch for a missing
 * ending — which is the whole defect being hunted.
 *
 * Test 2 — added 2026-08-13, and this is the precision fix.
 *
 * Test 1 alone asks "is this word spelt the way I expect?" when the question is
 * "was this word SPOKEN?", and whisper answers the first question badly on
 * purpose: it writes what English/French/Italian orthography prefers, not what
 * the script author typed. The 2026-08-12 render audit hand-checked four flagged
 * clips and all four were healthy audio: a clip saying "it is okay" was queued
 * for re-rendering because the transcript spelt it "OK"; "come se" was written
 * "Come si"; "più di" came back "PUD" and "Pewdie". None of those clips has lost
 * a word. Nine fresh Azure renders of the Italian ones failed identically, which
 * is the proof — a renderer does not truncate a six-character phrase nine times
 * out of nine in the same place (docs/… render-audit, 2026-08-12).
 *
 * So a spelling mismatch is no longer sufficient to convict. A DROPPED final
 * word has a structural signature that a mis-spelt one does not: the decode
 * stops fitting the whole script and starts fitting the script MINUS its last
 * word. Measure both and compare.
 *
 *     "it is okay"      -> "it is ok"       whole 2  headless 3   word was said
 *     "ce que tu as dit hier" -> "ce que tu as dit"  whole 5  headless 0   word is gone
 *
 * Ties convict. A tie means the decode is explained equally well as "final word
 * mangled" and "final word truncated mid-way" — which is exactly Tom's
 * 2026-08-07 defect ("Je suis surpris" -> "Je suis sur...") and exactly where
 * this rule should stay suspicious.
 *
 * ABSTENTION. The comparison only means something if the decode is recognisably
 * this script at all. When the decode's opening does not track the script's own
 * opening (head fit past LAST_WORD_HEAD_FIT_MAX), there is no "final slot" to
 * reason about — "più di" -> "PUD" is not a truncation report, it is whisper
 * failing to hear a two-word fragment. Those clips belong to Rule 2, which
 * measures whole-string wrongness and needs no alignment to do it. Rule 3 says
 * nothing rather than guessing.
 *
 * WHAT THIS DELIBERATELY GIVES UP, and the name says so. The rescue reason is
 * `not_truncated`, NOT "spelling variant", because from text alone those two are
 * not distinguishable and claiming otherwise would be a lie in a log file. All
 * this test establishes is that the decode's final region is better explained as
 * a rendering of the final word than as its absence. "prendre le bus" heard as
 * "prendre le but" now passes here — whisper mishearing a spoken word and TTS
 * speaking the wrong one produce the same transcript, and only listening can
 * separate them.
 *
 * That is the module's stated envelope, not a new gap: substitution is the one
 * class a free decode can launder, it was never validated here, and this rule
 * was built for truncation. Rule 2 still catches substitutions that are gross
 * enough. Such passes carry `lastWordVia` so the class stays countable for
 * whoever validates mispronunciation properly one day.
 *
 * Single-word scripts are exempt: if the only word is gone there is no speech
 * left, and Rule 1 has already failed the clip.
 *
 * @param {string} e normalised expected text
 * @param {string} d normalised decode
 * @returns {{ok:boolean, word:string|null, via?:string}} `via` is set only on a
 *   pass that Test 1 did not grant — i.e. the word was heard in another shape.
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

  const head = e.slice(0, e.length - word.length).trim()
  if (!head.length) return { ok: true, word, via: 'no_head_to_align' }

  const headFit = prefixDistance(head, d) / head.length
  if (headFit > LAST_WORD_HEAD_FIT_MAX) return { ok: true, word, via: 'decode_does_not_track_script' }

  if (levenshtein(e, d) < levenshtein(head, d)) return { ok: true, word, via: 'not_truncated' }
  return { ok: false, word }
}

/**
 * Levenshtein of `a` against the BEST-matching prefix of `b` — "does b start
 * with a?", tolerant of whatever b carries afterwards.
 *
 * Plain levenshtein cannot answer that: it charges for the trailing remainder,
 * so "je suis" scores 4 against "je suis sur" purely for the word we are trying
 * to reason about. Taking the minimum over the final DP row is the standard
 * prefix-alignment trick and costs nothing extra.
 */
function prefixDistance (a, b) {
  if (!a.length) return 0
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
  return Math.min(...prev)
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

  await acquire()
  let decode
  try {
    decode = await decodeAudio(input, iso1 || 'auto')
  } catch (e) {
    return unchecked('unchecked_decode_error', String(e.message).slice(0, 200))
  } finally {
    release()
  }

  const v = verdictFromDecode(decode, expectedText, iso1, { cerThreshold: opts.cerThreshold })
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
  return {
    checked: 0,
    passed: 0,
    failed: 0,
    rerendered: 0,
    quarantined: 0,
    unchecked: 0,
    uncheckedReasons: {},
    // Clips the SAMPLER deliberately did not check. Counted apart from
    // `unchecked` on purpose: `unchecked` is an admission that we could not
    // look, and it is meant to be alarming. `not_sampled` is the policy doing
    // exactly what it was told to do, and it is not.
    not_sampled: 0,
  }
}

/** Fold one verdict into a stats object. */
function recordVerdict (stats, verdict) {
  if (!stats) return
  if (verdict && verdict.checked !== true && verdict.reason === 'not_sampled') {
    stats.not_sampled++
    return
  }
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
// GRADUATED SAMPLING — the standing QA model (Tom, 2026-08-13)
// ---------------------------------------------------------------------------
//
// "Veracity-check ~10% of the FIRST job/course in a render run; if that sample
// comes back clean, drop to sampling 1% of the remaining 90%; keep relaxing the
// sample rate as trust accumulates course by course through the run."
//
// SCOPE CORRECTED TO PER-COURSE (Tom, 2026-08-17): "Long-run whisper sampling
// should be scoped PER COURSE, not per run — Kai typically generates one course
// at a time, so the graduated drop to the 0.2% floor within a course is
// explicitly fine and approved."
//
// This matters because the original reading made the relaxation unreachable in
// practice. Trust was banked at COURSE BOUNDARIES, so a run containing exactly
// one course never banked anything and stayed at the opening 10% from first clip
// to last. Since one course per run is how the estate is actually driven, the
// cheap end of the ladder was dead code and every course paid full opening rate
// forever. The relaxation now happens WITHIN a course, as clean sampled clips
// accumulate, and each course starts fresh from the opening rate — trust is no
// longer carried across a course boundary in either direction.
//
// Neither of the two things it replaces: not blanket per-clip whisper on
// everything (removed from phase8 last week — it made every render pay full ASR
// cost to re-confirm a thing that had been true for thousands of clips), and not
// zero checking (which is how a silent render reaches a learner, because there is
// no staging environment between a TTS render and an ear).
//
// TRUST IS EARNED WITHIN A COURSE AND SPENT ON THAT COURSE. Two properties make
// that safe rather than merely cheap:
//
//  1. A FAILURE SNAPS THE RATE BACK to the opening rate, immediately, mid-course.
//     The cheap rate is a statement that the last few hundred clips were clean;
//     the moment that stops being true the statement is withdrawn. Without this,
//     graduated sampling is just "check less and less regardless", and the run
//     that goes bad half way through is exactly the run it would miss.
//  2. SELECTION IS DETERMINISTIC AND SPREAD, not random. A counter picks every
//     Nth clip, so a 1% sample is one-in-a-hundred ACROSS the course rather than
//     a random draw that can leave a 3,000-clip stretch untouched by luck. It is
//     also reproducible: same run, same clips sampled, which is what makes a
//     "sampled clean" claim checkable afterwards.
//
// WHAT THIS DOES NOT CLAIM. A 1% sample cannot find one bad clip in a course; it
// finds a bad RUN — a voice that has started returning silence, a truncating
// provider, a config that renders the wrong language. That is the failure class
// that has actually bitten this estate, and it is a cohort problem, which is why
// sampling can address it at all. A single defective clip among healthy ones is
// not what this catches and must not be sold as if it were.

const SAMPLE_RATE_FIRST = Number(process.env.AUDIO_VERACITY_SAMPLE_FIRST || 0.10)
const SAMPLE_RATE_TRUSTED = Number(process.env.AUDIO_VERACITY_SAMPLE_TRUSTED || 0.01)
// The floor the relaxation walks down to. Never 0: a run that never looks again
// cannot notice it has gone wrong, however much trust it has banked.
const SAMPLE_RATE_FLOOR = Number(process.env.AUDIO_VERACITY_SAMPLE_FLOOR || 0.002)
// How many consecutive CLEAN SAMPLED clips buy one step down the ladder. This is
// the within-course analogue of the old "that course sampled clean" — the opening
// sample is a block of checks, not a single clip, because one clean clip is not
// evidence that a run is healthy. At the opening 10% rate, 10 clean sampled clips
// means ~100 clips rendered clean before the rate relaxes to 1%.
const SAMPLE_STEP_CLEAN = Number(process.env.AUDIO_VERACITY_SAMPLE_STEP || 10)

/**
 * The sampler for one COURSE. `startCourse()` resets it: trust is earned within a
 * course and never carried across a course boundary (Tom, 2026-08-17).
 *
 * The ladder, walked within a single course as clean sampled clips accumulate:
 *   10%  →  1%  →  0.5%  →  0.25%  →  0.2% floor
 * and a single failure snaps it straight back to the opening rate.
 *
 * @param {object} [o]
 * @param {number} [o.first]    opening rate for every course (default 10%)
 * @param {number} [o.trusted]  rate after the opening sample comes back clean (default 1%)
 * @param {number} [o.floor]    the lowest rate relaxation will reach (default 0.2%)
 * @param {number} [o.step]     clean sampled clips per step down the ladder (default 10)
 */
function createSampler (o = {}) {
  const first = o.first != null ? Number(o.first) : SAMPLE_RATE_FIRST
  const trusted = o.trusted != null ? Number(o.trusted) : SAMPLE_RATE_TRUSTED
  const floor = o.floor != null ? Number(o.floor) : SAMPLE_RATE_FLOOR

  const step = o.step != null ? Number(o.step) : SAMPLE_STEP_CLEAN

  let coursesStarted = 0
  let rate = first
  let counter = 0           // drives the every-Nth selection
  let steps = 0             // rungs descended THIS course
  let cleanSinceStep = 0    // clean sampled clips since the last rung
  let courseSampled = 0
  let courseFailed = 0
  let courseCode = null

  /** The rate at rung `n` of the ladder. Rung 0 is the opening rate; rung 1 is
   *  the trusted rate; each rung after that halves again, down to the floor. */
  function rateAtStep (n) {
    if (n <= 0) return first
    return Math.max(floor, trusted / Math.pow(2, n - 1))
  }

  return {
    /** Begin a course. Every course starts at the opening rate: trust earned on
     *  the last course says nothing about this one's voices, text or provider
     *  config, and carrying it across was what made the ladder unreachable for
     *  one-course runs in the first place. */
    startCourse (code) {
      courseCode = code
      coursesStarted++
      courseSampled = 0
      courseFailed = 0
      counter = 0
      steps = 0
      cleanSinceStep = 0
      rate = first
      return { course: code, rate, step: steps, step_clips: step }
    },

    /**
     * Should this clip be checked? Every-Nth selection, so the sample is spread
     * across the course rather than clumped by luck.
     */
    shouldCheck () {
      if (rate >= 1) return true
      if (rate <= 0) return false
      const every = Math.max(1, Math.round(1 / rate))
      const take = (counter % every) === 0
      counter++
      if (take) courseSampled++
      return take
    },

    /**
     * Fold in a verdict from a sampled clip.
     *
     * A run of clean sampled clips walks the rate DOWN the ladder a rung at a
     * time; a genuine failure snaps it straight back to the opening rate and
     * forfeits every rung — the cheap rate was a claim about clips that turned
     * out not to hold, so it is withdrawn in full rather than decremented.
     */
    recordVerdict (verdict) {
      if (!verdict || verdict.checked !== true) return { rate, snapped: false }
      if (verdict.pass === true) {
        cleanSinceStep++
        if (cleanSinceStep >= step && rate > floor) {
          cleanSinceStep = 0
          steps++
          rate = rateAtStep(steps)
          // The counter deliberately keeps running. Resetting it here would
          // force a sample on the very next clip — spending a check to confirm
          // the thing we just relaxed on. The every-Nth walk simply continues
          // with the wider N. (On a snap-back we DO reset, because there we
          // want to start looking again immediately.)
          return { rate, snapped: false, relaxed: true, step: steps }
        }
        return { rate, snapped: false }
      }
      courseFailed++
      const snapped = rate !== first
      rate = first
      counter = 0
      steps = 0
      cleanSinceStep = 0
      return { rate, snapped }
    },

    /** Current state, for the render report and for tests. */
    state () {
      return {
        course: courseCode,
        rate,
        courses_started: coursesStarted,
        step: steps,
        clean_since_step: cleanSinceStep,
        step_clips: step,
        sampled_this_course: courseSampled,
        failed_this_course: courseFailed,
      }
    },
  }
}

// The process-wide sampler. Phase 8 calls startCourse() per course; anything that
// renders without calling it gets the opening rate, which is the safe default.
let runSampler = createSampler()

/** Start a course on the process-wide sampler. Returns the rate it will use. */
function startCourse (code) {
  return runSampler.startCourse(code)
}

/** Reset the run's accumulated trust — a new run starts from scratch. */
function resetSampler (o) {
  runSampler = createSampler(o)
  return runSampler.state()
}

/** The process-wide sampler's current state. */
function samplerState () {
  return runSampler.state()
}

/**
 * A sampler that checks EVERY clip and banks no trust — for the single-clip,
 * human-triggered repair routes (regenerate-single/-phrase/-lego/-presentation).
 *
 * Graduated sampling exists to make BULK affordable. It is exactly wrong on the
 * repair path: at the 0.2% floor a one-clip regenerate is checked essentially
 * never, and that is the one render where someone is deliberately replacing a
 * clip they believe is bad. One whisper decode per button press is nothing.
 *
 * Deliberately NOT the process-wide sampler: startCourse() would reset the
 * every-Nth counter and bank a bogus clean course, so one person fixing a clip
 * in ScriptViewer would corrupt the trust accounting of a bulk run happening in
 * the same process at the same time. This one holds no state and touches none.
 */
const ALWAYS_SAMPLER = Object.freeze({
  shouldCheck: () => true,
  recordVerdict: () => ({ rate: 1, snapped: false }),
  state: () => ({ course: null, rate: 1, courses_started: 0, step: 0, clean_since_step: 0, step_clips: 0, sampled_this_course: 0, failed_this_course: 0 }),
})

// ---------------------------------------------------------------------------
// Persisting the verdict — the difference between a claim and a measurement
// ---------------------------------------------------------------------------

/**
 * Turn a verdict into the `course_audio` columns that record it, so a clip
 * carries its own quality evidence instead of the surface inferring one from
 * created_at.
 *
 * This exists because of docs/gate-bypass-audit-2026-08-05.md: the audio
 * preview page labelled 1,413 clips "rendered under the gate" on a timestamp
 * comparison, and every one of them had been written by a path that bypassed
 * the gate. A date cannot tell checked-and-passed from published-unchecked,
 * and this module carries an explicit `unchecked` state precisely because
 * those are not the same thing. So the verdict goes in the row.
 *
 * THE ONE RULE: an unchecked verdict still writes `veracity_checked_at` — the
 * gate ran and produced an admission — but leaves `veracity_pass` NULL. NULL
 * is never a pass anywhere downstream. A row with no `veracity_checked_at` at
 * all is one no check has ever touched (everything rendered before
 * 2026-08-05, and every path still bypassing the gate), and reads as
 * "unchecked" too, just for a different reason.
 *
 * Spread straight into an insert/upsert payload:
 *   .upsert({ ...row, ...veracity.verdictColumns(gated.verdict, {
 *     checker: 'phase8-generate', attempts: gated.attempts }) })
 *
 * Callers that did NOT run a check must pass nothing rather than a fabricated
 * verdict — `verdictColumns(null)` returns `{}`, leaving the row honestly
 * blank.
 *
 * @param {object|null} verdict  a checkAudioVeracity() result
 * @param {object} [o]
 * @param {string} [o.checker]   which code path ran the check
 * @param {number} [o.attempts]  render attempts it took to get this verdict
 * @returns {object} columns to merge into a course_audio write
 */
function verdictColumns (verdict, o = {}) {
  if (!verdict) return {}
  const checked = verdict.checked === true
  return {
    veracity_checked_at: new Date().toISOString(),
    // Only a genuine check yields a pass/fail. `checked: false` is an
    // admission, and an admission stored as `false` would read as "we looked
    // and it was bad" — the opposite of what happened.
    veracity_pass: checked ? verdict.pass === true : null,
    veracity_reason: verdict.reason || null,
    veracity_cer: checked && typeof verdict.cer === 'number' ? verdict.cer : null,
    veracity_attempts: o.attempts != null ? Number(o.attempts) : null,
    veracity_checker: o.checker || null,
  }
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
  const info = (m) => (logger.info || logger.log || console.log).call(logger, m)
  const label = `${meta.role || '?'} "${String(expectedText).slice(0, 40)}"`
  // The run's graduated sampler by default. Production callers pass one only to
  // opt a whole path out of sampling — see ALWAYS_SAMPLER, used by the
  // single-clip repair routes. Tests pass their own.
  const sampler = o.sampler || runSampler

  // GRADUATED SAMPLING (Tom, 2026-08-13). Clips the sampler passes over are
  // rendered once and published with veracity_pass NULL — honestly "not checked",
  // never a fabricated pass. `not_sampled` is its own counter so a deliberate
  // policy skip can never be read as the gate failing to run.
  if (!sampler.shouldCheck()) {
    const rendered = await render(1)
    const verdict = { checked: false, pass: null, reason: 'not_sampled' }
    recordVerdict(stats, verdict)
    return { published: true, ...rendered, verdict, attempts: 1, verdicts: [verdict] }
  }

  const verdicts = []
  let last = null
  for (let attempt = 1; attempt <= attempts; attempt++) {
    last = await render(attempt)
    const verdict = await check(last.buffer, expectedText, language, { meta })
    verdicts.push({ attempt, ...verdict, decode: verdict.decode })
    // Tell the sampler before anything else acts on the verdict: a failure has to
    // snap the rate back for the clips that follow, whether or not a re-render
    // rescues this one.
    const snap = sampler.recordVerdict(verdict)
    if (snap.snapped) {
      warn(`[audio-veracity] sample failed on ${label} — sampling rate snapped back to `
        + `${(snap.rate * 100).toFixed(1)}% for the rest of this course`)
    }
    // The relaxation is as worth saying out loud as the snap-back: it is the
    // moment the run starts paying less, and a reader of the log should be able
    // to see WHY the checked count stops climbing.
    if (snap.relaxed) {
      info(`[audio-veracity] ${meta.courseCode || 'course'}: sample clean — relaxing to `
        + `${(snap.rate * 100).toFixed(2)}% (rung ${snap.step})`)
    }

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
  // Sampling state belongs on the same line as the counts, or "12 checked" out of
  // 30,000 clips reads as a broken gate rather than as the policy working.
  if (stats.not_sampled) {
    const st = samplerState()
    bits.push(`${stats.not_sampled} not sampled (graduated sampling at `
      + `${(st.rate * 100).toFixed(1)}%, rung ${st.step} of this course's ladder)`)
  }
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
  numberToWords,
  numeralReadings,
  numeralVariants,
  cardinalsOf,
  numeralVerdict,
  decodeAudio,
  availability,
  isGateEnabled,
  announceStatus,
  quarantine,
  newStats,
  recordVerdict,
  createSampler,
  ALWAYS_SAMPLER,
  startCourse,
  resetSampler,
  samplerState,
  SAMPLE_RATE_FIRST,
  SAMPLE_RATE_TRUSTED,
  SAMPLE_RATE_FLOOR,
  formatStats,
  verdictColumns,
  CER_THRESHOLD,
  CER_UNVALIDATED_LANGUAGES,
  CER_THRESHOLD_UNVALIDATED,
  MIN_EDIT_DISTANCE,
  WHISPER_ISO1,
  QUARANTINE_DIR,
  _resetAnnouncement,
}
