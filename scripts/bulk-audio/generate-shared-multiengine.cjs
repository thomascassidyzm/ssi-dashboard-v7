#!/usr/bin/env node
/**
 * Generate shared audio (48 instructions canonical-ordered + 50 encouragements) for the
 * remaining NEW languages, routed per temp/regender/new-lang-routing.json:
 *   voiceId prefix azure_ -> Azure, xai_ -> xAI (with .xaiLang BCP-47 code), elevenlabs_ -> EL.
 * Source text: data/translations/encouragements/{lang}.json (orderedEncouragements=48 instr
 * already canonical; pooledEncouragements=50 enc). Masters -16 LUFS, S3, insert shared_audio.
 * Consistency: before generating, DELETES any existing inst/enc rows for the lang whose
 * voice_id != the routed voice (wipes wrong-engine partials so a language ends up single-voice).
 * Idempotent for matching-voice rows. Retries synth 3x.
 *
 * Usage: node generate-shared-multiengine.cjs --lang cym,heb,... [--execute]
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
const ROUTING = require('../../temp/regender/new-lang-routing.json')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const norm = t => (t || '').toLowerCase().trim().replace(/\s+/g, ' ')

const args = process.argv.slice(2)
const EXECUTE = args.includes('--execute')
const argVal = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null }
const langs = (argVal('--lang') || Object.keys(ROUTING).filter(k => !k.startsWith('_')).join(',')).split(',').filter(Boolean)

let HAS_FFMPEG = true; try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }) } catch { HAS_FFMPEG = false }
function master(buf) {
  if (!HAS_FFMPEG) return buf
  const a = path.join(os.tmpdir(), `m_${uuidv4()}.mp3`), b = path.join(os.tmpdir(), `m_${uuidv4()}m.mp3`)
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
async function synth(voiceId, text, xaiLang) {
  let lastErr
  for (let i = 0; i < 3; i++) {
    try {
      if (voiceId.startsWith('azure_')) { const { audioBuffer } = await tts.generateAzure(text, { subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION, voiceName: voiceId.replace(/^azure_/, ''), speed: 1.0 }); return audioBuffer }
      if (voiceId.startsWith('xai_')) { const { audioBuffer } = await tts.generateXai(text, { apiKey: process.env.XAI_API_KEY, voiceId: voiceId.replace(/^xai_/, ''), language: xaiLang || 'auto' }); return audioBuffer }
      if (voiceId.startsWith('elevenlabs_')) { const { audioBuffer } = await tts.generateElevenLabs(text, { apiKey: process.env.ELEVENLABS_API_KEY, voiceId: voiceId.replace(/^elevenlabs_/, '') }); return audioBuffer }
      throw new Error(`unknown provider: ${voiceId}`)
    } catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 1500 * (i + 1))) }
  }
  throw lastErr
}

async function run() {
  console.log(`ffmpeg: ${HAS_FFMPEG ? 'ON' : 'OFF'} | mode: ${EXECUTE ? 'EXECUTE' : 'PLAN'}`)
  let gTot = 0, gDone = 0, gErr = 0
  for (const lang of langs) {
    const route = ROUTING[lang]
    if (!route) { console.log(`${lang}: no routing — skip`); continue }
    const f = path.join(TRANS, `${lang}.json`)
    if (!fs.existsSync(f)) { console.log(`${lang}: no translation — skip`); continue }
    const { voiceId, xaiLang } = route
    const d = JSON.parse(fs.readFileSync(f, 'utf8'))
    const instr = (d.orderedEncouragements || []).map((r, i) => ({ type: 'instruction', text: r.text || r, seq: i + 1 }))
    const enc = (d.pooledEncouragements || []).map(r => ({ type: 'encouragement', text: r.text || r, seq: null }))
    // wipe wrong-engine partial rows
    const { data: ex } = await supabase.from('shared_audio').select('id,voice_id,audio_type,sequence,text_normalized').eq('language', lang).in('audio_type', ['instruction', 'encouragement'])
    const wrong = (ex || []).filter(r => r.voice_id !== voiceId)
    if (wrong.length && EXECUTE) { for (const r of wrong) await supabase.from('shared_audio').delete().eq('id', r.id) }
    const kept = (ex || []).filter(r => r.voice_id === voiceId)
    const haveInstr = new Set(kept.filter(r => r.audio_type === 'instruction').map(r => r.sequence))
    const haveEnc = new Set(kept.filter(r => r.audio_type === 'encouragement').map(r => r.text_normalized))
    const jobs = [...instr.filter(j => !haveInstr.has(j.seq)), ...enc.filter(j => !haveEnc.has(norm(j.text)))]
    console.log(`${lang}: ${voiceId}${xaiLang ? '/' + xaiLang : ''} | wipe ${wrong.length} | to generate ${jobs.length}`)
    gTot += jobs.length
    if (!EXECUTE) continue
    let done = 0, err = 0
    for (const j of jobs) {
      try {
        const buf = master(await synth(voiceId, j.text, xaiLang))
        const key = await uploadToS3(uuidv4().toUpperCase(), buf)
        const { error } = await supabase.from('shared_audio').insert({ language: lang, audio_type: j.type, sequence: j.seq, text: j.text, text_normalized: norm(j.text), voice_id: voiceId, origin: 'tts', s3_key: key })
        if (error) { err++; console.log(`  ERR ${lang} ${j.type}#${j.seq}: ${error.message}`) } else done++
      } catch (e) { err++; console.log(`  ERR ${lang} ${j.type}#${j.seq}: ${String(e.message).slice(0,120)}`) }
    }
    gDone += done; gErr += err
    console.log(`  ${lang}: done ${done} err ${err}`)
  }
  console.log(`\nTOTAL to generate ${gTot}${EXECUTE ? ` | done ${gDone} | err ${gErr}` : ' (--execute)'}`)
  process.exit(gErr ? 1 : 0)
}
run().catch(e => { console.error(e); process.exit(1) })
