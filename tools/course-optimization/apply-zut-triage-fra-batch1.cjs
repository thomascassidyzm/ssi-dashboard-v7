// ZUT membership-failure fix sweep — fra_for_eng, zut-triage-fra-batch1 (component-role rows only).
// Follow-up to zut-violation-sweep-pilot-fra-40.md's methodology (also see
// docs/course-optimization/zut-rescope-component-rows-2026-07-04.md), applied
// via a fan-out worker's per-row triage against each row's own seed + siblings.
// Batch 1/2 of fra_for_eng (36 items), see scripts/zut-membership-triage/results-fra_for_eng-1.json.
//
// Usage:
//   DRY_RUN=1 node $(basename $0)   # print planned deletes
//   node $(basename $0)                                # apply live
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { supabase } = require('../../services/supabase-client.cjs')

const COURSE = 'fra_for_eng'
const DRY_RUN = process.env.DRY_RUN === '1'

const DELETIONS = [
  { id: 'fra_for_eng:S0219L02C02', seed: 219, knownBefore: 'to say', targetBefore: 'dire',
    reason: 'Seed 219 is entirely about \'it was nice to relax for a while\'/\'c\'était agréable de se détendre pendant un moment\' — no mention of saying/telling anywhere. Sibling debris in this same seed_number (\'he\'->\'il\', \'knew\'->\'savait\', \'what he wanted\'->\'ce qu\'il voulait\') is also clearly cross-contaminated from an unrelated \'he knew what he wanted to say\' sentence elsewhere. Correct meaning of seed 219 is fully covered by its actual LEGO1/LEGO2 + build/use rows (\'it was nice to\'->\'c\'était agréable de\', \'relax for a while\'->\'se détendre pendant un moment\').' },
  { id: 'fra_for_eng:S0235L01C01', seed: 235, knownBefore: 'I', targetBefore: 'je',
    reason: 'No LEGO/BUILD row at this seed decomposes an isolated subject \'I\'/\'je\' — the actual lego-1 slot for this seed is \'said that he\'->\'a dit qu\'il\' and its variants (she/who/he said that he). Sibling debris \'understand\'->\'comprends\' at the same seed_number is unrelated garbage, confirming this row is cross-batch contamination rather than a genuine tiling unit. Full seed meaning is already correctly taught via its real LEGOs and the matching USE rows.' },
  { id: 'fra_for_eng:S0215L01C01', seed: 215, knownBefore: 'we', targetBefore: 'nous',
    reason: 'Seed 215 (\'I went out on Saturday night\'->\'Je suis sorti samedi soir\') is entirely first-person singular; \'nous\' appears nowhere in it. Sibling debris \'know\'->\'savons\' (a \'we\' form) at the same seed_number confirms this is contamination from a different, unrelated sentence. Seed\'s real meaning is fully covered by its actual LEGOs (\'went out\'->\'suis sorti\', \'on Saturday night\'->\'samedi soir\') and their build/use rows.' },
  { id: 'fra_for_eng:S0227L01C01', seed: 227, knownBefore: 'we', targetBefore: 'nous',
    reason: 'Seed 227 (\'that man is going to tell me something new\') has no \'we\'/\'nous\' content at all. Sibling debris \'believe\'->\'croyons\' (also a \'we\' form) at the same seed_number confirms cross-contamination. Seed\'s real meaning is fully covered by its actual LEGO/build/use rows about \'that man is going to tell me something new\'.' },
  { id: 'fra_for_eng:S0245L01C01', seed: 245, knownBefore: 'we', targetBefore: 'nous',
    reason: 'Seed 245 (\'I\'m happy with how much I\'ve done in a short time\') is entirely first-person singular; \'nous\' does not occur. Sibling debris \'understood\'->\'avons compris\' (a \'we\' form) at the same seed_number confirms cross-contamination. Seed\'s real meaning is fully covered by its actual LEGO1 and build/use rows.' },
  { id: 'fra_for_eng:S0211L01C01', seed: 211, knownBefore: 'I', targetBefore: 'je',
    reason: 'Seed 211 (\'they told us that they didn\'t want to explain\') has no first-person content; \'je\' does not occur. Sibling debris at this same seed_number/lego_index range (\'know\'->\'sais\', \'didn\'t want\'->\'ne voulaient\', \'time\'->\'le temps\') is also clearly contamination from unrelated sentences. Seed\'s real meaning is fully covered by its actual LEGO1-4 and build/use rows.' },
  { id: 'fra_for_eng:S0211L02C01', seed: 211, knownBefore: 'with', targetBefore: 'avec',
    reason: 'Same seed 211 as above — no \'with\'/\'avec\' content anywhere in \'they told us that they didn\'t want to explain\'. Confirmed contamination alongside the sibling orphan component at lego_index1 (\'I\'->\'je\') and others at this seed_number. Seed\'s real meaning is fully covered by its actual LEGO1-4 and build/use rows.' },
  { id: 'fra_for_eng:S0244L01C01', seed: 244, knownBefore: 'she', targetBefore: 'elle',
    reason: 'Seed 244 (\'I\'ve learnt a lot already\') is entirely first-person; no \'elle\' content. Sibling debris \'did not understand\'->\'n\'a pas compris\' (a third-person form) at the same seed_number confirms cross-contamination. Seed\'s real meaning is fully covered by its actual LEGO1 and build/use rows.' },
  { id: 'fra_for_eng:S0214L02C02', seed: 214, knownBefore: 'the question', targetBefore: 'à la question',
    reason: 'Seed 214 (\'did you have a good time at the weekend?\') has nothing to do with a question being asked. Sibling debris at the same seed_number (\'she\'->\'elle\', \'how to answer\'->\'comment répondre\', \'does not know\'->\'ne sait pas\') looks like leftovers from an unrelated \'she doesn\'t know how to answer the question\' sentence, confirming cross-contamination. Seed\'s real meaning is fully covered by its actual LEGO1/LEGO2 and build/use rows.' },
  { id: 'fra_for_eng:S0238L01C02', seed: 238, knownBefore: 'does not understand', targetBefore: 'ne comprend pas',
    reason: 'Seed 238 (\'he wanted you to tell me yesterday\') has no \'understand\' content whatsoever. Sibling debris \'she\'->\'elle\' at the same seed_number is also unrelated. Seed\'s real meaning is fully covered by its actual LEGO1/LEGO2 and build/use rows.' },
  { id: 'fra_for_eng:S0213L02C02', seed: 213, knownBefore: 'the right words', targetBefore: 'les bons mots',
    reason: 'Seed 213 (\'we don\'t know what they\'re trying to achieve\') has nothing to do with \'the right words\'. Sibling debris at the same seed_number (\'knows\'->\'sait\', \'how to find\'->\'comment trouver\', \'he\'->\'il\') looks like leftovers from an unrelated \'he doesn\'t know how to find the right words\' sentence, confirming cross-contamination. Seed\'s real meaning is fully covered by its actual LEGO1-4 and build/use rows.' },
  { id: 'fra_for_eng:S0453L03C01', seed: 453, knownBefore: 'yesterday', targetBefore: 'hier',
    reason: 'Seed 453 (\'did they say who they saw last night?\') uses \'la nuit dernière\' (last night), not \'hier\' (yesterday) — a different time expression, not present anywhere in the seed. The correct component for this lego_index3 slot is the sibling build row \'last night\'->\'la nuit dernière\', which already fully covers the meaning.' },
  { id: 'fra_for_eng:S0341L02C02', seed: 341, knownBefore: 'days ago', targetBefore: 'il y a jours',
    reason: '\'il y a jours\' is not valid French — the quantifier \'quelques\' cannot be omitted from \'il y a quelques jours\', and this exact string does not occur in the seed sentence. The full, grammatical meaning is already correctly taught by sibling LEGO2/build2/use2 \'a few days ago\'->\'il y a quelques jours\', so deleting this malformed row loses nothing.' },
  { id: 'fra_for_eng:S0453L03C02', seed: 453, knownBefore: 'evening', targetBefore: 'soir',
    reason: 'Same seed 453 as S0453L03C01 above; \'soir\' (evening) is also not what the seed says — it uses \'la nuit dernière\' (last night). Both C01 (\'yesterday\'->\'hier\') and C02 (\'evening\'->\'soir\') are wrong substitutes for the same lego_index3 slot, whose correct sibling (\'last night\'->\'la nuit dernière\') already fully covers the meaning — suggests a systematic mis-substitution into this slot rather than two independent errors.' },
  { id: 'fra_for_eng:S0242L01C02', seed: 242, knownBefore: 'did not understand', targetBefore: 'n\'ai pas compris',
    reason: 'Seed 242 (\'I want to give her more time\') has no \'understand\' content whatsoever. Seed\'s real meaning is fully covered by its actual LEGO1 \'give her more time\'->\'lui donner plus de temps\' and its build/use rows.' },
]

const log = []
function record(action, detail) {
  log.push({ action, ...detail })
  console.log(`[${action}]`, JSON.stringify(detail))
}

async function main() {
  console.log(`=== ${DRY_RUN ? 'DRY RUN' : 'LIVE APPLY'}: ZUT triage fra_for_eng zut-triage-fra-batch1 — cut ${DELETIONS.length} confirmed-orphan components ===\n`)
  for (const d of DELETIONS) {
    const { data: row, error } = await supabase.from('course_practice_phrases').select('*')
      .eq('id', d.id).eq('course_code', COURSE).maybeSingle()
    if (error) throw error
    if (!row) { record('SKIP_ALREADY_GONE', { id: d.id }); continue }
    if (row.known_text !== d.knownBefore || row.target_text !== d.targetBefore) {
      throw new Error(`ASSERTION FAILED for ${d.id}: expected known="${d.knownBefore}" target="${d.targetBefore}", ` +
        `got known="${row.known_text}" target="${row.target_text}" — aborting, DB state drifted from verified BEFORE state.`)
    }
    record('DELETE_ORPHAN_COMPONENT', { id: d.id, seed: d.seed, known: row.known_text, target: row.target_text, reason: d.reason })
    if (!DRY_RUN) {
      const { error: delErr } = await supabase.from('course_practice_phrases').delete().eq('id', d.id).eq('course_code', COURSE)
      if (delErr) throw delErr
    }
  }
  console.log(`\n=== Done. ${log.length} actions ${DRY_RUN ? 'planned (dry run, no writes)' : 'applied'}. ===`)
  const out = path.join(__dirname, DRY_RUN ? 'zut-triage-fra-batch1-dryrun-log.json' : 'zut-triage-fra-batch1-applied-log.json')
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
