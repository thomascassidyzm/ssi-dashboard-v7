#!/usr/bin/env node
/**
 * clone-pod.cjs — copy a course's pod row and every one of its sentence rows to a
 * second slug, so a destructive-looking rewrite can happen off the live pod.
 *
 * WHY THIS EXISTS. align-pod0-to-canonical.cjs rewrites a pod's English to Aran's
 * 2026-08-06 canonical, which on a typical course leaves ~128 slots with EMPTY
 * target text and no audio until translation and generation catch up. On a course
 * that is `draft` that is free. On a LIVE course it is hours of real learners
 * meeting a half-empty listening pod — the make-before-break rail
 * (docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md §6b) pointed at content
 * instead of clips.
 *
 * The Welsh precedent (2026-08-06) is the answer: learner-facing reads query the
 * EXACT pod id `<course>:pod-0` (player-vue `useListeningPods.ts`, `const podId =
 * `${course}:pod-0``), so a pod on any other slug is invisible to them. Clone
 * pod-0 to `pod-0-unrecorded`, align and translate THAT, and swap only when it is
 * complete and approved. `cym_n_for_eng` — a `released` course — has carried both
 * since 2026-08-06.
 *
 * NOTHING IS DELETED AND NOTHING IS MOVED. The source pod is not touched, not even
 * its title. Audio ids are COPIED, not reassigned: the clone points at the same
 * course_audio rows the live pod does, so lines that survive the align keep working
 * clips and are never regenerated. Two pods referencing one clip is already normal
 * (bookends are shared course-wide); no code path deletes a clip because a pointer
 * moved, and this tool has no delete path at all.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write. It refuses outright if the destination
 * pod already holds sentence rows — re-cloning over a half-aligned pod would be the
 * one way this could destroy work.
 *
 *   node tools/pods/clone-pod.cjs --course=spa_for_eng --to=pod-0-unrecorded
 *   node tools/pods/clone-pod.cjs --course=spa_for_eng --to=pod-0-unrecorded --apply
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const { Client } = require('pg')

const APPLY = process.argv.includes('--apply')
const arg = (n) => {
  const a = process.argv.find(x => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}
const COURSE = arg('course')
const FROM = arg('from') || 'pod-0'
const TO = arg('to')
const TITLE_SUFFIX = arg('title-suffix') || ' — UNRECORDED working copy, not learner-facing'
// listening_pods.visibility DEFAULTS TO 'live', so an insert that omits the column
// creates a learner-visible pod. This tool's whole purpose is a copy that is NOT
// learner-facing, so it writes the column explicitly and defaults it to 'held'.
// (Omitting it is how 40 non-serving pods came to be 'live' and needed the
// 2026-08-23 sweep: docs/pods/hold-40-non-serving-pods-2026-08-23.md.)
const VISIBILITY = arg('visibility') || 'held'
if (!COURSE || !TO) {
  console.error('FAILED: --course=<code> and --to=<slug> are both required')
  process.exit(1)
}
if (!['held', 'live', 'draft'].includes(VISIBILITY)) {
  console.error(`FAILED: --visibility=${VISIBILITY} is not one of held|live|draft`)
  process.exit(1)
}
if (TO === FROM) {
  console.error('FAILED: --to must differ from --from')
  process.exit(1)
}

const srcPodId = `${COURSE}:${FROM}`
const dstPodId = `${COURSE}:${TO}`

;(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  try {
    const src = (await db.query(`select * from listening_pods where id=$1`, [srcPodId])).rows[0]
    if (!src) throw new Error(`${srcPodId}: no such pod`)

    const dstExisting = (await db.query(`select id, visibility from listening_pods where id=$1`, [dstPodId])).rows[0]
    const dstRows = Number((await db.query(
      `select count(*) n from listening_pod_sentences where pod_id=$1`, [dstPodId])).rows[0].n)
    if (dstRows > 0) throw new Error(`${dstPodId} already holds ${dstRows} sentence row(s); refusing to clone over it`)

    const sentences = (await db.query(
      `select * from listening_pod_sentences where pod_id=$1 order by global_order`, [srcPodId])).rows
    if (!sentences.length) throw new Error(`${srcPodId}: no sentence rows to clone`)

    // Row ids embed the pod slug (`<course>:<slug>:SC01-S001`). Rewrite only that
    // segment so scene/sentence numbering — which the align tool matches on — is
    // preserved exactly.
    const reId = (id) => (id.startsWith(`${srcPodId}:`) ? `${dstPodId}:${id.slice(srcPodId.length + 1)}` : null)
    const bad = sentences.filter(s => !reId(s.id))
    if (bad.length) throw new Error(`${bad.length} row id(s) do not start with "${srcPodId}:" (e.g. ${bad[0].id}); refusing to guess new ids`)

    // Copy every column except the ones that identify the row or stamp its age.
    const copyCols = Object.keys(sentences[0]).filter(c => !['id', 'pod_id', 'created_at', 'updated_at'].includes(c))

    // node-postgres hands jsonb back as a parsed JS object and then serialises a JS
    // object parameter as a Postgres composite literal, not JSON — so a jsonb column
    // must be re-stringified on the way in. Array columns (uuid[]/text[]) must NOT
    // be, which is why this is driven off the real column types, not typeof.
    const jsonCols = async (table) => new Set((await db.query(
      `select column_name from information_schema.columns
        where table_name=$1 and data_type in ('json','jsonb')`, [table])).rows.map(r => r.column_name))
    const sentenceJson = await jsonCols('listening_pod_sentences')
    const podJson = await jsonCols('listening_pods')
    const enc = (set, col, v) => (set.has(col) && v !== null && v !== undefined ? JSON.stringify(v) : v)

    const summary = {
      course: COURSE, from: srcPodId, to: dstPodId,
      destination_pod_row: dstExisting ? 'already exists, will be left as-is' : 'will be created',
      destination_visibility: dstExisting ? `${dstExisting.visibility} (existing row, NOT changed)` : VISIBILITY,
      sentences_to_insert: sentences.length,
      with_target_text: sentences.filter(s => String(s.target_text || '').trim()).length,
      with_target_audio: sentences.filter(s => s.target_audio_id).length,
      with_known_audio: sentences.filter(s => s.known_audio_id).length,
      columns_copied: copyCols.length,
    }

    if (!APPLY) {
      console.log(JSON.stringify({ mode: 'DRY RUN', summary }, null, 2))
      return
    }

    await db.query('BEGIN')
    try {
      if (!dstExisting) {
        await db.query(
          `insert into listening_pods (id, course_code, pod_type, slug, pod_order, title, scene, difficulty, speakers, source_file, metadata, visibility)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [dstPodId, src.course_code, src.pod_type, TO, src.pod_order,
            `${src.title}${TITLE_SUFFIX}`, src.scene, src.difficulty,
            enc(podJson, 'speakers', src.speakers), src.source_file, enc(podJson, 'metadata', src.metadata),
            VISIBILITY])
      }
      const cols = ['id', 'pod_id', ...copyCols]
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(',')
      for (const s of sentences) {
        const vals = [reId(s.id), dstPodId, ...copyCols.map(c => enc(sentenceJson, c, s[c]))]
        const r = await db.query(
          `insert into listening_pod_sentences (${cols.map(c => `"${c}"`).join(',')}) values (${placeholders})`, vals)
        if (r.rowCount !== 1) throw new Error(`insert of ${reId(s.id)} affected ${r.rowCount} rows`)
      }
      await db.query('COMMIT')
    } catch (e) {
      await db.query('ROLLBACK')
      throw e
    }
    const after = Number((await db.query(
      `select count(*) n from listening_pod_sentences where pod_id=$1`, [dstPodId])).rows[0].n)
    if (after !== sentences.length) throw new Error(`post-check: ${dstPodId} holds ${after} rows, expected ${sentences.length}`)
    // Read the visibility back rather than trusting the insert: a clone that is
    // reachable by a learner is the one way this tool can do harm.
    const vis = (await db.query(`select visibility from listening_pods where id=$1`, [dstPodId])).rows[0].visibility
    if (!dstExisting && vis !== VISIBILITY) throw new Error(`post-check: ${dstPodId} is '${vis}', expected '${VISIBILITY}'`)
    console.log(JSON.stringify({ mode: 'APPLIED', summary, verified_rows: after, verified_visibility: vis }, null, 2))
  } finally {
    await db.end()
  }
})().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
