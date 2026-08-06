#!/usr/bin/env node
/**
 * Retry the 33 Azure TTS failures from generate-indian-welcomes.cjs at lower concurrency.
 * Reads _failed_indian.json, re-runs each, masters, uploads, updates index manifest.
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
const tts = require('../../services/tts-service.cjs')

const PROD_DIR = path.join(__dirname, 'generated/welcomes/production')
const INDEX_PATH = path.join(PROD_DIR, '_welcome_index.json')
const FAIL_PATH = path.join(PROD_DIR, '_failed_indian.json')
const S3_BUCKET = 'ssi-audio-stage'
const CONCURRENCY = 2

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
})

async function masterAndMeasure(buf) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'azure-retry-'))
  const inP = path.join(dir, 'raw.mp3'), outP = path.join(dir, 'mastered.mp3')
  try {
    fs.writeFileSync(inP, buf)
    await execAsync(`ffmpeg -y -i "${inP}" -filter:a "loudnorm=I=-16:LRA=11:TP=-1.5" -q:a 2 "${outP}"`)
    const { stdout } = await execAsync(`ffprobe -i "${outP}" -show_entries format=duration -v quiet -of csv="p=0"`)
    return { buffer: fs.readFileSync(outP), durationMs: Math.round(parseFloat(stdout.trim()) * 1000) }
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
}

;(async () => {
  if (!fs.existsSync(FAIL_PATH)) { console.log('No failures file'); return }
  const failures = JSON.parse(fs.readFileSync(FAIL_PATH, 'utf8'))
  console.log(`Retrying ${failures.length} failures at concurrency=${CONCURRENCY}\n`)

  const idx = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'))
  const newFailures = []
  let done = 0, ok = 0
  const start = Date.now()

  // Load per-lang manifests for appending
  const manifests = {}
  for (const lang of [...new Set(failures.map(f => f.lang))]) {
    const mp = path.join(PROD_DIR, lang, '_manifest.json')
    manifests[lang] = JSON.parse(fs.readFileSync(mp, 'utf8'))
  }

  let i = 0
  async function worker() {
    while (i < failures.length) {
      const job = failures[i++]
      done++
      try {
        const result = await tts.generateAzure(job.text, {
          subscriptionKey: process.env.AZURE_SPEECH_KEY,
          region: process.env.AZURE_SPEECH_REGION,
          voiceName: job.voice.azure_voice,
          speed: 1.0
        })
        const { buffer, durationMs } = await masterAndMeasure(result.audioBuffer)
        const uuid = uuidv4().toUpperCase()
        const Key = `mastered/${uuid}.mp3`
        await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key, Body: buffer, ContentType: 'audio/mpeg' }))
        manifests[job.lang].welcomes.push({
          uuid, target_language: job.target, file: `${uuid}.mp3`,
          size_kb: parseFloat((buffer.length / 1024).toFixed(1)),
          duration_ms: durationMs, s3_key: Key, text: job.text
        })
        if (!idx[job.lang]) idx[job.lang] = {}
        idx[job.lang][job.target] = { uuid, s3_key: Key, duration_ms: durationMs }
        ok++
        const t = ((Date.now() - start) / 1000).toFixed(0)
        console.log(`  [${done}/${failures.length} ${t}s] ${job.lang}→${job.target} OK ${durationMs}ms`)
      } catch (e) {
        newFailures.push({ ...job, error: e.message.slice(0, 120) })
        console.log(`  ${job.lang}→${job.target} STILL FAILED: ${e.message.slice(0, 80)}`)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  // Persist updates
  for (const lang of Object.keys(manifests)) {
    fs.writeFileSync(path.join(PROD_DIR, lang, '_manifest.json'), JSON.stringify(manifests[lang], null, 2))
  }
  fs.writeFileSync(INDEX_PATH, JSON.stringify(idx, null, 2))
  if (newFailures.length === 0) {
    fs.unlinkSync(FAIL_PATH)
    console.log(`\nAll ${ok} retried successfully. _failed_indian.json removed.`)
  } else {
    fs.writeFileSync(FAIL_PATH, JSON.stringify(newFailures, null, 2))
    console.log(`\n${ok} ok, ${newFailures.length} still failed. Re-run to retry.`)
  }
})().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
