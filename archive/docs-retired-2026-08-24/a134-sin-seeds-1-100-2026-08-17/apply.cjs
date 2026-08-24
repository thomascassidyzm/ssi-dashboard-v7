// A-134 seeds 1-100 — apply the repairs. DRY RUN by default; --apply is the only way past it.
//
// MAKE-BEFORE-BREAK (docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md §6b):
//   1. generate new audio        — DONE (render.cjs, ship-log.json, 19/19 passing 7 gates)
//   2. verify each clip alive    — DONE; and for the REUSE rows the target clip is verified
//                                  live in the DB (voice, s3_key, boundaries, corruption-free)
//                                  before anything is pointed at it
//   3. swap links atomically     — here, one transaction per item, drift-guarded
//   4. delete the old clip       — NEVER. Not here, not later without its own approval.
//                                  The old rows are the only evidence of what learners heard.
//
// THREE ROW KINDS:
//   REUSE  (13 seeds) — a course_audio clip for the repaired text ALREADY EXISTS, because the
//                       practice phrase carrying that exact Sinhala was already rendered and is
//                       already live. Repoint at it. No insert, no upload, no new asset. My own
//                       fresh renders of these 13 agree with them to within 20-40ms, which is
//                       independent corroboration that both speak the same sentence.
//   INSERT  (3 seeds) — S0062/S0071/S0082, the composed repairs. No existing clip; upload the
//                       newly rendered one and insert a course_audio row.
//   PRESENT (3 legos) — audio-only fix. No text changes in any content table.
//
// PROGRESS MIGRATION (standing doctrine, docs/pods/pod-migration-protocol.md, plate A-111):
// rule 6 — "a sentence that changed at all counts as new, not as surviving; doubt resolves to
// unheard". A seed's known_text changing means every learner credited with it was credited for
// a sentence they never heard. So seed_progress.is_introduced is reset IN THE SAME TRANSACTION
// as the text change (rule 8). lego_progress is untouched: no LEGO text changes here, so no
// mastery moves and rule 7 (progress cannot go backwards) holds by construction. Measured on
// the live DB: introduction_played/introduction_complete are 0 across all 793 lego_progress
// rows for the three presentation legos, so those fixes have no introduction state to migrate.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs'), path = require('path'), crypto = require('crypto')
const { Client } = require('pg')
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')

const APPLY = process.argv.includes('--apply')
const COURSE = 'eng_for_sin', VOICE = 'azure_si-LK-SameeraNeural'
const dbUrl = () => fs.readFileSync(path.resolve(__dirname, '../../.env.psql'), 'utf8').match(/DATABASE_URL=(.+)/)[1].trim()

async function main() {
  const P = require('./proposal.json')
  const ship = require('./ship-log.json')
  const bucket = process.env.S3_AUDIO_BUCKET || process.env.S3_BUCKET
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' })
  const db = new Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } })
  await db.connect()
  const log = []

  try {
    for (const r of P.seed_repairs) {
      const id = `S${String(r.seed).padStart(4, '0')}-known`
      const take = ship.find(s => s.id === id)
      if (!take?.shipped) throw new Error(`${id}: no passing take`)

      const cur = await db.query(
        `select seed_id, known_text, known_audio_id from course_seeds where course_code=$1 and seed_number=$2`,
        [COURSE, r.seed])
      const s = cur.rows[0]
      if (s.known_text === r.new) { console.log(`SKIP S${r.seed} already repaired`); continue }

      const ex = await db.query(
        `select id, duration_ms from course_audio
          where course_code=$1 and role='known' and normalize_text(text)=normalize_text($2) limit 1`,
        [COURSE, r.new])
      const reuse = ex.rows[0] || null

      let newClipId, plan
      if (reuse) {
        newClipId = reuse.id
        plan = { seed: r.seed, mode: 'REUSE', tier: r.tier, old_text: s.known_text, new_text: r.new,
                 old_clip: s.known_audio_id, new_clip: newClipId, uploaded: null,
                 reuse_ms: reuse.duration_ms, my_render_ms: take.shipped.ms }
      } else {
        newClipId = crypto.randomUUID()
        plan = { seed: r.seed, mode: 'INSERT', tier: r.tier, old_text: s.known_text, new_text: r.new,
                 old_clip: s.known_audio_id, new_clip: newClipId, uploaded: `mastered/${newClipId.toUpperCase()}.mp3`,
                 my_render_ms: take.shipped.ms }
      }

      if (!APPLY) {
        const sp = await db.query(`select count(*)::int n from seed_progress where seed_id=$1 and is_introduced`, [s.seed_id])
        log.push({ ...plan, progress_rows_to_migrate: sp.rows[0].n, applied: false })
        console.log(`DRY  S${String(r.seed).padStart(3)} ${plan.mode.padEnd(6)} ${String(s.known_audio_id).slice(0,8)} -> ${String(newClipId).slice(0,8)}  progress:${sp.rows[0].n}`)
        continue
      }

      if (!reuse) {
        await s3.send(new PutObjectCommand({ Bucket: bucket, Key: plan.uploaded,
          Body: fs.readFileSync(take.shipped.file), ContentType: 'audio/mpeg' }))
        const h = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: plan.uploaded }))
        console.log(`  uploaded ${plan.uploaded} (${h.ContentLength}B) and verified alive before any link moved`)
      }

      await db.query('BEGIN')
      if (!reuse) {
        await db.query(
          `insert into course_audio (id, course_code, role, voice_id, text, duration_ms, s3_key, language, word_boundaries, origin)
           values ($1,$2,'known',$3,$4,$5,$6,'si-LK',$7,'tts')`,
          [newClipId, COURSE, VOICE, r.new, take.shipped.ms, plan.uploaded, JSON.stringify(take.shipped.word_boundaries)])
      }
      const upd = await db.query(
        `update course_seeds set known_text=$1, known_audio_id=$2
          where course_code=$3 and seed_number=$4 and known_text=$5 and known_audio_id is not distinct from $6`,
        [r.new, newClipId, COURSE, r.seed, s.known_text, s.known_audio_id])
      if (upd.rowCount !== 1) { await db.query('ROLLBACK'); throw new Error(`S${r.seed}: seed update matched ${upd.rowCount} rows — drift, aborting`) }
      const mig = await db.query(
        `update seed_progress set is_introduced=false, introduced_at=null, updated_at=now()
          where seed_id=$1 and is_introduced`, [s.seed_id])
      await db.query('COMMIT')
      log.push({ ...plan, progress_rows_migrated: mig.rowCount, applied: true })
      console.log(`APPLIED S${r.seed} ${plan.mode} -> ${String(newClipId).slice(0,8)}  progress reset:${mig.rowCount}`)
    }

    for (const a of P.audio_repairs) {
      const take = ship.find(s => s.id === `${a.lego}-presentation`)
      const cur = await db.query(
        `select presentation_audio_id from course_legos where course_code=$1 and lego_id=$2`, [COURSE, a.lego])
      const oldId = cur.rows[0].presentation_audio_id
      const newClipId = crypto.randomUUID()
      const key = `mastered/${newClipId.toUpperCase()}.mp3`
      const plan = { lego: a.lego, mode: 'PRESENT', old_clip: oldId, new_clip: newClipId, uploaded: key,
                     old_text: take.old_text, new_text: a.new_text }
      if (!APPLY) { log.push({ ...plan, applied: false }); console.log(`DRY  ${a.lego} PRESENT ${String(oldId).slice(0,8)} -> ${newClipId.slice(0,8)}`); continue }

      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: fs.readFileSync(take.shipped.file), ContentType: 'audio/mpeg' }))
      const h = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
      console.log(`  uploaded ${key} (${h.ContentLength}B) and verified alive before any link moved`)
      await db.query('BEGIN')
      await db.query(
        `insert into course_audio (id, course_code, lego_id, role, voice_id, text, duration_ms, s3_key, language, word_boundaries, origin)
         values ($1,$2,$3,'presentation',$4,$5,$6,$7,'si-LK',$8,'tts')`,
        [newClipId, COURSE, a.lego, VOICE, a.new_text, take.shipped.ms, key, JSON.stringify(take.shipped.word_boundaries)])
      const upd = await db.query(
        `update course_legos set presentation_audio_id=$1 where course_code=$2 and lego_id=$3 and presentation_audio_id=$4`,
        [newClipId, COURSE, a.lego, oldId])
      if (upd.rowCount !== 1) { await db.query('ROLLBACK'); throw new Error(`${a.lego}: repoint matched ${upd.rowCount} rows`) }
      await db.query('COMMIT')
      log.push({ ...plan, applied: true })
      console.log(`APPLIED ${a.lego} PRESENT -> ${newClipId.slice(0,8)}`)
    }
  } finally {
    const out = path.join(__dirname, APPLY ? 'apply-applied-log.json' : 'apply-dryrun-log.json')
    fs.writeFileSync(out, JSON.stringify(log, null, 1))
    console.log(`\n${APPLY ? 'APPLIED' : 'DRY RUN'} — ${log.length} rows, log at ${out}`)
    console.log('old clips deleted: 0 (deletion needs its own approval and is not part of this pass)')
    await db.end()
  }
}
main().catch(e => { console.error('ABORT:', e.message); process.exit(1) })
