#!/usr/bin/env node
/**
 * Generate Indian-language SHARED audio (instruction / encouragement / paywall)
 * and per-course WELCOME audio for the eng_for_{mar,tel,kan} courses, from the
 * Fable translations staged in temp/indian-shared-2026-07-07/{lang}/{type}.json.
 *
 * Azure Neural TTS (matches the courses' known side), master to -16 LUFS via
 * ffmpeg (falls back to raw if ffmpeg absent), upload S3 mastered/{UUID}.mp3,
 * then:
 *   - instruction/encouragement/paywall  -> INSERT shared_audio (by language)
 *   - welcome                            -> INSERT course_audio (role=welcome, per course)
 * Idempotent: skips an entry whose (language, audio_type, sequence) already
 * exists in shared_audio, or whose (course_code, role=welcome) already exists.
 *
 * Usage:
 *   node generate-indian-shared.cjs --plan
 *   node generate-indian-shared.cjs --execute [--lang mar,tel,kan] [--type instruction,encouragement,paywall,welcome]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execFileSync } = require('child_process')
const { v4: uuidv4 } = require('uuid')
const { createClient } = require('@supabase/supabase-js')
const tts = require('../../services/tts-service.cjs')

const S3_BUCKET = 'ssi-audio-stage'
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1'
const WORK = path.join(__dirname, '../../temp/indian-shared-2026-07-07')

const LANGS = {
  mar: { voice: 'mr-IN-ManoharNeural', course: 'eng_for_mar' },
  tel: { voice: 'te-IN-MohanNeural',   course: 'eng_for_tel' },
  kan: { voice: 'kn-IN-GaganNeural',   course: 'eng_for_kan' },
}
const SHARED_TYPES = ['instruction', 'encouragement', 'paywall']

const args = process.argv.slice(2)
const EXECUTE = args.includes('--execute')
const argVal = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null }
const langFilter = (argVal('--lang') || 'mar,tel,kan').split(',')
const typeFilter = (argVal('--type') || 'instruction,encouragement,paywall,welcome').split(',')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const normalizeText = (t) => (t || '').toLowerCase().trim().replace(/\s+/g, ' ')

let HAS_FFMPEG = true
try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }) } catch { HAS_FFMPEG = false }

function master(buf) {
  if (!HAS_FFMPEG) return buf
  const tmpIn = path.join(os.tmpdir(), `sh_${uuidv4()}.mp3`)
  const tmpOut = path.join(os.tmpdir(), `sh_${uuidv4()}_m.mp3`)
  try {
    fs.writeFileSync(tmpIn, buf)
    execFileSync('ffmpeg', ['-y', '-i', tmpIn, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', '-b:a', '128k', tmpOut], { stdio: 'ignore' })
    return fs.readFileSync(tmpOut)
  } catch { return buf } finally {
    for (const f of [tmpIn, tmpOut]) { try { fs.unlinkSync(f) } catch {} }
  }
}

async function uploadToS3(uuid, buf) {
  const AWS = require('aws-sdk')
  const s3 = new AWS.S3({ accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, region: AWS_REGION })
  const key = `mastered/${uuid}.mp3`
  await s3.putObject({ Bucket: S3_BUCKET, Key: key, Body: buf, ContentType: 'audio/mpeg' }).promise()
  return key
}

async function ttsAzure(voiceName, text) {
  const { audioBuffer } = await tts.generateAzure(text, {
    subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION, voiceName, speed: 1.0,
  })
  return audioBuffer
}

function loadEntries(lang, type) {
  const f = path.join(WORK, lang, `${type}.json`)
  if (!fs.existsSync(f)) return null
  return JSON.parse(fs.readFileSync(f, 'utf8'))
}

async function run() {
  console.log(`ffmpeg mastering: ${HAS_FFMPEG ? 'ON (-16 LUFS)' : 'OFF (raw)'} | mode: ${EXECUTE ? 'EXECUTE' : 'PLAN'}`)
  let totalPlanned = 0, totalDone = 0, totalErr = 0
  for (const lang of langFilter) {
    const cfg = LANGS[lang]; if (!cfg) { console.log(`skip unknown lang ${lang}`); continue }
    // existing shared_audio by (audio_type, sequence)
    const { data: exShared } = await supabase.from('shared_audio').select('audio_type,sequence').eq('language', lang)
    const haveShared = new Set((exShared || []).map(r => `${r.audio_type}:${r.sequence}`))
    // existing welcome course_audio
    const { data: exWel } = await supabase.from('course_audio').select('id').eq('course_code', cfg.course).eq('role', 'welcome')
    const haveWelcome = (exWel || []).length > 0

    for (const type of typeFilter) {
      const entries = loadEntries(lang, type)
      if (!entries) { console.log(`  ${lang}/${type}: NO translation file — skip`); continue }
      let planned = 0, done = 0, err = 0
      for (const e of entries) {
        const isWelcome = type === 'welcome'
        if (isWelcome && haveWelcome) { continue }
        if (!isWelcome && haveShared.has(`${e.audio_type}:${e.sequence}`)) { continue }
        planned++
        if (!EXECUTE) continue
        try {
          const raw = await ttsAzure(cfg.voice, e.text)
          const buf = master(raw)
          const uuid = uuidv4().toUpperCase()
          const key = await uploadToS3(uuid, buf)
          if (isWelcome) {
            // Audio = full translated welcome script (e.text); DB row text = label
            // "welcome" to match existing eng_for_hin/tam welcome rows (role-resolved).
            await supabase.from('course_audio').insert({
              course_code: cfg.course, role: 'welcome', language: lang, text: 'welcome',
              text_normalized: 'welcome', voice_id: `azure_${cfg.voice}`, origin: 'tts', s3_key: key,
            })
          } else {
            await supabase.from('shared_audio').insert({
              language: lang, audio_type: e.audio_type, sequence: e.sequence, text: e.text,
              text_normalized: normalizeText(e.text), voice_id: `azure_${cfg.voice}`, origin: 'tts', s3_key: key,
            })
          }
          done++
        } catch (ex) { err++; console.log(`    ERR ${lang}/${type}#${e.sequence}: ${ex.message}`) }
      }
      console.log(`  ${lang}/${type}: ${planned} to generate${EXECUTE ? ` | done ${done} | err ${err}` : ''}`)
      totalPlanned += planned; totalDone += done; totalErr += err
    }
  }
  console.log(`\nTOTAL planned ${totalPlanned}${EXECUTE ? ` | done ${totalDone} | err ${totalErr}` : ' (run with --execute)'}`)
  process.exit(totalErr ? 1 : 0)
}
run().catch(e => { console.error(e); process.exit(1) })
