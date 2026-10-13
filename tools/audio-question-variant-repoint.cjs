#!/usr/bin/env node
/**
 * audio-question-variant-repoint — job #586. After the audio key started keeping
 * the question mark (tools/audio-question-key-backfill.cjs), find every content
 * slot (course_seeds / course_legos / course_practice_phrases × known / target1 /
 * target2) whose linked recording is the WRONG VARIANT — the line is a question
 * but the audio was rendered as a statement, or the reverse — and give it the
 * right one.
 *
 *   node tools/audio-question-variant-repoint.cjs [--course C]            # PLAN only: counts, nothing written
 *   node tools/audio-question-variant-repoint.cjs --repoint [--course C]   # step 1: repoint to a correct-variant row that ALREADY exists (free)
 *   node tools/audio-question-variant-repoint.cjs --render-plan            # step 2 plan: dry-run each remaining line against /api/audio/render (library-first, charsSpent reported, nothing rendered)
 *   node tools/audio-question-variant-repoint.cjs --render --max-chars N   # step 3: render+repoint, stops before N characters
 *
 * Make-before-break: a pointer only moves to a row that exists and has bytes
 * (s3_key not pending/). The old row and its S3 object are never touched.
 * Human recordings are never replaced — they are listed and left (a person
 * said that line; whether it is the right variant is Tom's call).
 * After any repoint, courses.content_version is bumped (patch) once per course:
 * the learner app caches the bundle on it (memory ssi-audio-repoint-must-bump-content-version).
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { evidencePath } = require('./lib/evidence-path.cjs')

const QUESTION = `~ '[?？][.!?。？！[:space:]]*$'`
const SIDES = { known: ['known_text', 'known_audio_id'], target1: ['target_text', 'target1_audio_id'], target2: ['target_text', 'target2_audio_id'] }
const TABLES = { seed: 'course_seeds', lego: 'course_legos', phrase: 'course_practice_phrases' }

function dbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  for (const f of [path.join(__dirname, '..', '.env.psql'), path.join(process.env.HOME, 'SSi', 'ssi-dashboard-v7-clean', '.env.psql')]) {
    if (fs.existsSync(f)) { const m = fs.readFileSync(f, 'utf8').match(/DATABASE_URL=(.+)/); if (m) return m[1].trim().replace(/^["']|["']$/g, '') }
  }
  throw new Error('no DATABASE_URL (.env.psql)')
}

/** Every wrong-variant link, with the correct-variant row if one already exists in the same course+language+role+voice. */
const WRONG_SQL = (scope) => `
  WITH links AS (
    SELECT 'seed' AS kind, id, course_code, 'known' AS side, known_text AS txt, known_audio_id AS aid FROM course_seeds WHERE known_audio_id IS NOT NULL
    UNION ALL SELECT 'seed', id, course_code, 'target1', target_text, target1_audio_id FROM course_seeds WHERE target1_audio_id IS NOT NULL
    UNION ALL SELECT 'seed', id, course_code, 'target2', target_text, target2_audio_id FROM course_seeds WHERE target2_audio_id IS NOT NULL
    UNION ALL SELECT 'lego', id, course_code, 'known', known_text, known_audio_id FROM course_legos WHERE known_audio_id IS NOT NULL
    UNION ALL SELECT 'lego', id, course_code, 'target1', target_text, target1_audio_id FROM course_legos WHERE target1_audio_id IS NOT NULL
    UNION ALL SELECT 'lego', id, course_code, 'target2', target_text, target2_audio_id FROM course_legos WHERE target2_audio_id IS NOT NULL
    UNION ALL SELECT 'phrase', id, course_code, 'known', known_text, known_audio_id FROM course_practice_phrases WHERE known_audio_id IS NOT NULL
    UNION ALL SELECT 'phrase', id, course_code, 'target1', target_text, target1_audio_id FROM course_practice_phrases WHERE target1_audio_id IS NOT NULL
    UNION ALL SELECT 'phrase', id, course_code, 'target2', target_text, target2_audio_id FROM course_practice_phrases WHERE target2_audio_id IS NOT NULL)
  SELECT l.kind, l.id::text AS row_id, l.course_code, l.side, l.txt, l.aid, a.language, a.role, a.voice_id, a.origin, a.text AS audio_text,
         normalize_text(l.txt) AS want_key,
         (SELECT o.id FROM course_audio o WHERE o.course_code = l.course_code AND o.language = a.language AND o.role = a.role AND o.voice_id = a.voice_id
             AND o.text_normalized = normalize_text(l.txt) AND o.s3_key NOT LIKE 'pending/%' AND o.s3_key <> '' LIMIT 1) AS existing
    FROM links l JOIN course_audio a ON a.id = l.aid
   WHERE (l.txt ${QUESTION}) <> (a.text ${QUESTION}) ${scope ? 'AND l.course_code = $1' : ''}`

async function plan(c, course) {
  const rows = (await c.query(WRONG_SQL(course), course ? [course] : [])).rows
  const human = rows.filter(r => r.origin === 'human')
  const todo = rows.filter(r => r.origin !== 'human')
  const reuse = todo.filter(r => r.existing)
  const need = todo.filter(r => !r.existing)
  const distinctNeed = new Map(need.map(r => [`${r.course_code}|${r.language}|${r.role}|${r.voice_id}|${r.want_key}`, r]))
  return { rows, human, reuse, need, distinctNeed }
}

async function repoint(c, links, label) {
  // pointer move per table; guarded by the before-state (a link that moved under us is skipped)
  let moved = 0
  const courses = new Set()
  await c.query('BEGIN')
  try {
    for (const l of links) {
      const [, col] = SIDES[l.side]
      const r = await c.query(`UPDATE ${TABLES[l.kind]} SET ${col} = $1 WHERE id = $2 AND ${col} = $3`, [l.to, l.row_id, l.aid])
      if (r.rowCount) { moved++; courses.add(l.course_code) }
    }
    for (const code of courses) {
      // semver patch (the app's bundle cache key) + the integer revalidation key, once per course — same two
      // columns services/shared/course-version.cjs bumpCourseVersion / bumpCourseRevalidation move.
      await c.query(`UPDATE courses SET
           content_version = split_part(content_version,'.',1) || '.' || split_part(content_version,'.',2) || '.' || (split_part(content_version,'.',3)::int + 1),
           version = COALESCE(version, 0) + 1
         WHERE course_code = $1 AND content_version ~ '^[0-9]+\\.[0-9]+\\.[0-9]+$'`, [code])
    }
    await c.query('COMMIT')
  } catch (e) { await c.query('ROLLBACK'); throw e }
  return { moved, courses: [...courses], label }
}

async function main() {
  const argv = process.argv.slice(2)
  const course = argv.includes('--course') ? argv[argv.indexOf('--course') + 1] : null
  const c = new Client({ connectionString: dbUrl() })
  await c.connect()
  try {
    const p = await plan(c, course)
    const summary = {
      wrongLinks: p.rows.length, distinctWrongAudioRows: new Set(p.rows.map(r => r.aid)).size,
      humanLeftAlone: p.human.length, repointableNow: p.reuse.length,
      needAudioLinks: p.need.length, needAudioDistinctClips: p.distinctNeed.size,
      needAudioChars: [...p.distinctNeed.values()].reduce((n, r) => n + r.txt.length, 0),
    }
    const ev = evidencePath(`tools/audio-question-variant-repoint/plan-${course || 'all'}-${Date.now()}.json`)
    fs.writeFileSync(ev, JSON.stringify({ summary, human: p.human, need: [...p.distinctNeed.values()] }))
    console.log(JSON.stringify({ ...summary, evidence: ev }, null, 2))

    if (argv.includes('--repoint')) {
      const out = await repoint(c, p.reuse.map(r => ({ ...r, to: r.existing })), 'reuse')
      fs.writeFileSync(evidencePath(`tools/audio-question-variant-repoint/repointed-${Date.now()}.json`), JSON.stringify({ out, links: p.reuse.map(r => ({ kind: r.kind, row_id: r.row_id, side: r.side, from: r.aid, to: r.existing })) }))
      console.log('repointed to existing correct-variant rows:', JSON.stringify({ moved: out.moved, courses: out.courses.length }))
    }
  } finally { await c.end() }
}

if (require.main === module) main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
module.exports = { WRONG_SQL }
