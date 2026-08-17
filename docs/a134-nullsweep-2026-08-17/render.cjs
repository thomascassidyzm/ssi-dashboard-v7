// A-134 null sweep — render the 8 presentation clips whose links the text-edit trigger
// nulled during this plate's repairs. S0108L02 is NOT here: phase8's composer produces
// text byte-identical to its existing clip, so it is a pure relink, handled in link.cjs.
//
// Nothing reaches S3 or the DB here. This renders, masters on the compressor-free chain
// (667a6e09, cherry-picked onto this branch — masterAudio calls normalizeAudioClean),
// and gates locally. Passing takes land in ship/, EVERY take pass or fail in spares/.
process.env.PHASE8_NO_LISTEN = '1'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const ttsService = require('../../services/tts-service.cjs')
const phase8 = require('../../services/phases/phase8-audio-v13.cjs')
const { runGates } = require('./gates.cjs')

const COURSE = 'eng_for_sin'
const RELINK_ONLY = ['S0108L02']
const SHIP_DIR = path.join(__dirname, 'ship')
const SPARE_DIR = path.join(__dirname, 'spares')
const MAX_ATTEMPTS = 3

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
  const rows = require('./recomposed.json').filter(r => !RELINK_ONLY.includes(r.lego_id))
  console.log(`${rows.length} clips to render (expected 8)`)

  const db = new Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } })
  await db.connect()
  const voiceCfg = await loadVoiceConfig(db)
  console.log('voice:', JSON.stringify(voiceCfg))

  // Collision pre-check through the DATABASE's own normalize_text(), because the unique
  // constraint (course_code, text_normalized, language, role, voice_id) is enforced on
  // the database's normalisation and not on any JS equivalent. This has already bitten
  // twice on this plate.
  console.log('\ncollision pre-check:')
  for (const r of rows) {
    const n = await db.query('select normalize_text($1) t', [r.presText])
    const q = await db.query(
      `select id::text id, lego_id from course_audio
        where course_code=$1 and text_normalized=$2 and language=canonical_language('sin')
          and role='presentation' and voice_id=canonical_voice_id($3)`,
      [COURSE, n.rows[0].t, voiceCfg.voiceId.startsWith('azure_') ? voiceCfg.voiceId : `azure_${voiceCfg.voiceId}`])
    r.collides_with = q.rows[0] || null
    console.log(' ', r.lego_id, r.collides_with ? `COLLIDES with ${r.collides_with.lego_id} (${r.collides_with.id}) — will REUSE, not insert` : 'clear')
  }
  fs.writeFileSync(path.join(__dirname, 'collision-check.json'), JSON.stringify(rows.map(r => ({ lego_id: r.lego_id, collides_with: r.collides_with })), null, 1))

  const shipLog = []
  for (const row of rows) {
    if (row.collides_with) { console.log(`\n${row.lego_id}: skipping render — reusing existing clip`); shipLog.push({ lego_id: row.lego_id, mode: 'reuse', reuse_id: row.collides_with.id, presText: row.presText }); continue }
    const text = row.presText
    let shipped = null, allAttempts = []
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      console.log(`\n${row.lego_id} attempt ${attempt}: rendering...`)
      const { buffer, durationMs, wordBoundaries } = await renderOnce(text, voiceCfg, attempt - 1)
      const spareFile = path.join(SPARE_DIR, `${row.lego_id}-attempt${attempt}.mp3`)
      fs.writeFileSync(spareFile, buffer)
      const gates = runGates(row, text, wordBoundaries, durationMs, spareFile)
      const entry = { lego_id: row.lego_id, attempt, file: spareFile, bytes: buffer.length, ms: durationMs, word_boundaries: wordBoundaries, ...gates }
      allAttempts.push(entry)
      console.log(`  ms=${durationMs} z=${gates.z.toFixed(2)} tail=${gates.tail?.toFixed(1)}dB tokens=${gates.tokens} fail=${JSON.stringify(gates.fail)}`)
      if (gates.fail.length === 0) { shipped = entry; break }
      console.log(`  FAILED, re-rendering (spare kept at ${spareFile})`)
    }
    if (shipped) {
      const shipFile = path.join(SHIP_DIR, `${row.lego_id}.mp3`)
      fs.copyFileSync(shipped.file, shipFile)
      shipLog.push({ lego_id: row.lego_id, mode: 'render', headword: row.card_known, contextText: row.contextText,
        contextSource: row.contextSource, presText: text, file: shipFile, bytes: shipped.bytes,
        attempt: shipped.attempt, total_attempts: allAttempts.length, word_boundaries: shipped.word_boundaries,
        ms: shipped.ms, z: shipped.z, tail: shipped.tail, tokens: shipped.tokens, fail: shipped.fail })
    } else {
      console.error(`\n${row.lego_id}: NO PASSING TAKE after ${MAX_ATTEMPTS} attempts`)
      shipLog.push({ lego_id: row.lego_id, mode: 'render', presText: text, file: null, shipped: false,
        all_attempts: allAttempts.map(a => ({ attempt: a.attempt, fail: a.fail, ms: a.ms, z: a.z, tail: a.tail })) })
    }
  }
  fs.writeFileSync(path.join(__dirname, 'ship-log.json'), JSON.stringify(shipLog, null, 1))
  const ok = shipLog.filter(r => r.file || r.mode === 'reuse').length
  console.log(`\n${ok}/${rows.length} ready. Log at ship-log.json`)
  await db.end()
}
main().catch(e => { console.error('ABORT:', e.stack || e.message); process.exit(1) })
