#!/usr/bin/env node
/**
 * Take Sascha's seed-10-and-above takes out of learner playback — by UNLINKING,
 * never by deleting.
 *
 * Kai's ruling, 2026-08-25: seeds 1–9 are the real recording session and every
 * human take there stays. Everything from seed 10 upwards is TEST MATERIAL, and
 * those slots go back to the synthetic voice the course otherwise uses.
 *
 * Usage:
 *   node tools/deu-at-listen/unlink-test-seeds.cjs --plan
 *   node tools/deu-at-listen/unlink-test-seeds.cjs --apply
 *   node tools/deu-at-listen/unlink-test-seeds.cjs --rollback <batch-file.json>
 *
 * WHY THIS IS AN FK REPOINT AND NOT `swapClipInPlace`.
 * `swapClipInPlace` moves the BYTES under one `course_audio` row. That is the
 * right instrument when a row's audio is wrong. It is the WRONG instrument here,
 * for two reasons measured against the live database on 2026-08-25:
 *   1. Sascha's takes are their own `course_audio` rows (origin='human'), and the
 *      Azure row they displaced is still there — every one of the 78 affected
 *      slots has exactly one surviving `origin='tts'` target2 twin on the same
 *      normalized text, all `azure_de-AT-JonasNeural`. Nothing needs generating.
 *      Repointing the slot's FK back at that twin restores exactly what learners
 *      heard before the recording session, and leaves the human row and its S3
 *      object completely untouched.
 *   2. SEVEN human clips are bound at BOTH seeds 1–9 and seed 10+. Overwriting
 *      the bytes on such a row would silently change a seed 1–9 slot that Kai
 *      ruled must stay. The FK is per-slot; the bytes are not.
 *
 * WHY NO `audio_revision` BUMP.
 * The audio id IS the cache address: the app builds its ref as
 * `id` or `id.vN` (`buildAudioRef`, ssi-learning-app/api/_utils/audioAccess.ts:129)
 * and the player asks for that ref. A relink hands the learner a DIFFERENT id,
 * so the address changes on its own and the new audio is fetched. Bumping the
 * Azure row's `audio_revision` instead would be actively harmful: `.vN` refs are
 * resolved through `course_audio_revisions`, and a bump with no revision row
 * behind it points at a revision that does not exist.
 *
 * NO AUDIO IS EVER GENERATED HERE, and nothing is ever deleted. If a slot had no
 * synthetic twin to fall back to, this tool REFUSES that slot and names it, so a
 * human can decide — it will not leave a learner with silence and it will not
 * spend money to avoid one.
 */
const fs = require('fs')
const path = require('path')

const REPO = path.join(__dirname, '..', '..')
require('dotenv').config({ path: path.join(REPO, '.env') })

const { Client } = require('pg')
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3')

const COURSE = 'deu_at_for_eng'
const TEST_MATERIAL_FROM_SEED = 10
const BATCH_DIR = process.env.DEU_AT_LISTEN_DATA_DIR ||
  path.join(REPO, 'scripts', 'deu-at-listen')

/** The three content tables that can hold a clip, and the column that holds it. */
const SLOT_TABLES = [
  { table: 'course_seeds', key: 'id', col: 'target2_audio_id' },
  { table: 'course_legos', key: 'lego_id', col: 'target2_audio_id' },
  { table: 'course_practice_phrases', key: 'id', col: 'target2_audio_id' },
]

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

function dbUrl() {
  const line = fs.readFileSync(path.join(REPO, '.env.psql'), 'utf8')
  const m = line.match(/DATABASE_URL=(.+)/)
  if (!m) throw new Error('.env.psql carries no DATABASE_URL')
  return m[1].trim().replace(/^["']|["']$/g, '')
}

/**
 * Make-before-break: prove the fallback bytes are really in the bucket, and that
 * the object claims THIS course. Five takes everyone called Austrian turned out
 * to be Welsh (job #628) because nobody read the object's own `coursecode`.
 */
async function verifyObject(key) {
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }))
    const meta = head.Metadata || {}
    return { alive: true, size: head.ContentLength, coursecode: meta.coursecode || null }
  } catch (err) {
    return { alive: false, error: String(err.name || err) }
  }
}

/** Every slot at seed >= 10 currently bound to one of Sascha's human takes. */
async function loadSlots(db) {
  const parts = SLOT_TABLES.map(({ table, key, col }) => `
    select '${table}' as tbl, t.${key}::text as ref, t.seed_number as seed,
           t.${col}::text as human_id, '${col}' as col,
           h.text as human_text, h.text_normalized as tn, h.s3_key as human_key
      from ${table} t
      join course_audio h on h.id = t.${col}
     where t.course_code = $1 and h.course_code = $1
       and h.origin = 'human' and t.seed_number >= $2`)
  const { rows } = await db.query(parts.join(' union all ') + ' order by seed, tbl, ref', [COURSE, TEST_MATERIAL_FROM_SEED])
  return rows
}

/** The surviving synthetic row for a line: same course, same role, same text. */
async function loadTwins(db, tns) {
  const { rows } = await db.query(
    `select id::text, text_normalized, s3_key, voice_id, origin
       from course_audio
      where course_code = $1 and role = 'target2' and origin = 'tts'
        and text_normalized = any($2::text[])`, [COURSE, tns])
  const byText = new Map()
  for (const r of rows) {
    if (!byText.has(r.text_normalized)) byText.set(r.text_normalized, [])
    byText.get(r.text_normalized).push(r)
  }
  return byText
}

async function buildPlan(db) {
  const slots = await loadSlots(db)
  const twins = await loadTwins(db, [...new Set(slots.map((s) => s.tn))])

  const actions = []
  const refused = []
  const checked = new Map()

  for (const s of slots) {
    const cands = twins.get(s.tn) || []
    if (cands.length === 0) {
      refused.push({ ...s, why: 'no synthetic clip exists for this line — NEEDS GENERATION, not generated here' })
      continue
    }
    if (cands.length > 1) {
      refused.push({ ...s, why: `${cands.length} synthetic clips match this line — which one is a question for a human, not a coin toss` })
      continue
    }
    const twin = cands[0]
    if (!checked.has(twin.s3_key)) checked.set(twin.s3_key, await verifyObject(twin.s3_key))
    const obj = checked.get(twin.s3_key)
    if (!obj.alive) {
      refused.push({ ...s, why: `the synthetic clip's object is not in the bucket (${obj.error}) — repointing there would leave the slot silent` })
      continue
    }
    if (obj.coursecode && obj.coursecode !== COURSE) {
      refused.push({ ...s, why: `the synthetic object's own metadata says coursecode=${obj.coursecode}, not ${COURSE}` })
      continue
    }
    actions.push({
      tbl: s.tbl, ref: s.ref, col: s.col, seed: s.seed,
      from_audio_id: s.human_id, from_key: s.human_key,
      to_audio_id: twin.id, to_key: twin.s3_key, to_voice: twin.voice_id,
      text: s.human_text,
    })
  }
  return { course: COURSE, test_material_from_seed: TEST_MATERIAL_FROM_SEED, actions, refused }
}

/** One transaction. Each update names the row AND the value it is replacing, so
 *  a slot another process moved under us is not clobbered — it is reported. */
async function apply(db, plan, batchId) {
  const applied = []
  const lost = []
  await db.query('begin')
  try {
    for (const a of plan.actions) {
      const keyCol = SLOT_TABLES.find((t) => t.table === a.tbl).key
      const { rowCount } = await db.query(
        `update ${a.tbl} set ${a.col} = $1 where course_code = $2 and ${keyCol} = $3 and ${a.col} = $4`,
        [a.to_audio_id, COURSE, a.ref, a.from_audio_id])
      if (rowCount === 1) applied.push(a)
      else lost.push({ ...a, why: 'the slot no longer held the take we planned against' })
    }
    await db.query('commit')
  } catch (err) {
    await db.query('rollback')
    throw err
  }
  return { batchId, applied, lost }
}

async function rollback(db, batch) {
  const restored = []
  await db.query('begin')
  try {
    for (const a of batch.applied) {
      const keyCol = SLOT_TABLES.find((t) => t.table === a.tbl).key
      const { rowCount } = await db.query(
        `update ${a.tbl} set ${a.col} = $1 where course_code = $2 and ${keyCol} = $3 and ${a.col} = $4`,
        [a.from_audio_id, COURSE, a.ref, a.to_audio_id])
      restored.push({ ...a, restored: rowCount === 1 })
    }
    await db.query('commit')
  } catch (err) {
    await db.query('rollback')
    throw err
  }
  return restored
}

/** Read the live state back. Trusting our own writes is how silent failure gets
 *  reported as success. */
async function verifyLive(db) {
  const slots = await loadSlots(db)
  const { rows } = await db.query(
    `select count(*)::int n from course_audio where course_code = $1 and origin = 'human'`, [COURSE])
  return { human_slots_at_seed_10_plus: slots.length, human_rows_still_present: rows[0].n }
}

async function main() {
  const mode = process.argv[2]
  const db = new Client({ connectionString: dbUrl() })
  await db.connect()
  try {
    if (mode === '--rollback') {
      const file = process.argv[3]
      if (!file) throw new Error('--rollback needs the batch file')
      const batch = JSON.parse(fs.readFileSync(file, 'utf8'))
      const restored = await rollback(db, batch)
      const failed = restored.filter((r) => !r.restored)
      console.log(`restored ${restored.length - failed.length}/${restored.length} slots`)
      for (const f of failed) console.log(`  NOT restored: ${f.tbl} ${f.ref} (something else moved it)`)
      console.log(JSON.stringify(await verifyLive(db), null, 2))
      return
    }

    const plan = await buildPlan(db)
    const bySeed = {}
    for (const a of plan.actions) bySeed[a.seed] = (bySeed[a.seed] || 0) + 1
    console.log(`${plan.actions.length} slots at seed ${TEST_MATERIAL_FROM_SEED}+ would go back to the synthetic voice`)
    console.log(`  distinct human takes coming out of playback: ${new Set(plan.actions.map((a) => a.from_audio_id)).size}`)
    console.log(`  spread over seeds: ${Object.keys(bySeed).length}`)
    console.log(`  refused (left exactly as they are): ${plan.refused.length}`)
    for (const r of plan.refused) console.log(`    ${r.tbl} ${r.ref} seed ${r.seed}: ${r.why}`)

    if (mode !== '--apply') {
      console.log('\n--plan only. Nothing was written.')
      return
    }

    const batchId = `unlink-test-seeds-${new Date().toISOString().replace(/[:.]/g, '-')}`
    const result = await apply(db, plan, batchId)
    fs.mkdirSync(BATCH_DIR, { recursive: true })
    const file = path.join(BATCH_DIR, `${batchId}.json`)
    fs.writeFileSync(file, JSON.stringify({ ...result, refused: plan.refused, created_at: new Date().toISOString() }, null, 2))
    console.log(`\napplied ${result.applied.length} slots; ${result.lost.length} were not where we left them`)
    console.log(`rollback row written: ${file}`)
    console.log(`REVERSE THE WHOLE BATCH WITH:\n  node tools/deu-at-listen/unlink-test-seeds.cjs --rollback ${file}`)
    console.log(JSON.stringify(await verifyLive(db), null, 2))
  } finally {
    await db.end()
  }
}

if (require.main === module) main().catch((err) => { console.error(err); process.exit(1) })
module.exports = { buildPlan, apply, rollback, verifyLive }
