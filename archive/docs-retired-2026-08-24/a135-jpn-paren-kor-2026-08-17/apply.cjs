// A-135 — apply the Korean and Japanese known-side repairs. DRY RUN unless --apply.
//
// SCOPE: eng_for_kor (33 patches + 2 deletions) and eng_for_jpn (2 patches). The Japanese
// PARENTHETICAL strip is NOT in this file — worker #894 refuted that plan and it is held.
//
// MAKE-BEFORE-BREAK (docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md §6b), and note the order
// is what makes it true rather than a claim about it:
//   1. generate            — DONE (render.cjs; 33/33 passing seven gates, 2 spares each)
//   2. verify alive        — upload to S3 and HeadObject it BEFORE any link moves; then INSERT
//                            the course_audio row, so the clip exists and is fetchable...
//   3. swap links          — ...and only THEN update known_text. The trigger
//                            trg_null_phrase_audio_on_text_change reads audio_id_for_text()
//                            during the UPDATE, finds the clip we just inserted, and binds it.
//                            The slot is therefore never silent for a single instant.
//   4. delete the old clip — NEVER. Not here, not later without its own approval. The old rows
//                            are the only evidence of what learners actually heard.
//
// Everything for one row happens in ONE transaction, drift-guarded: the row's current
// known_text must still be exactly what the plan was built against, or that row is skipped and
// reported. Concurrent sessions move this database.
//
// APPROVAL STATE: Kai's recorded rule is "an edit unapproves a seed, a finding doesn't". These
// are meaning-affecting text edits, so every seed carrying an applied edit is unapproved for
// human re-approval, in the same transaction as the edit (2026-08-11 precedent, where
// eng_for_mar unapproved 36 seeds).
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs'), path = require('path'), crypto = require('crypto')
const { Client } = require('pg')
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')

const APPLY = process.argv.includes('--apply')
const dbUrl = () => fs.readFileSync(path.resolve(__dirname, '../../.env.psql'), 'utf8')
  .match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)[1].trim()

function worklist() {
  const kor = require('./kor-final-plan.json')
  const kor2 = require('./kor-round2-plan.json')
  const jpn = require('./engjpn-4-plan.json')
  const ship = require('./render-ship-log.json')
  const shipBy = new Map(ship.map(s => [s.id, s]))
  const rows = []
  for (const r of kor) {
    if (r.action === 'patch') rows.push({ course: 'eng_for_kor', id: r.row_uuid, seed: r.seed_number, op: 'patch',
      old: r.old_known_text, neu: r.new_known_text, old_clip: r.clip_id, relinks_to: r.relinks_to, ship: shipBy.get(r.row_uuid) })
    if (r.action === 'delete') rows.push({ course: 'eng_for_kor', id: r.row_uuid, seed: r.seed_number, op: 'delete', old: r.old_known_text })
  }
  for (const r of kor2) {
    if (r.action === 'patch') rows.push({ course: 'eng_for_kor', id: r.row_uuid, seed: r.seed_number, op: 'patch',
      old: r.old_known_text, neu: r.new_known_text, old_clip: r.clip_id, relinks_to: null, ship: shipBy.get(r.row_uuid) })
  }
  for (const r of jpn) {
    if (r.action === 'patch') rows.push({ course: 'eng_for_jpn', id: r.row_uuid, seed: r.seed_number, op: 'patch',
      old: r.old_known_text, neu: r.new_known_text, old_clip: r.clip_id, relinks_to: null, ship: shipBy.get(r.row_uuid) })
  }
  return rows
}

async function main() {
  const bucket = process.env.S3_AUDIO_BUCKET || process.env.S3_BUCKET
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' })
  const db = new Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } })
  await db.connect()
  const log = [], seedsTouched = new Set()

  for (const w of worklist()) {
    const cur = await db.query(
      `select id, seed_number, known_text, target_text, known_audio_id from course_practice_phrases where id=$1`, [w.id])
    if (!cur.rows.length) { log.push({ ...w, ship: undefined, skipped: 'row not found' }); console.log(`SKIP ${w.id} not found`); continue }
    const row = cur.rows[0]

    // Drift guard: the plan was built against this exact text.
    if (row.known_text !== w.old) {
      log.push({ ...w, ship: undefined, skipped: `drift: known_text is now ${JSON.stringify(row.known_text)}` })
      console.log(`SKIP ${w.id} DRIFT`); continue
    }

    if (w.op === 'delete') {
      if (!APPLY) { log.push({ ...w, ship: undefined, applied: false, note: 'would DELETE row' }); console.log(`DRY  DELETE ${w.id}`); continue }
      await db.query('begin')
      try {
        const before = await db.query(`select * from course_practice_phrases where id=$1`, [w.id])
        await db.query(`delete from course_practice_phrases where id=$1`, [w.id])
        await db.query(`update course_seeds set approved_at=null where course_code=$1 and seed_number=$2 and approved_at is not null`, [w.course, row.seed_number])
        await db.query('commit')
        seedsTouched.add(`${w.course}:${row.seed_number}`)
        log.push({ ...w, ship: undefined, applied: true, deleted_row: before.rows[0] })
        console.log(`DEL  ${w.id}`)
      } catch (e) { await db.query('rollback'); throw e }
      continue
    }

    // A patch. Decide the clip BEFORE touching text — this is step 2, and it must complete.
    const wanted = await db.query(`select audio_id_for_text($1,$2,'known') id`, [w.course, w.neu])
    let clipId = wanted.rows[0].id, uploaded = null, mode

    if (clipId) {
      // Free rebind. Verify the target clip is alive and correctly voiced before trusting it.
      const c = await db.query(`select id, voice_id, language, s3_key, duration_ms, text from course_audio where id=$1`, [clipId])
      const cl = c.rows[0]
      const okVoice = w.course === 'eng_for_kor' ? /ko-KR-SunHiNeural/.test(cl.voice_id) : /ja-JP-MayuNeural/.test(cl.voice_id)
      if (!cl.s3_key || !okVoice) { log.push({ ...w, ship: undefined, skipped: `rebind target unfit: voice=${cl.voice_id} s3=${!!cl.s3_key}` }); console.log(`SKIP ${w.id} unfit rebind`); continue }
      mode = 'REBIND'
    } else {
      if (!w.ship?.shipped) { log.push({ ...w, ship: undefined, skipped: 'no passing take rendered' }); console.log(`SKIP ${w.id} no take`); continue }
      mode = 'INSERT'
      clipId = crypto.randomUUID()
      uploaded = `mastered/${clipId.toUpperCase()}.mp3`
    }

    if (!APPLY) {
      log.push({ course: w.course, id: w.id, seed: row.seed_number, op: 'patch', mode, old: w.old, neu: w.neu,
                 old_clip: row.known_audio_id, new_clip: clipId, uploaded, applied: false })
      console.log(`DRY  ${mode.padEnd(6)} ${w.id}  ${String(row.known_audio_id).slice(0,8)} -> ${String(clipId).slice(0,8)}`)
      continue
    }

    if (mode === 'INSERT') {
      const body = fs.readFileSync(w.ship.shipped.file)
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: uploaded, Body: body, ContentType: 'audio/mpeg' }))
      const h = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: uploaded }))  // proof it is alive
      console.log(`  uploaded ${uploaded} (${h.ContentLength}B), verified before any link moved`)
    }

    await db.query('begin')
    try {
      if (mode === 'INSERT') {
        await db.query(
          `insert into course_audio (id, course_code, text, text_normalized, language, role, voice_id, origin,
                                     s3_key, duration_ms, file_size_bytes, word_boundaries, audio_revision)
           values ($1,$2,$3,normalize_text($3),$4,'known',$5,'tts',$6,$7,$8,$9,1)`,
          [clipId, w.course, w.neu, w.course === 'eng_for_kor' ? 'kor' : 'jpn',
           w.course === 'eng_for_kor' ? 'azure_ko-KR-SunHiNeural' : 'azure_ja-JP-MayuNeural',
           uploaded, w.ship.shipped.ms, fs.statSync(w.ship.shipped.file).size,
           w.ship.shipped.word_boundaries ? JSON.stringify(w.ship.shipped.word_boundaries) : null])
      }
      // NOW move the text. The trigger binds known_audio_id to the clip that already exists.
      await db.query(`update course_practice_phrases set known_text=$2 where id=$1`, [w.id, w.neu])
      const after = await db.query(`select known_text, known_audio_id from course_practice_phrases where id=$1`, [w.id])
      if (after.rows[0].known_audio_id !== clipId) {
        throw new Error(`trigger bound ${after.rows[0].known_audio_id}, expected ${clipId}`)
      }
      await db.query(`update course_seeds set approved_at=null where course_code=$1 and seed_number=$2 and approved_at is not null`, [w.course, row.seed_number])
      await db.query('commit')
      seedsTouched.add(`${w.course}:${row.seed_number}`)
      log.push({ course: w.course, id: w.id, seed: row.seed_number, op: 'patch', mode, old: w.old, neu: w.neu,
                 old_clip: row.known_audio_id, new_clip: clipId, uploaded, applied: true })
      console.log(`OK   ${mode.padEnd(6)} ${w.id}  ${String(row.known_audio_id).slice(0,8)} -> ${String(clipId).slice(0,8)}`)
    } catch (e) { await db.query('rollback'); console.error(`FAIL ${w.id}: ${e.message}`); log.push({ ...w, ship: undefined, applied: false, error: e.message }) }
  }

  await db.end()
  const f = path.join(__dirname, APPLY ? 'apply-applied-log.json' : 'apply-dryrun-log.json')
  fs.writeFileSync(f, JSON.stringify({ seeds_unapproved: [...seedsTouched], rows: log }, null, 1))
  console.log(`\n${log.filter(l => l.applied).length} applied, ${log.filter(l => l.skipped).length} skipped, ${log.filter(l => l.error).length} errored`)
  console.log(`seeds unapproved: ${seedsTouched.size}`)
  console.log(`log -> ${f}`)
  if (!APPLY) console.log('DRY RUN — nothing was written. Re-run with --apply.')
}

main().catch(e => { console.error(e); process.exit(1) })
