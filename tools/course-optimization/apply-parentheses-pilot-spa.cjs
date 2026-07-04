// Applies the no-parentheses house law (ralph-methodology.md, "No Parentheses, Ever",
// 2026-07-04) to spa_for_eng — the pilot course. Scope: the 9 parenthetical hits found by
// audit-parentheticals.cjs, ALL of which live in course_legos.components (no lego known_text
// or phrase known_text hits in this course).
//
// 8 of 9 are a "stale duplicate" bug, not a new house-law replacement: course_legos.components
// is an independently-stored JSONB snapshot that drifts from the course_practice_phrases
// phrase_role='component' sibling row (documented architecture quirk, cue-library-v1-spa.md
// "THE CUE LIVES IN WHAT THE LEARNER SEES"). For these 8, the sibling phrase row was already
// cleaned in an earlier pass (reads bare, e.g. known:"you") but the lego's own components JSON
// was never synced, so the learner-facing decomposition (LegoAssembly.vue, fed by
// course_legos.components via bundle.ts/cycles.ts) still renders the parenthetical. Fix: sync
// the component's `known` field to the already-established bare form. target/lego-level
// known_text/target_text are untouched — zero ZUT/recall exposure, since recall is tested
// against the lego/phrase known_text, not the component-breakdown label.
//
// The 9th (S0239L02 "likes (to her/him it pleases)") has no clean sibling and is a genuine
// explanatory-construction gloss (gustar-type impersonal verb) with no established
// natural-example replacement pattern — left untouched, logged to the owner decision list.
//
// Usage:
//   DRY_RUN=1 node apply-parentheses-pilot-spa.cjs        # print planned changes
//   SEEDS=332 node apply-parentheses-pilot-spa.cjs        # apply one seed (per-seed commits)
//   SEEDS=332,398 node apply-parentheses-pilot-spa.cjs
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { supabase } = require('../../services/supabase-client.cjs')

const COURSE = 'spa_for_eng'
const DRY_RUN = process.env.DRY_RUN === '1'
const SEEDS = process.env.SEEDS ? process.env.SEEDS.split(',').map(Number) : null

const log = []
function record(action, detail) {
  log.push({ action, ...detail })
  console.log(`[${action}]`, JSON.stringify(detail))
}
function assertEq(label, actual, expected) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) {
    throw new Error(`ASSERTION FAILED for ${label}: expected ${e}, got ${a} — aborting, DB state does not match verified BEFORE state.`)
  }
}

async function getLego(seed, legoIndex) {
  const { data, error } = await supabase.from('course_legos').select('*')
    .eq('course_code', COURSE).eq('seed_number', seed).eq('lego_index', legoIndex).single()
  if (error) throw new Error(`lego S${seed}L${legoIndex} not found: ${error.message}`)
  return data
}

// Each action: sync one component's `known` field to the value already established by the
// course_practice_phrases sibling row (verified 1:1 by hand against live data before authoring
// this list — see docs/course-optimization/parentheses-pilot-spa.md).
const ACTIONS = [
  { seed: 332, legoIndex: 2, componentIndex: 1, knownBefore: 'new (feminine)', knownAfter: 'new',
    reason: 'stale-duplicate component JSON; sibling S0332L02C02 already reads bare "new"' },
  { seed: 398, legoIndex: 1, componentIndex: 2, knownBefore: 'patient (plural)', knownAfter: 'patient',
    reason: 'stale-duplicate component JSON; sibling S0398L01C03 already reads bare "patient"' },
  { seed: 454, legoIndex: 1, componentIndex: 0, knownBefore: 'the (time)', knownAfter: 'the',
    reason: 'stale-duplicate component JSON; sibling S0454L01C01 already reads bare "the"' },
  { seed: 642, legoIndex: 2, componentIndex: 0, knownBefore: 'you (reflexive)', knownAfter: 'you',
    reason: 'stale-duplicate component JSON; sibling S0642L02C01 already reads bare "you". ' +
      'Note: seed 642 has a separate, pre-existing, documented bare-USE-line ZUT collision ' +
      '(cue-library-v1-spa.md: se siente vs te sientes@40 / te sientas@542) — untouched by this fix.' },
  { seed: 645, legoIndex: 1, componentIndex: 1, knownBefore: 'you (formal)', knownAfter: 'you',
    reason: 'stale-duplicate component JSON; sibling S0645L01C02 already reads bare "you" (register carried by U01/U02 vocative siblings)' },
  { seed: 653, legoIndex: 1, componentIndex: 0, knownBefore: 'you (formal)', knownAfter: 'you',
    reason: 'stale-duplicate component JSON; sibling S0653L01C01 already reads bare "you" (register already carried by the lego\'s own known_text "does it matter to you sir")' },
  { seed: 657, legoIndex: 1, componentIndex: 0, knownBefore: 'you all (reflexive)', knownAfter: 'you all',
    reason: 'stale-duplicate component JSON; sibling S0657L01C01 already reads bare "you all"' },
  { seed: 667, legoIndex: 1, componentIndex: 0, knownBefore: 'you all (indirect)', knownAfter: 'you all',
    reason: 'stale-duplicate component JSON; sibling S0667L01C01 already reads bare "you all"' },
]

async function applyAction(a) {
  const lego = await getLego(a.seed, a.legoIndex)
  const before = lego.components
  assertEq(`S${a.seed}L${a.legoIndex} components[${a.componentIndex}].known`, before?.[a.componentIndex]?.known, a.knownBefore)

  const after = before.map((c, i) => i === a.componentIndex ? { ...c, known: a.knownAfter } : c)
  record('UPDATE_LEGO_COMPONENTS', {
    id: lego.id, seed: a.seed, legoIndex: a.legoIndex,
    before: before[a.componentIndex], after: after[a.componentIndex],
    reason: a.reason
  })
  if (!DRY_RUN) {
    const { error } = await supabase.from('course_legos')
      .update({ components: after, presentation_audio_id: null })
      .eq('id', lego.id)
    if (error) throw error
  }
}

async function main() {
  const actions = ACTIONS.filter(a => !SEEDS || SEEDS.includes(a.seed))
  console.log(`=== ${DRY_RUN ? 'DRY RUN' : 'LIVE APPLY'}: parentheses pilot on ${COURSE}, seeds ${actions.map(a => a.seed).join(',')} ===\n`)
  for (const a of actions) await applyAction(a)
  console.log(`\n=== Done. ${log.length} actions ${DRY_RUN ? 'planned (dry run, no writes)' : 'applied'}. ===`)
  const out = path.join(__dirname, DRY_RUN ? 'parentheses-pilot-spa-dryrun-log.json' : 'parentheses-pilot-spa-applied-log.json')
  let prior = []
  if (!DRY_RUN && fs.existsSync(out)) prior = JSON.parse(fs.readFileSync(out, 'utf8'))
  fs.writeFileSync(out, JSON.stringify([...prior, ...log], null, 2))
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
