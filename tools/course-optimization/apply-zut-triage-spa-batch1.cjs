// ZUT membership-failure fix sweep — spa_for_eng, zut-triage-spa-batch1 (component-role rows only).
// Follow-up to zut-violation-sweep-pilot-fra-40.md's methodology (also see
// docs/course-optimization/zut-rescope-component-rows-2026-07-04.md), applied
// via a fan-out worker's per-row triage against each row's own seed + siblings.
// Batch 1/2 of spa_for_eng (38 items), see scripts/zut-membership-triage/results-spa_for_eng-1.json.
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
  { id: 'spa_for_eng:S0132L01C01', seed: 132, knownBefore: 'I\'ll be able to', targetBefore: 'Podré',
    reason: 'Seed 132\'s sentence is entirely about "that\'s less exciting than what she was saying" (eso es menos emocionante que lo que ella estaba diciendo) — no future-tense "will be able" content at all. The lego_index=1 slot\'s real content is \'that\'->\'eso\', already present as both the LEGO and a build row.' },
  { id: 'spa_for_eng:S0106L01C01', seed: 106, knownBefore: 'Do you know what?', targetBefore: '¿Sabes qué?',
    reason: 'Seed 106 is "we don\'t need to feel happy, we just need to work hard" — no relation to \'do you know what\'. The lego_index=1 slot\'s real content, \'to feel happy\'->\'sentirnos contentos\', is already covered by the LEGO and multiple build/use rows.' },
  { id: 'spa_for_eng:S0269L01C01', seed: 269, knownBefore: 'You should', targetBefore: 'Deberías',
    reason: 'Seed 269 is "Why don\'t you want to wait for your father?" — nothing about \'you should\'. The lego_index=1 slot\'s real content \'wait for your father\'->\'esperar a tu padre\' is already covered by the LEGO and multiple build/use rows.' },
  { id: 'spa_for_eng:S0245L02C01', seed: 245, knownBefore: 'A bit more', targetBefore: 'un poco más',
    reason: 'Seed 245 is "I\'m happy with how much I\'ve done in a short time" — the lego_index=2 slot is really \'how much\'->\'lo mucho que\', already covered by the LEGO and several build/use rows; \'a bit more\' has no relation to this sentence.' },
  { id: 'spa_for_eng:S0183L01C01', seed: 183, knownBefore: 'I know where', targetBefore: 'Sé dónde',
    reason: 'Seed 183 is "no I\'m afraid I haven\'t seen them" — no relation to \'I know where\'. The lego_index=1 slot\'s real content, \'I\'m afraid\'->\'me temo\', is already covered by the LEGO and numerous build/use rows.' },
  { id: 'spa_for_eng:S0265L01C01', seed: 265, knownBefore: 'I should', targetBefore: 'Debería',
    reason: 'Seed 265 is just \'a friend\' -> \'un amigo\'; \'I should\' has zero relation to it. The lego_index=1 slot\'s real content is already covered by the LEGO \'a friend\'->\'un amigo\' and many build/use rows.' },
  { id: 'spa_for_eng:S0277L01C01', seed: 277, knownBefore: 'It might be', targetBefore: 'Podría ser',
    reason: 'Seed 277 is "yes I\'ve got an important meeting early next week" — no relation to \'it might be\'. The lego_index=1 slot\'s real content, \'a meeting\'->\'una reunión\', is already covered by the LEGO and multiple build/use rows.' },
  { id: 'spa_for_eng:S0052L01C01', seed: 52, knownBefore: 'The last time', targetBefore: 'La última vez',
    reason: 'Seed 52 is "he wanted to write a letter to his friend last week" — the lego_index=1 slot\'s real content is \'to write\'->\'escribir\', already covered by the LEGO and numerous build/use rows. \'The last time\' has no relation to this sentence.' },
  { id: 'spa_for_eng:S0270L01C01', seed: 270, knownBefore: 'You shouldn\'t', targetBefore: 'No deberías',
    reason: 'Seed 270 is "because I\'m worried that I\'m going to be late" — the lego_index=1 slot\'s real content is \'I am worried\'->\'me preocupa\', already covered by the LEGO and numerous build/use rows. \'You shouldn\'t\' has no relation to this sentence.' },
  { id: 'spa_for_eng:S0084L02C01', seed: 84, knownBefore: 'Better than before', targetBefore: 'Mejor que antes',
    reason: 'Seed 84 is "I don\'t agree with what he said about my friend" — the lego_index=2 slot\'s real content is \'my friend\'->\'mi amigo\', already covered by the LEGO and multiple build/use rows. \'Better than before\' has no relation to this sentence.' },
  { id: 'spa_for_eng:S0121L02C01', seed: 121, knownBefore: 'This morning', targetBefore: 'Esta mañana',
    reason: 'Seed 121 is "It\'s unusual that you don\'t like to use your car" — the lego_index=2 slot\'s real content is \'that you don\'t like\'->\'que no te guste\', already covered by the LEGO and multiple build/use rows. \'This morning\' has no relation.' },
  { id: 'spa_for_eng:S0126L01C01', seed: 126, knownBefore: 'I\'d had', targetBefore: 'Había tenido',
    reason: 'Seed 126 is "this work is changing the shape of my brain" — the lego_index=1 slot\'s real content is \'this work\'->\'este trabajo\', already covered by the LEGO and multiple build/use rows. "I\'d had" has no relation.' },
  { id: 'spa_for_eng:S0116L04C03', seed: 116, knownBefore: 'What could I make?', targetBefore: '¿Qué podría hacer?',
    reason: 'Seed 116 is "this isn\'t the best choice I could make" (esta no es la mejor opción que podría hacer) — a statement, not a question. The lego_index=4 slot\'s meaning is already fully covered by the LEGO/build rows and by the two correctly-matching sibling components created in the same batch (\'This isn\'t\'->\'Esta no es\', \'The best choice\'->\'La mejor opción\'); this third component is an extra, unrelated row from the same generation event.' },
  { id: 'spa_for_eng:S0259L01C01', seed: 259, knownBefore: 'Until now', targetBefore: 'Hasta ahora',
    reason: 'Seed 259 is just \'an idea\'->\'una idea\'; \'until now\' has no relation. The lego_index=1 slot is already covered by the LEGO and several build/use rows.' },
  { id: 'spa_for_eng:S0119L01C01', seed: 119, knownBefore: 'We used to', targetBefore: 'Solíamos',
    reason: 'Seed 119 is "Can I ask you something before you leave?" — the lego_index=1 slot\'s real content is \'you leave\'->\'te vayas\', already covered by the LEGO and several build/use rows. \'We used to\' has no relation.' },
  { id: 'spa_for_eng:S0275L01C01', seed: 275, knownBefore: 'It must be', targetBefore: 'Debe ser',
    reason: 'Seed 275 is just \'longer\'->\'más tiempo\'; \'it must be\' has no relation. The lego_index=1 slot is already covered by the LEGO and multiple build/use rows.' },
  { id: 'spa_for_eng:S0176L01C01', seed: 176, knownBefore: 'As far as I\'m concerned', targetBefore: 'En lo que a mí respecta',
    reason: 'Seed 176 is "I\'ll ask him if he\'ll be able to help next year" — the lego_index=1 slot\'s real content is "I\'ll ask him"->\'le preguntaré\', already covered by the LEGO and several build/use rows. This idiomatic component has no relation to the seed.' },
  { id: 'spa_for_eng:S0126L02C01', seed: 126, knownBefore: 'A very interesting conversation', targetBefore: 'Una conversación muy interesante',
    reason: 'Seed 126 is "this work is changing the shape of my brain" — the lego_index=2 slot\'s real content is \'Work\'->\'trabajo\', already covered by the LEGO and several build/use rows. \'A very interesting conversation\' has no relation.' },
  { id: 'spa_for_eng:S0128L02C01', seed: 128, knownBefore: 'For about a week', targetBefore: 'Durante más o menos una semana',
    reason: 'Seed 128 is "you\'re like someone I used to know" — the lego_index=2 slot\'s real content is \'like\'->\'como\', already covered by the LEGO and several build/use rows. \'For about a week\' has no relation.' },
  { id: 'spa_for_eng:S0142L02C01', seed: 142, knownBefore: 'If we tried', targetBefore: 'Si lo intentáramos',
    reason: 'Seed 142 is "that\'s very kind of you and I\'m grateful to you for helping" — the lego_index=2 slot\'s real content is "I\'m grateful"->\'agradezco\', already covered by the LEGO and several build/use rows. \'If we tried\' has no relation.' },
  { id: 'spa_for_eng:S0053L01C01', seed: 53, knownBefore: 'I\'ve had enough', targetBefore: 'Estoy harto',
    reason: 'Seed 53 is "She wanted to put his letter in her bag" — the lego_index=1 slot\'s real content is \'to put\'->\'poner\', already covered by the LEGO and several build/use rows. "I\'ve had enough" has no relation.' },
  { id: 'spa_for_eng:S0134L02C01', seed: 134, knownBefore: 'Everything he hears', targetBefore: 'Todo lo que escuche',
    reason: 'Seed 134 is "It\'s not a problem when you work at something difficult with them" — the lego_index=2 slot\'s real content is \'at something difficult\'->\'en algo difícil\', already covered by the LEGO and several build/use rows. \'Everything he hears\' has no relation.' },
  { id: 'spa_for_eng:S0143L01C01', seed: 143, knownBefore: 'they could', targetBefore: 'podrían',
    reason: 'Seed 143 is "It\'s the same thing as we were talking about earlier" — the lego_index=1 slot\'s real content is \'the same thing\'->\'lo mismo\', already covered by the LEGO and a build row. \'they could\'->\'podrían\' has no relation.' },
  { id: 'spa_for_eng:S0135L01C01', seed: 135, knownBefore: 'She\'ll be able to', targetBefore: 'Ella podrá',
    reason: 'Seed 135 is "I don\'t know why you think that it\'s so good" — the lego_index=1 slot\'s real content is "I don\'t know"->\'no sé\', already covered by the LEGO and several build/use rows. "She\'ll be able to" has no relation.' },
  { id: 'spa_for_eng:S0141L01C01', seed: 141, knownBefore: 'She could', targetBefore: 'Ella podría',
    reason: 'Seed 141 is "no problem. Everything is okay" — the lego_index=1 slot\'s real content is \'problem\'->\'problema\', already covered by the LEGO and several build/use rows. \'She could\' has no relation.' },
  { id: 'spa_for_eng:S0130L01C01', seed: 130, knownBefore: 'I\'d like to be able to', targetBefore: 'Me gustaría poder',
    reason: 'Seed 130 is "that was a surprise, because he\'s my friend" — the lego_index=1 slot\'s real content is \'surprise\'->\'sorpresa\', already covered by the LEGO and several build/use rows. "I\'d like to be able to" has no relation.' },
  { id: 'spa_for_eng:S0136L01C01', seed: 136, knownBefore: 'We\'ll be able to', targetBefore: 'Podremos',
    reason: 'Seed 136 is "Of course you can ask her because she\'s my friend" — the lego_index=1 slot\'s real content is \'of course\'->\'claro que\', already covered by the LEGO and several use rows. "We\'ll be able to" has no relation.' },
  { id: 'spa_for_eng:S0128L01C01', seed: 128, knownBefore: 'I haven\'t been able to', targetBefore: 'No he podido',
    reason: 'Seed 128 is "you\'re like someone I used to know" — the lego_index=1 slot\'s real content is \'you are\'->\'eres\', already covered by the LEGO and several build/use rows. "I haven\'t been able to" has no relation.' },
]

const log = []
function record(action, detail) {
  log.push({ action, ...detail })
  console.log(`[${action}]`, JSON.stringify(detail))
}

async function main() {
  console.log(`=== ${DRY_RUN ? 'DRY RUN' : 'LIVE APPLY'}: ZUT triage spa_for_eng zut-triage-spa-batch1 — cut ${DELETIONS.length} confirmed-orphan components ===\n`)
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
  const out = path.join(__dirname, DRY_RUN ? 'zut-triage-spa-batch1-dryrun-log.json' : 'zut-triage-spa-batch1-applied-log.json')
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
