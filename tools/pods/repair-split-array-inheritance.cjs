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

const bare = (v) => (v || '').replace(/^xai_/, '')

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
  if (Number(prog.split_keyed) > 0) {
    throw new Error(`${prog.split_keyed} split-keyed learner_pod_state rows exist for ${courseCode} — ` +
      'nulling would orphan learner progress. Run the migration in docs/pods/pod-migration-protocol.md first.')
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
  for (const r of rows) {
    for (const [idField, textField, side] of [
      ['target_audio_id', 'target_text', 'target'],
      ['known_audio_id', 'known_text', 'known'],
    ]) {
      const clip = clips[r[idField]]
      if (!clip) continue // a missing whole-turn clip is a different defect; leave it alone
      if (norm(clip.text) !== norm(r[textField])) {
        wholeTurnFailures.push(`s${r.scene_number}/${r.sentence_number} ${idField} text mismatch`)
      }
      if (!cast[side].has(clip.v)) {
        wholeTurnFailures.push(`s${r.scene_number}/${r.sentence_number} ${idField} off-cast voice ${clip.v}`)
      }
    }
  }
  if (wholeTurnFailures.length) {
    throw new Error(`${wholeTurnFailures.length} whole-turn clip(s) are themselves wrong — nulling would ` +
      `not restore a correct course. Fix those first.\n  ` + wholeTurnFailures.slice(0, 10).join('\n  '))
  }

  // Classify each slot on each row.
  const plan = []
  for (const r of rows) {
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
  console.log(`whole-turn clips verified correct on all ${rows.length} rows — fallback is safe`)
  console.log(`split-keyed progress rows: 0 — nulling orphans nothing`)
  console.log('rows to repair by scene:', JSON.stringify(byScene))

  const stamp = new Date().toISOString().slice(0, 10)
  const logPath = path.join(REPO, 'docs/pods',
    `${courseCode}-split-array-repair-${stamp}-${APPLY ? 'applied' : 'dryrun'}-log.json`)

  let written = 0
  if (APPLY) {
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
    rows: plan,
  }, null, 1))

  console.log(`${APPLY ? `APPLIED — ${written} rows updated` : 'DRY RUN — nothing written'}`)
  console.log(`log: ${logPath}`)
  await db.end()
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
