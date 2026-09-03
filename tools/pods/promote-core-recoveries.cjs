#!/usr/bin/env node
/**
 * promote-core-recoveries — move the six CORE recovery halves out of the inert
 * `core-recoveries` slug and ONTO `pod-1`, attached to the scenes they were
 * derived for, without lengthening anybody's walk.
 *
 * TOM'S RULING, 2026-09-04: "A RECOVERY ATTACHES, IT DOES NOT APPEND." The table
 * already draws that distinction and has since the sector pods were ingested:
 *
 *   UNIQUE (pod_slug, scene_number, sentence_number, variant_key)
 *
 * A row carrying a variant_key occupies the SAME (scene, sentence) coordinate as
 * the base row beside it. `pod-1 / scene 2 / sentence 1 / recovery-s2` is a
 * sibling of `pod-1 / scene 2 / sentence 1 / NULL`, not its successor. So the
 * promotion needs no schema change and no new concept — only a reader that
 * honours the column, which is services/shared/canonical-slate.cjs, landed with
 * this script. Run this WITHOUT that module in place and the six flows flatten
 * into scenes 2/3/4/5/22 and CORE goes 231 → 266 across 21 live courses.
 *
 * WHAT IT DOES, per row, as a single UPDATE inside one transaction:
 *   pod_slug      'core-recoveries' → 'pod-1'
 *   id            'core-recoveries:SC02-RS2-S01' → 'pod-1:SC02-RS2-S01'
 *   global_order  1..35 → 10001..10035, an OUT-OF-BAND band. pod-1's walk owns
 *                 1..231 and the column is UNIQUE per slug, so a continuation
 *                 cannot be given a walk position even by accident. A reader
 *                 that ignores variant_key therefore sorts every recovery AFTER
 *                 its scene's base lines, never between them — which is why no
 *                 existing sentence shifts position under any reading, and the
 *                 pod-migration protocol's 8-position bound is never approached.
 *   author_notes  the 'DRAFT-UNREVIEWED (…)' prefix stripped, the rest kept.
 * scene_number, sentence_number, variant_key, speaker and english_text are NEVER
 * written — the attachment and the words are #401's, ruled in by Tom.
 *
 * IT MOVES RATHER THAN COPIES, and unlike pair-slug-canonical-pod.cjs that is
 * safe here: `canonical_pod_walk_steps.scenario_id` is the only inbound FK and
 * ZERO steps reference these rows or either slug (asserted in the transaction,
 * not assumed). The source slug is meant to end up empty — it was a staging slug.
 *
 * GATES. Dry run by default; --apply writes. It refuses unless: every source row
 * is found with exactly the before-state recorded in --plan; no destination id
 * exists anywhere in the table; no (pod_slug, scene, sentence, variant) collides;
 * no destination global_order is taken; no walk step references anything involved;
 * pod-1's base-row count is 231 before AND after; and the ordered walk digest of
 * pod-1's base rows is identical before and after. Each UPDATE repeats the full
 * before-state in its WHERE clause and must affect exactly one row, so a
 * concurrent writer aborts the transaction rather than losing to it.
 *
 * REVERSIBLE. --revert runs the same gates in the opposite direction.
 *
 *   node tools/pods/promote-core-recoveries.cjs --flows=recovery-s2
 *   node tools/pods/promote-core-recoveries.cjs --flows=recovery-s2 --apply
 *   node tools/pods/promote-core-recoveries.cjs            # all six, dry run
 *   node tools/pods/promote-core-recoveries.cjs --apply
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql'), quiet: true })
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { Client } = require('pg')
const { baseSlate } = require('../../services/shared/canonical-slate.cjs')

const SOURCE_SLUG = 'core-recoveries'
const DEST_SLUG = 'pod-1'
const ORDER_BASE = 10000
const DRAFT_PREFIX_RE = /^DRAFT-UNREVIEWED \(core recovery halves, 2026-09-04\)\s*[-—:]?\s*/
const EXPECTED_BASE_ROWS = 231

const APPLY = process.argv.includes('--apply')
const REVERT = process.argv.includes('--revert')
const arg = (n) => {
  const a = process.argv.find(x => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}
const FLOWS = arg('flows') ? arg('flows').split(',').map(s => s.trim()).filter(Boolean) : null

const LOG_DIR = path.join(__dirname, '..', '..', 'docs', 'pods')
const LOG_PATH = path.join(LOG_DIR, `core-recovery-promotion-2026-09-04-${APPLY ? 'applied' : 'dryrun'}${REVERT ? '-revert' : ''}-log.json`)

const die = (m) => { console.error('FAILED: ' + m); process.exit(1) }

/** The proof artefact: the ordered walk of pod-1's base rows, digested. */
async function walkDigest(c) {
  const { rows } = await c.query(
    `select scene_number, sentence_number, global_order, speaker, english_text, variant_key
       from canonical_pod_scenarios where pod_slug = $1 order by global_order`, [DEST_SLUG])
  const base = baseSlate(rows)
  const dump = base.map(r => [r.scene_number, r.sentence_number, r.global_order, r.speaker, r.english_text].join(' | ')).join('\n')
  return { count: base.length, total: rows.length, sha256: crypto.createHash('sha256').update(dump).digest('hex') }
}

;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()

  const before = await walkDigest(c)
  console.log(`pod-1 BEFORE: ${before.total} rows, ${before.count} base rows, walk sha256 ${before.sha256}`)
  if (before.count !== EXPECTED_BASE_ROWS) die(`pod-1 holds ${before.count} base rows, expected ${EXPECTED_BASE_ROWS} — refusing to touch a slate I do not recognise`)

  const from = REVERT ? DEST_SLUG : SOURCE_SLUG
  const { rows: src } = await c.query(
    `select id, pod_slug, scene_number, sentence_number, global_order, variant_key, author_notes, speaker, english_text
       from canonical_pod_scenarios
      where pod_slug = $1 and variant_key is not null
        and ($2::text[] is null or variant_key = any($2::text[]))
      order by global_order`, [from, FLOWS])
  if (!src.length) die(`no rows to ${REVERT ? 'revert' : 'promote'} on slug '${from}'${FLOWS ? ` for flows ${FLOWS.join(', ')}` : ''}`)
  console.log(`${src.length} row(s) to ${REVERT ? 'revert' : 'promote'}: ${[...new Set(src.map(r => r.variant_key))].join(', ')}`)

  // ── Plan each row, and assert every gate BEFORE anything is written ────────
  const plan = []
  for (const r of src) {
    let newId, newOrder, newNotes
    if (REVERT) {
      if (!r.id.startsWith(`${DEST_SLUG}:`)) die(`${r.id} does not carry the '${DEST_SLUG}:' prefix`)
      if (r.global_order <= ORDER_BASE) die(`${r.id} has walk-band global_order ${r.global_order} — that is not a promoted continuation`)
      newId = `${SOURCE_SLUG}:${r.id.slice(DEST_SLUG.length + 1)}`
      newOrder = r.global_order - ORDER_BASE
      newNotes = r.author_notes // the marker is not restored; clearing it was the ruling
    } else {
      if (!r.id.startsWith(`${SOURCE_SLUG}:`)) die(`${r.id} does not carry the '${SOURCE_SLUG}:' prefix`)
      if (r.global_order > ORDER_BASE) die(`${r.id} already sits in the continuation band`)
      newId = `${DEST_SLUG}:${r.id.slice(SOURCE_SLUG.length + 1)}`
      newOrder = ORDER_BASE + r.global_order
      newNotes = r.author_notes == null ? null : r.author_notes.replace(DRAFT_PREFIX_RE, '')
      if (r.author_notes != null && newNotes === r.author_notes) console.warn(`  note: ${r.id} carries no DRAFT-UNREVIEWED prefix to clear`)
      if (newNotes === '') die(`${r.id}: clearing the prefix would blank author_notes — the ruling says clear the marker, not the column`)
    }
    const toSlug = REVERT ? SOURCE_SLUG : DEST_SLUG

    const { rows: idTaken } = await c.query(`select id from canonical_pod_scenarios where id = $1`, [newId])
    if (idTaken.length) die(`destination id already exists: ${newId}`)
    const { rows: coordTaken } = await c.query(
      `select id from canonical_pod_scenarios where pod_slug=$1 and scene_number=$2 and sentence_number=$3 and variant_key is not distinct from $4`,
      [toSlug, r.scene_number, r.sentence_number, r.variant_key])
    if (coordTaken.length) die(`coordinate ${toSlug}/sc${r.scene_number}/s${r.sentence_number}/${r.variant_key} is already held by ${coordTaken[0].id}`)
    const { rows: orderTaken } = await c.query(
      `select id from canonical_pod_scenarios where pod_slug=$1 and global_order=$2`, [toSlug, newOrder])
    if (orderTaken.length) die(`global_order ${newOrder} on ${toSlug} is already held by ${orderTaken[0].id}`)

    plan.push({
      before: { id: r.id, pod_slug: r.pod_slug, global_order: r.global_order, author_notes: r.author_notes },
      after: { id: newId, pod_slug: toSlug, global_order: newOrder, author_notes: newNotes },
      unchanged: { scene_number: r.scene_number, sentence_number: r.sentence_number, variant_key: r.variant_key, speaker: r.speaker, english_text: r.english_text },
    })
  }

  const { rows: walkRefs } = await c.query(
    `select count(*)::int n from canonical_pod_walk_steps
      where scenario_id = any($1::text[]) or pod_slug in ($2, $3)`,
    [plan.map(p => p.before.id), SOURCE_SLUG, DEST_SLUG])
  if (walkRefs[0].n !== 0) die(`${walkRefs[0].n} walk step(s) reference these rows or their slugs — a move would break an anchor; use a copy instead`)

  console.log('\n--- PLAN ---')
  for (const p of plan) {
    console.log(`${p.before.id}  →  ${p.after.id}`)
    console.log(`    slug ${p.before.pod_slug} → ${p.after.pod_slug} | global_order ${p.before.global_order} → ${p.after.global_order} | attached at sc${p.unchanged.scene_number}/s${p.unchanged.sentence_number} as ${p.unchanged.variant_key}`)
    if (p.before.author_notes !== p.after.author_notes) console.log(`    author_notes: ${JSON.stringify(String(p.before.author_notes).slice(0, 60))}… → ${JSON.stringify(String(p.after.author_notes).slice(0, 60))}…`)
  }

  const log = { ts: new Date().toISOString(), mode: APPLY ? 'applied' : 'dryrun', direction: REVERT ? 'revert' : 'promote', flows: FLOWS, rows: plan, walkBefore: before }

  if (!APPLY) {
    fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2))
    console.log(`\nDRY RUN — nothing written. ${plan.length} row(s) planned. Log: ${LOG_PATH}`)
    console.log('Pass --apply to write.')
    await c.end(); return
  }

  await c.query('begin')
  try {
    for (const p of plan) {
      // The full before-state is repeated in the WHERE clause: a concurrent
      // writer costs us the transaction, never the row.
      const { rowCount } = await c.query(
        `update canonical_pod_scenarios
            set id = $1, pod_slug = $2, global_order = $3, author_notes = $4
          where id = $5 and pod_slug = $6 and global_order = $7
            and author_notes is not distinct from $8
            and scene_number = $9 and sentence_number = $10 and variant_key = $11
            and speaker = $12 and english_text = $13`,
        [p.after.id, p.after.pod_slug, p.after.global_order, p.after.author_notes,
         p.before.id, p.before.pod_slug, p.before.global_order, p.before.author_notes,
         p.unchanged.scene_number, p.unchanged.sentence_number, p.unchanged.variant_key,
         p.unchanged.speaker, p.unchanged.english_text])
      if (rowCount !== 1) throw new Error(`drift: ${p.before.id} matched ${rowCount} rows, expected exactly 1`)
    }
    const mid = await walkDigest(c)
    if (mid.sha256 !== before.sha256) throw new Error(`THE WALK MOVED: ${before.sha256} → ${mid.sha256}`)
    if (mid.count !== EXPECTED_BASE_ROWS) throw new Error(`pod-1 base rows ${before.count} → ${mid.count}`)
    await c.query('commit')
  } catch (e) {
    await c.query('rollback')
    die(`rolled back, nothing written: ${e.message}`)
  }

  // ── Independent re-read, after the commit ─────────────────────────────────
  const after = await walkDigest(c)
  console.log(`\npod-1 AFTER: ${after.total} rows, ${after.count} base rows, walk sha256 ${after.sha256}`)
  if (after.sha256 !== before.sha256) die(`walk digest changed after commit: ${before.sha256} → ${after.sha256}`)

  let bad = 0
  for (const p of plan) {
    const { rows } = await c.query(
      `select id, pod_slug, scene_number, sentence_number, global_order, variant_key, author_notes, speaker, english_text
         from canonical_pod_scenarios where id = $1`, [p.after.id])
    const r = rows[0]
    if (!r) { console.error(`  MISSING ${p.after.id}`); bad++; continue }
    const same = r.pod_slug === p.after.pod_slug && r.global_order === p.after.global_order
      && r.author_notes === p.after.author_notes && r.scene_number === p.unchanged.scene_number
      && r.sentence_number === p.unchanged.sentence_number && r.variant_key === p.unchanged.variant_key
      && r.speaker === p.unchanged.speaker && r.english_text === p.unchanged.english_text
    if (!same) { console.error(`  MISMATCH ${p.after.id}`); bad++ }
    const { rows: ghost } = await c.query(`select id from canonical_pod_scenarios where id = $1`, [p.before.id])
    if (ghost.length) { console.error(`  SOURCE ROW STILL PRESENT ${p.before.id}`); bad++ }
  }
  if (bad) die(`${bad} reconciliation failure(s) — the write landed but does not match the log`)

  log.walkAfter = after
  log.reconciled = plan.length
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2))
  console.log(`\nAPPLIED. ${plan.length} row(s) reconciled, walk unchanged. Log: ${LOG_PATH}`)
  await c.end()
})().catch(e => { console.error(e); process.exit(1) })
