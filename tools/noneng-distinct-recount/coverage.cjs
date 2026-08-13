#!/usr/bin/env node
/**
 * READ ONLY. For every non-English target language, how many of its distinct course-content
 * texts already exist as a clip on each voice, anywhere in course_audio (cross-course).
 * This is the reuse credit the 2026-08-13 English recount established: credit is only ever
 * taken for a clip ALREADY on the voice we want, which is not the same thing as crediting
 * legacy-engine debris on a retired voice.
 * Writes coverage.json: [{lang, voice, covered, chars_covered}]
 */
const { Client } = require('pg')
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.psql') })
const fs = require('fs')

const NORM = c => `lower(btrim(regexp_replace(${c},'[。？！、，.!?,;:()（）「」『』\\[\\]…—–¿¡\\-]+','','g')))`

const SQL = `
WITH src AS (
  SELECT c.target_lang AS lang, ${NORM('s.target_text')} AS t
    FROM course_seeds s JOIN courses c ON c.course_code = s.course_code
   WHERE c.target_lang <> 'eng' AND coalesce(s.target_text,'') <> ''
  UNION ALL
  SELECT c.target_lang, ${NORM('l.target_text')}
    FROM course_legos l JOIN courses c ON c.course_code = l.course_code
   WHERE c.target_lang <> 'eng' AND coalesce(l.target_text,'') <> ''
  UNION ALL
  SELECT c.target_lang, ${NORM('p.target_text')}
    FROM course_practice_phrases p JOIN courses c ON c.course_code = p.course_code
   WHERE c.target_lang <> 'eng' AND coalesce(p.target_text,'') <> ''
), need AS (SELECT DISTINCT lang, t FROM src WHERE t <> ''),
clip AS (
  SELECT DISTINCT regexp_replace(voice_id,'^(xai_|azure_)','') AS v, text_stripped AS t
    FROM course_audio
   WHERE coalesce(text_stripped,'') <> '' AND coalesce(s3_key,'') <> '' AND s3_key NOT LIKE 'pending/%'
)
SELECT n.lang, c.v AS voice, count(*)::int AS covered, sum(length(n.t))::bigint AS chars_covered
  FROM need n JOIN clip c ON c.t = n.t
 GROUP BY 1,2
 HAVING count(*) >= 25
 ORDER BY 1, 3 DESC;
`

;(async () => {
  const cl = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await cl.connect()
  try {
    await cl.query(`SET statement_timeout = '60min'`)
    console.error('joining need x clips…')
    const rows = (await cl.query(SQL)).rows
    fs.writeFileSync(__dirname + '/coverage.json', JSON.stringify(rows, null, 1))
    console.log('rows', rows.length)
  } finally { await cl.end() }
})().catch(e => { console.error(e.message); process.exit(1) })
