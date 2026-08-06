#!/usr/bin/env node

/**
 * Generate Paywall Encouragement Audio for N known languages.
 *
 * Reads translations from temp/paywall-expansion/output/{lang}.json
 * (each = array of { sequence, text }).
 *
 * For each (lang, entry):
 *   - TTS via ElevenLabs using the lang's welcome voice (voice-selections.json)
 *   - Upload mp3 to S3 mastered/{UUID}.mp3
 *   - INSERT into shared_audio (audio_type='paywall', language=lang, text, voice_id, origin='tts', sequence, s3_key)
 *
 * Usage:
 *   node generate-paywall.cjs --plan                  # Show plan + cost estimate
 *   node generate-paywall.cjs --execute               # Generate everything (REQUIRES Kai's "approved")
 *   node generate-paywall.cjs --execute --lang fra    # One language only
 *   node generate-paywall.cjs --execute --resume      # Resume — skip rows already in shared_audio
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

const ROOT = path.join(__dirname, '..', '..', 'temp', 'paywall-expansion')
const OUTPUT_DIR = path.join(ROOT, 'output')

const VOICE_SELECTIONS = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'voice-selections.json'), 'utf8'))
const VOICES_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'voices.json'), 'utf8'))
const VOICES = VOICES_DATA.voices

// Eleven v3 language codes
const LANG_CODE_MAP = {
  ara: 'ar', cmn: 'zh', deu: 'de', fra: 'fr', hin: 'hi', ita: 'it',
  jpn: 'ja', kor: 'ko', por: 'pt', spa: 'es', tam: 'ta'
}
// DB language code -> voice-selections lookup key
const VOICE_LANG_ALIAS = { zho: 'cmn' }

// Sinhala-specific path: not in ElevenLabs, use Azure SameeraNeural per
// memory/active-projects (welcomes for sin use this same voice).
const AZURE_VOICES = {
  sin: { name: 'Sameera', voice_name: 'si-LK-SameeraNeural', voice_id_db: 'azure_si-LK-SameeraNeural' }
}

const CONCURRENCY = 5  // be polite to ElevenLabs

function pickVoice(dbLang) {
  // Azure-only langs first
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
    // Reuse the project's Azure TTS service (consistent with other audio paths)
    const tts = require('../../services/tts-service.cjs')
    const result = await tts.generateAzure(text, {
      subscriptionKey: process.env.AZURE_SPEECH_KEY,
      region: process.env.AZURE_SPEECH_REGION,
      voiceName: voiceInfo.azure_voice,
      speed: 1.0
    })
    return result.audioBuffer
  }

  // ElevenLabs path
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
      const buf = Buffer.from(await res.arrayBuffer())
      return buf
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
  await s3.putObject({
    Bucket: S3_BUCKET, Key: key, Body: buf, ContentType: 'audio/mpeg'
  }).promise()
  return key
}

function normalizeText(t) {
  return (t || '').toLowerCase().trim().replace(/\s+/g, ' ')
}

async function loadTranslations() {
  const langs = []
  for (const f of fs.readdirSync(OUTPUT_DIR)) {
    if (f.endsWith('.json') && !f.endsWith('.raw.txt') && !f.includes('.parse_error')) {
      const lang = path.basename(f, '.json')
      const data = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, f), 'utf8'))
      langs.push({ lang, entries: data })
    }
  }
  return langs.sort((a, b) => a.lang.localeCompare(b.lang))
}

async function getExistingPaywall(supabase, lang) {
  const { data } = await supabase.from('shared_audio')
    .select('text_normalized')
    .eq('language', lang)
    .eq('audio_type', 'paywall')
  return new Set((data || []).map(r => r.text_normalized))
}

async function plan() {
  const all = await loadTranslations()
  const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null
  console.log('=== PAYWALL EXPANSION PLAN ===\n')
  console.log('lang | voice | entries | new | chars | est_credits | status')
  let totalNew = 0, totalChars = 0
  for (const { lang, entries } of all) {
    const voice = pickVoice(lang)
    if (!voice) {
      console.log(`  ${lang.padEnd(4)} | NO VOICE — skip`)
      continue
    }
    const existing = supabase ? await getExistingPaywall(supabase, lang) : new Set()
    const newEntries = entries.filter(e => !existing.has(normalizeText(e.text)))
    const chars = newEntries.reduce((s, e) => s + (e.text || '').length, 0)
    totalNew += newEntries.length
    totalChars += chars
    console.log(`  ${lang.padEnd(4)} | ${voice.name.padEnd(13)} | ${entries.length.toString().padStart(3)}  | ${newEntries.length.toString().padStart(3)} | ${chars.toString().padStart(6)} | ${chars.toString().padStart(7)} | ${existing.size > 0 ? 'partial' : 'fresh'}`)
  }
  console.log()
  console.log(`TOTAL NEW: ${totalNew} entries, ${totalChars.toLocaleString()} chars (≈ ${totalChars.toLocaleString()} ElevenLabs credits)`)
  console.log(`Budget assumed: 962,004 credits (per Kai 2026-04-29)`)
  console.log()
  console.log('To execute: node generate-paywall.cjs --execute')
  console.log('To run one language: --execute --lang fra')
  console.log('To resume after interruption: --execute --resume (idempotent — skips already-inserted)')
}

async function execute(opts) {
  if (!SUPABASE_KEY) throw new Error('SUPABASE_SERVICE_KEY required')
  if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY required')
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  let all = await loadTranslations()
  if (opts.lang) all = all.filter(x => x.lang === opts.lang)
  if (all.length === 0) {
    console.log('No translations found for', opts.lang || '(any lang)')
    return
  }
  let totalSuccess = 0, totalErrors = 0
  for (const { lang, entries } of all) {
    const voice = pickVoice(lang)
    if (!voice) { console.log(`  ${lang}: NO VOICE — skip`); continue }
    const existing = await getExistingPaywall(supabase, lang)
    const todo = entries.filter(e => !existing.has(normalizeText(e.text)))
    console.log(`\n[${lang}] ${todo.length}/${entries.length} entries (skipping ${entries.length - todo.length} existing). Voice: ${voice.name}`)

    // Process in concurrency batches
    let langSuccess = 0, langErrors = 0
    for (let i = 0; i < todo.length; i += CONCURRENCY) {
      const batch = todo.slice(i, i + CONCURRENCY)
      await Promise.all(batch.map(async (entry) => {
        try {
          const uuid = uuidv4().toUpperCase()
          const audio = await ttsGenerate(voice, entry.text)
          const s3_key = await uploadToS3(uuid, audio)
          const { error } = await supabase.from('shared_audio').insert({
            id: uuid.toLowerCase(),  // shared_audio.id is uuid type, lowercase
            text: entry.text,
            text_normalized: normalizeText(entry.text),
            language: lang,
            audio_type: 'paywall',
            voice_id: voice.voice_id_db,
            origin: 'tts',
            s3_key,
            sequence: entry.sequence,
            duration_ms: null  // populated later by a duration scan if needed
          })
          if (error) throw new Error(`Supabase insert: ${error.message}`)
          langSuccess++
          process.stdout.write(`.`)
        } catch (e) {
          langErrors++
          console.error(`\n  [${lang}] ERR seq=${entry.sequence}: ${e.message}`)
        }
      }))
    }
    console.log(`\n[${lang}] ${langSuccess} ok, ${langErrors} errors`)
    totalSuccess += langSuccess
    totalErrors += langErrors
  }
  console.log(`\n=== TOTAL: ${totalSuccess} generated, ${totalErrors} errors ===`)
}

const args = process.argv.slice(2)
const opts = {
  plan: args.includes('--plan'),
  execute: args.includes('--execute'),
  resume: args.includes('--resume'),
  lang: (() => { const i = args.indexOf('--lang'); return i >= 0 ? args[i + 1] : null })()
}

;(async () => {
  if (!opts.plan && !opts.execute) {
    console.log('Usage: node generate-paywall.cjs --plan | --execute [--lang LANG] [--resume]')
    process.exit(1)
  }
  if (opts.plan) await plan()
  else await execute(opts)
})().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
