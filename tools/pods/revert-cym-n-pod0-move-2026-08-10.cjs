#!/usr/bin/env node
/**
 * revert-cym-n-pod0-move-2026-08-10.cjs — undo the accidental 2026-08-10 16:44-16:46 UTC
 * Generate that dragged 19 sentences out of `cym_n_for_eng:pod-0-unrecorded` into the LIVE
 * `cym_n_for_eng:pod-0`, overwrote Aran's afternoon proofreading with machine Welsh, and
 * deleted the "[GATED 2026-08-06]" marker from the pod header.
 *
 * Diagnosis (authority for this script): docs/pods/cym-n-pod0-19-sentence-move-2026-08-10.md
 *
 * WHAT IT RESTORES, all read verbatim out of `content_audit_log.old_row` — never composed here:
 *   1. the 19 rows' `pod_id`, back to `cym_n_for_eng:pod-0-unrecorded`, leaving pod-0 childless
 *      (an empty pod-0 IS the gate: player-vue `useListeningPods.ts` reads that exact id and
 *      treats zero rows as "the course has no pod live");
 *   2. their `target_text` / `known_text`, back to the pre-16:44 values = Aran's proofreading;
 *   3. the pod header's `title`, `speakers` and `metadata`, back to the gated state.
 *
 * AUDIO. The three steps above write TEXT AND POINTERS ONLY and never name an audio column,
 * so Aran's two surviving target clips (SC01-S001, SC01-S003) come through untouched. The
 * `PATCH /api/admin/pod-sentences/:id` endpoint would have nulled them as a side effect of any
 * text edit — that is exactly why this is direct SQL and not that endpoint.
 *
 * --reattach-known-audio is a SEPARATE, OPT-IN step, off by default and logged separately,
 * because it is the one thing here that writes an audio column. The generate nulled
 * `known_audio_id` on 8 rows; all 8 pointed at Aran's own human English recordings
 * (origin='human', voice_id='human_aran_cym_n'), which are still alive in course_audio and are
 * now orphaned. Re-pointing at them restores the pre-16:44 state and detaches nothing.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write. Before-state is asserted per row and the whole
 * thing ABORTS on any drift: if a row is not exactly what the audit trail says it should be,
 * something else moved under us and forcing would destroy that instead.
 *
 *   node tools/pods/revert-cym-n-pod0-move-2026-08-10.cjs
 *   node tools/pods/revert-cym-n-pod0-move-2026-08-10.cjs --apply
 *   node tools/pods/revert-cym-n-pod0-move-2026-08-10.cjs --reattach-known-audio --apply
 */
'use strict'

const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql') })
const { Client } = require('pg')

const APPLY = process.argv.includes('--apply')
const REATTACH = process.argv.includes('--reattach-known-audio')

const COURSE = 'cym_n_for_eng'
const LIVE_POD = `${COURSE}:pod-0`
const SAFE_POD = `${COURSE}:pod-0-unrecorded`

// The three generate statements, to the microsecond. Each row's old_row at one of these
// timestamps IS its pre-16:44 state, because no write has touched these rows since.
const WRITE_TS = [
  '2026-08-10 16:44:54.714147+00',
  '2026-08-10 16:45:34.912268+00',
  '2026-08-10 16:45:51.529696+00',
]
const HEADER_TS = '2026-08-10 16:44:39.430037+00'
// Anything after this instant on these rows means someone else has been here since.
const QUIET_SINCE = '2026-08-10 16:45:52+00'

const EXPECTED_ROWS = 19
const EXPECTED_GATED_TITLE =
  '[GATED 2026-08-06] placeholder — sentences moved to cym_n_for_eng:pod-0-unrecorded until Aran/Catrin record them'

const LOG_DIR = path.join(__dirname, '..', '..', 'docs', 'pods')
const logPath = (kind) => path.join(LOG_DIR, `cym-n-pod0-revert-2026-08-10-${kind}-log.json`)

const fail = (m) => { throw new Error(m) }

;(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  try {
    // ---- gather: current live rows joined to their own pre-generate snapshot --------------
    const { rows: sentences } = await db.query(
      `select s.id,
              s.pod_id                      as cur_pod_id,
              s.target_text                 as cur_target_text,
              s.known_text                  as cur_known_text,
              s.target_audio_id             as cur_target_audio_id,
              s.known_audio_id              as cur_known_audio_id,
              s.global_order, s.scene_number, s.sentence_number,
              l.old_row->>'pod_id'          as old_pod_id,
              l.old_row->>'target_text'     as old_target_text,
              l.old_row->>'known_text'      as old_known_text,
              l.old_row->>'target_audio_id' as old_target_audio_id,
              l.old_row->>'known_audio_id'  as old_known_audio_id,
              l.changed_at
         from listening_pod_sentences s
         join content_audit_log l
           on l.primary_key = s.id
          and l.table_name  = 'listening_pod_sentences'
          and l.changed_at  = any($2::timestamptz[])
        where s.pod_id = $1
        order by s.global_order`,
      [LIVE_POD, WRITE_TS])

    // ---- before-state assertions: refuse on any drift ------------------------------------
    if (sentences.length !== EXPECTED_ROWS) {
      fail(`expected ${EXPECTED_ROWS} rows in ${LIVE_POD} with a generate-audit snapshot, found ${sentences.length}`)
    }
    const liveCount = Number((await db.query(
      `select count(*) n from listening_pod_sentences where pod_id=$1`, [LIVE_POD])).rows[0].n)
    if (liveCount !== EXPECTED_ROWS) fail(`${LIVE_POD} holds ${liveCount} rows, expected exactly ${EXPECTED_ROWS}`)

    for (const r of sentences) {
      if (r.cur_pod_id !== LIVE_POD) fail(`${r.id}: pod_id is "${r.cur_pod_id}", expected "${LIVE_POD}"`)
      if (r.old_pod_id !== SAFE_POD) fail(`${r.id}: audit old pod_id is "${r.old_pod_id}", expected "${SAFE_POD}"`)
      if (r.old_target_text === null) fail(`${r.id}: audit old_row has no target_text; refusing to guess`)
      // The generate never touched target_audio_id — assert that, so we can be sure leaving it
      // alone really does preserve the pre-16:44 state rather than freezing a loss.
      if ((r.old_target_audio_id || null) !== (r.cur_target_audio_id || null)) {
        fail(`${r.id}: target_audio_id changed in the generate (${r.old_target_audio_id} -> ${r.cur_target_audio_id}); ` +
             `this script does not write audio columns — stop and re-diagnose`)
      }
    }

    // Nothing may have been written to these rows since the generate finished.
    const { rows: later } = await db.query(
      `select primary_key, changed_at from content_audit_log
        where table_name='listening_pod_sentences' and primary_key = any($1)
          and changed_at > $2::timestamptz`,
      [sentences.map(r => r.id), QUIET_SINCE])
    if (later.length) {
      fail(`${later.length} write(s) landed on these rows after the generate ` +
           `(e.g. ${later[0].primary_key} at ${later[0].changed_at}); the audit snapshot is no longer the true ` +
           `pre-state — stop and re-diagnose`)
    }

    // Moving home must not collide with the 213 rows already there.
    const { rows: clash } = await db.query(
      `select id, global_order, scene_number, sentence_number
         from listening_pod_sentences
        where pod_id = $1
          and (global_order = any($2::int[])
               or (scene_number, sentence_number) in (${sentences.map((_, i) => `($${i * 2 + 3},$${i * 2 + 4})`).join(',')}))`,
      [SAFE_POD, sentences.map(r => r.global_order), ...sentences.flatMap(r => [r.scene_number, r.sentence_number])])
    if (clash.length) {
      fail(`${SAFE_POD} already holds ${clash.length} row(s) that would collide on the ` +
           `(pod_id, global_order) / (pod_id, scene, sentence) unique keys (e.g. ${clash[0].id}); refusing`)
    }

    // ---- the pod header -------------------------------------------------------------------
    const header = (await db.query(`select * from listening_pods where id=$1`, [LIVE_POD])).rows[0]
    if (!header) fail(`${LIVE_POD}: no pod header row`)
    const gated = (await db.query(
      `select old_row from content_audit_log
        where table_name='listening_pods' and primary_key=$1 and changed_at=$2::timestamptz`,
      [LIVE_POD, HEADER_TS])).rows[0]
    if (!gated) fail(`no header audit row at ${HEADER_TS}; cannot recover the gated title`)
    const gatedRow = gated.old_row
    if (gatedRow.title !== EXPECTED_GATED_TITLE) {
      fail(`header audit old title does not match the expected [GATED …] string; refusing to write a title I inferred`)
    }
    const headerLater = (await db.query(
      `select changed_at from content_audit_log
        where table_name='listening_pods' and primary_key=$1 and changed_at > $2::timestamptz`,
      [LIVE_POD, QUIET_SINCE])).rows
    if (headerLater.length) fail(`the pod header has been written since the generate (${headerLater[0].changed_at}); stop`)
    const headerFields = ['title', 'speakers', 'metadata']
    const headerChanges = headerFields
      .filter(f => JSON.stringify(header[f]) !== JSON.stringify(gatedRow[f]))
      .map(f => ({ field: f, from: header[f], to: gatedRow[f] }))

    // ---- optional: re-attach the English clips the generate orphaned ----------------------
    const reattach = sentences.filter(r => r.old_known_audio_id && !r.cur_known_audio_id)
    let reattachClips = []
    if (reattach.length) {
      const { rows } = await db.query(
        `select id::text, origin, voice_id, course_code from course_audio where id = any($1::uuid[])`,
        [reattach.map(r => r.old_known_audio_id)])
      reattachClips = rows
      const missing = reattach.filter(r => !rows.some(c => c.id === r.old_known_audio_id))
      if (REATTACH && missing.length) {
        fail(`${missing.length} orphaned known_audio_id(s) no longer exist in course_audio (e.g. ${missing[0].id}); refusing`)
      }
    }

    // ---- report / write -------------------------------------------------------------------
    const perRow = sentences.map(r => ({
      id: r.id,
      written_at: r.changed_at,
      pod_id: { from: r.cur_pod_id, to: r.old_pod_id },
      target_text: r.cur_target_text === r.old_target_text ? 'unchanged'
        : { from: r.cur_target_text, to: r.old_target_text },
      known_text: r.cur_known_text === r.old_known_text ? 'unchanged'
        : { from: r.cur_known_text, to: r.old_known_text },
      target_audio_id: `${r.cur_target_audio_id || 'null'} (NOT WRITTEN)`,
      known_audio_id: r.old_known_audio_id && !r.cur_known_audio_id
        ? (REATTACH ? { from: null, to: r.old_known_audio_id } : `orphaned: ${r.old_known_audio_id} (NOT WRITTEN — pass --reattach-known-audio)`)
        : 'unchanged',
    }))
    const summary = {
      mode: APPLY ? 'APPLIED' : 'DRY RUN',
      reattach_known_audio: REATTACH,
      course: COURSE,
      rows: sentences.length,
      pod_id_repointed: sentences.length,
      target_text_restored: sentences.filter(r => r.cur_target_text !== r.old_target_text).length,
      known_text_restored: sentences.filter(r => r.cur_known_text !== r.old_known_text).length,
      target_audio_ids_touched: 0,
      known_audio_ids_reattached: REATTACH ? reattach.length : 0,
      known_audio_orphans_found: reattach.length,
      known_audio_orphan_clips: reattachClips,
      header_fields_restored: headerChanges.map(c => c.field),
      header_title_to: gatedRow.title,
    }

    if (!APPLY) {
      fs.writeFileSync(logPath('dryrun'), JSON.stringify({ summary, header: headerChanges, rows: perRow }, null, 2))
      console.log(JSON.stringify(summary, null, 2))
      console.log(`\nDRY RUN — nothing written. Log: ${logPath('dryrun')}`)
      return
    }

    await db.query('BEGIN')
    try {
      for (const r of sentences) {
        // Explicit column list. No audio column appears here unless --reattach-known-audio.
        const sets = ['pod_id=$2', 'target_text=$3', 'known_text=$4', 'updated_at=now()']
        const vals = [r.id, r.old_pod_id, r.old_target_text, r.old_known_text]
        if (REATTACH && r.old_known_audio_id && !r.cur_known_audio_id) {
          sets.push(`known_audio_id=$${vals.length + 1}::uuid`)
          vals.push(r.old_known_audio_id)
        }
        // Re-assert the before-state inside the write itself: if the row moved between the
        // check above and here, the update matches nothing and we abort.
        const res = await db.query(
          `update listening_pod_sentences set ${sets.join(', ')}
            where id=$1 and pod_id=$${vals.length + 1} and target_text is not distinct from $${vals.length + 2}`,
          [...vals, LIVE_POD, r.cur_target_text])
        if (res.rowCount !== 1) fail(`${r.id}: update matched ${res.rowCount} rows (expected 1) — before-state drifted`)
      }
      if (headerChanges.length) {
        const res = await db.query(
          `update listening_pods set title=$2, speakers=$3::jsonb, metadata=$4::jsonb, updated_at=now()
            where id=$1 and title=$5`,
          [LIVE_POD, gatedRow.title, JSON.stringify(gatedRow.speakers), JSON.stringify(gatedRow.metadata), header.title])
        if (res.rowCount !== 1) fail(`pod header update matched ${res.rowCount} rows (expected 1)`)
      }
      await db.query('COMMIT')
    } catch (e) {
      await db.query('ROLLBACK')
      throw e
    }

    // ---- post-checks, read back from the database ------------------------------------------
    const after = {
      live_pod_rows: Number((await db.query(
        `select count(*) n from listening_pod_sentences where pod_id=$1`, [LIVE_POD])).rows[0].n),
      safe_pod_rows: Number((await db.query(
        `select count(*) n from listening_pod_sentences where pod_id=$1`, [SAFE_POD])).rows[0].n),
      header_title: (await db.query(`select title from listening_pods where id=$1`, [LIVE_POD])).rows[0].title,
      arans_target_clips_intact: Number((await db.query(
        `select count(*) n from listening_pod_sentences
          where id = any($1) and target_audio_id is not null`,
        [[`${LIVE_POD}:SC01-S001`, `${LIVE_POD}:SC01-S003`]])).rows[0].n),
    }
    if (after.live_pod_rows !== 0) fail(`post-check: ${LIVE_POD} still holds ${after.live_pod_rows} rows`)
    if (after.header_title !== EXPECTED_GATED_TITLE) fail(`post-check: header title is "${after.header_title}"`)
    if (after.arans_target_clips_intact !== 2) {
      fail(`post-check: expected 2 surviving target clips on SC01-S001/S003, found ${after.arans_target_clips_intact}`)
    }

    fs.writeFileSync(logPath('applied'),
      JSON.stringify({ summary, after, header: headerChanges, rows: perRow }, null, 2))
    console.log(JSON.stringify({ summary, after }, null, 2))
    console.log(`\nAPPLIED. Log: ${logPath('applied')}`)
  } finally {
    await db.end()
  }
})().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
