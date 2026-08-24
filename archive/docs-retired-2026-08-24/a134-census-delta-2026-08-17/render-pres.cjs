// A-134 census delta — the two PRESENTATION clips that quote the seed-398 sentence and
// therefore SPEAK the corruption, even though only one of the two cards' own text changes.
// course_legos' text-edit trigger does NOT touch presentation_audio_id, so these would
// have stayed stale and silent about it — the opposite trap to the nulled links.
// Gated with the PRESENTATION gates (their own rate model and the 'ඉතින්' terminator).
process.env.PHASE8_NO_LISTEN = '1'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs'), path = require('path'), crypto = require('crypto')
const { Client } = require('pg')
const ttsService = require('../../services/tts-service.cjs')
const phase8 = require('../../services/phases/phase8-audio-v13.cjs')
const { runGates } = require('../a134-nullsweep-2026-08-17/gates.cjs')
const SHIP = path.join(__dirname, 'ship'), SPARE = path.join(__dirname, 'spares')
const dbUrl = () => fs.readFileSync(path.resolve(__dirname, '../../.env.psql'), 'utf8').match(/DATABASE_URL=(.+)/)[1].trim()

async function main() {
  const db = new Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } })
  await db.connect()
  // OLD and NEW phrase sourced from the DB, never typed.
  const lego = (await db.query(`select known_text from course_legos where course_code='eng_for_sin' and seed_number=398 and lego_index=1`)).rows[0]
  const OLD = lego.known_text
  const NEW = require('./render-plan.json').find(p => p.slug === 'S0398L01-card').text
  if (!OLD.includes('අපිේ')) throw new Error('card text already repaired — rerun order is wrong')
  const todo = require('../../.a74-scratch/delta/pres-todo.json')
  const log = []
  for (const t of todo) {
    const clip = (await db.query(`select id::text id, text, duration_ms from course_audio where id=$1`, [t.clip])).rows[0]
    const newText = clip.text.split(OLD).join(NEW)
    if (newText === clip.text) throw new Error(`${t.slug}: substitution changed nothing`)
    const cardKnown = t.lego === 'S0398L01' ? NEW
      : (await db.query(`select known_text from course_legos where course_code='eng_for_sin' and seed_number=398 and lego_index=2`)).rows[0].known_text
    const seedNew = (await db.query(`select known_text from course_seeds where course_code='eng_for_sin' and seed_number=398`)).rows[0].known_text.split(OLD).join(NEW)
    let shipped = null, attempts = []
    for (let a = 1; a <= 3; a++) {
      console.log(`\n${t.slug} attempt ${a}: ${JSON.stringify(newText)}`)
      const { audioBuffer, wordBoundaries } = await ttsService.generateWithRetry(newText, 'azure', {
        subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION,
        voiceName: 'si-LK-SameeraNeural', speed: 1, regenerationAttempt: a - 1 })
      const { buffer, durationMs } = await phase8.masterAudio(audioBuffer, newText)
      const f = path.join(SPARE, `${t.slug}-attempt${a}.mp3`); fs.writeFileSync(f, buffer)
      const g = runGates({ card_known: cardKnown, contextText: seedNew }, newText, wordBoundaries, durationMs, f)
      attempts.push({ attempt: a, fail: g.fail, ms: durationMs, z: g.z, tail: g.tail })
      console.log(`  ms=${durationMs} z=${g.z.toFixed(2)} tail=${g.tail?.toFixed(1)}dB tokens=${g.tokens} fail=${JSON.stringify(g.fail)}`)
      if (!g.fail.length) { shipped = { f, buffer, durationMs, wordBoundaries, g, attempt: a }; break }
    }
    if (!shipped) { log.push({ ...t, file: null, shipped: false, all_attempts: attempts }); continue }
    const dest = path.join(SHIP, `${t.slug}.mp3`); fs.copyFileSync(shipped.f, dest)
    log.push({ ...t, kind: 'presentation', old_clip: t.clip, old_text: clip.text, text: newText, file: dest,
      bytes: shipped.buffer.length, ms: shipped.durationMs, md5: crypto.createHash('md5').update(shipped.buffer).digest('hex'),
      word_boundaries: shipped.wordBoundaries, z: shipped.g.z, tail: shipped.g.tail, attempt: shipped.attempt, fail: [] })
  }
  fs.writeFileSync(path.join(__dirname, 'ship-log-pres.json'), JSON.stringify(log, null, 1))
  console.log(`\n${log.filter(r => r.file).length}/${todo.length} presentation clips passing.`)
  await db.end()
}
main().catch(e => { console.error('ABORT:', e.stack || e.message); process.exit(1) })
