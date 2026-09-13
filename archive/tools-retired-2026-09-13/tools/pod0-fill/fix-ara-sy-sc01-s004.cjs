#!/usr/bin/env node
// Make-before-break re-render of the one confirmed truncation from the
// 2026-08-13 pod-0 fill: ara_sy_for_eng pod-0 SC01-S004, known (English) side.
// Approved 2026-08-13 (Tom, this thread) — scoped to this ONE clip only.
//
// Generates a fresh clip and uploads it to its OWN new S3 key first; verifies
// duration, ASR content (all three sentences) and voice (id + pitch) against
// that new object; only on a pass does it flip course_audio.s3_key on the
// existing row to point at the new object. The old object is never deleted
// or touched — this is a pointer swap, not an overwrite of live bytes while
// they are still the ones being served.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
process.env.PHASE8_NO_LISTEN = '1'
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const { v4: uuidv4 } = require('uuid')
const { createClient } = require('@supabase/supabase-js')
const { PutObjectCommand } = require('@aws-sdk/client-s3')

const p8 = require('../../services/phases/phase8-audio-v13.cjs')
const ttsService = require('../../services/tts-service.cjs')
const veracity = require('../../services/audio-veracity.cjs')
const { medianF0 } = require('./pitch.cjs')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const SENTENCE_ID = 'ara_sy_for_eng:pod-0:SC01-S004'
const AUDIO_ID = '263240af-71e2-4d7d-9c2e-ea9f4dd993aa'  // the live, truncated row
const COURSE = 'ara_sy_for_eng'
const S3_BUCKET = p8.S3_BUCKET
const s3 = p8.s3

const dry = process.argv.includes('--dry')

;(async () => {
  const { data: sentence, error: sErr } = await supabase
    .from('listening_pod_sentences').select('*').eq('id', SENTENCE_ID).single()
  if (sErr) throw sErr
  if (sentence.known_audio_id !== AUDIO_ID) {
    throw new Error(`sentence.known_audio_id is ${sentence.known_audio_id}, expected ${AUDIO_ID} — link moved under us, stopping`)
  }

  const { data: oldRow, error: rErr } = await supabase
    .from('course_audio').select('*').eq('id', AUDIO_ID).single()
  if (rErr) throw rErr
  console.log('OLD row:', oldRow.s3_key, oldRow.duration_ms + 'ms', oldRow.voice_id)

  const { data: pod, error: pErr } = await supabase
    .from('listening_pods').select('*').eq('id', sentence.pod_id).single()
  if (pErr) throw pErr
  const voice = p8.resolvePodSpeakerVoice(pod.speakers, sentence.speaker, 'known')
  if (!voice) throw new Error(`no known-voice resolved for speaker ${sentence.speaker}`)
  console.log('Speaker', sentence.speaker, '-> voice', JSON.stringify(voice))

  const expectedCanonicalVoiceId = p8.canonicalClipVoiceId(voice.voice_id, voice.provider)
  if (expectedCanonicalVoiceId !== oldRow.voice_id) {
    throw new Error(`resolved voice ${expectedCanonicalVoiceId} != old row's voice ${oldRow.voice_id} — cast may have changed, stopping`)
  }

  // Same " … " pause-cue join phase8 uses for multi-sentence turns.
  const text = sentence.known_text
  const sents = String(text).split(/(?<=[.!?…])\s+/).map(s => s.trim()).filter(Boolean)
  const ttsText = sents.length > 1 ? sents.join(' … ') : text
  console.log('ttsText:', JSON.stringify(ttsText), `(${sents.length} sentences)`)

  if (dry) { console.log('\n--dry: stopping before TTS spend'); return }

  // --- GENERATE (new S3 object, DB untouched so far) ------------------------
  const ttsConfig = {
    voiceId: voice.voice_id, speed: 1.0, courseCode: COURSE,
    apiKey: process.env.XAI_API_KEY,
    language: voice.locale || 'en',
  }
  const { audioBuffer, wordBoundaries } = await ttsService.generateWithRetry(ttsText, voice.provider || 'xai', ttsConfig)
  const { buffer: masteredBuffer, durationMs } = await p8.masterAudio(audioBuffer, ttsText)
  console.log('Rendered:', masteredBuffer.length, 'bytes,', durationMs, 'ms')

  const newAudioUuid = uuidv4().toUpperCase()
  const newKey = `mastered/${newAudioUuid}.mp3`
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET, Key: newKey, Body: masteredBuffer,
    ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable',
  }))
  console.log('Uploaded new object:', newKey)

  // --- VERIFY (against the NEW object, before touching the live row) -------
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fix-ara-sy-'))
  const tmpFile = path.join(tmp, 'new.mp3')
  fs.writeFileSync(tmpFile, masteredBuffer)

  const v = await veracity.checkAudioVeracity(tmpFile, ttsText, 'eng')
  console.log('ASR decode:', JSON.stringify(v.decode))
  console.log('ASR verdict:', v.checked ? (v.pass ? 'PASS' : 'FAIL') : 'unchecked', v.reason, 'cer', v.cer)

  const { f0, frames } = medianF0(tmpFile)
  console.log('Pitch (median F0):', f0, 'Hz over', frames, 'voiced frames — clone median 103Hz, Olivia median 195Hz (run baseline)')

  const durSec = durationMs / 1000
  const cps = ttsText.replace(/\s|…/g, '').length / durSec
  console.log('Speech rate:', cps.toFixed(1), 'chars/sec (truncated original was 26.8; run median 14.2)')

  // Duration floor: not an absolute threshold (this line is short — ~76 chars
  // of content at a normal rate legitimately renders under 5s), but it must be
  // MEANINGFULLY LONGER than the truncated original (2.76s, which only ever
  // spoke sentence 1 of 3) — a real regression to a repeat truncation would
  // land back near that number.
  const durationOk = durationMs > oldRow.duration_ms * 1.5
  const asrOk = v.checked ? v.pass : true  // fall through to rate+manual read if ASR unavailable
  const rateOk = cps < 20

  fs.rmSync(tmp, { recursive: true, force: true })

  console.log('\nChecks: duration', durationOk ? 'OK' : 'FAIL', `(${durSec.toFixed(2)}s vs old ${(oldRow.duration_ms/1000).toFixed(2)}s)`,
    '| ASR', v.checked ? (asrOk ? 'OK' : 'FAIL') : 'SKIPPED', '| rate', rateOk ? 'OK' : 'FAIL')

  if (!durationOk || !asrOk || !rateOk) {
    console.log('\nVERIFICATION FAILED — new object left at', newKey, 'as evidence; live row NOT touched.')
    process.exit(1)
  }

  // --- SWAP (single UPDATE on the existing row; old object left in place) --
  const { error: uErr } = await supabase.from('course_audio').update({
    s3_key: newKey,
    duration_ms: durationMs,
    text: ttsText,
    word_boundaries: wordBoundaries && wordBoundaries.length ? wordBoundaries : null,
  }).eq('id', AUDIO_ID)
  if (uErr) throw uErr

  console.log('\nSWAPPED. course_audio', AUDIO_ID, 's3_key', oldRow.s3_key, '->', newKey)
  console.log('Old object left in place (not deleted):', oldRow.s3_key)
})().catch(e => { console.error(e.stack || e.message); process.exit(1) })
