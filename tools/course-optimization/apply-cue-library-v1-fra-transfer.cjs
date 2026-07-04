// Applies the confirmed F7 (FORMAL YOU) transfer fix from
// docs/course-optimization/cue-library-v1-fra-transfer-plan.md to fra_for_eng seed 646 —
// the one spring the plan doc verified independently reproduces spa_for_eng's exact
// bare-build bug (spa fix: tools/course-optimization/apply-cue-library-v1-spa-foldins.cjs).
// Text edits only. Every row whose known_text/target_text changes has its audio_id fields
// nulled (staged for regen, NOT generated) per edit-cascade-spec §2d.
// Run with DRY_RUN=1 to print planned changes without writing.
require('dotenv').config()
const { supabase } = require('../../services/supabase-client.cjs')

const COURSE = 'fra_for_eng'
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
    throw new Error(`ASSERTION FAILED for ${label}: expected "${expected}", got "${actual}" — aborting, DB state does not match doc BEFORE state.`)
  }
}

async function updateLego(seed, legoIndex, { knownBefore, targetBefore, knownAfter, targetAfter, reason }) {
  const lego = await getLego(seed, legoIndex)
  assertEq(`lego S${seed}L${legoIndex} known_text`, lego.known_text, knownBefore)
  if (targetBefore !== undefined) assertEq(`lego S${seed}L${legoIndex} target_text`, lego.target_text, targetBefore)

  const update = {}
  if (knownAfter !== undefined && knownAfter !== lego.known_text) { update.known_text = knownAfter; update.known_audio_id = null }
  if (targetAfter !== undefined && targetAfter !== lego.target_text) {
    update.target_text = targetAfter
    update.target1_audio_id = null
    update.target2_audio_id = null
    update.target1_duration_ms = null
    update.target2_duration_ms = null
  }
  if (Object.keys(update).length === 0) { record('SKIP_LEGO_NOOP', { seed, legoIndex }); return }
  update.presentation_audio_id = null

  record('UPDATE_LEGO', { id: lego.id, seed, legoIndex, before: { known: lego.known_text, target: lego.target_text }, after: update, reason })
  if (!DRY_RUN) {
    const { error } = await supabase.from('course_legos').update(update).eq('id', lego.id)
    if (error) throw error
  }
}

async function updatePhrase(id, { knownBefore, targetBefore, knownAfter, targetAfter, reason }) {
  const phrase = await getPhrase(id)
  if (knownBefore !== undefined) assertEq(`${id} known_text`, phrase.known_text, knownBefore)
  if (targetBefore !== undefined) assertEq(`${id} target_text`, phrase.target_text, targetBefore)

  const update = {}
  if (knownAfter !== undefined && knownAfter !== phrase.known_text) { update.known_text = knownAfter; update.known_audio_id = null }
  if (targetAfter !== undefined && targetAfter !== phrase.target_text) {
    update.target_text = targetAfter
    update.target1_audio_id = null
    update.target2_audio_id = null
    update.target1_duration_ms = null
    update.target2_duration_ms = null
  }
  if (Object.keys(update).length === 0) { record('SKIP_PHRASE_NOOP', { id }); return }
  update.presentation_audio_id = null

  record('UPDATE_PHRASE', { id, before: { known: phrase.known_text, target: phrase.target_text }, after: update, reason })
  if (!DRY_RUN) {
    const { error } = await supabase.from('course_practice_phrases').update(update).eq('id', id).eq('course_code', COURSE)
    if (error) throw error
  }
}

async function deletePhrase(id, { knownBefore, targetBefore, reason }) {
  const phrase = await getPhrase(id)
  if (knownBefore !== undefined) assertEq(`${id} known_text`, phrase.known_text, knownBefore)
  if (targetBefore !== undefined) assertEq(`${id} target_text`, phrase.target_text, targetBefore)
  record('DELETE_PHRASE', { id, was: { known: phrase.known_text, target: phrase.target_text }, reason })
  if (!DRY_RUN) {
    const { error } = await supabase.from('course_practice_phrases').delete().eq('id', id).eq('course_code', COURSE)
    if (error) throw error
  }
}

async function main() {
  console.log(`=== ${DRY_RUN ? 'DRY RUN' : 'LIVE APPLY'}: cue-library F7 transfer fix on ${COURSE}, seed 646 ===\n`)

  // ---- F7: seed 646 (vocative, house law — mirrors spa's S0646L01 fix) ----
  // Lego debut + build pos3 share the exact bare cue "you are doing"="vous faites";
  // confirmed unique course-wide with the "sir" marker appended (no collision with any
  // existing row, formal or informal).
  await updateLego(646, 1, {
    knownBefore: 'you are doing', targetBefore: 'vous faites',
    knownAfter: 'you are doing sir',
    reason: 'F7 transfer (fra): vocative marker on lego debut, mirrors spa S0646L01 fix; target unchanged (already formal vous)'
  })
  await updatePhrase('fra_for_eng:S0646L01B01', {
    knownBefore: 'you are doing', targetBefore: 'vous faites',
    knownAfter: 'you are doing sir',
    reason: 'F7 transfer (fra): debut echo build, mirrors lego'
  })

  // Build rows pos4/pos5 are bare duplicates-in-waiting: once marked "sir" they would
  // become byte-identical known_text to the seed's OWN later USE rows (U01/U02), which
  // already carry a different, additionally-enriched target (spoken "monsieur" — a
  // pre-existing fra_for_eng authoring choice, not something spa's fix introduced).
  // Same known_text -> two different targets is a ZUT violation, so — per the same
  // "delete bare rung duplicating [already correct] text" precedent used for spa seeds
  // 297/396/497 — the redundant bare precursor is deleted, not re-glossed.
  await deletePhrase('fra_for_eng:S0646L01B02', {
    knownBefore: 'you are doing something', targetBefore: 'vous faites quelque chose',
    reason: 'F7 transfer (fra): bare build would exact-duplicate marked USE row S0646L01U01 ("you are doing something sir") under a different target once marked — delete redundant bare precursor, marked form already exists downstream'
  })
  await deletePhrase('fra_for_eng:S0646L01B03', {
    knownBefore: 'you are doing well', targetBefore: 'vous faites bien',
    reason: 'F7 transfer (fra): bare build would exact-duplicate marked USE row S0646L01U02 ("you are doing well sir") under a different target once marked — delete redundant bare precursor, marked form already exists downstream'
  })

  // U03 and U05 are the two USE rows the original patch (and the plan doc) flagged as
  // still bare after the seed's own house convention was applied to U01/U02/U04.
  await updatePhrase('fra_for_eng:S0646L01U03', {
    knownBefore: 'you are doing something important', targetBefore: "vous faites quelque chose d'important",
    knownAfter: 'you are doing something important sir',
    reason: 'F7 transfer (fra): USE line was left bare; confirmed unique with marker appended'
  })
  await updatePhrase('fra_for_eng:S0646L01U05', {
    knownBefore: 'you are doing a lot', targetBefore: 'vous faites beaucoup',
    knownAfter: 'you are doing a lot sir',
    reason: 'F7 transfer (fra): USE line was left bare; confirmed unique with marker appended'
  })

  console.log(`\n=== Done. ${log.length} actions ${DRY_RUN ? 'planned (dry run, no writes)' : 'applied'}. ===`)
  require('fs').writeFileSync(
    require('path').join(__dirname, DRY_RUN ? 'cue-library-v1-fra-transfer-dryrun-log.json' : 'cue-library-v1-fra-transfer-applied-log.json'),
    JSON.stringify(log, null, 2)
  )
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
