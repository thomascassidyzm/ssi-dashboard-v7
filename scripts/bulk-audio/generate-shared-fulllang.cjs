#!/usr/bin/env node
/**
 * Generate full shared audio (48 instructions + 50 encouragements) for languages
 * that have translations (data/translations/encouragements/{lang}.json) but no audio.
 *   - orderedEncouragements = the 48 instructions, ALREADY in canonical order
 *     -> audio_type='instruction', sequence = index+1
 *   - pooledEncouragements  = the 50 encouragements (unordered pool)
 *     -> audio_type='encouragement', sequence = null
 * Voice: voice-selections.json chosen index into voices.json (ElevenLabs).
 * Masters -16 LUFS, uploads S3, inserts shared_audio. Idempotent by (lang,type,sequence)
 * for instructions and (lang, text) for encouragements. Retries ElevenLabs 3x.
 *
 * Usage: node generate-shared-fulllang.cjs --lang afr,cym,... [--execute]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
const fs = require('fs'); const path = require('path'); const os = require('os')
const { execFileSync } = require('child_process')
const { v4: uuidv4 } = require('uuid')
const { createClient } = require('@supabase/supabase-js')
const tts = require('../../services/tts-service.cjs')

const S3_BUCKET = 'ssi-audio-stage'
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1'
const TRANS = path.join(__dirname, 'data/translations/encouragements')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const voicesJson = require('./data/voices.json').voices
const voiceSel = require('./data/voice-selections.json')
const norm = t => (t || '').toLowerCase().trim().replace(/\s+/g, ' ')

const args = process.argv.slice(2)
const EXECUTE = args.includes('--execute')
const argVal = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null }
const langs = (argVal('--lang') || '').split(',').filter(Boolean)

let HAS_FFMPEG = true; try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }) } catch { HAS_FFMPEG = false }
function master(buf) {
  if (!HAS_FFMPEG) return buf
  const a = path.join(os.tmpdir(), `s_${uuidv4()}.mp3`), b = path.join(os.tmpdir(), `s_${uuidv4()}m.mp3`)
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
  let lastErr
  for (let i = 0; i < 3; i++) {
    try { const { audioBuffer } = await tts.generateElevenLabs(text, { apiKey: process.env.ELEVENLABS_API_KEY, voiceId }); return audioBuffer }
    catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 1500 * (i + 1))) }
  }
  throw lastErr
}
function resolveVoice(lang) {
  const entry = voicesJson[lang]; if (!entry || !entry.voices || !entry.voices.length) return null
  const idx = (voiceSel[lang] && typeof voiceSel[lang].index === 'number') ? voiceSel[lang].index : 0
  const v = entry.voices[idx] || entry.voices[0]
  return v ? v.voice_id : null
}

async function run() {
  console.log(`ffmpeg: ${HAS_FFMPEG ? 'ON' : 'OFF'} | mode: ${EXECUTE ? 'EXECUTE' : 'PLAN'}`)
  let gTot = 0, gDone = 0, gErr = 0
  for (const lang of langs) {
    const f = path.join(TRANS, `${lang}.json`)
    if (!fs.existsSync(f)) { console.log(`${lang}: no translation file — skip`); continue }
    const voiceId = resolveVoice(lang)
    if (!voiceId) { console.log(`${lang}: NO VOICE — skip`); continue }
    const d = JSON.parse(fs.readFileSync(f, 'utf8'))
    const instr = (d.orderedEncouragements || []).map((r, i) => ({ text: r.text || r, seq: i + 1 }))
    const enc = (d.pooledEncouragements || []).map(r => ({ text: r.text || r }))
    // existing to skip
    const { data: ex } = await supabase.from('shared_audio').select('audio_type,sequence,text_normalized').eq('language', lang)
    const haveInstr = new Set((ex || []).filter(r => r.audio_type === 'instruction').map(r => r.sequence))
    const haveEnc = new Set((ex || []).filter(r => r.audio_type === 'encouragement').map(r => r.text_normalized))
    const jobs = []
    for (const it of instr) if (!haveInstr.has(it.seq)) jobs.push({ type: 'instruction', ...it })
    for (const e of enc) if (!haveEnc.has(norm(e.text))) jobs.push({ type: 'encouragement', text: e.text, seq: null })
    console.log(`${lang}: voice=${voiceId} | instr ${instr.length} enc ${enc.length} | to generate ${jobs.length}`)
    gTot += jobs.length
    if (!EXECUTE) continue
    let done = 0, err = 0
    for (const j of jobs) {
      try {
        const buf = master(await synth(voiceId, j.text))
        const key = await uploadToS3(uuidv4().toUpperCase(), buf)
        const { error } = await supabase.from('shared_audio').insert({ language: lang, audio_type: j.type, sequence: j.seq, text: j.text, text_normalized: norm(j.text), voice_id: `elevenlabs_${voiceId}`, origin: 'tts', s3_key: key })
        if (error) { err++; console.log(`  ERR ${lang} ${j.type}#${j.seq}: ${error.message}`) } else done++
      } catch (e) { err++; console.log(`  ERR ${lang} ${j.type}#${j.seq}: ${e.message}`) }
    }
    gDone += done; gErr += err
    console.log(`  ${lang}: done ${done} err ${err}`)
  }
  console.log(`\nTOTAL to generate ${gTot}${EXECUTE ? ` | done ${gDone} | err ${gErr}` : ' (--execute)'}`)
  process.exit(gErr ? 1 : 0)
}
run().catch(e => { console.error(e); process.exit(1) })
