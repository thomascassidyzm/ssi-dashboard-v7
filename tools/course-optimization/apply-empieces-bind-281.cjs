// Chief-of-Staff ruling (delegated authority, BSC + zero-explanation methodology):
// spa_for_eng seed 281 lego 4 "you start" = empieces was bare (no trigger signal that the
// form is subjunctive, not indicative "empiezas"). Bind to its single most-rehearsed trigger
// frame "before you start" (matches existing build row B02, the canonical subjunctive trigger)
// per the 506/542 no-parens component pattern. Delete bare rows that leaked the form with no
// trigger (B05 "you start speaking", B06 "you start now"); every remaining build/USE row
// already carries its own trigger (hope/before/when/want-that), left untouched.
// Run with DRY_RUN=1 to preview.
require('dotenv').config()
const { supabase } = require('../../services/supabase-client.cjs')

const COURSE = 'spa_for_eng'
const DRY_RUN = process.env.DRY_RUN === '1'
const log = []

function record(action, detail) {
  log.push({ action, ...detail })
  console.log(`[${action}]`, JSON.stringify(detail))
}

async function getLego(seed, legoIndex) {
  const { data, error } = await supabase.from('course_legos').select('*')
    .eq('course_code', COURSE).eq('seed_number', seed).eq('lego_index', legoIndex).single()
  if (error) throw new Error(`lego S${seed}L${legoIndex} not found: ${error.message}`)
  return data
}

async function getPhrase(id) {
  const { data, error } = await supabase.from('course_practice_phrases').select('*')
    .eq('id', id).eq('course_code', COURSE).single()
  if (error) throw new Error(`phrase ${id} not found: ${error.message}`)
  return data
}

function assertEq(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`ASSERTION FAILED for ${label}: expected "${expected}", got "${actual}" — aborting.`)
  }
}

async function updateLego(seed, legoIndex, { knownBefore, targetBefore, knownAfter, targetAfter, componentsAfter, reason }) {
  const lego = await getLego(seed, legoIndex)
  assertEq(`lego S${seed}L${legoIndex} known_text`, lego.known_text, knownBefore)
  assertEq(`lego S${seed}L${legoIndex} target_text`, lego.target_text, targetBefore)

  const update = {}
  if (knownAfter !== undefined && knownAfter !== lego.known_text) { update.known_text = knownAfter; update.known_audio_id = null }
  if (targetAfter !== undefined && targetAfter !== lego.target_text) {
    update.target_text = targetAfter
    update.target1_audio_id = null
    update.target2_audio_id = null
    update.target1_duration_ms = null
    update.target2_duration_ms = null
  }
  if (componentsAfter !== undefined) update.components = componentsAfter
  update.presentation_audio_id = null

  record('UPDATE_LEGO', { id: lego.id, seed, legoIndex, before: { known: lego.known_text, target: lego.target_text, components: lego.components }, after: update, reason })
  if (!DRY_RUN) {
    const { error } = await supabase.from('course_legos').update(update).eq('id', lego.id)
    if (error) throw error
  }
}

async function deletePhrase(id, { knownBefore, targetBefore, reason }) {
  const phrase = await getPhrase(id)
  assertEq(`${id} known_text`, phrase.known_text, knownBefore)
  assertEq(`${id} target_text`, phrase.target_text, targetBefore)
  record('DELETE_PHRASE', { id, was: { known: phrase.known_text, target: phrase.target_text }, reason })
  if (!DRY_RUN) {
    const { error } = await supabase.from('course_practice_phrases').delete().eq('id', id).eq('course_code', COURSE)
    if (error) throw error
  }
}

async function main() {
  console.log(`=== ${DRY_RUN ? 'DRY RUN' : 'LIVE APPLY'}: seed 281 empieces bind on ${COURSE} ===\n`)

  await updateLego(281, 4, {
    knownBefore: 'you start', targetBefore: 'empieces',
    knownAfter: 'before you start', targetAfter: 'antes de que empieces',
    componentsAfter: [
      { known: 'before', target: 'antes de que' },
      { known: 'before you start', target: 'empieces' }
    ],
    reason: "owner ruling: bind bare 'you start'=empieces (no known-side subjunctive signal) to its single most-rehearsed trigger frame 'before you start' (matches existing build row B02), per the 506/542 no-parens component pattern"
  })

  await deletePhrase('spa_for_eng:S0281L04B05', {
    knownBefore: 'You start speaking', targetBefore: 'Empieces a hablar',
    reason: "owner ruling: bare row leaks subjunctive form with no trigger in the known side — delete per vous-pass deletion precedent"
  })

  await deletePhrase('spa_for_eng:S0281L04B06', {
    knownBefore: 'You start now', targetBefore: 'Empieces ahora',
    reason: "owner ruling: bare row leaks subjunctive form with no trigger in the known side — delete per vous-pass deletion precedent"
  })

  console.log(`\n=== Done. ${log.length} action(s) ${DRY_RUN ? 'planned (dry run, no writes)' : 'applied'}. ===`)
  require('fs').writeFileSync(
    require('path').join(__dirname, DRY_RUN ? 'empieces-bind-281-dryrun-log.json' : 'empieces-bind-281-applied-log.json'),
    JSON.stringify(log, null, 2)
  )
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
