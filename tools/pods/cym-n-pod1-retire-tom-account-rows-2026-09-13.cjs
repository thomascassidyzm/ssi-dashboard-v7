#!/usr/bin/env node
/**
 * cym-n-pod1-retire-tom-account-rows-2026-09-13 — part 2 of the June retire (job #568).
 *
 * Tom's steer after the first pass (2026-09-13): NO take in Tom's voice may be served in any
 * pod-1 slot or sentence-array entry; the uploading account is the default prior for the speaker
 * (Tom-account June rows are Tom). That reclassifies the four rows the first pass was told to
 * leave alone: 43 and 52 (recording_provenance recorded_by thomas.cassidy+ssi@gmail.com,
 * 15 June) and their 16 June splits 70/71 (cut from row 43's bytes, no provenance).
 * Row 52 serves pod-1 s12 l8 today; 70/71 are s11 l1's split pieces. An unlinked Aran-account
 * take of s12 l8's exact text exists (a70756ca, 10 Sep) and s11 l1's whole turn is Aran 3 Sep,
 * so after the delete: phase8 link-only refills s12 l8, splice-sentence-clips re-cuts s11 l1.
 *
 *   node tools/pods/cym-n-pod1-retire-tom-account-rows-2026-09-13.cjs [--apply]
 */
'use strict'
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')
const { evidencePath } = require('../lib/evidence-path.cjs')
const { stripDeletedIds } = require('./cym-n-pod1-retire-june-takes-2026-09-13.cjs')

const APPLY = process.argv.includes('--apply')
const COURSE = 'cym_n_for_eng'
const POD = 'cym_n_for_eng:pod-1'
const SURFACE = 'tools:pods/cym-n-pod1-retire-tom-account-rows-2026-09-13'
const TOM = 'thomas.cassidy+ssi@gmail.com'
const ROWS = {
  '8080c64c-dada-4005-8452-9ad946b86bef': { n: 43, prov: TOM },  // Prynhawn da. Mae gen i stafell… (unlinked)
  '14d7e64e-7eff-4eec-9532-d7449ed8882a': { n: 52, prov: TOM },  // Ydi, efo bwyd… — serves s12 l8
  '2a7ba1f9-1371-4789-832e-0dc2b77dfb26': { n: 71, prov: null }, // Mae gen i stafell wedi'i bwcio… — s11 l1 split
}
// Row 70 ("Prynhawn da.", 16 June split of row 43, no provenance) ALSO serves two lines of the
// released Senedd pod (s1 l1, s9 l47). That pod is outside this steer and deleting the row would
// leave those lines silent (#551 called it make-before-break), so it is NOT deleted: it is only
// stripped from pod-1's s11 l1 array and reported for a Senedd decision.
const STRIP_ONLY = '30514028-0094-40c6-b836-10530e808cfa'
const ARRAY_COLS = ['sentence_audio_ids', 'sentence_known_audio_ids', 'takeg_audio_ids']
const sameArr = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null)

function loadDatabaseUrl () {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const p = path.join(__dirname, '../../.env.psql')
  const m = fs.readFileSync(p, 'utf8').match(/^DATABASE_URL=(.+)$/m)
  return m[1].trim().replace(/^["']|["']$/g, '')
}

async function main () {
  const identity = serviceIdentity(SURFACE, { role: 'content-editor' })
  const db = new Client({ connectionString: loadDatabaseUrl() })
  await db.connect()
  const ids = Object.keys(ROWS)
  const deleted = new Set(ids)
  const strip = new Set([...ids, STRIP_ONLY])
  const log = { ran: new Date().toISOString(), apply: APPLY }
  try {
    await db.query('BEGIN')
    const { rows } = await db.query(
      `SELECT c.id, c.voice_id, c.text, c.s3_key, c.created_at, p.recorded_by
         FROM course_audio c LEFT JOIN recording_provenance p
           ON p.audio_uuid = regexp_replace(regexp_replace(c.s3_key,'^.*/',''),'\\.mp3$','')
        WHERE c.course_code=$1 AND c.id = ANY($2::uuid[])`, [COURSE, ids])
    if (rows.length !== 3) throw new Error(`expected 3 rows, found ${rows.length}`)
    for (const r of rows) {
      const want = ROWS[r.id]
      if (r.voice_id !== 'human_aran_cym_n_2') throw new Error(`${want.n}: voice is ${r.voice_id}`)
      if (String(r.created_at).slice(0, 7) !== '2026-06' && new Date(r.created_at).toISOString().slice(0, 7) !== '2026-06') throw new Error(`${want.n}: not a June row`)
      if ((r.recorded_by || null) !== want.prov) throw new Error(`${want.n}: provenance ${r.recorded_by}, expected ${want.prov}`)
    }
    log.retired = rows
    const { rows: refs } = await db.query(
      `SELECT id, pod_id, scene_number, sentence_number, target_audio_id, known_audio_id, sentence_audio_ids, sentence_known_audio_ids, takeg_audio_ids
         FROM listening_pod_sentences
        WHERE target_audio_id = ANY($1::uuid[]) OR known_audio_id = ANY($1::uuid[]) OR sentence_audio_ids && $1::uuid[]
           OR sentence_known_audio_ids && $1::uuid[] OR takeg_audio_ids && $1::uuid[] ORDER BY pod_id, global_order`, [[...strip]])
    const outside = refs.filter((r) => r.pod_id !== POD)
    // Only row 70 may be referenced outside pod-1, and only as a whole-turn slot on the Senedd pod.
    if (outside.some((r) => !(r.target_audio_id === STRIP_ONLY && r.pod_id === 'cym_n_for_eng:senedd-s4c-steve'))) throw new Error(`unexpected outside reference: ${JSON.stringify(outside.map((r) => r.id))}`)
    log.senedd_kept = outside.map((r) => r.id)
    const podRefs = refs.filter((r) => r.pod_id === POD)
    const targets = podRefs.filter((r) => r.target_audio_id && deleted.has(r.target_audio_id)).map((r) => `${r.scene_number}/${r.sentence_number}`)
    if (!sameArr(targets, ['12/8'])) throw new Error(`whole-turn slots on these rows: ${targets}, expected only 12/8`)
    log.pod_rows_before = podRefs

    const del = await db.query(`DELETE FROM course_audio WHERE id = ANY($1::uuid[]) AND course_code=$2`, [ids, COURSE])
    if (del.rowCount !== 3) throw new Error(`deleted ${del.rowCount}`)

    log.arrays = []
    for (const r of podRefs) {
      const patch = {}
      for (const col of ARRAY_COLS) { const a = stripDeletedIds(r[col], strip); if (!sameArr(a, r[col])) patch[col] = a }
      if (!Object.keys(patch).length) continue
      const cols = Object.keys(patch)
      const sets = cols.map((c, i) => `${c} = $${i + 2}::uuid[]`).join(', ')
      const guard = ARRAY_COLS.map((c, i) => `${c} IS NOT DISTINCT FROM $${cols.length + 2 + i}::uuid[]`).join(' AND ')
      const up = await db.query(`UPDATE listening_pod_sentences SET ${sets} WHERE id = $1 AND ${guard}`, [r.id, ...cols.map((c) => patch[c]), ...ARRAY_COLS.map((c) => r[c])])
      if (up.rowCount !== 1) throw new Error(`drift on ${r.id}`)
      log.arrays.push({ id: r.id, before: r.sentence_audio_ids, after: patch })
    }
    for (const [operation, scope, detail] of [
      ['delete', { rows: ids }, { why: "Tom-account June rows 43/52 and split 71 (70 kept: serves Senedd) — Tom's steer 2026-09-13: no take in Tom's voice may be served; account is the speaker prior" }],
      ['update', { rows: log.arrays.map((x) => x.id) }, { why: 'retired ids stripped from split arrays; emptied → NULL pending re-splice' }],
    ]) {
      await db.query(
        `INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [COURSE, SURFACE, operation, identity.kind, identity.id, identity.label, identity.verified, identity.role, scope, detail])
    }
    if (APPLY) { await db.query('COMMIT'); log.result = 'COMMITTED' } else { await db.query('ROLLBACK'); log.result = 'DRY RUN — rolled back' }
  } catch (e) {
    await db.query('ROLLBACK').catch(() => {}); log.error = e.message; throw e
  } finally {
    await db.end()
    const out = evidencePath(`tools/pods/cym-n-pod1-retire-tom-account-rows-2026-09-13-${APPLY ? 'applied' : 'dryrun'}-log.json`)
    fs.writeFileSync(out, JSON.stringify(log, null, 2))
    console.log(`${log.result || 'FAILED: ' + log.error}; arrays touched ${(log.arrays || []).length}; log ${out}`)
  }
}
main().catch((e) => { console.error(e.message); process.exit(1) })
