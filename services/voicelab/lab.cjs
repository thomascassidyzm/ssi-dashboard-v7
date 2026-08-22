/**
 * VOICELAB — the pure parts. Arithmetic, caps, slot assignment, totals.
 *
 * Everything in this file is a pure function of its arguments: no disk, no network,
 * no clock beyond what is handed in. That is deliberate — the money decisions
 * (what a run will cost, whether the ceiling refuses) and the blinding decision
 * (which config is shown on the left) are exactly the parts that must be testable
 * without a TTS key, and they are the parts that are expensive to get wrong.
 *
 * The DEFAULT thresholds are read off the tier modules themselves rather than
 * restated here. A lab whose "default" drifts from what the gate actually uses is
 * a lab that lies about production, so there is one source for each number and it
 * is the module that enforces it.
 */

const speechSpanTier = require('../audio-intelligence/tiers/speech-span.cjs')
const loudnessTier = require('../audio-intelligence/tiers/loudness.cjs')
const edgeTier = require('../audio-intelligence/tiers/tier2-edge-shape.cjs')
const durationTier = require('../audio-intelligence/tiers/tier1-duration.cjs')
const veracity = require('../audio-veracity.cjs')
const gateStack = require('../audio-intelligence/gate-stack.cjs')

/** xAI's published TTS price. Azure is billed on a different plan and is NOT metered here. */
const XAI_USD_PER_MILLION_CHARS = 15

/**
 * What masterAudio normalises to when nobody asks for anything else — the house
 * level, restated here from phase8-audio-v13.cjs:masterAudio so Play mode's
 * loudness slider can be centred on it. It is deliberately NOT the loudness
 * gate's band centre (-15.5): the band is what the store would admit, this is
 * what the pipeline actually renders, and the 0.5 dB between them is inside the
 * band's own ±1.5 dB tolerance.
 */
const HOUSE_MASTER_LUFS = -16.0

const LIMITS = {
  maxCharsPerSentence: 300,
  maxSentencesPerBatch: 20,
  maxConfigs: 2,
  dailyCharCeiling: Number(process.env.VOICELAB_DAILY_CHARS || 60000), // ≈ $0.90/day at xAI rates
}

/**
 * The thresholds every gate uses when nobody has touched a slider — lifted live from
 * the tiers, so this object is a MIRROR of production rather than a second opinion.
 */
function defaultThresholds () {
  const band = loudnessTier.DEFAULT_BAND
  return {
    speechSpan: {
      minSpeechMs: speechSpanTier.MIN_SPEECH_MS,
      speechAboveFloorDb: speechSpanTier.SPEECH_ABOVE_FLOOR_DB,
    },
    loudness: {
      targetLufs: band.targetLufs,
      toleranceDb: band.toleranceDb,
      truePeakCeilingDbtp: band.truePeakCeilingDbtp,
    },
    tailShape: { ...edgeTier.THRESHOLDS },
    syllableRate: {
      absoluteFloorPerSecond: gateStack.ABSOLUTE_SYLLABLES_PER_SECOND_FLOOR,
      z: durationTier.DEFAULT_Z,
    },
    // Empty is the honest default: the phonology gate always suspects English, and
    // anything added here is an extra language this run treats as a wrong answer.
    phonology: { suspectLanguages: [] },
    words: { cerThreshold: veracity.CER_THRESHOLD },
  }
}

/**
 * Which knobs a provider actually honours — checked against the code, not the docs.
 *
 * xAI's /v1/tts takes voice, language and an output_format of codec/sample_rate/
 * bit_rate. It documents NO speed parameter (services/tts-service.cjs:433 says so in
 * as many words), no style and no pitch. Azure is the mirror image: speed reaches it
 * as SSML `<prosody rate>` (tts-service.cjs generateAzure), but the output format is
 * pinned to Audio16Khz32KBitRateMonoMp3 in that same function, and no
 * `mstts:express-as` is ever emitted — so style, styleDegree and pitch are not wired.
 *
 * A control the UI can move that the provider ignores is worse than a greyed-out one,
 * so these flags exist to let the UI grey them out honestly.
 */
const PROVIDERS = [
  {
    id: 'xai',
    name: 'xAI',
    supports: { speed: false, style: false, styleDegree: false, pitch: false, sampleRate: true, bitRate: true, codec: true },
    note: 'xAI documents no speed, style or pitch parameter on /v1/tts (services/tts-service.cjs:433). Codec, sample rate and bit rate are real and are threaded through output_format.',
  },
  {
    id: 'azure',
    name: 'Azure',
    supports: { speed: true, style: false, styleDegree: false, pitch: false, sampleRate: false, bitRate: false, codec: false },
    note: 'Speed reaches Azure as SSML <prosody rate>. The output format is pinned to Audio16Khz32KBitRateMonoMp3 in generateAzure, so sample rate, bit rate and codec are not yours to set; no mstts:express-as is emitted, so style and pitch are not wired.',
  },
]

/** A config with every field present, whatever the caller left out. */
function normaliseConfig (raw = {}, defaults = {}) {
  const t = raw.thresholds || {}
  const dt = defaults.thresholds || defaultThresholds()
  return {
    provider: String(raw.provider || defaults.provider || 'xai'),
    voiceId: String(raw.voiceId || defaults.voiceId || ''),
    voiceName: String(raw.voiceName || raw.voiceId || defaults.voiceName || ''),
    language: String(raw.language || defaults.language || ''),
    sampleRate: num(raw.sampleRate, defaults.sampleRate ?? 24000),
    bitRate: num(raw.bitRate, defaults.bitRate ?? 128000),
    codec: String(raw.codec || defaults.codec || 'mp3'),
    speed: num(raw.speed, defaults.speed ?? 1.0),
    // What the clip is MASTERED to, which is not the same number as the loudness
    // gate's band centre. The band says what would be admitted; this says what you
    // hear. Play mode's "quieter ↔ louder" slider moves this one — a slider that
    // only moved the band would change the verdict and no audio at all.
    masterLufs: num(raw.masterLufs, defaults.masterLufs ?? HOUSE_MASTER_LUFS),
    style: raw.style ?? defaults.style ?? null,
    styleDegree: raw.styleDegree ?? defaults.styleDegree ?? null,
    pitch: raw.pitch ?? defaults.pitch ?? null,
    thresholds: {
      speechSpan: { ...dt.speechSpan, ...(t.speechSpan || {}) },
      loudness: { ...dt.loudness, ...(t.loudness || {}) },
      tailShape: { ...dt.tailShape, ...(t.tailShape || {}) },
      syllableRate: { ...dt.syllableRate, ...(t.syllableRate || {}) },
      phonology: { ...dt.phonology, ...(t.phonology || {}) },
      words: { ...dt.words, ...(t.words || {}) },
    },
  }
}

function num (v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/** The default parameter set the UI opens on. */
function defaultConfig (extra = {}) {
  return normaliseConfig({
    provider: 'xai',
    // Tom's clone, and German: the one language pair where the syllable-rate tier is
    // both fitted and calibrated, so every gate has something to say on the first run.
    voiceId: 'gfzdpspr5fdp',
    voiceName: "Tom's clone",
    language: 'deu',
    ...extra,
  })
}

/**
 * What a run will cost, before a penny is spent.
 *
 * Characters are the billing unit and the ceiling's unit, so they are counted for
 * every provider. Dollars are only claimed for xAI, because that is the only price
 * this estate has wired; an Azure clip reports `usd: 0` and says why in `caveats`
 * rather than inventing a number.
 *
 * @param {object} a
 * @param {string[]} a.sentences
 * @param {object[]} a.configs
 * @param {number} a.charsSpentToday
 * @param {object} [a.limits]
 */
function estimate ({ sentences = [], configs = [], charsSpentToday = 0, limits = LIMITS }) {
  const texts = sentences.map((s) => String(s || '').trim()).filter(Boolean)
  const perConfig = configs.map((cfg, i) => {
    const chars = texts.reduce((n, t) => n + t.length, 0)
    const metered = cfg.provider === 'xai'
    return {
      key: cfg.key || String.fromCharCode(65 + i),
      provider: cfg.provider,
      voiceId: cfg.voiceId,
      voiceName: cfg.voiceName || cfg.voiceId,
      clips: texts.length,
      chars,
      usd: metered ? round5(chars / 1e6 * XAI_USD_PER_MILLION_CHARS) : 0,
      metered,
    }
  })

  const chars = perConfig.reduce((n, p) => n + p.chars, 0)
  const usd = round5(perConfig.reduce((n, p) => n + p.usd, 0))
  const ceilingRemaining = Math.max(0, limits.dailyCharCeiling - charsSpentToday)
  const caveats = []
  if (perConfig.some((p) => !p.metered)) {
    caveats.push('Azure clips count against the character ceiling but carry no dollar figure — Azure is billed on a separate plan this lab does not meter.')
  }

  return {
    clips: perConfig.reduce((n, p) => n + p.clips, 0),
    chars,
    usd,
    charsSpentToday,
    ceiling: limits.dailyCharCeiling,
    ceilingRemaining,
    wouldExceed: chars > ceilingRemaining,
    perConfig,
    caveats,
  }
}

function round5 (n) { return +Number(n).toFixed(5) }

/**
 * The caps, as one function, so the estimate endpoint and the run endpoint can never
 * disagree about what is allowed. Returns null when the request is fine, or an
 * {status, error} that names the numbers — a refusal that does not say by how much is
 * a refusal nobody can act on.
 */
function refuse ({ kind, sentences, configs, charsSpentToday, limits = LIMITS }) {
  const texts = (sentences || []).map((s) => String(s || '').trim()).filter(Boolean)
  if (!texts.length) return { status: 400, error: 'No sentences — a run needs at least one.' }
  if (!configs || !configs.length) return { status: 400, error: 'No configs — a run needs at least one parameter set.' }

  const long = texts.find((t) => t.length > limits.maxCharsPerSentence)
  if (long) {
    return { status: 400, error: `A sentence is ${long.length} characters; the cap is ${limits.maxCharsPerSentence}. This is a lab, not a batch renderer.` }
  }
  if (texts.length > limits.maxSentencesPerBatch) {
    return { status: 400, error: `${texts.length} sentences; the batch cap is ${limits.maxSentencesPerBatch}.` }
  }
  if (kind === 'ab' && configs.length !== 2) {
    return { status: 400, error: `A blind A/B compares exactly 2 configs; got ${configs.length}.` }
  }
  if (kind !== 'ab' && configs.length !== 1) {
    return { status: 400, error: `A ${kind} run takes exactly 1 config; got ${configs.length}.` }
  }
  if (kind === 'single' && texts.length !== 1) {
    return { status: 400, error: `A single-clip run takes exactly 1 sentence; got ${texts.length}.` }
  }

  const est = estimate({ sentences: texts, configs, charsSpentToday, limits })
  if (est.wouldExceed) {
    return {
      status: 429,
      error: `Daily character ceiling: ${charsSpentToday} of ${limits.dailyCharCeiling} spent today, ${est.ceilingRemaining} left, and this run needs ${est.chars}. Raise VOICELAB_DAILY_CHARS if that is deliberate — it exists so a stuck finger cannot spend money.`,
    }
  }
  return null
}

/**
 * WHICH CONFIG SITS ON THE LEFT, per sentence.
 *
 * A blind A/B that always puts A first is not blind — after two clips the listener has
 * learnt the position, and every verdict after that is contaminated. So the side is
 * assigned per sentence from a hash of the experiment id, which is unguessable from
 * the outside and perfectly reproducible from the inside (the same id always yields the
 * same layout, so a reload does not reshuffle what someone is mid-way through judging).
 *
 * A non-blind run is laid out A-left, always: there is nothing to hide and a stable
 * layout is easier to read.
 */
function assignSlots ({ id, sentenceCount, configKeys, blind }) {
  const keys = configKeys.length ? configKeys : ['A']
  const out = []
  for (let i = 0; i < sentenceCount; i++) {
    if (!blind || keys.length < 2) { out.push({ sentenceIndex: i, left: keys[0] }); continue }
    out.push({ sentenceIndex: i, left: keys[hashIndex(`${id}:${i}`) % keys.length] })
  }
  return out
}

/**
 * FNV-1a with an avalanche on the way out. Small, dependency-free, stable.
 *
 * The final mix is NOT decoration. FNV's prime is odd, so the low bit of its output is
 * the parity of the input bytes — hash("id:0"), hash("id:1"), hash("id:2") then alternate
 * in bit 0, and a `% 2` off that produces a perfect A,B,A,B march. That is exactly the
 * positional tell a blind A/B exists to remove, and the slot test caught it.
 */
function hashIndex (s) {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b) >>> 0
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35) >>> 0
  h ^= h >>> 16
  return h >>> 0
}

/**
 * The scoreboard for an experiment, recomputed from its clips every time rather than
 * incremented — an incremented total drifts the moment one clip is retried, and this
 * number is what somebody reads to decide whether a voice is usable.
 */
function totals (clips = [], configs = []) {
  const byConfig = {}
  for (const c of configs) {
    byConfig[c.key] = { clips: 0, chars: 0, usd: 0, admitted: 0, quarantined: 0, errored: 0, pending: 0, gateFails: {} }
  }
  let chars = 0
  let usd = 0
  let admitted = 0
  let quarantined = 0
  let errored = 0

  for (const clip of clips) {
    const b = byConfig[clip.configKey] || (byConfig[clip.configKey] = { clips: 0, chars: 0, usd: 0, admitted: 0, quarantined: 0, errored: 0, pending: 0, gateFails: {} })
    b.clips++
    b.chars += clip.chars || 0
    b.usd = round5(b.usd + (clip.costUsd || 0))
    chars += clip.chars || 0
    usd = round5(usd + (clip.costUsd || 0))

    if (clip.error) { b.errored++; errored++; continue }
    if (!clip.verdict) { b.pending++; continue }
    if (clip.verdict.outcome === 'admitted') { b.admitted++; admitted++ } else { b.quarantined++; quarantined++ }
    for (const gate of clip.verdict.refusedBy || []) {
      b.gateFails[gate] = (b.gateFails[gate] || 0) + 1
    }
  }

  return { chars, usd, clips: clips.length, admitted, quarantined, errored, byConfig }
}

/**
 * The export. A parameter set a human can read, keep, and apply deliberately.
 *
 * It is JSON handed back over HTTP and NOTHING ELSE. Pod Lab's header states the reason
 * in full (src/views/admin/PodLab.vue): an `algorithm_config` write is immediately
 * global to every learner on a ~5-minute cache TTL, with no draft/live split — so a lab
 * that could write one would be a lab that can break every course from a slider. The
 * approval that matters is a human copying this file into place.
 */
function exportConfig (experiment, configKey) {
  const cfg = (experiment.configs || []).find((c) => c.key === configKey) || (experiment.configs || [])[0]
  if (!cfg) throw Object.assign(new Error('that experiment has no config to export'), { status: 400 })
  const t = totals(experiment.clips || [], experiment.configs || [])
  const b = t.byConfig[cfg.key] || {}
  return {
    config: {
      exportedFrom: { experiment: experiment.id, at: experiment.at, title: experiment.title, configKey: cfg.key },
      evidence: {
        clips: b.clips || 0,
        admitted: b.admitted || 0,
        quarantined: b.quarantined || 0,
        gateFails: b.gateFails || {},
        sentences: (experiment.sentences || []).map((s) => s.text),
      },
      provider: cfg.provider,
      voiceId: cfg.voiceId,
      voiceName: cfg.voiceName,
      language: cfg.language,
      render: { sampleRate: cfg.sampleRate, bitRate: cfg.bitRate, codec: cfg.codec, speed: cfg.speed, masterLufs: cfg.masterLufs, style: cfg.style, styleDegree: cfg.styleDegree, pitch: cfg.pitch },
      thresholds: cfg.thresholds,
    },
    filename: `voicelab-${experiment.id}-${cfg.key}.json`,
    note: 'This is an EXPORT, not a deployment. Nothing here has been written anywhere: a human applies it deliberately. Pod Lab keeps the same rule, and for the same reason — an algorithm_config write reaches every learner within about five minutes and has no draft/live split.',
  }
}

/** The summary shape the list endpoint returns — enough to choose from, not the whole record. */
function summarise (experiment) {
  return {
    id: experiment.id,
    at: experiment.at,
    title: experiment.title,
    kind: experiment.kind,
    status: experiment.status,
    createdBy: experiment.createdBy,
    blind: experiment.blind,
    sentences: (experiment.sentences || []).length,
    configs: (experiment.configs || []).map((c) => ({ key: c.key, provider: c.provider, voiceId: c.voiceId, voiceName: c.voiceName, language: c.language })),
    totals: experiment.totals || null,
    rerunOf: experiment.rerunOf || null,
  }
}

module.exports = {
  XAI_USD_PER_MILLION_CHARS,
  HOUSE_MASTER_LUFS,
  LIMITS,
  PROVIDERS,
  defaultThresholds,
  defaultConfig,
  normaliseConfig,
  estimate,
  refuse,
  assignSlots,
  hashIndex,
  totals,
  exportConfig,
  summarise,
}
