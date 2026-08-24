// A-134 මමා — MAKE-BEFORE-BREAK apply.
//
// Two populations:
//   A) 69 lego presentation clips. Their links are NOT NULL — they point at the
//      STALE clips that voice මමා. So (unlike the null-sweep precedent) the
//      autolink AFTER INSERT trigger CANNOT help: link_audio_to_content only
//      fills links that are NULL. The explicit repoint is load-bearing, and the
//      old link value is asserted first so drift aborts the run.
//   B) 2 practice-phrase known clips whose CARD TEXT is being repaired.
//      trg_null_phrase_audio_on_text_change is BEFORE UPDATE and does NOT null
//      the link — it RE-RESOLVES it through audio_id_for_text(), which picks the
//      newest clip whose text_normalized matches the new text. So inserting the
//      new clip BEFORE the text update lets the trigger land the link itself.
//      We verify that and repoint explicitly if it did not.
//
// Order per item, never varied: bytes to S3 -> HeadObject verify -> insert row ->
// repoint -> read the link back and assert. NO OLD CLIP IS EVER DELETED.
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
  const stampBefore = (await db.query(`select content_stamp, audio_stamp from courses where course_code=$1`, [COURSE])).rows[0]
  console.log('content_stamp before:', JSON.stringify(stampBefore))

  try {
    // ================= A) the 69 presentation recompositions =================
    const pres = require('./ship-log.json').filter(r => r.shipped)
    console.log(`\n=== A) ${pres.length} presentation clips ===`)
    for (const row of pres) {
      if (!row.file) throw new Error(`${row.lego}: no shipping take`)
      // assert the CURRENT link is the stale clip we measured, not something else
      const cur = (await db.query(
        `select presentation_audio_id from course_legos where course_code=$1 and lego_id=$2`, [COURSE, row.lego])).rows[0]
      const oldId = cur?.presentation_audio_id
      if (!oldId) throw new Error(`${row.lego}: link is NULL — drift, aborting`)
      const oldClip = (await db.query(`select text from course_audio where id=$1`, [oldId])).rows[0]
      if (!oldClip || oldClip.text !== row.oldText)
        throw new Error(`${row.lego}: stale clip text moved under me — aborting`)

      const newId = crypto.randomUUID()
      const key = `mastered/${newId.toUpperCase()}.mp3`
      const bytes = fs.readFileSync(row.file)
      const plan = { kind: 'presentation', lego: row.lego, seed: row.seed, old_clip_id: oldId,
                     new_clip_id: newId, s3_key: key, ms: row.ms, bytes: bytes.length,
                     old_text: row.oldText, new_text: row.presText, contextSource: row.contextSource }
      if (!APPLY) { log.push({ ...plan, applied: false }); console.log('DRY ', row.lego, oldId, '->', newId); continue }

      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: 'audio/mpeg' }))
      const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
      if (head.ContentLength !== bytes.length) throw new Error(`${row.lego}: uploaded ${head.ContentLength}B != ${bytes.length}B`)

      await db.query('BEGIN')
      try {
        await db.query(
          `insert into course_audio (id, course_code, lego_id, role, voice_id, text, duration_ms, s3_key, language, origin, word_boundaries)
           values ($1,$2,$3,'presentation',$4,$5,$6,$7,$8,$9,$10)`,
          [newId, COURSE, row.lego, VOICE, row.presText, row.ms, key, LANGUAGE, ORIGIN, JSON.stringify(row.word_boundaries)])
        // links are NOT NULL here, so the autolink trigger will not have touched
        // this; the repoint is the thing that actually changes what a learner hears.
        const upd = await db.query(
          `update course_legos set presentation_audio_id=$1
           where course_code=$2 and lego_id=$3 and presentation_audio_id=$4`, [newId, COURSE, row.lego, oldId])
        if (upd.rowCount !== 1) throw new Error(`${row.lego}: repoint matched ${upd.rowCount} rows`)
        const final = (await db.query(
          `select presentation_audio_id::text v from course_legos where course_code=$1 and lego_id=$2`, [COURSE, row.lego])).rows[0].v
        if (final !== newId) throw new Error(`${row.lego}: final link is ${final}, not ${newId}`)
        await db.query('COMMIT')
      } catch (e) { await db.query('ROLLBACK'); throw e }
      log.push({ ...plan, applied: true, linked_by: 'explicit' })
      console.log('OK  ', row.lego, oldId, '->', newId)
    }

    // ================= B) the 2 phrase card-text repairs =====================
    const phr = require('./ship-log-phrases.json').filter(r => r.shipped)
    console.log(`\n=== B) ${phr.length} phrase repairs (card text + known clip) ===`)
    for (const r of phr) {
      const cur = (await db.query(
        `select known_text, known_audio_id::text kaid from course_practice_phrases where course_code=$1 and id=$2`,
        [COURSE, r.id])).rows[0]
      if (cur.known_text !== r.old) throw new Error(`${r.id}: known_text moved under me (${JSON.stringify(cur.known_text)}) — aborting`)
      const oldId = cur.kaid
      const newId = crypto.randomUUID()
      const key = `mastered/${newId.toUpperCase()}.mp3`
      const bytes = fs.readFileSync(r.file)
      const plan = { kind: 'phrase', id: r.id, seed: r.seed, old_clip_id: oldId, new_clip_id: newId,
                     s3_key: key, ms: r.ms, bytes: bytes.length, old_text: r.old, new_text: r.new,
                     rationale: r.rationale }
      if (!APPLY) { log.push({ ...plan, applied: false }); console.log('DRY ', r.id, JSON.stringify(r.old), '->', JSON.stringify(r.new)); continue }

      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: 'audio/mpeg' }))
      const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
      if (head.ContentLength !== bytes.length) throw new Error(`${r.id}: uploaded ${head.ContentLength}B != ${bytes.length}B`)

      await db.query('BEGIN')
      try {
        // 1. the clip must exist BEFORE the text update, so the BEFORE trigger's
        //    audio_id_for_text() can resolve to it.
        await db.query(
          `insert into course_audio (id, course_code, role, voice_id, text, duration_ms, s3_key, language, origin, word_boundaries)
           values ($1,$2,'known',$3,$4,$5,$6,$7,$8,$9)`,
          [newId, COURSE, VOICE, r.new, r.ms, key, LANGUAGE, ORIGIN, JSON.stringify(r.word_boundaries)])
        // 2. the text repair. A text-only fix is never text-only.
        const upd = await db.query(
          `update course_practice_phrases set known_text=$1
           where course_code=$2 and id=$3 and known_text=$4`, [r.new, COURSE, r.id, r.old])
        if (upd.rowCount !== 1) throw new Error(`${r.id}: text update matched ${upd.rowCount} rows`)
        // 3. did the BEFORE trigger land the link on my clip?
        const after = (await db.query(
          `select known_audio_id::text v from course_practice_phrases where course_code=$1 and id=$2`, [COURSE, r.id])).rows[0].v
        let by = 'text_change_trigger'
        if (after !== newId) {
          const u2 = await db.query(
            `update course_practice_phrases set known_audio_id=$1 where course_code=$2 and id=$3`, [newId, COURSE, r.id])
          if (u2.rowCount !== 1) throw new Error(`${r.id}: explicit repoint matched ${u2.rowCount} rows`)
          by = 'explicit'
        }
        const final = (await db.query(
          `select known_text, known_audio_id::text v from course_practice_phrases where course_code=$1 and id=$2`, [COURSE, r.id])).rows[0]
        if (final.v !== newId) throw new Error(`${r.id}: final link ${final.v} != ${newId}`)
        if (final.known_text !== r.new) throw new Error(`${r.id}: final text not the repair`)
        await db.query('COMMIT')
        plan.linked_by = by
      } catch (e) { await db.query('ROLLBACK'); throw e }
      log.push({ ...plan, applied: true })
      console.log('OK  ', r.id, '->', newId, `(${plan.linked_by})`)
    }
  } finally {
    const after = (await db.query(`select content_stamp, audio_stamp from courses where course_code=$1`, [COURSE])).rows[0]
    console.log('content_stamp after :', JSON.stringify(after))
    const out = path.join(__dirname, APPLY ? 'link-applied.json' : 'link-dryrun.json')
    fs.writeFileSync(out, JSON.stringify({ stampBefore, stampAfter: after, log }, null, 1))
    console.log(`\n${APPLY ? 'APPLIED' : 'DRY RUN'} — ${log.length} rows, log at ${out}`)
    await db.end()
  }
}
main().catch(e => { console.error('ABORT:', e.message); process.exit(1) })
