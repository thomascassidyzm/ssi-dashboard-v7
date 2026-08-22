#!/usr/bin/env node
/**
 * waive-proofread-draft-flag.cjs — clear the `target_text_draft` marker on a single
 * pod, per Tom's ruling of 2026-08-22: the human-proofread gate on machine-drafted
 * target text is waived (we don't speak the 100 target languages and can't scale a
 * human proofread across them; we trust the LLM-generated text and the TTS).
 *
 * This does NOT touch text, audio, or any other column — only the draft flag. It does
 * NOT touch `sarah_to_friend_pending_signoff` blocks (a separate, still-open ask about
 * the canonical English, not the Croatian proofread this ruling waives).
 *
 * Scoped by a hard `WHERE pod_id = $1 AND target_text_draft = true` predicate so it
 * cannot reach any other pod. Per-row before-state assertion aborts the whole run on
 * drift. DRY RUN BY DEFAULT. Pass --apply to write.
 *
 *   node tools/pods/waive-proofread-draft-flag.cjs --pod=hrv_for_eng:pod-0-unrecorded
 *   node tools/pods/waive-proofread-draft-flag.cjs --pod=hrv_for_eng:pod-0-unrecorded --apply
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
const POD_ID = arg('pod')
if (!POD_ID) {
  console.error('FAILED: --pod=<pod_id> is required')
  process.exit(1)
}

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()
  const log = []
  try {
    const before = await c.query(
      `select id, pod_id, scene_number, sentence_number, target_text_draft
         from listening_pod_sentences
        where pod_id = $1 and target_text_draft = true
        order by id`,
      [POD_ID]
    )
    console.log(`Found ${before.rows.length} rows with target_text_draft=true on ${POD_ID}`)

    if (!APPLY) {
      for (const row of before.rows) {
        log.push({ ...row, action: 'would-clear-draft-flag' })
      }
      const outPath = path.join(REPO, 'docs', 'pods', 'hrv-pod0-proofread-waiver-dryrun-log.json')
      fs.writeFileSync(outPath, JSON.stringify(log, null, 2))
      console.log(`DRY RUN. Wrote ${log.length} rows to ${outPath}`)
      await c.end()
      return
    }

    await c.query('BEGIN')
    for (const row of before.rows) {
      const res = await c.query(
        `update listening_pod_sentences
            set target_text_draft = false
          where id = $1 and pod_id = $2 and target_text_draft = true
          returning id`,
        [row.id, row.pod_id]
      )
      if (res.rowCount !== 1) {
        throw new Error(
          `DRIFT: row id=${row.id} (pod=${row.pod_id}, scene=${row.scene_number}, sentence=${row.sentence_number}) no longer matches before-state (target_text_draft=true) — aborting whole run`
        )
      }
      log.push({ ...row, action: 'cleared-draft-flag' })
    }
    await c.query('COMMIT')

    const outPath = path.join(REPO, 'docs', 'pods', 'hrv-pod0-proofread-waiver-applied-log.json')
    fs.writeFileSync(outPath, JSON.stringify(log, null, 2))
    console.log(`APPLIED. Cleared ${log.length} rows. Wrote ${outPath}`)
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {})
    console.error('FAILED:', e.message)
    process.exit(1)
  } finally {
    await c.end()
  }
}

main()
