#!/usr/bin/env node
'use strict'
// tools/check-hin-want-try.cjs — do English want/try and Hindi चाहना/कोशिश line up in hin_for_eng?
//
//   node tools/check-hin-want-try.cjs                 # hin_for_eng, human-readable
//   node tools/check-hin-want-try.cjs --json          # every row, machine-readable
//   node tools/check-hin-want-try.cjs --strict        # exit 1 while any HARD mismatch stands
//   node tools/check-hin-want-try.cjs <course_code>   # any English→Hindi course (default hin_for_eng)
//
// READ-ONLY. Why it exists: a learner (James, forum, 11–12 Oct 2026) heard "I want to learn Hindi"
// answered with "…सीखने की कोशिश कर रहा हूँ" — "I'm TRYING to learn". The phrase layer had been
// stitched from LEGOs, and the Hindi of the "I'm trying to learn" LEGO was swapped in under an English
// "I want to". Want (चाहना) and try (कोशिश) are different verbs; swapping them changes the meaning.
// Job #349·Q (Kai, 14 Oct 2026) fixed the rows and added this check so the swap cannot come back unseen.
//
// The rule, per row (seed sentence, LEGO, or non-component practice phrase):
//   HARD  the Hindi says want (चाह…, not चाहिए) and the English has no want/would like/wish;
//         the Hindi says try (कोशिश/प्रयास) and the English has no try/attempt/effort;
//         the English says try and the Hindi has no कोशिश/प्रयास.
//   SOFT  the English says want and the Hindi has no चाह…. Hindi can say "I want to X" as
//         "मुझे X-ना है", so this is a judgement (and a ZUT question), reported, never failing.
// Component rows are literal word glosses (exempt from known-side checks), so they are skipped.
const path = require('path')

const EN_WANT = /\b(want|wants|wanted|wanting|wish|wishes|wished)\b|\b(would|'d|wouldn't)( \w+)? like\b/i
// "try" in the English needs कोशिश; कोशिश in the Hindi is also "an attempt / an effort" (S0050L03).
const EN_TRY = /\b(try|tries|tried|trying)\b/i
const EN_TRY_OR_NOUN = /\b(try|tries|tried|trying|attempt|attempts|attempted|attempting|effort|efforts)\b/i
// चाहे before a clause is "however much / whatever / whether" (S0593), not want.
const EN_CONCESSIVE = /\b(however|whatever|whoever|wherever|whenever|whether|no matter|even if)\b/i
// चाह… is want/would-like; चाहिए is need/should and is a different word.
const HI_WANT = /चाह(?!िए)/
const HI_TRY = /कोशिश|प्रयास/

/** Classify one English/Hindi pair. Returns [] when they line up, else a list of reasons. */
function classify(known, target) {
  const k = String(known || ''), t = String(target || '')
  const enWant = EN_WANT.test(k), enTry = EN_TRY.test(k), hiWant = HI_WANT.test(t), hiTry = HI_TRY.test(t)
  const hard = [], soft = []
  if (hiWant && !enWant && !(EN_CONCESSIVE.test(k) && /चाहे /.test(t) && !/चाह(?!िए|े )/.test(t))) hard.push('hindi-want-english-not')
  if (hiTry && !EN_TRY_OR_NOUN.test(k)) hard.push('hindi-try-english-not')
  if (enTry && !hiTry) hard.push('english-try-hindi-not')
  if (enWant && !hiWant) soft.push('english-want-hindi-not')
  return { hard, soft }
}

/** Every row of a course, as { kind, id, seed, known, target, hard, soft }; only the flagged ones. */
function scan({ seeds = [], legos = [], phrases = [] }) {
  const out = []
  const push = (kind, id, seed, known, target) => {
    const { hard, soft } = classify(known, target)
    if (hard.length || soft.length) out.push({ kind, id, seed, known, target, hard, soft })
  }
  for (const s of seeds) push('seed', `S${String(s.seed_number).padStart(4, '0')}`, s.seed_number, s.known_text, s.target_text)
  for (const l of legos) push('lego', l.lego_id, l.seed_number, l.known_text, l.target_text)
  for (const p of phrases) if (p.phrase_role !== 'component') push('phrase', p.id, p.seed_number, p.known_text, p.target_text)
  return out.sort((a, b) => a.seed - b.seed || a.id.localeCompare(b.id))
}

function counts(rows) {
  return { hard: rows.filter((r) => r.hard.length).length, soft: rows.filter((r) => !r.hard.length && r.soft.length).length }
}

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.psql'), quiet: true })
  const args = process.argv.slice(2)
  const course = args.find((a) => !a.startsWith('--')) || 'hin_for_eng'
  const { Client } = require('pg')
  const pg = new Client({ connectionString: process.env.DATABASE_URL })
  await pg.connect()
  let rows
  try {
    const q = (sql) => pg.query(sql, [course]).then((r) => r.rows)
    rows = scan({
      seeds: await q('SELECT seed_number, known_text, target_text FROM course_seeds WHERE course_code=$1'),
      legos: await q('SELECT lego_id, seed_number, known_text, target_text FROM course_legos WHERE course_code=$1'),
      phrases: await q(`SELECT substr(id, length($1) + 2) AS id, seed_number, phrase_role, known_text, target_text FROM course_practice_phrases WHERE course_code=$1`),
    })
  } finally { await pg.end() }
  const c = counts(rows)
  if (args.includes('--json')) console.log(JSON.stringify({ course, counts: c, rows }, null, 1))
  else {
    console.log(`[want/try] ${course}: ${c.hard} HARD, ${c.soft} soft (English want, Hindi without चाह…)`)
    for (const r of rows.filter((x) => x.hard.length)) console.log(`  ✗ ${r.id}  ${r.known}  |  ${r.target}   [${r.hard.join(', ')}]`)
    for (const r of rows.filter((x) => !x.hard.length)) console.log(`  · ${r.id}  ${r.known}  |  ${r.target}   [${r.soft.join(', ')}]`)
  }
  if (args.includes('--strict') && c.hard) process.exitCode = 1
}

module.exports = { classify, scan, counts, EN_WANT, EN_TRY, EN_TRY_OR_NOUN, HI_WANT, HI_TRY }
if (require.main === module) main().catch((e) => { console.error(e); process.exit(2) })
