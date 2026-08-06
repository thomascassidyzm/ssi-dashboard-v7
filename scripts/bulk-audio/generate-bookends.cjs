#!/usr/bin/env node

/**
 * Generate listen-bookend audio (bookend_listen_intro + bookend_listen_outro)
 * for the Indian-language eng_for_X courses that are missing them.
 *
 * Bookends are 2 short instructional phrases spoken in the LEARNER's language,
 * played around a listening pod ("just listen" / "start talking again").
 * Convention (matches existing tam/sin/ara rows): Azure Neural TTS, origin='tts',
 * sequence=null, voice_id='azure_<voiceName>', audio_type=bookend_listen_intro|outro.
 *
 * For each (lang, bookend):
 *   - Azure TTS via services/tts-service.cjs
 *   - Upload mp3 to S3 mastered/{UUID}.mp3
 *   - INSERT shared_audio (skip if (lang, audio_type) already exists)
 *
 * Usage:
 *   node generate-bookends.cjs --plan
 *   node generate-bookends.cjs --execute
 *   node generate-bookends.cjs --execute --lang guj
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
const { v4: uuidv4 } = require('uuid')
const { createClient } = require('@supabase/supabase-js')
const tts = require('../../services/tts-service.cjs')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1'
const S3_BUCKET = 'ssi-audio-stage'

// English source:
//   intro: "Now just listen for a while."
//   outro: "Now start talking in the gaps again."
// Translations are respectful-register (आप/আপনি/તમે/ਤੁਸੀਂ/آپ) to match each
// language's instruction set. "gaps" = the pauses where the learner speaks.
const LANGS = {
  hin: { voice: 'hi-IN-SwaraNeural',     intro: 'अब कुछ देर बस सुनिए।',                 outro: 'अब फिर से ख़ाली जगहों में बोलना शुरू कीजिए।' },
  ben: { voice: 'bn-BD-NabanitaNeural',  intro: 'এখন কিছুক্ষণ শুধু শুনুন।',              outro: 'এখন আবার ফাঁকগুলোতে কথা বলা শুরু করুন।' },
  guj: { voice: 'gu-IN-DhwaniNeural',    intro: 'હવે થોડી વાર ફક્ત સાંભળો.',            outro: 'હવે ફરીથી ખાલી જગ્યાઓમાં બોલવાનું શરૂ કરો.' },
  pan: { voice: 'pa-IN-VaaniNeural',     intro: 'ਹੁਣ ਕੁਝ ਦੇਰ ਸਿਰਫ਼ ਸੁਣੋ।',              outro: 'ਹੁਣ ਫਿਰ ਤੋਂ ਖਾਲੀ ਥਾਵਾਂ ਵਿੱਚ ਬੋਲਣਾ ਸ਼ੁਰੂ ਕਰੋ।' },
  urd: { voice: 'ur-PK-UzmaNeural',      intro: 'اب کچھ دیر صرف سنیں۔',                  outro: 'اب وقفوں میں دوبارہ بولنا شروع کریں۔' },
}

function normalizeText(t) { return (t || '').toLowerCase().trim().replace(/\s+/g, ' ') }

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

async function ttsAzure(voiceName, text) {
  const { audioBuffer } = await tts.generateAzure(text, {
    subscriptionKey: process.env.AZURE_SPEECH_KEY,
    region: process.env.AZURE_SPEECH_REGION,
    voiceName,
    speed: 1.0
  })
  return audioBuffer
}

function entriesFor(lang) {
  const cfg = LANGS[lang]
  return [
    { audio_type: 'bookend_listen_intro', text: cfg.intro, voice: cfg.voice },
    { audio_type: 'bookend_listen_outro', text: cfg.outro, voice: cfg.voice },
  ]
}

async function getExisting(supabase, lang) {
  const { data } = await supabase.from('shared_audio')
    .select('audio_type').eq('language', lang).ilike('audio_type', 'bookend_listen_%')
  return new Set((data || []).map(r => r.audio_type))
}

async function run(opts) {
  if (!SUPABASE_KEY) throw new Error('SUPABASE_SERVICE_KEY required')
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const langs = opts.lang ? [opts.lang] : Object.keys(LANGS)

  console.log(`\n=== BOOKEND GEN ${opts.execute ? '(EXECUTE)' : '(PLAN)'} — ${langs.join(',')} ===\n`)
  let totalOk = 0, totalErr = 0
  for (const lang of langs) {
    if (!LANGS[lang]) { console.log(`  ${lang}: not configured — skip`); continue }
    const existing = await getExisting(supabase, lang)
    const todo = entriesFor(lang).filter(e => !existing.has(e.audio_type))
    console.log(`[${lang}] voice=${LANGS[lang].voice} — ${todo.length}/2 to generate (skipping ${2 - todo.length} existing)`)
    for (const e of entriesFor(lang)) {
      const mark = existing.has(e.audio_type) ? 'exists' : 'NEW'
      console.log(`    ${e.audio_type.padEnd(22)} [${mark}] "${e.text}"`)
    }
    if (!opts.execute) continue

    for (const e of todo) {
      try {
        const uuid = uuidv4().toUpperCase()
        const audio = await ttsAzure(e.voice, e.text)
        const s3_key = await uploadToS3(uuid, audio)
        const { error } = await supabase.from('shared_audio').insert({
          id: uuid.toLowerCase(),
          text: e.text,
          text_normalized: normalizeText(e.text),
          language: lang,
          audio_type: e.audio_type,
          voice_id: `azure_${e.voice}`,
          origin: 'tts',
          s3_key,
          sequence: null,
          duration_ms: null
        })
        if (error) throw new Error(`Supabase insert: ${error.message}`)
        totalOk++
        console.log(`    ✓ ${e.audio_type} -> ${s3_key}`)
      } catch (err) {
        totalErr++
        console.error(`    ✗ ${lang} ${e.audio_type}: ${err.message}`)
      }
    }
  }
  if (opts.execute) console.log(`\n=== TOTAL: ${totalOk} generated, ${totalErr} errors ===`)
  else console.log(`\nTo execute: node generate-bookends.cjs --execute`)
}

const args = process.argv.slice(2)
const opts = {
  plan: args.includes('--plan'),
  execute: args.includes('--execute'),
  lang: (() => { const i = args.indexOf('--lang'); return i >= 0 ? args[i + 1] : null })()
}
if (!opts.plan && !opts.execute) {
  console.log('Usage: node generate-bookends.cjs --plan | --execute [--lang LANG]')
  process.exit(1)
}
run(opts).catch(e => { console.error('FATAL:', e.message); process.exit(1) })
