// A-134 census delta — MAKE-BEFORE-BREAK application of the repaired prompts.
//
// ORDER, and why. Bytes go to S3 first and course_audio rows are INSERTED before any
// content text moves, so at every instant the learner has a live clip: first the old one
// (speaking the old text), then the new one. No clip is ever deleted.
//
// THE TWO TRIGGER TRAPS, handled explicitly:
//   * course_practice_phrases / course_legos have a BEFORE UPDATE trigger that re-resolves
//     known_audio_id via audio_id_for_text() whenever known_text changes. Because the new
//     clip is inserted FIRST, that re-resolve should find it — but "should" is not proof,
//     so the link is read back and forced if the trigger did not do it, then asserted.
//   * course_seeds has NO such trigger. Its known_audio_id would keep pointing at a clip
//     speaking the OLD text, with no NULL and no alarm. It is set explicitly.
//   * course_legos.presentation_audio_id is NOT touched by the text trigger either, and
//     is a TEXT column while every sibling id column is uuid. Set explicitly, as text.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs'), path = require('path'), crypto = require('crypto')
const { Client } = require('pg')
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')

const APPLY = process.argv.includes('--apply')
const COURSE = 'eng_for_sin', VOICE = 'azure_si-LK-SameeraNeural', LANGUAGE = 'sin', ORIGIN = 'tts'
const dbUrl = () => fs.readFileSync(path.resolve(__dirname, '../../.env.psql'), 'utf8').match(/DATABASE_URL=(.+)/)[1].trim()

async function upload(s3, bucket, file, newId) {
  const key = `mastered/${newId.toUpperCase()}.mp3`
  const bytes = fs.readFileSync(file)
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: 'audio/mpeg' }))
  const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
  if (head.ContentLength !== bytes.length) throw new Error(`upload short: ${head.ContentLength} vs ${bytes.length}`)
  return { key, bytes }
}

async function main() {
  const bucket = process.env.S3_AUDIO_BUCKET || process.env.S3_BUCKET
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' })
  const db = new Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } })
  await db.connect()
  // ship-log-refreshed.json is ship-log.json re-validated against LIVE state immediately
// before applying: rows a sibling worker already fixed are dropped, optimistic-lock
// guards are re-pointed at current text, and the collision pre-check is re-run. Other
// workers inserted 243 clips into this course in the two hours this job took, so a
// pre-check done at analysis time is not a pre-check.
  const known = require('./ship-log-refreshed.json'), pres = require('./ship-log-pres.json')
  const log = []
  try {
    // ---------- KNOWN / prompt clips ----------
    for (const w of known) {
      if (!w.file) throw new Error(`${w.slug}: no passing take — refusing to link`)
      // If another worker has since rendered a healthy clip for this exact text, REUSE it
      // rather than inventing a difference the unique index would reject anyway.
      const newId = w.reuse_existing ? w.reuse_existing.id : crypto.randomUUID()
      const plan = { slug: w.slug, kind: 'known', new_clip_id: newId, ms: w.ms, md5: w.md5,
        text: w.text, rows: w.rows.map(r => ({ layer: r.layer, id: r.id, old: r.old, new: r.new, old_audio: r.old_audio })) }
      if (!APPLY) { log.push({ ...plan, applied: false }); console.log('DRY ', w.slug, '→', newId, `(${w.rows.length} row(s))`); continue }
      if (!w.reuse_existing) {
        const { key, bytes } = await upload(s3, bucket, w.file, newId)
        plan.s3_key = key; plan.bytes = bytes.length
      } else { plan.mode = 'reuse'; plan.reused_clip = newId }
      await db.query('BEGIN')
      try {
        if (!w.reuse_existing) await db.query(
          `insert into course_audio (id, course_code, role, voice_id, text, duration_ms, s3_key, language, origin, word_boundaries)
           values ($1,$2,'known',$3,$4,$5,$6,$7,$8,$9)`,
          [newId, COURSE, VOICE, w.text, w.ms, plan.s3_key, LANGUAGE, ORIGIN, JSON.stringify(w.word_boundaries)])
        for (const r of w.rows) {
          if (r.layer === 'phrase') {
            const u = await db.query(`update course_practice_phrases set known_text=$1 where id=$2 and course_code=$3 and known_text=$4`, [r.new, r.id, COURSE, r.old])
            if (u.rowCount !== 1) throw new Error(`${r.id}: text update matched ${u.rowCount} (drift)`)
            let after = (await db.query(`select known_audio_id::text v from course_practice_phrases where id=$1`, [r.id])).rows[0].v
            if (after !== newId) {
              const f = await db.query(`update course_practice_phrases set known_audio_id=$1 where id=$2`, [newId, r.id])
              if (f.rowCount !== 1) throw new Error(`${r.id}: repoint matched ${f.rowCount}`)
              r.linked_by = after === null ? 'explicit_after_null' : `explicit_over_${after}`
            } else r.linked_by = 'trigger_reresolve'
            const fin = (await db.query(`select known_audio_id::text v, known_text t from course_practice_phrases where id=$1`, [r.id])).rows[0]
            if (fin.v !== newId || fin.t !== r.new) throw new Error(`${r.id}: final state ${fin.v} / ${JSON.stringify(fin.t)}`)
          } else if (r.layer === 'lego') {
            const u = await db.query(`update course_legos set known_text=$1 where id=$2 and course_code=$3 and known_text=$4`, [r.new, r.id, COURSE, r.old])
            if (u.rowCount !== 1) throw new Error(`lego ${r.id}: text update matched ${u.rowCount} (drift)`)
            let after = (await db.query(`select known_audio_id::text v from course_legos where id=$1`, [r.id])).rows[0].v
            if (after !== newId) {
              const f = await db.query(`update course_legos set known_audio_id=$1 where id=$2`, [newId, r.id])
              if (f.rowCount !== 1) throw new Error(`lego ${r.id}: repoint matched ${f.rowCount}`)
              r.linked_by = after === null ? 'explicit_after_null' : `explicit_over_${after}`
            } else r.linked_by = 'trigger_reresolve'
            const fin = (await db.query(`select known_audio_id::text v, known_text t from course_legos where id=$1`, [r.id])).rows[0]
            if (fin.v !== newId || fin.t !== r.new) throw new Error(`lego ${r.id}: final ${fin.v}`)
          } else if (r.layer === 'seed') {
            // NO trigger here — text and link must move together or the link goes stale silently.
            const u = await db.query(
              `update course_seeds set known_text=$1, known_audio_id=$2 where course_code=$3 and seed_number=398 and known_text=$4`,
              [r.new, newId, COURSE, r.old])
            if (u.rowCount !== 1) throw new Error(`seed 398: update matched ${u.rowCount} (drift)`)
            r.linked_by = 'explicit_no_trigger'
            const fin = (await db.query(`select known_audio_id::text v, known_text t from course_seeds where course_code=$1 and seed_number=398`, [COURSE])).rows[0]
            if (fin.v !== newId || fin.t !== r.new) throw new Error(`seed 398: final ${fin.v}`)
          }
        }
        await db.query('COMMIT')
      } catch (e) { await db.query('ROLLBACK'); throw e }
      log.push({ ...plan, applied: true })
      console.log('APPLIED', w.slug, '→', newId, w.rows.map(r => `${String(r.id).replace('eng_for_sin:','')}:${r.linked_by}`).join(' '))
    }

    // ---------- PRESENTATION clips ----------
    for (const p of pres) {
      if (!p.file) throw new Error(`${p.slug}: no passing take`)
      const newId = crypto.randomUUID()
      const plan = { slug: p.slug, kind: 'presentation', lego: p.lego, old_clip: p.old_clip, new_clip_id: newId, ms: p.ms, md5: p.md5, text: p.text }
      if (!APPLY) { log.push({ ...plan, applied: false }); console.log('DRY  PRES', p.lego, '→', newId); continue }
      const { key, bytes } = await upload(s3, bucket, p.file, newId)
      plan.s3_key = key; plan.bytes = bytes.length
      await db.query('BEGIN')
      try {
        await db.query(
          `insert into course_audio (id, course_code, lego_id, role, voice_id, text, duration_ms, s3_key, language, origin, word_boundaries)
           values ($1,$2,$3,'presentation',$4,$5,$6,$7,$8,$9,$10)`,
          [newId, COURSE, p.lego, VOICE, p.text, p.ms, key, LANGUAGE, ORIGIN, JSON.stringify(p.word_boundaries)])
        // TEXT column, not uuid — the one asymmetric id column in this schema.
        const u = await db.query(`update course_legos set presentation_audio_id=$1 where course_code=$2 and lego_id=$3 and presentation_audio_id=$4`,
          [newId, COURSE, p.lego, p.old_clip])
        if (u.rowCount !== 1) throw new Error(`${p.lego}: presentation repoint matched ${u.rowCount} (drift)`)
        const fin = (await db.query(`select presentation_audio_id v from course_legos where course_code=$1 and lego_id=$2`, [COURSE, p.lego])).rows[0]
        if (fin.v !== newId) throw new Error(`${p.lego}: final presentation link ${fin.v}`)
        await db.query('COMMIT')
      } catch (e) { await db.query('ROLLBACK'); throw e }
      log.push({ ...plan, applied: true })
      console.log('APPLIED PRES', p.lego, '→', newId)
    }
  } finally {
    fs.writeFileSync(path.join(__dirname, APPLY ? 'link-applied-log.json' : 'link-dryrun-log.json'), JSON.stringify(log, null, 1))
    console.log(`\n${APPLY ? 'APPLIED' : 'DRY RUN'} — ${log.length} clips`)
    await db.end()
  }
}
main().catch(e => { console.error('ABORT:', e.message); process.exit(1) })
