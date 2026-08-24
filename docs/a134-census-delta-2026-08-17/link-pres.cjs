// A-134 census delta — repoint the two seed-398 PRESENTATION clips.
//
// Split out of link-known.cjs after that run proved the two cards are in DIFFERENT states,
// and that the first assumption was wrong in both directions:
//   S0398L01 — its card text changed, and course_legos' text trigger DOES null
//              presentation_audio_id (unlike the phrase trigger, which documents that it
//              deliberately does not). So this link is NULL and the card is silent: a hole
//              opened by the text repair, exactly the failure the null sweep cleaned up.
//   S0398L02 — its card text did NOT change, so nothing nulled anything, and its link
//              still points at a clip that SPEAKS the corrupt phrase inside the quoted
//              example sentence. No NULL, no alarm, just wrong. The opposite trap.
// The guard therefore accepts either the known-stale clip or NULL, and asserts the final
// value either way. Old clips are never deleted.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs'), path = require('path'), crypto = require('crypto')
const { Client } = require('pg')
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
const APPLY = process.argv.includes('--apply')
const COURSE = 'eng_for_sin', VOICE = 'azure_si-LK-SameeraNeural', LANGUAGE = 'sin', ORIGIN = 'tts'
const dbUrl = () => fs.readFileSync(path.resolve(__dirname, '../../.env.psql'), 'utf8').match(/DATABASE_URL=(.+)/)[1].trim()

async function main() {
  const bucket = process.env.S3_AUDIO_BUCKET || process.env.S3_BUCKET
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' })
  const db = new Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } })
  await db.connect()
  const log = []
  try {
    for (const p of require('./ship-log-pres.json')) {
      if (!p.file) throw new Error(`${p.slug}: no passing take`)
      const cur = (await db.query(`select presentation_audio_id v from course_legos where course_code=$1 and lego_id=$2`, [COURSE, p.lego])).rows[0].v
      if (cur !== null && cur !== p.old_clip) throw new Error(`${p.lego}: link is ${cur}, neither NULL nor the stale ${p.old_clip} — third party, aborting`)
      // reuse an existing clip for this exact text if one now exists (course is live)
      const n = (await db.query('select normalize_text($1) t', [p.text])).rows[0].t
      const hit = (await db.query(
        `select id::text id from course_audio where course_code=$1 and text_normalized=$2
           and language=canonical_language('sin') and role='presentation' and voice_id=canonical_voice_id($3)`,
        [COURSE, n, VOICE])).rows[0]
      const newId = hit ? hit.id : crypto.randomUUID()
      const plan = { lego: p.lego, was: cur, mode: hit ? 'reuse' : 'insert', new_clip_id: newId, ms: p.ms, md5: p.md5, text: p.text }
      if (!APPLY) { log.push({ ...plan, applied: false }); console.log('DRY ', p.lego, `was=${cur}`, '→', newId, plan.mode); continue }
      if (!hit) {
        const key = `mastered/${newId.toUpperCase()}.mp3`
        const bytes = fs.readFileSync(p.file)
        await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: 'audio/mpeg' }))
        const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
        if (head.ContentLength !== bytes.length) throw new Error(`${p.lego}: upload short`)
        plan.s3_key = key; plan.bytes = bytes.length
      }
      await db.query('BEGIN')
      try {
        if (!hit) await db.query(
          `insert into course_audio (id, course_code, lego_id, role, voice_id, text, duration_ms, s3_key, language, origin, word_boundaries)
           values ($1,$2,$3,'presentation',$4,$5,$6,$7,$8,$9,$10)`,
          [newId, COURSE, p.lego, VOICE, p.text, p.ms, plan.s3_key, LANGUAGE, ORIGIN, JSON.stringify(p.word_boundaries)])
        const after = (await db.query(`select presentation_audio_id v from course_legos where course_code=$1 and lego_id=$2`, [COURSE, p.lego])).rows[0].v
        if (after !== newId) {
          const u = await db.query(`update course_legos set presentation_audio_id=$1 where course_code=$2 and lego_id=$3`, [newId, COURSE, p.lego])
          if (u.rowCount !== 1) throw new Error(`${p.lego}: repoint matched ${u.rowCount}`)
          plan.linked_by = after === null ? 'explicit_after_null' : 'explicit_over_stale'
        } else plan.linked_by = 'autolink_trigger'
        const fin = (await db.query(`select presentation_audio_id v from course_legos where course_code=$1 and lego_id=$2`, [COURSE, p.lego])).rows[0].v
        if (fin !== newId) throw new Error(`${p.lego}: final link ${fin}`)
        await db.query('COMMIT')
      } catch (e) { await db.query('ROLLBACK'); throw e }
      log.push({ ...plan, applied: true })
      console.log('APPLIED', p.lego, '→', newId, `(${plan.linked_by}, was ${cur})`)
    }
  } finally {
    fs.writeFileSync(path.join(__dirname, APPLY ? 'link-pres-applied-log.json' : 'link-pres-dryrun-log.json'), JSON.stringify(log, null, 1))
    await db.end()
  }
}
main().catch(e => { console.error('ABORT:', e.message); process.exit(1) })
