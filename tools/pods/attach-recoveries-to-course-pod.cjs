#!/usr/bin/env node
/**
 * attach-recoveries-to-course-pod — make the six CORE recovery halves REACHABLE.
 *
 * Job #408 made them true in storage: the 35 rows sit on `pod-1` in
 * `canonical_pod_scenarios`, each carrying a `variant_key`, each occupying the
 * SAME (scene, sentence) coordinate as a base row rather than the next one. What
 * it could not do was let a learner meet one, because the per-course layer the
 * player reads — `listening_pod_sentences` — had no variant column and the
 * attach point lived in a sentence of prose. Both are fixed by
 * database/changes/20260904_pod_variant_carry_and_attach_point.sql. This tool
 * fills them.
 *
 * TWO PHASES, both gated, both dry-run by default.
 *
 * --backfill-canon
 *   Derives canonical_pod_scenarios.attach_sentence_number for the variant rows
 *   from the DATA, not from the prose. Every flow opens by REPEATING one or two
 *   of CORE's own lines verbatim before it diverges (#408 checked this by hand
 *   and it is why the recovery lands "in the moment"). So the branch point is
 *   derivable and checkable: take the flow's rows in order, match each against
 *   the base walk of the SAME scene by exact english_text, stop at the first
 *   line that does not match, and the attach point is the sentence_number of the
 *   LAST base row that did. The tool refuses a flow with no anchor line, or with
 *   anchors that are not consecutive base sentences.
 *
 *   scene_subtitle is NEVER written. The prose ("attaches to POD 1 scene 2 at
 *   g8-g9") stays exactly as it is, so nothing is lost if this parse is wrong —
 *   and the tool PRINTS the prose beside its own derivation so the two can be
 *   read against each other.
 *
 * --course=<course_code>
 *   Promotes the continuations into that course's pod-1 as sibling rows:
 *     id            `<course>:pod-1:SC02-RS2-S01`  (the canonical id, prefixed)
 *     variant_key   carried from canon
 *     scene/sentence/global_order/speaker  carried from canon, unchanged
 *     known_text    the canonical English
 *     target_text   '' — the "no target text yet" value align-pod0-to-canonical
 *                   uses, which drops a line out of every recording and render
 *                   queue exactly as NULL would. NO TEXT IS INVENTED HERE and no
 *                   translation is run: the recovery halves have never been
 *                   translated, and doing it is not this tool's job.
 *     target_text_draft  false — there is no target text to describe.
 *   No audio ids, so nothing can render and nothing can be borrowed.
 *
 * GATES on the course phase. It refuses unless: the pod exists; its BASE row
 * count is exactly 231 before and after; the ordered base walk digest is
 * IDENTICAL before and after; every destination id is free; and every insert
 * lands exactly one row. It runs in one transaction and asserts the digest
 * again before COMMIT, so a concurrent writer aborts it rather than beating it.
 *
 * --revert removes this tool's own rows for a course (variant rows only, by id).
 *
 *   node tools/pods/attach-recoveries-to-course-pod.cjs --backfill-canon
 *   node tools/pods/attach-recoveries-to-course-pod.cjs --backfill-canon --apply
 *   node tools/pods/attach-recoveries-to-course-pod.cjs --course=deu_at_for_eng
 *   node tools/pods/attach-recoveries-to-course-pod.cjs --course=deu_at_for_eng --apply
 *   node tools/pods/attach-recoveries-to-course-pod.cjs --course=deu_at_for_eng --revert --apply
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql'), quiet: true })
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { Client } = require('pg')
const { baseSlate, continuations } = require('../../services/shared/canonical-slate.cjs')

const SLUG = 'pod-1'
const EXPECTED_BASE_ROWS = 231

const APPLY = process.argv.includes('--apply')
const REVERT = process.argv.includes('--revert')
const BACKFILL = process.argv.includes('--backfill-canon')
const arg = (n) => {
  const a = process.argv.find(x => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}
const COURSE = arg('course')

const LOG_DIR = path.join(__dirname, '..', '..', 'docs', 'pods', 'reachable-2026-09-04')

function walkDigest(rows) {
  const body = rows
    .map(r => [r.scene_number, r.sentence_number, r.global_order, r.speaker,
               r.known_text ?? r.english_text, r.target_text ?? ''].join(''))
    .join('')
  return crypto.createHash('sha256').update(body).digest('hex')
}

function writeLog(name, payload) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
  const p = path.join(LOG_DIR, `${name}-${APPLY ? 'applied' : 'dryrun'}${REVERT ? '-revert' : ''}-log.json`)
  fs.writeFileSync(p, JSON.stringify(payload, null, 2) + '\n')
  return p
}

/** Derive each flow's attach point from the canon rows themselves. */
function deriveAttachPoints(rows) {
  const base = baseSlate(rows)
  const flows = new Map()
  for (const r of continuations(rows)) {
    if (!flows.has(r.variant_key)) flows.set(r.variant_key, [])
    flows.get(r.variant_key).push(r)
  }
  const out = []
  for (const [key, flowRows] of flows) {
    flowRows.sort((a, b) => a.sentence_number - b.sentence_number)
    const scene = flowRows[0].scene_number
    if (flowRows.some(r => r.scene_number !== scene)) {
      throw new Error(`flow ${key} spans more than one scene — cannot derive an attach point`)
    }
    const sceneBase = base.filter(b => b.scene_number === scene)
      .sort((a, b) => a.sentence_number - b.sentence_number)
    const anchors = []
    for (const r of flowRows) {
      const hit = sceneBase.find(b => b.english_text === r.english_text)
      if (!hit) break
      anchors.push(hit)
    }
    if (!anchors.length) throw new Error(`flow ${key} opens on no CORE line — attach point not derivable`)
    for (let i = 1; i < anchors.length; i++) {
      if (anchors[i].sentence_number !== anchors[i - 1].sentence_number + 1) {
        throw new Error(`flow ${key} anchor lines are not consecutive (${anchors.map(a => a.sentence_number).join(',')})`)
      }
    }
    const last = anchors[anchors.length - 1]
    out.push({
      variant_key: key,
      scene_number: scene,
      attach_sentence_number: last.sentence_number,
      anchor_sentences: anchors.map(a => a.sentence_number),
      anchor_global_orders: anchors.map(a => a.global_order),
      flow_rows: flowRows.length,
      prose: flowRows[0].scene_subtitle || null,
    })
  }
  return out.sort((a, b) => a.scene_number - b.scene_number || a.variant_key.localeCompare(b.variant_key))
}

async function backfillCanon(db) {
  const { rows } = await db.query(
    `select id, scene_number, sentence_number, global_order, speaker, english_text, variant_key,
            scene_subtitle, attach_sentence_number
       from canonical_pod_scenarios where pod_slug = $1 order by global_order`, [SLUG])
  const beforeBase = baseSlate(rows)
  if (beforeBase.length !== EXPECTED_BASE_ROWS) {
    throw new Error(`canon base rows ${beforeBase.length}, expected ${EXPECTED_BASE_ROWS}`)
  }
  const beforeDigest = walkDigest(beforeBase)
  const points = deriveAttachPoints(rows)

  console.log(`\ncanon base rows: ${beforeBase.length}  digest ${beforeDigest.slice(0, 16)}`)
  console.log(`flows: ${points.length}\n`)
  for (const p of points) {
    console.log(`  ${p.variant_key.padEnd(12)} scene ${String(p.scene_number).padStart(2)}  attach at sentence ${p.attach_sentence_number}`
      + `  (anchors g${p.anchor_global_orders.join(', g')}; ${p.flow_rows} rows)`)
    console.log(`  ${' '.repeat(12)} prose says: ${p.prose}`)
  }

  const ops = []
  await db.query('BEGIN')
  for (const p of points) {
    const res = await db.query(
      `update canonical_pod_scenarios set attach_sentence_number = $1
        where pod_slug = $2 and variant_key = $3 and attach_sentence_number is null`,
      [p.attach_sentence_number, SLUG, p.variant_key])
    ops.push({ ...p, rows_written: res.rowCount })
  }
  const { rows: after } = await db.query(
    `select id, scene_number, sentence_number, global_order, speaker, english_text, variant_key
       from canonical_pod_scenarios where pod_slug = $1 order by global_order`, [SLUG])
  const afterDigest = walkDigest(baseSlate(after))
  if (afterDigest !== beforeDigest) throw new Error('canon base walk digest CHANGED — aborting')
  if (APPLY) { await db.query('COMMIT') } else { await db.query('ROLLBACK') }
  const logPath = writeLog('canon-attach-backfill', {
    mode: APPLY ? 'applied' : 'dryrun', beforeDigest, afterDigest, ops,
  })
  console.log(`\nbase walk digest unchanged: ${afterDigest.slice(0, 16)}`)
  console.log(`${APPLY ? 'APPLIED' : 'DRY RUN (rolled back)'} — ${ops.reduce((n, o) => n + o.rows_written, 0)} canon rows given an attach point`)
  console.log(`log: ${logPath}`)
}

async function promoteCourse(db, course) {
  const podId = `${course}:${SLUG}`
  const { rows: pod } = await db.query(`select id, visibility from listening_pods where id = $1`, [podId])
  if (!pod.length) throw new Error(`pod ${podId} not found`)

  const { rows: canon } = await db.query(
    `select id, scene_number, sentence_number, global_order, speaker, english_text,
            variant_key, attach_sentence_number
       from canonical_pod_scenarios where pod_slug = $1 order by global_order`, [SLUG])
  const flows = continuations(canon)
  if (!flows.length) throw new Error('no continuations on canon — nothing to promote')
  if (flows.some(r => r.attach_sentence_number == null)) {
    throw new Error('canon continuations missing attach_sentence_number — run --backfill-canon first')
  }

  const { rows: before } = await db.query(
    `select id, scene_number, sentence_number, global_order, speaker, known_text, target_text, variant_key
       from listening_pod_sentences where pod_id = $1 order by global_order`, [podId])
  const beforeBase = baseSlate(before)
  const beforeDigest = walkDigest(beforeBase)
  if (beforeBase.length !== EXPECTED_BASE_ROWS) {
    throw new Error(`${podId} base rows ${beforeBase.length}, expected ${EXPECTED_BASE_ROWS}`)
  }

  console.log(`\n${podId} (${pod[0].visibility})`)
  console.log(`  base rows before: ${beforeBase.length}   continuations before: ${before.length - beforeBase.length}`)
  console.log(`  base walk digest before: ${beforeDigest}`)

  const ops = []
  await db.query('BEGIN')
  if (REVERT) {
    for (const c of flows) {
      const id = `${course}:${c.id}`
      const res = await db.query(
        `delete from listening_pod_sentences where id = $1 and pod_id = $2 and variant_key = $3`,
        [id, podId, c.variant_key])
      ops.push({ op: 'delete', id, rows: res.rowCount })
    }
  } else {
    for (const c of flows) {
      const id = `${course}:${c.id}`
      const res = await db.query(
        `insert into listening_pod_sentences
           (id, pod_id, scene_number, sentence_number, global_order, speaker,
            target_text, known_text, target_text_draft, variant_key, attach_sentence_number)
         values ($1,$2,$3,$4,$5,$6,'',$7,false,$8,$9)
         on conflict (id) do nothing`,
        [id, podId, c.scene_number, c.sentence_number, c.global_order, c.speaker,
         c.english_text, c.variant_key, c.attach_sentence_number])
      if (res.rowCount !== 1) throw new Error(`insert ${id} affected ${res.rowCount} rows — destination not free, aborting`)
      ops.push({
        op: 'insert', id, variant_key: c.variant_key, scene_number: c.scene_number,
        sentence_number: c.sentence_number, global_order: c.global_order,
        attach_sentence_number: c.attach_sentence_number,
      })
    }
  }

  const { rows: after } = await db.query(
    `select id, scene_number, sentence_number, global_order, speaker, known_text, target_text, variant_key
       from listening_pod_sentences where pod_id = $1 order by global_order`, [podId])
  const afterBase = baseSlate(after)
  const afterDigest = walkDigest(afterBase)
  if (afterBase.length !== EXPECTED_BASE_ROWS) throw new Error(`base rows became ${afterBase.length} — ABORTING`)
  if (afterDigest !== beforeDigest) throw new Error('BASE WALK DIGEST CHANGED — ABORTING')
  if (APPLY) { await db.query('COMMIT') } else { await db.query('ROLLBACK') }

  console.log(`  base rows after:  ${afterBase.length}   continuations after: ${after.length - afterBase.length}`)
  console.log(`  base walk digest after:  ${afterDigest}`)
  console.log(`  IDENTICAL: ${afterDigest === beforeDigest ? 'yes' : 'NO'}`)
  const logPath = writeLog(`course-promotion-${course}`, {
    mode: APPLY ? 'applied' : 'dryrun', revert: REVERT, pod_id: podId, visibility: pod[0].visibility,
    base_rows_before: beforeBase.length, base_rows_after: afterBase.length,
    total_rows_before: before.length, total_rows_after: after.length,
    base_walk_digest_before: beforeDigest, base_walk_digest_after: afterDigest, ops,
  })
  console.log(`${APPLY ? 'APPLIED' : 'DRY RUN (rolled back)'} — ${ops.length} rows`)
  console.log(`log: ${logPath}`)
}

async function main() {
  if (!BACKFILL && !COURSE) {
    console.error('usage: --backfill-canon | --course=<code>  [--apply] [--revert]')
    process.exit(2)
  }
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()
  try {
    if (BACKFILL) await backfillCanon(db)
    if (COURSE) await promoteCourse(db, COURSE)
  } catch (e) {
    try { await db.query('ROLLBACK') } catch {}
    console.error(`\nFAILED: ${e.message}`)
    process.exitCode = 1
  } finally {
    await db.end()
  }
}

main()
