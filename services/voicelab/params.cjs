/**
 * VOICELAB parameters — what can be varied, in which languages, with which voices.
 *
 * The language table, the voice menu (Tom's clone first, then xAI's catalogue, then the
 * voices this estate has actually used) and the estate census are LIFTED from
 * services/voicelab-playground/server.cjs, which proved them on real renders. They are
 * here rather than imported because the playground is a standalone http server that
 * listens on its own port; importing it would start it.
 *
 * The census is evidence, not invention: "In the estate today" comes from counting
 * course_audio rows, so a voice appears in that group only because clips exist in it.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')

const xaiCatalogue = require('../../tools/pod-voices-xai.json')
const lab = require('./lab.cjs')
const gateStack = require('../audio-intelligence/gate-stack.cjs')

/**
 * Tom's clone. VOICELAB 01 (docs/audio/voicelab-01-tom-clone-multilingual-2026-08-06.md)
 * probed it in German, French and Spanish: clean on plain target-language rendering.
 */
const TOM_CLONE = { id: 'gfzdpspr5fdp', name: "Tom's clone", provider: 'xai', gender: 'm', clone: true }

/** Keyed by the estate's canonical ISO 639-3; `steer` is what the providers are handed. */
const LANGUAGES = [
  { code: 'deu', name: 'German', steer: 'de', catalogue: 'de', azureLocale: 'de-DE' },
  { code: 'fra', name: 'French', steer: 'fr', catalogue: 'fr', azureLocale: 'fr-FR' },
  { code: 'spa', name: 'Spanish', steer: 'es', catalogue: 'es', azureLocale: 'es-ES' },
  { code: 'ita', name: 'Italian', steer: 'it', catalogue: 'it', azureLocale: 'it-IT' },
  { code: 'nld', name: 'Dutch', steer: 'nl', catalogue: 'nl', azureLocale: 'nl-NL' },
  { code: 'por', name: 'Portuguese', steer: 'pt', catalogue: 'pt', azureLocale: 'pt-PT' },
  { code: 'pol', name: 'Polish', steer: 'pl', catalogue: 'pl', azureLocale: 'pl-PL' },
  { code: 'tur', name: 'Turkish', steer: 'tr', catalogue: 'tr', azureLocale: 'tr-TR' },
  { code: 'rus', name: 'Russian', steer: 'ru', catalogue: 'ru', azureLocale: 'ru-RU' },
  { code: 'jpn', name: 'Japanese', steer: 'ja', catalogue: 'ja', azureLocale: 'ja-JP' },
  { code: 'kor', name: 'Korean', steer: 'ko', catalogue: 'ko', azureLocale: 'ko-KR' },
  { code: 'cmn', name: 'Mandarin', steer: 'zh', catalogue: 'zh-CN', azureLocale: 'zh-CN', aliases: ['zho', 'zh', 'cmn'] },
  { code: 'ara', name: 'Arabic', steer: 'ar', catalogue: 'ar', azureLocale: 'ar-EG' },
  { code: 'hin', name: 'Hindi', steer: 'hi', catalogue: 'hi', azureLocale: 'hi-IN' },
  { code: 'vie', name: 'Vietnamese', steer: 'vi', catalogue: 'vi', azureLocale: 'vi-VN' },
  { code: 'eng', name: 'English', steer: 'en', catalogue: 'en', azureLocale: 'en-GB' },
]

/**
 * Tolerant lookup. `courses.target_lang` says `zho` where this table says `cmn`, and a
 * caller may hand over a steer code — one resolver so a mismatch is never silent.
 */
function findLanguage (code) {
  const c = String(code || '').toLowerCase()
  if (!c) return null
  return LANGUAGES.find((l) => l.code === c)
    || LANGUAGES.find((l) => (l.aliases || []).includes(c))
    || LANGUAGES.find((l) => l.steer === c)
    || null
}

/** The voice menu for one language. */
function voicesFor (lang, production = {}) {
  const seen = new Set()
  const out = []
  const push = (v) => {
    const key = `${v.provider}:${v.id}`
    if (seen.has(key)) return
    seen.add(key)
    out.push(v)
  }

  push({ ...TOM_CLONE, group: 'Clone' })
  for (const v of xaiCatalogue[lang.catalogue] || []) {
    push({ id: v.voice_id, name: v.name, provider: 'xai', gender: v.gender, group: `xAI · ${lang.name}` })
  }
  for (const v of xaiCatalogue.multilingual || []) {
    push({ id: v.voice_id, name: v.name, provider: 'xai', gender: v.gender, group: 'xAI · multilingual' })
  }
  for (const v of production[lang.code] || []) {
    push({ ...v, group: 'In the estate today' })
  }
  return out
}

// ── The estate census, read once and cached ─────────────────────────────────────────

let PRODUCTION_VOICES = {}
let productionNote = 'not read'
let censusPromise = null

/** Turn a stored voice_id into something renderable, or null if it is not renderable. */
function describeStoredVoice (raw, count) {
  const id = String(raw || '')
  if (/^(legacy_import|human|human_recording)$/.test(id)) return null
  // No ElevenLabs or Narakeet key is wired into this lab; offering a voice that would
  // fail at render is worse than a shorter list.
  if (id.startsWith('elevenlabs_') || id.startsWith('narakeet_')) return null

  const azure = id.startsWith('azure_') ? id.slice(6) : (/Neural$/.test(id) ? id : null)
  if (azure) return { id: azure, name: azure.replace(/Neural$/, '').split('-').slice(2).join('-') || azure, provider: 'azure', clips: count }

  const xai = id.startsWith('xai_') ? id.slice(4) : id
  if (xai === TOM_CLONE.id) return null // already at the top of the list
  return { id: xai, name: xai, provider: 'xai', clips: count }
}

/**
 * Count course_audio by language and voice. Read-only, and it goes through psql rather
 * than the dashboard's Supabase client because it is an aggregate — PostgREST has no
 * GROUP BY, and inventing an RPC for a nicety is more machinery than the nicety is worth.
 *
 * Every failure path sets `productionNote` and returns: an estate list is a convenience,
 * and it must never be what stands between the lab and a working page.
 */
async function loadEstateVoices () {
  const envPath = path.join(__dirname, '../../.env.psql')
  if (!fs.existsSync(envPath)) { productionNote = 'no .env.psql on this box — estate voice list omitted'; return }
  const url = (fs.readFileSync(envPath, 'utf8').match(/DATABASE_URL\s*=\s*(.+)/) || [])[1]
  if (!url) { productionNote = '.env.psql has no DATABASE_URL — estate voice list omitted'; return }

  const psql = path.join(os.homedir(), '.local/pg17/bin/psql')
  if (!fs.existsSync(psql)) { productionNote = 'no psql on this box — estate voice list omitted'; return }

  // The connection string carries the password and an argv is world-readable in `ps`;
  // hand psql the parts through libpq's environment instead.
  let env
  try {
    const u = new URL(url.trim().replace(/^["']|["']$/g, ''))
    env = {
      ...process.env,
      PGHOST: u.hostname,
      PGPORT: u.port || '5432',
      PGUSER: decodeURIComponent(u.username),
      PGPASSWORD: decodeURIComponent(u.password),
      PGDATABASE: u.pathname.replace(/^\//, '') || 'postgres',
    }
  } catch { productionNote = '.env.psql DATABASE_URL is not parseable — estate voice list omitted'; return }

  const execFile = require('util').promisify(require('child_process').execFile)
  const codes = LANGUAGES.map((l) => `'${l.code}'`).join(',')
  const sql = `select language, voice_id, count(*) from course_audio where language in (${codes}) group by 1,2 having count(*) > 200 order by 1, 3 desc`
  let rows
  try {
    rows = (await execFile(psql, ['-At', '-F', '|', '-c', sql], { encoding: 'utf8', timeout: 30000, env })).stdout
  } catch (e) {
    productionNote = `course_audio query failed (${String(e.message).split('\n')[0]}) — estate voice list omitted`
    return
  }

  const map = {}
  for (const line of rows.trim().split('\n').filter(Boolean)) {
    const [language, rawVoice, count] = line.split('|')
    const v = describeStoredVoice(rawVoice, Number(count))
    if (!v) continue
    ;(map[language] = map[language] || []).push(v)
  }
  PRODUCTION_VOICES = map
  productionNote = `read from course_audio: ${Object.values(map).reduce((n, a) => n + a.length, 0)} voices across ${Object.keys(map).length} languages`
}

/** Cached, and never allowed to throw into a request. */
function estateVoices () {
  if (!censusPromise) {
    productionNote = 'reading course_audio…'
    censusPromise = loadEstateVoices().catch((e) => { productionNote = `estate voice list omitted — ${e.message}` })
  }
  return censusPromise
}

/**
 * Which thresholds the gate stack actually honours from `opts.thresholds`, and what each
 * one means. `readOnly: true` would mean "the UI may show this number but moving it
 * changes nothing" — a dead control, which is worse than no control. Every threshold
 * below is live: gate-stack threads each one into the tier that enforces it, and the
 * defaults are read off those same tiers.
 */
const THRESHOLD_SPEC = [
  { gate: 'speech-span', key: 'speechSpan.minSpeechMs', unit: 'ms', readOnly: false, what: 'below this much speech the clip is a silent stub, and that refuses' },
  { gate: 'speech-span', key: 'speechSpan.speechAboveFloorDb', unit: 'dB', readOnly: false, what: "how far above the clip's own noise floor a frame must sit to count as speech" },
  { gate: 'loudness', key: 'loudness.targetLufs', unit: 'LUFS', readOnly: false, what: 'the centre of the band the mastered clip must land in' },
  { gate: 'loudness', key: 'loudness.toleranceDb', unit: 'dB', readOnly: false, what: 'half the width of that band' },
  { gate: 'loudness', key: 'loudness.truePeakCeilingDbtp', unit: 'dBTP', readOnly: false, what: 'true peak must stay under this' },
  { gate: 'tail-shape', key: 'tailShape.fallRateDbPerMs', unit: 'dB/ms', readOnly: false, what: 'steeper than this is a cut, not a decay' },
  { gate: 'tail-shape', key: 'tailShape.zeroPadPct', unit: '%', readOnly: false, what: 'how much of the trailing silence is exact digital zero' },
  { gate: 'tail-shape', key: 'tailShape.topDb', unit: 'dB', readOnly: false, what: 'the fall is measured from peak minus this' },
  { gate: 'tail-shape', key: 'tailShape.floorDb', unit: 'dB', readOnly: false, what: '…down to peak minus this, which is "speech end"' },
  { gate: 'tail-shape', key: 'tailShape.frameMs', unit: 'ms', readOnly: false, what: 'the envelope grid; 1 ms, because a 21 ms fall is two frames at 5 ms and two frames carry no slope' },
  { gate: 'tail-shape', key: 'tailShape.silenceFloorDb', unit: 'dBFS', readOnly: false, what: 'a clip peaking below this has no speech to judge' },
  { gate: 'syllable-rate', key: 'syllableRate.absoluteFloorPerSecond', unit: 'syll/s', readOnly: false, what: 'above this no voice sustains speech, and it refuses without needing calibration' },
  { gate: 'syllable-rate', key: 'syllableRate.z', unit: 'z', readOnly: false, what: "how many standard deviations short of this voice's own measured rate flags — only bites in a fitted language (eng, deu)" },
  { gate: 'phonology', key: 'phonology.suspectLanguages', unit: 'iso1[]', readOnly: false, what: 'extra languages besides English that count as the voice speaking the wrong one' },
  { gate: 'words', key: 'words.cerThreshold', unit: 'ratio', readOnly: false, what: "whisper character error rate at which the clip is not saying what it was given; the absolute edit-distance floor still applies underneath, so a one-word clip cannot be flagged by a ratio alone" },
]

/** The whole /params payload. */
async function payload ({ charsSpentToday = 0 } = {}) {
  await estateVoices()
  const defaults = lab.defaultConfig()
  return {
    providers: lab.PROVIDERS,
    languages: LANGUAGES.map((l) => ({
      code: l.code,
      name: l.name,
      steer: l.steer,
      azureLocale: l.azureLocale,
      voices: voicesFor(l, PRODUCTION_VOICES),
    })),
    gates: gateStack.GATES,
    thresholdSpec: THRESHOLD_SPEC,
    defaults: { config: defaults },
    limits: lab.LIMITS,
    spend: {
      charsToday: charsSpentToday,
      usdToday: +(charsSpentToday / 1e6 * lab.XAI_USD_PER_MILLION_CHARS).toFixed(4),
      ceiling: lab.LIMITS.dailyCharCeiling,
    },
    pricing: { xaiUsdPerMillionChars: lab.XAI_USD_PER_MILLION_CHARS, azure: null },
    notes: {
      productionNote,
      export: 'This lab exports a config for a human to apply. It never writes algorithm_config and never writes course_audio.',
      azurePricing: 'Azure spend is not metered here — Azure clips count characters against the ceiling but report no dollar figure rather than a made-up one.',
    },
  }
}

module.exports = {
  TOM_CLONE,
  LANGUAGES,
  THRESHOLD_SPEC,
  findLanguage,
  voicesFor,
  describeStoredVoice,
  estateVoices,
  payload,
  _state: () => ({ PRODUCTION_VOICES, productionNote }),
}
