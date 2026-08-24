#!/usr/bin/env node
/**
 * repair-split-array-inheritance.cjs — 2026-08-24
 *
 * THE DEFECT. When a pod is cloned/flipped, `target_audio_id` and
 * `known_audio_id` get re-derived for the new pod, but the SPLIT ARRAYS —
 * `sentence_audio_ids`, `sentence_known_audio_ids`, `takeg_audio_ids` — were
 * copied POSITIONALLY, by (scene_number, sentence_number), from the pod being
 * replaced. When the scene running order changes between the two pods, those
 * arrays now point at a different conversation's clips.
 *
 * ita_for_eng scene 15 is the case Tom heard on 2026-08-24: every row's
 * sentence_audio_ids is byte-identical to the retired pod-0's same slot, and
 * the conversation that was pod-0 scene 15 is now pod-1 scene 22. The learner
 * hears the wrong conversation, in pod-0's cast female (Eve) against pod-1's
 * (Ara) — and, because podSentenceSplit takes the on-screen text from the
 * clip's own course_audio.text, READS the wrong conversation too.
 *
 * THE REPAIR. Null the offending arrays. `podSentenceSplit.splitRowUnits`
 * falls back to the whole-turn clip when a row has fewer than 2 split clips,
 * and the whole-turn clips are verified correct in BOTH text and casting on
 * every row of the pod — that is the precondition this tool enforces before it
 * writes anything (see assertWholeTurnClean). No audio is rendered, no clip is
 * deleted, no pointer moves to a different clip: a broken join is removed so
 * the canonical clip plays.
 *
 * The cost is the per-sentence split experience on the repaired rows. That is
 * recoverable later by re-pointing to voice-correct split clips where they
 * exist; it is deliberately NOT done here, because a wrong-but-split course is
 * worse than a right-but-unsplit one and Tom is waiting.
 *
 * PROGRESS SAFETY. learner_pod_state is keyed by `sentence_id`: `<row.id>` for
 * an unsplit row, `<row.id>:s<k>` for split units. Nulling therefore changes
 * the key for rows that were split. The tool refuses to run if any
 * split-keyed progress row exists for the course, so it can only ever be used
 * where the change is invisible to learners (ita_for_eng: 0 such rows).
 *
 * EVERY ROW IS SNAPSHOTTED to the log before it is touched, so the write is
 * reversible from the log alone.
 *
 * Usage:
 *   node tools/pods/repair-split-array-inheritance.cjs <pod_id>          # DRY RUN
 *   node tools/pods/repair-split-array-inheritance.cjs <pod_id> --apply  # writes
 */

'use strict'

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const POD = process.argv[2]
const APPLY = process.argv.includes('--apply')
// Collapsing a split row changes its progress key from `<row.id>:s<k>` back to
// `<row.id>`, so those rows must go in the SAME transaction as the content
// change (pod-migration-protocol.md rule 8). Dropping them is what the protocol
// already prescribes: rule 5, a removed sentence drops with no penalty, and
// rule 6, anything that changed at all counts as new rather than surviving —
// doubt resolves to unheard. It cannot send anyone backwards: `exposures` floors
// on the derived main-flow value (see tools/pods/pod-state-migrate.cjs). The
// exposures being dropped were accrued against the WRONG conversation's text
// anyway. Every deleted row is snapshotted into the log first.
const MIGRATE = process.argv.includes('--migrate-split-progress')
if (!POD) {
  console.error('usage: repair-split-array-inheritance.cjs <pod_id> [--apply]')
  process.exit(2)
}

const REPO = path.resolve(__dirname, '../..')
const envText = fs.readFileSync(path.join(REPO, '.env.psql'), 'utf8')
const DATABASE_URL = (envText.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/) || [])[1]
if (!DATABASE_URL) throw new Error('no DATABASE_URL in .env.psql')

const norm = (s) => (s || '')
  .toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/\[pause\]/g, ' ').replace(/[…]/g, ' ')
  .replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim()

// A voice id appears both bare and provider-prefixed, in the SAME course and
// sometimes on the same track: `ara` / `xai_ara`, `es-ES-ElviraNeural` /
// `azure_es-ES-ElviraNeural`. The pod's cast map stores one form and
// course_audio often stores the other, so both prefixes must come off before
// any comparison. Stripping only `xai_` made the whole-turn cast gate below
// reject 155 correct Spanish clips, 234 Mexican and 138 Irish as "off-cast" —
// the gate refusing to write on a comparison it could not actually make, which
// is the behaviour we want, but for the wrong reason.
const bare = (v) => (v || '').replace(/^(xai_|azure_)/, '')

const SLOTS = [
  { field: 'sentence_audio_ids', side: 'target' },
  { field: 'sentence_known_audio_ids', side: 'known' },
  { field: 'takeg_audio_ids', side: 'target' },
]

async function main () {
  const db = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()

  const podRow = (await db.query('select course_code, visibility, speakers from listening_pods where id=$1', [POD])).rows[0]
  if (!podRow) throw new Error(`no such pod: ${POD}`)
  const courseCode = podRow.course_code

  // Cast, as the pod itself declares it.
  const cast = { target: new Set(), known: new Set() }
  for (const entry of Object.values(podRow.speakers || {})) {
    for (const side of ['target', 'known']) {
      const v = entry?.[side]?.voice_id
      if (v) cast[side].add(bare(v))
    }
  }
  if (!cast.target.size || !cast.known.size) throw new Error('pod has no usable cast map')

  // GATE 1 — progress safety.
  const prog = (await db.query(
    "select count(*) filter (where sentence_id like '%:s%') split_keyed from learner_pod_state where course_code=$1",
    [courseCode])).rows[0]
  const splitKeyed = Number(prog.split_keyed)
  if (splitKeyed > 0 && !MIGRATE) {
    throw new Error(`${splitKeyed} split-keyed learner_pod_state rows exist for ${courseCode} — ` +
      'nulling would orphan learner progress. Re-run with --migrate-split-progress to drop them ' +
      'under pod-migration-protocol.md rules 5/6/8 (snapshotted to the log, reversible), or run ' +
      'the migration in that document first.')
  }

  const rows = (await db.query(
    `select id, scene_number, sentence_number, speaker, target_text, known_text,
            target_audio_id, known_audio_id,
            sentence_audio_ids, sentence_known_audio_ids, takeg_audio_ids
       from listening_pod_sentences where pod_id=$1
      order by scene_number, sentence_number`, [POD])).rows

  const ids = new Set()
  for (const r of rows) {
    if (r.target_audio_id) ids.add(r.target_audio_id)
    if (r.known_audio_id) ids.add(r.known_audio_id)
    for (const { field } of SLOTS) for (const i of (r[field] || [])) if (i) ids.add(i)
  }
  const clips = {}
  if (ids.size) {
    const q = await db.query('select id, text, voice_id from course_audio where id = any($1)', [[...ids]])
    for (const c of q.rows) clips[c.id] = { text: c.text, v: bare(c.voice_id) }
  }

  // GATE 2 — the fallback must be correct on EVERY row, or nulling is not a repair.
  const wholeTurnFailures = []
  const badRows = new Set()
  for (const r of rows) {
    for (const [idField, textField, side] of [
      ['target_audio_id', 'target_text', 'target'],
      ['known_audio_id', 'known_text', 'known'],
    ]) {
      const clip = clips[r[idField]]
      if (!clip) continue // a missing whole-turn clip is a different defect; leave it alone
      if (norm(clip.text) !== norm(r[textField])) {
        wholeTurnFailures.push(`s${r.scene_number}/${r.sentence_number} ${idField} text mismatch`)
        badRows.add(r.id)
      }
      if (!cast[side].has(clip.v)) {
        wholeTurnFailures.push(`s${r.scene_number}/${r.sentence_number} ${idField} off-cast voice ${clip.v}`)
        badRows.add(r.id)
      }
    }
  }
  // A row whose OWN whole-turn clip is wrong cannot be repaired by falling back
  // to it — that would trade wrong-split for wrong-whole-turn. Such rows are
  // EXCLUDED from the plan and reported, rather than aborting the whole pod:
  // spa_for_eng has 6 and spa_mx_for_eng 4, all of them gendered-speech
  // mismatches (row text "no estoy segura", clip says "seguro") which are a
  // separate, already-tracked defect needing a re-render. Refusing the whole
  // pod over them would leave 225 genuinely repairable rows broken and live.
  //
  // A large proportion still aborts: that means the pod's canon is wrong in
  // some systemic way this tool has no business writing over.
  const SYSTEMIC_FRACTION = 0.2
  if (badRows.size > rows.length * SYSTEMIC_FRACTION) {
    throw new Error(`${badRows.size} of ${rows.length} rows have a wrong whole-turn clip ` +
      `(> ${SYSTEMIC_FRACTION * 100}%) — the pod's canon is systemically wrong, not patchable here.\n  ` +
      wholeTurnFailures.slice(0, 10).join('\n  '))
  }

  // Classify each slot on each row.
  const plan = []
  for (const r of rows) {
    if (badRows.has(r.id)) continue // its own fallback is wrong — see above
    const clear = []
    const why = []
    for (const { field, side } of SLOTS) {
      const arr = (r[field] || []).filter(Boolean)
      if (!arr.length) continue
      const texts = arr.map((i) => clips[i]?.text || '')
      const voices = [...new Set(arr.map((i) => clips[i]?.v).filter(Boolean))]
      const offcast = voices.filter((v) => !cast[side].has(v))
      const want = norm(side === 'target' ? r.target_text : r.known_text)
      const joined = norm(texts.join(' '))
      const contained = texts.every((t) => norm(t) && want.includes(norm(t)))
      const textOk = joined === want || contained
      const missing = arr.filter((i) => !clips[i])
      if (!textOk) { clear.push(field); why.push(`${field}: text does not belong to this sentence`) }
      else if (offcast.length) { clear.push(field); why.push(`${field}: off-cast voice ${offcast.join('/')}`) }
      else if (missing.length) { clear.push(field); why.push(`${field}: ${missing.length} dangling clip id(s)`) }
    }
    if (clear.length) {
      plan.push({
        id: r.id,
        scene: r.scene_number,
        sentence: r.sentence_number,
        speaker: r.speaker,
        target_text: r.target_text,
        clear,
        why,
        before: Object.fromEntries(SLOTS.map(({ field }) => [field, r[field] || null])),
      })
    }
  }

  const byScene = {}
  for (const p of plan) byScene[p.scene] = (byScene[p.scene] || 0) + 1

  console.log(`pod ${POD} (${courseCode}, ${podRow.visibility})`)
  console.log(`cast target=[${[...cast.target]}] known=[${[...cast.known]}]`)
  console.log(`rows ${rows.length}, rows needing repair ${plan.length}`)
  console.log(`whole-turn clips verified correct on ${rows.length - badRows.size}/${rows.length} rows — ` +
    'fallback is safe on those; the rest are skipped below')
  console.log(`split-keyed progress rows: 0 — nulling orphans nothing`)
  console.log('rows to repair by scene:', JSON.stringify(byScene))
  if (badRows.size) {
    console.log(`\nSKIPPED ${badRows.size} row(s) whose OWN whole-turn clip is wrong — not repairable by`)
    console.log('fallback; these need their audio re-rendered (Tom\'s trigger), listed in the log:')
    for (const f of wholeTurnFailures) console.log(`  ${f}`)
  }

  const stamp = new Date().toISOString().slice(0, 10)
  const logPath = path.join(REPO, 'docs/pods',
    `${courseCode}-split-array-repair-${stamp}-${APPLY ? 'applied' : 'dryrun'}-log.json`)

  let written = 0
  let progressDropped = []
  if (APPLY) {
    await db.query('BEGIN')
    if (splitKeyed > 0) {
      // Snapshot BEFORE deleting, so the log alone can restore them.
      progressDropped = (await db.query(
        `select learner_id, course_code, sentence_id, exposures, updated_at
           from learner_pod_state where course_code=$1 and sentence_id like '%:s%'`,
        [courseCode])).rows
      await db.query(
        "delete from learner_pod_state where course_code=$1 and sentence_id like '%:s%'",
        [courseCode])
    }
    for (const p of plan) {
      // Per-row before-state assertion: abort on drift rather than write over
      // something that changed since the plan was computed.
      const live = (await db.query(
        `select sentence_audio_ids, sentence_known_audio_ids, takeg_audio_ids
           from listening_pod_sentences where id=$1`, [p.id])).rows[0]
      if (!live) throw new Error(`row vanished mid-run: ${p.id}`)
      for (const { field } of SLOTS) {
        const now = JSON.stringify(live[field] || null)
        const then = JSON.stringify(p.before[field])
        if (now !== then) throw new Error(`DRIFT on ${p.id} ${field} — aborting, nothing further written`)
      }
      const sets = p.clear.map((f, i) => `${f} = $${i + 2}`).join(', ')
      await db.query(
        `update listening_pod_sentences set ${sets}, updated_at = now() where id = $1`,
        [p.id, ...p.clear.map(() => null)])
      written++
    }
    await db.query('COMMIT')
  }

  fs.writeFileSync(logPath, JSON.stringify({
    pod: POD,
    course: courseCode,
    mode: APPLY ? 'applied' : 'dryrun',
    generated_at: new Date().toISOString(),
    rows_total: rows.length,
    rows_repaired: APPLY ? written : plan.length,
    cast: { target: [...cast.target], known: [...cast.known] },
    by_scene: byScene,
    skipped_rows_needing_rerender: wholeTurnFailures,
    split_keyed_progress_dropped: progressDropped,
    rows: plan,
  }, null, 1))

  console.log(`${APPLY ? `APPLIED — ${written} rows updated` : 'DRY RUN — nothing written'}`)
  if (progressDropped.length) {
    console.log(`dropped ${progressDropped.length} split-keyed progress row(s) in the same ` +
      'transaction, snapshotted in the log')
  }
  console.log(`log: ${logPath}`)
  await db.end()
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
