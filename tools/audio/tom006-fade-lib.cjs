/**
 * Equal-power fade of the final 80 ms of speech, stored as a NEW course_audio row (job #794, Tom 2026-10-12: "E, the 80ms fade: absolutely perfect").
 * No TTS. The source row is never touched, so the swap is undoable. The new row carries the source text plus a 10 ms break tag (the unique key is
 * course+text_normalized+language+role+voice, so the text must differ; the tag is inaudible if the text were ever re-rendered) and spliced_from
 * recording the source id and the operation.
 */
const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process')
const { randomUUID } = require('crypto')
const FADE_MS = 80, EOS_DB = -45, FRAME = 240, MARKER = ' <break time="10ms"/>'
const BUCKET = 'ssi-audio-stage'

function s3() {
  for (const p of ['/home/tomcassidy/ssi-dashboard-v7-clean/.env', '/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod/.env'])
    if (!process.env.AWS_ACCESS_KEY_ID && fs.existsSync(p)) for (const l of fs.readFileSync(p, 'utf8').split('\n')) { const m = /^(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_REGION)=(.*)$/.exec(l.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '') }
  const AWS = require('aws-sdk')
  return new AWS.S3({ accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, region: process.env.AWS_REGION || 'eu-west-1' })
}

/** Pure: ms of the end of the last speech frame (RMS above EOS_DB over 5 ms frames at 48 kHz) in mono float samples; null if none. */
function endOfSpeechMs(samples, sr = 48000) {
  const frame = Math.round(sr * 0.005); let last = -1
  for (let i = 0; i + frame <= samples.length; i += frame) {
    let e = 0; for (let j = i; j < i + frame; j++) e += samples[j] * samples[j]
    if (20 * Math.log10(Math.sqrt(e / frame) + 1e-12) > EOS_DB) last = i + frame
  }
  return last < 0 ? null : Math.round(last / sr * 1000)
}
const decode = file => { const b = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', '48000', '-'], { maxBuffer: 1 << 28 }); return new Float32Array(b.buffer, b.byteOffset, b.length / 4) }

/** mp3 buffer in -> { buffer, durationMs, eosMs } with the equal-power (quarter-sine) fade over the last FADE_MS of speech; the tail after it is untouched. */
function fadeMp3(buf) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tom006-fade-')); const src = path.join(dir, 'in.mp3'), out = path.join(dir, 'out.mp3')
  try {
    fs.writeFileSync(src, buf)
    const eos = endOfSpeechMs(decode(src)); if (eos == null || eos < FADE_MS + 100) throw new Error(`no usable end of speech (eos ${eos})`)
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-af', `afade=t=out:st=${((eos - FADE_MS) / 1000).toFixed(3)}:d=${FADE_MS / 1000}:curve=qsin`, '-ac', '1', '-ar', '48000', '-c:a', 'libmp3lame', '-b:a', '96k', out])
    const durationMs = Math.round(parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString()) * 1000)
    return { buffer: fs.readFileSync(out), durationMs, eosMs: eos }
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
}

/** Make the faded NEW row from source row id (course_audio). Upload first, then insert; never mutates the source. Returns { newId, durationMs, eosMs }. */
async function makeFaded(db, srcId) {
  const { data: src, error } = await db.from('course_audio').select('*').eq('id', srcId).single()
  if (error || !src) throw new Error(`source clip ${srcId} unreadable: ${error && error.message}`)
  const obj = await s3().getObject({ Bucket: BUCKET, Key: src.s3_key }).promise()
  const f = fadeMp3(obj.Body)
  const newId = randomUUID(), key = `mastered/${newId.toUpperCase()}.mp3`
  const { AUDIO_CACHE_CONTROL } = require('../../services/shared/audio-cache-control.cjs')
  await s3().putObject({ Bucket: BUCKET, Key: key, Body: f.buffer, ContentType: 'audio/mpeg', CacheControl: AUDIO_CACHE_CONTROL }).promise()
  const row = { id: newId, course_code: src.course_code, text: src.text + MARKER, language: src.language, role: src.role, voice_id: src.voice_id, origin: src.origin,
    lego_id: src.lego_id, sequence: src.sequence, s3_key: key, duration_ms: f.durationMs, file_size_bytes: f.buffer.length, audio_revision: 1,
    word_timings: src.word_timings, word_boundaries: src.word_boundaries, spliced_from: { source_id: srcId, op: 'fade-out-80ms-equal-power', eos_ms: f.eosMs, job: '#794' } }
  const { error: e2 } = await db.from('course_audio').insert(row)
  if (e2) throw new Error(`faded row insert failed: ${e2.message}`)
  return { newId, durationMs: f.durationMs, eosMs: f.eosMs }
}
module.exports = { makeFaded, fadeMp3, endOfSpeechMs, FADE_MS, MARKER }
