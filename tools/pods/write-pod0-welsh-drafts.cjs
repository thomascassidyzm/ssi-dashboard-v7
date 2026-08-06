#!/usr/bin/env node
/**
 * write-pod0-welsh-drafts.cjs — put the hand-written DRAFT Welsh
 * (tools/pods/pod0-welsh-drafts-2026-08-06.cjs) into the two Welsh pod-0 queues,
 * marked target_text_draft = true so nobody can record one believing it is final.
 *
 * Tom's ruling 2026-08-06: "opus drafts, Aran proofreads."
 *
 * WHY DIRECT SQL AND NOT POSTGREST: the alignment tool's header documents the two
 * traps that ate three write attempts — a PostgREST upsert takes the INSERT path so
 * every NOT NULL column must be present, and a multi-row insert's column list is the
 * UNION of the batch's keys, so one row with an extra key NULLs that column for every
 * sibling. Neither can bite a per-row UPDATE of two named columns keyed on the primary
 * key, which is all this needs. The whole run is ONE transaction, so a mid-flight
 * failure leaves nothing behind.
 *
 * SAFETY
 *   - DRY RUN by default; --apply to write.
 *   - Every row carries a before-state assertion: the slot must exist, its known_text
 *     must be byte-for-byte the English the draft was written against, and its
 *     target_text must still be EMPTY. Any drift aborts the whole run before a write.
 *   - Refuses to run unless the drafted set is exactly the set of blank canonical
 *     slots — no more, no fewer.
 *   - Touches target_text and target_text_draft ONLY. No audio pointer is set or
 *     cleared, no course_audio row is read or written, no surviving Welsh line is
 *     touched (a non-empty target_text is a hard abort, not a skip).
 *
 *   node tools/pods/write-pod0-welsh-drafts.cjs            # dry run
 *   node tools/pods/write-pod0-welsh-drafts.cjs --apply
 */
'use strict'

const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql') })
const { Client } = require('pg')
const { draftsFor, POD_SLUG } = require('./pod0-welsh-drafts-2026-08-06.cjs')

const COURSES = ['cym_n_for_eng', 'cym_s_for_eng']
const APPLY = process.argv.includes('--apply')
const ARCHIVE = path.join(__dirname, '..', '..', 'docs', 'pods', 'pod0-welsh-prealign-archive-2026-08-06')
const LOG = path.join(__dirname, '..', '..', 'docs', 'pods',
  `pod0-welsh-drafts-${APPLY ? 'applied' : 'dryrun'}-log.json`)

// The retired surplus row is parked past the canonical range and stays blank.
const CANONICAL_MAX_ORDER = 9000

/** The English each draft was written against, from the pre-write snapshot. */
function snapshotFor(course) {
  const f = path.join(ARCHIVE, `${course}-pod0-predraft-snapshot-2026-08-06.json`)
  if (!fs.existsSync(f)) throw new Error(`missing pre-write snapshot: ${f}`)
  return JSON.parse(fs.readFileSync(f, 'utf8'))
}

function planCourse(course) {
  const rows = snapshotFor(course).filter(r => r.global_order < CANONICAL_MAX_ORDER)
  const drafts = draftsFor(course)
  const blanks = rows.filter(r => !String(r.target_text || '').trim())
  const slotOf = (r) => r.id.split(`:${POD_SLUG}:`)[1]

  // The drafted set must BE the blank set. Either direction wrong is a stop.
  const blankSlots = new Set(blanks.map(slotOf))
  const draftSlots = new Set(Object.keys(drafts))
  const missing = [...blankSlots].filter(s => !draftSlots.has(s))
  const extra = [...draftSlots].filter(s => !blankSlots.has(s))
  if (missing.length) throw new Error(`${course}: ${missing.length} blank slots have no draft: ${missing.join(', ')}`)
  if (extra.length) throw new Error(`${course}: ${extra.length} drafts target a slot that is not blank: ${extra.join(', ')}`)

  const ops = blanks.map(r => {
    const slot = slotOf(r)
    const d = drafts[slot]
    if (!String(d.cy || '').trim()) throw new Error(`${r.id}: empty draft — refusing to write a blank as a draft`)
    return {
      id: r.id,
      slot,
      scene: r.scene_number,
      sentence: r.sentence_number,
      speaker: r.speaker,
      english: r.known_text,
      kind: d.kind,
      from: d.from || null,
      note: d.note || null,
      before: { target_text: r.target_text, target_audio_id: r.target_audio_id },
      after: { target_text: d.cy, target_text_draft: true },
    }
  })

  // Untouched survivors, asserted after the write.
  const survivors = rows.filter(r => String(r.target_text || '').trim())
    .map(r => ({ id: r.id, target_text: r.target_text }))

  return { course, ops, survivors, canonicalRows: rows.length }
}

async function run() {
  const plans = COURSES.map(planCourse)
  const summary = plans.map(p => ({
    course: p.course,
    canonical_rows: p.canonicalRows,
    drafting: p.ops.length,
    new_from_scratch: p.ops.filter(o => o.kind === 'new').length,
    reworded: p.ops.filter(o => o.kind === 'reworded').length,
    reworded_edited: p.ops.filter(o => o.kind === 'reworded' && o.from !== o.after.target_text).length,
    reworded_carried_unchanged: p.ops.filter(o => o.kind === 'reworded' && o.from === o.after.target_text).length,
    surviving_lines_untouched: p.survivors.length,
  }))

  fs.writeFileSync(LOG, JSON.stringify({
    mode: APPLY ? 'APPLIED' : 'DRY RUN', summary,
    ops: plans.flatMap(p => p.ops.map(o => ({ course: p.course, ...o }))),
  }, null, 1))

  if (!APPLY) {
    console.log(JSON.stringify({ mode: 'DRY RUN', summary, log: LOG }, null, 2))
    return
  }

  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  try {
    await db.query('BEGIN')
    let written = 0
    for (const p of plans) {
      for (const op of p.ops) {
        // Before-state assertion IN the write: the row must still be the row the
        // draft was written for, and must still be blank. Anything else and the
        // UPDATE matches zero rows and the whole transaction goes back.
        const r = await db.query(
          `UPDATE listening_pod_sentences
              SET target_text = $1, target_text_draft = true, updated_at = now()
            WHERE id = $2 AND known_text = $3 AND btrim(target_text) = ''`,
          [op.after.target_text, op.id, op.english])
        if (r.rowCount !== 1) {
          throw new Error(`DRIFT ${op.id}: expected 1 blank row with the English the draft was written for, matched ${r.rowCount}; nothing written`)
        }
        written++
      }
      // Survivors must be byte-identical and unmarked, asserted inside the txn.
      for (const s of p.survivors) {
        const { rows } = await db.query(
          'SELECT target_text, target_text_draft FROM listening_pod_sentences WHERE id = $1', [s.id])
        if (!rows.length || rows[0].target_text !== s.target_text) {
          throw new Error(`DRIFT ${s.id}: a surviving human line changed; nothing written`)
        }
        if (rows[0].target_text_draft) {
          throw new Error(`DRIFT ${s.id}: a surviving human line is marked draft; nothing written`)
        }
      }
    }
    await db.query('COMMIT')
    console.log(JSON.stringify({ mode: 'APPLIED', written, summary, log: LOG }, null, 2))
  } catch (e) {
    await db.query('ROLLBACK')
    throw e
  } finally {
    await db.end()
  }
}

run().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
