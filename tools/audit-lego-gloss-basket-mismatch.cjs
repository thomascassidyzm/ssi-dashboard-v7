#!/usr/bin/env node
/**
 * A LEGO's known_text is the prompt the learner is taught for that chunk.
 * Every BUILD and USE phrase under that LEGO must therefore SURFACE that same
 * wording on the known side (canon P17: a phrase contains the whole LEGO and
 * grows outward from it). When a basket glosses its own LEGO with different
 * English, the presentation teaches one prompt and the drills ask another —
 * which is what this audit finds.
 *
 * Containment is checked on whole words after apostrophe/punctuation
 * normalisation. A hit is a READING LIST, not a verdict: normal inflection
 * ("to take" -> "taking") and dropped function words are not defects, a
 * different lexical item is. The triage below separates those two so a human
 * only has to read the ones that matter.
 *
 *   node tools/audit-lego-gloss-basket-mismatch.cjs <course_code> [--all]
 *
 * Reads DATABASE_URL from .env.psql at the repo root. Read-only: no writes,
 * no audio, no LLM.
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const course = process.argv[2]
const showAll = process.argv.includes('--all')
if (!course) { console.error('usage: audit-lego-gloss-basket-mismatch.cjs <course_code> [--all]'); process.exit(2) }

const envPath = path.join(__dirname, '..', '.env.psql')
const DATABASE_URL = (fs.readFileSync(envPath, 'utf8').match(/^DATABASE_URL=(.*)$/m) || [])[1]
if (!DATABASE_URL) { console.error('no DATABASE_URL in .env.psql'); process.exit(2) }

const q = sql => JSON.parse(execFileSync('psql', [DATABASE_URL, '-At', '-c', sql], { maxBuffer: 1 << 28 }).toString() || 'null') || []

const legos = q(`select json_agg(row_to_json(t)) from (select seed_number, lego_index, lego_id, is_new, known_text, target_text
  from course_legos where course_code='${course}' order by seed_number, lego_index) t`)
const phrases = q(`select json_agg(row_to_json(t)) from (select id, seed_number, lego_index, phrase_role, known_text, target_text
  from course_practice_phrases where course_code='${course}' and phrase_role in ('build','use') order by seed_number, lego_index, position) t`)

const norm = s => (s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim()
const contains = (hay, needle) => (' ' + norm(hay) + ' ').includes(' ' + norm(needle) + ' ')

// Function words and inflection are noise; a missing CONTENT word is the signal.
const FUNCTION_WORDS = new Set(("a an the to i i'm im is am are be been was were it its that this do does did don't doesn't " +
  "my his her your our their you we he she they me him them of in on at with and as if so but for not no can could " +
  "will would about all it's there here").split(' '))
const stem = w => {
  let x = w.replace(/'s$/, '')
  if (/ing$/.test(x) && x.length > 5) x = x.slice(0, -3)
  else if (/ed$/.test(x) && x.length > 4) x = x.slice(0, -2)
  else if (/ies$/.test(x)) x = x.slice(0, -3) + 'y'
  else if (/es$/.test(x) && x.length > 4) x = x.slice(0, -2)
  else if (/s$/.test(x) && x.length > 3) x = x.slice(0, -1)
  x = x.replace(/e$/, '')
  if (/(.)\1$/.test(x) && x.length > 3) x = x.slice(0, -1)
  return x
}
const sharesStem = (word, phraseStems) => { const s = stem(word); return [...phraseStems].some(p => p === s || p.startsWith(s) || s.startsWith(p)) }

const basket = new Map()
for (const p of phrases) { const k = p.seed_number + '|' + p.lego_index; if (!basket.has(k)) basket.set(k, []); basket.get(k).push(p) }

const rounds = legos.filter(l => l.is_new)
let hits = 0, flagged = 0, lexical = 0
rounds.forEach((lego, i) => {
  const roundNumber = i + 1
  const bs = basket.get(lego.seed_number + '|' + lego.lego_index) || []
  const miss = bs.filter(p => !contains(p.known_text, lego.known_text))
  if (!miss.length) return
  hits++; flagged += miss.length
  const legoContent = norm(lego.known_text).split(' ').filter(w => !FUNCTION_WORDS.has(w))
  const rows = miss.map(p => {
    const phraseStems = new Set(norm(p.known_text).split(' ').map(stem))
    const missing = legoContent.filter(w => !sharesStem(w, phraseStems))
    return { p, missing }
  })
  const lex = rows.filter(r => r.missing.length)
  lexical += lex.length
  // A gloss written as citation/notation ("when (question)", "to go / to leave")
  // never surfaces in a phrase, so its whole basket fires: that is the loudest signal.
  const notation = /[/(]/.test(lego.known_text || '')
  if (!showAll && !lex.length && !notation) return
  console.log(`\nR${roundNumber} ${lego.lego_id} [${lego.known_text}] = ${lego.target_text}` +
    `  ${miss.length}/${bs.length} phrases${notation ? '  NOTATION-GLOSS' : ''}`)
  for (const r of rows) console.log(`   ${r.p.phrase_role[0]} ${r.p.known_text}` + (r.missing.length ? `   [no gloss for: ${r.missing.join(', ')}]` : ''))
})

console.log(`\n${course}: ${rounds.length} rounds, ${phrases.length} build+use phrases`)
console.log(`rounds whose basket contradicts their LEGO gloss: ${hits}`)
console.log(`phrase slots flagged: ${flagged} (of which ${lexical} drop a content word, i.e. a different lexical item, not inflection)`)
console.log(`LEGO glosses written with slash/parenthesis notation: ${rounds.filter(l => /[/(]/.test(l.known_text || '')).length}`)
