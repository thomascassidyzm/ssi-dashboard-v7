#!/usr/bin/env node
/**
 * pod-translation-batch.cjs — the two mechanical halves of a pod translation pass,
 * so that the only thing a translating worker actually does is translate.
 *
 * Tom's ruling 2026-08-13: PODS ARE PER LANGUAGE, NOT PER COURSE. That has a
 * consequence nobody has been acting on. Of the 4,504 empty pod target slots on the
 * estate, 734 are not translation work at all — a sibling course in the SAME target
 * language already carries that exact English line with target text against it.
 * Translating those again would be paying twice for one line and, worse, would risk
 * two different targets for one known line, which is a ZUT break by construction.
 *
 * So this tool has two modes, and `carry` runs first:
 *
 *   carry   — fill empty slots from a sibling course in the same target language,
 *             matched on the English known text. No model involved, no new text
 *             invented. Emits a drafts JSON that write-pod0-drafts.cjs applies.
 *
 *   extract — dump the slots that are STILL empty after carry, as the English canon
 *             to translate. This is the real translation queue and it is the only
 *             thing that should ever reach a model.
 *
 * Both emit the shape write-pod0-drafts.cjs already reads — {global_order,
 * english_text, target_text, note} — so the safe write path is unchanged: per-row
 * `UPDATE … WHERE id=$1 AND known_text=$2 AND btrim(target_text)=''` in one
 * transaction. A row that has been filled by someone else since the extract matches
 * zero rows and takes the whole run back. That property is the point; nothing here
 * writes to the database itself.
 *
 *   node tools/pods/pod-translation-batch.cjs carry   --course=deu_for_eng --pod-slug=pod-0-unrecorded --out=/tmp/deu-carry.json
 *   node tools/pods/pod-translation-batch.cjs extract --course=fin_for_eng --pod-slug=pod-0 --out=/tmp/fin-todo.json
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const fs = require('fs')
const { Client } = require('pg')

const MODE = process.argv[2]
const arg = (n) => {
  const a = process.argv.find(x => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}
const COURSE = arg('course')
const SLUG = arg('pod-slug') || 'pod-0'
const OUT = arg('out')

if (!['carry', 'extract'].includes(MODE) || !COURSE || !OUT) {
  console.error('usage: pod-translation-batch.cjs <carry|extract> --course=<code> [--pod-slug=<slug>] --out=<path.json>')
  process.exit(1)
}

// Same identity two courses' copies of a line share: case-folded, whitespace-collapsed.
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase()

/**
 * The target VARIANT, from the course code — `deu_at_for_eng` → `deu_at`.
 *
 * This is not the same thing as courses.target_lang, and the difference is the whole
 * reason this function exists. target_lang is `deu` for both deu_for_eng and
 * deu_at_for_eng, and `spa` for both spa_for_eng and spa_mx_for_eng. Carrying a line
 * across on target_lang alone therefore reads as a free 100% fill and is actually a
 * dialect flattening: it would push Austrian German into the standard German course
 * and Iberian Spanish into the Mexican one, silently, across every line.
 *
 * Same variant = the same course's content in a different pod slug, or a genuine
 * duplicate: safe, mechanical, no judgement. Cross-variant = a real question about
 * vosotros vs ustedes, ordenador vs computadora, Jänner vs Januar, and that is Tom's
 * ear, not a script's. Cross-variant candidates are reported, never applied.
 */
const variantOf = (courseCode) => String(courseCode).split('_for_')[0]

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()
  try {
    const { rows: [course] } = await db.query(
      'select course_code, target_lang, known_lang from courses where course_code = $1', [COURSE])
    if (!course) throw new Error(`no such course: ${COURSE}`)

    const { rows: empties } = await db.query(
      `select s.id, s.global_order, s.known_text
         from listening_pods p
         join listening_pod_sentences s on s.pod_id = p.id
        where p.course_code = $1 and p.slug = $2 and btrim(s.target_text) = ''
          and btrim(s.known_text) <> ''
        order by s.global_order`, [COURSE, SLUG])

    if (MODE === 'carry') {
      // Every filled line anywhere in this TARGET LANGUAGE, keyed by its English.
      // Deliberately not restricted to pod-0: a line already spoken in this language
      // is the same line whichever pod slug it sits on.
      const { rows: donors } = await db.query(
        `select lower(btrim(s.known_text)) k, btrim(s.target_text) t, p.course_code
           from listening_pods p
           join listening_pod_sentences s on s.pod_id = p.id
           join courses c on c.course_code = p.course_code
          where c.target_lang = $1 and c.known_lang = $2
            and btrim(s.target_text) <> '' and btrim(s.known_text) <> ''`,
        [course.target_lang, course.known_lang])

      const mine = variantOf(COURSE)
      const byEnglish = new Map()      // same-variant donors only — safe to carry
      const crossVariant = new Map()   // different variant — reported, never carried
      for (const d of donors) {
        const k = norm(d.k)
        const bucket = variantOf(d.course_code) === mine ? byEnglish : crossVariant
        if (!bucket.has(k)) bucket.set(k, new Set())
        bucket.get(k).add(d.t)
      }

      const drafts = []
      const forked = []
      const dialect = []
      for (const e of empties) {
        const cands = byEnglish.get(norm(e.known_text))
        if (!cands) {
          const cross = crossVariant.get(norm(e.known_text))
          if (cross) {
            dialect.push({ global_order: e.global_order, english_text: e.known_text, candidates: [...cross] })
          }
          continue
        }
        // ZUT: one known line may only carry one target. If the language already
        // disagrees with itself on this line, carrying either one across would be
        // picking a winner by accident. Report it instead.
        if (cands.size > 1) {
          forked.push({ global_order: e.global_order, english_text: e.known_text, candidates: [...cands] })
          continue
        }
        drafts.push({
          global_order: e.global_order,
          english_text: e.known_text,
          target_text: [...cands][0],
          note: `carried across from a sibling ${course.target_lang} course`,
        })
      }

      fs.writeFileSync(OUT, JSON.stringify(drafts, null, 2))
      const needTranslating = empties.length - drafts.length - forked.length - dialect.length
      console.log(`${COURSE} (${SLUG}): ${empties.length} empty, ${drafts.length} carryable, ${needTranslating} need translating`)
      if (dialect.length) {
        const dialectOut = OUT.replace(/\.json$/, '-cross-variant.json')
        fs.writeFileSync(dialectOut, JSON.stringify(dialect, null, 2))
        console.log(`  ${dialect.length} CROSS-VARIANT not carried — text exists in this language but a different variant (${[...new Set(donors.map(d => variantOf(d.course_code)))].filter(v => v !== mine).join(', ')}). Tom's ear, not a script's. See ${dialectOut}`)
      }
      if (forked.length) {
        const forkOut = OUT.replace(/\.json$/, '-zut-forks.json')
        fs.writeFileSync(forkOut, JSON.stringify(forked, null, 2))
        console.log(`  ${forked.length} ZUT FORKS not carried — one English line with more than one target already live in this language. See ${forkOut}`)
      }
      console.log(`  wrote ${OUT}`)
    } else {
      // Variant-scoped, for exactly the reason carry is. Keyed on target_lang alone,
      // this exclusion silently dropped lines from the queue that were filled in a
      // SIBLING DIALECT: ara_for_eng (MSA) lost 17 lines because ara_eg and ara_sy
      // had them, and por/fra_ca/ara_sy/ara_eg/fra lost 47 between them. The rows were
      // still blank in the course being extracted, so "already covered" was false —
      // it just meant some other dialect had said it. A queue that under-reports is
      // worse than one that over-reports: nothing downstream can see the gap.
      const { rows: filled } = await db.query(
        `select lower(btrim(s.known_text)) k, p.course_code
           from listening_pods p
           join listening_pod_sentences s on s.pod_id = p.id
           join courses c on c.course_code = p.course_code
          where c.target_lang = $1 and c.known_lang = $2 and btrim(s.target_text) <> ''`,
        [course.target_lang, course.known_lang])
      const mine = variantOf(COURSE)
      const known = new Set(
        filled.filter(r => variantOf(r.course_code) === mine).map(r => norm(r.k)))

      const todo = empties
        .filter(e => !known.has(norm(e.known_text)))
        .map(e => ({ global_order: e.global_order, english_text: e.known_text, target_text: '' }))

      fs.writeFileSync(OUT, JSON.stringify(todo, null, 2))
      console.log(`${COURSE} (${SLUG}) → ${course.target_lang}: ${todo.length} lines to translate from English canon`)
      console.log(`  wrote ${OUT}`)
    }
  } finally {
    await db.end()
  }
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
