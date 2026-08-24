#!/usr/bin/env node
/**
 * repair-incoherent-takeg-entries.cjs — 2026-08-24
 *
 * ONE ENTRY, NOT ONE SLOT. `takeg_audio_ids` is a uuid[] ALIGNED POSITIONALLY
 * to a row's glued sentence groups (tools/render-take-g.cjs): entry k is group
 * k's gapped take, and a single-unit group keeps `null`. So when one entry is
 * wrong, the repair is to null THAT ENTRY IN PLACE — never to shorten the
 * array, never to reorder it. Shortening or reordering re-aligns every later
 * group onto the wrong take, which is a worse defect than the one being fixed.
 *
 * WHAT IS WRONG, AND WHAT IS NOT. The detector is `checkPodClips` from
 * pod-cast-gate.cjs — the same walk that found the row — and only its
 * ENTRY-LEVEL verdicts count: an entry whose clip text is not part of this
 * row's text (`wrong-row`), or appears out of order in it (`incoherent` with an
 * `audio_id`). A coverage verdict has no `audio_id`, names no entry, and is
 * ignored here.
 *
 * THE CASE THIS WAS BUILT FOR — eus_for_eng pod-1 scene 4 sentence 2:
 *
 *   row    "Kaixo! Barkatu, baina orain ezin dut hitz egin. Orain etxera joan
 *           behar dut. Bihar hitz egin dezakegu?"
 *   take 1 "Kaixo! Barkatu, baina orain ezin dut hitz egin."          <- group 1, correct
 *   take 2 "orain ezin dut hitz egin. Orain, etxera joan behar dut."  <- group 2, WRONG
 *   take 3  null                                                     <- group 3, single unit
 *
 * Entry 2 is a 2026-07-07 render that leaked the tail of group 1 into the front
 * of group 2; the group-2 take should be "Orain, etxera joan behar dut." alone.
 * The array is NOT back to front — entry 1 is genuinely the first group — and
 * SWAPPING THE TWO LEAVES THE GATE RED, because the overlap, not the order, is
 * the defect (there is a unit test pinning exactly that). Every other multi-take
 * row on the pod tiles its row in order with no overlap; this is the only one.
 *
 * WHY NULL RATHER THAN RE-POINT. The only alive alternative is the plain
 * per-sentence clip "Orain etxera joan behar dut." — which is not a Take G: it
 * carries no seam gaps, so the slicer would measure no spans from it. Take G's
 * own contract already makes `null` the correct value for a group with no
 * gapped take ("single-unit groups keep null; their unit IS the real sentence
 * take"), so nulling puts the slot back inside its own spec. Rendering a correct
 * take is TTS spend and needs Tom's approval; it is deliberately not done here.
 *
 * PROGRESS IS NOT AT RISK. A learner's split-unit key `<row.id>:s<k>` is derived
 * from `sentence_audio_ids` alone (`splitRowUnits`, player-vue
 * podSentenceSplit.ts — `takeg_audio_ids` is not read there at all), so a takeg
 * entry cannot move a key. The count is still measured and reported, because a
 * number you have looked at is worth more than an assumption.
 *
 * SAFETY: dry run by default; the whole-turn clip on the row must be correct in
 * text and in its speaker's cast voice before anything is nulled; the UPDATE
 * asserts the exact array it read, so a concurrent writer aborts the run; every
 * before-value is snapshotted to a log under docs/pods/. No clip is deleted —
 * nulling a link never removes a course_audio row.
 *
 *   node tools/pods/repair-incoherent-takeg-entries.cjs --pod=eus_for_eng:pod-1
 *   node tools/pods/repair-incoherent-takeg-entries.cjs --pod=eus_for_eng:pod-1 --scene=4 --sentence=2 --apply
 */
'use strict'

const fs = require('fs')
const path = require('path')

const { checkPodClips } = require('./pod-cast-gate.cjs')
const { verifyWholeTurn } = require('./repair-residual-inherited-split-slots.cjs')

const FIELD = 'takeg_audio_ids'

/**
 * The entry-level plan for a set of rows. Pure: rows + clips + cast in,
 * decisions out.
 *
 * @returns {{plan:Array<{id,scene,sentence,speaker,target_text,before,after,entries}>, badRows:string[], wholeTurnFailures:string[]}}
 */
function planTakegEntries ({ rows, clips, speakers }) {
  const { badRows, failures: wholeTurnFailures } = verifyWholeTurn(rows, clips, speakers)
  const plan = []
  for (const row of rows || []) {
    const before = Array.isArray(row[FIELD]) ? row[FIELD] : null
    if (!before || !before.filter(Boolean).length) continue
    if (badRows.has(row.id)) continue // its own fallback is wrong — not repairable here

    const { clipIssues } = checkPodClips({ rows: [row], speakers, clips })
    const bad = new Set(clipIssues
      .filter(i => i.slot === FIELD && (i.kind === 'wrong-row' || i.kind === 'incoherent') && i.audio_id)
      .map(i => i.audio_id))
    if (!bad.size) continue

    // Same length, same positions — only the offending entries become null.
    const after = before.map(id => (id && bad.has(id) ? null : id))
    plan.push({
      id: row.id,
      scene: row.scene_number,
      sentence: row.sentence_number,
      speaker: row.speaker,
      target_text: row.target_text,
      before,
      after,
      entries: before
        .map((id, i) => ({ index: i, audio_id: id, text: id && clips[id] ? clips[id].text : null, cleared: !!(id && bad.has(id)) }))
        .filter(e => e.cleared),
    })
  }
  return { plan, badRows: [...badRows], wholeTurnFailures }
}

module.exports = { FIELD, planTakegEntries }

/* ------------------------------------------------------------------ runner */

if (require.main === module) main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })

async function main () {
  const { Client } = require('pg')
  const { loadClipsForRows } = require('./pod-cast-gate.cjs')
  const REPO = path.resolve(__dirname, '../..')
  const APPLY = process.argv.includes('--apply')
  const arg = (n) => {
    const a = process.argv.find((x) => x.startsWith(`--${n}=`))
    return a ? a.split('=').slice(1).join('=') : null
  }
  const POD = arg('pod')
  const SCENE = arg('scene')
  const SENTENCE = arg('sentence')
  if (!POD) {
    console.error('usage: repair-incoherent-takeg-entries.cjs --pod=<pod_id> [--scene=N --sentence=M] [--apply]')
    process.exit(2)
  }

  const envText = fs.readFileSync(path.join(REPO, '.env.psql'), 'utf8')
  const DATABASE_URL = (envText.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/) || [])[1]
  const db = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()

  const pod = (await db.query('select id, course_code, visibility, speakers from listening_pods where id = $1', [POD])).rows[0]
  if (!pod) throw new Error(`no such pod: ${POD}`)

  const rows = (await db.query(
    `select id, scene_number, sentence_number, global_order, speaker, target_text, known_text,
            target_audio_id, known_audio_id, sentence_audio_ids, sentence_known_audio_ids,
            takeg_audio_ids
       from listening_pod_sentences where pod_id = $1
      order by global_order, scene_number, sentence_number`, [POD])).rows
  const clips = await loadClipsForRows(db, rows)

  const scoped = rows.filter(r =>
    (SCENE == null || String(r.scene_number) === String(SCENE)) &&
    (SENTENCE == null || String(r.sentence_number) === String(SENTENCE)))
  if (!scoped.length) throw new Error('no rows matched the scene/sentence filter')

  const { plan, badRows, wholeTurnFailures } = planTakegEntries({ rows: scoped, clips, speakers: pod.speakers })

  // Measured, not assumed: takeg is not part of the split-unit progress key.
  const splitKeyed = Number((await db.query(
    "select count(*) n from learner_pod_state where course_code = $1 and sentence_id like '%:s%'",
    [pod.course_code])).rows[0].n)

  console.log(`pod ${POD} (${pod.course_code}, ${pod.visibility}) — ${scoped.length} row(s) in scope`)
  console.log(`split-keyed learner_pod_state rows for the course: ${splitKeyed} ` +
    '(takeg entries do not participate in the split-unit key — splitRowUnits reads sentence_audio_ids)')
  for (const p of plan) {
    console.log(`\ns${p.scene}/${p.sentence} ${p.speaker}`)
    console.log(`  ROW    ${JSON.stringify(p.target_text)}`)
    console.log(`  BEFORE ${JSON.stringify(p.before)}`)
    for (const e of p.entries) console.log(`  CLEAR  entry ${e.index + 1}: ${JSON.stringify(e.text)}`)
    console.log(`  AFTER  ${JSON.stringify(p.after)}`)
  }
  if (!plan.length) console.log('\nnothing to repair — every takeg entry belongs to its own row, in order')

  let written = 0
  if (APPLY && plan.length) {
    await db.query('BEGIN')
    try {
      for (const p of plan) {
        const res = await db.query(
          `update listening_pod_sentences set ${FIELD} = $3, updated_at = now()
            where id = $1 and ${FIELD} is not distinct from $2 returning id`,
          [p.id, p.before, p.after])
        if (res.rowCount !== 1) throw new Error(`DRIFT on ${p.id} — aborting, nothing written`)
        written++
      }
      await db.query('COMMIT')
    } catch (e) {
      await db.query('ROLLBACK')
      throw e
    }
  }

  // Re-verify from the database, not from the plan: read the rows back and walk
  // them through the same gate.
  let after = null
  if (APPLY && written) {
    const reread = (await db.query(
      `select id, scene_number, sentence_number, speaker, target_text, known_text, takeg_audio_ids
         from listening_pod_sentences where id = any($1)`, [plan.map(p => p.id)])).rows
    const reclips = await loadClipsForRows(db, reread)
    const res = checkPodClips({ rows: reread, speakers: pod.speakers, clips: { ...clips, ...reclips } })
    after = res.clipIssues.filter(i => i.slot === FIELD)
    console.log(`\nre-verified from the DB: ${after.length} takeg issue(s) remain on the repaired row(s)`)
  }

  const stamp = new Date().toISOString().slice(0, 10)
  const logPath = path.join(REPO, 'docs/pods',
    `${pod.course_code}-takeg-entry-repair-${stamp}-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(logPath, JSON.stringify({
    pod: POD,
    course: pod.course_code,
    mode: APPLY ? 'applied' : 'dryrun',
    generated_at: new Date().toISOString(),
    scope: { scene: SCENE, sentence: SENTENCE },
    split_keyed_progress_rows: splitKeyed,
    whole_turn_failures: wholeTurnFailures,
    rows_excluded_bad_whole_turn: badRows,
    rows_planned: plan.length,
    rows_written: written,
    post_apply_takeg_issues: after,
    rows: plan,
  }, null, 1))
  console.log(`${APPLY ? `APPLIED — ${written} row(s) updated` : 'DRY RUN — nothing written'}`)
  console.log(`log: ${logPath}`)
  await db.end()
}
