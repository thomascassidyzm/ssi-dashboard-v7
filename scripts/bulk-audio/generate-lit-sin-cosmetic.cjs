#!/usr/bin/env node
/**
 * Generate the 28 cosmetic-reusable English entries (14 enc + 14 inst) for lit and sin
 * to bring them to full 48+48 parity with the other 11 langs.
 *
 * lit had 0 OLD entries to inherit; sin same. So we need to TTS the 28 entries that
 * other langs got via "keep OLD".
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

const VOICE_SELECTIONS = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'voice-selections.json'), 'utf8'))
const VOICES_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'voices.json'), 'utf8'))
const VOICES = VOICES_DATA.voices

const LANG_CODE_MAP = { lit: 'lt' }
const AZURE_VOICES = {
  sin: { name: 'Sameera', voice_name: 'si-LK-SameeraNeural', voice_id_db: 'azure_si-LK-SameeraNeural' }
}

const TARGETS = ['lit', 'sin']
const EXECUTE = process.argv.includes('--execute')

function pickVoice(dbLang) {
  if (AZURE_VOICES[dbLang]) {
    const az = AZURE_VOICES[dbLang]
    return { provider: 'azure', voice_id_db: az.voice_id_db, name: az.name, azure_voice: az.voice_name }
  }
  const sel = VOICE_SELECTIONS[dbLang]
  if (!sel) return null
  const voice = VOICES[dbLang]?.voices?.[sel.index]
  if (!voice) return null
  return {
    provider: 'elevenlabs',
    voice_id: voice.voice_id,
    name: voice.name,
    elevenlabs_lang_code: LANG_CODE_MAP[dbLang] || null,
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
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const body = { text, model_id: 'eleven_v3', voice_settings: { voice_stability: 0.4 } }
    if (voiceInfo.elevenlabs_lang_code) body.language_code = voiceInfo.elevenlabs_lang_code
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceInfo.voice_id}`, {
        method: 'POST',
        headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': ELEVENLABS_API_KEY },
        body: JSON.stringify(body)
      })
      if (res.status === 429) { await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt))); continue }
      if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`)
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

function normalize(t) { return (t || '').toLowerCase().trim().replace(/\s+/g, ' ') }

;(async () => {
  const ROOT = path.join(__dirname, '..', '..', 'temp', 'encouragement-migration')
  const reusable = JSON.parse(fs.readFileSync(path.join(ROOT, 'reusable-eng-reference.json'), 'utf8'))
  // 28 entries — 14 enc + 14 inst
  const seqs = {
    encouragement: reusable.filter(r => r.type === 'encouragement').map(r => r.newSeq),
    instruction: reusable.filter(r => r.type === 'instruction').map(r => r.newSeq),
  }

  console.log(`\n=== lit + sin cosmetic-only top-up — ${EXECUTE ? 'EXECUTE' : 'DRY RUN'} ===`)
  console.log(`Per lang: ${seqs.encouragement.length} enc + ${seqs.instruction.length} inst = 28 entries\n`)

  for (const lang of TARGETS) {
    const voice = pickVoice(lang)
    if (!voice) { console.log(`${lang}: NO VOICE — skip`); continue }
    const tr = JSON.parse(fs.readFileSync(path.join(ROOT, 'output', `${lang}.json`), 'utf8'))
    const todo = []
    for (const type of ['encouragement', 'instruction']) {
      for (const seq of seqs[type]) {
        const e = tr.find(t => t.audio_type === type && t.sequence_within_type === seq)
        if (e) todo.push(e)
      }
    }
    const chars = todo.reduce((s, t) => s + t.text.length, 0)
    console.log(`${lang}: ${todo.length} entries, ${chars} chars  (voice: ${voice.name})`)

    if (!EXECUTE) continue

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    let ok = 0, errs = 0
    const CONC = 5
    for (let i = 0; i < todo.length; i += CONC) {
      const batch = todo.slice(i, i + CONC)
      await Promise.all(batch.map(async (entry) => {
        try {
          const uuid = uuidv4().toUpperCase()
          const audio = await ttsGenerate(voice, entry.text)
          const s3_key = await uploadToS3(uuid, audio)
          const { error } = await supabase.from('shared_audio').insert({
            id: uuid.toLowerCase(),
            text: entry.text,
            text_normalized: normalize(entry.text),
            language: lang,
            audio_type: entry.audio_type,
            voice_id: voice.voice_id_db,
            origin: 'tts',
            s3_key,
            sequence: entry.sequence_within_type,
            duration_ms: null
          })
          if (error) throw new Error(`Supabase: ${error.message}`)
          ok++; process.stdout.write('.')
        } catch (e) { errs++; console.error(`\n  [${lang}] ERR ${entry.audio_type} seq=${entry.sequence_within_type}: ${e.message}`) }
      }))
    }
    console.log(`\n[${lang}] ${ok} ok, ${errs} errors`)
  }
})().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
