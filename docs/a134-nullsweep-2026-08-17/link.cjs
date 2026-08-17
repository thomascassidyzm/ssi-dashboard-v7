// A-134 null sweep — put the 9 nulled presentation links back.
//
// WHY THIS EXISTS. Repairing card text during this plate fired the course_legos
// text-edit trigger, which NULLS the row's audio links. Two workers changed card text
// and did not repoint; 9 cards were left with presentation_audio_id = NULL, i.e. no
// presentation audio at all. (The other 59 NULLs in this course pre-date today and are
// NOT ours — verified from content_audit_log.) This is make-before-break violated in
// the "break happened, make didn't" direction. The old clips were never deleted, so
// nothing is lost; they simply speak text the course no longer teaches.
//
//   S0108L02  RELINK — phase8's composer produces text BYTE-IDENTICAL to its existing
//                      clip, so the existing clip is already correct. No render.
//   the other 8  INSERT — recomposed by phase8's own composer, rendered on the
//                      compressor-free chain, all gates passing.
//
// A NOTE ON THE AUTOLINK TRIGGER. link_audio_to_content() runs AFTER INSERT and fills
// links that are NULL. Every link here IS NULL, so the trigger may set it for us. That
// is fine and even desirable, but it means a blind UPDATE...WHERE presentation_audio_id
// IS NULL can legitimately match 0 rows. So we read the link back after the insert and
// only force it if the trigger did not, then assert the final value either way.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { Client } = require('pg')
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')

const APPLY = process.argv.includes('--apply')
const COURSE = 'eng_for_sin'
const VOICE = 'azure_si-LK-SameeraNeural'
const LANGUAGE = 'sin'
const ORIGIN = 'tts'
const RELINK = { S0108L02: '3006c5e7-f998-4218-9b8f-bbb05110f0c2' }

function dbUrl() {
  return fs.readFileSync(path.resolve(__dirname, '../../.env.psql'), 'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
}

async function main() {
  const bucket = process.env.S3_AUDIO_BUCKET || process.env.S3_BUCKET
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' })
  const db = new Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } })
  await db.connect()
  const ship = require('./ship-log.json')
  const log = []

  try {
    // ---- the relink case ----
    for (const [lego, clipId] of Object.entries(RELINK)) {
      const cur = await db.query(`select presentation_audio_id from course_legos where course_code=$1 and lego_id=$2`, [COURSE, lego])
      if (cur.rows[0]?.presentation_audio_id !== null) throw new Error(`${lego}: expected NULL link, found ${cur.rows[0]?.presentation_audio_id} — drift, aborting`)
      const clip = await db.query(`select id::text id, text, duration_ms, s3_key from course_audio where id=$1 and course_code=$2`, [clipId, COURSE])
      if (!clip.rows[0]) throw new Error(`${lego}: relink target ${clipId} not found`)
      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: clip.rows[0].s3_key }))
      const plan = { lego_id: lego, mode: 'relink', clip_id: clipId, ms: clip.rows[0].duration_ms, s3_key: clip.rows[0].s3_key }
      if (!APPLY) { log.push({ ...plan, applied: false }); console.log('DRY  RELINK', lego, '→', clipId); continue }
      const upd = await db.query(`update course_legos set presentation_audio_id=$1 where course_code=$2 and lego_id=$3 and presentation_audio_id is null`, [clipId, COURSE, lego])
      if (upd.rowCount !== 1) throw new Error(`${lego}: relink matched ${upd.rowCount} rows`)
      log.push({ ...plan, applied: true }); console.log('APPLIED RELINK', lego, '→', clipId)
    }

    // ---- the render case ----
    for (const row of ship) {
      if (!row.file) throw new Error(`${row.lego_id}: no shipping take — refusing to link`)
      const cur = await db.query(`select presentation_audio_id from course_legos where course_code=$1 and lego_id=$2`, [COURSE, row.lego_id])
      if (cur.rows[0]?.presentation_audio_id !== null) throw new Error(`${row.lego_id}: expected NULL link, found ${cur.rows[0]?.presentation_audio_id} — drift, aborting`)

      const newId = crypto.randomUUID()
      const finalKey = `mastered/${newId.toUpperCase()}.mp3`
      const bytes = fs.readFileSync(row.file)
      const plan = { lego_id: row.lego_id, mode: 'insert', new_clip_id: newId, s3_key: finalKey, ms: row.ms, bytes: bytes.length, text: row.presText, contextSource: row.contextSource }
      if (!APPLY) { log.push({ ...plan, applied: false }); console.log('DRY  INSERT', row.lego_id, '→', newId); continue }

      // 1. bytes first — additive, nothing overwritten
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: finalKey, Body: bytes, ContentType: 'audio/mpeg' }))
      const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: finalKey }))
      if (head.ContentLength !== bytes.length) throw new Error(`${row.lego_id}: uploaded ${head.ContentLength}B, expected ${bytes.length}B`)

      // 2. row + link together
      await db.query('BEGIN')
      try {
        await db.query(
          `insert into course_audio (id, course_code, lego_id, role, voice_id, text, duration_ms, s3_key, language, origin, word_boundaries)
           values ($1,$2,$3,'presentation',$4,$5,$6,$7,$8,$9,$10)`,
          [newId, COURSE, row.lego_id, VOICE, row.presText, row.ms, finalKey, LANGUAGE, ORIGIN, JSON.stringify(row.word_boundaries)])
        const after = await db.query(`select presentation_audio_id::text v from course_legos where course_code=$1 and lego_id=$2`, [COURSE, row.lego_id])
        if (after.rows[0].v === null) {
          const upd = await db.query(`update course_legos set presentation_audio_id=$1 where course_code=$2 and lego_id=$3 and presentation_audio_id is null`, [newId, COURSE, row.lego_id])
          if (upd.rowCount !== 1) throw new Error(`${row.lego_id}: repoint matched ${upd.rowCount} rows`)
          plan.linked_by = 'explicit'
        } else if (after.rows[0].v === newId) {
          plan.linked_by = 'autolink_trigger'
        } else {
          throw new Error(`${row.lego_id}: link went to ${after.rows[0].v}, not ${newId}`)
        }
        const final = await db.query(`select presentation_audio_id::text v from course_legos where course_code=$1 and lego_id=$2`, [COURSE, row.lego_id])
        if (final.rows[0].v !== newId) throw new Error(`${row.lego_id}: final link is ${final.rows[0].v}`)
        await db.query('COMMIT')
      } catch (e) { await db.query('ROLLBACK'); throw e }

      log.push({ ...plan, applied: true })
      console.log('APPLIED INSERT', row.lego_id, '→', newId, `(${plan.linked_by})`)
    }
  } finally {
    const out = path.join(__dirname, APPLY ? 'link-applied-log.json' : 'link-dryrun-log.json')
    fs.writeFileSync(out, JSON.stringify(log, null, 1))
    console.log(`\n${APPLY ? 'APPLIED' : 'DRY RUN'} — ${log.length}/9 rows, log at ${out}`)
    await db.end()
  }
}
main().catch(e => { console.error('ABORT:', e.message); process.exit(1) })
