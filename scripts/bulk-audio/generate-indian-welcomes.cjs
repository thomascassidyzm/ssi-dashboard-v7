#!/usr/bin/env node
/**
 * Generate welcome audio for ben/guj/pan/urd × 148 targets using Azure Neural TTS.
 *
 * - Reads translations from data/translations/welcomes/{lang}.json (must exist)
 * - Generates Azure TTS, masters with ffmpeg loudnorm, uploads to S3
 * - Writes per-lang manifest into generated/welcomes/production/{lang}/_manifest.json
 * - Additively updates _welcome_index.json (does NOT clobber other langs)
 * - Optionally applies welcomes to the 4 draft eng_for_X courses
 *
 * Usage:
 *   node generate-indian-welcomes.cjs --plan
 *   node generate-indian-welcomes.cjs --execute
 *   node generate-indian-welcomes.cjs --execute --lang ben
 *   node generate-indian-welcomes.cjs --execute --no-apply   (skip course apply)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })

const fs = require('fs')
const path = require('path')
const os = require('os')
const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)
const { v4: uuidv4 } = require('uuid')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const { createClient } = require('@supabase/supabase-js')
const tts = require('../../services/tts-service.cjs')

const WELCOMES_DIR = path.join(__dirname, 'data/translations/welcomes')
const PROD_DIR = path.join(__dirname, 'generated/welcomes/production')
const INDEX_PATH = path.join(PROD_DIR, '_welcome_index.json')
const S3_BUCKET = 'ssi-audio-stage'
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1'
const CONCURRENCY = 8

const LANG_VOICE = {
  ben: { azure_voice: 'bn-BD-NabanitaNeural', name: 'Nabanita' },
  guj: { azure_voice: 'gu-IN-DhwaniNeural',   name: 'Dhwani'   },
  pan: { azure_voice: 'pa-IN-VaaniNeural',    name: 'Vaani'    },
  urd: { azure_voice: 'ur-PK-UzmaNeural',     name: 'Uzma'     },
}

const COURSE_APPLY = {
  ben: 'eng_for_ben',
  guj: 'eng_for_guj',
  pan: 'eng_for_pan',
  urd: 'eng_for_urd',
}
const APPLY_TARGET = 'eng'  // course is X_for_eng — target lang is eng

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
})

function expand(template, slot, in_known) {
  return template
    .replace(/\{a_target_speaker\}/g, slot.a_target_speaker || '')
    .replace(/\{in_target\}/g, slot.in_target || '')
    .replace(/\{target_speakers\}/g, slot.target_speakers || '')
    .replace(/\{in_known\}/g, in_known || '')
}

async function masterAndMeasure(rawBuffer) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'azure-welcome-'))
  const inPath = path.join(dir, 'raw.mp3')
  const outPath = path.join(dir, 'mastered.mp3')
  try {
    fs.writeFileSync(inPath, rawBuffer)
    await execAsync(`ffmpeg -y -i "${inPath}" -filter:a "loudnorm=I=-16:LRA=11:TP=-1.5" -q:a 2 "${outPath}"`)
    const { stdout } = await execAsync(`ffprobe -i "${outPath}" -show_entries format=duration -v quiet -of csv="p=0"`)
    const durationMs = Math.round(parseFloat(stdout.trim()) * 1000)
    return { buffer: fs.readFileSync(outPath), durationMs }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

async function uploadToS3(uuid, buffer) {
  const Key = `mastered/${uuid}.mp3`
  await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key, Body: buffer, ContentType: 'audio/mpeg' }))
  return Key
}

async function runPool(tasks, concurrency) {
  let i = 0
  async function worker() { while (i < tasks.length) { const k = i++; await tasks[k]() } }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker))
}

async function main() {
  const args = process.argv.slice(2)
  const isPlan = args.includes('--plan')
  const isExecute = args.includes('--execute')
  const noApply = args.includes('--no-apply')
  const langArg = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : null
  if (!isPlan && !isExecute) { console.log('Usage: --plan | --execute [--lang ben|guj|pan|urd] [--no-apply]'); process.exit(0) }

  const langs = (langArg ? [langArg] : Object.keys(LANG_VOICE)).filter(l => LANG_VOICE[l])
  if (!langs.length) { console.error('No langs to process'); process.exit(1) }

  // Build job list
  const jobs = []
  let totalChars = 0
  const perLang = {}
  for (const lang of langs) {
    const wp = path.join(WELCOMES_DIR, `${lang}.json`)
    if (!fs.existsSync(wp)) { console.error(`Missing template: ${wp}`); process.exit(1) }
    const data = JSON.parse(fs.readFileSync(wp, 'utf8'))
    const targetKeys = Object.keys(data.targets || {})
    let chars = 0
    for (const tk of targetKeys) {
      const text = expand(data.template, data.targets[tk], data.in_known)
      chars += text.length
      jobs.push({ lang, target: tk, text, voice: LANG_VOICE[lang] })
    }
    totalChars += chars
    perLang[lang] = { count: targetKeys.length, chars, voice: LANG_VOICE[lang].azure_voice }
  }

  console.log('\n=== Indian-knowns welcome generation (Azure) ===')
  console.log(`Bucket: ${S3_BUCKET}`)
  for (const [lang, info] of Object.entries(perLang)) {
    console.log(`  ${lang.toUpperCase()}: ${info.count} targets, ${info.chars.toLocaleString()} chars  voice=${info.voice}`)
  }
  console.log(`  TOTAL: ${jobs.length} jobs, ${totalChars.toLocaleString()} chars  (Azure-funded — no ElevenLabs cost)`)
  console.log(`  Pipeline per job: Azure TTS → ffmpeg loudnorm → S3 upload → manifest update`)
  console.log(`  After gen: additive index update + apply welcome to ${langs.map(l => COURSE_APPLY[l]).filter(Boolean).join(', ')}${noApply ? ' [SKIPPED via --no-apply]' : ''}`)

  if (isPlan) { console.log('\nDry-run. Re-run with --execute.'); return }

  if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) { console.error('Missing AZURE_SPEECH_KEY or AZURE_SPEECH_REGION'); process.exit(1) }
  await execAsync('ffmpeg -version').catch(() => { console.error('ffmpeg not found'); process.exit(1) })

  // Pre-create per-lang manifests
  const manifests = {}
  for (const lang of langs) {
    const dir = path.join(PROD_DIR, lang)
    fs.mkdirSync(dir, { recursive: true })
    manifests[lang] = {
      known_language: lang,
      voice: { provider: 'azure', name: LANG_VOICE[lang].name, voice_id: `azure_${LANG_VOICE[lang].azure_voice}` },
      settings: { provider: 'azure', azure_voice: LANG_VOICE[lang].azure_voice, mastering: 'loudnorm I=-16 LRA=11 TP=-1.5' },
      welcomes: [],
      generated_at: null
    }
  }

  let done = 0, failed = []
  const startTime = Date.now()
  const tasks = jobs.map(job => async () => {
    try {
      const result = await tts.generateAzure(job.text, {
        subscriptionKey: process.env.AZURE_SPEECH_KEY,
        region: process.env.AZURE_SPEECH_REGION,
        voiceName: job.voice.azure_voice,
        speed: 1.0
      })
      const { buffer, durationMs } = await masterAndMeasure(result.audioBuffer)
      const uuid = uuidv4().toUpperCase()
      const s3Key = await uploadToS3(uuid, buffer)
      manifests[job.lang].welcomes.push({
        uuid, target_language: job.target, file: `${uuid}.mp3`,
        size_kb: parseFloat((buffer.length / 1024).toFixed(1)), duration_ms: durationMs,
        s3_key: s3Key, text: job.text
      })
      done++
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
      console.log(`  [${done}/${jobs.length} ${elapsed}s] ${job.lang}→${job.target} OK ${durationMs}ms`)
    } catch (e) {
      failed.push({ ...job, error: e.message.slice(0, 120) })
      console.log(`  ${job.lang}→${job.target} FAILED: ${e.message.slice(0, 120)}`)
    }
  })
  await runPool(tasks, CONCURRENCY)

  // Save manifests
  for (const lang of langs) {
    manifests[lang].generated_at = new Date().toISOString()
    fs.writeFileSync(path.join(PROD_DIR, lang, '_manifest.json'), JSON.stringify(manifests[lang], null, 2))
  }
  console.log(`\nGen done: ${done} ok, ${failed.length} failed`)

  // Additive index update
  const idx = fs.existsSync(INDEX_PATH) ? JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8')) : {}
  for (const lang of langs) {
    if (!idx[lang]) idx[lang] = {}
    for (const w of manifests[lang].welcomes) {
      idx[lang][w.target_language] = { uuid: w.uuid, s3_key: w.s3_key, duration_ms: w.duration_ms }
    }
  }
  fs.writeFileSync(INDEX_PATH, JSON.stringify(idx, null, 2))
  console.log(`Index updated: ${INDEX_PATH}`)

  // Apply to courses
  if (!noApply) {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
    for (const lang of langs) {
      const courseCode = COURSE_APPLY[lang]
      if (!courseCode) continue
      const entry = idx[lang]?.[APPLY_TARGET]
      if (!entry) { console.log(`  apply ${courseCode}: NO INDEX ENTRY for ${APPLY_TARGET}`); continue }
      const { data: existing } = await sb.from('course_audio').select('id').eq('course_code', courseCode).eq('role', 'welcome')
      if (existing?.length) {
        await sb.from('course_audio').delete().eq('course_code', courseCode).eq('role', 'welcome')
      }
      const { error } = await sb.from('course_audio').insert({
        id: entry.uuid.toLowerCase(),
        course_code: courseCode,
        text: 'welcome', text_normalized: 'welcome',
        language: lang, role: 'welcome',
        voice_id: `azure_${LANG_VOICE[lang].azure_voice}`,
        s3_key: entry.s3_key, duration_ms: entry.duration_ms, origin: 'tts'
      })
      if (error) console.log(`  apply ${courseCode}: ERR ${error.message}`)
      else console.log(`  apply ${courseCode}: OK ${entry.uuid}`)
    }
  }

  if (failed.length) {
    fs.writeFileSync(path.join(PROD_DIR, '_failed_indian.json'), JSON.stringify(failed, null, 2))
    console.log(`\nFailures saved to _failed_indian.json — re-run --execute to retry (idempotent on success, will retry failures)`)
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
