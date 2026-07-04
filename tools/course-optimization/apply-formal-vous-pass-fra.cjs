// Applies the formal-vous pass (dedicated F7 verification pass called for by
// docs/course-optimization/cue-library-v1-fra-transfer-plan.md) to fra_for_eng
// seeds 642-655, from adversary-verified proposals in
// tools/course-optimization/formal-vous-pass-fra-proposals.json.
// Same guarantees as apply-cue-library-v1-fra-transfer.cjs (the 646 precedent):
// text edits + redundant-bare-precursor deletions only; every changed row has its
// audio_id fields nulled (staged for regen, NOT generated) per edit-cascade-spec §2d;
// every action is assertion-guarded against the live BEFORE state and aborts on drift.
// Usage:
//   DRY_RUN=1 node apply-formal-vous-pass-fra.cjs        # print planned changes
//   SEEDS=642 node apply-formal-vous-pass-fra.cjs        # apply one seed (per-seed commits)
//   SEEDS=642,643 node apply-formal-vous-pass-fra.cjs
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { supabase } = require('../../services/supabase-client.cjs')

const COURSE = 'fra_for_eng'
const DRY_RUN = process.env.DRY_RUN === '1'
const SEEDS = process.env.SEEDS ? process.env.SEEDS.split(',').map(Number) : null
const PROPOSALS = require('./formal-vous-pass-fra-proposals.json')

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

function buildUpdate(row, a) {
  const update = {}
  if (a.knownAfter !== undefined && a.knownAfter !== row.known_text) {
    update.known_text = a.knownAfter
    update.known_audio_id = null
  }
  if (a.targetAfter !== undefined && a.targetAfter !== row.target_text) {
    update.target_text = a.targetAfter
    update.target1_audio_id = null
    update.target2_audio_id = null
    update.target1_duration_ms = null
    update.target2_duration_ms = null
  }
  if (Object.keys(update).length > 0) update.presentation_audio_id = null
  return update
}

async function applyAction(a) {
  if (a.op === 'UPDATE_LEGO') {
    const row = await getLego(a.id)
    assertEq(`lego ${a.id} known_text`, row.known_text, a.knownBefore)
    assertEq(`lego ${a.id} target_text`, row.target_text, a.targetBefore)
    const update = buildUpdate(row, a)
    if (Object.keys(update).length === 0) { record('SKIP_NOOP', { id: a.id }); return }
    record('UPDATE_LEGO', { id: a.id, seed: a.seed, before: { known: row.known_text, target: row.target_text }, after: update, reason: a.reason })
    if (!DRY_RUN) {
      const { error } = await supabase.from('course_legos').update(update).eq('id', a.id)
      if (error) throw error
    }
  } else if (a.op === 'UPDATE_PHRASE') {
    const row = await getPhrase(a.id)
    assertEq(`${a.id} known_text`, row.known_text, a.knownBefore)
    assertEq(`${a.id} target_text`, row.target_text, a.targetBefore)
    const update = buildUpdate(row, a)
    if (Object.keys(update).length === 0) { record('SKIP_NOOP', { id: a.id }); return }
    record('UPDATE_PHRASE', { id: a.id, seed: a.seed, before: { known: row.known_text, target: row.target_text }, after: update, reason: a.reason })
    if (!DRY_RUN) {
      const { error } = await supabase.from('course_practice_phrases').update(update).eq('id', a.id).eq('course_code', COURSE)
      if (error) throw error
    }
  } else if (a.op === 'DELETE_PHRASE') {
    const row = await getPhrase(a.id)
    assertEq(`${a.id} known_text`, row.known_text, a.knownBefore)
    assertEq(`${a.id} target_text`, row.target_text, a.targetBefore)
    // the marked form this bare row would duplicate must still exist
    if (a.duplicateOf.includes(':')) await getPhrase(a.duplicateOf)
    else await getLego(a.duplicateOf)
    record('DELETE_PHRASE', { id: a.id, seed: a.seed, was: { known: row.known_text, target: row.target_text }, duplicateOf: a.duplicateOf, reason: a.reason })
    if (!DRY_RUN) {
      const { error } = await supabase.from('course_practice_phrases').delete().eq('id', a.id).eq('course_code', COURSE)
      if (error) throw error
    }
  } else {
    throw new Error(`unknown op ${a.op}`)
  }
}

async function main() {
  const seeds = Object.keys(PROPOSALS.proposals).map(Number)
    .filter(s => !SEEDS || SEEDS.includes(s)).sort((a, b) => a - b)
  console.log(`=== ${DRY_RUN ? 'DRY RUN' : 'LIVE APPLY'}: formal-vous pass on ${COURSE}, seeds ${seeds.join(',')} ===\n`)
  for (const s of seeds) {
    for (const a of PROPOSALS.proposals[s].actions) await applyAction({ seed: s, ...a })
  }
  console.log(`\n=== Done. ${log.length} actions ${DRY_RUN ? 'planned (dry run, no writes)' : 'applied'}. ===`)
  const out = path.join(__dirname, DRY_RUN ? 'formal-vous-pass-fra-dryrun-log.json' : 'formal-vous-pass-fra-applied-log.json')
  // append across per-seed runs so the applied log accumulates the whole pass
  let prior = []
  if (!DRY_RUN && fs.existsSync(out)) prior = JSON.parse(fs.readFileSync(out, 'utf8'))
  fs.writeFileSync(out, JSON.stringify([...prior, ...log], null, 2))
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
