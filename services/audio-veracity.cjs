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
 * ⚠️ DO NOT "IMPROVE" THIS INTO A GRAMMAR-CONSTRAINED CONFIDENCE SCORE.
 * That route was tested and it fails. Constraining the decode to the expected
 * text (whisper.cpp --grammar) scored a TRUNCATED clip 1.000 and its healthy
 * twin 0.979 — "once the grammar removes the alternatives, the softmax
 * renormalises over what is left and the reported probability goes to ~1
 * regardless of the acoustics" (findings §5). Whisper's free-decode token
 * probabilities are just as useless: healthy and broken distributions overlap,
 * and min_tok_p is WORSE for healthy clips than for silent stubs (findings §1).
 * If you find yourself reaching for a confidence number the DECODER reports
 * about itself, you have taken the wrong turn.
 *
 * ⚠️ --prompt IS NOT --grammar, AND THE DIFFERENCE IS MEASURED. Since
 * 2026-08-24 a clip the free decode CONDEMNS gets a second, primed decode and
 * is scored against its known text by us — never by the decoder about itself.
 * See VERIFY AGAINST KNOWN TEXT below: both hallucination failure modes were
 * tested for, one of them is real, and it has its own guard.
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
// VERIFY AGAINST KNOWN TEXT — the canonical STT mode (Tom's ruling, 2026-08-24)
// ---------------------------------------------------------------------------

/**
 * THE RULING. Tom, 2026-08-24: "we always know the prescribed sentence, so the
 * question is never open transcription — where Whisper is weak on Welsh,
 * Icelandic compounds, French spoken times — but VERIFICATION: is this audio a
 * rendition of this known text?"
 *
 * The free decode asks the harder question and then blames the AUDIO for
 * whisper's spelling. Two real failures of that framing, both clips that were
 * fine:
 *
 *   isl  "Auðvitað. … Þarna er posinn."  free-decoded "Ílvitað. Þart naði að
 *        porsinn." — CER 0.42, quarantined. 11 of 231 Icelandic pod sentences
 *        died this way (docs/pods/isl-pod-1-render-failure-2026-08-22.md).
 *   cym  "Bore da. Sut wyt ti?" free-decoded "Poreddaa. Siwtwit'i." — CER 0.50
 *        on a take Tom listened to and called perfect.
 *
 * (The third case Tom named, French spoken times, was fixed separately and
 * upstream of this: numeralVariants/alignedPair below already read "7h30" and
 * "sept heures et demie" into the same currency before anything is measured.
 * Verification does not need to re-solve it and deliberately does not try.)
 *
 * VERIFY MODE. When the free decode does not settle it, decode a SECOND time
 * with the known text as whisper's initial prompt (--prompt) and score THAT
 * decode against the known text, through the same normalisation, cue-stripping
 * and numeral alignment the free verdict uses. A genuine rendition with a weak
 * decoder scores high once the decoder knows what it is listening for; wrong
 * text or noise scores near zero.
 *
 * MEASURED 2026-08-24, ggml-small, similarity = 1 - CER:
 *
 *   isl 15 quarantined clips   free 0.00-0.66  ->  primed 0.82-1.00 on 13,
 *                              and 0.21 / 0.29 on the two that are genuinely
 *                              mis-rendered — priming did NOT rescue those.
 *   cym 11 good human takes    free 0.39-1.00  ->  primed 0.89-1.00
 *   cym  3 noise-only takes    free 0.00-0.26  ->  primed 0.00, 0.00, 0.00
 *
 * ⚠️ WORRY 1, PROMPT ECHO — "the model will just parrot the prompt back".
 * TESTED, DID NOT OCCUR. Control: re-prime each of the 15 Icelandic clips with
 * a DIFFERENT clip's sentence and score against that wrong sentence. Result
 * 0.00-0.31, mean 0.13, against 0.82-1.00 when primed with the truth. A prompt
 * biases the decoder; it does not overwrite the acoustics. That is exactly why
 * --prompt is not --grammar: the alternatives are still there, so the audio can
 * still refuse the hypothesis.
 *
 * ⚠️ WORRY 2, PRIMING NOISE INTO SPEECH — the Catrin case, three takes of an
 * empty room (one with a sheep) that the FREE decode turned into fluent Welsh
 * (services/recording-speech-gate.cjs). TESTED, AND IT INVERTS: all three primed
 * decodes came back EMPTY, scoring 0.000. With a hypothesis to test the model
 * finds no support for it and says nothing; with no hypothesis it invents one.
 * Verification is the SAFER mode on noise, not the riskier one.
 *
 * ⚠️ WORRY 3, TRUNCATION — REAL. See VERIFY_MIN_SEC_PER_SYLLABLE.
 *
 * ⚠️ STT IS ADVISORY, NOT A COURSE VETO (Tom, same ruling). Voice-match and VAD
 * stay the hard gates. This module owns the text question only.
 *
 * COST. The primed decode runs ONLY when the free decode has already failed, so
 * the clips that pass today cost exactly what they cost today.
 */

/** Verify mode is canonical. AUDIO_VERACITY_VERIFY=off reverts to free-only. */
function isVerifyMode () {
  return !OFF_VALUES.has(String(process.env.AUDIO_VERACITY_VERIFY || '').toLowerCase())
}

/**
 * Similarity a primed decode must reach to overturn a free-decode failure.
 *
 * The measured gap is wide: everything genuine sits at 0.82+ and everything
 * wrong at 0.31 or below, with nothing at all in between across 32 labelled
 * clips in three languages. 0.60 is parked in the middle of that empty band,
 * slightly nearer the wrong end because the errors are not symmetric — a
 * wrongly-refused clip costs a re-render, a wrongly-passed one reaches a
 * learner's ear with no staging environment in between.
 *
 * DEFAULT, not a ruling. Fitted on isl/fra/cym; it deliberately does not
 * inherit CER_THRESHOLD, which was fitted on deu/eng.
 */
const VERIFY_THRESHOLD = Number(process.env.AUDIO_VERACITY_VERIFY_THRESHOLD || 0.6)

/**
 * Fraction of the expected WORDS that must be individually locatable in the
 * primed decode, on top of the similarity score.
 *
 * Similarity is a whole-string edit ratio, so a decode that gets a long opening
 * clause right and then stops can score respectably on a long sentence. Word
 * coverage cannot be carried that way: every expected word is looked for
 * separately, with the same length-scaled tolerance the last-word rule uses.
 * Measured on the same set: genuine 0.67-1.00, wrong 0.00-0.33.
 *
 * DEFAULT, not a ruling.
 */
const VERIFY_MIN_COVERAGE = Number(process.env.AUDIO_VERACITY_VERIFY_COVERAGE || 0.6)

/**
 * ⚠️ THE ONE PLACE PRIMING GENUINELY HALLUCINATES: TRUNCATION. Not a worry — a
 * measurement, 2026-08-24, replaying the 165 labelled clips this gate was
 * fitted on:
 *
 *   silent_stub   25 clips   free 0/25 pass   verify rescues 0   — safe
 *   near_silent   21 clips   free 0/21 pass   verify rescues 0   — safe
 *   truncated     25 clips   free 0/25 pass   verify rescues 17  <- THIS
 *
 * Seventeen truncated clips came back from the primed decode as the COMPLETE
 * sentence at similarity 1.00 and coverage 1.00. "can you check the weather?" —
 * a clip that stops partway — primed to the full sentence. Obvious in
 * hindsight: noise and wrong text remove the acoustic evidence so the prompt has
 * nothing to lean on, while truncation leaves MOST of it intact and the prompt
 * supplies the tail, which is exactly what a language model is best placed to
 * invent.
 *
 * No text-layer rule can catch this, and Rule 3 least of all — the decode being
 * checked is the one that hallucinated the last word. The check must come from
 * outside the decoder, and Tom's own instrument does it
 * (audio-intelligence/tiers/duration.cjs, via recording-speech-gate.cjs):
 * "syllables are pretty consistent". Count the script's syllables, measure the
 * clip's VAD SPEECH SPAN, divide. Measured on those same 165:
 *
 *   truncated       max 0.132 s/syllable   (median 0.101)
 *   good_paired     min 0.152              (median 0.234)
 *   good_unflagged  min 0.144              (median 0.194)
 *
 * 0.14 sits in that gap: 6% above everything truncated, 3% below everything
 * good. Tight on both sides because the corpus is 102 clips, not because the
 * quantity is marginal — 0.14 s/syllable is 7 syllables a second, faster than
 * anyone reads a script.
 *
 * IT VETOES A RESCUE ONLY. A clip the free decode passed is never re-judged by
 * it, so it cannot cost anything that passes today. Net on the labelled set:
 * good clips wrongly refused 8/77 -> 3/77, bad clips wrongly passed 0/71 -> 0/71.
 *
 * ⚠️ EXPLICIT GAP: syllables.cjs is fitted for English and German only, and this
 * floor was fitted through it on English and German truncations. Other languages
 * run the generic vowel-group counter. Measured headroom where it matters: the
 * Icelandic and Welsh clips this mode exists to rescue sit at 0.157-0.736, the
 * nearest 12% clear. Real headroom, but not a fitting. A language whose written
 * form over-counts syllables would be refused wrongly, and the fix is to measure
 * that language rather than widen the floor blind.
 *
 * DEFAULT, not a ruling.
 */
const VERIFY_MIN_SEC_PER_SYLLABLE = Number(process.env.AUDIO_VERACITY_VERIFY_SEC_PER_SYLLABLE || 0.14)

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
      info(`[audio-veracity] ON — unprimed whisper round-trip, model ${path.basename(WHISPER_MODEL)}, CER threshold ${CER_THRESHOLD}. GRADUATED SAMPLING, PER COURSE: ${(SAMPLE_RATE_FIRST * 100).toFixed(0)}% opening, ${(SAMPLE_RATE_TRUSTED * 100).toFixed(0)}% after ${SAMPLE_STEP_CLEAN} clean sampled clips, relaxing a rung per further ${SAMPLE_STEP_CLEAN} down to a ${(SAMPLE_RATE_FLOOR * 100).toFixed(1)}% floor — a failure snaps it back and every course starts fresh. Validated on silence + truncation only; mispronunciation is NOT covered. Decoder not validated for ${[...DECODER_NOT_VALIDATED].sort().join(', ')} — clips in those languages are SKIPPED, not passed.`)
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

// ---------------------------------------------------------------------------
// Synthesis cues — direction to the voice, never speech
// ---------------------------------------------------------------------------

/**
 * WHY THIS EXISTS (the 2026-08-17 nld pod recast, A-136).
 *
 * A pod line is written for the SYNTHESISER, and some of what it carries is
 * stage direction rather than words: "Ja, [pause] natuurlijk." asks for a beat,
 * it does not ask the voice to say "pause". `normalise` keeps letters and throws
 * punctuation away, so the bracket vanishes and the WORD survives — the
 * comparison string then contains a word no healthy clip can ever contain, and
 * every occurrence scores as a deletion. On "Ja, [pause] natuurlijk." that alone
 * is CER 0.32 against a 0.25 gate: a perfect render, refused, at the price of a
 * full re-render on every attempt. 16 of A-136's 29 burnt clips were this and
 * nothing else, and the estate carries 3,190 `[pause]` clips across por, ita,
 * fra, spa, deu, cat, eus and more — every one of them exposed to the same
 * false rejection on its next render.
 *
 * A CURATED LIST, NOT A BRACKET RULE, and the estate is why. `[...]` is not a
 * cue marker here: 18,851 clips carry `[atom]` and their text_stripped is
 * "atom 17" — the word IS spoken — and the English prompt clips carry
 * "[someone]" mid-sentence, likewise spoken ("he wanted someone to"). Stripping
 * every bracket would blind the gate to a dropped word in all 18,867 of those.
 * So only markers that are known to be silent come out, and a new cue has to be
 * added here deliberately.
 *
 * This changes the COMPARISON only. The clip is still rendered from the full cue
 * text — the beat is wanted — and nothing about the operating point moves.
 */
const SYNTHESIS_CUES = [
  /\[pause\]/gi,
  /\[break\]/gi,
  /<break\b[^>]*\/?>/gi,
]

/**
 * The text with the synthesiser's stage directions removed, for comparison.
 * A no-op — the same string back — for text that carries no cues, which is
 * every clip outside the pods.
 * @param {string} text
 * @returns {string}
 */
function stripSynthesisCues (text) {
  let out = String(text == null ? '' : text)
  for (const re of SYNTHESIS_CUES) out = out.replace(re, ' ')
  return out.replace(/\s+/g, ' ').trim()
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
function digitwiseWords (digits, lex) {
  const ones = (lex && lex.ones) || ONES_WORDS
  return String(digits).split('').map(c => ones[Number(c)]).join(' ')
}

// ---------------------------------------------------------------------------
// The same canonicalisation, in the language the clip is actually in
// ---------------------------------------------------------------------------

/**
 * WHY THIS EXISTS (the 2026-08-17 nld pod recast, A-136).
 *
 * Everything above this line reads a numeral into ENGLISH words, and until now
 * it did so whatever language the clip was in. So the fix that rescued 35
 * English clips in August did nothing at all for the other 1.2 million: whisper
 * decodes "kamer zevenhonderd negen" as "kamer 709", the canonicaliser offers
 * "seven hundred and nine", neither reading fits, and CER lands at 0.257 — over
 * the gate, for a clip that says exactly the right words. A-136 hit it in Dutch
 * and solved it in Dutch, inside its own job script. The defect was never
 * Dutch: it is every language the estate renders.
 *
 * A LEXICON, NOT A REWRITE. Reading a cardinal into words is a small regular
 * system per language, so each one is a table plus a dozen lines of assembly,
 * pinned by unit tests against real spellings. The scoring, the thresholds and
 * the rules are untouched — a numeral simply gets to offer its readings in the
 * language it was spoken in, alongside the English ones it already offered.
 *
 * PURELY ADDITIVE, which is what makes it safe. The raw text is still candidate
 * zero and the English readings are still candidates, so no clip that passes
 * today can fail tomorrow; the only thing a new reading can do is FIT better.
 * And a number that is genuinely wrong or genuinely absent is still wrong under
 * every reading in every language, so Rule 4 keeps its teeth.
 *
 * THE GAP, stated rather than papered over: eight languages have a lexicon here
 * (en, nl, de, fr, es, it, pt, is) and the estate renders eighty-six. A language
 * without one behaves EXACTLY as it does today — English readings only — so it
 * is no worse off, but its digit-vs-word clips can still be refused for
 * notation. There is no language-independent fix available: neutralising the
 * difference requires knowing how THIS language spells its numbers, so the only
 * way to close the gap is to add lexicons. zho, jpn, kor, tha and the rest of
 * CER_UNVALIDATED_LANGUAGES are the least exposed — their threshold is 1.0, and
 * a notation difference never reaches it.
 */

/** German: einundzwanzig, hundert, tausend — units before tens, joined by "und". */
const DE = {
  ones: ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun',
    'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'],
  tens: ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'],
  // "einundzwanzig" uses ein-, not eins-.
  unitInCompound: (u) => (u === 1 ? 'ein' : DE.ones[u]),
  build (n) {
    if (n < 20) return this.ones[n]
    if (n < 100) {
      const u = n % 10
      return (u ? this.unitInCompound(u) + 'und' : '') + this.tens[Math.floor(n / 10)]
    }
    if (n < 1000) {
      const h = Math.floor(n / 100); const rest = n % 100
      return (h === 1 ? 'ein' : this.ones[h]) + 'hundert' + (rest ? this.build(rest) : '')
    }
    const t = Math.floor(n / 1000); const rest = n % 1000
    return (t === 1 ? 'ein' : this.build(t)) + 'tausend' + (rest ? this.build(rest) : '')
  },
}

/** Dutch: as A-136 wrote it, against real Femke renders — negenenzeventig, honderd, duizend. */
const NL = {
  ones: ['nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen',
    'tien', 'elf', 'twaalf', 'dertien', 'veertien', 'vijftien', 'zestien', 'zeventien', 'achttien', 'negentien'],
  tens: ['', '', 'twintig', 'dertig', 'veertig', 'vijftig', 'zestig', 'zeventig', 'tachtig', 'negentig'],
  build (n) {
    if (n < 20) return this.ones[n]
    if (n < 100) {
      const u = n % 10
      return (u ? this.ones[u] + 'en' : '') + this.tens[Math.floor(n / 10)]
    }
    if (n < 1000) {
      const h = Math.floor(n / 100); const rest = n % 100
      return (h === 1 ? 'honderd' : this.ones[h] + 'honderd') + (rest ? this.build(rest) : '')
    }
    const t = Math.floor(n / 1000); const rest = n % 1000
    return (t === 1 ? 'duizend' : this.build(t) + 'duizend') + (rest ? this.build(rest) : '')
  },
}

/** French: the vigesimal tail — soixante-dix, quatre-vingts, quatre-vingt-dix. */
const FR = {
  ones: ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'],
  tens: ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', '', 'quatre-vingt', ''],
  build (n) {
    if (n < 20) return this.ones[n]
    if (n < 70 || (n >= 80 && n < 90)) {
      const t = Math.floor(n / 10); const u = n % 10
      // vingt et un, but quatre-vingt-un; bare quatre-vingts takes the s.
      if (!u) return this.tens[t] + (t === 8 ? 's' : '')
      if (u === 1 && t !== 8) return this.tens[t] + ' et un'
      return this.tens[t] + '-' + this.ones[u]
    }
    if (n < 100) {
      // 70-79 is soixante + 10-19, 90-99 is quatre-vingt + 10-19.
      const base = n < 80 ? 'soixante' : 'quatre-vingt'
      const rest = n - (n < 80 ? 60 : 80)
      // 71 keeps the "et": soixante et onze. 91 does not: quatre-vingt-onze.
      return base + (rest === 11 && n < 80 ? ' et onze' : '-' + this.ones[rest])
    }
    if (n < 1000) {
      const h = Math.floor(n / 100); const rest = n % 100
      const head = h === 1 ? 'cent' : this.ones[h] + ' cent' + (rest ? '' : 's')
      return head + (rest ? ' ' + this.build(rest) : '')
    }
    const t = Math.floor(n / 1000); const rest = n % 1000
    return (t === 1 ? 'mille' : this.build(t) + ' mille') + (rest ? ' ' + this.build(rest) : '')
  },
  /**
   * Clock time, French spoken form — this is Rule 4c's payload (below), the
   * fix for the 2026-08-22 fra_for_eng pod-0 render (SC11-S008, A-111 follow-up).
   * "7h30" is one spoken unit, "sept heures et demie", not the two independent
   * cardinals 7 and 30 — whisper writes it as digit-and-h shorthand regardless
   * of how it was actually said, the same phenomenon as £48/forty-eight pounds,
   * just idiomatic rather than a straight number reading. 0h/12h are words in
   * their own right (minuit/midi), 1h takes the feminine singular (une heure,
   * never un heure), and the three quarter-hours have their own idiom on top
   * of the plain digital reading — both are offered, digital notation is
   * spreading in casual French and the idiom is not guaranteed.
   */
  time (hh, mm) {
    const h12 = hh % 12
    const hourWords = new Set()
    if (hh === 0) hourWords.add('minuit')
    else if (hh === 12) hourWords.add('midi')
    else hourWords.add(h12 === 1 ? 'une heure' : `${this.build(h12 || hh)} heures`)
    // 13-23 also get their plain 24-hour reading alongside the 12-hour one.
    if (hh >= 13) hourWords.add(`${this.build(hh)} heures`)

    if (mm == null || mm === 0) return [...hourWords]
    const minuteWords =
      mm === 30 ? ['et demie', 'trente']
        : mm === 15 ? ['et quart', 'quinze']
          : mm === 45 ? ['quarante-cinq']
            : [this.build(mm)]
    const out = []
    for (const h of hourWords) for (const m of minuteWords) out.push(`${h} ${m}`)
    return out
  },
}

/** Spanish: veintiuno as one word, cien vs ciento, the irregular hundreds. */
const ES = {
  ones: ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
    'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'],
  tens: ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'],
  hundreds: ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
    'seiscientos', 'setecientos', 'ochocientos', 'novecientos'],
  build (n) {
    if (n < 20) return this.ones[n]
    if (n < 30) return n === 20 ? 'veinte' : 'veinti' + this.ones[n - 20]
    if (n < 100) {
      const u = n % 10
      return this.tens[Math.floor(n / 10)] + (u ? ' y ' + this.ones[u] : '')
    }
    if (n < 1000) {
      const h = Math.floor(n / 100); const rest = n % 100
      // Bare 100 is "cien"; 101-199 is "ciento ...".
      return (n === 100 ? 'cien' : this.hundreds[h]) + (rest ? ' ' + this.build(rest) : '')
    }
    const t = Math.floor(n / 1000); const rest = n % 1000
    return (t === 1 ? 'mil' : this.build(t) + ' mil') + (rest ? ' ' + this.build(rest) : '')
  },
}

/** Portuguese: "e" between every part — cento e nove, mil e duzentos. */
const PT = {
  ones: ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
    'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezasseis', 'dezassete', 'dezoito', 'dezanove'],
  tens: ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'],
  hundreds: ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
    'seiscentos', 'setecentos', 'oitocentos', 'novecentos'],
  build (n) {
    if (n < 20) return this.ones[n]
    if (n < 100) {
      const u = n % 10
      return this.tens[Math.floor(n / 10)] + (u ? ' e ' + this.ones[u] : '')
    }
    if (n < 1000) {
      const h = Math.floor(n / 100); const rest = n % 100
      return (n === 100 ? 'cem' : this.hundreds[h]) + (rest ? ' e ' + this.build(rest) : '')
    }
    const t = Math.floor(n / 1000); const rest = n % 1000
    return (t === 1 ? 'mil' : this.build(t) + ' mil') + (rest ? ' e ' + this.build(rest) : '')
  },
}

/** Italian: elided vowels — ventuno, ventotto — and cento/mille/mila. */
const IT = {
  ones: ['zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove',
    'dieci', 'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove'],
  tens: ['', '', 'venti', 'trenta', 'quaranta', 'cinquanta', 'sessanta', 'settanta', 'ottanta', 'novanta'],
  build (n) {
    if (n < 20) return this.ones[n]
    if (n < 100) {
      const u = n % 10
      if (!u) return this.tens[Math.floor(n / 10)]
      // The ten drops its final vowel before uno and otto: ventuno, ventotto.
      const t = (u === 1 || u === 8) ? this.tens[Math.floor(n / 10)].slice(0, -1) : this.tens[Math.floor(n / 10)]
      // ...and a final -tre takes an accent: ventitré.
      return t + (u === 3 ? 'tré' : this.ones[u])
    }
    if (n < 1000) {
      const h = Math.floor(n / 100); const rest = n % 100
      return (h === 1 ? 'cento' : this.ones[h] + 'cento') + (rest ? this.build(rest) : '')
    }
    const t = Math.floor(n / 1000); const rest = n % 1000
    return (t === 1 ? 'mille' : this.build(t) + 'mila') + (rest ? this.build(rest) : '')
  },
}

/**
 * Icelandic: cardinals 1-4 inflect for grammatical gender — einn/ein/eitt,
 * tveir/tvær/tvö, þrír/þrjár/þrjú, fjórir/fjórar/fjögur — and the decode gives
 * no way to know which gender was spoken. Neuter is `build`'s default reading
 * (the form used for standalone counting, e.g. reading a sequence "19, 20,
 * 21"), and masculine/feminine are offered as ADDITIONAL readings via
 * `genderVariants`, never chosen over it — the comparator scores whichever
 * fits (Tom, 2026-08-22, isl_for_eng free-tier unblock). Only the number's
 * own trailing digit inflects; hundred/thousand multipliers stay neuter
 * (hundrað/þúsund are themselves neuter nouns), so gender threads through
 * `build`'s recursion into `rest` only, never into a multiplier position.
 * Tens and units join with "og" — tuttugu og eitt, aldrei "tuttuguogeitt".
 */
const IS_ONES = {
  neut: ['núll', 'eitt', 'tvö', 'þrjú', 'fjögur', 'fimm', 'sex', 'sjö', 'átta', 'níu',
    'tíu', 'ellefu', 'tólf', 'þrettán', 'fjórtán', 'fimmtán', 'sextán', 'sautján', 'átján', 'nítján'],
  masc: ['núll', 'einn', 'tveir', 'þrír', 'fjórir', 'fimm', 'sex', 'sjö', 'átta', 'níu',
    'tíu', 'ellefu', 'tólf', 'þrettán', 'fjórtán', 'fimmtán', 'sextán', 'sautján', 'átján', 'nítján'],
  fem: ['núll', 'ein', 'tvær', 'þrjár', 'fjórar', 'fimm', 'sex', 'sjö', 'átta', 'níu',
    'tíu', 'ellefu', 'tólf', 'þrettán', 'fjórtán', 'fimmtán', 'sextán', 'sautján', 'átján', 'nítján'],
}
const IS_TENS = ['', '', 'tuttugu', 'þrjátíu', 'fjörutíu', 'fimmtíu', 'sextíu', 'sjötíu', 'áttatíu', 'níutíu']
const IS = {
  ones: IS_ONES.neut, // digitwiseWords (phone/room-number style) reads plain neuter digits.
  build (n, form = 'neut') {
    const ones = IS_ONES[form] || IS_ONES.neut
    if (n < 20) return ones[n]
    if (n < 100) {
      const u = n % 10
      return IS_TENS[Math.floor(n / 10)] + (u ? ' og ' + ones[u] : '')
    }
    if (n < 1000) {
      const h = Math.floor(n / 100); const rest = n % 100
      const head = h === 1 ? 'hundrað' : IS_ONES.neut[h] + ' hundruð'
      return head + (rest ? ' og ' + this.build(rest, form) : '')
    }
    const t = Math.floor(n / 1000); const rest = n % 1000
    const head = t === 1 ? 'þúsund' : this.build(t, 'neut') + ' þúsund'
    return head + (rest ? (rest < 100 ? ' og ' : ' ') + this.build(rest, form) : '')
  },
  genderVariants (n) {
    const u = n % 10
    const tensDigit = Math.floor((n % 100) / 10)
    // Teens (11-19, tensDigit === 1) never inflect — "ellefu" etc are invariant.
    if (u < 1 || u > 4 || tensDigit === 1) return []
    return ['masc', 'fem'].map(form => this.build(n, form))
  },
}

/** ISO-639-1 -> lexicon. Absent = English readings only, exactly as before. */
const NUMERAL_LEXICONS = { de: DE, nl: NL, fr: FR, es: ES, pt: PT, it: IT, is: IS }

/** The lexicon for a decode language, or null when there is none. */
function lexiconFor (iso1) {
  return NUMERAL_LEXICONS[String(iso1 || '').toLowerCase()] || null
}

/** One cardinal, in `lex`'s language. Bounded — past 9999 the readings stop earning their cost. */
function lexNumberToWords (n, lex) {
  n = Math.trunc(Math.abs(Number(n) || 0))
  if (!lex || !Number.isFinite(n) || n > 9999) return null
  return lex.build(n)
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
function numeralReadings (token, iso1) {
  const lex = lexiconFor(iso1)
  const cur = CURRENCY_WORDS[token[0]]
  if (cur) {
    const base = numeralReadings(token.slice(1), iso1)
    const dec = /^(\d+)\.(\d{2})$/.exec(token.slice(1))
    // The currency WORD is language-specific too, and we do not have it for the
    // target language — so the amount gets its target readings and keeps the
    // symbol, which is what the decode wrote anyway.
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
    if (dec[2].length === 2) {
      out.push(`${numberToWords(whole)} ${numberToWords(Number(dec[2]))}`)
      if (lex) out.push(`${lexNumberToWords(whole, lex)} ${lexNumberToWords(Number(dec[2]), lex)}`)
    }
    out.push(`${numberToWords(whole)} point ${digitwiseWords(dec[2])}`)
    if (lex) out.push(`${lexNumberToWords(whole, lex)} ${digitwiseWords(dec[2], lex)}`)
    return [...new Set(out.filter(Boolean))]
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
  // The same two readings again, in the language the clip is actually in.
  if (lex) {
    out.push(lexNumberToWords(n, lex))
    // Gendered lexicons (Icelandic: einn/ein/eitt) offer every inflected form
    // as an alternative reading — the decode never says which was spoken.
    if (lex.genderVariants) out.push(...lex.genderVariants(n))
    if (token.length >= 2) out.push(digitwiseWords(token, lex))
  }
  return [...new Set(out.filter(Boolean))]
}

const NUMERAL_TOKEN = /[£$€¥₹₩₪₺₫₴₦]?\d+(?:\.\d+)?(?:st|nd|rd|th)?/gi
/** Thousands separators are punctuation, not structure: 12,500 -> 12500. */
function stripGrouping (s) { return String(s == null ? '' : s).replace(/(\d),(?=\d{3}(?:\D|$))/g, '$1') }

/**
 * Clock-time shorthand — "7h30", "10h", "14h05" — bounded to real hours (0-23)
 * and minutes (00-59) so it cannot mistake a phone number or a room number for
 * a time. Only consulted by languages whose lexicon defines `.time()` (see Rule
 * 4c in numeralVerdictViaLexicon); every other language is untouched by this.
 */
const TIME_TOKEN = /\b([01]?\d|2[0-3])h([0-5]\d)?\b/gi

/**
 * Every normalised reading of `text` worth scoring against. Index 0 is the plain
 * normalisation, so a text with no digits yields exactly one candidate and this
 * whole mechanism is a no-op — which is why the 5,341 remembered decodes re-judge
 * identically except where a numeral is actually involved.
 */
// Raised from 12 with the target-language lexicons: one token now offers up to
// five readings instead of three, so two numerals in a line would otherwise fall
// straight through to the three-pick shortcut and lose the reading that fits.
const MAX_NUMERAL_VARIANTS = 32
function numeralVariants (text, iso1) {
  const raw = stripGrouping(text)
  const plain = normalise(raw)
  const lex = lexiconFor(iso1)

  // Clock-time tokens claim their span first — "7h30" is one spoken unit
  // ("sept heures et demie") and must not also be seen as the two independent
  // digit tokens "7" and "30", which would leave a stray "h" sitting in every
  // candidate and cost CER points on short clips for no reason. Scoped to
  // languages with `.time()` (French today); every other language collects
  // tokens exactly as it did before this existed.
  const timeMatches = lex && lex.time ? [...raw.matchAll(TIME_TOKEN)] : []
  const claimed = timeMatches.map(m => [m.index, m.index + m[0].length])
  const overlapsClaimed = (i, len) => claimed.some(([s, e]) => i < e && i + len > s)

  const numTokens = []
  NUMERAL_TOKEN.lastIndex = 0
  let tm
  while ((tm = NUMERAL_TOKEN.exec(raw))) {
    if (!overlapsClaimed(tm.index, tm[0].length)) {
      numTokens.push({ start: tm.index, end: tm.index + tm[0].length, readings: numeralReadings(tm[0], iso1) })
    }
  }
  const timeTokens = timeMatches.map(m => ({
    start: m.index,
    end: m.index + m[0].length,
    readings: [m[0], ...lex.time(Number(m[1]), m[2] ? Number(m[2]) : null)],
  }))
  const allTokens = [...numTokens, ...timeTokens].sort((a, b) => a.start - b.start)
  if (!allTokens.length) return [plain]

  const readings = allTokens.map(t => t.readings)
  const combos = readings.reduce((acc, r) => acc * r.length, 1)
  // Too many numerals to enumerate: instead of the cartesian product, score the
  // UNIFORM readings — every token read the same way — and let the best speak.
  //
  // This used to pick three positions only (raw, English long-form, digitwise),
  // which silently dropped the target-language reading the lexicons exist to
  // provide: `numeralReadings('19', 'pt')` offers ['19', 'nineteen', 'one nine',
  // 'dezanove', 'um nove'] and position 3 was never picked. Two numerals in a
  // line stayed under the cap and were fine; THREE fell through here and lost
  // "dezanove" — which is how por_for_eng's number-drill lines ("Dezanove. Vinte.
  // Vinte e um. Quarta-feira. Quinta-feira.", heard correctly as "19. 20. 21.
  // Quarta-feira. Quinta-feira.") were quarantined at CER 0.33 for notation on
  // 2026-08-22, with every non-numeric word decoded exactly right.
  //
  // Sweeping all positions is a SUPERSET of the old three, so no clip that passes
  // today can fail tomorrow, and it is cheaper than the cap it replaces: one pick
  // per reading position (five today) rather than up to MAX_NUMERAL_VARIANTS.
  const widest = readings.reduce((m, r) => Math.max(m, r.length), 0)
  const picks = combos > MAX_NUMERAL_VARIANTS
    ? Array.from({ length: widest }, (_, i) => readings.map(r => r[Math.min(i, r.length - 1)]))
    : cartesian(readings)

  const out = new Set([plain])
  for (const pick of picks) {
    // Padded, because whisper writes "12's" and an unpadded swap would make one
    // unparseable word of "twelve's".
    let result = ''; let cursor = 0
    allTokens.forEach((t, idx) => {
      result += raw.slice(cursor, t.start) + ` ${pick[idx]} `
      cursor = t.end
    })
    result += raw.slice(cursor)
    out.add(normalise(result))
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
function numeralVerdict (expectedText, decodeText, iso1) {
  const eNums = cardinalsOf(expectedText)
  if (!eNums.length) return numeralVerdictViaLexicon(expectedText, decodeText, iso1)
  const dNums = cardinalsOf(decodeText)
  if (!dNums.length) return { ok: true, via: 'decode_has_no_numerals' }

  const eDigits = [...digitStringsOf(expectedText)]
  const dDigits = [...digitStringsOf(decodeText)]
  if (eDigits.some(x => dDigits.includes(x))) return { ok: true }

  const dVariants = numeralVariants(decodeText, iso1).map(v => v.split(' ').filter(Boolean))
  const allHeard = eNums.every(n => {
    const readings = [...new Set([numberToWords(n), digitwiseWords(String(n)), String(n)])]
      .map(r => r.split(' ').filter(Boolean))
    return readings.some(r => dVariants.some(dv => containsWordRun(dv, r)))
  })
  if (allHeard) return { ok: true, via: 'numerals_spelt_out_in_decode' }
  return { ok: false, expected: eDigits[0], heard: dDigits[0] }
}

/**
 * Rule 4b — the same question, asked where the English parser cannot hear it.
 *
 * Rule 4 above reads both sides with an ENGLISH word parser, so on a Dutch or
 * Spanish script it finds no cardinals in the expected text and abstains. That
 * was harmless while the canonicaliser was English-only — the notation
 * difference convicted the clip at Rule 2 anyway, right answer for the wrong
 * reason — but the lexicons have now made a numeral's spelling free in those
 * languages too, and something has to stop them making its VALUE free with it.
 * Without this, "kamer zevenhonderd negen" decoded as "kamer 809" would align
 * to "achthonderd negen", five edits from the script, and pass under the floor.
 *
 * So: when the decode carries digits, every number it carries must be findable
 * in the script — as digits, or spelt out in one of the target language's
 * readings of it. Spacing and hyphens are ignored on both sides, because
 * Dutch and German write "zevenhonderdnegen" solid where French writes
 * "sept cent neuf" and an author may hyphenate either.
 *
 * THIS CANNOT MAKE ANY CLIP WORSE OFF THAN TODAY. It only fires on clips whose
 * script has no English-readable numeral and whose decode has digits — exactly
 * the clips Rule 2 convicts today on notation alone. A pass here is a clip that
 * was being refused wrongly; a failure here is a clip that was being refused
 * anyway, now with an honest reason attached.
 */
function numeralVerdictViaLexicon (expectedText, decodeText, iso1) {
  const lex = lexiconFor(iso1)
  if (!lex) return { ok: true }
  // Only the digits the decode actually wrote are this rule's business — a
  // number the decode spelt out in words was never a notation problem.
  if (!/\d/.test(String(decodeText))) return { ok: true, via: 'decode_has_no_digits' }

  const squash = (s) => normalise(s).replace(/[\s'-]/g, '')
  const hay = squash(expectedText)

  // Rule 4c: clock time is one spoken unit ("7h30" is "sept heures et demie"),
  // not the two cardinals 7 and 30 — checked and consumed BEFORE the per-number
  // rule below, so a time whose minutes are an idiom (demie/quart) is not then
  // also demanded to appear as the bare number word ("trente") it never used.
  // Additive and scoped to languages that define `.time()` — every other
  // language's decode is untouched, exactly as before this existed.
  let consumedText = decodeText
  if (lex.time) {
    for (const m of decodeText.matchAll(TIME_TOKEN)) {
      const hh = Number(m[1]); const mm = m[2] ? Number(m[2]) : null
      const readings = lex.time(hh, mm)
      if (!readings.some(r => hay.includes(squash(r)))) {
        return { ok: false, expected: null, heard: m[0] }
      }
      consumedText = consumedText.replace(m[0], ' ')
    }
  }

  const dNums = cardinalsOf(consumedText)
  if (!dNums.length) return { ok: true, via: 'decode_has_no_numerals' }

  const allFound = dNums.every(n => {
    const readings = [String(n), lexNumberToWords(n, lex), digitwiseWords(String(n), lex)]
    return readings.filter(Boolean).some(r => hay.includes(squash(r)))
  })
  if (allFound) return { ok: true, via: 'numerals_spelt_out_in_script' }

  // THE FLOOR HOLDS HERE TOO. Replaying the 5,341 cached decodes caught this:
  // the French one-word clip "tout" comes back "2.", and without this guard the
  // rule convicted it — a digit in the decode, no "deux" in the script. But that
  // is the short-clip class MIN_EDIT_DISTANCE was built for ("er" -> "Ja.",
  // "sie" -> "Z."): whisper cannot transcribe a four-letter clip with no context,
  // and a three-character disagreement is not a learner-facing defect. So this
  // rule may only convict where the two strings genuinely diverge before any
  // canonicalisation — which is true of every real substituted number ("kamer
  // 809" is sixteen edits from "kamer zevenhonderd negen") and false of every
  // hallucinated digit on a short script.
  const rawEdits = levenshtein(normalise(expectedText), normalise(decodeText))
  if (rawEdits < MIN_EDIT_DISTANCE) return { ok: true, via: 'under_edit_floor' }
  return { ok: false, expected: null, heard: dNums.join('') }
}

/**
 * The best-fitting pair of readings of (expected, decode) and the edit distance
 * between them. With no digits on either side this is plain normalisation and one
 * levenshtein, exactly as before.
 */
function alignedPair (expected, decode, iso1) {
  const eVars = numeralVariants(expected, iso1)
  const dVars = numeralVariants(decode, iso1)
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
function verdictFromDecode (decode, expectedRaw, iso1, opts = {}) {
  // The synthesiser's stage directions are not speech and must not be compared
  // against as though they were (see stripSynthesisCues). A no-op for any text
  // without cues, which is everything outside the pods.
  const expected = stripSynthesisCues(expectedRaw)

  // Both sides are re-read into the same currency before anything is measured:
  // whisper spells numbers with digits and the scripts spell them with words, and
  // that difference is orthography, not audio (see numeralVariants above). With no
  // digits anywhere this is plain normalisation and the old code path exactly.
  const aligned = alignedPair(expected, decode, iso1)
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
  const nv = numeralVerdict(expected, decode, iso1)
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
// Duration — the clip being replaced is NOT a reference
// ---------------------------------------------------------------------------

/**
 * WHY THIS EXISTS (the 2026-08-17 nld pod recast, A-136).
 *
 * Every re-render tool on this estate grew the same `not_truncated` check, and
 * it is the same mistake every time: the NEW clip's duration is compared against
 * the OLD clip's — the very clip being thrown away. That is not a reference. It
 * assumes the superseded take is (a) correct and (b) spoken by a comparable
 * voice, and a re-render is usually happening precisely because one of those is
 * false.
 *
 * A-136 measured both failures in one batch. Femke reads "Wat interessant." in
 * 1176ms where Noor took 3288ms — a 0.36 ratio, refused, both clips perfect,
 * the voices simply differ. And Noor's own "Pardon — heeft u ook iets
 * glutenvrijs?" is 936ms, itself a truncated take, which was then used as the
 * standard against which a correct 3096ms Femke render was rejected. A defective
 * clip cannot certify its replacement.
 *
 * The reference that IS available is the text. A voice reading a script covers
 * its characters at a rate that varies by voice and by mood but not by orders of
 * magnitude, and truncation and hanging are order-of-magnitude events. So the
 * question becomes "could this text have been spoken in this long?", which needs
 * nothing from the old clip at all.
 *
 * BANDS, AND WHY THEY ARE WIDE. The 245 Femke renders A-136 had already accepted
 * span 6.9-20.9 chars/sec, and the gate sits at 4-28 — comfortably outside the
 * observed spread, because this check is looking for a clip cut in half or a
 * render that hung, not for a brisk reading. Anything subtler is the ASR gate's
 * job and it is better at it.
 *
 * SCRIPT-DEPENDENT, and it must be: a Chinese character is a whole syllable and
 * a Thai string has no spaces, so chars/sec means something different there.
 * Only the script classes with a measured band get a verdict. Everything else
 * ABSTAINS — `ok: true` with a reason saying so — because a made-up band on an
 * unmeasured script would refuse healthy audio, which is the defect this whole
 * function exists to remove.
 *
 * @param {object} o
 * @param {string} o.text        the text sent to TTS, cues and all
 * @param {number} o.durationMs  the rendered clip's measured duration
 * @param {string} [o.language]  course_audio.language or ISO-639-1
 * @returns {{ok:boolean, cps:number|null, band:[number,number]|null, reason:string, detail:string}}
 */
const SPEECH_RATE_BANDS = {
  // Alphabetic scripts, one character ≈ one phoneme-ish. Measured on nld (A-136,
  // 245 accepted renders: 6.9-20.9) and consistent with the deu/fra/eng estate.
  alphabetic: [4, 28],
  // Logographic: one character is a whole syllable, so the rate is far lower.
  // NOT MEASURED — deliberately absent rather than guessed. Add a band here only
  // with clips behind it.
}

function scriptClassOf (text) {
  const s = String(text || '')
  if (/[　-鿿豈-﫿぀-ヿ가-힯]/.test(s)) return 'logographic'
  if (/[฀-๿຀-໿က-႟ក-៿]/.test(s)) return 'unspaced_abugida'
  return 'alphabetic'
}

const SPEECH_RATE_MIN_CHARS = 6

function speechRateVerdict (o = {}) {
  const text = stripSynthesisCues(o.text)
  const chars = normalise(text).length
  const durationMs = Number(o.durationMs)

  if (!chars || !Number.isFinite(durationMs) || durationMs <= 0) {
    return { ok: true, cps: null, band: null, reason: 'not_measurable', detail: 'no text or no duration' }
  }
  // Below a handful of characters the ratio is as unstable as CER is on a
  // two-letter script, and for the same reason: the denominator is tiny.
  if (chars < SPEECH_RATE_MIN_CHARS) {
    return { ok: true, cps: null, band: null, reason: 'text_too_short_to_rate', detail: `${chars} chars` }
  }

  const cls = scriptClassOf(text)
  const band = SPEECH_RATE_BANDS[cls]
  const cps = chars / (durationMs / 1000)
  if (!band) {
    return {
      ok: true,
      cps: +cps.toFixed(2),
      band: null,
      reason: `no_band_for_${cls}`,
      detail: `${cps.toFixed(1)} chars/sec — no measured band for ${cls} script, so this check abstains`,
    }
  }
  const ok = cps >= band[0] && cps <= band[1]
  return {
    ok,
    cps: +cps.toFixed(2),
    band,
    reason: ok ? 'speech_rate_plausible' : (cps < band[0] ? 'too_slow_for_text' : 'too_fast_for_text'),
    detail: `${cps.toFixed(1)} chars/sec (${durationMs}ms for ${chars} chars; band ${band[0]}-${band[1]})`,
  }
}

// ---------------------------------------------------------------------------
// Verify-against-known-text scoring — pure, and therefore unit-tested
// ---------------------------------------------------------------------------

/**
 * How much of this decode is the known text? 1 = identical, 0 = unrelated.
 *
 * Scored through the SAME currency the free verdict uses — cues stripped,
 * numerals aligned, normalised — so a clip is never verified or refused on a
 * difference the free gate already knows is orthography. Clamped, because
 * insertions can push CER above 1 and a negative similarity means nothing.
 */
function similarity (expected, decode, iso1) {
  const e = stripSynthesisCues(expected)
  const aligned = alignedPair(e, decode, iso1)
  if (!aligned.e.length) return aligned.d.length ? 0 : 1
  return Math.max(0, 1 - aligned.edits / aligned.e.length)
}

/**
 * Fraction of the expected words individually locatable in the decode.
 *
 * Same length-scaled tolerance as lastWordVerdict — whisper's SPELLING of a word
 * is unreliable while its PRESENCE is the thing being asked about — but searched
 * over the whole decode rather than the tail, because here the question is
 * coverage rather than truncation. Runs on the aligned pair for the same reason
 * similarity does.
 *
 * @returns {number|null} null when the expected text has no words to look for.
 */
function wordCoverage (expected, decode, iso1) {
  const aligned = alignedPair(stripSynthesisCues(expected), decode, iso1)
  const ew = aligned.e.split(' ').filter(Boolean)
  const dw = aligned.d.split(' ').filter(Boolean)
  if (!ew.length) return null
  let hit = 0
  for (const w of ew) {
    const tolerance = w.length <= 3 ? 0 : w.length <= 6 ? 1 : 2
    if (dw.some(d => levenshtein(w, d) <= tolerance)) hit++
  }
  return hit / ew.length
}

/**
 * Is there too little speech in this clip for this script to be in it?
 *
 * Pure, and deliberately three-outcome: `null` means the question could not be
 * asked, which is not "no". See VERIFY_MIN_SEC_PER_SYLLABLE for the measurement.
 *
 * @param {number|null} speechSec  VAD SPEECH SPAN, not container duration —
 *        container duration includes the mastering pad and would hide a
 *        truncation behind trailing silence.
 * @param {number|null} syllables  syllables in the known text
 */
function truncationSuspect (speechSec, syllables) {
  if (!Number.isFinite(speechSec) || !Number.isFinite(syllables) || syllables <= 0) {
    return { truncated: null, secPerSyllable: null }
  }
  const sps = speechSec / syllables
  return { truncated: sps < VERIFY_MIN_SEC_PER_SYLLABLE, secPerSyllable: +sps.toFixed(4) }
}

/**
 * The verify verdict: given that the free decode condemned the clip, and a
 * decode made WITH the known text as the prompt, is this audio a rendition of
 * that text after all?
 *
 * Pure — the truncation veto needs the audio and is applied by the caller.
 *
 * @returns {{verified:boolean, reason:string, similarity:number,
 *            coverage:number|null}}
 */
function verifyVerdict (primed, expected, iso1) {
  // Rule 1 survives verification unchanged, and on the Catrin noise takes it is
  // the rule that fires: a primed decode of an empty room comes back EMPTY.
  if (isNonSpeechDecode(primed)) {
    return { verified: false, reason: 'no_speech_when_primed', similarity: 0, coverage: 0 }
  }

  const sim = similarity(expected, primed, iso1)
  const cov = wordCoverage(expected, primed, iso1)

  if (sim < VERIFY_THRESHOLD) {
    return { verified: false, reason: 'verify_similarity_below_threshold', similarity: sim, coverage: cov }
  }
  if (cov != null && cov < VERIFY_MIN_COVERAGE) {
    return { verified: false, reason: 'verify_coverage_below_threshold', similarity: sim, coverage: cov }
  }

  // Rule 3 is NOT waived by a good similarity score, and it is run on the
  // decode that is doing the rescuing.
  //
  // It is a weakened instrument here and that is stated rather than hidden: the
  // decode being asked "was the last word spoken?" is the one the prompt could
  // have completed. It is kept because the defect it exists for is Tom's, real,
  // and common — 2026-08-07, fra_for_eng: "the final word is wholly missing and
  // the clip ends in a gap. About 1 in 3 files." A single dropped final word is
  // too small to move the speech-rate veto below its floor, so without this rule
  // that class has no guard at all in verify mode. Rule 3's own head-fit test
  // (see lastWordVerdict) is what keeps it from convicting mere spelling.
  const aligned = alignedPair(stripSynthesisCues(expected), primed, iso1)
  const lw = lastWordVerdict(aligned.e, aligned.d)
  if (!lw.ok) {
    return { verified: false, reason: 'verify_last_word_missing', similarity: sim, coverage: cov, lastWord: lw.word }
  }

  return { verified: true, reason: 'verified_against_known_text', similarity: sim, coverage: cov }
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
 * Decode one clip.
 *
 * `opts.prompt` supplies whisper's initial prompt and is the ONLY difference
 * between the two decodes verify mode makes. Absent — the default, and every
 * first decode — this is the free, unprimed decode the operating point was
 * fitted on: the expected text is never shown to whisper and is used only
 * afterwards by verdictFromDecode.
 *
 * NEVER --grammar. A grammar removes the decoder's alternatives and its
 * confidence goes to ~1 regardless of the acoustics; a prompt leaves them in
 * place, which is what lets the audio refuse a wrong hypothesis (measured:
 * wrong-prompt control scores 0.00-0.31). See the header.
 */
async function decodeAudio (input, iso1, opts = {}) {
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
    const args = [
      '-m', WHISPER_MODEL,
      '-l', iso1 || 'auto',
      '-t', String(WHISPER_THREADS),
      '-np',              // no progress spam in the render log
      '-oj', '-of', base, // -> `${base}.json`
      '-f', wav,
    ]
    // ⚠️ The whisper-cli wrapper at ~/.local/bin/whisper-cli treats a --prompt
    // argument as "a human is waiting" and BYPASSES its concurrency semaphore.
    // That heuristic predates verify mode and reads command-surface's voice
    // path, which is the only other caller that primes. This gate holds its own
    // semaphore around the whole check so the total is still bounded, but the
    // coupling is named here rather than left to be rediscovered.
    if (opts.prompt) args.push('--prompt', String(opts.prompt))
    await run(WHISPER_BIN, args)
    made.push(json)
    const parsed = JSON.parse(fs.readFileSync(json, 'utf8'))
    return (parsed.transcription || []).map(s => s.text).join(' ').trim()
  } finally {
    for (const f of made) { try { fs.unlinkSync(f) } catch {} }
  }
}

/**
 * Measure the clip's speech span against its script's syllable count.
 *
 * Uses the audio-intelligence engine's single decode + VAD rather than a second
 * private ffmpeg invocation — the whole point of that module is that every tier
 * looks at the SAME samples (see its header). Never throws: a guard that cannot
 * measure reports that it could not, and the caller says so.
 */
async function measureTruncation (input, expectedText, language) {
  let spilled = null
  let d = null
  try {
    const decodeEngine = require('./audio-intelligence/decode.cjs')
    const vad = require('./audio-intelligence/tiers/vad.cjs')
    const syllables = require('./audio-intelligence/syllables.cjs')

    const s = syllables.count(stripSynthesisCues(expectedText), language)
    if (!s.syllables) return { truncated: null, why: 'no countable syllables in the script', secPerSyllable: null, speechSpanSec: null }

    if (Buffer.isBuffer(input)) {
      spilled = path.join(os.tmpdir(), `veracity-trunc-${crypto.randomUUID()}`)
      fs.writeFileSync(spilled, input)
    }
    d = await decodeEngine.decode(spilled || input)
    const v = vad.analyse(d.samples, d.sampleRate)
    const speechSpanSec = Number(v.speechDurationSec || 0)
    const t = truncationSuspect(speechSpanSec, s.syllables)
    return { ...t, speechSpanSec: +speechSpanSec.toFixed(3), syllables: s.syllables, syllableCounterCalibrated: s.calibrated }
  } catch (e) {
    return { truncated: null, why: `measurement failed: ${String(e && e.message).slice(0, 120)}`, secPerSyllable: null, speechSpanSec: null }
  } finally {
    if (d) { try { d.dispose() } catch { /* already gone */ } }
    if (spilled) { try { fs.unlinkSync(spilled) } catch { /* already gone */ } }
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
  // Cues are not words, so a line that is nothing but cues has nothing to compare
  // against — the same third state as an empty text, and never a pass.
  if (!stripSynthesisCues(expectedText)) return unchecked('unchecked_no_text', 'no expected text to compare against')
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
  let primed = null
  let verify = null
  try {
    decode = await decodeAudio(input, iso1 || 'auto')

    // VERIFY MODE. The free decode is tried first and, when it settles the
    // question, that is the whole cost. Only a clip the free decode has already
    // condemned is asked the verification question, because only then is a
    // second decode buying anything. See the VERIFY AGAINST KNOWN TEXT block.
    const freeVerdict = verdictFromDecode(decode, expectedText, iso1, { cerThreshold: opts.cerThreshold })
    if (!freeVerdict.pass && isVerifyMode()) {
      primed = await decodeAudio(input, iso1 || 'auto', { prompt: stripSynthesisCues(expectedText) })
      verify = verifyVerdict(primed, expectedText, iso1)

      // The truncation veto, and it runs ONLY on a rescue — see
      // VERIFY_MIN_SEC_PER_SYLLABLE. Measuring costs an ffmpeg decode, so it is
      // paid only by clips the text layer has already decided to save, and
      // never by a clip the free decode passed on its own.
      if (verify.verified) {
        const t = await measureTruncation(input, expectedText, language)
        verify.secPerSyllable = t.secPerSyllable
        verify.speechSpanSec = t.speechSpanSec
        if (t.truncated === true) {
          verify.verified = false
          verify.reason = 'verify_speech_too_short_for_script'
        } else if (t.truncated === null) {
          // Could not measure. The text layer verified it and the guard could
          // not run — say WHICH, rather than letting the pass look complete.
          verify.truncationUnchecked = t.why
        }
      }
    }
  } catch (e) {
    return unchecked('unchecked_decode_error', String(e.message).slice(0, 200))
  } finally {
    release()
  }

  const v = verdictFromDecode(decode, expectedText, iso1, { cerThreshold: opts.cerThreshold })
  return {
    pass: v.pass || (verify ? verify.verified : false),
    checked: true,
    // The reason always names what DECIDED: a rescued clip says it was verified
    // against its known text, a refused one keeps the free decode's reason and
    // carries why verification did not overturn it.
    reason: v.pass ? v.reason : (verify ? (verify.verified ? verify.reason : `${v.reason}+${verify.reason}`) : v.reason),
    mode: isVerifyMode() ? 'verify' : 'free',
    cer: +v.cer.toFixed(4),
    edits: v.edits,
    threshold: v.threshold,
    decode,
    ...(primed != null ? { primedDecode: primed } : {}),
    ...(verify ? {
      verified: verify.verified,
      similarity: +verify.similarity.toFixed(4),
      coverage: verify.coverage == null ? null : +verify.coverage.toFixed(4),
      ...(verify.secPerSyllable != null ? { secPerSyllable: verify.secPerSyllable, speechSpanSec: verify.speechSpanSec } : {}),
      ...(verify.truncationUnchecked ? { truncationUnchecked: verify.truncationUnchecked } : {}),
    } : {}),
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
  verifyVerdict,
  truncationSuspect,
  measureTruncation,
  similarity,
  wordCoverage,
  isVerifyMode,
  VERIFY_THRESHOLD,
  VERIFY_MIN_COVERAGE,
  VERIFY_MIN_SEC_PER_SYLLABLE,
  characterErrorRate,
  isNonSpeechDecode,
  normalise,
  stripSynthesisCues,
  speechRateVerdict,
  SPEECH_RATE_BANDS,
  NUMERAL_LEXICONS,
  lexiconFor,
  lexNumberToWords,
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
  DECODER_NOT_VALIDATED,
  decoderValidated,
  MIN_EDIT_DISTANCE,
  WHISPER_ISO1,
  QUARANTINE_DIR,
  _resetAnnouncement,
}
