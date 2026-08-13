#!/usr/bin/env node
/**
 * READ ONLY. Welsh distinct course texts that have no human recording yet.
 *
 * Welsh is human-voice only (Tom's rule, 2026-08-13): Aran and Catrin record it by hand.
 * This tool never writes to the DB and never touches any synthesis path — it produces a
 * recording worklist.
 *
 * Counting method is copied verbatim from tools/noneng-distinct-recount/content-counts.cjs
 * so the numbers reconcile with the 2026-08-13 recount:
 *   - union of course_seeds.target_text + course_legos.target_text
 *     + course_practice_phrases.target_text for Welsh courses
 *   - NORM = lower(btrim(regexp_replace(...))) with the same character class
 *   - distinct is PER LANGUAGE across courses
 *
 * "Recorded" follows tools/noneng-distinct-recount/coverage.cjs + relink.cjs:
 * a live course_audio row (s3_key set, not pending/) with origin = 'human' whose
 * text_stripped equals the normalised text.
 *
 * Because cym_n and cym_s are two dialects sharing the target_lang 'cym', a second,
 * stricter pass counts per dialect group: a north text is only covered by a clip that
 * lives on a north (or dialect-neutral) course, and likewise for south.
 *
 * Writes welsh-unrecorded.json next to this file.
 */
const path = require('path')
const fs = require('fs')
const { Client } = require('pg')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.psql') })

const NORM = `lower(btrim(regexp_replace($COL$,'[。？！、，.!?,;:()（）「」『』\\[\\]…—–¿¡\\-]+','','g')))`
const n = col => NORM.replace('$COL$', col)

// Welsh target languages actually present in `courses` (verified: only 'cym').
const LANGS = `('cym')`

const SRC = `
  SELECT c.course_code, c.known_lang, s.seed_number, NULL::int AS lego_index,
         'seed' AS kind, ${n('s.target_text')} AS t, s.target_text AS raw
    FROM course_seeds s JOIN courses c ON c.course_code = s.course_code
   WHERE c.target_lang IN ${LANGS} AND coalesce(s.target_text,'') <> ''
  UNION ALL
  SELECT c.course_code, c.known_lang, l.seed_number, l.lego_index,
         'lego', ${n('l.target_text')}, l.target_text
    FROM course_legos l JOIN courses c ON c.course_code = l.course_code
   WHERE c.target_lang IN ${LANGS} AND coalesce(l.target_text,'') <> ''
  UNION ALL
  SELECT c.course_code, c.known_lang, p.seed_number, p.lego_index,
         'phrase', ${n('p.target_text')}, p.target_text
    FROM course_practice_phrases p JOIN courses c ON c.course_code = p.course_code
   WHERE c.target_lang IN ${LANGS} AND coalesce(p.target_text,'') <> ''
`

// Live human clips, with the course they were recorded for (dialect attribution).
const CLIPS = `
  SELECT DISTINCT text_stripped AS t, course_code
    FROM course_audio
   WHERE origin = 'human'
     AND coalesce(text_stripped,'') <> ''
     AND coalesce(s3_key,'') <> ''
     AND s3_key NOT LIKE 'pending/%'
`

const SQL = `
WITH src AS (${SRC}), clip AS (${CLIPS}),
slotted AS (
  SELECT t,
         min(raw) AS raw,
         count(*)::int AS slots,
         count(DISTINCT course_code)::int AS course_count,
         array_agg(DISTINCT course_code) AS courses,
         min(seed_number) AS first_seed,
         min(lego_index) AS first_lego
    FROM src WHERE t <> '' GROUP BY t
),
cover AS (
  SELECT s.t,
         EXISTS (SELECT 1 FROM clip c WHERE c.t = s.t) AS recorded_anywhere,
         -- dialect-aware: is there a human clip from a course sharing this text's dialect?
         EXISTS (
           SELECT 1 FROM clip c
            WHERE c.t = s.t
              AND (c.course_code = ANY (s.courses)
                   OR NOT (c.course_code LIKE 'cym\\_n%' OR c.course_code LIKE 'cym\\_s%'))
         ) AS recorded_same_course
    FROM slotted s
)
SELECT s.*, v.recorded_anywhere, v.recorded_same_course
  FROM slotted s JOIN cover v ON v.t = s.t
 ORDER BY s.first_seed NULLS LAST, s.first_lego NULLS LAST, s.t;
`

// Per-course slot detail for the outstanding texts, so the worklist reads in course order.
const DETAIL = `
WITH src AS (${SRC}), clip AS (${CLIPS})
SELECT course_code, known_lang, seed_number, ${'t'} AS t, min(raw) AS raw,
       count(*)::int AS slots,
       min(lego_index) AS lego_index
  FROM src
 WHERE t <> ''
 GROUP BY course_code, known_lang, seed_number, t
 ORDER BY course_code, seed_number NULLS LAST, min(lego_index) NULLS LAST, t;
`

;(async () => {
  const cl = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await cl.connect()
  try {
    await cl.query(`SET statement_timeout = '30min'`)
    console.error('counting Welsh distinct texts…')
    const rows = (await cl.query(SQL)).rows
    console.error('per-course detail…')
    const detail = (await cl.query(DETAIL)).rows

    const total = rows.length
    const recorded = rows.filter(r => r.recorded_anywhere).length
    const recordedStrict = rows.filter(r => r.recorded_same_course).length
    const out = {
      generated_for: '2026-08-13 Welsh recording worklist',
      total_distinct: total,
      recorded_any_course: recorded,
      outstanding_any_course: total - recorded,
      recorded_dialect_aware: recordedStrict,
      outstanding_dialect_aware: total - recordedStrict,
      pct_recorded_any_course: +(100 * recorded / total).toFixed(2),
      pct_recorded_dialect_aware: +(100 * recordedStrict / total).toFixed(2),
      total_slots: rows.reduce((a, r) => a + r.slots, 0),
      outstanding_slots: rows.filter(r => !r.recorded_anywhere).reduce((a, r) => a + r.slots, 0),
      texts: rows,
      detail,
    }
    fs.writeFileSync(path.join(__dirname, 'welsh-unrecorded.json'), JSON.stringify(out, null, 1))
    console.log('distinct', total, 'recorded', recorded, 'outstanding', total - recorded,
      `(${out.pct_recorded_any_course}% recorded)`)
    console.log('dialect-aware outstanding', total - recordedStrict,
      `(${out.pct_recorded_dialect_aware}% recorded)`)
  } finally { await cl.end() }
})().catch(e => { console.error(e.message); process.exit(1) })
