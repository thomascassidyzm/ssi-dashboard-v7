#!/usr/bin/env node
/**
 * How good is the DERIVED mapping alignment, on real rows?
 *
 * Tom's amendment, 2026-08-14: "the default mapping is auto-generated from the
 * existing LEGO components - no human effort to create the initial alignment".
 * So the number that matters is how many mappable rows open ALREADY CORRECT.
 *
 * A derived segment is VERIFIED when some component says exactly that gloss AND
 * the target words the segment spans are exactly that component's own target
 * text — checkable, not a judgement. Matched by CONTENT, never by position: a
 * component's index in the array is precisely what is not its position in the
 * sentence, so an index-matched check scores the fix as a regression.
 *
 *   correct   — every glossed segment is verified
 *   misplaced — at least one gloss sits on columns that are not its own words
 *   blank     — no column carries a gloss at all (nothing faithful to derive)
 *
 * Usage:  node tools/course-optimization/measure-mapping-derivation.cjs [course,course]
 *         GEN=/path/to/other-generator.cjs ...   to score a different derivation
 * Needs .env.psql at the repo root. Read-only: it writes nothing, ever.
 */
const { Client } = require('pg')
const fs = require('fs')
const path = require('path')
const gen = require(process.env.GEN || '../../services/learning-script-generator.cjs')

const norm = s => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, '').trim().replace(/\s+/g, ' ')

function classify(lego) {
  const words = gen.targetWordsOf(lego.target_text)
  if (words.length < 2) return null
  const align = gen.glossAlignment('lego', lego.target_text, lego.components, null)
  if (!align) return { verdict: 'blank', words: words.length }

  // A glossed segment is VERIFIED when some component says exactly that gloss
  // AND the target words the segment spans are exactly that component's own
  // target text. Matched by CONTENT, never by position — the whole point of the
  // change is that a component's position in the array is not its position in
  // the sentence.
  const blocks = (Array.isArray(lego.components) ? lego.components : [])
    .filter(b => gen.targetWordsOf(b.target).length >= 1)
  let col = 0, bad = 0, good = 0
  align.segments.forEach(seg => {
    const spanWords = words.slice(col, col + seg.span)
    col += seg.span
    if (!seg.known.trim()) return
    const ok = blocks.some(b =>
      norm(b.known) === norm(seg.known) && norm(spanWords.join(' ')) === norm(b.target))
    if (ok) good++; else bad++
  })
  return { verdict: bad === 0 ? 'correct' : 'misplaced', words: words.length, good, bad }
}

;(async () => {
  const url = fs.readFileSync(process.env.PSQL_ENV || path.join(__dirname, '../../.env.psql'), 'utf8')
    .match(/DATABASE_URL=["']?([^"'\n]+)/)[1]
  const client = new Client({ connectionString: url })
  await client.connect()
  const courses = process.argv[2] ? process.argv[2].split(',') : null
  const where = courses ? `and course_code = any($1)` : ''
  const { rows } = await client.query(`
    select course_code, lego_id, known_text, target_text, components
    from course_legos
    where type = 'M' and known_gloss_segments is null ${where}
    order by course_code, lego_id`, courses ? [courses] : [])
  await client.end()

  const tally = {}
  const samples = { misplaced: [], blank: [] }
  for (const r of rows) {
    const c = classify(r)
    if (!c) continue
    const t = tally[r.course_code] ||= { correct: 0, misplaced: 0, blank: 0 }
    t[c.verdict]++
    if (samples[c.verdict] && samples[c.verdict].length < 25) {
      samples[c.verdict].push({ course: r.course_code, lego: r.lego_id, known: r.known_text, target: r.target_text, components: r.components })
    }
  }
  const total = Object.values(tally).reduce((a, t) => ({
    correct: a.correct + t.correct, misplaced: a.misplaced + t.misplaced, blank: a.blank + t.blank }),
    { correct: 0, misplaced: 0, blank: 0 })
  console.log(JSON.stringify({ total, byCourse: tally, samples }, null, 2))
})().catch(e => { console.error(e); process.exit(1) })
