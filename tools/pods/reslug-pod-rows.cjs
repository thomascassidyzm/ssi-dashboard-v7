#!/usr/bin/env node
/**
 * reslug-pod-rows.cjs — make a pod's sentence row ids agree with the pod they
 * actually live on.
 *
 * WHY THIS EXISTS. A sentence row id is `<course>:<slug>:<tail>` — the slug is
 * baked into the primary key. `clone-pod.cjs` rewrites that segment when it
 * copies; a hand-rolled "move" (an `update ... set pod_id = ...` in a console)
 * does not. The 2026-08-06 Welsh gating was the hand-rolled kind: 464 rows sat
 * on `<course>:pod-0-unrecorded` still carrying `<course>:pod-0:` ids. That is a
 * landmine, not cosmetics — id-keyed writers (align/generate/upsert paths that
 * match on `id`) look at the id, decide the row belongs to the live pod, and
 * drag it back. It happened for real on 2026-08-10
 * (docs/pods/cym-n-pod0-19-sentence-move-2026-08-10.md, 19 rows).
 *
 * This tool only rewrites the slug segment of the id. Nothing else on the row is
 * touched: not pod_id, not text, not audio pointers, not scene/sentence
 * numbering (which is what align tools match on). No row is created or deleted.
 * Nothing outside `listening_pod_sentences` references these ids — the only
 * foreign key into the table is `pod_id -> listening_pods.id`, which this does
 * not move.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write. It refuses if any new id would
 * collide with an existing row anywhere in the table, and asserts the row count
 * is unchanged before it commits.
 *
 *   node tools/pods/reslug-pod-rows.cjs --course=cym_n_for_eng --pod=pod-0-unrecorded
 *   node tools/pods/reslug-pod-rows.cjs --course=cym_n_for_eng --pod=pod-0-unrecorded --apply
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql'), quiet: true })
const { Client } = require('pg')

const APPLY = process.argv.includes('--apply')
const arg = (n) => {
  const a = process.argv.find(x => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}
const COURSE = arg('course')
const POD = arg('pod')
if (!COURSE || !POD) {
  console.error('FAILED: --course=<code> and --pod=<slug> are both required')
  process.exit(1)
}

const podId = `${COURSE}:${POD}`

/**
 * `<course>:<slug>:<tail>` — course codes and slugs never contain a colon, tails
 * may (nothing in the estate does today, but joining the remainder back is free
 * insurance). Returns null when the shape is not recognisable, which is a refusal,
 * never a guess.
 */
function retail(id, course) {
  const parts = String(id).split(':')
  if (parts.length < 3) return null
  if (parts[0] !== course) return null
  const tail = parts.slice(2).join(':')
  return tail || null
}

;(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  try {
    const pod = (await db.query(`select id, course_code, slug from listening_pods where id=$1`, [podId])).rows[0]
    if (!pod) throw new Error(`${podId}: no such pod`)
    if (pod.course_code !== COURSE) throw new Error(`${podId}: course_code is ${pod.course_code}, not ${COURSE}`)

    const rows = (await db.query(
      `select id, global_order from listening_pod_sentences where pod_id=$1 order by global_order`, [podId])).rows
    if (!rows.length) throw new Error(`${podId}: no sentence rows`)

    const already = rows.filter(r => r.id.startsWith(`${podId}:`))
    const todo = []
    for (const r of rows) {
      if (r.id.startsWith(`${podId}:`)) continue
      const tail = retail(r.id, COURSE)
      if (!tail) throw new Error(`row id "${r.id}" is not <course>:<slug>:<tail> for ${COURSE}; refusing to guess a new id`)
      todo.push({ from: r.id, to: `${podId}:${tail}` })
    }

    // Collision check against the WHOLE table, not just this pod: a new id landing
    // on a row of some other pod would be a silent overwrite attempt.
    let collisions = []
    if (todo.length) {
      collisions = (await db.query(
        `select id, pod_id from listening_pod_sentences where id = any($1::text[])`,
        [todo.map(t => t.to)])).rows
    }

    const summary = {
      pod: podId,
      rows_total: rows.length,
      already_correct: already.length,
      to_reslug: todo.length,
      distinct_wrong_prefixes: [...new Set(todo.map(t => t.from.split(':').slice(0, 2).join(':')))],
      collisions: collisions.length,
      examples: todo.slice(0, 3),
    }

    if (collisions.length) {
      console.error(JSON.stringify({ mode: 'REFUSED', reason: 'new ids collide with existing rows', summary, collisions: collisions.slice(0, 10) }, null, 2))
      process.exit(1)
    }
    if (!todo.length) {
      console.log(JSON.stringify({ mode: 'NO-OP', summary }, null, 2))
      return
    }
    if (!APPLY) {
      console.log(JSON.stringify({ mode: 'DRY RUN', summary, plan: todo }, null, 2))
      return
    }

    await db.query('BEGIN')
    try {
      for (const t of todo) {
        const r = await db.query(
          `update listening_pod_sentences set id=$1 where id=$2 and pod_id=$3`, [t.to, t.from, podId])
        if (r.rowCount !== 1) throw new Error(`update of ${t.from} affected ${r.rowCount} rows`)
      }
      const after = (await db.query(
        `select count(*) n, count(*) filter (where id like $2) ok
           from listening_pod_sentences where pod_id=$1`, [podId, `${podId}:%`])).rows[0]
      if (Number(after.n) !== rows.length) throw new Error(`post-check: ${podId} holds ${after.n} rows, expected ${rows.length}`)
      if (Number(after.ok) !== rows.length) throw new Error(`post-check: only ${after.ok}/${rows.length} rows carry the ${podId}: prefix`)
      await db.query('COMMIT')
      console.log(JSON.stringify({ mode: 'APPLIED', summary, verified_rows: Number(after.n) }, null, 2))
    } catch (e) {
      await db.query('ROLLBACK')
      throw e
    }
  } finally {
    await db.end()
  }
})().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
