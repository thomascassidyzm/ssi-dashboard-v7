// Applies the FORK1/FORK2/FORK3 decisions + F3-F7 mechanical fold-ins from
// docs/course-optimization/cue-library-v1-spa.md to spa_for_eng.
// Text edits only. Every row whose known_text/target_text changes has its
// audio_id fields nulled (staged for regen, NOT generated) per edit-cascade-spec §2d.
// Run with DRY_RUN=1 to print planned changes without writing.
require('dotenv').config()
const { supabase } = require('../services/supabase-client.cjs')

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
    throw new Error(`ASSERTION FAILED for ${label}: expected "${expected}", got "${actual}" — aborting, DB state does not match doc BEFORE state.`)
  }
}

async function updateLego(seed, legoIndex, { knownBefore, targetBefore, knownAfter, targetAfter, componentsAfter, reason }) {
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
  if (componentsAfter !== undefined) update.components = componentsAfter
  if (Object.keys(update).length === 0) { record('SKIP_LEGO_NOOP', { seed, legoIndex }); return }
  update.presentation_audio_id = null

  record('UPDATE_LEGO', { id: lego.id, seed, legoIndex, before: { known: lego.known_text, target: lego.target_text, components: lego.components }, after: update, reason })
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
  console.log(`=== ${DRY_RUN ? 'DRY RUN' : 'LIVE APPLY'}: cue-library fold-ins on ${COURSE} ===\n`)

  // ---- FORK 1: seed 38 split-frame re-debut (retire glued atom) ----
  await updateLego(38, 1, {
    knownBefore: "I've been learning", targetBefore: 'llevo aprendiendo',
    knownAfter: "I've been learning all day", targetAfter: 'llevo todo el día aprendiendo',
    componentsAfter: [
      { known: "I've been", target: 'llevo' },
      { known: 'all day', target: 'todo el día' },
      { known: 'learning', target: 'aprendiendo' }
    ],
    reason: 'FORK1: retire glued contiguous atom, re-debut as split-frame (teach gap-form from first exposure)'
  })

  // ---- FORK 3: delete emotion-subjunctive USE line (seed 427) ----
  await deletePhrase('spa_for_eng:S0427L01U05', {
    knownBefore: "I was worried you'd think about this", targetBefore: 'estaba preocupada de que pensaras en esto',
    reason: 'FORK3: delete stray emotion-subjunctive sentence (no F1 cue); emotion-subjunctive family noted as possible future scoped addition, not built here'
  })

  // ---- F3: seed 297 debut rung fix ----
  await updateLego(297, 3, {
    knownBefore: 'they speak', targetBefore: 'hablen',
    knownAfter: 'who speak', targetAfter: 'que hablen',
    reason: 'F3 fold-in: bundle que into the lego so who-speak != they-speak (283 collision)'
  })
  await deletePhrase('spa_for_eng:S0297L03B01', {
    knownBefore: 'They speak', targetBefore: 'Hablen',
    reason: 'F3 fold-in: delete bare debut rung, promote pos2 (Personas que hablen español) as new debut'
  })

  // ---- F4: seed 396 three-change set ----
  await deletePhrase('spa_for_eng:S0396L03B01', {
    knownBefore: 'are ready', targetBefore: 'estén listos',
    reason: 'F4 fold-in: delete bare rung duplicating stale lego text'
  })
  await updateLego(396, 3, {
    knownBefore: 'are ready', targetBefore: 'estén listos',
    knownAfter: 'until they are ready',
    componentsAfter: [
      { known: 'until they are', target: 'estén', introduce: false },
      { known: 'ready', target: 'listos' }
    ],
    reason: 'F4 fold-in: lego known_text drives debut card, must carry trigger (target unchanged)'
  })
  await updatePhrase('spa_for_eng:S0396L03C01', {
    knownBefore: 'are', targetBefore: 'estén',
    knownAfter: 'until they are',
    reason: 'F4 fold-in: no-parens house law — natural glued prefix instead of "(until they) are"'
  })

  // ---- F4: seed 506 component fix (no-parens variant) ----
  await updateLego(506, 4, {
    knownBefore: 'before we moved', targetBefore: 'antes de que nos mudáramos',
    componentsAfter: [
      { known: 'before', target: 'antes de que' },
      { known: 'before we moved', target: 'nos mudáramos' }
    ],
    reason: 'F4 fold-in: no-parens house law — component gloss "before we moved" not "(before) we moved"'
  })
  await updatePhrase('spa_for_eng:S0506L04C02', {
    knownBefore: 'we moved', targetBefore: 'nos mudáramos',
    knownAfter: 'before we moved',
    reason: 'F4 fold-in: no-parens house law'
  })

  // ---- F4: seed 542 component fix (no-parens variant) ----
  await updateLego(542, 1, {
    knownBefore: 'whenever you feel', targetBefore: 'siempre que te sientas',
    componentsAfter: [
      { known: 'whenever', target: 'siempre que' },
      { known: 'whenever you feel', target: 'te sientas' }
    ],
    reason: 'F4 fold-in: no-parens house law — component gloss "whenever you feel" not "(whenever) you feel"'
  })
  await updatePhrase('spa_for_eng:S0542L01C02', {
    knownBefore: 'you feel', targetBefore: 'te sientas',
    knownAfter: 'whenever you feel',
    reason: 'F4 fold-in: no-parens house law'
  })

  // ---- F5: seed 497 re-debut + component + USE tense fix ----
  await updateLego(497, 2, {
    knownBefore: 'you needed to sleep', targetBefore: 'necesitaras dormir',
    knownAfter: 'as if you needed to sleep', targetAfter: 'como si necesitaras dormir',
    componentsAfter: [
      { known: 'as if you needed to', target: 'como si necesitaras' },
      { known: 'to sleep', target: 'dormir' }
    ],
    reason: 'F5: re-debut with como-si bundled (matches ladder content already at pos4/5); never expose necesitaras under bare "you needed to"'
  })
  await updatePhrase('spa_for_eng:S0497L02C01', {
    knownBefore: 'you needed to', targetBefore: 'necesitaras',
    knownAfter: 'as if you needed to', targetAfter: 'como si necesitaras',
    reason: 'F5 fold-in: component fires before the enriched build — must carry como-si too'
  })
  await deletePhrase('spa_for_eng:S0497L02B01', {
    knownBefore: 'you needed to sleep', targetBefore: 'necesitaras dormir',
    reason: 'F5: bare rung duplicating stale lego text, now redundant'
  })
  await updatePhrase('spa_for_eng:S0497L02U01', {
    knownBefore: 'that sounds as though you need to get some sleep',
    knownAfter: 'that sounds as though you needed to get some sleep',
    reason: 'F5: past-shift English to match held "as if I were" glosses'
  })

  // ---- F7: seed 646 (vocative, house law) ----
  await updateLego(646, 1, {
    knownBefore: "you're doing", targetBefore: 'está haciendo',
    knownAfter: "you're doing sir",
    reason: 'F7 fold-in: vocative marker on lego debut (target unchanged, already formal)'
  })
  await updatePhrase('spa_for_eng:S0646L01B01', { knownBefore: "you're doing", knownAfter: "you're doing sir", reason: 'F7 fold-in' })
  await updatePhrase('spa_for_eng:S0646L01B02', { knownBefore: "you're doing something", knownAfter: "you're doing something sir", reason: 'F7 fold-in' })
  await updatePhrase('spa_for_eng:S0646L01B03', { knownBefore: "what you're doing", knownAfter: "what you're doing sir", reason: 'F7 fold-in' })
  await updatePhrase('spa_for_eng:S0646L01U03', { knownBefore: "I can see you're doing something", knownAfter: "I can see you're doing something sir", reason: 'F7 fold-in' })
  await updatePhrase('spa_for_eng:S0646L01U04', { knownBefore: "I wonder what you're doing", knownAfter: "I wonder what you're doing madam", reason: 'F7 fold-in' })
  await updatePhrase('spa_for_eng:S0646L01U05', { knownBefore: "I think you're doing well", knownAfter: "I think you're doing well madam", reason: 'F7 fold-in' })

  // ---- F7: seed 651 ----
  await updateLego(651, 1, {
    knownBefore: 'think', targetBefore: 'piensa',
    knownAfter: 'you think sir',
    reason: 'F7: lego debut was bare "think"=piensa, identical to informal twin cue'
  })
  await updatePhrase('spa_for_eng:S0651L01U03', { knownBefore: 'I want to know what you think', knownAfter: 'I want to know what you think sir', reason: 'F7' })
  await updatePhrase('spa_for_eng:S0651L01U04', { knownBefore: 'can you tell me what you think?', knownAfter: 'can you tell me what you think madam?', reason: 'F7' })
  await updatePhrase('spa_for_eng:S0651L01U05', { knownBefore: 'I wonder what you think about that', knownAfter: 'I wonder what you think about that sir', reason: 'F7' })

  // ---- F7: seed 653 ----
  await updateLego(653, 1, {
    knownBefore: 'does it matter to you', targetBefore: 'le importa',
    knownAfter: 'does it matter to you sir',
    reason: 'F7: lego debut bare, twin te importa@281 primed'
  })
  await updatePhrase('spa_for_eng:S0653L01B01', { knownBefore: 'does it matter to you', knownAfter: 'does it matter to you sir', reason: 'F7: promote build to match lego' })
  await updatePhrase('spa_for_eng:S0653L01U03', { knownBefore: 'I wonder if it matters to you', knownAfter: 'I wonder if it matters to you sir', reason: 'F7' })
  await updatePhrase('spa_for_eng:S0653L01U04', { knownBefore: 'I think it matters to you', knownAfter: 'I think it matters to you madam', reason: 'F7' })
  await updatePhrase('spa_for_eng:S0653L01U05', { knownBefore: 'I want to know if it matters to you', knownAfter: 'I want to know if it matters to you madam', reason: 'F7' })

  // ---- F7: seed 655 (lego already vocative-marked; USE lines only) ----
  await updatePhrase('spa_for_eng:S0655L01U03', { knownBefore: "I can see you're doing it well", knownAfter: "I can see you're doing it well madam", reason: 'F7' })
  await updatePhrase('spa_for_eng:S0655L01U04', { knownBefore: "I wonder if you know how well you're doing it", knownAfter: "I wonder if you know how well you're doing it sir", reason: 'F7' })
  await updatePhrase('spa_for_eng:S0655L01U05', { knownBefore: "you're doing it so well", knownAfter: "you're doing it so well madam", reason: 'F7' })

  // ---- F7 bonus leak: seed 642 ----
  await updateLego(642, 2, {
    knownBefore: 'you feel', targetBefore: 'se siente',
    knownAfter: 'you feel madam',
    reason: 'F7 bonus leak: 3-way collision surface with te sientes@40 / te sientas@542'
  })
  await updatePhrase('spa_for_eng:S0642L02B01', { knownBefore: 'you feel', knownAfter: 'you feel madam', reason: 'F7 bonus leak' })

  console.log(`\n=== Done. ${log.length} actions ${DRY_RUN ? 'planned (dry run, no writes)' : 'applied'}. ===`)
  require('fs').writeFileSync(
    require('path').join(__dirname, DRY_RUN ? '_foldins_dryrun_log.json' : '_foldins_applied_log.json'),
    JSON.stringify(log, null, 2)
  )
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
