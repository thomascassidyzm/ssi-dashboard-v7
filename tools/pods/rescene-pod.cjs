#!/usr/bin/env node
/**
 * rescene-pod.cjs — regroup a listening pod's sentences into scenes of about
 * ten sentences each.
 *
 * THE RULE (Aran, Tom "yes", 2026-09-14 13:03 local; first applied to the
 * Senedd/S4C pod, job #649). A pod ingested one-scene-per-speaker-turn ends up
 * with dozens of one- and two-sentence scenes next to nineteen-sentence ones.
 * Scenes should be 8–12 sentences, aiming at 10:
 *
 *   1. Every sentence is kept, in its original global_order. Only scene_number
 *      moves; ids, sentence_number and clip pointers do not.
 *   2. A scene boundary falls at a change of speaker turn (a "unit": one
 *      contribution, read from beat_label "contribution N · part i/n", else a
 *      run of one speaker).
 *   3. A question and its answer stay together: no boundary directly after a
 *      sentence that ends in a question mark.
 *   4. A turn longer than the maximum is split at a topic turn — named by hand
 *      through `splitAfter` (global_orders after which a break is free) — or,
 *      (`noBreakAfter` names a question the punctuation missed: "…I'd just
 *      like to know when will this happen." binds to its answer too) — or,
 *      failing that, at whatever sentence boundary best balances the scenes,
 *      at a cost, so the solver only does it when it must.
 *   5. Among all groupings that obey 1–4 the one whose scene sizes sit closest
 *      to the target wins (least squared deviation), with steep penalties
 *      outside [min, max]. That is a dynamic programme over sentence
 *      boundaries, so the result is deterministic and reproducible.
 *
 *   node tools/pods/rescene-pod.cjs <pod_id> [<pod_id> …] [--split-after 27,38]
 *                                   [--no-break-after 50] [--apply]
 *
 * Dry run prints the before/after scene table and writes nothing. --apply
 * updates scene_number row by row inside one transaction, asserting each row's
 * before-state and that no clip pointer moved, then records the edit in
 * content_edit_events under serviceIdentity('rescene-pod').
 */
'use strict'
const fs = require('fs')
const { Client } = require('pg')
const { evidencePath } = require('../lib/evidence-path.cjs')
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')

const DEFAULTS = Object.freeze({ target: 10, min: 8, max: 12 })
/** Cost of cutting inside one speaker's turn where no topic turn was named. */
const MID_TURN_BREAK_COST = 100
/** Cost per sentence outside [min, max]: one sentence over or under is
 *  cheaper than cutting a speaker mid-turn at an unnamed point, two is not. */
const OUT_OF_RANGE_COST = 60
const INFINITE = Number.POSITIVE_INFINITY

const CONTRIBUTION_RE = /^contribution (\S+) · part \d+\/\d+$/

/** Pure. The turn a row belongs to: its contribution id, else its speaker. */
function unitKeyOf(row) {
  const m = CONTRIBUTION_RE.exec(row.beat_label || '')
  if (m) return `c:${m[1]}`
  return `s:${(row.speaker || '').trim().toLowerCase()}`
}

/** Pure. Does the sentence end in a question (either language)? */
function endsWithQuestion(row) {
  const q = (s) => /[?？]\s*[»"'”’)]*\s*$/.test(String(s || ''))
  return q(row.known_text) || q(row.target_text)
}

/**
 * Pure. Assign scene numbers to rows (already in global_order).
 * @returns {{ assignments: Array<{id, global_order, old_scene, new_scene}>, scenes: number[][] }}
 */
function planScenes(rows, opts = {}) {
  const { target, min, max } = { ...DEFAULTS, ...opts }
  const splitAfter = new Set((opts.splitAfter || []).map(Number))
  const noBreakAfter = new Set((opts.noBreakAfter || []).map(Number))
  const n = rows.length
  if (n === 0) return { assignments: [], scenes: [] }
  for (let i = 1; i < n; i++) {
    if (!(rows[i].global_order > rows[i - 1].global_order)) {
      throw new Error(`rows must be in ascending global_order (at ${rows[i].global_order})`)
    }
  }

  // breakCost[i] = cost of a boundary AFTER row i (between i and i+1).
  const breakCost = new Array(n - 1)
  for (let i = 0; i < n - 1; i++) {
    if (endsWithQuestion(rows[i]) || noBreakAfter.has(rows[i].global_order)) { breakCost[i] = INFINITE; continue } // rule 3
    if (splitAfter.has(rows[i].global_order)) { breakCost[i] = 0; continue } // rule 4, named
    breakCost[i] = unitKeyOf(rows[i]) === unitKeyOf(rows[i + 1]) ? MID_TURN_BREAK_COST : 0
  }

  const sceneCost = (len) => {
    let c = (len - target) ** 2
    if (len < min) c += (min - len) * OUT_OF_RANGE_COST
    if (len > max) c += (len - max) * OUT_OF_RANGE_COST
    return c
  }

  // best[j] = least cost to partition rows[0..j) into scenes; cut[j] = start of last scene.
  const best = new Array(n + 1).fill(INFINITE)
  const cut = new Array(n + 1).fill(-1)
  best[0] = 0
  const longest = Math.min(n, max * 3) // an oversize scene is only ever forced, never long
  for (let j = 1; j <= n; j++) {
    for (let len = 1; len <= Math.min(j, longest); len++) {
      const i = j - len
      if (best[i] === INFINITE) continue
      const bc = i === 0 ? 0 : breakCost[i - 1]
      if (bc === INFINITE) continue
      const c = best[i] + bc + sceneCost(len)
      if (c < best[j]) { best[j] = c; cut[j] = i }
    }
  }
  if (best[n] === INFINITE) throw new Error('no legal scene partition (a question at the very end of an oversize run?)')

  const scenes = []
  for (let j = n; j > 0; j = cut[j]) scenes.unshift(rows.slice(cut[j], j).map((r) => r.global_order))
  const assignments = []
  scenes.forEach((orders, k) => {
    for (const go of orders) {
      const r = rows.find((x) => x.global_order === go)
      assignments.push({ id: r.id, global_order: go, old_scene: r.scene_number, new_scene: k + 1 })
    }
  })
  return { assignments, scenes }
}

/** Pure. Scene → size table for a set of rows, in scene order. */
function sceneTable(rows) {
  const m = new Map()
  for (const r of rows) m.set(r.scene_number, (m.get(r.scene_number) || 0) + 1)
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([scene, size]) => ({ scene, size }))
}

function formatTable(table) {
  return table.map(({ scene, size }) => `${String(scene).padStart(3)}: ${size}`).join('\n')
}

async function fetchRows(db, podId) {
  const { rows } = await db.query(
    `SELECT id, scene_number, sentence_number, global_order, speaker, beat_label, known_text, target_text,
            target_audio_id, known_audio_id, sentence_audio_ids, sentence_known_audio_ids
       FROM listening_pod_sentences WHERE pod_id = $1 ORDER BY global_order`, [podId])
  return rows
}

const pointerFingerprint = (rows) => JSON.stringify(rows.map((r) => [
  r.id, r.global_order, r.sentence_number, r.target_audio_id, r.known_audio_id, r.sentence_audio_ids, r.sentence_known_audio_ids]))

async function rescenePod(db, podId, { apply, splitAfter, noBreakAfter, target, min, max, log }) {
  const rows = await fetchRows(db, podId)
  if (!rows.length) throw new Error(`${podId}: no sentences`)
  const before = sceneTable(rows)
  const { assignments, scenes } = planScenes(rows, { splitAfter, noBreakAfter, target, min, max })
  const after = scenes.map((orders, k) => ({ scene: k + 1, size: orders.length }))
  const changes = assignments.filter((a) => a.old_scene !== a.new_scene)
  const entry = { pod_id: podId, rows: rows.length, scenes_before: before.length, scenes_after: after.length,
    before, after, changed_rows: changes.length, assignments }
  log.pods.push(entry)
  console.log(`\n${podId}: ${rows.length} sentences, ${before.length} scenes -> ${after.length} scenes, ${changes.length} rows move`)
  console.log('BEFORE\n' + formatTable(before) + '\nAFTER\n' + formatTable(after))
  if (!apply) return entry

  const course = podId.split(':')[0]
  const fpBefore = pointerFingerprint(rows)
  await db.query('BEGIN')
  try {
    for (const a of changes) {
      const res = await db.query(
        `UPDATE listening_pod_sentences SET scene_number = $1
          WHERE id = $2 AND pod_id = $3 AND scene_number = $4 AND global_order = $5`,
        [a.new_scene, a.id, podId, a.old_scene, a.global_order])
      if (res.rowCount !== 1) throw new Error(`${a.id}: before-state drifted (scene ${a.old_scene} expected), rolled back`)
    }
    const afterRows = await fetchRows(db, podId)
    if (pointerFingerprint(afterRows) !== fpBefore) throw new Error('a clip pointer or order moved, rolled back')
    const got = JSON.stringify(sceneTable(afterRows))
    if (got !== JSON.stringify(after)) throw new Error(`after-state mismatch: ${got}, rolled back`)
    const identity = serviceIdentity('rescene-pod', { role: 'content-editor' })
    await db.query(
      `INSERT INTO content_edit_events
         (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [course, 'tools/pods/rescene-pod.cjs', 'pod-rescene',
        identity.kind, String(identity.id), String(identity.label), identity.verified, identity.role || null,
        { pod_id: podId, rows: changes.length }, { scenes_before: before.length, scenes_after: after.length, target, min, max, splitAfter, noBreakAfter }])
    await db.query('COMMIT')
    console.log(`  applied: ${changes.length} rows re-scened, pointers unchanged.`)
  } catch (e) {
    await db.query('ROLLBACK')
    throw e
  }
  return entry
}

function parseArgs(argv) {
  const out = { podIds: [], apply: false, splitAfter: [], noBreakAfter: [], ...DEFAULTS }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--apply') out.apply = true
    else if (a === '--split-after') out.splitAfter = argv[++i].split(',').map(Number).filter(Boolean)
    else if (a === '--no-break-after') out.noBreakAfter = argv[++i].split(',').map(Number).filter(Boolean)
    else if (a === '--target') out.target = Number(argv[++i])
    else if (a === '--min') out.min = Number(argv[++i])
    else if (a === '--max') out.max = Number(argv[++i])
    else out.podIds.push(a)
  }
  return out
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.podIds.length) { console.error('usage: rescene-pod.cjs <pod_id> … [--split-after a,b] [--apply]'); process.exit(2) }
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  const log = { mode: args.apply ? 'apply' : 'dry-run', at: new Date().toISOString(), args, pods: [] }
  try {
    for (const podId of args.podIds) await rescenePod(db, podId, { ...args, log })
  } finally {
    await db.end()
    const stamp = log.at.slice(0, 10)
    const out = evidencePath(`docs/pods/rescene-pod-${stamp}-${log.mode}-log.json`)
    fs.writeFileSync(out, JSON.stringify(log, null, 1))
    console.log(`\nlog: ${out}`)
  }
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1) })

module.exports = { planScenes, sceneTable, unitKeyOf, endsWithQuestion, DEFAULTS, MID_TURN_BREAK_COST }
