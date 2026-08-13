#!/usr/bin/env node
/**
 * READ ONLY. Non-English course-content (seeds/legos/practice phrases) counted three ways
 * per target language:
 *   slots            - raw rows (what a per-course-per-slot render would cost)
 *   percourse_distinct - sum over courses of distinct normalised text within that course
 *                        (the "per-course counting" baseline)
 *   perlang_distinct   - distinct normalised text across every course in the language
 *                        (the per-language dedupe unit; this is the 2026-08-12 `needed`)
 * Writes tools/noneng-distinct-recount/content-counts.json
 *
 * HUMAN-VOICE LANGUAGES ARE EXCLUDED AT THE QUERY (Tom 2026-08-13). The first run
 * of this tool counted Welsh into the queue at ~23,442 proposed renders, which is
 * exactly the mistake the ruling forbids: Welsh is human-recorded by Aran and
 * Catrin, and its gaps are a recording worklist, not a render backlog. The filter
 * lives in services/shared/human-voice-courses.cjs and the assertion below makes a
 * regression impossible to ship quietly.
 */
const { Client } = require('pg')
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.psql') })
const fs = require('fs')
const { renderableLangSql, assertNoHumanVoiceInQueue } = require('../../services/shared/human-voice-courses.cjs')

const RENDERABLE = renderableLangSql('c.target_lang')

const NORM = `lower(btrim(regexp_replace($COL$,'[。？！、，.!?,;:()（）「」『』\\[\\]…—–¿¡\\-]+','','g')))`
const n = col => NORM.replace('$COL$', col)

const SQL = `
WITH src AS (
  SELECT c.target_lang AS lang, c.course_code, ${n('s.target_text')} AS t
    FROM course_seeds s JOIN courses c ON c.course_code = s.course_code
   WHERE c.target_lang <> 'eng' AND ${RENDERABLE} AND coalesce(s.target_text,'') <> ''
  UNION ALL
  SELECT c.target_lang, c.course_code, ${n('l.target_text')}
    FROM course_legos l JOIN courses c ON c.course_code = l.course_code
   WHERE c.target_lang <> 'eng' AND ${RENDERABLE} AND coalesce(l.target_text,'') <> ''
  UNION ALL
  SELECT c.target_lang, c.course_code, ${n('p.target_text')}
    FROM course_practice_phrases p JOIN courses c ON c.course_code = p.course_code
   WHERE c.target_lang <> 'eng' AND ${RENDERABLE} AND coalesce(p.target_text,'') <> ''
), percourse AS (
  SELECT lang, course_code, count(DISTINCT t) AS d, count(*) AS rows
    FROM src GROUP BY 1,2
)
SELECT s.lang,
       (SELECT count(*) FROM src x WHERE x.lang = s.lang)                    AS slots,
       (SELECT sum(d) FROM percourse p WHERE p.lang = s.lang)                AS percourse_distinct,
       count(DISTINCT s.t)                                                   AS perlang_distinct,
       (SELECT count(*) FROM percourse p WHERE p.lang = s.lang)              AS courses,
       sum(length(s.t)) FILTER (WHERE true)                                  AS ignore_chars
  FROM src s GROUP BY s.lang ORDER BY 4 DESC;
`

// distinct-text character totals per language, needed for cost
const CHARS = `
WITH src AS (
  SELECT c.target_lang AS lang, ${n('s.target_text')} AS t
    FROM course_seeds s JOIN courses c ON c.course_code = s.course_code
   WHERE c.target_lang <> 'eng' AND ${RENDERABLE} AND coalesce(s.target_text,'') <> ''
  UNION ALL
  SELECT c.target_lang, ${n('l.target_text')}
    FROM course_legos l JOIN courses c ON c.course_code = l.course_code
   WHERE c.target_lang <> 'eng' AND ${RENDERABLE} AND coalesce(l.target_text,'') <> ''
  UNION ALL
  SELECT c.target_lang, ${n('p.target_text')}
    FROM course_practice_phrases p JOIN courses c ON c.course_code = p.course_code
   WHERE c.target_lang <> 'eng' AND ${RENDERABLE} AND coalesce(p.target_text,'') <> ''
), d AS (SELECT DISTINCT lang, t FROM src)
SELECT lang, count(*) AS distinct_texts, sum(length(t)) AS chars FROM d GROUP BY 1;
`

;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await c.connect()
  try {
    await c.query(`SET statement_timeout = '30min'`)
    console.error('counting…')
    const main = (await c.query(SQL)).rows
    const chars = (await c.query(CHARS)).rows
    const byLang = new Map(chars.map(r => [r.lang, r]))
    const out = main.map(r => ({
      lang: r.lang,
      courses: +r.courses,
      slots: +r.slots,
      percourse_distinct: +r.percourse_distinct,
      perlang_distinct: +r.perlang_distinct,
      chars: +(byLang.get(r.lang) || {}).chars || 0,
    }))
    assertNoHumanVoiceInQueue(out, { context: 'noneng-distinct-recount/content-counts', lang: r => r.lang })
    fs.writeFileSync(__dirname + '/content-counts.json', JSON.stringify(out, null, 1))
    console.log('languages', out.length)
    console.log('slots', out.reduce((a, b) => a + b.slots, 0))
    console.log('percourse_distinct', out.reduce((a, b) => a + b.percourse_distinct, 0))
    console.log('perlang_distinct', out.reduce((a, b) => a + b.perlang_distinct, 0))
  } finally { await c.end() }
})().catch(e => { console.error(e.message); process.exit(1) })
