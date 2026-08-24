#!/usr/bin/env node
/**
 * migrate-split-progress-forward.cjs — carry learner progress from a WHOLE-TURN
 * slot onto the per-SENTENCE slots that replace it when a pod row gains a split
 * array.
 *
 * WHY. Progress is filed under a sentence's SLOT, not its text
 * (docs/pods/pod-migration-protocol.md, standing doctrine since 2026-08-16).
 * The player keys a split unit `<row_id>:s<index>` and an unsplit row plain
 * `<row_id>` (packages/player-vue/src/composables/useListeningPods.ts). So the
 * moment a row's `sentence_audio_ids` is populated, every existing
 * `learner_pod_state` row keyed on the bare `<row_id>` stops being reachable —
 * the learner silently loses what they had heard.
 *
 * This is the INVERSE of the `--migrate-split-progress` leg of
 * repair-split-array-inheritance.cjs, which dropped split-keyed rows when it
 * collapsed splits back to whole turns on 2026-08-24.
 *
 * THE RULE APPLIED, AND WHY IT IS A CARRY AND NOT A DROP. Protocol rule 6 says
 * a sentence that changed at all counts as new, because crediting someone for
 * the unheard is the harm being avoided. Nothing here changed: the split is a
 * change of GRANULARITY, not of content. The whole-turn clip was verified to
 * speak exactly this row's own text before any rebuild ran, so a learner with
 * N exposures of the turn has genuinely heard each of its sentences N times.
 * Carrying N onto each sentence slot credits nobody with anything unheard, and
 * satisfies rule 7 — progress cannot go backwards — by construction: the new
 * value is a MAX against anything already there, never a decrease.
 *
 * Rule 8: the carry and the delete of the stale whole-turn row commit in ONE
 * transaction, snapshotted to the log first and reversible from it.
 *
 *   node tools/pods/migrate-split-progress-forward.cjs <pod_id> [--apply]
 *
 * Read-only without --apply. Writes a log to
 * docs/pods/<course>-split-progress-forward-<date>-{dryrun,applied}-log.json.
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const POD = process.argv[2]
const APPLY = process.argv.includes('--apply')
if (!POD) {
  console.error('usage: migrate-split-progress-forward.cjs <pod_id> [--apply]')
  process.exit(2)
}

const REPO = path.resolve(__dirname, '../..')
const envText = fs.readFileSync(path.join(REPO, '.env.psql'), 'utf8')
const DATABASE_URL = (envText.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/) || [])[1]
if (!DATABASE_URL) throw new Error('no DATABASE_URL in .env.psql')

async function main () {
  const db = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()

  const pod = (await db.query('select course_code, visibility from listening_pods where id=$1', [POD])).rows[0]
  if (!pod) throw new Error(`no such pod: ${POD}`)
  const courseCode = pod.course_code

  // Rows that are NOW split (the rebuild has already linked them) and still
  // carry whole-turn-keyed progress.
  const rows = (await db.query(
    `select id, array_length(sentence_audio_ids, 1) as n
       from listening_pod_sentences
      where pod_id = $1
        and sentence_audio_ids is not null
        and array_length(sentence_audio_ids, 1) >= 2`, [POD])).rows
  const splitCount = new Map(rows.map((r) => [r.id, Number(r.n)]))

  const state = (await db.query(
    `select learner_id, sentence_id, exposures, updated_at
       from learner_pod_state
      where course_code = $1 and sentence_id = any($2)`,
    [courseCode, [...splitCount.keys()]])).rows

  const plan = []
  for (const s of state) {
    const n = splitCount.get(s.sentence_id)
    plan.push({
      learner_id: s.learner_id,
      from: s.sentence_id,
      to: Array.from({ length: n }, (_, i) => `${s.sentence_id}:s${i}`),
      exposures: s.exposures,
      before: { exposures: s.exposures, updated_at: s.updated_at },
    })
  }

  const log = {
    pod: POD,
    course: courseCode,
    apply: APPLY,
    at: new Date().toISOString(),
    split_rows: splitCount.size,
    whole_turn_state_rows_found: plan.length,
    new_slot_rows: plan.reduce((a, p) => a + p.to.length, 0),
    plan,
  }
  const date = log.at.slice(0, 10)
  const logPath = path.join(REPO, 'docs', 'pods',
    `${courseCode}-split-progress-forward-${date}-${APPLY ? 'applied' : 'dryrun'}-log.json`)

  if (!APPLY) {
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2))
    console.log(`[DRY] ${POD}: ${splitCount.size} split rows, ${plan.length} whole-turn progress rows to carry ` +
      `onto ${log.new_slot_rows} sentence slots. Log: ${logPath}`)
    await db.end()
    return
  }

  // Snapshot BEFORE the transaction so the log exists even if the write fails.
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2))

  await db.query('begin')
  try {
    let carried = 0, removed = 0
    for (const p of plan) {
      for (const to of p.to) {
        // GREATEST is rule 7 made structural: an existing sentence-slot value
        // is never lowered by the carry.
        const r = await db.query(
          `insert into learner_pod_state (learner_id, course_code, sentence_id, exposures)
                values ($1, $2, $3, $4)
           on conflict (learner_id, course_code, sentence_id)
                do update set exposures = greatest(learner_pod_state.exposures, excluded.exposures)`,
          [p.learner_id, courseCode, to, p.exposures])
        carried += r.rowCount
      }
      const d = await db.query(
        'delete from learner_pod_state where learner_id=$1 and course_code=$2 and sentence_id=$3',
        [p.learner_id, courseCode, p.from])
      removed += d.rowCount
    }
    await db.query('commit')
    console.log(`[APPLIED] ${POD}: carried ${carried} sentence-slot rows, removed ${removed} stale whole-turn rows. Log: ${logPath}`)
  } catch (e) {
    await db.query('rollback')
    console.error(`ROLLED BACK: ${e.message}`)
    process.exitCode = 1
  }
  await db.end()
}

main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
