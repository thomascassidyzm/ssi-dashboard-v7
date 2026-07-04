// ZUT membership-failure fix sweep — fra_for_eng, batch 2/2 (component-role rows only).
// Follow-up to zut-violation-sweep-pilot-fra-40.md's methodology, applied to
// scripts/zut-membership-triage/batch-fra_for_eng-2.json (36 course_practice_phrases
// rows with phrase_role:'component' whose target_text failed the substring-containment
// membership check against its own seed's target_text).
//
// Each of the 36 was read against its own seed's full sentence + every sibling row
// at the same seed_number before classifying (see docs/course-optimization/
// zut-triage-fra-batch2.md for the per-row read). 32/36 are orphans — the
// component's target has zero relation to its own seed's sentence, and in every
// case a correct BUILD/USE/LEGO row elsewhere in the course already teaches the
// real chunk. Per Tom's law #1 ("if in doubt, cut it out") and the pilot's
// established action for this exact defect class: DELETE. Zero learner-facing
// content removed — only stray/orphaned tiling artifacts.
//
// The other 4 are NOT orphans and are explicitly excluded from this deletion list
// (logged, no action):
//   - S0093L01C02 "time to"->"temps de": elision mismatch only ("temps d'y" in the
//     real sentence vs dictionary "temps de") — genuinely part of the sentence.
//   - S0055L02C02 "didn't sleep"->"n'ai pas dormi": interposed words ("très bien")
//     between "pas" and "dormi" in the real sentence — genuinely part of the sentence.
//   - S0440L02C01 "while"->"pendant que": elision mismatch ("pendant qu'ils" vs
//     dictionary "pendant que") — genuinely part of the sentence.
//   - S0140L01C01 "I can't"->"je ne peux pas": the seed's own master sentence uses a
//     different construction ("de ne pas pouvoir voir") than the LEGO at this index
//     ("je ne peux pas voir", confirmed used verbatim in that LEGO's own build/use
//     rows) — a LEGO-paraphrases-master-sentence case, not a stray/mislabeled row.
//     Flagged for a policy call, not blindly cut.
//
// Usage:
//   DRY_RUN=1 node apply-zut-triage-fra-batch2.cjs   # print planned deletes
//   node apply-zut-triage-fra-batch2.cjs             # apply live
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { supabase } = require('../../services/supabase-client.cjs')

const COURSE = 'fra_for_eng'
const DRY_RUN = process.env.DRY_RUN === '1'

const DELETIONS = [
  { id: 'fra_for_eng:S0244L01C02', seed: 244, knownBefore: 'did not understand', targetBefore: "n'a pas compris",
    reason: 'orphan: seed 244 sentence is "I\'ve learnt a lot already"/"j\'ai déjà beaucoup appris" — zero relation to "did not understand".' },
  { id: 'fra_for_eng:S0220L01C01', seed: 220, knownBefore: 'she', targetBefore: 'elle',
    reason: 'orphan: seed 220 sentence is "did you watch a bit of television?"/"avez-vous regardé un peu de télévision?" — no "elle".' },
  { id: 'fra_for_eng:S0241L01C01', seed: 241, knownBefore: 'I', targetBefore: "j'ai",
    reason: 'orphan: seed 241 sentence is "I don\'t want to give it to him"/"Je ne veux pas le lui donner" — no "j\'ai".' },
  { id: 'fra_for_eng:S0223L01C01', seed: 223, knownBefore: 'I', targetBefore: 'je',
    reason: 'orphan: seed 223 sentence is "he\'s going to ask you tomorrow"/"il va vous demander demain" — no "je".' },
  { id: 'fra_for_eng:S0215L02C01', seed: 215, knownBefore: 'it takes time', targetBefore: 'ça prend du temps',
    reason: 'orphan: seed 215 sentence is "I went out on Saturday night"/"Je suis sorti samedi soir" — zero relation.' },
  { id: 'fra_for_eng:S0211L01C02', seed: 211, knownBefore: 'know', targetBefore: 'sais',
    reason: 'orphan: seed 211 sentence is "they told us that they didn\'t want to explain"/"ils nous ont dit qu\'ils ne voulaient pas expliquer" — no "sais".' },
  { id: 'fra_for_eng:S0214L01C01', seed: 214, knownBefore: 'she', targetBefore: 'elle',
    reason: 'orphan: seed 214 sentence is "did you have a good time at the weekend?"/"avez-vous passé un bon moment le week-end?" — no "elle".' },
  { id: 'fra_for_eng:S0214L02C01', seed: 214, knownBefore: 'how to answer', targetBefore: 'comment répondre',
    reason: 'orphan: seed 214 sentence (see above) — no relation to "how to answer".' },
  { id: 'fra_for_eng:S0218L02C01', seed: 218, knownBefore: 'what to do', targetBefore: 'quoi faire',
    reason: 'orphan: seed 218 sentence is "I didn\'t do much on Sunday"/"Je n\'ai pas fait grand-chose dimanche" — no relation.' },
  { id: 'fra_for_eng:S0218L02C02', seed: 218, knownBefore: 'next', targetBefore: 'ensuite',
    reason: 'orphan: seed 218 sentence (see above) — no "ensuite".' },
  { id: 'fra_for_eng:S0219L01C02', seed: 219, knownBefore: 'knew', targetBefore: 'savait',
    reason: 'orphan: seed 219 sentence is "it was nice to relax for a while"/"c\'était agréable de se détendre pendant un moment" — no "savait".' },
  { id: 'fra_for_eng:S0230L01C02', seed: 230, knownBefore: 'did not believe', targetBefore: 'ne croyais pas',
    reason: 'orphan: seed 230 sentence is "I know a young man who wants to work with you"/"Je connais un jeune homme qui veut travailler avec vous" — no relation.' },
  { id: 'fra_for_eng:S0241L01C02', seed: 241, knownBefore: 'understood', targetBefore: 'compris',
    reason: 'orphan: seed 241 sentence (see S0241L01C01 above) — no "compris".' },
  { id: 'fra_for_eng:S0213L01C02', seed: 213, knownBefore: 'knows', targetBefore: 'sait',
    reason: 'orphan: seed 213 sentence is "we don\'t know what they\'re trying to achieve"/"nous ne savons pas ce qu\'ils essaient d\'accomplir" — has "savons" (we), not "sait" (he/she); wrong subject, zero relation.' },
  { id: 'fra_for_eng:S0227L01C02', seed: 227, knownBefore: 'believe', targetBefore: 'croyons',
    reason: 'orphan: seed 227 sentence is "that man is going to tell me something new"/"cet homme va me dire quelque chose de nouveau" — no "croyons".' },
  { id: 'fra_for_eng:S0215L02C02', seed: 215, knownBefore: 'to', targetBefore: 'pour',
    reason: 'orphan: seed 215 sentence (see S0215L02C01 above) — no "pour".' },
  { id: 'fra_for_eng:S0245L01C02', seed: 245, knownBefore: 'understood', targetBefore: 'avons compris',
    reason: 'orphan: seed 245 sentence is "I\'m happy with how much I\'ve done in a short time"/"Je suis content de ce que j\'ai fait en peu de temps" — no "compris".' },
  { id: 'fra_for_eng:S0213L02C01', seed: 213, knownBefore: 'how to find', targetBefore: 'comment trouver',
    reason: 'orphan: seed 213 sentence (see S0213L01C02 above) — no relation.' },
  { id: 'fra_for_eng:S0235L01C02', seed: 235, knownBefore: 'understand', targetBefore: 'comprends',
    reason: 'orphan: seed 235 sentence is "I met someone who said that he wanted to tell you something"/"j\'ai rencontré quelqu\'un qui a dit qu\'il voulait te dire quelque chose" — no "comprends".' },
  { id: 'fra_for_eng:S0237L01C02', seed: 237, knownBefore: 'understands', targetBefore: 'comprend',
    reason: 'orphan: seed 237 sentence is "he wanted me to tell you before the weekend"/"il voulait que je te dise avant le weekend" — no "comprend".' },
  { id: 'fra_for_eng:S0220L01C02', seed: 220, knownBefore: 'did not know', targetBefore: 'ne savait pas',
    reason: 'orphan: seed 220 sentence (see S0220L01C01 above) — no relation.' },
  { id: 'fra_for_eng:S0214L01C02', seed: 214, knownBefore: 'does not know', targetBefore: 'ne sait pas',
    reason: 'orphan: seed 214 sentence (see S0214L01C01 above) — no relation.' },
  { id: 'fra_for_eng:S0215L01C02', seed: 215, knownBefore: 'know', targetBefore: 'savons',
    reason: 'orphan: seed 215 sentence (see S0215L02C01 above) — no "savons".' },
  { id: 'fra_for_eng:S0219L01C01', seed: 219, knownBefore: 'he', targetBefore: 'il',
    reason: 'orphan: seed 219 sentence (see S0219L01C02 above) — no "il".' },
  { id: 'fra_for_eng:S0223L01C02', seed: 223, knownBefore: 'believe', targetBefore: 'crois',
    reason: 'orphan: seed 223 sentence (see S0223L01C01 above) — no "crois".' },
  { id: 'fra_for_eng:S0238L01C01', seed: 238, knownBefore: 'she', targetBefore: 'elle',
    reason: 'orphan: seed 238 sentence is "he wanted you to tell me yesterday"/"il voulait que tu me dises hier" — no "elle".' },
  { id: 'fra_for_eng:S0243L02C01', seed: 243, knownBefore: 'everything we said', targetBefore: 'tout ce que nous avons dit',
    reason: 'orphan: seed 243 sentence is "I\'m going to ask for the same thing to eat"/"Je vais demander la même chose à manger" — zero relation.' },
  { id: 'fra_for_eng:S0236L01C02', seed: 236, knownBefore: 'do not understand', targetBefore: 'ne comprends pas',
    reason: 'orphan: seed 236 sentence is "I know someone who said that she was going to try to help"/"Je connais quelqu\'un qui a dit qu\'elle allait essayer d\'aider" — no relation.' },
  { id: 'fra_for_eng:S0219L02C01', seed: 219, knownBefore: 'what he wanted', targetBefore: "ce qu'il voulait",
    reason: 'orphan: seed 219 sentence (see S0219L01C02 above) — no relation.' },
  { id: 'fra_for_eng:S0234L02C02', seed: 234, knownBefore: 'so quickly', targetBefore: 'si vite',
    reason: 'orphan: seed 234 sentence is "I met someone last night who works with your brother"/"j\'ai rencontré quelqu\'un la nuit dernière qui travaille avec ton frère" — no relation.' },
  { id: 'fra_for_eng:S0234L02C01', seed: 234, knownBefore: 'that it would happen', targetBefore: 'que ça arriverait',
    reason: 'orphan: seed 234 sentence (see S0234L02C02 above) — no relation.' },
  { id: 'fra_for_eng:S0211L02C02', seed: 211, knownBefore: 'time', targetBefore: 'le temps',
    reason: 'orphan: seed 211 sentence (see S0211L01C02 above) — no "temps".' },
]

const log = []
function record(action, detail) {
  log.push({ action, ...detail })
  console.log(`[${action}]`, JSON.stringify(detail))
}

async function main() {
  console.log(`=== ${DRY_RUN ? 'DRY RUN' : 'LIVE APPLY'}: ZUT triage fra_for_eng batch 2 — cut ${DELETIONS.length} confirmed-orphan components ===\n`)
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
  const out = path.join(__dirname, DRY_RUN ? 'zut-triage-fra-batch2-dryrun-log.json' : 'zut-triage-fra-batch2-applied-log.json')
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
