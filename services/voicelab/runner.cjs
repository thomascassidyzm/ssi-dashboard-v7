/**
 * VOICELAB runner — render, master, gate. The only file here that spends money.
 *
 * ── THE ORDER, AND WHY IT IS THIS ORDER ────────────────────────────────────────────
 * Rendering and mastering take about two seconds a clip. The two whisper passes the gate
 * stack runs (phonology, then words) take the best part of a minute on this box. So every
 * clip is rendered, mastered and written to disk FIRST — the record is updated the moment
 * a clip is playable — and the gates run afterwards, updating the record again as each
 * verdict lands. Tom listens with his own ear while the machine is still making up its
 * mind, which is the right order anyway.
 *
 * ── WHAT IS JUDGED ─────────────────────────────────────────────────────────────────
 * The MASTERED bytes, always, through the same `masterAudio` the course pipeline calls.
 * Raw TTS lands 6-12 LUFS under the band, so gating a raw render would fail loudness on
 * every clip and tell you nothing.
 *
 * ── WHAT IT WILL NEVER DO ──────────────────────────────────────────────────────────
 * No write to course_audio, no slot binding, no upload, no delete. Clips live under the
 * lab directory and are served straight back.
 */

const os = require('os')
const path = require('path')

const store = require('./store.cjs')
const lab = require('./lab.cjs')
const params = require('./params.cjs')

/**
 * The heavy modules are required on first use, not at mount. phase8 is an express service
 * as well as a library — PHASE8_NO_LISTEN must be set BEFORE it is required, and requiring
 * it at boot would put a second listener inside the production API for nothing.
 */
let heavy = null
function load () {
  if (heavy) return heavy
  // The gate stack shells out to whisper for phonology and words. Point it at the binary
  // this box has before anything requires it, so an unset env is not read as "unchecked".
  process.env.WHISPER = process.env.WHISPER || path.join(os.homedir(), '.local/bin/whisper-cli')
  process.env.WHISPER_MODEL = process.env.WHISPER_MODEL || path.join(os.homedir(), '.local/share/whisper-models/ggml-small.bin')
  process.env.PHASE8_NO_LISTEN = '1'

  const { generate, detectSpokenLanguage } = require('../tts-service.cjs')
  const { masterAudio } = require('../phases/phase8-audio-v13.cjs')
  const gateStack = require('../audio-intelligence/gate-stack.cjs')
  heavy = { generate, detectSpokenLanguage, masterAudio, gateStack }
  return heavy
}

/**
 * Turn one lab config into the provider config `generate` expects.
 *
 * Only fields the provider actually honours are threaded — see lab.PROVIDERS for the
 * per-provider truth. Silently passing a knob a provider ignores would produce a clip
 * identical to the one before it and a lab report claiming that knob was tested.
 */
function providerConfig (cfg, lang) {
  if (cfg.provider === 'azure') {
    return {
      subscriptionKey: process.env.AZURE_SPEECH_KEY,
      region: process.env.AZURE_SPEECH_REGION || 'westeurope',
      voiceName: cfg.voiceId,
      speed: cfg.speed,
    }
  }
  if (cfg.provider === 'cartesia') {
    return {
      apiKey: process.env.CARTESIA_API_KEY,
      voiceId: cfg.voiceId,
      // `locale`, not `language`: generateCartesia steers on locale and THROWS
      // when it is absent rather than defaulting, so the lab must supply it.
      // lang.locale is the BCP-47 form; lang.steer is the bare two-letter code.
      locale: lang.locale || lang.azureLocale || lang.steer,
      speed: cfg.speed,
      sampleRate: cfg.sampleRate,
      bitRate: cfg.bitRate,
    }
  }
  throw Object.assign(
    new Error(
      `Voice Lab cannot render on provider "${cfg.provider}". Selectable providers are ` +
      `${lab.PROVIDERS.map((p) => p.id).join(' and ')}. xAI is retired from selection ` +
      '(Tom 2026-08-27) and ElevenLabs is explicit-only and expensive, so neither is ' +
      'reachable from the lab.',
    ),
    { status: 400 },
  )
}

/**
 * Dollars per clip. Null for every provider today: no verified rate exists in this
 * repo (see lab.USD_PER_MILLION_CHARS). Kept as a function so the day a rate is
 * confirmed it is one line, and so the lab never reports a guess as a fact.
 */
function costUsdFor (provider, chars) {
  const rate = lab.USD_PER_MILLION_CHARS[provider] ?? null
  return rate == null ? null : +(chars / 1e6 * rate).toFixed(5)
}

/** Render and master one clip. Returns the mastered bytes and the timings. */
async function renderOne ({ text, cfg }) {
  const { generate, masterAudio } = load()
  const lang = params.findLanguage(cfg.language)
  // AZURE STEERS ITSELF: its voice name carries the locale (`cy-GB-NiaNeural`), so
  // providerConfig never reads `lang` for it. Requiring a params.cjs entry anyway
  // meant the lab could not preview an Azure voice in any of the ~50 languages it
  // has no Cartesia steer for — Welsh included — which is a table's limitation
  // reported as a provider's. Cartesia still refuses without one, because its API
  // throws without a locale and there would be nothing honest to send.
  if (!lang && cfg.provider !== 'azure') throw Object.assign(new Error(`unknown language ${cfg.language}`), { status: 400 })

  const t0 = Date.now()
  const { audioBuffer } = await generate(text, cfg.provider, providerConfig(cfg, lang))
  const renderMs = Date.now() - t0

  const tm = Date.now()
  // masterLufs is a RENDER parameter, not a gate threshold: it changes the bytes.
  // Play mode's "quieter ↔ louder" slider moves it, and the loudness gate then
  // judges the result against its own band — which is the point. A slider that
  // moved the band instead would change the verdict and nothing you can hear.
  const { buffer: mastered, durationMs } = await masterAudio(audioBuffer, text, { targetLufs: cfg.masterLufs })
  const masterMs = Date.now() - tm

  return { mastered, durationMs, renderMs, masterMs, lang: lang || null }
}

/**
 * The gate stack, exactly as landed, with this config's thresholds threaded in.
 * `role: 'admission'` is the honest label: the question is "would this clip be allowed
 * into the store".
 */
async function gateOne ({ mastered, text, cfg }) {
  const { gateStack, detectSpokenLanguage } = load()
  const t = cfg.thresholds || {}
  return gateStack.evaluate(
    {
      audio: mastered,
      text,
      language: cfg.language,
      voiceId: cfg.voiceId,
      provider: cfg.provider,
      suspectLanguages: (t.phonology && t.phonology.suspectLanguages) || [],
    },
    {
      role: 'admission',
      detectSpokenLanguage,
      thresholds: t,
    }
  )
}

/** Build the (unrendered) experiment record. Pure enough to test; writes nothing. */
function buildExperiment ({ id, kind, title, sentences, configs, blind, notes, createdBy, rerunOf = null, now = new Date() }) {
  const cfgs = configs.map((c, i) => ({ key: String.fromCharCode(65 + i), ...lab.normaliseConfig(c) }))
  const lines = sentences.map((s, i) => {
    const text = typeof s === 'string' ? s.trim() : String(s.text || '').trim()
    const cfgLang = cfgs[0] ? cfgs[0].language : ''
    return {
      i,
      text,
      language: (typeof s === 'object' && s.language) || cfgLang,
      source: (typeof s === 'object' && s.source) || 'typed',
    }
  })

  const clips = []
  for (const line of lines) {
    for (const cfg of cfgs) {
      clips.push({
        id: store.newId(),
        sentenceIndex: line.i,
        configKey: cfg.key,
        url: null,
        status: 'pending',
        chars: line.text.length,
        costUsd: costUsdFor(cfg.provider, line.text.length),
        durationMs: null,
        renderMs: null,
        masterMs: null,
        gateMs: null,
        verdict: null,
        summary: null,
        error: null,
      })
    }
  }

  const caveats = []
  if (cfgs.some((c) => !lab.PROVIDERS.find((p) => p.id === c.provider)?.supports?.codec && c.codec && c.codec !== 'mp3')) {
    caveats.push('A codec other than mp3 was set on a provider whose container this lab pins to mp3 — that clip rendered as mp3 regardless. See providers[].supports.')
  }
  if (cfgs.some((c) => c.provider === 'azure' && (c.style || c.pitch))) {
    caveats.push('A style or pitch was set on an Azure config; generateAzure emits no mstts:express-as and no prosody pitch, so neither reached the render.')
  }
  if (cfgs.some((c) => c.provider === 'azure')) {
    caveats.push('Azure clips carry no dollar figure — Azure is billed on a separate plan this lab does not meter. Characters still count against the ceiling.')
  }
  // A clip mastered outside the loudness gate's own band WILL be quarantined by
  // that gate. That is not a bug and the run must say so up front, or the verdict
  // reads as a mystery rather than as the direct consequence of a slider.
  for (const c of cfgs) {
    const band = (c.thresholds && c.thresholds.loudness) || {}
    if (!Number.isFinite(band.targetLufs) || !Number.isFinite(band.toleranceDb)) continue
    if (Math.abs(c.masterLufs - band.targetLufs) > band.toleranceDb) {
      caveats.push(`Config ${c.key} masters to ${c.masterLufs} LUFS, outside the loudness gate's band of ${band.targetLufs} ±${band.toleranceDb} dB — the loudness gate will refuse it, by arithmetic rather than by accident.`)
    }
  }

  return {
    id,
    at: now.toISOString(),
    title: String(title || '').slice(0, 120) || `${kind} · ${new Date(now).toISOString().slice(0, 16).replace('T', ' ')}`,
    kind,
    status: 'running',
    createdBy: createdBy || 'unknown',
    blind: Boolean(blind),
    notes: String(notes || '').slice(0, 2000),
    sentences: lines,
    configs: cfgs,
    slots: lab.assignSlots({ id, sentenceCount: lines.length, configKeys: cfgs.map((c) => c.key), blind: Boolean(blind) }),
    clips,
    totals: lab.totals(clips, cfgs),
    caveats,
    rerunOf,
  }
}

/** Patch one clip inside the stored record and recompute the totals from scratch. */
function patchClip (experimentId, clipId, patch) {
  return store.updateExperiment(experimentId, (exp) => {
    exp.clips = exp.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c))
    exp.totals = lab.totals(exp.clips, exp.configs)
    return exp
  })
}

/**
 * Run an experiment to completion, in the background. Never throws at the caller: a
 * failure belongs on the record, where the screen can show it, not in an unhandled
 * rejection nobody sees.
 */
async function execute (experimentId, { logger = console } = {}) {
  const exp = store.readExperiment(experimentId)
  if (!exp) return null
  const cfgByKey = Object.fromEntries(exp.configs.map((c) => [c.key, c]))
  const { gateStack } = load()

  // PASS 1 — render, master, write. Each clip is playable the moment it lands.
  const rendered = []
  for (const clip of exp.clips) {
    const cfg = cfgByKey[clip.configKey]
    const line = exp.sentences[clip.sentenceIndex]
    try {
      const { mastered, durationMs, renderMs, masterMs } = await renderOne({ text: line.text, cfg })
      store.writeClip(clip.id, mastered)
      // The spend is recorded the moment the money is spent, not when the gates finish.
      store.appendLedger({ experiment: exp.id, clip: clip.id, chars: line.text.length, provider: cfg.provider, voiceId: cfg.voiceId, language: cfg.language })
      patchClip(exp.id, clip.id, {
        status: 'gating',
        url: `/api/voicelab/clip/${clip.id}.mp3`,
        durationMs,
        renderMs,
        masterMs,
        summary: 'gating…',
      })
      rendered.push({ clip, cfg, line, mastered })
    } catch (e) {
      logger.error?.(`[voicelab] render failed ${clip.id}: ${e.message}`)
      patchClip(exp.id, clip.id, { status: 'failed', error: String(e.message).slice(0, 400), summary: `render failed — ${String(e.message).slice(0, 160)}` })
    }
  }

  // PASS 2 — the gates. Slow, and deliberately after every clip is audible.
  for (const { clip, cfg, line, mastered } of rendered) {
    const t = Date.now()
    try {
      const verdict = await gateOne({ mastered, text: line.text, cfg })
      patchClip(exp.id, clip.id, { status: 'done', gateMs: Date.now() - t, verdict, summary: gateStack.summarise(verdict) })
      logger.log?.(`[voicelab] ${exp.id}/${clip.configKey} ${cfg.language}/${cfg.provider}/${cfg.voiceId} → ${verdict.outcome}`)
    } catch (e) {
      // A gate stack that crashed is not a pass, and the record must say so rather than
      // leaving the screen spinning.
      logger.error?.(`[voicelab] gates failed ${clip.id}: ${e.message}`)
      patchClip(exp.id, clip.id, { status: 'done', gateMs: Date.now() - t, verdict: null, error: String(e.message).slice(0, 400), summary: `gates could not run — ${String(e.message).slice(0, 160)}` })
    }
  }

  return store.updateExperiment(exp.id, (e) => {
    e.clips = e.clips.map((c) => (c.status === 'pending' ? { ...c, status: 'failed', error: 'never started' } : c))
    e.totals = lab.totals(e.clips, e.configs)
    e.status = e.clips.every((c) => c.error) ? 'failed' : 'done'
    return e
  })
}

module.exports = { buildExperiment, execute, renderOne, gateOne, providerConfig, patchClip }
