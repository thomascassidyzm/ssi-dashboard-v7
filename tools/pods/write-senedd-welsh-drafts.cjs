#!/usr/bin/env node
/**
 * write-senedd-welsh-drafts.cjs — put the drafted NORTHERN Welsh for the 168 English
 * floor turns into the Senedd pod, marked target_text_draft = true.
 *
 * Tom's ruling 2026-09-10: draft Welsh for the turns that were spoken in English on the
 * floor on 11 January 2024, and land them, so Aran can record them. This supersedes the
 * pod's own english_floor_turns note of 2026-09-03, which said those rows must stay
 * empty; the note is kept as the record of why they were blank and a dated sibling key
 * says what changed. "opus drafts, Aran proofreads" (Tom, 2026-08-06).
 *
 * The two lines in which a witness apologises for answering in English are deliberately
 * NOT drafted: a Welsh sentence apologising for speaking English refutes itself.
 *
 * WHY DIRECT SQL: same reason as write-pod0-welsh-drafts.cjs — a PostgREST upsert takes
 * the INSERT path and a multi-row insert's column list is the union of the batch's keys.
 * Neither can bite a per-row UPDATE of two named columns keyed on the primary key.
 *
 * SAFETY
 *   - DRY RUN by default; --apply to write; the whole run is ONE transaction.
 *   - Per-row before-state assertion: the row exists, its known_text is byte-for-byte the
 *     English the draft was written against, and its target_text is still EMPTY. Any
 *     drift aborts the run before a single write — a non-empty target is a hard abort,
 *     never a skip.
 *   - Touches target_text and target_text_draft only, plus one new pod metadata key.
 *     No audio pointer is read, set or cleared; known_text is never touched; no
 *     rerecord_wanted is added anywhere.
 *   - target_text_approved_at is NOT set. The drafting agent does not approve its own
 *     words (Tom's A-109 ruling, 2026-08-16).
 *
 *   node tools/pods/write-senedd-welsh-drafts.cjs            # dry run
 *   node tools/pods/write-senedd-welsh-drafts.cjs --apply
 */
'use strict'
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: process.env.SSI_ENV_PSQL || path.join(__dirname, '..', '..', '.env.psql') })
const { Client } = require('pg')
const { evidencePath } = require('../lib/evidence-path.cjs')

const POD_ID = 'cym_n_for_eng:senedd-s4c-steve'
const APPLY = process.argv.includes('--apply')
const DRAFTS = require('./senedd-welsh-drafts-2026-09-10.json')
const SNAPSHOT = process.env.SENEDD_SNAPSHOT

// The English of the two turns left deliberately blank, so the run asserts it is
// leaving behind the rows it means to leave behind and not two others.
const LEFT_BLANK = {
  79: "And apologies, I'll answer in English, if I may, just to make sure that I—",
  82: "But I think it's better if I just answer quickly in English."
}

const NOTE_KEY = 'english_floor_turns_drafted_2026_09_10'
const NOTE = "Tom's ruling, 2026-09-10, supersedes the english_floor_turns note above for these rows: " +
  'Welsh was to be DRAFTED for the turns spoken in English on the floor, and landed, so that Aran can ' +
  'record them — "opus drafts, Aran proofreads" (Tom, 2026-08-06). 166 of the 168 now carry drafted ' +
  'northern Welsh with target_text_draft = true, which keeps them out of TTS under the A-109 approval ' +
  'gate while leaving them fully recordable in the booth. The two turns in which a witness apologises ' +
  'for answering in English (global_order 79 and 82) are still the empty string, deliberately: a Welsh ' +
  'sentence apologising for speaking English refutes itself. The note above stays as the record of why ' +
  'all 168 were blank until today.'

async function main () {
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  try {
    const rows = (await db.query(
      'select id, global_order, speaker, known_text, target_text, target_text_draft, target_audio_id ' +
      'from listening_pod_sentences where pod_id=$1 order by global_order', [POD_ID])).rows
    if (!rows.length) throw new Error(`no sentences for ${POD_ID}`)

    const byOrder = new Map(rows.map(r => [String(r.global_order), r]))
    const blanks = rows.filter(r => !String(r.target_text || '').trim())

    // The drafted set plus the deliberate carve-out must BE the blank set, exactly.
    const blankOrders = new Set(blanks.map(r => String(r.global_order)))
    const draftOrders = Object.keys(DRAFTS)
    const covered = new Set([...draftOrders, ...Object.keys(LEFT_BLANK)])
    const uncovered = [...blankOrders].filter(o => !covered.has(o))
    const stray = [...covered].filter(o => !blankOrders.has(o))
    if (uncovered.length) throw new Error(`${uncovered.length} blank rows are neither drafted nor carved out: ${uncovered.join(', ')}`)
    if (stray.length) throw new Error(`${stray.length} drafted/carved rows are not blank: ${stray.join(', ')}`)

    // The carve-out rows must be the two lines we think they are.
    for (const [o, english] of Object.entries(LEFT_BLANK)) {
      const r = byOrder.get(o)
      if (!r) throw new Error(`carve-out row ${o} does not exist`)
      if (r.known_text !== english) throw new Error(`carve-out row ${o} is not the line it was: ${JSON.stringify(r.known_text)}`)
    }

    // Every draft was written against the English in the pre-write snapshot; if a
    // snapshot is given, the live English must still match it byte for byte.
    let snapEnglish = null
    if (SNAPSHOT) {
      const snap = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'))
      snapEnglish = new Map(snap.sentences.map(s => [String(s.global_order), s.known_text]))
    }

    const ops = []
    for (const [o, cy] of Object.entries(DRAFTS)) {
      const r = byOrder.get(o)
      if (!r) throw new Error(`row ${o} does not exist`)
      if (String(r.target_text || '').trim()) throw new Error(`row ${o} already has Welsh — hard abort: ${JSON.stringify(r.target_text)}`)
      if (r.target_audio_id) throw new Error(`row ${o} carries a target_audio_id while blank — stopping rather than guessing`)
      if (!String(cy || '').trim()) throw new Error(`row ${o}: empty draft — refusing to write a blank as a draft`)
      if (snapEnglish && snapEnglish.get(o) !== r.known_text) {
        throw new Error(`row ${o}: known_text has changed since the snapshot the draft was written against`)
      }
      ops.push({ id: r.id, global_order: r.global_order, speaker: r.speaker, english: r.known_text, welsh: cy })
    }

    const recordedBefore = rows.filter(r => r.target_audio_id).length
    const filledBefore = rows.length - blanks.length
    console.log(`${POD_ID}: ${rows.length} rows, ${filledBefore} with Welsh, ${blanks.length} blank, ${recordedBefore} recorded`)
    console.log(`plan: write ${ops.length} drafts, leave ${Object.keys(LEFT_BLANK).length} blank on purpose`)
    for (const o of ops.slice(0, 5)) console.log(`  [${o.global_order}] ${o.speaker}\n    EN: ${o.english.slice(0, 90)}\n    CY: ${o.welsh.slice(0, 90)}`)
    console.log(`  … ${ops.length - 5} more`)

    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
    const logPath = evidencePath(`docs/pods/senedd-welsh-drafts-${APPLY ? 'applied' : 'dryrun'}-${stamp}-log.json`)
    fs.writeFileSync(logPath, JSON.stringify({
      at: new Date().toISOString(), pod_id: POD_ID, applied: APPLY,
      recorded_before: recordedBefore, filled_before: filledBefore, blank_before: blanks.length,
      left_blank: LEFT_BLANK, metadata_key: NOTE_KEY, ops
    }, null, 1))
    console.log(`log: ${logPath}`)

    if (!APPLY) { console.log('\nDRY RUN — pass --apply to write.'); return }

    await db.query('begin')
    try {
      for (const o of ops) {
        const res = await db.query(
          "update listening_pod_sentences set target_text=$2, target_text_draft=true " +
          "where id=$1 and pod_id=$3 and coalesce(target_text,'')=''", [o.id, o.welsh, POD_ID])
        if (res.rowCount !== 1) throw new Error(`row ${o.global_order}: update matched ${res.rowCount} rows — rolling back`)
      }
      // A new top-level key rather than an edit of english_floor_turns: the note above
      // is the record of why the rows were blank and is not ours to rewrite.
      const m = await db.query(
        'update listening_pods set metadata = jsonb_set(coalesce(metadata,' + "'{}'::jsonb" + '), $2, $3::jsonb, true) where id=$1',
        [POD_ID, `{${NOTE_KEY}}`, JSON.stringify(NOTE)])
      if (m.rowCount !== 1) throw new Error(`pod metadata update matched ${m.rowCount} rows — rolling back`)
      await db.query('commit')
      console.log(`WROTE ${ops.length} drafts and one pod metadata note.`)
    } catch (e) { await db.query('rollback'); throw e }
  } finally { await db.end() }
}

if (require.main === module) main().catch(e => { console.error(`FAILED: ${e.message}`); process.exit(1) })
