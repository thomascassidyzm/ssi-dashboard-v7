#!/usr/bin/env node
/**
 * Undo a relink recorded by a relink-rollback.json, in one action.
 *
 * The audio-repair `revert` verb walks back clip BYTES (a same-id swap recorded
 * in course_audio_revisions). It cannot walk back a POINTER move — re-aiming a
 * slot from one course_audio row at a different one leaves no revision history,
 * because no clip changed. That is what this does, and it is why it is a
 * separate tool rather than a flag on revert.
 *
 * Nothing was deleted by the relink, so this is a pointer write in the opposite
 * direction: every `from` row and its S3 object are still exactly where they
 * were. Guarded by the CURRENT value, so a slot that moved under us is reported
 * and left alone rather than overwritten.
 *
 *   node tools/seed1-relink-revert.cjs <rollback.json>            # dry run
 *   node tools/seed1-relink-revert.cjs <rollback.json> --apply
 */
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.psql'), quiet: true })
const { Client } = require('pg')

const FILE = process.argv[2]
const APPLY = process.argv.includes('--apply')
if (!FILE) { console.error('usage: seed1-relink-revert.cjs <relink-rollback.json> [--apply]'); process.exit(1) }

;(async () => {
  const plan = JSON.parse(fs.readFileSync(FILE, 'utf8'))
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()

  console.log(`${plan.length} slot(s) to put back${APPLY ? '' : '  [DRY RUN]'}\n`)
  let done = 0, drift = 0
  for (const p of plan) {
    // Reverse of the relink: to -> from, guarded by the slot still holding `to`.
    if (!APPLY) {
      const { rows } = await c.query(
        `select 1 from ${p.table} where ${p.keyColumn}=$1 and ${p.column}=$2`,
        [p.owner, p.to.id])
      console.log(`  ${rows.length ? 'WOULD' : 'SKIP '} ${p.owner} ${p.slot}: ${p.to.id.slice(0, 8)} -> ${p.from.id.slice(0, 8)}${rows.length ? '' : '  (slot no longer holds it)'}`)
      continue
    }
    const res = await c.query(
      `update ${p.table} set ${p.column}=$1 where ${p.keyColumn}=$2 and ${p.column}=$3`,
      [p.from.id, p.owner, p.to.id])
    if (res.rowCount === 1) { done++; console.log(`  OK    ${p.owner} ${p.slot}: back to ${p.from.id.slice(0, 8)}`) } else {
      drift++; console.log(`  DRIFT ${p.owner} ${p.slot} — moved since the relink, left alone`)
    }
  }
  if (APPLY) console.log(`\n${done} reverted, ${drift} left alone on drift.`)
  else console.log('\nNothing written. Re-run with --apply.')
  await c.end()
})().catch(e => { console.error(e); process.exit(1) })
