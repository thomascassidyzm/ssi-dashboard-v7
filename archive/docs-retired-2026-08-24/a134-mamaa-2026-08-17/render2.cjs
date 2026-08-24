// A-134 මමා — render the 2 known-side clips for the repaired phrases.
// role='known', so gates use the KNOWN duration model. Nothing reaches S3 or the
// DB here.
process.env.PHASE8_NO_LISTEN = '1'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs'), path = require('path')
const { Client } = require('pg')
const ttsService = require('../../services/tts-service.cjs')
const phase8 = require('../../services/phases/phase8-audio-v13.cjs')
const { runGates } = require('./mygates.cjs')

const COURSE = 'eng_for_sin'
const SHIP = path.join(__dirname, 'ship'), SPARE = path.join(__dirname, 'spares')
const MAX_ATTEMPTS = 3
const dbUrl = () => fs.readFileSync(path.resolve(__dirname, '../../.env.psql'), 'utf8').match(/DATABASE_URL=(.+)/)[1].trim()

;(async () => {
  const repairs = require('./repairs-final.json')
  const db = new Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } })
  await db.connect()

  // The known side is voiced by the course's KNOWN voice, not the presentation
  // voice. Read it rather than assume — but the existing clips are all on
  // azure_si-LK-SameeraNeural, so assert the two agree.
  const vc = (await db.query(`select voice_config from courses where course_code=$1`, [COURSE])).rows[0].voice_config
  const kv = vc.voices.known || vc.voices.presentation
  console.log('known voice from voice_config:', JSON.stringify(kv))
  for (const r of repairs) {
    const cur = (await db.query(`select a.voice_id, a.role from course_practice_phrases p
        join course_audio a on a.id=p.known_audio_id where p.id=$1`, [r.id])).rows[0]
    console.log(`  ${r.id}: existing clip voice=${cur.voice_id} role=${cur.role}`)
    r.existingVoice = cur.voice_id; r.role_audio = cur.role
  }

  // collision pre-check through the DATABASE's normalize_text()
  for (const r of repairs) {
    const tn = (await db.query('select normalize_text($1) t', [r.new])).rows[0].t
    r.textNormalized = tn
    const hit = await db.query(
      `select id::text id, text, duration_ms from course_audio
        where course_code=$1 and text_normalized=$2 and language=canonical_language('sin')
          and role='known' and voice_id=canonical_voice_id($3)`, [COURSE, tn, r.existingVoice])
    r.collides_with = hit.rows[0] || null
    console.log(`  ${r.id}: collision ${r.collides_with ? 'REUSE ' + r.collides_with.id : 'clear'}`)
  }
  await db.end()

  const log = []
  for (const r of repairs) {
    if (r.collides_with) { log.push({ ...r, mode: 'reuse', shipped: true }); continue }
    const gateRow = { kind: 'known', headword: r.new, contextText: null, fullText: r.new }
    let shipped = null; const atts = []
    for (let a = 1; a <= MAX_ATTEMPTS; a++) {
      const { audioBuffer, wordBoundaries } = await ttsService.generateWithRetry(r.new, 'azure', {
        subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION,
        voiceName: r.existingVoice.replace(/^azure_/, ''), speed: kv.settings?.speed ?? 1, regenerationAttempt: a - 1,
      })
      const { buffer, durationMs } = await phase8.masterAudio(audioBuffer, r.new)
      const f = path.join(SPARE, `${r.id.replace(/[^A-Za-z0-9]/g, '_')}-attempt${a}.mp3`)
      fs.writeFileSync(f, buffer)
      const g = runGates(gateRow, r.new, wordBoundaries, durationMs, f)
      atts.push({ a, ...g })
      console.log(`${r.id} a${a}: ms=${durationMs} z=${g.z} tail=${g.tail?.toFixed(1)} tok=${g.tokens} ${g.fail.length ? 'FAIL ' + JSON.stringify(g.fail) : 'PASS'}`)
      if (!g.fail.length) { shipped = { ...g, file: f, ms: durationMs, bytes: buffer.length, word_boundaries: wordBoundaries, attempt: a }; break }
    }
    if (shipped) {
      const sf = path.join(SHIP, `${r.id.replace(/[^A-Za-z0-9]/g, '_')}.mp3`)
      fs.copyFileSync(shipped.file, sf)
      log.push({ ...r, mode: 'render', shipped: true, file: sf, ...shipped })
    } else {
      console.error(`${r.id}: NO PASSING TAKE`)
      log.push({ ...r, mode: 'render', shipped: false, all_attempts: atts })
    }
  }
  fs.writeFileSync(__dirname + '/ship-log-phrases.json', JSON.stringify(log, null, 1))
  console.log(`\n${log.filter(x => x.shipped).length}/${repairs.length} ready`)
})().catch(e => { console.error('ABORT:', e.stack || e.message); process.exit(1) })
