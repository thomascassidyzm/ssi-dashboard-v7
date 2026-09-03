#!/usr/bin/env node
/**
 * repair-pod-legos-first-seen.cjs — make `pod_legos.first_seen_sentence` name a
 * sentence that still exists.
 *
 * WHY THIS EXISTS. `pod_legos.first_seen_sentence` is a `<course>:<slug>:<tail>`
 * SLOT key, and `pod-switchover.cjs` never carried it. So every course that
 * crossed to `pod-1` under Tom's ruling of 2026-08-22 left its pod_legos rows
 * naming `<course>:pod-0:<tail>` ids that no longer exist. Job #157's residue
 * census, 2026-09-03: 7,802 rows across 19 of the 22 flipped courses.
 *
 * IT IS PROVENANCE, NOT PLUMBING. Nothing joins on this column — verified against
 * the schema (no foreign key) and against the code (no query filters or joins on
 * `first_seen_sentence`; it is read for display and for "where did this lego first
 * appear"). So a dangling value breaks nothing today; it just makes the provenance
 * a lie, and it accrues one course at a time forever until somebody stops it.
 *
 * THE REMAP IS PROVABLE, NOT INFERRED. A switchover only rewrites the SLUG segment
 * of a sentence id; the tail is carried verbatim. So the repair is
 * `<course>:pod-0:<tail>` → `<course>:<serving-slug>:<tail>`, and the tool REFUSES
 * to write any row whose rewritten id does not already exist in
 * `listening_pod_sentences`. Measured before this landed: 7,802 dangling, 7,802
 * remap cleanly, zero guesses required.
 *
 * WHAT IT LEAVES ALONE, and says so. There is a SECOND, older dangling class in the
 * same column — ~4,600 rows whose `first_seen_sentence` is a bare integer, not a
 * slot key at all. Different defect, different origin, not this tool's business; it
 * is counted and reported, never touched.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write. One transaction, every changed row
 * logged to repair-pod-legos-first-seen-{dryrun,applied}-log.json.
 *
 *   node tools/pods/repair-pod-legos-first-seen.cjs
 *   node tools/pods/repair-pod-legos-first-seen.cjs --apply
 *   node tools/pods/repair-pod-legos-first-seen.cjs --course=fra_for_eng --apply
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql'), quiet: true })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { planPodLegoRemap } = require('./pod-legos-remap.cjs')

const APPLY = process.argv.includes('--apply')
const arg = (n) => {
  const a = process.argv.find(x => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}
const COURSE = arg('course')

;(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  try {
    const where = COURSE ? `and first_seen_sentence like $1` : ''
    const params = COURSE ? [`${COURSE}:%`] : []
    const legos = (await db.query(
      `select id, first_seen_sentence from pod_legos
        where first_seen_sentence is not null ${where}`, params)).rows

    const live = new Set((await db.query(`select id from listening_pod_sentences`)).rows.map(r => r.id))
    const plan = planPodLegoRemap({ legos, liveSentenceIds: live })

    console.log(`pod_legos rows with a first_seen_sentence: ${legos.length}`)
    console.log(`  already live:                    ${plan.alive.length}`)
    console.log(`  dangling, remap PROVED:          ${plan.remap.length}`)
    console.log(`  dangling, NOT a slot key:        ${plan.notASlotKey.length}  (left alone — older, unrelated defect)`)
    console.log(`  dangling, no live target:        ${plan.unresolvable.length}  (left alone — refusing to guess)`)
    const byCourse = {}
    for (const r of plan.remap) {
      const c = r.from.split(':')[0]
      byCourse[c] = (byCourse[c] || 0) + 1
    }
    for (const [c, n] of Object.entries(byCourse).sort((a, b) => b[1] - a[1])) console.log(`    ${c}: ${n}`)

    const logPath = path.join(__dirname, `repair-pod-legos-first-seen-${APPLY ? 'applied' : 'dryrun'}-log.json`)
    fs.writeFileSync(logPath, JSON.stringify({
      when: new Date().toISOString(), apply: APPLY, course: COURSE || 'ALL',
      counts: {
        considered: legos.length, alive: plan.alive.length, remapped: plan.remap.length,
        notASlotKey: plan.notASlotKey.length, unresolvable: plan.unresolvable.length,
      },
      byCourse,
      rows: plan.remap,
      unresolvable: plan.unresolvable,
    }, null, 2))
    console.log(`log: ${logPath}`)

    if (!APPLY) { console.log('\nDRY RUN — nothing written. Pass --apply.'); return }
    if (!plan.remap.length) { console.log('\nNothing to do.'); return }

    await db.query('begin')
    let n = 0
    for (const r of plan.remap) {
      const res = await db.query(
        `update pod_legos set first_seen_sentence = $1 where id = $2 and first_seen_sentence = $3`,
        [r.to, r.legoId, r.from])
      // Per-row before-state assertion: if the row moved under us, abort the lot.
      if (res.rowCount !== 1) throw new Error(`drift: pod_lego ${r.legoId} no longer holds ${r.from}`)
      n++
    }
    const stillDangling = (await db.query(
      `select count(*)::int n from pod_legos pl
        where pl.first_seen_sentence like '%:pod-0:%'
          and not exists (select 1 from listening_pod_sentences s where s.id = pl.first_seen_sentence)`)).rows[0].n
    if (stillDangling) throw new Error(`post-check: ${stillDangling} slot-key rows still dangling — rolling back`)
    await db.query('commit')
    console.log(`\nAPPLIED: ${n} rows. Slot-key danglers remaining: 0.`)
  } catch (e) {
    try { await db.query('rollback') } catch (_) {}
    console.error(`FAILED: ${e.message}`)
    process.exitCode = 1
  } finally {
    await db.end()
  }
})()
