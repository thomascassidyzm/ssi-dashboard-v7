#!/usr/bin/env node
/**
 * delete-blank-pod-sentence.cjs — remove a pod sentence row that carries NO TEXT
 * on either side.
 *
 * Why this exists (2026-08-22, the ita/spa/fra/zho pod rollout): three of the four
 * courses carry 232 rows on `<course>:pod-0-unrecorded` where Croatian and Spanish
 * carry 231. The extra row is `SC15-S012` — empty `target_text` AND empty
 * `known_text`, no audio on either track. It is also the whole of each course's
 * "1 missing known audio". A row with no text on either side cannot be rendered
 * and cannot be shown to a learner; it can only ever sit in the readiness gate as
 * a permanent blocker.
 *
 * There is no Croatian precedent to mirror: `hrv_for_eng:pod-1` has 231 rows and
 * scene 15 ends at S011, so Croatia never had this row rather than having resolved
 * it. Deleting is therefore a fresh call, taken as the taste-safe default.
 *
 * SAFETY. The predicate is hard and triple-locked: the row must match the id given,
 * AND have empty text on BOTH sides, AND have NULL audio on BOTH tracks. Anything
 * else and the run aborts having written nothing. It refuses outright to touch a
 * pod slug that is not `*-unrecorded` — live learner-facing pods are out of reach
 * by construction. Learner progress on the row is counted and reported before any
 * write, and a non-zero count aborts.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write.
 *
 *   node tools/pods/delete-blank-pod-sentence.cjs --id=ita_for_eng:pod-0-unrecorded:SC15-S012
 *   node tools/pods/delete-blank-pod-sentence.cjs --id=... --apply
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const REPO = path.join(__dirname, '..', '..')
const APPLY = process.argv.includes('--apply')
const arg = (n) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}
const SENTENCE_ID = arg('id')
if (!SENTENCE_ID) {
  console.error('FAILED: --id=<sentence_id> is required')
  process.exit(1)
}
// pod_id is everything before the final ':SCnn-Snnn' segment.
const POD_ID = SENTENCE_ID.split(':').slice(0, 2).join(':')
if (!/-unrecorded$/.test(POD_ID)) {
  console.error(`FAILED: ${POD_ID} is not an *-unrecorded staging pod. This tool will not touch a live pod.`)
  process.exit(1)
}
const LOG_PREFIX = arg('log-prefix') || POD_ID.replace(/:/g, '-')
const logPath = (kind) =>
  path.join(REPO, 'docs', 'pods', `${LOG_PREFIX}-blank-row-${kind}-log.json`)

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()
  try {
    const { rows } = await c.query(
      `select id, pod_id, scene_number, sentence_number, global_order, speaker,
              target_text, known_text, target_audio_id, known_audio_id
         from listening_pod_sentences
        where id = $1`,
      [SENTENCE_ID]
    )
    if (rows.length !== 1) {
      throw new Error(`expected exactly 1 row for id=${SENTENCE_ID}, found ${rows.length} — nothing written`)
    }
    const row = rows[0]

    // Before-state assertions. Any one of these failing means the row is not the
    // textless artefact this tool exists to remove, and we abort rather than guess.
    const problems = []
    if (String(row.target_text || '').trim() !== '') problems.push(`target_text is not empty (${JSON.stringify(row.target_text)})`)
    if (String(row.known_text || '').trim() !== '') problems.push(`known_text is not empty (${JSON.stringify(row.known_text)})`)
    if (row.target_audio_id !== null) problems.push(`target_audio_id is not null (${row.target_audio_id})`)
    if (row.known_audio_id !== null) problems.push(`known_audio_id is not null (${row.known_audio_id})`)
    if (row.pod_id !== POD_ID) problems.push(`pod_id ${row.pod_id} does not match ${POD_ID}`)
    if (problems.length) {
      throw new Error(`DRIFT — refusing to delete ${SENTENCE_ID}:\n  - ${problems.join('\n  - ')}`)
    }

    // Learner progress is filed by sentence id. A blank row should have none;
    // if it somehow does, that is a fact worth stopping for.
    const { rows: [{ n: stateRows }] } = await c.query(
      `select count(*)::int n from learner_pod_state where sentence_id = $1`, [SENTENCE_ID]
    )
    if (stateRows > 0) {
      throw new Error(`${stateRows} learner_pod_state row(s) reference ${SENTENCE_ID} — aborting; this needs a human`)
    }

    const record = {
      ...row,
      learner_pod_state_rows: stateRows,
      reason: 'textless artefact row: empty target_text and known_text, no audio on either track; unrenderable and unshowable',
      action: APPLY ? 'deleted' : 'would-delete',
    }

    console.log(`Row ${SENTENCE_ID}: scene ${row.scene_number} sentence ${row.sentence_number}, speaker ${JSON.stringify(row.speaker)}`)
    console.log(`  target_text=${JSON.stringify(row.target_text)} known_text=${JSON.stringify(row.known_text)}`)
    console.log(`  target_audio_id=${row.target_audio_id} known_audio_id=${row.known_audio_id} learner_pod_state rows=${stateRows}`)

    if (!APPLY) {
      fs.writeFileSync(logPath('dryrun'), JSON.stringify([record], null, 2))
      console.log(`DRY RUN. Wrote ${logPath('dryrun')}`)
      await c.end()
      return
    }

    await c.query('BEGIN')
    // The predicate repeats every assertion, so a concurrent writer that filled
    // the row between the read and this delete loses the race instead of the row.
    const res = await c.query(
      `delete from listening_pod_sentences
        where id = $1
          and pod_id = $2
          and coalesce(btrim(target_text), '') = ''
          and coalesce(btrim(known_text), '') = ''
          and target_audio_id is null
          and known_audio_id is null
        returning id`,
      [SENTENCE_ID, POD_ID]
    )
    if (res.rowCount !== 1) {
      throw new Error(`DRIFT: delete matched ${res.rowCount} rows, expected 1 — rolled back`)
    }
    await c.query('COMMIT')
    fs.writeFileSync(logPath('applied'), JSON.stringify([record], null, 2))
    console.log(`APPLIED. Deleted 1 row. Wrote ${logPath('applied')}`)
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {})
    console.error('FAILED:', e.message)
    process.exit(1)
  } finally {
    await c.end()
  }
}

main()
