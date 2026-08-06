/**
 * audio-repair.cjs — the live wiring of `audio-repair-core.cjs`.
 *
 * The core is dependency-injected so its tests can drive the whole
 * accept/rollback path against fakes with no network and no spend. This module
 * is the other half: the real Supabase client, the real S3 bucket, the real
 * TTS chain and the real veracity checker, assembled once and lazily — phase8
 * is a large module and requiring it at import time would cost every caller,
 * including the ones that only ever read.
 *
 * Read audio-repair-core.cjs for what this actually does and why it is
 * same-id. This file only supplies the plumbing.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { createClient } = require('@supabase/supabase-js')
const { PutObjectCommand, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
const { cacheControlFor } = require('./shared/audio-cache-control.cjs')

const { createRepairCore, decodeVoiceId, RepairError } = require('./audio-repair-core.cjs')
const veracity = require('./audio-veracity.cjs')

const FFMPEG = process.env.FFMPEG || 'ffmpeg'

let _core = null
let _phase8 = null
let _tts = null
let _toBcp47 = null

function phase8 () {
  if (!_phase8) {
    // phase8 mounts an express app at require time; this env flag is how the
    // repair tools already stop it binding a port.
    process.env.PHASE8_NO_LISTEN = '1'
    _phase8 = require('./phases/phase8-audio-v13.cjs')
  }
  return _phase8
}

function tts () {
  if (!_tts) _tts = require('./tts-service.cjs')
  return _tts
}

function bcp47 (language) {
  if (!_toBcp47) _toBcp47 = require('./voice-discovery-service.cjs').toBcp47
  return _toBcp47(language)
}

function supabaseClient () {
  return createClient(
    (process.env.SUPABASE_URL || '').trim(),
    (process.env.SUPABASE_SERVICE_KEY || '').trim(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

/** Mean/peak level via ffmpeg volumedetect — the silent-clip discriminator. */
function measureLevel (buffer) {
  return new Promise((resolve) => {
    const tmp = path.join(os.tmpdir(), `repair-level-${process.pid}-${Date.now()}.mp3`)
    try { fs.writeFileSync(tmp, buffer) } catch { return resolve(null) }
    execFile(FFMPEG, ['-hide_banner', '-nostats', '-i', tmp, '-af', 'volumedetect', '-f', 'null', '-'],
      { encoding: 'utf8', maxBuffer: 1 << 22 }, (_e, _o, stderr) => {
        try { fs.unlinkSync(tmp) } catch {}
        const mean = /mean_volume:\s*(-?[\d.]+) dB/.exec(stderr || '')
        const peak = /max_volume:\s*(-?[\d.]+) dB/.exec(stderr || '')
        resolve(mean && peak ? { meanDb: parseFloat(mean[1]), peakDb: parseFloat(peak[1]) } : null)
      })
  })
}

const FRAME_SAMPLE_RATE = 16000
const FRAME_MS = 5 // must match TAIL_THRESHOLDS.frameMs in audio-repair-core

/**
 * The clip's amplitude envelope: per-frame RMS in dBFS, oldest first. This is
 * the only thing the tail-integrity detector needs, and keeping the decode here
 * keeps the core's maths pure and testable without audio.
 */
function frameDb (buffer) {
  return new Promise((resolve, reject) => {
    const child = execFile(FFMPEG,
      ['-hide_banner', '-nostats', '-loglevel', 'error', '-i', 'pipe:0',
        '-ac', '1', '-ar', String(FRAME_SAMPLE_RATE), '-f', 's16le', 'pipe:1'],
      { encoding: 'buffer', maxBuffer: 1 << 28 },
      (err, stdout) => {
        if (err) return reject(err)
        const samples = stdout.length / 2
        const per = FRAME_SAMPLE_RATE * FRAME_MS / 1000
        const out = []
        for (let i = 0; i < samples; i += per) {
          let sum = 0, n = 0
          for (let j = i; j < Math.min(i + per, samples); j++) {
            const v = stdout.readInt16LE(j * 2) / 32768
            sum += v * v; n++
          }
          out.push(n ? 20 * Math.log10(Math.sqrt(sum / n) + 1e-9) : -180)
        }
        resolve(out)
      })
    child.stdin.on('error', () => {})
    child.stdin.end(buffer)
  })
}

function ttsOptionsFor (provider, voiceId, language) {
  if (provider === 'azure') {
    return {
      subscriptionKey: process.env.AZURE_SPEECH_KEY,
      region: process.env.AZURE_SPEECH_REGION || 'westeurope',
      voiceName: voiceId,
    }
  }
  if (provider === 'elevenlabs') return { apiKey: process.env.ELEVENLABS_API_KEY, voiceId }
  return { apiKey: process.env.XAI_API_KEY, voiceId, language: bcp47(language) }
}

const storage = {
  async put (key, buffer, contentType = 'audio/mpeg') {
    const p8 = phase8()
    const cacheControl = cacheControlFor(contentType)
    await p8.s3.send(new PutObjectCommand({
      Bucket: p8.S3_BUCKET, Key: key, Body: buffer, ContentType: contentType,
      ...(cacheControl ? { CacheControl: cacheControl } : {}),
    }))
    return { key, bytes: buffer.length }
  },
  async head (key) {
    const p8 = phase8()
    try {
      const r = await p8.s3.send(new HeadObjectCommand({ Bucket: p8.S3_BUCKET, Key: key }))
      return { exists: true, bytes: r.ContentLength, contentType: r.ContentType }
    } catch {
      return { exists: false }
    }
  },
  async get (key) {
    const p8 = phase8()
    const r = await p8.s3.send(new GetObjectCommand({ Bucket: p8.S3_BUCKET, Key: key }))
    const chunks = []
    for await (const chunk of r.Body) chunks.push(chunk)
    return { buffer: Buffer.concat(chunks), contentType: r.ContentType || 'audio/mpeg' }
  },
}

const render = {
  /** Fresh TTS through the pipeline's own provider + mastering chain. */
  async render ({ text, voiceId, language }) {
    const { provider, voiceId: bare } = decodeVoiceId(voiceId)
    const { audioBuffer } = await tts().generateWithRetry(
      text, provider, ttsOptionsFor(provider, bare, language))
    return phase8().masterAudio(audioBuffer, text)
  },
  /** An upload goes through the identical mastering chain a render does. */
  async master (buffer, text) {
    return phase8().masterAudio(buffer, text)
  },
}

const verify = {
  measure: measureLevel,
  frameDb,
  veracity: (buffer, text, language) => veracity.checkAudioVeracity(buffer, text, language),
}

/** The live core. Built once, on first use. */
function core () {
  if (!_core) {
    _core = createRepairCore({
      supabase: supabaseClient(),
      storage,
      render,
      verify,
      logger: console,
    })
  }
  return _core
}

module.exports = {
  core,
  storage,
  render,
  verify,
  measureLevel,
  frameDb,
  ttsOptionsFor,
  RepairError,
  // Thin pass-throughs so callers can `require('./audio-repair.cjs').accept(...)`.
  propose: (...a) => core().propose(...a),
  preview: (...a) => core().preview(...a),
  accept: (...a) => core().accept(...a),
  reject: (...a) => core().reject(...a),
  revert: (...a) => core().revert(...a),
  queue: (...a) => core().queue(...a),
  seedScopedAudioIds: (...a) => core().seedScopedAudioIds(...a),
  candidateBytes: (...a) => core().candidateBytes(...a),
  currentBytes: (...a) => core().currentBytes(...a),
}
