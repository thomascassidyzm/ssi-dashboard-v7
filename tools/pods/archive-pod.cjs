#!/usr/bin/env node
/**
 * archive-pod.cjs — move a pod that nothing serves and nobody has progress in OUT of the
 * way, so its slug can be taken by something else. Rename, never delete.
 *
 * WHY THIS EXISTS. Tom's ruling of 2026-08-22: "We want to not have a Pod 0 from now on.
 * We want this first one to be called Pod 1." Croatian is the first course onto the new
 * 1-based convention — but `hrv_for_eng:pod-1` is already OCCUPIED by 180 sentences of a
 * completely separate dialogue set (Laura and Mark, commuting and weather), whose title
 * misleadingly reads "Pod 0". That pod must vacate the slug BEFORE the app ships a
 * resolver that prefers `pod-1`, or every Croatian learner is instantly served the wrong
 * pod. MAKE BEFORE BREAK: vacate first, resolve second, promote third.
 *
 * THE GUARD THAT MATTERS. This tool REFUSES if any `learner_pod_state` row references the
 * pod being moved. Progress keys off the sentence id (`<course>:<slug>:SC01-S001`), so
 * re-slugging a pod that carries progress orphans every record. If you need to move a pod
 * that HAS progress, that is a switchover, not an archive — use pod-switchover.cjs, which
 * migrates progress by content in the same transaction.
 *
 * Moves the header row and every sentence, re-slugging every sentence id. Audio ids are
 * carried untouched, so no clip is orphaned and nothing is regenerated. The move pattern is
 * pod-switchover.cjs's `movePod`, deliberately reused rather than re-invented.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write. One transaction, with post-conditions asserted
 * inside it. Every row is logged before and after to --log.
 *
 *   node tools/pods/archive-pod.cjs --course=hrv_for_eng --from=pod-1 \
 *     --to=pod-1-retired-2026-08-22 --title='...' --log=docs/pods/x-dryrun-log.json
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const APPLY = process.argv.includes('--apply')
const arg = (n) => {
  const a = process.argv.find(x => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}
const COURSE = arg('course')
const FROM = arg('from')
const TO = arg('to')
const TITLE = arg('title')
const LOG = arg('log')

const log = (...a) => console.log(...a)
const fail = (m) => { console.error(`REFUSED: ${m}`); process.exit(1) }

if (!COURSE || !FROM || !TO) fail('--course=, --from= and --to= are all required')
if (FROM === TO) fail('--from and --to are the same slug')
if (!LOG) fail('--log=<path> is required — every row is logged before and after')

const reslug = (id) => {
  const prefix = `${COURSE}:${FROM}:`
  if (!id.startsWith(prefix)) throw new Error(`sentence id ${id} does not sit under ${prefix}`)
  return `${COURSE}:${TO}:${id.slice(prefix.length)}`
}

async function main () {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()

  const fromId = `${COURSE}:${FROM}`
  const toId = `${COURSE}:${TO}`

  const { rows: [from] } = await db.query('select * from listening_pods where id = $1', [fromId])
  if (!from) fail(`no pod ${fromId}`)
  const { rows: [clash] } = await db.query('select id from listening_pods where id = $1', [toId])
  if (clash) fail(`${toId} already exists — refusing to merge two pods`)

  // THE GUARD. Progress keys off the sentence id, so a pod carrying progress cannot be
  // re-slugged without orphaning every record. Refuse rather than orphan.
  const { rows: [prog] } = await db.query(
    `select count(*) n, coalesce(sum(exposures),0) exposures
       from learner_pod_state where course_code = $1 and sentence_id like $2`,
    [COURSE, `${fromId}:%`]
  )
  log(`${fromId}: learner progress rows referencing this pod = ${prog.n} (${prog.exposures} exposures)`)
  if (Number(prog.n) > 0) {
    fail(`${prog.n} learner_pod_state rows reference ${fromId} — this is a switchover, not an archive. Use pod-switchover.cjs.`)
  }

  const { rows: sentences } = await db.query(
    'select * from listening_pod_sentences where pod_id = $1 order by global_order', [fromId])
  log(`${fromId} → ${toId}: ${sentences.length} sentences, header title ${JSON.stringify(from.title)}`)
  if (TITLE) log(`  new title: ${JSON.stringify(TITLE)}`)

  // Per-row before-state, captured before anything moves. This is the drift assertion.
  const entries = sentences.map(s => ({
    before: { id: s.id, pod_id: s.pod_id, global_order: s.global_order, scene_number: s.scene_number, sentence_number: s.sentence_number, known_text: s.known_text, target_audio_id: s.target_audio_id, known_audio_id: s.known_audio_id },
    after: { id: reslug(s.id), pod_id: toId }
  }))

  const record = {
    tool: 'archive-pod.cjs',
    mode: APPLY ? 'applied' : 'dryrun',
    course: COURSE,
    from: fromId,
    to: toId,
    title_before: from.title,
    title_after: TITLE || from.title,
    sentences: sentences.length,
    learner_progress_rows: Number(prog.n),
    rows: entries
  }

  if (!APPLY) {
    fs.mkdirSync(path.dirname(LOG), { recursive: true })
    fs.writeFileSync(LOG, JSON.stringify(record, null, 2))
    log(`\nDRY RUN — nothing written to the database. Row log: ${LOG}`)
    log('Pass --apply to write.')
    await db.end()
    return
  }

  await db.query('begin')
  try {
    await db.query(
      `insert into listening_pods (id, course_code, pod_type, slug, pod_order, title, scene, difficulty, speakers, source_file, metadata)
       select $1, course_code, pod_type, $2, pod_order, coalesce($3, title), scene, difficulty, speakers, source_file, metadata
         from listening_pods where id = $4`,
      [toId, TO, TITLE, fromId]
    )
    for (const e of entries) {
      // Per-row before-state assertion: abort the whole transaction on any drift.
      const { rows: [cur] } = await db.query(
        'select id, pod_id, global_order, known_text from listening_pod_sentences where id = $1', [e.before.id])
      if (!cur) throw new Error(`drift: sentence ${e.before.id} has vanished`)
      if (cur.pod_id !== e.before.pod_id) throw new Error(`drift: ${e.before.id} now sits under ${cur.pod_id}`)
      if (cur.global_order !== e.before.global_order) throw new Error(`drift: ${e.before.id} global_order moved`)
      if (cur.known_text !== e.before.known_text) throw new Error(`drift: ${e.before.id} known_text changed`)
      const r = await db.query(
        'update listening_pod_sentences set pod_id = $1, id = $2 where id = $3', [toId, e.after.id, e.before.id])
      if (r.rowCount !== 1) throw new Error(`drift: expected 1 row updated for ${e.before.id}, got ${r.rowCount}`)
    }
    const del = await db.query('delete from listening_pods where id = $1', [fromId])
    if (del.rowCount !== 1) throw new Error(`drift: expected to delete 1 empty header row, deleted ${del.rowCount}`)

    // Post-conditions, inside the transaction.
    const moved = Number((await db.query('select count(*) c from listening_pod_sentences where pod_id = $1', [toId])).rows[0].c)
    if (moved !== sentences.length) throw new Error(`post-check failed: ${toId} holds ${moved}, expected ${sentences.length}`)
    const left = Number((await db.query('select count(*) c from listening_pod_sentences where pod_id = $1', [fromId])).rows[0].c)
    if (left !== 0) throw new Error(`post-check failed: ${left} sentences left under ${fromId}`)
    const orphans = Number((await db.query(
      `select count(*) n from learner_pod_state ls where ls.course_code = $1
         and not exists (select 1 from listening_pod_sentences s
                          where s.id = regexp_replace(ls.sentence_id, ':s\\d+$', ''))`, [COURSE])).rows[0].n)
    if (orphans > 0) throw new Error(`post-check failed: ${orphans} learner state rows point at no sentence`)

    await db.query('commit')
    log(`\narchived. ${moved} sentences moved ${fromId} → ${toId}. Nothing deleted.`)
  } catch (e) {
    await db.query('rollback')
    throw e
  }

  fs.mkdirSync(path.dirname(LOG), { recursive: true })
  fs.writeFileSync(LOG, JSON.stringify(record, null, 2))
  log(`Row log: ${LOG}`)
  await db.end()
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
