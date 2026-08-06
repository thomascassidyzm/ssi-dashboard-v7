#!/usr/bin/env node
/**
 * Generate paywall audio (101 clips, sequence 1..101) for languages that lack it.
 * Reads temp/paywall-backfill/{lang}.json (JSON array of 101 strings, in order).
 * Reuses each language's EXISTING shared-audio voice (from any instruction/encouragement
 * row) — ElevenLabs or Azure. Masters -16 LUFS, uploads S3, inserts shared_audio.
 * Idempotent by (lang, audio_type=paywall, sequence).
 *
 * Usage: node generate-paywall-backfill.cjs --lang rus,pol,... [--execute]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
const fs = require('fs'); const path = require('path'); const os = require('os')
const { execFileSync } = require('child_process')
const { v4: uuidv4 } = require('uuid')
const { createClient } = require('@supabase/supabase-js')
const tts = require('../../services/tts-service.cjs')

const S3_BUCKET = 'ssi-audio-stage'
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1'
const WORK = path.join(__dirname, '../../temp/paywall-backfill')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const norm = t => (t || '').toLowerCase().trim().replace(/\s+/g, ' ')

const args = process.argv.slice(2)
const EXECUTE = args.includes('--execute')
const argVal = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null }
const langs = (argVal('--lang') || '').split(',').filter(Boolean)

let HAS_FFMPEG = true; try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }) } catch { HAS_FFMPEG = false }
function master(buf) {
  if (!HAS_FFMPEG) return buf
  const a = path.join(os.tmpdir(), `p_${uuidv4()}.mp3`), b = path.join(os.tmpdir(), `p_${uuidv4()}m.mp3`)
  try { fs.writeFileSync(a, buf); execFileSync('ffmpeg', ['-y','-i',a,'-af','loudnorm=I=-16:TP=-1.5:LRA=11','-ar','44100','-b:a','128k',b], { stdio:'ignore' }); return fs.readFileSync(b) }
  catch { return buf } finally { for (const f of [a,b]) { try { fs.unlinkSync(f) } catch {} } }
}
async function uploadToS3(uuid, buf) {
  const AWS = require('aws-sdk')
  const s3 = new AWS.S3({ accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, region: AWS_REGION })
  const key = `mastered/${uuid}.mp3`
  await s3.putObject({ Bucket: S3_BUCKET, Key: key, Body: buf, ContentType: 'audio/mpeg' }).promise()
  return key
}
let ROUTING = {}; try { ROUTING = require('../../temp/regender/new-lang-routing.json') } catch {}
async function synth(voiceId, text, lang) {
  let lastErr
  for (let i = 0; i < 3; i++) {
    try {
      if (voiceId.startsWith('elevenlabs_')) { const { audioBuffer } = await tts.generateElevenLabs(text, { apiKey: process.env.ELEVENLABS_API_KEY, voiceId: voiceId.replace(/^elevenlabs_/, '') }); return audioBuffer }
      if (voiceId.startsWith('azure_')) { const { audioBuffer } = await tts.generateAzure(text, { subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION, voiceName: voiceId.replace(/^azure_/, ''), speed: 1.0 }); return audioBuffer }
      if (voiceId.startsWith('xai_')) { const xaiLang = (ROUTING[lang] && ROUTING[lang].xaiLang) || 'auto'; const { audioBuffer } = await tts.generateXai(text, { apiKey: process.env.XAI_API_KEY, voiceId: voiceId.replace(/^xai_/, ''), language: xaiLang }); return audioBuffer }
      throw new Error(`unknown voice provider: ${voiceId}`)
    } catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 1500 * (i + 1))) }
  }
  throw lastErr
}

async function run() {
  console.log(`ffmpeg: ${HAS_FFMPEG ? 'ON' : 'OFF'} | mode: ${EXECUTE ? 'EXECUTE' : 'PLAN'}`)
  let gTot = 0, gDone = 0, gErr = 0
  for (const lang of langs) {
    const f = path.join(WORK, `${lang}.json`)
    if (!fs.existsSync(f)) { console.log(`${lang}: no translation — skip`); continue }
    const texts = JSON.parse(fs.readFileSync(f, 'utf8'))
    if (texts.length !== 101) { console.log(`${lang}: ${texts.length} entries (expected 101) — SKIP`); continue }
    // derive voice from any existing shared-audio row for this language
    const { data: ex } = await supabase.from('shared_audio').select('voice_id,audio_type,sequence').eq('language', lang)
    const voiceRow = (ex || []).find(r => r.audio_type === 'encouragement' || r.audio_type === 'instruction')
    if (!voiceRow) { console.log(`${lang}: no existing shared audio to derive voice — SKIP`); continue }
    const voiceId = voiceRow.voice_id
    const havePw = new Set((ex || []).filter(r => r.audio_type === 'paywall').map(r => r.sequence))
    const jobs = texts.map((t, i) => ({ text: t, seq: i + 1 })).filter(j => !havePw.has(j.seq))
    console.log(`${lang}: voice=${voiceId} | to generate ${jobs.length}/101`)
    gTot += jobs.length
    if (!EXECUTE) continue
    let done = 0, err = 0
    for (const j of jobs) {
      try {
        const buf = master(await synth(voiceId, j.text, lang))
        const key = await uploadToS3(uuidv4().toUpperCase(), buf)
        const { error } = await supabase.from('shared_audio').insert({ language: lang, audio_type: 'paywall', sequence: j.seq, text: j.text, text_normalized: norm(j.text), voice_id: voiceId, origin: 'tts', s3_key: key })
        if (error) { err++; console.log(`  ERR ${lang}#${j.seq}: ${error.message}`) } else done++
      } catch (e) { err++; console.log(`  ERR ${lang}#${j.seq}: ${e.message}`) }
    }
    gDone += done; gErr += err
    const { count } = await supabase.from('shared_audio').select('*', { count: 'exact', head: true }).eq('language', lang).eq('audio_type', 'paywall')
    console.log(`  ${lang}: done ${done} err ${err} | now ${count} paywall`)
  }
  console.log(`\nTOTAL to generate ${gTot}${EXECUTE ? ` | done ${gDone} | err ${gErr}` : ' (--execute)'}`)
  process.exit(gErr ? 1 : 0)
}
run().catch(e => { console.error(e); process.exit(1) })
