// ZUT membership-failure fix sweep — the 6 unambiguous near-miss/contraction
// fixes found across all 4 triage batches (fra1, fra2, spa1, spa2). Each is a
// component row that IS genuinely about its own seed but whose target_text is
// slightly off (contraction, elision, or grammatical agreement), where the
// correct form is unambiguously derivable from the seed's own target sentence
// or an identical-known sibling row. See docs/course-optimization/
// zut-triage-fra-batch2.md and the scripts/zut-membership-triage/results-*.json
// files for full per-row evidence.
//
// Uses the same gated edit pattern as PATCH /phrases/:id (qa.cjs): write the
// update, then call checkEditedPhrase to verify no new ZUT collision was
// introduced (component known-side is exempt; target-membership is
// re-checked against the seed) — reverts automatically if not ok.
//
// Usage:
//   DRY_RUN=1 node apply-zut-triage-nearmiss-fixes.cjs   # print planned edits
//   node apply-zut-triage-nearmiss-fixes.cjs             # apply live
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { supabase } = require('../../services/supabase-client.cjs')
const { checkEditedPhrase } = require('../../services/course-builder/lib/zut-gate.cjs')

const DRY_RUN = process.env.DRY_RUN === '1'

const EDITS = [
  { id: 'fra_for_eng:S0664L01C01', course: 'fra_for_eng', seed: 664, knownBefore: 'are you ready', targetBefore: 'êtes-vous prêt', targetAfter: 'êtes-vous prêts',
    reason: 'Number-agreement slip: seed is plural ("are you all ready?"->"Êtes-vous tous prêts ?"). Sibling LEGO/component already use plural "prêts".' },
  { id: 'fra_for_eng:S0093L01C02', course: 'fra_for_eng', seed: 93, knownBefore: 'time to', targetBefore: 'temps de', targetAfter: "temps d'",
    reason: 'Elision: seed is "il est temps d\'y aller maintenant" (de+y -> d\'y). Corrected form matches the seed\'s own text exactly.' },
  { id: 'fra_for_eng:S0440L02C01', course: 'fra_for_eng', seed: 440, knownBefore: 'while', targetBefore: 'pendant que', targetAfter: "pendant qu'",
    reason: 'Elision: seed is "...pendant qu\'ils sont encore jeunes" (que+ils -> qu\'ils). Corrected form matches the seed\'s own text exactly.' },
  { id: 'spa_for_eng:S0419L02C01', course: 'spa_for_eng', seed: 419, knownBefore: 'likes', targetBefore: 'aprecia', targetAfter: 'aprecie',
    reason: 'Mood slip: seed is "si quieren que la gente les aprecie" (subjunctive, governed by "quieren que"). Sibling build row at the same lego_index already uses "aprecie".' },
  { id: 'spa_for_eng:S0427L01C01', course: 'spa_for_eng', seed: 427, knownBefore: 'you thought', targetBefore: 'pensabas', targetAfter: 'pensaras',
    reason: 'Mood slip: seed is "no les gustaría que pensaras que están aburridos" (subjunctive). LEGO + sibling build row at the same lego_index already use "pensaras".' },
  { id: 'spa_for_eng:S0426L04C01', course: 'spa_for_eng', seed: 426, knownBefore: 'unhappy', targetBefore: 'infeliz', targetAfter: 'infelices',
    reason: 'Number-agreement slip: seed requires plural ("they\'re unhappy" -> "están infelices"). Identical-known sibling LEGO/build already use plural "infelices".' },
]

const log = []
function record(action, detail) {
  log.push({ action, ...detail })
  console.log(`[${action}]`, JSON.stringify(detail))
}

async function main() {
  console.log(`=== ${DRY_RUN ? 'DRY RUN' : 'LIVE APPLY'}: ZUT triage near-miss fixes — edit ${EDITS.length} rows ===\n`)
  for (const e of EDITS) {
    const { data: row, error } = await supabase.from('course_practice_phrases').select('*')
      .eq('id', e.id).eq('course_code', e.course).maybeSingle()
    if (error) throw error
    if (!row) { record('SKIP_ALREADY_GONE', { id: e.id }); continue }
    if (row.known_text !== e.knownBefore || row.target_text !== e.targetBefore) {
      throw new Error(`ASSERTION FAILED for ${e.id}: expected known="${e.knownBefore}" target="${e.targetBefore}", ` +
        `got known="${row.known_text}" target="${row.target_text}" — aborting, DB state drifted from verified BEFORE state.`)
    }
    if (DRY_RUN) {
      record('EDIT_NEAR_MISS_COMPONENT_PLANNED', { id: e.id, seed: e.seed, known: row.known_text, before: row.target_text, after: e.targetAfter, reason: e.reason })
      continue
    }
    const revertFields = { known_text: row.known_text, target_text: row.target_text, updated_at: row.updated_at }
    const { error: updErr } = await supabase.from('course_practice_phrases').update({ target_text: e.targetAfter, updated_at: new Date().toISOString() })
      .eq('id', e.id).eq('course_code', e.course)
    if (updErr) throw updErr
    const zutCheck = await checkEditedPhrase(supabase, e.course, {
      table: 'course_practice_phrases', id: e.id, known: row.known_text, target: e.targetAfter,
      role: row.phrase_role, seedNumber: row.seed_number, revertFields,
    })
    if (!zutCheck.ok) {
      record('EDIT_REJECTED_ZUT_COLLISION', { id: e.id, seed: e.seed, attempted: e.targetAfter, collisions: zutCheck.collisions })
      continue
    }
    record('EDIT_NEAR_MISS_COMPONENT', { id: e.id, seed: e.seed, known: row.known_text, before: e.targetBefore, after: e.targetAfter, reason: e.reason })
  }
  console.log(`\n=== Done. ${log.length} actions ${DRY_RUN ? 'planned (dry run, no writes)' : 'applied'}. ===`)
  const out = path.join(__dirname, DRY_RUN ? 'zut-triage-nearmiss-fixes-dryrun-log.json' : 'zut-triage-nearmiss-fixes-applied-log.json')
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
