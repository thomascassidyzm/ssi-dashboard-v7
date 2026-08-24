#!/usr/bin/env node
/**
 * READ ONLY. The relink step for non-English course content, counted separately from the
 * render step (same shape as the 2026-08-13 English pod-0 report).
 *
 * Content slots carry explicit FKs - target1_audio_id / target2_audio_id on course_seeds,
 * course_legos and course_practice_phrases - so "how many slots across how many courses
 * would point at the shared clips" is a countable number, not an estimate.
 * Writes relink.json.
 */
const { Client } = require('pg')
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.psql') })
const fs = require('fs')

const SQL = `
WITH slot AS (
  SELECT c.target_lang AS lang, c.course_code, 'target1' AS side, s.target1_audio_id AS aid FROM course_seeds s JOIN courses c ON c.course_code=s.course_code WHERE c.target_lang<>'eng' AND coalesce(s.target_text,'')<>''
  UNION ALL SELECT c.target_lang, c.course_code, 'target2', s.target2_audio_id FROM course_seeds s JOIN courses c ON c.course_code=s.course_code WHERE c.target_lang<>'eng' AND coalesce(s.target_text,'')<>''
  UNION ALL SELECT c.target_lang, c.course_code, 'target1', l.target1_audio_id FROM course_legos l JOIN courses c ON c.course_code=l.course_code WHERE c.target_lang<>'eng' AND coalesce(l.target_text,'')<>''
  UNION ALL SELECT c.target_lang, c.course_code, 'target2', l.target2_audio_id FROM course_legos l JOIN courses c ON c.course_code=l.course_code WHERE c.target_lang<>'eng' AND coalesce(l.target_text,'')<>''
  UNION ALL SELECT c.target_lang, c.course_code, 'target1', p.target1_audio_id FROM course_practice_phrases p JOIN courses c ON c.course_code=p.course_code WHERE c.target_lang<>'eng' AND coalesce(p.target_text,'')<>''
  UNION ALL SELECT c.target_lang, c.course_code, 'target2', p.target2_audio_id FROM course_practice_phrases p JOIN courses c ON c.course_code=p.course_code WHERE c.target_lang<>'eng' AND coalesce(p.target_text,'')<>''
)
SELECT s.lang,
       count(*)::bigint                                                   AS slots,
       count(DISTINCT s.course_code)::int                                 AS courses,
       count(*) FILTER (WHERE s.aid IS NULL)::bigint                      AS unlinked,
       count(*) FILTER (WHERE s.aid IS NOT NULL AND ca.course_code IS DISTINCT FROM s.course_code)::bigint AS already_cross_course,
       count(DISTINCT s.aid)::bigint                                      AS distinct_clips_pointed_at,
       count(*) FILTER (WHERE ca.origin = 'human')::bigint                AS human_origin
  FROM slot s LEFT JOIN course_audio ca ON ca.id = s.aid
 GROUP BY 1 ORDER BY 2 DESC;
`

;(async () => {
  const cl = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await cl.connect()
  try {
    await cl.query(`SET statement_timeout = '45min'`)
    const rows = (await cl.query(SQL)).rows.map(r => ({
      lang: r.lang, slots: +r.slots, courses: +r.courses, unlinked: +r.unlinked,
      already_cross_course: +r.already_cross_course,
      distinct_clips_pointed_at: +r.distinct_clips_pointed_at, human_origin: +r.human_origin,
    }))
    fs.writeFileSync(__dirname + '/relink.json', JSON.stringify(rows, null, 1))
    const s = k => rows.reduce((a, b) => a + b[k], 0)
    console.log('languages', rows.length, 'slots', s('slots'), 'unlinked', s('unlinked'),
      'already cross-course', s('already_cross_course'), 'distinct clips', s('distinct_clips_pointed_at'),
      'human', s('human_origin'))
  } finally { await cl.end() }
})().catch(e => { console.error(e.message); process.exit(1) })
