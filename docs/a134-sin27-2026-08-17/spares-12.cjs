// A-134 RENDER worker — extra insurance spares for the 12 clips that already shipped
// clean on their first take (render.cjs). Kai's standing rerun instruction is
// "generate more, make sure everything is in good shape" — this renders 2 additional
// takes per clip (regenerationAttempt 1 and 2; the shipped take used 0), gates them
// the same six-plus-one ways, and records the results into ship-log-12.json without
// changing which take is the shipped one. Spend: 24 renders, on top of the 12 already
// done — 36 total, inside the ~60-render ceiling.
process.env.PHASE8_NO_LISTEN = '1'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const ttsService = require('../../services/tts-service.cjs')
const phase8 = require('../../services/phases/phase8-audio-v13.cjs')
const { runGates } = require('./gates.cjs')

const COURSE = 'eng_for_sin'
const SPARE_DIR = path.join(__dirname, 'spares')
const SHIP_LOG = path.join(__dirname, 'ship-log-12.json')
const recomposed = require('../a134/recomposed.json').filter(r => r.changes_vs_823 === true)

async function dbUrl() {
  const f = path.resolve(__dirname, '../../.env.psql')
  return fs.readFileSync(f, 'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
}
async function loadVoiceConfig() {
  const db = new Client({ connectionString: await dbUrl(), ssl: { rejectUnauthorized: false } })
  await db.connect()
  const r = await db.query(`select voice_config from courses where course_code=$1`, [COURSE])
  await db.end()
  return r.rows[0].voice_config.voices.presentation
}

async function main() {
  const shipLog = require(SHIP_LOG)
  const voiceCfg = await loadVoiceConfig()

  for (const entry of shipLog) {
    if (!entry.file) continue // no passing take to insure
    const row = recomposed.find(r => r.lego_id === entry.lego_id)
    const text = entry.presText
    entry.spares = []
    for (const attempt of [2, 3]) {
      console.log(`\n${entry.lego_id} spare attempt ${attempt}: rendering...`)
      const { audioBuffer, wordBoundaries } = await ttsService.generateWithRetry(text, 'azure', {
        subscriptionKey: process.env.AZURE_SPEECH_KEY,
        region: process.env.AZURE_SPEECH_REGION,
        voiceName: voiceCfg.voiceId,
        speed: voiceCfg.settings?.speed ?? 1,
        regenerationAttempt: attempt - 1,
      })
      const { buffer, durationMs } = await phase8.masterAudio(audioBuffer, text)
      const spareFile = path.join(SPARE_DIR, `${entry.lego_id}-attempt${attempt}.mp3`)
      fs.writeFileSync(spareFile, buffer)
      const gates = runGates(row, text, wordBoundaries, durationMs, spareFile)
      console.log(`  ms=${durationMs} z=${gates.z.toFixed(2)} tail=${gates.tail?.toFixed(1)}dB tokens=${gates.tokens} fail=${JSON.stringify(gates.fail)}`)
      entry.spares.push({
        attempt, file: spareFile, bytes: buffer.length, ms: durationMs,
        z: gates.z, tail: gates.tail, tokens: gates.tokens, fail: gates.fail,
        word_boundaries: wordBoundaries,
      })
    }
  }

  fs.writeFileSync(SHIP_LOG, JSON.stringify(shipLog, null, 1))
  console.log(`\nspares done, ${SHIP_LOG} updated`)
}

main().catch(e => { console.error('ABORT:', e.stack || e.message); process.exit(1) })
