#!/usr/bin/env node
/**
 * Backfill the 2 missing encouragements (48 -> 50) for the languages that are short.
 * Reuses each language's EXISTING encouragement voice/engine (ElevenLabs or Azure),
 * reads translations from temp/enc-backfill/{lang}.json ([str, str]), masters to
 * -16 LUFS, uploads S3, inserts shared_audio (audio_type=encouragement, sequence=null).
 * Idempotent: skips a text already present for that language.
 *
 * Usage: node generate-enc-backfill.cjs --plan | --execute [--lang ara,deu,...]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
const fs = require('fs'); const path = require('path'); const os = require('os')
const { execFileSync } = require('child_process')
const { v4: uuidv4 } = require('uuid')
const { createClient } = require('@supabase/supabase-js')
const tts = require('../../services/tts-service.cjs')

const S3_BUCKET = 'ssi-audio-stage'
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1'
const WORK = path.join(__dirname, '../../temp/enc-backfill')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const norm = t => (t || '').toLowerCase().trim().replace(/\s+/g, ' ')

const args = process.argv.slice(2)
const EXECUTE = args.includes('--execute')
const argVal = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null }
const ALL19 = ['ara','ben','deu','fra','guj','ita','jpn','kan','kor','lit','mar','pan','por','sin','spa','tam','tel','urd','zho']
const langs = (argVal('--lang') || ALL19.join(',')).split(',')

let HAS_FFMPEG = true; try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }) } catch { HAS_FFMPEG = false }
function master(buf) {
  if (!HAS_FFMPEG) return buf
  const a = path.join(os.tmpdir(), `e_${uuidv4()}.mp3`), b = path.join(os.tmpdir(), `e_${uuidv4()}m.mp3`)
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
async function synth(voiceId, text) {
  if (voiceId.startsWith('elevenlabs_')) {
    const { audioBuffer } = await tts.generateElevenLabs(text, { apiKey: process.env.ELEVENLABS_API_KEY, voiceId: voiceId.replace(/^elevenlabs_/, '') })
    return audioBuffer
  }
  if (voiceId.startsWith('azure_')) {
    const { audioBuffer } = await tts.generateAzure(text, { subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION, voiceName: voiceId.replace(/^azure_/, ''), speed: 1.0 })
    return audioBuffer
  }
  throw new Error(`unknown voice provider: ${voiceId}`)
}

async function run() {
  console.log(`ffmpeg: ${HAS_FFMPEG ? 'ON' : 'OFF'} | mode: ${EXECUTE ? 'EXECUTE' : 'PLAN'}`)
  let totalPlanned = 0, totalDone = 0, totalErr = 0
  for (const lang of langs) {
    const f = path.join(WORK, `${lang}.json`)
    if (!fs.existsSync(f)) { console.log(`  ${lang}: NO translation file — skip`); continue }
    const texts = JSON.parse(fs.readFileSync(f, 'utf8'))
    // existing encouragements: voice_id + which texts already present
    const { data: existing } = await supabase.from('shared_audio').select('voice_id,text_normalized').eq('language', lang).eq('audio_type', 'encouragement')
    if (!existing || !existing.length) { console.log(`  ${lang}: no existing encouragements to derive voice — skip`); continue }
    const voiceId = existing[0].voice_id
    const have = new Set(existing.map(r => r.text_normalized))
    const todo = texts.filter(t => !have.has(norm(t)))
    console.log(`  ${lang}: voice=${voiceId} | existing=${existing.length} | to add=${todo.length}`)
    totalPlanned += todo.length
    if (!EXECUTE) continue
    for (const text of todo) {
      try {
        const buf = master(await synth(voiceId, text))
        const key = await uploadToS3(uuidv4().toUpperCase(), buf)
        const { error } = await supabase.from('shared_audio').insert({ language: lang, audio_type: 'encouragement', sequence: null, text, text_normalized: norm(text), voice_id: voiceId, origin: 'tts', s3_key: key })
        if (error) { totalErr++; console.log(`    ERR ${lang}: ${error.message}`) } else totalDone++
      } catch (e) { totalErr++; console.log(`    ERR ${lang}: ${e.message}`) }
    }
    const { count } = await supabase.from('shared_audio').select('*', { count: 'exact', head: true }).eq('language', lang).eq('audio_type', 'encouragement')
    console.log(`     ${lang} now at ${count} encouragements`)
  }
  console.log(`\nTOTAL planned ${totalPlanned}${EXECUTE ? ` | done ${totalDone} | err ${totalErr}` : ' (run --execute)'}`)
  process.exit(totalErr ? 1 : 0)
}
run().catch(e => { console.error(e); process.exit(1) })
