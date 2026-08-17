// A-134 — the last 5 corrupt presentation clips a learner could still reach.
//
// Left behind by two workers, each correctly: the මමා pass held S0155L01 for the
// ගෙ-cluster worker, and the ගෙ-cluster worker found 4 more (S0207L02, S0196L01,
// S0184L01, S0197L01) whose clip text carries a bare ගෙ filler and left them as
// the sibling's defect class. Both finished, so these 5 became unowned. Measured
// live: 454 course_audio rows still carry a bare ගෙ, but only these 4 are
// learner-reachable; the other 450 are orphans and superseded takes.
//
// Same recipe as the null sweep and the මමා pass: recompose with phase8's OWN
// composer (the example slot is SELECTED by the course, never authored), render
// on the compressor-free chain, seven gates extended to catch මමා/ගෙ/script
// contamination, then make-before-break. No old clip deleted.
process.env.PHASE8_NO_LISTEN = '1'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs'), path = require('path'), crypto = require('crypto')
const { Client } = require('pg')
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
const tts = require('../../services/tts-service.cjs')
const phase8 = require('../../services/phases/phase8-audio-v13.cjs')
const { runGatesEllipsisAware, tokenCorpus } = require('./gates.cjs')

const APPLY = process.argv.includes('--apply')
const COURSE = 'eng_for_sin'
const rows = require('./recomposed5.json')
const dbUrl = () => fs.readFileSync(path.resolve(__dirname, '../../.env.psql'), 'utf8').match(/DATABASE_URL=(.+)/)[1].trim()

async function main() {
  const db = new Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } })
  await db.connect()
  const bucket = process.env.S3_AUDIO_BUCKET || process.env.S3_BUCKET
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' })
  const v = (await db.query(`select voice_config from courses where course_code=$1`, [COURSE])).rows[0].voice_config.voices.presentation
  const dir = path.join(__dirname, 'last5'); fs.mkdirSync(dir, { recursive: true })
  const log = []

  for (const row of rows) {
    // the text must be clean before we spend a render on it
    for (const bad of ['මමා', 'මමතා', 'ඒ ගෙ', 'දිහා', 'නනිකු']) {
      if (row.presText.includes(bad)) throw new Error(`${row.lego_id}: recomposed text still carries ${bad}`)
    }
    if (/(^|[\s'])ගෙ([\s']|$)/.test(row.presText)) throw new Error(`${row.lego_id}: recomposed text still carries a bare ගෙ`)

    const cur = await db.query(`select presentation_audio_id::text aid from course_legos where course_code=$1 and lego_id=$2`, [COURSE, row.lego_id])
    const oldId = cur.rows[0]?.aid
    if (!oldId) throw new Error(`${row.lego_id}: link is NULL — not the case this script handles`)

    // collision pre-check through the DATABASE's own normalizer, not a JS equivalent
    const n = await db.query('select normalize_text($1) t', [row.presText])
    const col = await db.query(
      `select id::text id, lego_id from course_audio where course_code=$1 and text_normalized=$2
         and language=canonical_language('sin') and role='presentation' and voice_id=canonical_voice_id('azure_si-LK-SameeraNeural')`,
      [COURSE, n.rows[0].t])

    let plan
    if (col.rows[0]) {
      plan = { lego_id: row.lego_id, mode: 'reuse', old_clip: oldId, new_clip: col.rows[0].id, reuse_of: col.rows[0].lego_id, text: row.presText }
      console.log(`${row.lego_id}: collides with ${col.rows[0].lego_id} — REUSE ${col.rows[0].id}`)
    } else {
      let ship = null
      for (let a = 1; a <= 3 && !ship; a++) {
        const { audioBuffer, wordBoundaries } = await tts.generateWithRetry(row.presText, 'azure', {
          subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION,
          voiceName: v.voiceId, speed: v.settings?.speed ?? 1, regenerationAttempt: a - 1 })
        const { buffer, durationMs } = await phase8.masterAudio(audioBuffer, row.presText)
        const f = path.join(dir, `${row.lego_id}-attempt${a}.mp3`); fs.writeFileSync(f, buffer)
        const g = runGatesEllipsisAware({ card_known: row.card_known, contextText: row.contextText }, row.presText, wordBoundaries, durationMs, f)
        console.log(`  ${row.lego_id} attempt ${a}: ms=${durationMs} z=${g.z.toFixed(2)} tail=${g.tail?.toFixed(1)}dB fail=${JSON.stringify(g.fail)}`)
        if (!g.fail.length) ship = { buffer, durationMs, wordBoundaries, g, f }
      }
      if (!ship) throw new Error(`${row.lego_id}: no passing take`)
      plan = { lego_id: row.lego_id, mode: 'insert', old_clip: oldId, text: row.presText, ms: ship.durationMs,
               bytes: ship.buffer.length, z: ship.g.z, tail: ship.g.tail, _ship: ship }
    }
    log.push(plan)
  }

  if (!APPLY) {
    console.log('\nDRY RUN — all gates pass, nothing written.')
    fs.writeFileSync(path.join(__dirname, 'last5-dryrun.json'), JSON.stringify(log.map(({ _ship, ...r }) => r), null, 1))
    await db.end(); return
  }

  for (const plan of log) {
    if (plan.mode === 'reuse') {
      const u = await db.query(`update course_legos set presentation_audio_id=$1 where course_code=$2 and lego_id=$3 and presentation_audio_id::text=$4`,
        [plan.new_clip, COURSE, plan.lego_id, plan.old_clip])
      if (u.rowCount !== 1) throw new Error(`${plan.lego_id}: reuse repoint matched ${u.rowCount}`)
      console.log('APPLIED REUSE', plan.lego_id, '->', plan.new_clip)
      continue
    }
    const id = crypto.randomUUID(), key = `mastered/${id.toUpperCase()}.mp3`
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: plan._ship.buffer, ContentType: 'audio/mpeg' }))
    const h = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    if (h.ContentLength !== plan._ship.buffer.length) throw new Error(`${plan.lego_id}: upload size mismatch`)
    await db.query('BEGIN')
    try {
      await db.query(`insert into course_audio (id,course_code,lego_id,role,voice_id,text,duration_ms,s3_key,language,origin,word_boundaries)
                      values ($1,$2,$3,'presentation','azure_si-LK-SameeraNeural',$4,$5,$6,'sin','tts',$7)`,
        [id, COURSE, plan.lego_id, plan.text, plan.ms, key, JSON.stringify(plan._ship.wordBoundaries)])
      const u = await db.query(`update course_legos set presentation_audio_id=$1 where course_code=$2 and lego_id=$3 and presentation_audio_id::text=$4`,
        [id, COURSE, plan.lego_id, plan.old_clip])
      if (u.rowCount !== 1) throw new Error(`${plan.lego_id}: repoint matched ${u.rowCount}`)
      await db.query('COMMIT')
    } catch (e) { await db.query('ROLLBACK'); throw e }
    plan.new_clip = id; plan.s3_key = key
    console.log('APPLIED INSERT', plan.lego_id, '->', id)
  }
  fs.writeFileSync(path.join(__dirname, 'last5-applied.json'), JSON.stringify(log.map(({ _ship, ...r }) => r), null, 1))
  await db.end()
}
main().catch(e => { console.error('ABORT:', e.message); process.exit(1) })
