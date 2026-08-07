/**
 * THE GATE STACK — one callable module, and `null` refuses.
 *
 * Every check in this estate exists somewhere. None of them is wired to a decision.
 * This file is the decision: given the MASTERED bytes of one clip, does it enter the
 * store or does it go to quarantine with a verdict a human can read and hear.
 *
 * Spec: docs/architecture/AUDIO_PIPELINE_PROVIDERS_FIDELITY_LABS-2026-08-06.md §2.
 * Store: docs/architecture/AUDIO_PIPELINE_CONTENT_ADDRESSED_DESIGN-2026-08-06.md.
 *
 * ── THE ORDER, CHEAP FIRST ──────────────────────────────────────────────────────────
 *   1 speech-span   where the speech is; everything downstream measures against it
 *   2 loudness      integrated LUFS in the course's declared band, true peak under the ceiling
 *   3 tail-shape    did the voice stop, or was it cut
 *   4 syllable-rate could this voice say those syllables in that time
 *   5 phonology     is it the right LANGUAGE (xAI, non-English target)
 *   6 words         whisper CER — the expensive one, on what the cheap tiers escalate
 *
 * ── THREE RULES, AND THEY ARE THE POINT ─────────────────────────────────────────────
 *
 * 1 · `null` REFUSES. Today `renderChecked` returns `pass: null` when it could not measure
 *   and the caller uploads anyway, recording the outcome as `unchecked`. That was an honest
 *   choice for a gate retro-fitted onto a live estate. Under a store whose whole promise is
 *   that everything in it passed, it inverts: if the gate cannot measure a clip, the clip
 *   does not enter the store. The three-outcome shape stays — it is the right shape — and
 *   only the DISPOSITION of the third outcome flips, from admit to quarantine.
 *
 *   The distinction that makes this liveable is between CANNOT MEASURE and DOES NOT APPLY.
 *   Phonology on an English clip does not apply: recorded, skipped, refuses nothing.
 *   Phonology on a German xAI clip with no whisper on the box CANNOT MEASURE: it refuses,
 *   loudly, and that is correct — a machine that cannot check a language must not be
 *   allowed to quietly fill a course with clips nobody checked. See `availability` in
 *   every verdict: a clip must be able to say "phonology: unchecked" rather than being
 *   indistinguishable from "phonology: passed".
 *
 * 2 · FAILURES QUARANTINE WITH THEIR VERDICT ATTACHED, so a human can hear what failed and
 *   why. `services/audio-veracity.cjs` already does exactly this — attempts, then quarantine
 *   of the failing bytes plus a JSONL record, nothing uploaded and nothing inserted. This
 *   module produces the verdict that pattern carries; it does not invent a second one.
 *
 * 3 · SAY WHICH ROLE A MEASUREMENT IS PLAYING, EVERY TIME. Verbatim from
 *   `tools/audio-pace-gate.cjs`'s own header, and it survives into this pipeline:
 *
 *     "It is an OUTPUT CHECK, never a selector. Every previous attempt on this course
 *      failed by using a cheap test to DECIDE WHAT TO REPLACE — and every definition
 *      missed rows."
 *
 *   At generation time the same measurement is an ADMISSION gate — there is nothing to
 *   select from, so it is not a selector. Both roles are legitimate; conflating them is
 *   what went wrong four times. Every verdict this module emits carries `role`, and
 *   `evaluate()` refuses to run in `audit` role without saying so in the output.
 *
 * ── WHAT REFUSES AND WHAT ADVISES ───────────────────────────────────────────────────
 * A REFUSING gate can keep a clip out. An ADVISORY gate is recorded and never keeps a clip
 * out — it exists so the number is on the record for the course voice report. A gate is
 * advisory when its calibration does not reach this clip: the syllable-rate tier is
 * advisory for any language without a fitted syllable counter (English and German are the
 * only two fitted) and for any voice with no measured rate, and it says `calibrated: false`
 * when it is. The absolute floor of 9 syllables per second refuses regardless, because no
 * voice speaks that fast and it needs no calibration to say so.
 */

const path = require('path')

const speechSpanTier = require('./tiers/speech-span.cjs')
const loudnessTier = require('./tiers/loudness.cjs')
const edgeTier = require('./tiers/tier2-edge-shape.cjs')
const durationTier = require('./tiers/tier1-duration.cjs')
const veracity = require('../audio-veracity.cjs')
const { decodeToPcm } = require('../audio-envelope.cjs')
const clipIdentity = require('../shared/clip-identity.cjs')
const languageCodes = require('../language-code-service.cjs')

const VERSION = '2026-08-06'

/**
 * Languages with a fitted syllable counter. Anything else: advisory, `calibrated: false`.
 * Held in the estate's canonical spelling (ISO 639-3) and compared after canonicalisation,
 * so `de`, `de-DE` and `deu` are one answer rather than three.
 */
const FITTED_SYLLABLE_LANGUAGES = new Set(['eng', 'deu'])

/** Canonical ISO 639-3, or the raw value lower-cased when it cannot be canonicalised. */
function toIso3 (language) {
  return clipIdentity.tryCanonicalLanguage(language) || String(language || '').toLowerCase()
}

/** ISO 639-1, which is what whisper answers in. */
function toIso1 (language) {
  const iso3 = toIso3(language)
  try { return languageCodes.databaseToManifest(iso3) || iso3 } catch { return iso3 }
}

/**
 * No human voice sustains this. It needs no calibration to be certain, so it refuses
 * even for a voice and language the rate tier has never seen.
 */
const ABSOLUTE_SYLLABLES_PER_SECOND_FLOOR = 9

/** The ordered stack. `refusing: false` means recorded-but-never-blocking. */
const GATES = [
  { id: 'speech-span', refusing: true, what: 'where the speech actually is' },
  { id: 'loudness', refusing: true, what: 'integrated LUFS in band, true peak under the ceiling' },
  { id: 'tail-shape', refusing: true, what: 'did the voice stop, or was it cut' },
  { id: 'syllable-rate', refusing: true, what: 'could this voice say those syllables in that time' },
  { id: 'phonology', refusing: true, what: 'is it the right language' },
  { id: 'words', refusing: true, what: 'are the right words in there' },
]

/**
 * A gate result, normalised. Every field is stated rather than implied.
 *
 * @param {string} id
 * @param {object} r  {pass, reason, applicable, available, calibrated, role, detail}
 */
function gateResult (id, r) {
  const spec = GATES.find((g) => g.id === id) || { refusing: true }
  return {
    id,
    pass: r.pass === undefined ? null : r.pass,
    // applicable:false is "this gate has nothing to say about this clip" — English text
    // and a phonology gate, a one-syllable clip and a rate model. It never refuses.
    applicable: r.applicable !== false,
    // available:false is "the gate exists but could not run here" — no whisper binary, no
    // ffmpeg. It is NOT a pass, and when the gate is applicable it refuses.
    available: r.available !== false,
    // calibrated:false is "it ran, but its numbers are not fitted for this clip" —
    // recorded, advisory, never blocking.
    calibrated: r.calibrated === undefined ? null : r.calibrated,
    refusing: r.refusing === undefined ? spec.refusing : r.refusing,
    reason: r.reason || '',
    detail: r.detail || null,
  }
}

/**
 * THE DISPOSITION. Pure, and this is the function the tests drive, because this is where
 * the behaviour of the whole document lives.
 *
 * @param {object[]} results  gateResult objects, in stack order
 * @param {object} meta       {role:'admission'|'audit'}
 * @returns {{admit:boolean, outcome:'admitted'|'quarantined', reason:string,
 *            refusedBy:string[], unmeasured:string[], skipped:string[], advisory:string[]}}
 */
function disposition (results, meta = {}) {
  const role = meta.role || 'admission'
  const refusedBy = []
  const unmeasured = []
  const skipped = []
  const advisory = []

  for (const r of results) {
    if (!r.applicable) { skipped.push(r.id); continue }
    if (!r.refusing) {
      if (r.pass === false) advisory.push(r.id)
      continue
    }
    if (r.pass === false) { refusedBy.push(r.id); continue }
    if (r.pass === null) {
      // Cannot measure. Under the store's promise this refuses — see rule 1 above.
      unmeasured.push(r.id)
      refusedBy.push(r.id)
    }
  }

  const admit = refusedBy.length === 0
  const reason = admit
    ? `passed every applicable refusing gate${advisory.length ? `; advisory flags: ${advisory.join(', ')}` : ''}`
    : `refused by ${refusedBy.join(', ')}` +
      (unmeasured.length ? ` (${unmeasured.join(', ')} could not be measured — an unmeasured clip is not a passed clip)` : '')

  return {
    admit,
    // In the `audit` role nothing is being admitted to anything: the caller is reading a
    // clip that already exists. The verdict still says admit/refuse so the two roles are
    // comparable, and `role` says which question was being asked.
    outcome: admit ? 'admitted' : 'quarantined',
    role,
    reason,
    refusedBy,
    unmeasured,
    skipped,
    advisory,
  }
}

// ---------------------------------------------------------------------------
// The gates
// ---------------------------------------------------------------------------

function runSpeechSpan (ctx) {
  if (!ctx.samples) {
    return gateResult('speech-span', { pass: null, available: false, reason: `not decoded — ${ctx.decodeError || 'no samples'}` })
  }
  const t = ctx.thresholds.speechSpan || {}
  const span = speechSpanTier.measure(ctx.samples, ctx.sampleRate, t)
  const v = speechSpanTier.verdict(span, t)
  ctx.span = v.span
  return gateResult('speech-span', { pass: v.pass, reason: v.reason, detail: { ...span, engine: span.engine } })
}

async function runLoudness (ctx) {
  // The declared band first, then the caller's overrides on top: a lab that hands in a
  // target LUFS is asking the gate to judge against THAT band, and it must.
  const v = await loudnessTier.check(ctx.audio, { ...(ctx.band || {}), ...(ctx.thresholds.loudness || {}) })
  return gateResult('loudness', {
    pass: v.pass,
    available: v.pass !== null,
    reason: v.reason,
    detail: { lufs: v.lufs, truePeakDbtp: v.truePeakDbtp, lra: v.lra, band: v.band },
  })
}

function runTailShape (ctx) {
  if (!ctx.samples) {
    return gateResult('tail-shape', { pass: null, available: false, reason: `not decoded — ${ctx.decodeError || 'no samples'}` })
  }
  const r = edgeTier.check(ctx.int16, ctx.thresholds.tailShape || {})
  // The tier's own doctrine calls a flag a TRIAGE verdict, never a delete verdict — and it
  // is right, because at repair time a flag would select a clip for replacement at 80%
  // precision. At ADMISSION the arithmetic is different and stated: a false flag costs one
  // re-render of a clip that did not need it, and a miss costs a learner hearing an
  // amputated word forever. Those are not symmetric, so here the flag refuses.
  return gateResult('tail-shape', {
    pass: r.flagged === null ? null : !r.flagged,
    reason: r.reason,
    detail: { ...r, detector: edgeTier.DETECTOR.name, detectorVersion: edgeTier.DETECTOR.version, precision: edgeTier.DETECTOR.precision },
  })
}

function runSyllableRate (ctx) {
  const speechMs = ctx.span?.speechMs
  if (!speechMs) {
    return gateResult('syllable-rate', { pass: null, available: false, reason: 'no speech span to measure against' })
  }
  const { sylls } = durationTier.countSyllables(ctx.text, ctx.language)
  const perSecond = sylls / (speechMs / 1000)

  const t = ctx.thresholds.syllableRate || {}
  const floor = t.absoluteFloorPerSecond == null ? ABSOLUTE_SYLLABLES_PER_SECOND_FLOOR : Number(t.absoluteFloorPerSecond)

  // The floor first: it needs no calibration and it refuses on its own.
  if (perSecond > floor) {
    return gateResult('syllable-rate', {
      pass: false,
      calibrated: false,
      reason: `${sylls} syllables in ${speechMs} ms is ${perSecond.toFixed(1)} syllables/second — above the absolute floor of ${floor}, which no voice sustains`,
      detail: { sylls, speechMs, perSecond: +perSecond.toFixed(2), rule: 'absolute-floor' },
    })
  }

  const scored = durationTier.score(
    { speechMs, script: ctx.text, language: ctx.language, voice: ctx.voiceId },
    // rateOpts stays the outer word — it carries the rate corpus — and the threshold
    // override sits on top of it, so a lab can move z without replacing the corpus.
    { ...(ctx.rateOpts || {}), ...(t.z == null ? {} : { z: Number(t.z) }) }
  )
  const fitted = FITTED_SYLLABLE_LANGUAGES.has(toIso3(ctx.language))
  const calibrated = Boolean(scored.scored) && fitted

  if (!calibrated) {
    // Advisory: recorded for the course voice report, never blocking. Either the voice has
    // no measured rate, or the clip is too short to model, or the language has no fitted
    // syllable counter — and in the last case the count itself is the uncertain part.
    return gateResult('syllable-rate', {
      pass: scored.flagged === null ? null : !scored.flagged,
      refusing: false,
      calibrated: false,
      reason: (scored.reason || 'not scored') + (fitted ? '' : ` — no fitted syllable counter for "${ctx.language}", so this tier is advisory here`),
      detail: { ...scored, perSecond: +perSecond.toFixed(2), fittedLanguage: fitted },
    })
  }
  return gateResult('syllable-rate', {
    pass: !scored.flagged,
    calibrated: true,
    reason: scored.reason,
    detail: { ...scored, perSecond: +perSecond.toFixed(2), fittedLanguage: true },
  })
}

/**
 * Phonology. The gate itself lives in `services/tts-service.cjs:554-631` and is the
 * defence against xAI's multilingual voices rendering non-English text with English
 * phonology. Here it is injected — `opts.detectSpokenLanguage(buffer) -> iso1|null` —
 * so this module stays testable and so there is exactly one implementation of the
 * whisper call in the tree.
 */
/**
 * The one implementation of the whisper language detection lives in tts-service. Required
 * lazily and defensively: a lab or a test that never renders should not have to satisfy
 * a TTS module's environment just to run the cheap tiers.
 */
function defaultLanguageDetector () {
  try {
    // eslint-disable-next-line global-require
    const tts = require('../tts-service.cjs')
    return typeof tts.detectSpokenLanguage === 'function' ? tts.detectSpokenLanguage : null
  } catch { return null }
}

async function runPhonology (ctx) {
  // Whisper answers in ISO 639-1; the estate's canonical language is ISO 639-3
  // (services/shared/clip-identity.cjs, landed 2026-08-06). Convert through the repo's
  // own tables rather than carrying a third private map — the whole point of that work
  // was that there is one canonicaliser.
  const base = toIso1(ctx.language)

  if (ctx.provider !== 'xai' || !base || base === 'auto' || base === 'en') {
    return gateResult('phonology', {
      applicable: false,
      reason: ctx.provider !== 'xai'
        ? `not applicable — phonology drift is an xAI multilingual-voice failure and this render is ${ctx.provider || 'not xAI'}`
        : 'not applicable — the steered language is English, so there is no cross-language risk to detect',
    })
  }
  const detect = ctx.detectSpokenLanguage || defaultLanguageDetector()
  if (typeof detect !== 'function') {
    return gateResult('phonology', { pass: null, available: false, reason: 'no language detector wired — phonology UNCHECKED, which is not a pass' })
  }
  const detected = await detect(ctx.audio)
  if (!detected) {
    return gateResult('phonology', { pass: null, available: false, reason: 'whisper returned no detection — phonology UNCHECKED, which is not a pass' })
  }
  const extra = [...(ctx.suspectLanguages || []), ...((ctx.thresholds.phonology || {}).suspectLanguages || [])]
  const suspects = new Set(['en', ...extra.map((l) => String(l).toLowerCase().split('-')[0])])
  suspects.delete(base)
  const suspect = suspects.has(String(detected).toLowerCase())
  return gateResult('phonology', {
    pass: !suspect,
    reason: suspect
      ? `steered ${base}, heard ${detected} — the voice spoke a suspect language`
      : `steered ${base}, heard ${detected}`,
    detail: { steered: base, detected, suspects: [...suspects] },
  })
}

/**
 * Words. Delegates to the existing whisper CER gate rather than re-implementing it —
 * `checkAudioVeracity` already returns the three-outcome shape this module needs, and
 * already announces its own availability loudly.
 */
async function runWords (ctx) {
  const av = veracity.availability()
  const enabled = veracity.isGateEnabled()
  if (!enabled) {
    return gateResult('words', { pass: null, available: false, reason: 'AUDIO_VERACITY_GATE is switched off — words UNCHECKED, which is not a pass' })
  }
  if (!av.available) {
    return gateResult('words', { pass: null, available: false, reason: `cannot check words — missing ${av.missing.join(' and ')}` })
  }
  const v = await veracity.checkAudioVeracity(ctx.audio, ctx.text, ctx.language, {
    meta: ctx.meta || {},
    cerThreshold: (ctx.thresholds.words || {}).cerThreshold,
  })
  return gateResult('words', {
    pass: v.checked ? v.pass : null,
    available: Boolean(v.checked),
    reason: v.reason || (v.checked ? `CER ${v.cer}` : 'not checked'),
    detail: { cer: v.cer, threshold: v.threshold, decode: v.decode, checked: v.checked },
  })
}

// ---------------------------------------------------------------------------
// The stack
// ---------------------------------------------------------------------------

/**
 * Run the stack over one clip's MASTERED bytes.
 *
 * @param {object} clip
 * @param {Buffer|string} clip.audio     mastered mp3 bytes, or a path to them
 * @param {string} clip.text             the script this clip is supposed to contain
 * @param {string} clip.language         the steered language
 * @param {string} clip.voiceId          canonical voice id (see services/shared/clip-identity.cjs)
 * @param {string} [clip.provider]       'xai' | 'azure' | ... — decides whether phonology applies
 * @param {object} [clip.band]           the course's declared loudness band
 * @param {object} [opts]
 * @param {'admission'|'audit'} [opts.role='admission']
 * @param {Function} [opts.detectSpokenLanguage]
 * @param {string[]} [opts.only]         run a subset — VOICELAB uses this to audition cheaply
 * @param {object} [opts.thresholds]     per-run threshold overrides, keyed by gate:
 *   {speechSpan:{minSpeechMs,speechAboveFloorDb}, loudness:{targetLufs,toleranceDb,
 *    truePeakCeilingDbtp}, tailShape:{...edgeTier.THRESHOLDS}, syllableRate:
 *    {absoluteFloorPerSecond,z}, phonology:{suspectLanguages[]}, words:{cerThreshold}}.
 *   ABSENT — which is every production caller — every shipped default applies unchanged.
 *   This exists for VOICELAB: a number a lab can move that the gate ignores is worse
 *   than no control, because it produces a run report about a threshold nobody applied.
 * @returns {Promise<object>} the verdict
 */
async function evaluate (clip, opts = {}) {
  const role = opts.role || 'admission'
  const ctx = {
    audio: clip.audio,
    text: clip.text,
    language: clip.language,
    voiceId: clip.voiceId,
    provider: clip.provider,
    band: clip.band,
    meta: clip.meta,
    suspectLanguages: clip.suspectLanguages,
    detectSpokenLanguage: opts.detectSpokenLanguage,
    rateOpts: opts.rateOpts,
    thresholds: opts.thresholds || {},
    samples: null,
    int16: null,
    sampleRate: edgeTier.SAMPLE_RATE,
    decodeError: null,
  }

  // ONE decode, shared across every tier that needs samples. The tiers stay pure and
  // their tests need no audio.
  try {
    const decoded = await decodeToPcm(clip.audio, edgeTier.SAMPLE_RATE)
    ctx.samples = decoded.samples
    ctx.sampleRate = decoded.sampleRate
    ctx.int16 = Int16Array.from(decoded.samples, (v) => Math.max(-32768, Math.min(32767, Math.round(v * 32768))))
  } catch (e) {
    ctx.decodeError = e.message
  }

  const wanted = opts.only ? new Set(opts.only) : null
  const run = (id) => !wanted || wanted.has(id)

  const results = []
  if (run('speech-span')) results.push(runSpeechSpan(ctx))
  if (run('loudness')) results.push(await runLoudness(ctx))
  if (run('tail-shape')) results.push(runTailShape(ctx))
  if (run('syllable-rate')) results.push(runSyllableRate(ctx))
  if (run('phonology')) results.push(await runPhonology(ctx))
  // The expensive one runs last, and only on what the cheap tiers let through — a clip
  // already refused does not need a whisper decode to be refused twice.
  const cheapRefusal = disposition(results, { role }).admit === false
  if (run('words')) {
    results.push(cheapRefusal
      ? gateResult('words', { applicable: false, reason: 'not run — the clip was already refused by a cheaper gate' })
      : await runWords(ctx))
  }

  const d = disposition(results, { role })
  return {
    version: VERSION,
    role,
    ...d,
    clip: { text: clip.text, language: clip.language, voiceId: clip.voiceId, provider: clip.provider || null },
    span: ctx.span || null,
    // What this verdict was judged against, so a lab run can be read months later
    // without guessing which sliders were where. Empty on every production call.
    thresholds: opts.thresholds || null,
    gates: Object.fromEntries(results.map((r) => [r.id, r])),
    order: results.map((r) => r.id),
  }
}

/**
 * The one-line human summary that travels with a quarantined clip, so the JSONL record
 * says what a listener is about to hear and why.
 */
function summarise (verdict) {
  const parts = [`${verdict.outcome} (${verdict.role})`]
  for (const id of verdict.order) {
    const g = verdict.gates[id]
    if (!g.applicable) { parts.push(`${id}: n/a`); continue }
    if (g.pass === null) { parts.push(`${id}: unchecked`); continue }
    parts.push(`${id}: ${g.pass ? 'pass' : 'FAIL'}${g.calibrated === false ? ' (advisory)' : ''}`)
  }
  return parts.join(' · ')
}

module.exports = {
  VERSION,
  GATES,
  FITTED_SYLLABLE_LANGUAGES,
  ABSOLUTE_SYLLABLES_PER_SECOND_FLOOR,
  gateResult,
  disposition,
  evaluate,
  summarise,
  // exported for tests and for VOICELAB, which runs individual tiers on existing clips
  _tiers: { speechSpanTier, loudnessTier, edgeTier, durationTier },
}
