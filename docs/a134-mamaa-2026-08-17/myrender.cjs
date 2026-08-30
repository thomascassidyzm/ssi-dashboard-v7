// A-134 මමා — render the 69 shippable presentation recompositions.
//
// Nothing reaches S3 or the DB here. This renders on the course's own voice,
// masters through phase8's masterAudio (which on this branch calls
// normalizeAudioClean — the compressor-free chain), and gates locally with
// mygates.cjs. Passing takes land in ship/; EVERY take, pass or fail, is kept in
// spares/ so a rejection is auditable and a spare is available.
//
// Spend: 69 clips x ~90 chars on the Azure neural path. Authorised by Kai
// 2026-08-17 ("spend and going-live are AUTHORISED").
process.env.PHASE8_NO_LISTEN = '1'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const ttsService = require('../../services/tts-service.cjs')
const phase8 = require('../../services/phases/phase8-audio-v13.cjs')
const { runGates } = require('./mygates.cjs')

const COURSE = 'eng_for_sin'
const SHIP_DIR = path.join(__dirname, 'ship')
const SPARE_DIR = path.join(__dirname, 'spares')
const MAX_ATTEMPTS = 3
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null

function dbUrl() {
  return fs.readFileSync(path.resolve(__dirname, '../../.env.psql'), 'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
}
async function loadVoiceConfig(db) {
  const r = await db.query(`select voice_config from courses where course_code=$1`, [COURSE])
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
  let rows = require('./ship-plan.json')
  if (ONLY) rows = rows.filter(r => ONLY.includes(r.lego))
  console.log(`${rows.length} clips to render`)

  const db = new Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } })
  await db.connect()
  const voiceCfg = await loadVoiceConfig(db)
  console.log('voice:', JSON.stringify(voiceCfg))
  await db.end()

  const shipLog = []
  for (const row of rows) {
    // gates need the headword and example slots named separately
    const gateRow = { kind: 'presentation', headword: row.cardKnown,
                      contextText: row.contextText, fullText: row.newText }
    const text = row.newText
    let shipped = null
    const allAttempts = []
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const { buffer, durationMs, wordBoundaries } = await renderOnce(text, voiceCfg, attempt - 1)
      const spareFile = path.join(SPARE_DIR, `${row.lego}-attempt${attempt}.mp3`)
      fs.writeFileSync(spareFile, buffer)
      const gates = runGates(gateRow, text, wordBoundaries, durationMs, spareFile)
      const entry = { lego: row.lego, attempt, file: spareFile, bytes: buffer.length,
                      ms: durationMs, word_boundaries: wordBoundaries, ...gates }
      allAttempts.push(entry)
      console.log(`${row.lego} a${attempt}: ms=${durationMs} z=${gates.z}${gates.z_ellipsis!==null?' zEll='+gates.z_ellipsis:''} tail=${gates.tail?.toFixed(1)} tok=${gates.tokens} ${gates.fail.length?'FAIL '+JSON.stringify(gates.fail):'PASS'}`)
      if (gates.fail.length === 0) { shipped = entry; break }
    }
    if (shipped) {
      const shipFile = path.join(SHIP_DIR, `${row.lego}.mp3`)
      fs.copyFileSync(shipped.file, shipFile)
      shipLog.push({ lego: row.lego, seed: row.seed, mode: 'render', shipped: true,
        headword: row.cardKnown, contextText: row.contextText, contextSource: row.contextSource,
        oldText: row.oldText, presText: text, textNormalized: row.textNormalized,
        file: shipFile, bytes: shipped.bytes, attempt: shipped.attempt,
        total_attempts: allAttempts.length, word_boundaries: shipped.word_boundaries,
        ms: shipped.ms, z: shipped.z, z_ellipsis: shipped.z_ellipsis, tail: shipped.tail,
        tokens: shipped.tokens, info: shipped.info, fail: [] })
    } else {
      console.error(`${row.lego}: NO PASSING TAKE after ${MAX_ATTEMPTS} attempts`)
      shipLog.push({ lego: row.lego, seed: row.seed, mode: 'render', shipped: false,
        presText: text, file: null,
        all_attempts: allAttempts.map(a => ({ attempt: a.attempt, fail: a.fail, ms: a.ms, z: a.z, z_ellipsis: a.z_ellipsis, tail: a.tail })) })
    }
  }
  const out = ONLY ? '/ship-log-only.json' : '/ship-log.json'
  fs.writeFileSync(__dirname + out, JSON.stringify(shipLog, null, 1))
  console.log(`\n${shipLog.filter(r => r.shipped).length}/${rows.length} passed all gates. Log at ${out}`)
}
main().catch(e => { console.error('ABORT:', e.stack || e.message); process.exit(1) })
