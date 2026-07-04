// Owner ruling (c) DELETE: spa_for_eng seed 115 lego 4, phrase 115|4|20 (U11) —
// mistranslation glued via "and" ("...I've been trying for a week" / "llevo una semana
// aprendiendo" actually means "I've been learning for a week"). Cut-it-out law: delete,
// don't patch. Run with DRY_RUN=1 to preview.
require('dotenv').config()
const { supabase } = require('../../services/supabase-client.cjs')

const COURSE = 'spa_for_eng'
const DRY_RUN = process.env.DRY_RUN === '1'
const log = []

function record(action, detail) {
  log.push({ action, ...detail })
  console.log(`[${action}]`, JSON.stringify(detail))
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
  console.log(`=== ${DRY_RUN ? 'DRY RUN' : 'LIVE APPLY'}: seed 115 cut-it-out delete on ${COURSE} ===\n`)

  await deletePhrase('spa_for_eng:S0115L04U11', {
    knownBefore: "I don't feel as if I'm ready to have a conversation and I've been trying for a week",
    targetBefore: 'No siento como si estuviera listo para tener una conversación y llevo una semana aprendiendo',
    reason: "owner ruling (c) DELETE, cut-it-out law: 'llevo una semana aprendiendo' means 'I've been learning for a week', not 'trying' — mistranslation glued onto an unrelated main clause via 'and'"
  })

  console.log(`\n=== Done. ${log.length} action(s) ${DRY_RUN ? 'planned (dry run, no writes)' : 'applied'}. ===`)
  require('fs').writeFileSync(
    require('path').join(__dirname, DRY_RUN ? 'cut-it-out-115-dryrun-log.json' : 'cut-it-out-115-applied-log.json'),
    JSON.stringify(log, null, 2)
  )
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
