// ZUT violation sweep PILOT (fra_for_eng, first 40 violationsStrict groups from
// zut-audit-fra_for_eng.json). Of the 40, only 3 groups had a confirmed,
// verifiable defect with a clean fix — in every case the defect was an orphan
// `course_practice_phrases` row with phrase_role:'component' whose known_text
// was mislabeled relative to its own seed's master sentence (verified against
// sibling rows at the same seed/lego_index — see PILOT report). Renaming was
// rejected as unsafe (a generic replacement label like "to" would immediately
// collide with dozens of other "to" components elsewhere in the course), so
// per Tom's law #1 ("if in doubt, cut it out") the fix is DELETE — the
// correctly-combined BUILD/USE phrase teaching the full chunk already exists
// and is untouched.
//
// The other 37 groups are NOT mechanical defects: they are grammatically
// required agreement/government variation (gender, number, reflexive-pronoun,
// verb-preposition-government) or genuine synonym/register choices, and are
// logged as taste-fork decision candidates in the PILOT report — no action.
//
// Usage:
//   DRY_RUN=1 node apply-zut-pilot-fra-40.cjs   # print planned deletes
//   node apply-zut-pilot-fra-40.cjs             # apply live
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { supabase } = require('../../services/supabase-client.cjs')

const COURSE = 'fra_for_eng'
const DRY_RUN = process.env.DRY_RUN === '1'

// Confirmed mislabeled/orphan `component` rows — see readable-context dump in
// this pilot's working notes. Each entry's knownBefore/targetBefore is the
// exact live value asserted before delete; the script aborts if drift.
const DELETIONS = [
  {
    id: 'fra_for_eng:S0164L01C01', seed: 164,
    knownBefore: 'an interesting', targetBefore: 'un livre',
    reason: 'book/9: adjective-noun word-order crossing — component pairs got swapped ' +
      '(target "un livre"="a book" mislabeled against known "an interesting"). Sibling ' +
      'S0164L01C02 is the matching swapped half. BUILD phrase S0164L01B01 already teaches ' +
      'the correct combined chunk "an interesting book"->"un livre intéressant".',
  },
  {
    id: 'fra_for_eng:S0164L01C02', seed: 164,
    knownBefore: 'book', targetBefore: 'intéressant',
    reason: 'book/9: other half of the same word-order-crossing pair as S0164L01C01.',
  },
  {
    id: 'fra_for_eng:S0364L04C02', seed: 364,
    knownBefore: 'that', targetBefore: 'dire',
    reason: 'that/21: orphan of the idiom "entendu dire" ("heard tell") — "dire" has no ' +
      'clean 1:1 English word match; forcing this component split mislabeled it as "that". ' +
      'BUILD phrase S0364L04B01 already teaches the correct combined chunk ' +
      '"I heard that"->"j\'ai entendu dire".',
  },
  {
    id: 'fra_for_eng:S0428L02C02', seed: 428,
    knownBefore: 'to pay', targetBefore: 'rendre',
    reason: 'to pay/40: orphan of "rendre visite" ("to visit") — master sentence for seed ' +
      '428 lego 2 is entirely about visiting, not paying ("would they like to VISIT us"). ' +
      'Renaming to the accurate label ("to") was rejected: it would immediately collide ' +
      'with many other unrelated "to" components course-wide. BUILD phrase S0428L02B01 ' +
      'already teaches the correct combined chunk "to visit us"->"nous rendre visite".',
  },
]

const log = []
function record(action, detail) {
  log.push({ action, ...detail })
  console.log(`[${action}]`, JSON.stringify(detail))
}

async function main() {
  console.log(`=== ${DRY_RUN ? 'DRY RUN' : 'LIVE APPLY'}: ZUT pilot fra_for_eng — cut ${DELETIONS.length} confirmed-orphan components ===\n`)
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
  const out = path.join(__dirname, DRY_RUN ? 'zut-pilot-fra-40-dryrun-log.json' : 'zut-pilot-fra-40-applied-log.json')
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
