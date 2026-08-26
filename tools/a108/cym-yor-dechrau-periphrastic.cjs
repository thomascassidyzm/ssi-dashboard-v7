#!/usr/bin/env node
/**
 * cym_for_yor S0079: `dechrau` moves to the periphrastic past.
 *
 * Kai's ruling, 2026-08-26 (narrow): the per-verb one-form rule governs only
 * COMPETING FORMS OF THE SAME TENSE. `dechrau` is the estate's single genuine
 * case in this course — periphrastic `nes i ddechrau` (26 occurrences, from
 * S0037) against inflected `ddechreuest ti` (12 occurrences, all at S0079).
 * The periphrastic wins. Nothing else moves: preterite/imperfect/perfect
 * variation is meaning, `deud` is a named exception, `wedi blino` is exempt.
 *
 * The 2sg auxiliary is `nest ti`, not `nes ti`. That is the form this course
 * already authored for itself at S0366/S0372/S0377/S0382/S0385 (5 rows, and
 * zero rows of `nes ti`); adopting `nes ti` here would have minted exactly the
 * competing pair the ruling exists to remove.
 *
 * Every edit is guarded by its CURRENT value, so a row that moved under us is
 * reported and left alone rather than overwritten. The reverse direction is the
 * same list read backwards, which is what --revert does.
 *
 *   node tools/a108/cym-yor-dechrau-periphrastic.cjs            # dry run
 *   node tools/a108/cym-yor-dechrau-periphrastic.cjs --apply
 *   node tools/a108/cym-yor-dechrau-periphrastic.cjs --revert --apply
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true })
const { Client } = require('pg')

const CC = 'cym_for_yor'

// Authored whole-sentence rewrites. `dysgu` stays unmutated after the verbnoun
// `dechrau` (cf. S0224 "Mae o newydd ddechrau dysgu."); the soft mutation moves
// onto `ddechrau` as the object of the inflected `nest`.
const EDITS = [
  { table: 'course_seeds', key: 'id', owner: '876aa0ed-3c14-4222-90c5-69559eaa4324', col: 'target_text',
    from: 'Pryd ddechreuest ti ddysgu?', to: 'Pryd nest ti ddechrau dysgu?' },

  { table: 'course_legos', key: 'id', owner: '7e770809-6ffb-4ebc-9a3d-765d645db3cd', col: 'target_text',
    from: 'ddechreuest ti ddysgu', to: 'nest ti ddechrau dysgu' },
  // The lego's own components jsonb mirrors the component phrase below.
  { table: 'course_legos', key: 'id', owner: '7e770809-6ffb-4ebc-9a3d-765d645db3cd', col: 'components', json: true,
    from: [{ known: 'o bẹ̀rẹ̀ sí', target: 'ddechreuest ti' }],
    to: [{ known: 'o bẹ̀rẹ̀ sí', target: 'nest ti ddechrau' }] },

  { table: 'course_practice_phrases', key: 'id', owner: 'cym_for_yor:S0079L02C01', col: 'target_text',
    from: 'ddechreuest ti', to: 'nest ti ddechrau' },
  { table: 'course_practice_phrases', key: 'id', owner: 'cym_for_yor:S0079L02B01', col: 'target_text',
    from: 'pryd ddechreuest ti ddysgu Cymraeg', to: 'pryd nest ti ddechrau dysgu Cymraeg' },
  { table: 'course_practice_phrases', key: 'id', owner: 'cym_for_yor:S0079L02B02', col: 'target_text',
    from: 'ddechreuest ti ddysgu ddoe', to: 'nest ti ddechrau dysgu ddoe' },
  { table: 'course_practice_phrases', key: 'id', owner: 'cym_for_yor:S0079L02B03', col: 'target_text',
    from: 'ddechreuest ti ddysgu wythnos diwetha', to: 'nest ti ddechrau dysgu wythnos diwetha' },
  { table: 'course_practice_phrases', key: 'id', owner: 'cym_for_yor:S0079L02U01', col: 'target_text',
    from: "dw i'n gwybod pryd ddechreuest ti ddysgu", to: "dw i'n gwybod pryd nest ti ddechrau dysgu" },
  { table: 'course_practice_phrases', key: 'id', owner: 'cym_for_yor:S0079L02U02', col: 'target_text',
    from: 'dw i ddim yn gwybod pryd ddechreuest ti ddysgu', to: 'dw i ddim yn gwybod pryd nest ti ddechrau dysgu' },
  { table: 'course_practice_phrases', key: 'id', owner: 'cym_for_yor:S0079L02U03', col: 'target_text',
    from: 'pryd ddechreuest ti ddysgu efo rhywun arall?', to: 'pryd nest ti ddechrau dysgu efo rhywun arall?' },
  { table: 'course_practice_phrases', key: 'id', owner: 'cym_for_yor:S0079L02U04', col: 'target_text',
    from: 'ddechreuest ti ddysgu mis diwetha', to: 'nest ti ddechrau dysgu mis diwetha' },
  { table: 'course_practice_phrases', key: 'id', owner: 'cym_for_yor:S0079L02U05', col: 'target_text',
    from: "dw i'n cofio pryd ddechreuest ti ddysgu", to: "dw i'n cofio pryd nest ti ddechrau dysgu" },
  { table: 'course_practice_phrases', key: 'id', owner: 'cym_for_yor:S0079L02U06', col: 'target_text',
    from: 'pryd ddechreuest ti ddysgu yn Gymraeg?', to: 'pryd nest ti ddechrau dysgu yn Gymraeg?' },
]

const APPLY = process.argv.includes('--apply')
const REVERT = process.argv.includes('--revert')

;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()

  const dir = REVERT ? 'REVERT' : 'APPLY'
  console.log(`${EDITS.length} edit(s), ${dir}${APPLY ? '' : '  [DRY RUN]'}\n`)
  let done = 0, drift = 0
  for (const e of EDITS) {
    const want = REVERT ? e.to : e.from
    const set = REVERT ? e.from : e.to
    const cmp = e.json ? `${e.col}::jsonb = $2::jsonb` : `${e.col} = $2`
    const args = [e.owner, e.json ? JSON.stringify(want) : want]
    if (!APPLY) {
      const { rows } = await c.query(
        `select 1 from ${e.table} where ${e.key}=$1 and course_code='${CC}' and ${cmp}`, args)
      console.log(`  ${rows.length ? 'WOULD' : 'SKIP '} ${e.owner} ${e.col}${rows.length ? '' : '  (row does not hold the expected value)'}`)
      continue
    }
    const res = await c.query(
      `update ${e.table} set ${e.col}=$3${e.json ? '::jsonb' : ''} where ${e.key}=$1 and course_code='${CC}' and ${cmp}`,
      [...args, e.json ? JSON.stringify(set) : set])
    if (res.rowCount === 1) { done++; console.log(`  OK    ${e.owner} ${e.col}`) } else {
      drift++; console.log(`  DRIFT ${e.owner} ${e.col} — not holding the expected value, left alone`)
    }
  }
  if (APPLY) console.log(`\n${done} written, ${drift} left alone on drift.`)
  else console.log('\nNothing written. Re-run with --apply.')
  await c.end()
})().catch(e => { console.error(e); process.exit(1) })
