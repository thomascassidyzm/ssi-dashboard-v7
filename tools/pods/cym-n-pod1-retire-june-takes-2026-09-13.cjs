#!/usr/bin/env node
/**
 * cym-n-pod1-retire-june-takes-2026-09-13 — retire the June 2026 takes that
 * cym_n_for_eng pod-1 still serves under Aran's voice id.
 *
 * Tom's ruling (2026-09-13 19:18Z): the 15/16 June rows in human_aran_cym_n /
 * human_aran_cym_n_2 whose text lies in the old pod-0 ∩ pod-1 intersection are
 * his voice or worse than Aran's later recordings — replace them with Aran's
 * later takes (23 Aug / 3 Sep; Catrin 11 Sep where she is the cast female).
 * Rows 43 and 52 (and their splits 70/71) are NOT in the intersection and are
 * left untouched: Tom has not ruled on them. Evidence: job #563 (doc 5574213b)
 * and job #551 (doc 17e82b15).
 *
 * WHY DELETE, NOT REPOINT. Aran's booth decides "recorded" from any course_audio
 * row carrying his voice id for the text, and generate-pods link-only fills only
 * EMPTY slots — so a hand-edited pointer can be undone by the planner, while a
 * deleted row cannot come back. The audit trigger keeps every deleted row in
 * content_audit_log; the S3 objects are never touched; the pod FK is
 * ON DELETE SET NULL, so the slot empties itself.
 *
 * THE FOUR IN-PLACE ROWS. Four June row ids (Bore da Sarah / Dw i'n dda iawn /
 * Noswaith dda Sarah / Un Dau Tri) were re-recorded IN PLACE by Aran on 3 Sep:
 * the recordist upsert hit the (course,text,language,role,voice) key and moved
 * the same row's s3_key to the new bytes. The bytes on those rows are already
 * Aran's 3 Sep take — but the row id (the learner's clip URL, cached immutable
 * for a year and keyed in IndexedDB) never changed and audio_revision was not
 * bumped on 3 Sep, so a phone that cached the June bytes plays June forever.
 * Deleting the row and re-registering the SAME 3 Sep S3 object under a fresh id
 * is what gives the phone a new URL. Nothing is re-rendered and no take is lost.
 *
 * THE SPLIT ARRAYS have no FK (uuid[]), so the deleted ids are stripped here —
 * an emptied array becomes NULL, which the player treats as "play the whole
 * turn" (tools/pods/split-audio-inheritance.cjs). The arrays are then re-cut
 * from the CURRENT whole-turn clip by tools/pods/splice-sentence-clips.cjs,
 * and the four emptied whole-turn slots are refilled by phase8
 * POST /generate-pods/cym_n_for_eng {link_only:true} — the normal path, so the
 * planner and this tool agree.
 *
 *   node tools/pods/cym-n-pod1-retire-june-takes-2026-09-13.cjs            # dry run
 *   node tools/pods/cym-n-pod1-retire-june-takes-2026-09-13.cjs --apply
 *
 * Every before-state is re-asserted inside the transaction; any drift aborts.
 * Log: ~/ssi-evidence/ssi-dashboard-v7/tools/pods/<this>-{dryrun,applied}-log.json
 */
'use strict'
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')
const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs')
const { evidencePath } = require('../lib/evidence-path.cjs')

const APPLY = process.argv.includes('--apply')
const COURSE = 'cym_n_for_eng'
const POD = 'cym_n_for_eng:pod-1'
const SURFACE = 'tools:pods/cym-n-pod1-retire-june-takes-2026-09-13'
const VOICES = ['human_aran_cym_n', 'human_aran_cym_n_2']
const WINDOW = ['2026-06-15', '2026-06-17']
const CANON_VOICE = 'human_aran_cym_n'

// Not in pod-0 ∩ pod-1 — Tom has not ruled on these (#563 rows 43, 52, 70, 71).
const EXCLUDED = new Set([
  '8080c64c-dada-4005-8452-9ad946b86bef', // 43 Prynhawn da. Mae gen i stafell…
  '14d7e64e-7eff-4eec-9532-d7449ed8882a', // 52 Ydi, efo bwyd…
  '30514028-0094-40c6-b836-10530e808cfa', // 70 Prynhawn da.
  '2a7ba1f9-1371-4789-832e-0dc2b77dfb26', // 71 Mae gen i stafell wedi'i bwcio…
])

// June row id → the 3 Sep S3 object it holds today (content_audit_log, verified
// against recording_provenance: recorded_by aran@hey.com, 2026-09-03).
const IN_PLACE = {
  '3c2d90c2-0af7-41d3-bdea-893e0bf57d95': 'mastered/F075B928-2D64-4601-9137-F6C8E79DA76D.mp3', // Bore da, Sarah!
  '215e1c95-2ffe-4eae-8487-bdaaae15a36b': 'mastered/8166E4B4-B6A5-4C9E-AAB3-B4420B32ACB0.mp3', // Dw i'n dda iawn…
  '27e1223f-a157-40ee-a2ee-680c3ae02295': 'mastered/1EE6E169-7956-4D5E-87AB-1FAEF60A87C4.mp3', // Noswaith dda, Sarah…
  '05a3ae65-ddcb-459f-87b4-16340f09b4c1': 'mastered/7F5FEEEC-BC02-4002-A14A-88FCCD60FC83.mp3', // Un. Dau. Tri…
}

const ARRAY_COLS = ['sentence_audio_ids', 'sentence_known_audio_ids', 'takeg_audio_ids']

/** Pure: drop deleted ids from a uuid[]; an emptied (or absent) array is NULL. */
function stripDeletedIds (arr, deleted) {
  if (!Array.isArray(arr)) return null
  const kept = arr.filter((id) => id && !deleted.has(id))
  return kept.length ? kept : null
}

function loadDatabaseUrl () {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  for (const p of [path.join(__dirname, '../../.env.psql'), path.join(process.env.HOME || '', 'SSi/ssi-dashboard-v7-clean/.env.psql')]) {
    if (!fs.existsSync(p)) continue
    const m = fs.readFileSync(p, 'utf8').match(/^DATABASE_URL=(.+)$/m)
    if (m) return m[1].trim().replace(/^["']|["']$/g, '')
  }
  throw new Error('DATABASE_URL not found (.env.psql)')
}

const sameArr = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null)

async function main () {
  const identity = serviceIdentity(SURFACE, { role: 'content-editor' })
  const db = new Client({ connectionString: loadDatabaseUrl() })
  await db.connect()
  const log = { ran: new Date().toISOString(), apply: APPLY, course: COURSE, pod: POD }
  try {
    await db.query('BEGIN')

    // (1) the June Welsh rows under Aran's voice ids
    const { rows: june } = await db.query(
      `SELECT id, voice_id, text, s3_key, duration_ms, file_size_bytes, created_at
         FROM course_audio
        WHERE course_code=$1 AND voice_id = ANY($2) AND language='cym'
          AND created_at >= $3 AND created_at < $4 ORDER BY created_at`, [COURSE, VOICES, WINDOW[0], WINDOW[1]])
    if (june.length !== 50) throw new Error(`expected 50 June Welsh rows, found ${june.length}`)
    for (const id of EXCLUDED) if (!june.some((r) => r.id === id)) throw new Error(`excluded id ${id} not among the June rows`)
    const targets = june.filter((r) => !EXCLUDED.has(r.id))
    if (targets.length !== 46) throw new Error(`expected 46 rows to retire, got ${targets.length}`)
    const deleted = new Set(targets.map((r) => r.id))
    for (const [id, key] of Object.entries(IN_PLACE)) {
      const r = targets.find((x) => x.id === id)
      if (!r) throw new Error(`in-place row ${id} not in the retire set`)
      if (r.s3_key !== key) throw new Error(`in-place row ${id} holds ${r.s3_key}, expected ${key} — drift, aborting`)
      const { rows: prov } = await db.query(
        `SELECT recorded_by, recorded_at FROM recording_provenance WHERE audio_uuid = $1`,
        [key.replace(/^.*\//, '').replace(/\.mp3$/, '')])
      if (!prov.length || prov[0].recorded_by !== 'aran@hey.com' || new Date(prov[0].recorded_at).toISOString().slice(0, 10) !== '2026-09-03') {
        throw new Error(`in-place row ${id}: provenance is not Aran 2026-09-03 (${JSON.stringify(prov)})`)
      }
    }
    log.retired = targets.map((r) => ({ id: r.id, voice_id: r.voice_id, created_at: r.created_at, text: r.text, s3_key: r.s3_key }))

    // (2) every pod row that references a retired id, any column
    const ids = [...deleted]
    const { rows: refs } = await db.query(
      `SELECT id, pod_id, scene_number, sentence_number, target_audio_id, known_audio_id,
              sentence_audio_ids, sentence_known_audio_ids, takeg_audio_ids
         FROM listening_pod_sentences
        WHERE target_audio_id = ANY($1::uuid[]) OR known_audio_id = ANY($1::uuid[])
           OR sentence_audio_ids && $1::uuid[] OR sentence_known_audio_ids && $1::uuid[]
           OR takeg_audio_ids && $1::uuid[]
        ORDER BY pod_id, global_order`, [ids])
    if (refs.some((r) => r.pod_id !== POD)) throw new Error(`a retired row is referenced outside ${POD}: ${JSON.stringify(refs.filter((r) => r.pod_id !== POD).map((r) => r.id))}`)
    if (refs.some((r) => r.known_audio_id && deleted.has(r.known_audio_id))) throw new Error('a retired row serves a KNOWN slot — not expected')
    const wholeTurn = refs.filter((r) => r.target_audio_id && deleted.has(r.target_audio_id))
    const wholeIds = wholeTurn.map((r) => r.target_audio_id).sort()
    if (!sameArr(wholeIds, Object.keys(IN_PLACE).sort())) throw new Error(`whole-turn slots on retired rows are ${wholeIds}, expected exactly the four in-place rows`)
    log.pod_rows_before = refs

    // (3) delete — audit trigger keeps each row; FK SET NULL empties the 4 slots
    const del = await db.query(`DELETE FROM course_audio WHERE id = ANY($1::uuid[]) AND course_code=$2`, [ids, COURSE])
    if (del.rowCount !== 46) throw new Error(`deleted ${del.rowCount}, expected 46`)

    // (4) re-register the four 3 Sep objects under fresh ids (same bytes, new URL)
    log.reregistered = []
    for (const [oldId, key] of Object.entries(IN_PLACE)) {
      const r = targets.find((x) => x.id === oldId)
      const { rows: ins } = await db.query(
        `INSERT INTO course_audio (course_code, text, text_normalized, language, role, voice_id, origin, s3_key, duration_ms, file_size_bytes)
         VALUES ($1,$2,$3,'cym','target1',$4,'human',$5,$6,$7) RETURNING id`,
        [COURSE, r.text, normalizeForAudio(r.text), CANON_VOICE, key, r.duration_ms, r.file_size_bytes])
      log.reregistered.push({ old_id: oldId, new_id: ins[0].id, s3_key: key, text: r.text })
    }

    // (5) strip the retired ids from the split arrays, asserting before-state
    log.arrays = []
    for (const r of refs) {
      const patch = {}
      for (const col of ARRAY_COLS) {
        const after = stripDeletedIds(r[col], deleted)
        if (!sameArr(after, r[col])) patch[col] = after
      }
      if (!Object.keys(patch).length) continue
      const sets = Object.keys(patch).map((c, i) => `${c} = $${i + 2}::uuid[]`).join(', ')
      const guard = ARRAY_COLS.map((c, i) => `${c} IS NOT DISTINCT FROM $${Object.keys(patch).length + 2 + i}::uuid[]`).join(' AND ')
      const up = await db.query(
        `UPDATE listening_pod_sentences SET ${sets} WHERE id = $1 AND ${guard}`,
        [r.id, ...Object.keys(patch).map((c) => patch[c]), ...ARRAY_COLS.map((c) => r[c])])
      if (up.rowCount !== 1) throw new Error(`before-state drift on ${r.id} — aborting`)
      log.arrays.push({ id: r.id, scene: r.scene_number, line: r.sentence_number, before: ARRAY_COLS.reduce((o, c) => (o[c] = r[c], o), {}), after: patch })
    }

    // (6) attribution — one event per operation
    for (const [operation, scope, detail] of [
      ['delete', { rows: ids }, { why: 'June 2026 takes under Aran voice ids, pod-0∩pod-1 intersection (Tom 2026-09-13 19:18Z)', excluded: [...EXCLUDED] }],
      ['insert', { rows: log.reregistered.map((x) => x.new_id) }, { why: 'same 3 Sep Aran bytes re-registered under fresh ids so cached clip URLs roll', pairs: log.reregistered }],
      ['update', { rows: log.arrays.map((x) => x.id) }, { why: 'retired ids stripped from split arrays; emptied arrays NULL (whole-turn fallback) pending re-splice' }],
    ]) {
      await db.query(
        `INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [COURSE, SURFACE, operation, identity.kind, identity.id, identity.label, identity.verified, identity.role, scope, detail])
    }

    // (7) after-state
    const { rows: after } = await db.query(
      `SELECT id, scene_number, sentence_number, target_audio_id, sentence_audio_ids, takeg_audio_ids
         FROM listening_pod_sentences WHERE id = ANY($1) ORDER BY global_order`, [refs.map((r) => r.id)])
    log.pod_rows_after = after

    if (APPLY) { await db.query('COMMIT'); log.result = 'COMMITTED' } else { await db.query('ROLLBACK'); log.result = 'DRY RUN — rolled back' }
  } catch (e) {
    await db.query('ROLLBACK').catch(() => {})
    log.error = e.message
    throw e
  } finally {
    await db.end()
    const out = evidencePath(`tools/pods/cym-n-pod1-retire-june-takes-2026-09-13-${APPLY ? 'applied' : 'dryrun'}-log.json`)
    fs.writeFileSync(out, JSON.stringify(log, null, 2))
    console.log(`${log.result || 'FAILED: ' + log.error}\nretired ${log.retired ? log.retired.length : 0} rows; re-registered ${log.reregistered ? log.reregistered.length : 0}; arrays touched ${log.arrays ? log.arrays.length : 0}\nlog: ${out}`)
  }
}

module.exports = { stripDeletedIds, EXCLUDED, IN_PLACE }
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1) })
