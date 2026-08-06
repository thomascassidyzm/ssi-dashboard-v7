#!/usr/binr/env node

/**
 * Generate Encouragement + Instruction Audio for the 11 LIVE-content known langs,
 * scoped to the 54 entries whose English actually CHANGED vs the old set.
 *
 * Reads:
 *   - temp/encouragement-migration/output/{lang}.json (translations, 96 entries each)
 *   - temp/encouragement-migration/changed-entries.json (which 54 are "changed")
 *
 * For each (lang, changed entry):
 *   - TTS via ElevenLabs (or Azure for sin) using lang's voice from voice-selections.json
 *   - Upload mp3 to S3 mastered/{UUID}.mp3
 *   - INSERT shared_audio (audio_type=encouragement|instruction, language, text, voice_id, origin='tts', sequence, s3_key)
 *   - Skip if (lang, text_normalized, audio_type) already exists
 *
 * Usage:
 *   node generate-encouragements.cjs --plan
 *   node generate-encouragements.cjs --execute             # all 11 live langs
 *   node generate-encouragements.cjs --execute --lang fra  # one lang only
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const { createClient } = require('@supabase/supabase-js')

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1'
const S3_BUCKET = 'ssi-audio-stage'

const ROOT = path.join(__dirname, '..', '..', 'temp', 'encouragement-migration')
const OUTPUT_DIR = path.join(ROOT, 'output')
const CHANGED_FILE = path.join(ROOT, 'changed-entries.json')

const VOICE_SELECTIONS = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'voice-selections.json'), 'utf8'))
const VOICES_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'voices.json'), 'utf8'))
const VOICES = VOICES_DATA.voices

// 12 known langs that have at least one course with actual seeds in DB (per Kai 2026-05-01).
// Excludes: aze, ben, guj, hin, pan, urd, yor — all have 0-seed draft courses (next month).
const LIVE_LANGS = ['ara', 'deu', 'fra', 'ita', 'jpn', 'kor', 'lit', 'por', 'sin', 'spa', 'tam', 'zho']

const LANG_CODE_MAP = {
  ara: 'ar', cmn: 'zh', deu: 'de', fra: 'fr', hin: 'hi', ita: 'it',
  jpn: 'ja', kor: 'ko', por: 'pt', spa: 'es', tam: 'ta'
}
const VOICE_LANG_ALIAS = { zho: 'cmn' }

const AZURE_VOICES = {
  sin: { name: 'Sameera', voice_name: 'si-LK-SameeraNeural', voice_id_db: 'azure_si-LK-SameeraNeural' }
}

const CONCURRENCY = 5

function pickVoice(dbLang) {
  if (AZURE_VOICES[dbLang]) {
    const az = AZURE_VOICES[dbLang]
    return { provider: 'azure', voice_id_db: az.voice_id_db, name: az.name, azure_voice: az.voice_name }
  }
  const lookupLang = VOICE_LANG_ALIAS[dbLang] || dbLang
  const sel = VOICE_SELECTIONS[lookupLang]
  if (!sel) return null
  const voice = VOICES[lookupLang]?.voices?.[sel.index]
  if (!voice) return null
  return {
    provider: 'elevenlabs',
    voice_id: voice.voice_id,
    name: voice.name,
    elevenlabs_lang_code: LANG_CODE_MAP[lookupLang] || null,
    voice_id_db: `elevenlabs_${voice.voice_id}`
  }
}

let _fetch = null
async function getFetch() { if (!_fetch) _fetch = (await import('node-fetch')).default; return _fetch }

async function ttsGenerate(voiceInfo, text, maxRetries = 3) {
  if (voiceInfo.provider === 'azure') {
    const tts = require('../../services/tts-service.cjs')
    const result = await tts.generateAzure(text, {
      subscriptionKey: process.env.AZURE_SPEECH_KEY,
      region: process.env.AZURE_SPEECH_REGION,
      voiceName: voiceInfo.azure_voice,
      speed: 1.0
    })
    return result.audioBuffer
  }

  const fetch = await getFetch()
  const voiceId = voiceInfo.voice_id
  const langCode = voiceInfo.elevenlabs_lang_code
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const body = { text, model_id: 'eleven_v3', voice_settings: { voice_stability: 0.4 } }
    if (langCode) body.language_code = langCode
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': ELEVENLABS_API_KEY },
        body: JSON.stringify(body)
      })
      if (res.status === 429) {
        const wait = Math.min(2000 * Math.pow(2, attempt), 30000)
        await new Promise(r => setTimeout(r, wait))
        continue
      }
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`ElevenLabs ${res.status}: ${body.slice(0, 200)}`)
      }
      return Buffer.from(await res.arrayBuffer())
    } catch (e) {
      if (attempt === maxRetries) throw e
      await new Promise(r => setTimeout(r, 1000 * attempt))
    }
  }
}

async function uploadToS3(uuid, buf) {
  const AWS = require('aws-sdk')
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION
  })
  const key = `mastered/${uuid}.mp3`
  await s3.putObject({ Bucket: S3_BUCKET, Key: key, Body: buf, ContentType: 'audio/mpeg' }).promise()
  return key
}

function normalizeText(t) { return (t || '').toLowerCase().trim().replace(/\s+/g, ' ') }

function loadChanged() {
  const c = JSON.parse(fs.readFileSync(CHANGED_FILE, 'utf8'))
  return c.changed  // array of { seq, type, sim, text (eng), oldText }
}

function loadLangTranslations(lang) {
  return JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, `${lang}.json`), 'utf8'))
}

async function getExistingForLang(supabase, lang) {
  const { data } = await supabase.from('shared_audio')
    .select('text_normalized, audio_type')
    .eq('language', lang).in('audio_type', ['encouragement', 'instruction'])
  const set = new Set()
  for (const r of data || []) set.add(`${r.audio_type}|${r.text_normalized}`)
  return set
}

async function plan(opts = {}) {
  const changed = loadChanged()
  const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null
  const langList = opts.lang ? opts.lang.split(',') : LIVE_LANGS
  const scope = opts.all ? 'ALL 96 entries' : `${changed.length} CHANGED entries`

  console.log(`\n=== ENCOURAGEMENT GEN PLAN — ${langList.join(',')}, ${scope} ===\n`)
  console.log(`Changed: ${changed.filter(c=>c.type==='encouragement').length} enc + ${changed.filter(c=>c.type==='instruction').length} inst`)
  console.log(`\nlang | voice          | scoped | already | to-gen | chars  | est_credits`)
  console.log('-----+----------------+--------+---------+--------+--------+------------')

  let totalToGen = 0, totalChars = 0
  for (const lang of langList) {
    const voice = pickVoice(lang)
    if (!voice) { console.log(`  ${lang.padEnd(4)} | NO VOICE — skip`); continue }
    const tr = loadLangTranslations(lang)
    const scoped = opts.all ? tr : changed.map(c => tr.find(t => t.audio_type === c.type && t.sequence_within_type === c.seq)).filter(Boolean)
    const existing = supabase ? await getExistingForLang(supabase, lang) : new Set()
    const todo = scoped.filter(t => !existing.has(`${t.audio_type}|${normalizeText(t.text)}`))
    const chars = todo.reduce((s, t) => s + t.text.length, 0)
    totalToGen += todo.length
    totalChars += chars
    console.log(`${lang.padEnd(4)} | ${voice.name.padEnd(14)} | ${String(scoped.length).padStart(6)} | ${String(scoped.length - todo.length).padStart(7)} | ${String(todo.length).padStart(6)} | ${String(chars).padStart(6)} | ${String(chars).padStart(11)}`)
  }
  console.log('-----+----------------+--------+---------+--------+--------+------------')
  console.log(`TOTAL                                              | ${String(totalChars).padStart(6)} | ${String(totalChars).padStart(11)}`)
  console.log(`\nEstimated cost: ${totalChars.toLocaleString()} ElevenLabs credits (≈ 1 credit/char)`)
  console.log(`Sin uses Azure (separate billing — not counted here).`)
  console.log(`\nTo execute: node generate-encouragements.cjs --execute`)
  console.log(`To run one lang:    --execute --lang fra`)
}

async function execute(opts) {
  if (!SUPABASE_KEY) throw new Error('SUPABASE_SERVICE_KEY required')
  if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY required')
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const changed = loadChanged()

  let langs = opts.lang ? opts.lang.split(',') : LIVE_LANGS
  if (langs.length === 0) { console.log('No lang selected:', opts.lang); return }

  let totalOk = 0, totalErr = 0
  for (const lang of langs) {
    const voice = pickVoice(lang)
    if (!voice) { console.log(`  ${lang}: NO VOICE — skip`); continue }
    const tr = loadLangTranslations(lang)
    const scoped = opts.all ? tr : changed.map(c => tr.find(t => t.audio_type === c.type && t.sequence_within_type === c.seq)).filter(Boolean)
    const existing = await getExistingForLang(supabase, lang)
    const todo = scoped.filter(t => !existing.has(`${t.audio_type}|${normalizeText(t.text)}`))
    console.log(`\n[${lang}] ${todo.length}/${scoped.length} entries (skipping ${scoped.length - todo.length} existing). Voice: ${voice.name}`)

    let ok = 0, errs = 0
    for (let i = 0; i < todo.length; i += CONCURRENCY) {
      const batch = todo.slice(i, i + CONCURRENCY)
      await Promise.all(batch.map(async (entry) => {
        try {
          const uuid = uuidv4().toUpperCase()
          const audio = await ttsGenerate(voice, entry.text)
          const s3_key = await uploadToS3(uuid, audio)
          const { error } = await supabase.from('shared_audio').insert({
            id: uuid.toLowerCase(),
            text: entry.text,
            text_normalized: normalizeText(entry.text),
            language: lang,
            audio_type: entry.audio_type,
            voice_id: voice.voice_id_db,
            origin: 'tts',
            s3_key,
            sequence: entry.sequence_within_type,
            duration_ms: null
          })
          if (error) throw new Error(`Supabase insert: ${error.message}`)
          ok++
          process.stdout.write('.')
        } catch (e) {
          errs++
          console.error(`\n  [${lang}] ERR ${entry.audio_type} seq=${entry.sequence_within_type}: ${e.message}`)
        }
      }))
    }
    console.log(`\n[${lang}] ${ok} ok, ${errs} errors`)
    totalOk += ok
    totalErr += errs
  }
  console.log(`\n=== TOTAL: ${totalOk} generated, ${totalErr} errors ===`)
}

const args = process.argv.slice(2)
const opts = {
  plan: args.includes('--plan'),
  execute: args.includes('--execute'),
  all: args.includes('--all'),
  lang: (() => { const i = args.indexOf('--lang'); return i >= 0 ? args[i + 1] : null })()
}

;(async () => {
  if (!opts.plan && !opts.execute) {
    console.log('Usage: node generate-encouragements.cjs --plan | --execute [--lang LANG]')
    process.exit(1)
  }
  if (opts.plan) await plan(opts)
  else await execute(opts)
})().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
