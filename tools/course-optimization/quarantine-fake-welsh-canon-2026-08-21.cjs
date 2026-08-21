#!/usr/bin/env node
/**
 * Quarantine the fake Welsh rows in canonical_seed_translations.
 *
 * Those rows are the OLD Welsh courses' sentences dumped in positionally on
 * 2026-01-25 under unrelated canon English: canon seed 267 is "Have you heard from
 * your friend?" and the Welsh filed under it means "he's been sick since the second
 * day of the holidays". Every other language in the table is correctly aligned.
 *
 * Tom's word was QUARANTINE, so nothing is deleted. translated_text is left exactly
 * as it is and only source_course is stamped, which makes the rows unmistakable to a
 * reader and fully recoverable by clearing one column.
 *
 *   node tools/course-optimization/quarantine-fake-welsh-canon-2026-08-21.cjs
 *   node tools/course-optimization/quarantine-fake-welsh-canon-2026-08-21.cjs --apply
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const APPLY = process.argv.includes('--apply')
const MARKS = {
  cym_n: 'QUARANTINE_misaligned_from_cym_n_for_eng_2026-08-21',
  cym_s: 'QUARANTINE_misaligned_from_cym_s_for_eng_2026-08-21'
}

function loadEnv() {
  const file = path.join(__dirname, '..', '..', '.env.psql')
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2]
  }
}

async function main() {
  loadEnv()
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()

  // Snapshot every affected row in full, before anything is stamped.
  const snapshot = { at: new Date().toISOString(), reason: 'misaligned Welsh in canonical_seed_translations', rows: {} }
  for (const lang of Object.keys(MARKS)) {
    const r = await db.query(
      `select * from canonical_seed_translations where language_code=$1 order by seed_number`, [lang])
    snapshot.rows[lang] = r.rows
    console.log(`${lang}: ${r.rowCount} rows, existing source_course values: ` +
      JSON.stringify([...new Set(r.rows.map(x => x.source_course))]))
  }
  const snapPath = path.join(__dirname, '..', '..', 'docs', 'cym-canon-translations-quarantine-snapshot-2026-08-21.json')
  fs.writeFileSync(snapPath, JSON.stringify(snapshot, null, 2))
  console.log('snapshot ->', snapPath)

  // Sanity: the other languages must not be touched, so count them and re-count after.
  const others = (await db.query(
    `select language_code, count(*)::int n from canonical_seed_translations
      where language_code not in ('cym_n','cym_s') group by 1 order by 1`)).rows
  console.log('other languages (must be unchanged):', JSON.stringify(others))

  if (!APPLY) {
    console.log('\n[DRY RUN] would stamp source_course only; translated_text untouched. Re-run with --apply.')
    await db.end()
    return
  }

  const applied = { marks: {} }
  for (const [lang, mark] of Object.entries(MARKS)) {
    const r = await db.query(
      `update canonical_seed_translations set source_course=$2 where language_code=$1`, [lang, mark])
    applied.marks[lang] = { mark, rows: r.rowCount }
    console.log(`[MARKED] ${lang}: ${r.rowCount} rows -> ${mark}`)
  }

  // translated_text must be byte-identical to the snapshot, or we have done harm.
  for (const lang of Object.keys(MARKS)) {
    const now = (await db.query(
      `select id, translated_text from canonical_seed_translations where language_code=$1 order by seed_number`, [lang])).rows
    const was = new Map(snapshot.rows[lang].map(r => [r.id, r.translated_text]))
    for (const row of now) {
      if (was.get(row.id) !== row.translated_text) throw new Error(`TEXT CHANGED on ${lang} ${row.id}`)
    }
  }
  const othersAfter = (await db.query(
    `select language_code, count(*)::int n from canonical_seed_translations
      where language_code not in ('cym_n','cym_s') group by 1 order by 1`)).rows
  if (JSON.stringify(othersAfter) !== JSON.stringify(others)) throw new Error('OTHER LANGUAGES CHANGED')
  applied.text_unchanged = true
  applied.other_languages_unchanged = true
  console.log('verified: Welsh text unchanged, other languages unchanged')

  const logPath = path.join(__dirname, '..', '..', 'docs', 'cym-canon-translations-quarantine-applied-log-2026-08-21.json')
  fs.writeFileSync(logPath, JSON.stringify(applied, null, 2))
  console.log('log ->', logPath)
  await db.end()
}

main().catch(e => { console.error(e); process.exit(1) })
