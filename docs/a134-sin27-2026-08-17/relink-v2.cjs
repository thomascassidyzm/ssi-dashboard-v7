// A-134 — GO LIVE: swap the 27 corrupt eng_for_sin presentation clips for the
// re-recorded ones. Kai authorised the swap on 2026-08-17.
//
// WHY v2 EXISTS. relink.cjs (v1) was written but never run, and it does not work.
// Running it with --apply aborted on the FIRST row with 0 applied and the
// transaction rolled back — nothing was changed. Two defects, both found by
// running it rather than by reading it:
//
//   1. `origin` is NOT NULL on course_audio with no default, and v1's insert
//      omits it. Every eng_for_sin row is origin='tts'; so are these.
//
//   2. course_audio carries a UNIQUE constraint on
//      (course_code, text_normalized, language, role, voice_id).
//      S0225L01's new text is BYTE-IDENTICAL to the clip already serving
//      S0225L02 — both cards compose the same presentation. v1 would have
//      violated the constraint on that row. See the ruling below.
//
// A third thing v1 got away with rather than got right: it inserts
// language='si-LK' where all 2,237 existing presentation rows of this course
// are 'sin'. That turns out to be harmless — the BEFORE INSERT trigger
// trg_course_audio_canonical_identity runs canonical_language(), and
// canonical_language('si-LK') = 'sin'. v2 passes 'sin' directly so the written
// value and the intended value are the same string.
//
// Likewise text_normalized: NOT NULL, but the BEFORE INSERT trigger
// trg_course_audio_normalize fills it from normalize_text(NEW.text). v2 does
// not set it — the database owns that column, and the unique constraint is
// enforced on the database's own normalisation, not on any JS equivalent.
//
// THE S0225L01 RULING. Its new clip is not inserted. The existing clip
// 37468b55-3011-448f-95c6-f5814b27e073 (rendered 2026-04-15, currently serving
// S0225L02) carries the identical text and the identical voice, and it was
// gate-checked here before this decision: zero 'ඒ ගෙ' filler pairs voiced,
// headword උත්තරයක් voiced, final word ඉතින් voiced, all read from its stored
// word_boundaries. So S0225L01 is REPOINTED AT THAT HEALTHY EXISTING CLIP.
// This is exactly what the reuse planner would do for two slots that share a
// text, and it is the only action that respects the constraint without
// inventing a difference between two identical clips. The freshly rendered
// S0225L01 take stays staged in S3, unused.
//
// MAKE-BEFORE-BREAK, in the order the doctrine demands
// (docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md §6b):
//   1. generate the new audio        — DONE 2026-08-17, seven gates
//   2. verify each new clip is alive — re-verified here per row against S3
//   3. copy to mastered/, insert the row, repoint the link, in one transaction
//   4. delete the old clip           — DELIBERATELY NOT DONE. Deleting
//      generated assets needs its own approval, and the old rows are the only
//      remaining evidence of what learners were hearing. An unlinked row is
//      never played: the learner resolves audio by course_audio.id.
//
// Cache invalidation is real and is why the insert matters. The INSERT fires
// course_audio_touch_content_stamp, which bumps courses.content_stamp for
// eng_for_sin and invalidates the learner's cached script. A bare
// presentation_audio_id UPDATE does NOT bump it — so the 26 inserts are what
// carry S0225L01's pure-repoint past the caches too.

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { S3Client, CopyObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
const crypto = require('crypto')

const APPLY = process.argv.includes('--apply')
const COURSE = 'eng_for_sin'
const VOICE = 'azure_si-LK-SameeraNeural'   // read from courses.voice_config, not chosen
const LANGUAGE = 'sin'                       // the convention all 2,237 siblings use
const ORIGIN = 'tts'                         // the only value present in this course

// S0225L01 is served by reuse, not by insert. See the ruling above.
const REUSE = { S0225L01: '37468b55-3011-448f-95c6-f5814b27e073' }

const ledger27 = require('./clip-ledger.json')
const ledger12 = require('./clip-ledger-12.json')
const ledger = ledger27.map(row => {
  const override = ledger12.find(r => r.lego_id === row.lego_id)
  return override ? { ...row, new: override.new } : row
})

function dbUrl() {
  const f = path.resolve(__dirname, '../../.env.psql')
  return fs.readFileSync(f, 'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
}

async function main() {
  const bucket = process.env.S3_AUDIO_BUCKET || process.env.S3_BUCKET
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' })
  const db = new Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } })
  await db.connect()

  const log = []
  try {
    for (const row of ledger) {
      // Confirm the link still points at the clip we measured. Other sessions
      // run concurrently against this database; if something else has already
      // moved this link, stop rather than clobber it.
      const cur = await db.query(
        `select presentation_audio_id from course_legos
          where course_code=$1 and lego_id=$2`, [COURSE, row.lego_id])
      if (cur.rows[0]?.presentation_audio_id !== row.old.clip_id) {
        throw new Error(`${row.lego_id}: link has moved (now ${cur.rows[0]?.presentation_audio_id}, expected ${row.old.clip_id}) — drift, aborting`)
      }

      // ---- the reuse case: no new bytes, no new row, just the repoint ----
      if (REUSE[row.lego_id]) {
        const reuseId = REUSE[row.lego_id]
        const ok = await db.query(
          `select id, duration_ms, s3_key from course_audio where id=$1 and course_code=$2`,
          [reuseId, COURSE])
        if (!ok.rows[0]) throw new Error(`${row.lego_id}: reuse target ${reuseId} not found`)
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: ok.rows[0].s3_key }))

        const plan = { lego_id: row.lego_id, old_clip_id: row.old.clip_id, new_clip_id: reuseId,
                       mode: 'reuse-existing', s3_key: ok.rows[0].s3_key, ms: ok.rows[0].duration_ms }
        if (!APPLY) { log.push({ ...plan, applied: false }); console.log('DRY  REUSE', row.lego_id, '→', reuseId); continue }

        const upd = await db.query(
          `update course_legos set presentation_audio_id=$1
            where course_code=$2 and lego_id=$3 and presentation_audio_id=$4`,
          [reuseId, COURSE, row.lego_id, row.old.clip_id])
        if (upd.rowCount !== 1) throw new Error(`${row.lego_id}: repoint matched ${upd.rowCount} rows`)
        log.push({ ...plan, applied: true })
        console.log('APPLIED REUSE', row.lego_id, '→', reuseId)
        continue
      }

      // ---- the normal case: staged bytes become a permanent clip ----
      // Re-verify the staged object still exists and is the size we verified.
      // A relink that points at a missing key is exactly the fra_ca failure mode.
      const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: row.new.s3_key }))
      if (head.ContentLength !== row.new.bytes) {
        throw new Error(`${row.lego_id}: staged object is ${head.ContentLength}B, ledger says ${row.new.bytes}B`)
      }

      const newId = crypto.randomUUID()
      const finalKey = `mastered/${newId.toUpperCase()}.mp3`
      const plan = { lego_id: row.lego_id, old_clip_id: row.old.clip_id, new_clip_id: newId,
                     mode: 'insert', from: row.new.s3_key, to: finalKey,
                     text: row.new.text, ms: row.new.ms }

      if (!APPLY) { log.push({ ...plan, applied: false }); console.log('DRY ', row.lego_id, '→', newId); continue }

      // 3a. the bytes land at their permanent key first
      await s3.send(new CopyObjectCommand({ Bucket: bucket, Key: finalKey,
        CopySource: encodeURIComponent(`${bucket}/${row.new.s3_key}`), ContentType: 'audio/mpeg' }))

      // 3b. row and repoint move together, so there is no window in which the
      //     link points at a row that does not exist
      await db.query('BEGIN')
      try {
        await db.query(
          `insert into course_audio (id, course_code, lego_id, role, voice_id, text, duration_ms, s3_key, language, origin)
           values ($1,$2,$3,'presentation',$4,$5,$6,$7,$8,$9)`,
          [newId, COURSE, row.lego_id, VOICE, row.new.text, row.new.ms, finalKey, LANGUAGE, ORIGIN])
        const upd = await db.query(
          `update course_legos set presentation_audio_id=$1
            where course_code=$2 and lego_id=$3 and presentation_audio_id=$4`,
          [newId, COURSE, row.lego_id, row.old.clip_id])
        if (upd.rowCount !== 1) throw new Error(`${row.lego_id}: repoint matched ${upd.rowCount} rows`)
        await db.query('COMMIT')
      } catch (e) {
        await db.query('ROLLBACK')
        throw e
      }

      log.push({ ...plan, applied: true })
      console.log('APPLIED', row.lego_id, '→', newId)
    }
  } finally {
    const out = path.join(__dirname, APPLY ? 'relink-v2-applied-log.json' : 'relink-v2-dryrun-log.json')
    fs.writeFileSync(out, JSON.stringify(log, null, 1))
    console.log(`\n${APPLY ? 'APPLIED' : 'DRY RUN'} — ${log.length}/${ledger.length} rows, log at ${out}`)
    await db.end()
  }
}

main().catch(e => { console.error('ABORT:', e.message); process.exit(1) })
