#!/usr/bin/env node
/**
 * pod-state-migrate.cjs — A-107. Map learner pod progress across a pod content change.
 *
 * THE PROBLEM. `learner_pod_state.sentence_id` is `listening_pod_sentences.id`, which is
 * a SLOT key: `<course>:<slug>:SC<scene>-S<sentence>` (+ `:s<n>` for a June-split unit).
 * When a pod's content is replaced, the slot key survives while the sentence sitting in
 * it changes. Nothing orphans — the learner is silently credited with a sentence they
 * have never heard, at whatever maturity rung they reached on the old one, so the new
 * sentence is served late and rarely and is effectively never taught.
 *
 * THE RULE (Tom, 2026-08-14). Match by CONTENT, never by position — but a content match
 * only counts if the sentence sits at APPROXIMATELY THE SAME LOCATION in the sequence.
 * Same text at a wildly different ladder position is not a match; it is a different
 * pedagogical event. The bound is two-part and empirically derived — see POSITION_BOUND.
 *
 * RESTATED BY TOM, 2026-09-02, and this is the invariant any refactor MUST PRESERVE:
 * "the same, or close to the same sentence, if it's close to the same position in the
 * sequence — else revert to the most logical position before that."
 *
 * BOTH CONDITIONS OR NEITHER. Text similarity alone is not a match (the same line at a
 * very different point in the walk is a different pedagogical event) and positional
 * proximity alone is not a match (a nearby slot holding different content is not the
 * learner's position). That is `resolve()` below: text first, then corresponded scene,
 * then within-scene shift. Do not let a refactor simplify it into a slot map — a slot
 * map IS the mis-credit this file exists to prevent.
 *
 * THE ASYMMETRY IS THE WHOLE RULE. Where the match cannot be made, the learner degrades
 * BACKWARDS — here, the state row drops and the sentence is unseen again. Never forwards.
 * Sending someone back costs them repetition of material they have already met, which the
 * estate's own doctrine says is not a punishment. Sending them FORWARD drops them into
 * material whose prerequisites they have never met, and it is invisible: they read it as
 * their own inability, not as a migration bug. So: never round up, never split the
 * difference, never advance on a partial match. Proved in
 * tools/pods/pod-state-migrate-position.test.cjs, which fails against a slot map.
 *
 * ONE PLACE STILL ROUNDS UP, and it is flagged rather than changed: when two old rows
 * collapse onto one new slot, the merge below keeps `Math.max` of their exposures. Under
 * the asymmetry the safe choice is `min` — a learner part-way through both halves of a
 * merged line is not mature on the whole of it. Changing it moves real learners'
 * scheduling, so it is Tom's call, logged in docs/pods/pod-doors-closed-2026-09-02.md.
 *
 *   surviving sentence  -> keeps its exposures, moved onto its new slot key
 *   genuinely new       -> arrives unseen (no row is written; absence IS unseen)
 *   removed sentence    -> its row drops, with no penalty
 *   changed at all      -> counts as new, not as surviving (never credit the unheard)
 *
 * Deleting a row cannot send a learner backwards: `exposures` is a per-sentence maturity
 * counter, and both doors write back `effective + 1` where `effective` floors on the
 * derived main-flow value (packages/core/src/persistence/PodStateStore.ts). Course
 * progress rides `course_enrollments.completed_pod_rounds`, which this tool never touches.
 *
 *   node tools/pods/pod-state-migrate.cjs --course=fra_for_eng --from=pod-0 --to=pod-0-unrecorded
 *   node tools/pods/pod-state-migrate.cjs --course=cym_n_for_eng --from=@2026-08-06T10:00:00Z --to=pod-0 --apply
 *
 * `--from=@<iso>` reconstructs the pod's content as it stood at that instant by replaying
 * content_audit_log.old_row backwards from live — for repairing a swap that already ran.
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql'), quiet: true })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const arg = (n) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=').slice(1).join('=') : null }
const has = (n) => process.argv.includes(`--${n}`)

/**
 * THE POSITION BOUND, and why it is these two parts and not a window on the index.
 *
 * Measured over all 4,062 content matches between the live and staged canons of all 37
 * candidate courses (docs/pods/a107-position-bound-2026-08-14.md):
 *
 *   - an index window is WRONG: the pod grows 142 -> 232, so every survivor shifts;
 *     median |delta global_order| is 10 and reaches 90. A window tight enough to mean
 *     anything would reject legitimate survivors wholesale.
 *   - a fractional-position window is WRONG for the same reason: median |delta fraction|
 *     is 0.125 purely from insertion.
 *   - the SCENE is the invariant. 4,057 of 4,062 matches (99.88%) land in their own
 *     scene once scenes are corresponded by content rather than by number — which is
 *     what lets old scene 15 legitimately become new scene 22 when seven scenes are
 *     inserted before it. Within that scene, sentence_number moves by 0 (4,020) or
 *     exactly 7 (37), and never more.
 *
 * So: same scene (corresponded by content), and no more than MAX_WITHIN_SCENE_SHIFT
 * places within it. The 5 matches this rejects estate-wide are all one numbers-drill
 * line ("100,000. 60. 70. 1 o'clock. 11 o'clock.") that stayed at literal scene 15 while
 * the rest of its scene moved to 22 — a genuine relocation to a different dialogue, and
 * exactly the class the rule exists to catch.
 */
const POSITION_BOUND = 'corresponding scene, and <= 8 sentence positions within it'
const MAX_WITHIN_SCENE_SHIFT = 8   // observed maximum is 7; one place of headroom

/** Normalisation "the same sentence" means, stated so it can be argued with: trim,
 *  collapse whitespace, case-fold, and fold the typographic characters the canon is
 *  inconsistent about. NO punctuation stripping — "Five. Ten." and "5. 10." are
 *  correctly NOT the same thing to hear (Tom's rule 5). */
const norm = (s) => (s || '')
  .replace(/…/g, '...').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
  .replace(/\s+/g, ' ').trim().toLowerCase()

/** `<course>:<slug>:SC01-S002:s0` -> { base: '<course>:<slug>:SC01-S002', split: ':s0' } */
const splitId = (sentenceId) => {
  const m = /^(.*?)(:s\d+)?$/.exec(sentenceId)
  return { base: m[1], split: m[2] || '' }
}

/**
 * Reconstruct a pod's sentences as they stood at `atIso`, by replaying
 * content_audit_log.old_row backwards from the live rows. The log stores only old_row
 * (one entry per UPDATE/DELETE), so walking newest-first and applying every entry
 * newer than T leaves each row holding the value it had at or before T.
 *
 * THE TRAP THE REPLAY ALONE WALKS INTO: content_audit_log records UPDATE and DELETE and
 * NOT INSERT (see its change_type check constraint), so a row created AFTER T is
 * invisible to the replay and would survive into the snapshot as though it had always
 * been there. On cym_n_for_eng that silently produced a 232-row "old" canon holding both
 * the original scene 15 and the scene 22 it later became — 12 duplicate texts, and a
 * matcher that then refused to match any of them. `created_at` is the fix: a row that
 * did not exist at T is excluded outright, which recovers the true 142-row canon.
 */
async function canonAt (db, podId, atIso) {
  const { rows: live } = await db.query(
    `select id, pod_id, scene_number, sentence_number, global_order, known_text, created_at
       from listening_pod_sentences where pod_id = $1`, [podId])
  const T = new Date(atIso)
  const state = new Map(live.map(r => [r.id, { ...r }]))
  const { rows: log } = await db.query(
    `select primary_key, change_type, changed_at, old_row
       from content_audit_log
      where table_name = 'listening_pod_sentences'
        and (primary_key like $1 or old_row->>'pod_id' = $2)
      order by changed_at desc, id desc`, [podId.split(':')[0] + '%', podId])
  for (const e of log) {
    if (new Date(e.changed_at) <= T) continue
    state.set(e.old_row.id, { ...e.old_row })
  }
  return [...state.values()]
    .filter(r => r.pod_id === podId)
    .filter(r => !r.created_at || new Date(r.created_at) <= T)   // did not exist yet at T
    .map(r => ({ id: r.id, scene_number: +r.scene_number, sentence_number: +r.sentence_number, global_order: +r.global_order, known_text: r.known_text }))
}

async function canonOf (db, course, spec) {
  if (spec.startsWith('@')) return canonAt(db, `${course}:pod-0`, spec.slice(1))
  const { rows } = await db.query(
    `select id, scene_number, sentence_number, global_order, known_text
       from listening_pod_sentences where pod_id = $1 order by global_order`, [`${course}:${spec}`])
  return rows
}

/** Old scene -> new scene, by content plurality. Number-independent on purpose. */
function correspondScenes (pairs) {
  const votes = new Map()
  for (const p of pairs) {
    const m = votes.get(p.old.scene_number) || new Map()
    m.set(p.nw.scene_number, (m.get(p.nw.scene_number) || 0) + 1)
    votes.set(p.old.scene_number, m)
  }
  const map = new Map()
  for (const [oldSc, m] of votes) map.set(oldSc, [...m].sort((a, b) => b[1] - a[1])[0][0])
  return map
}

/**
 * The plan. Pure — takes two canons and the learner rows, returns the actions.
 * Exported so it can be tested and so pod-switchover can refuse without duplicating it.
 */
function planMigration (oldCanon, newCanon, stateRows) {
  const oldById = new Map(oldCanon.map(r => [r.id, r]))
  // Keyed by SLOT, not by id: the slot is what survives a swap, and the two canons sit
  // on different slugs (pod-0 vs pod-0-unrecorded) so their ids never compare equal.
  // Keying on the id here is what made the mis-credit count read a false 0.
  const slotOf = (r) => `${r.scene_number}|${r.sentence_number}`
  const newBySlot = new Map(newCanon.map(r => [slotOf(r), r]))
  const index = (canon) => {
    const m = new Map()
    for (const r of canon) {
      const k = norm(r.known_text)
      if (!m.has(k)) m.set(k, [])
      m.get(k).push(r)
    }
    return m
  }
  const newByText = index(newCanon)
  const oldByText = index(oldCanon)
  // Ambiguity would make matching a guess. Report it rather than guessing.
  const ambiguous = [...newByText.values()].filter(v => v.length > 1).length
                  + [...oldByText.values()].filter(v => v.length > 1).length

  const pairs = []
  for (const r of oldCanon) {
    const cands = newByText.get(norm(r.known_text))
    if (cands && cands.length === 1) pairs.push({ old: r, nw: cands[0] })
  }
  const sceneMap = correspondScenes(pairs)

  /** old sentence -> new sentence, or a reason it is not a match. */
  const resolve = (o) => {
    const cands = newByText.get(norm(o.known_text))
    if (!cands) return { ok: false, reason: 'text_absent_from_new_canon' }
    if (cands.length > 1) return { ok: false, reason: 'ambiguous_text_in_new_canon' }
    const n = cands[0]
    if (sceneMap.get(o.scene_number) !== n.scene_number) return { ok: false, reason: 'relocated_to_different_scene', to: n.id }
    const shift = Math.abs(n.sentence_number - o.sentence_number)
    if (shift > MAX_WITHIN_SCENE_SHIFT) return { ok: false, reason: `moved_${shift}_places_within_scene`, to: n.id }
    return { ok: true, to: n, shift }
  }

  const actions = []
  for (const st of stateRows) {
    const { base, split } = splitId(st.sentence_id)
    const o = oldById.get(base)
    if (!o) { actions.push({ ...st, action: 'drop', reason: 'slot_not_in_old_canon' }); continue }
    // What a do-nothing swap would have done to THIS row: keep the slot key, and so
    // credit the learner with whatever sentence now sits in that slot.
    const sitting = newBySlot.get(slotOf(o))
    const miscredit = sitting && norm(sitting.known_text) !== norm(o.known_text) ? sitting.known_text : null
    const r = resolve(o)
    if (!r.ok) { actions.push({ ...st, action: 'drop', reason: r.reason, heard: o.known_text, would_have_credited: r.to || null, miscredit_avoided: miscredit }); continue }
    const to = `${r.to.id}${split}`
    actions.push({
      ...st,
      action: to === st.sentence_id ? 'keep' : 'carry',
      to,
      heard: o.known_text,
      moved: `SC${o.scene_number}-S${o.sentence_number} -> SC${r.to.scene_number}-S${r.to.sentence_number}`,
      miscredit_avoided: miscredit
    })
  }

  // Two old rows can land on one new slot (a split unit collapsing). Forward-only: keep max.
  const byTarget = new Map()
  for (const a of actions) {
    if (a.action !== 'carry' && a.action !== 'keep') continue
    const k = `${a.learner_id}|${a.to}`
    const prev = byTarget.get(k)
    if (prev) { prev.exposures = Math.max(prev.exposures, a.exposures); a.action = 'merge'; a.merged_into = a.to }
    else byTarget.set(k, a)
  }
  return { actions, ambiguous, scene_map: [...sceneMap], survivors: pairs.length }
}

async function main () {
  const course = arg('course')
  const from = arg('from') || 'pod-0'
  const to = arg('to') || 'pod-0-unrecorded'
  const APPLY = has('apply')
  const OUT = arg('log')
  if (!course) { console.error('usage: --course=<code> [--from=pod-0|@ISO] [--to=pod-0-unrecorded] [--apply] [--log=path]'); process.exit(2) }

  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()

  const [oldCanon, newCanon] = await Promise.all([canonOf(db, course, from), canonOf(db, course, to)])
  if (!oldCanon.length) throw new Error(`old canon empty for ${course} ${from}`)
  if (!newCanon.length) throw new Error(`new canon empty for ${course} ${to}`)
  const { rows: stateRows } = await db.query(
    `select learner_id, course_code, sentence_id, exposures, updated_at
       from learner_pod_state where course_code = $1 order by learner_id, sentence_id`, [course])

  const plan = planMigration(oldCanon, newCanon, stateRows)
  const tally = plan.actions.reduce((m, a) => { m[a.action] = (m[a.action] || 0) + 1; return m }, {})
  const exposuresBy = plan.actions.reduce((m, a) => { m[a.action] = (m[a.action] || 0) + a.exposures; return m }, {})
  const miscredits = plan.actions.filter(a => a.miscredit_avoided).length
  const dropReasons = plan.actions.filter(a => a.action === 'drop').reduce((m, a) => { m[a.reason] = (m[a.reason] || 0) + 1; return m }, {})

  console.log(`\n${course}: ${from} (${oldCanon.length}) -> ${to} (${newCanon.length})`)
  console.log(`  bound            : ${POSITION_BOUND}`)
  console.log(`  content survivors: ${plan.survivors}   ambiguous texts: ${plan.ambiguous}`)
  console.log(`  learner rows     : ${stateRows.length} carrying ${stateRows.reduce((s, r) => s + r.exposures, 0)} exposures`)
  for (const k of ['keep', 'carry', 'merge', 'drop']) {
    if (tally[k]) console.log(`    ${k.padEnd(6)}: ${String(tally[k]).padStart(4)} rows / ${exposuresBy[k]} exposures`)
  }
  console.log(`  mis-credits this migration prevents: ${miscredits}`)
  if (Object.keys(dropReasons).length) console.log(`  drop reasons     : ${JSON.stringify(dropReasons)}`)

  if (APPLY) {
    await db.query('begin')
    try {
      let carried = 0, dropped = 0
      for (const a of plan.actions) {
        if (a.action === 'drop' || a.action === 'merge') {
          const r = await db.query(
            `delete from learner_pod_state where learner_id=$1 and course_code=$2 and sentence_id=$3 and exposures=$4`,
            [a.learner_id, course, a.sentence_id, a.exposures])
          if (r.rowCount !== 1) throw new Error(`drift: expected 1 row for ${a.sentence_id}, got ${r.rowCount}`)
          dropped++
        } else if (a.action === 'carry') {
          // Delete-then-upsert: the primary key contains sentence_id, and the target may
          // already exist (another row carried onto it). Forward-only on collision.
          const d = await db.query(
            `delete from learner_pod_state where learner_id=$1 and course_code=$2 and sentence_id=$3 and exposures=$4`,
            [a.learner_id, course, a.sentence_id, a.exposures])
          if (d.rowCount !== 1) throw new Error(`drift: expected 1 row for ${a.sentence_id}, got ${d.rowCount}`)
          await db.query(
            `insert into learner_pod_state (learner_id, course_code, sentence_id, exposures)
             values ($1,$2,$3,$4)
             on conflict (learner_id, course_code, sentence_id)
             do update set exposures = greatest(learner_pod_state.exposures, excluded.exposures)`,
            [a.learner_id, course, a.to, a.exposures])
          carried++
        }
      }
      await db.query('commit')
      console.log(`  APPLIED: ${carried} carried, ${dropped} dropped`)
    } catch (e) { await db.query('rollback'); console.error('  ROLLED BACK:', e.message); process.exitCode = 1 }
  } else {
    console.log('  DRY RUN — nothing written. Re-run with --apply.')
  }

  if (OUT) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true })
    fs.writeFileSync(OUT, JSON.stringify({ course, from, to, applied: APPLY, bound: POSITION_BOUND,
      old_count: oldCanon.length, new_count: newCanon.length, survivors: plan.survivors,
      ambiguous_texts: plan.ambiguous, tally, exposures_by_action: exposuresBy,
      miscredits_prevented: miscredits, drop_reasons: dropReasons, actions: plan.actions }, null, 2))
    console.log(`  wrote ${OUT}`)
  }
  await db.end()
}

if (require.main === module) main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
module.exports = { planMigration, canonAt, canonOf, norm, splitId, POSITION_BOUND, MAX_WITHIN_SCENE_SHIFT }
