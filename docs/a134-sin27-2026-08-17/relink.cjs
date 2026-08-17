// A-134 — swap the 27 corrupt eng_for_sin presentation clips for the re-recorded ones.
//
// UPDATED 2026-08-17 (RENDER worker, A-134): 12 of the 27 legos got a second re-render
// once the orchestrator found phase8's composer had a real example sentence available
// for them (recomposed.json, changes_vs_823 === true) — clip-ledger-12.json holds those
// 12 rows, staged separately at repair-candidates/a134-sin12-examples-2026-08-17/. The
// effective ledger below is clip-ledger.json (27) with those 12 rows' `new` field
// overridden by clip-ledger-12.json; `old` is unchanged (same corrupt clip being
// replaced either way — verified byte-identical old.clip_id/old.ms across both ledgers).
// The other 15 keep #823's headword-only clip from clip-ledger.json untouched.
//
// NOT RUN. Dry-run is the default and --apply is the only way past it. This exists so
// that when Kai rules on the listen page (https://watson-1.tail4968cb.ts.net/d/81770eaa)
// the swap is one command rather than a fresh piece of thinking.
//
// MAKE-BEFORE-BREAK, in the order the doctrine demands
// (docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md §6b):
//   1. generate the new audio           — DONE 2026-08-17, verified on six gates
//   2. verify each new clip is alive    — DONE, see ship-log.json
//   3. copy to a mastered/ key, insert the course_audio row, then repoint the link
//   4. delete the old clip              — NOT DONE HERE, and deliberately not.
//
// Step 4 is omitted on purpose. Deleting generated assets needs its own approval, and
// the old rows are the only remaining evidence of what learners were hearing. Leaving
// them orphaned costs nothing: the learner resolves audio by course_audio.id, so an
// unlinked row is never played.
//
// Two schema facts this relies on, both read from the live DB on 2026-08-17:
//   - course_legos.presentation_audio_id is TEXT, not uuid, so it needs ::text casts.
//   - the audio_autolink AFTER INSERT trigger only fills links that are NULL. All 27
//     are non-NULL, so inserting the new rows cannot hijack a link by itself — the
//     repoint below has to be explicit. Verified by reading link_audio_to_content().
//
// The insert also fires course_audio_touch_content_stamp, which is what actually
// invalidates the learner's cached script. A bare presentation_audio_id UPDATE does
// NOT bump course_version (that trigger watches target_text/known_text/seed_number/
// lego_index/components only), so without the insert the new audio would sit behind
// stale caches.

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { S3Client, CopyObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
const crypto = require('crypto')

const APPLY = process.argv.includes('--apply')
const COURSE = 'eng_for_sin'
const VOICE = 'azure_si-LK-SameeraNeural'   // read from courses.voice_config, not chosen
// Two staging prefixes are live now: #823's headword-only 27 and the RENDER worker's
// 12 examples. Each ledger row's new.s3_key already carries its own full prefix.
const STAGED_27 = 'repair-candidates/a134-sin27-2026-08-17/'
const STAGED_12 = 'repair-candidates/a134-sin12-examples-2026-08-17/'
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
      // Re-verify the staged object still exists and is the size we verified. A relink
      // that points at a missing key is exactly the fra_ca failure mode.
      const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: row.new.s3_key }))
      if (head.ContentLength !== row.new.bytes) {
        throw new Error(`${row.lego_id}: staged object is ${head.ContentLength}B, ledger says ${row.new.bytes}B`)
      }

      // Confirm the link still points at the clip we measured. Other sessions run
      // concurrently against this database; if something else has already moved this
      // link, stop rather than clobber it.
      const cur = await db.query(
        `select presentation_audio_id from course_legos
          where course_code=$1 and lego_id=$2`, [COURSE, row.lego_id])
      if (cur.rows[0]?.presentation_audio_id !== row.old.clip_id) {
        throw new Error(`${row.lego_id}: link has moved (now ${cur.rows[0]?.presentation_audio_id}, expected ${row.old.clip_id}) — drift, aborting`)
      }

      const newId = crypto.randomUUID()
      const finalKey = `mastered/${newId.toUpperCase()}.mp3`
      const plan = { lego_id: row.lego_id, old_clip_id: row.old.clip_id, new_clip_id: newId,
                     from: row.new.s3_key, to: finalKey, text: row.new.text, ms: row.new.ms }

      if (!APPLY) { log.push({ ...plan, applied: false }); console.log('DRY', row.lego_id, '→', newId); continue }

      // 3a. the bytes land at their permanent key first
      await s3.send(new CopyObjectCommand({ Bucket: bucket, Key: finalKey,
        CopySource: encodeURIComponent(`${bucket}/${row.new.s3_key}`), ContentType: 'audio/mpeg' }))

      // 3b. row and repoint move together, so there is no window in which the link
      //     points at a row that does not exist
      await db.query('BEGIN')
      await db.query(
        `insert into course_audio (id, course_code, lego_id, role, voice_id, text, duration_ms, s3_key, language)
         values ($1,$2,$3,'presentation',$4,$5,$6,$7,'si-LK')`,
        [newId, COURSE, row.lego_id, VOICE, row.new.text, row.new.ms, finalKey])
      const upd = await db.query(
        `update course_legos set presentation_audio_id=$1
          where course_code=$2 and lego_id=$3 and presentation_audio_id=$4`,
        [newId, COURSE, row.lego_id, row.old.clip_id])
      if (upd.rowCount !== 1) { await db.query('ROLLBACK'); throw new Error(`${row.lego_id}: repoint matched ${upd.rowCount} rows`) }
      await db.query('COMMIT')

      log.push({ ...plan, applied: true })
      console.log('APPLIED', row.lego_id, '→', newId)
    }
  } finally {
    const out = path.join(__dirname, APPLY ? 'relink-applied-log.json' : 'relink-dryrun-log.json')
    fs.writeFileSync(out, JSON.stringify(log, null, 1))
    console.log(`\n${APPLY ? 'APPLIED' : 'DRY RUN'} — ${log.length}/${ledger.length} rows, log at ${out}`)
    if (!APPLY) console.log('nothing was changed. re-run with --apply once Kai has ruled on the listen page.')
    await db.end()
  }
}

main().catch(e => { console.error('ABORT:', e.message); process.exit(1) })
