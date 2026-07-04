// ZUT membership-failure fix sweep — spa_for_eng, zut-triage-spa-batch2 (component-role rows only).
// Follow-up to zut-violation-sweep-pilot-fra-40.md's methodology (also see
// docs/course-optimization/zut-rescope-component-rows-2026-07-04.md), applied
// via a fan-out worker's per-row triage against each row's own seed + siblings.
// Batch 2/2 of spa_for_eng (38 items), see scripts/zut-membership-triage/batch-spa_for_eng-2-classified.json.
//
// Usage:
//   DRY_RUN=1 node $(basename $0)   # print planned deletes
//   node $(basename $0)                                # apply live
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { supabase } = require('../../services/supabase-client.cjs')

const COURSE = 'spa_for_eng'
const DRY_RUN = process.env.DRY_RUN === '1'

const DELETIONS = [
  { id: 'spa_for_eng:S0182L01C01', seed: 182, knownBefore: 'I don\'t know how to', targetBefore: 'No sé cómo',
    reason: 'Zero relation to seed 182 (\'have you seen my keys anywhere?\') or any sibling at seed_number 182 (LEGOs: have you seen/anywhere/my keys/keys) — \'I don\'t know how to\'/\'No sé cómo\' shares no content; the correct build/use family for this seed is intact and unaffected.' },
  { id: 'spa_for_eng:S0122L02C01', seed: 122, knownBefore: 'Since last week', targetBefore: 'Desde la semana pasada',
    reason: 'Zero relation to seed 122 (\'starting to feel easier...excited...how it\'s going\') or any of its LEGOs/siblings (it is/to feel easier/excited/it goes) — \'Since last week\'/\'Desde la semana pasada\' shares no vocabulary with this seed\'s family.' },
  { id: 'spa_for_eng:S0118L01C01', seed: 118, knownBefore: 'She used to', targetBefore: 'Ella solía',
    reason: 'Zero relation to seed 118 (pub/feel better/we were) or its LEGOs (I felt/we were/the pub) — \'She used to\'/\'Ella solía\' is an imperfect-tense paradigm fragment with no connection to this seed.' },
  { id: 'spa_for_eng:S0127L01C01', seed: 127, knownBefore: 'A few months ago', targetBefore: 'Hace unos meses',
    reason: 'Zero relation to seed 127 (\'that isn\'t why I wanted to see you\') or its LEGOs (to see you/for/that) — \'A few months ago\'/\'Hace unos meses\' shares no vocabulary.' },
  { id: 'spa_for_eng:S0120L01C01', seed: 120, knownBefore: 'They used to', targetBefore: 'Solían',
    reason: 'Zero relation to seed 120 (\'interesting that you like to go by bus\') or its LEGOs (bus/to go/you like) — \'They used to\'/\'Solían\' is unrelated.' },
  { id: 'spa_for_eng:S0117L01C01', seed: 117, knownBefore: 'He used to', targetBefore: 'Él solía',
    reason: 'Zero relation to seed 117 (\'doing better...last time we talked\') or its LEGOs (we talked/the last time/definitely) — \'He used to\'/\'Él solía\' is unrelated.' },
  { id: 'spa_for_eng:S0143L02C01', seed: 143, knownBefore: 'If they tried', targetBefore: 'Si lo intentaran',
    reason: 'Zero relation to seed 143 (\'the same thing...talking about earlier\') or its LEGOs (we were talking/the same thing/earlier) — \'If they tried\'/\'Si lo intentaran\' is unrelated.' },
  { id: 'spa_for_eng:S0266L01C01', seed: 266, knownBefore: 'I shouldn\'t', targetBefore: 'No debería',
    reason: 'Zero relation to seed 266 (\'he was an old friend of my father\') — \'I shouldn\'t\'/\'No debería\' shares no vocabulary with this seed or any sibling.' },
  { id: 'spa_for_eng:S0118L02C01', seed: 118, knownBefore: 'When she lived there', targetBefore: 'Cuando vivía allí',
    reason: 'Zero relation to seed 118 (pub/feel better) beyond the trivial function word \'cuando\'/\'when\' — \'When she lived there\'/\'Cuando vivía allí\' is unrelated content; the seed\'s correct build/use family is untouched.' },
  { id: 'spa_for_eng:S0267L01C01', seed: 267, knownBefore: 'I should have', targetBefore: 'Debería haber',
    reason: 'Zero relation to seed 267 (\'have you heard from your friend?\') — \'I should have\'/\'Debería haber\' shares no vocabulary.' },
  { id: 'spa_for_eng:S0140L01C01', seed: 140, knownBefore: 'He could', targetBefore: 'Él podría',
    reason: 'Zero relation to seed 140 (\'sorry that I can\'t see what you\'re trying to show me\') — \'He could\'/\'Él podría\' is unrelated.' },
  { id: 'spa_for_eng:S0125L01C01', seed: 125, knownBefore: 'I\'ve had', targetBefore: 'He tenido',
    reason: 'Zero relation to seed 125 (\'I believe that your idea was very good\') — \'I\'ve had\'/\'He tenido\' is unrelated.' },
  { id: 'spa_for_eng:S0142L01C01', seed: 142, knownBefore: 'we could', targetBefore: 'podríamos',
    reason: 'Zero relation to seed 142 (\'that\'s very kind of you...grateful for helping\') — \'we could\'/\'podríamos\' is unrelated.' },
  { id: 'spa_for_eng:S0134L01C01', seed: 134, knownBefore: 'He\'ll be able to', targetBefore: 'Él podrá',
    reason: 'Zero relation to seed 134 (\'not a problem when you work at something difficult with them\') — "He\'ll be able to"/\'Él podrá\' is unrelated.' },
  { id: 'spa_for_eng:S0131L02C01', seed: 131, knownBefore: 'When I was there', targetBefore: 'Cuando estaba allí',
    reason: 'Zero relation to seed 131 (\'too many ideas going around in my head\') beyond the trivial function word \'cuando\' — \'When I was there\'/\'Cuando estaba allí\' is unrelated content.' },
  { id: 'spa_for_eng:S0117L02C01', seed: 117, knownBefore: 'When he was younger', targetBefore: 'Cuando era más joven',
    reason: 'Zero relation to seed 117 (\'doing better...last time we talked\') beyond trivial function words \'cuando\'/\'más\' — \'When he was younger\'/\'Cuando era más joven\' is unrelated.' },
  { id: 'spa_for_eng:S0131L01C01', seed: 131, knownBefore: 'I\'d like to have been able to', targetBefore: 'Me gustaría haber podido',
    reason: 'Zero relation to seed 131 (\'too many ideas going around in my head\'); overlap on \'me\'/\'gustaría\' is coincidental (those words recur in unrelated use-phrases elsewhere in the course, not in this seed\'s own family) — "I\'d like to have been able to"/\'Me gustaría haber podido\' is unrelated.' },
  { id: 'spa_for_eng:S0138L02C01', seed: 138, knownBefore: 'If I tried harder', targetBefore: 'Si me esforzara más',
    reason: 'Zero relation to seed 138 (\'this was where my friend wanted to meet us\') — \'If I tried harder\'/\'Si me esforzara más\' is unrelated.' },
  { id: 'spa_for_eng:S0123L02C01', seed: 123, knownBefore: 'A long time', targetBefore: 'Durante mucho tiempo',
    reason: 'Zero relation to seed 123 (\'I think that\'s a good idea\'); overlap on \'mucho\'/\'tiempo\' is coincidental (present in unrelated use-phrases elsewhere, not this seed\'s own family) — \'A long time\'/\'Durante mucho tiempo\' is unrelated.' },
  { id: 'spa_for_eng:S0274L01C01', seed: 274, knownBefore: 'They should', targetBefore: 'Deberían',
    reason: 'Zero relation to seed 274 (\'do you have to leave in a few days?\') — \'They should\'/\'Deberían\' is unrelated.' },
  { id: 'spa_for_eng:S0138L01C01', seed: 138, knownBefore: 'I could', targetBefore: 'Yo podría',
    reason: 'Zero relation to seed 138 (\'this was where my friend wanted to meet us\') — \'I could\'/\'Yo podría\' is unrelated.' },
  { id: 'spa_for_eng:S0125L02C01', seed: 125, knownBefore: 'A difficult few weeks', targetBefore: 'Unas semanas difíciles',
    reason: 'Zero relation to seed 125 (\'I believe that your idea was very good\') — \'A difficult few weeks\'/\'Unas semanas difíciles\' is unrelated.' },
  { id: 'spa_for_eng:S0196L01C01', seed: 196, knownBefore: 'I hope', targetBefore: 'espero',
    reason: 'Zero relation to seed 196 (\'have you heard the latest idea?\') — \'I hope\'/\'espero\' is unrelated.' },
  { id: 'spa_for_eng:S0278L01C01', seed: 278, knownBefore: 'it would be', targetBefore: 'sería',
    reason: 'Zero relation to seed 278 (\'did you have to finish everything last night?\') — \'it would be\'/\'sería\' is unrelated.' },
]

const log = []
function record(action, detail) {
  log.push({ action, ...detail })
  console.log(`[${action}]`, JSON.stringify(detail))
}

async function main() {
  console.log(`=== ${DRY_RUN ? 'DRY RUN' : 'LIVE APPLY'}: ZUT triage spa_for_eng zut-triage-spa-batch2 — cut ${DELETIONS.length} confirmed-orphan components ===\n`)
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
  const out = path.join(__dirname, DRY_RUN ? 'zut-triage-spa-batch2-dryrun-log.json' : 'zut-triage-spa-batch2-applied-log.json')
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
