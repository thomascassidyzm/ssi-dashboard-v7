// A-134 RENDER worker (SONNET) — 12 eng_for_sin presentation clips that carry a real
// example sentence, where #823's headword-only text was superseded by the composer's
// pick (recomposed.json, changes_vs_823 === true). Renders presText EXACTLY as it
// stands — no edits to the text.
//
// Same recipe as #823 (docs/a134-sin27-2026-08-17/README.md): Azure si-LK-SameeraNeural
// speed 1, read from courses.voice_config not hardcoded; mastered on the compressor-free
// chain (667a6e09, already cherry-picked onto this branch — masterAudio() below is the
// live phase8 function, calling normalizeAudioClean).
//
// Nothing goes to S3 or the DB here — this only renders, masters, and gates locally.
// Passing takes land in scripts/a134-C/ship/, every take (pass or fail) in
// scripts/a134-C/spares/. Upload is a separate step once every clip has a shipping take.
process.env.PHASE8_NO_LISTEN = '1'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const ttsService = require('../../services/tts-service.cjs')
const phase8 = require('../../services/phases/phase8-audio-v13.cjs')
const { runGates } = require('./gates.cjs')

const COURSE = 'eng_for_sin'
const SHIP_DIR = path.join(__dirname, 'ship')
const SPARE_DIR = path.join(__dirname, 'spares')
const MAX_ATTEMPTS = 3   // brief's spend ceiling is ~60 renders; 12 clips x 3 = 36, well inside it

async function dbUrl() {
  const f = path.resolve(__dirname, '../../.env.psql')
  return fs.readFileSync(f, 'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
}

async function loadVoiceConfig() {
  const db = new Client({ connectionString: await dbUrl(), ssl: { rejectUnauthorized: false } })
  await db.connect()
  const r = await db.query(`select voice_config from courses where course_code=$1`, [COURSE])
  await db.end()
  const v = r.rows[0].voice_config.voices.presentation
  if (v.provider !== 'azure') throw new Error(`expected azure, voice_config says ${v.provider}`)
  return v
}

async function renderOnce(text, voiceCfg, attempt) {
  const { audioBuffer, wordBoundaries } = await ttsService.generateWithRetry(text, 'azure', {
    subscriptionKey: process.env.AZURE_SPEECH_KEY,
    region: process.env.AZURE_SPEECH_REGION,
    voiceName: voiceCfg.voiceId,
    speed: voiceCfg.settings?.speed ?? 1,
    regenerationAttempt: attempt,
  })
  const { buffer, durationMs } = await phase8.masterAudio(audioBuffer, text)
  return { buffer, durationMs, wordBoundaries }
}

async function main() {
  fs.mkdirSync(SHIP_DIR, { recursive: true })
  fs.mkdirSync(SPARE_DIR, { recursive: true })

  const rows = require('../a134/recomposed.json').filter(r => r.changes_vs_823 === true)
  console.log(`${rows.length} clips to render (expected 12)`)

  const voiceCfg = await loadVoiceConfig()
  console.log('voice:', JSON.stringify(voiceCfg))

  const shipLog = []
  for (const row of rows) {
    const text = row.presText
    let shipped = null
    let allAttempts = []
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      console.log(`\n${row.lego_id} attempt ${attempt}: rendering...`)
      const { buffer, durationMs, wordBoundaries } = await renderOnce(text, voiceCfg, attempt - 1)
      const spareFile = path.join(SPARE_DIR, `${row.lego_id}-attempt${attempt}.mp3`)
      fs.writeFileSync(spareFile, buffer)
      const gates = runGates(row, text, wordBoundaries, durationMs, spareFile)
      const entry = {
        lego_id: row.lego_id, attempt, file: spareFile, bytes: buffer.length,
        ms: durationMs, word_boundaries: wordBoundaries, ...gates,
      }
      allAttempts.push(entry)
      console.log(`  ms=${durationMs} z=${gates.z.toFixed(2)} tail=${gates.tail?.toFixed(1)}dB tokens=${gates.tokens} fail=${JSON.stringify(gates.fail)}`)
      if (gates.fail.length === 0) {
        shipped = entry
        break
      }
      console.log(`  MARGINAL/FAILED, re-rendering (spare kept at ${spareFile})`)
    }
    if (shipped) {
      const shipFile = path.join(SHIP_DIR, `${row.lego_id}.mp3`)
      fs.copyFileSync(shipped.file, shipFile)
      shipLog.push({
        lego_id: row.lego_id,
        headword: row.card_known,
        contextText: row.contextText,
        presText: text,
        file: shipFile,
        bytes: shipped.bytes,
        attempt: shipped.attempt,
        total_attempts: allAttempts.length,
        word_boundaries: shipped.word_boundaries,
        ms: shipped.ms,
        z: shipped.z,
        tail: shipped.tail,
        tokens: shipped.tokens,
        fail: shipped.fail,
        gate7_example_voiced: shipped.gate7_example_voiced,
      })
    } else {
      console.error(`\n${row.lego_id}: NO PASSING TAKE after ${MAX_ATTEMPTS} attempts`)
      shipLog.push({
        lego_id: row.lego_id, headword: row.card_known, contextText: row.contextText,
        presText: text, file: null, shipped: false,
        all_attempts: allAttempts.map(a => ({ attempt: a.attempt, fail: a.fail, ms: a.ms, z: a.z, tail: a.tail })),
      })
    }
  }

  const outFile = path.join(__dirname, 'ship-log-12.json')
  fs.writeFileSync(outFile, JSON.stringify(shipLog, null, 1))
  const shippedCount = shipLog.filter(r => r.file).length
  console.log(`\n${shippedCount}/${rows.length} shipped. Log at ${outFile}`)
}

main().catch(e => { console.error('ABORT:', e.stack || e.message); process.exit(1) })
