#!/usr/bin/env node
/**
 * Welsh North rebuild, phase 1: drop the crappy tail (seeds 268-305) from the CLONE,
 * and repair the two Cyrillic homoglyphs in the Welsh.
 *
 * Only cym_nnew_for_eng is ever written to. The script refuses to run if the target
 * course code is the live one, and asserts the live row counts are unchanged at the end.
 * Every row it removes is snapshotted to docs/ first.
 *
 *   node tools/course-optimization/discard-tail-cym-nnew-2026-08-21.cjs
 *   node tools/course-optimization/discard-tail-cym-nnew-2026-08-21.cjs --apply
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const LIVE = 'cym_n_for_eng'
const CLONE = 'cym_nnew_for_eng'
const FROM = 268
const TO = 305
const APPLY = process.argv.includes('--apply')

// Cyrillic small letter ie (U+0435) sitting in Welsh words, in place of a Latin e.
const CY_E = '\u0435' // written as an escape so this file cannot itself be misread
const HOMOGLYPH_FIXES = [
  { lego_id: 'S0264L02', from: `probl${CY_E}m`, to: 'problem' },
  { lego_id: 'S0271L01', from: `h${CY_E}r`, to: 'her' }
]

function loadEnv() {
  const file = path.join(__dirname, '..', '..', '.env.psql')
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2]
  }
}

async function main() {
  if (CLONE === LIVE) throw new Error('refusing to touch the live course')
  loadEnv()
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()

  const liveBefore = {}
  for (const t of ['course_seeds', 'course_legos', 'course_practice_phrases']) {
    liveBefore[t] = (await db.query(`select count(*)::int n from ${t} where course_code=$1`, [LIVE])).rows[0].n
  }

  // Snapshot everything that is about to disappear, before anything disappears.
  const snapshot = { course: CLONE, discarded_range: [FROM, TO], at: new Date().toISOString() }
  for (const t of ['course_seeds', 'course_legos', 'course_practice_phrases']) {
    const r = await db.query(
      `select * from ${t} where course_code=$1 and seed_number between $2 and $3 order by seed_number, id`,
      [CLONE, FROM, TO])
    snapshot[t] = r.rows
  }
  const snapPath = path.join(__dirname, '..', '..', 'docs', 'cym-n-discarded-tail-268-305-snapshot-2026-08-21.json')
  fs.writeFileSync(snapPath, JSON.stringify(snapshot, null, 2))
  console.log(`snapshot -> ${snapPath}`)
  console.log('to remove:', Object.fromEntries(
    ['course_seeds', 'course_legos', 'course_practice_phrases'].map(t => [t, snapshot[t].length])))

  // The homoglyph rows, before and after, so the fix is auditable.
  const fixLog = []
  for (const f of HOMOGLYPH_FIXES) {
    const r = await db.query(
      `select lego_id, seed_number, known_text, target_text from course_legos where course_code=$1 and lego_id=$2`,
      [CLONE, f.lego_id])
    fixLog.push({ ...f, found: r.rowCount, before: r.rows[0] || null,
      in_discarded_range: r.rows[0] ? r.rows[0].seed_number >= FROM && r.rows[0].seed_number <= TO : null })
  }
  console.log('homoglyph targets:', JSON.stringify(fixLog.map(f => ({ id: f.lego_id, before: f.before && f.before.target_text, discarded: f.in_discarded_range }))))

  if (!APPLY) {
    console.log('\n[DRY RUN] nothing written. Re-run with --apply.')
    await db.end()
    return
  }

  // Fix first, delete second: the S0271 row is inside the discarded range and will
  // go away regardless, and doing it in this order keeps the log honest about that.
  const applied = { fixes: [], deletes: {} }
  for (const f of HOMOGLYPH_FIXES) {
    const r = await db.query(
      `update course_legos set target_text=$3, updated_at=now()
        where course_code=$1 and lego_id=$2 and target_text=$4`,
      [CLONE, f.lego_id, f.to, f.from])
    applied.fixes.push({ lego_id: f.lego_id, rows: r.rowCount })
    console.log(`[FIXED] ${f.lego_id}: ${r.rowCount} row(s)`)
  }

  for (const t of ['course_practice_phrases', 'course_legos', 'course_seeds']) {
    const r = await db.query(
      `delete from ${t} where course_code=$1 and seed_number between $2 and $3`, [CLONE, FROM, TO])
    applied.deletes[t] = r.rowCount
    console.log(`[DELETED] ${t}: ${r.rowCount} rows`)
  }

  const after = {}
  for (const t of ['course_seeds', 'course_legos', 'course_practice_phrases']) {
    after[t] = (await db.query(`select count(*)::int n from ${t} where course_code=$1`, [CLONE])).rows[0].n
  }
  applied.clone_counts_after = after
  console.log('clone counts after:', after)

  for (const t of ['course_seeds', 'course_legos', 'course_practice_phrases']) {
    const n = (await db.query(`select count(*)::int n from ${t} where course_code=$1`, [LIVE])).rows[0].n
    if (n !== liveBefore[t]) throw new Error(`LIVE COURSE CHANGED on ${t}: ${liveBefore[t]} -> ${n}`)
  }
  applied.live_unchanged = true

  const logPath = path.join(__dirname, '..', '..', 'docs', 'cym-n-discard-applied-log-2026-08-21.json')
  fs.writeFileSync(logPath, JSON.stringify({ ...applied, homoglyphs: fixLog }, null, 2))
  console.log('log ->', logPath)
  await db.end()
}

main().catch(e => { console.error(e); process.exit(1) })
