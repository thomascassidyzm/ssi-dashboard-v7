// Applies the owner's tu-first-as-default ruling to the 8 pre-639 fra_for_eng
// register collisions (unmarkedVousLiveCollisions in
// formal-vous-pass-fra-proposals.json), from adversary-checked proposals in
// tools/course-optimization/tu-default-pass-fra-proposals.json.
// Text edits only: every changed row has target1/2_audio_id, duration_ms and
// presentation_audio_id nulled (staged for regen, NOT generated), and
// `decomposition` nulled so the backfill path recomputes tiling on the new
// text (see services/phrase-decomposition-writer.cjs). Every action is
// assertion-guarded against the live BEFORE state and aborts on drift.
// Usage:
//   DRY_RUN=1 node apply-tu-default-pass-fra.cjs        # print planned changes
//   SEEDS=161 node apply-tu-default-pass-fra.cjs         # apply one seed (per-seed commits)
//   SEEDS=161,162 node apply-tu-default-pass-fra.cjs
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { supabase } = require('../../services/supabase-client.cjs')
// Shared ZUT preflight (services/course-builder/lib/zut-gate.cjs) — the same gate
// wired into every content-write route. Checked AFTER the write (a pre-check on an
// in-place target_text edit would self-collide against the row's own pre-edit
// value); rolls the row back if the edit exposed a genuine collision elsewhere.
// This is the reference wiring for future one-off course-optimization scripts:
// copy this file's require + the two checkEditedPhrase calls below.
const { checkEditedPhrase } = require('../../services/course-builder/lib/zut-gate.cjs')

const COURSE = 'fra_for_eng'
const DRY_RUN = process.env.DRY_RUN === '1'
const SEEDS = process.env.SEEDS ? process.env.SEEDS.split(',').map(Number) : null
const PROPOSALS = require('./tu-default-pass-fra-proposals.json')

const log = []
function record(action, detail) {
  log.push({ action, ...detail })
  console.log(`[${action}]`, JSON.stringify(detail))
}
function assertEq(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`ASSERTION FAILED for ${label}: expected "${expected}", got "${actual}" — aborting, DB state does not match verified BEFORE state.`)
  }
}

async function getLego(id) {
  const { data, error } = await supabase.from('course_legos').select('*')
    .eq('id', id).eq('course_code', COURSE).single()
  if (error) throw new Error(`lego ${id} not found: ${error.message}`)
  return data
}
async function getPhrase(id) {
  const { data, error } = await supabase.from('course_practice_phrases').select('*')
    .eq('id', id).eq('course_code', COURSE).single()
  if (error) throw new Error(`phrase ${id} not found: ${error.message}`)
  return data
}
async function getSeed(seedNumber) {
  const { data, error } = await supabase.from('course_seeds').select('*')
    .eq('course_code', COURSE).eq('seed_number', seedNumber).single()
  if (error) throw new Error(`seed ${seedNumber} not found: ${error.message}`)
  return data
}

function targetUpdate(targetAfter, current) {
  if (targetAfter === undefined || targetAfter === current) return {}
  return {
    target_text: targetAfter,
    target1_audio_id: null,
    target2_audio_id: null,
    target1_duration_ms: null,
    target2_duration_ms: null,
  }
}
// course_seeds has no duration_ms columns — audio ids only.
function seedTargetUpdate(targetAfter, current) {
  if (targetAfter === undefined || targetAfter === current) return {}
  return { target_text: targetAfter, target1_audio_id: null, target2_audio_id: null }
}

async function applyAction(a) {
  if (a.op === 'UPDATE_LEGO') {
    const row = await getLego(a.id)
    if (row.target_text === a.targetAfter) { record('SKIP_ALREADY_APPLIED', { id: a.id }); return }
    assertEq(`lego ${a.id} known_text`, row.known_text, a.knownBefore)
    assertEq(`lego ${a.id} target_text`, row.target_text, a.targetBefore)
    const update = targetUpdate(a.targetAfter, row.target_text)
    if (a.componentsAfter !== undefined) update.components = a.componentsAfter
    if (Object.keys(update).length === 0) { record('SKIP_NOOP', { id: a.id }); return }
    record('UPDATE_LEGO', { id: a.id, seed: a.seed, before: { known: row.known_text, target: row.target_text, components: row.components }, after: update })
    if (!DRY_RUN) {
      const { error } = await supabase.from('course_legos').update(update).eq('id', a.id)
      if (error) throw error
      if (update.target_text !== undefined) {
        const zutCheck = await checkEditedPhrase(supabase, COURSE, {
          table: 'course_legos', id: a.id, known: row.known_text, target: update.target_text,
          revertFields: { target_text: row.target_text, target1_audio_id: row.target1_audio_id, target2_audio_id: row.target2_audio_id, target1_duration_ms: row.target1_duration_ms, target2_duration_ms: row.target2_duration_ms },
        })
        if (!zutCheck.ok) {
          record('REJECTED_ZUT', { id: a.id, seed: a.seed, collisions: zutCheck.collisions })
          throw new Error(`ZUT violation: lego ${a.id} "${row.known_text}" -> "${update.target_text}" collides with an existing different target — reverted, aborting.`)
        }
      }
    }
  } else if (a.op === 'UPDATE_PHRASE') {
    const row = await getPhrase(a.id)
    if (row.target_text === a.targetAfter) { record('SKIP_ALREADY_APPLIED', { id: a.id }); return }
    assertEq(`${a.id} known_text`, row.known_text, a.knownBefore)
    assertEq(`${a.id} target_text`, row.target_text, a.targetBefore)
    const update = targetUpdate(a.targetAfter, row.target_text)
    if (Object.keys(update).length === 0) { record('SKIP_NOOP', { id: a.id }); return }
    update.presentation_audio_id = null
    if (row.decomposition !== null && row.decomposition !== undefined) update.decomposition = null
    record('UPDATE_PHRASE', { id: a.id, seed: a.seed, before: { known: row.known_text, target: row.target_text }, after: update })
    if (!DRY_RUN) {
      const { error } = await supabase.from('course_practice_phrases').update(update).eq('id', a.id).eq('course_code', COURSE)
      if (error) throw error
      if (update.target_text !== undefined) {
        const zutCheck = await checkEditedPhrase(supabase, COURSE, {
          table: 'course_practice_phrases', id: a.id, known: row.known_text, target: update.target_text,
          revertFields: { target_text: row.target_text, presentation_audio_id: row.presentation_audio_id, decomposition: row.decomposition, target1_audio_id: row.target1_audio_id, target2_audio_id: row.target2_audio_id, target1_duration_ms: row.target1_duration_ms, target2_duration_ms: row.target2_duration_ms },
        })
        if (!zutCheck.ok) {
          record('REJECTED_ZUT', { id: a.id, seed: a.seed, collisions: zutCheck.collisions })
          throw new Error(`ZUT violation: phrase ${a.id} "${row.known_text}" -> "${update.target_text}" collides with an existing different target — reverted, aborting.`)
        }
      }
    }
  } else if (a.op === 'UPDATE_SEED') {
    const row = await getSeed(a.seed)
    if (row.target_text === a.targetAfter) { record('SKIP_ALREADY_APPLIED', { seed: a.seed }); return }
    assertEq(`seed ${a.seed} known_text`, row.known_text, a.knownBefore)
    assertEq(`seed ${a.seed} target_text`, row.target_text, a.targetBefore)
    const update = seedTargetUpdate(a.targetAfter, row.target_text)
    if (Object.keys(update).length === 0) { record('SKIP_NOOP', { seed: a.seed }); return }
    record('UPDATE_SEED', { seed: a.seed, before: { known: row.known_text, target: row.target_text }, after: update })
    if (!DRY_RUN) {
      const { error } = await supabase.from('course_seeds').update(update).eq('course_code', COURSE).eq('seed_number', a.seed)
      if (error) throw error
    }
  } else {
    throw new Error(`unknown op ${a.op}`)
  }
}

async function main() {
  const seeds = Object.keys(PROPOSALS.proposals).map(Number)
    .filter(s => !SEEDS || SEEDS.includes(s)).sort((a, b) => a - b)
  console.log(`=== ${DRY_RUN ? 'DRY RUN' : 'LIVE APPLY'}: tu-default pass on ${COURSE}, seeds ${seeds.join(',')} ===\n`)
  for (const s of seeds) {
    for (const a of PROPOSALS.proposals[s].actions) await applyAction({ seed: s, ...a })
  }
  console.log(`\n=== Done. ${log.length} actions ${DRY_RUN ? 'planned (dry run, no writes)' : 'applied'}. ===`)
  const out = path.join(__dirname, DRY_RUN ? 'tu-default-pass-fra-dryrun-log.json' : 'tu-default-pass-fra-applied-log.json')
  let prior = []
  if (!DRY_RUN && fs.existsSync(out)) prior = JSON.parse(fs.readFileSync(out, 'utf8'))
  fs.writeFileSync(out, JSON.stringify([...prior, ...log], null, 2))
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
