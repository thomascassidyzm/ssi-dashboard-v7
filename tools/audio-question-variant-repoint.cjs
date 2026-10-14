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
    SELECT 'seed' AS kind, id::text AS id, course_code, 'known' AS side, known_text AS txt, known_audio_id AS aid FROM course_seeds WHERE known_audio_id IS NOT NULL
    UNION ALL SELECT 'seed', id::text, course_code, 'target1', target_text, target1_audio_id FROM course_seeds WHERE target1_audio_id IS NOT NULL
    UNION ALL SELECT 'seed', id::text, course_code, 'target2', target_text, target2_audio_id FROM course_seeds WHERE target2_audio_id IS NOT NULL
    UNION ALL SELECT 'lego', id::text, course_code, 'known', known_text, known_audio_id FROM course_legos WHERE known_audio_id IS NOT NULL
    UNION ALL SELECT 'lego', id::text, course_code, 'target1', target_text, target1_audio_id FROM course_legos WHERE target1_audio_id IS NOT NULL
    UNION ALL SELECT 'lego', id::text, course_code, 'target2', target_text, target2_audio_id FROM course_legos WHERE target2_audio_id IS NOT NULL
    UNION ALL SELECT 'phrase', id::text, course_code, 'known', known_text, known_audio_id FROM course_practice_phrases WHERE known_audio_id IS NOT NULL
    UNION ALL SELECT 'phrase', id::text, course_code, 'target1', target_text, target1_audio_id FROM course_practice_phrases WHERE target1_audio_id IS NOT NULL
    UNION ALL SELECT 'phrase', id::text, course_code, 'target2', target_text, target2_audio_id FROM course_practice_phrases WHERE target2_audio_id IS NOT NULL)
  SELECT l.kind, l.id::text AS row_id, l.course_code, l.side, l.txt, l.aid, a.language, a.role, a.voice_id, a.origin, a.text AS audio_text,
         normalize_text(l.txt) AS want_key,
         (SELECT o.id FROM course_audio o WHERE o.course_code = l.course_code AND o.language = a.language AND o.role = a.role AND o.voice_id = a.voice_id
             AND o.text_normalized = normalize_text(l.txt) AND o.id <> l.aid AND (o.text ${QUESTION}) = (l.txt ${QUESTION})
             AND o.s3_key NOT LIKE 'pending/%' AND o.s3_key <> '' LIMIT 1) AS existing,
         -- the key the right variant would take is held by a row of the WRONG variant (one of the duplicate question
         -- renders the key backfill left at the stripped key): rendering would overwrite it, so this link waits for a dedupe
         EXISTS (SELECT 1 FROM course_audio o WHERE o.course_code = l.course_code AND o.language = a.language AND o.role = a.role AND o.voice_id = a.voice_id
             AND o.text_normalized = normalize_text(l.txt) AND (o.text ${QUESTION}) <> (l.txt ${QUESTION})) AS blocked
    FROM links l JOIN course_audio a ON a.id = l.aid
   WHERE (l.txt ${QUESTION}) <> (a.text ${QUESTION}) ${scope ? 'AND l.course_code = $1' : ''}`

async function plan(c, course) {
  const rows = (await c.query(WRONG_SQL(course), course ? [course] : [])).rows
  const human = rows.filter(r => r.origin === 'human')
  const todo = rows.filter(r => r.origin !== 'human')
  const blocked = todo.filter(r => r.blocked && !r.existing)
  const reuse = todo.filter(r => r.existing)
  const need = todo.filter(r => !r.existing && !r.blocked)
  const distinctNeed = new Map(need.map(r => [`${r.course_code}|${r.language}|${r.role}|${r.voice_id}|${r.want_key}`, r]))
  return { rows, human, reuse, need, blocked, distinctNeed }
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
      humanLeftAlone: p.human.length, blockedByDuplicateRow: p.blocked.length, repointableNow: p.reuse.length,
      needAudioLinks: p.need.length, needAudioDistinctClips: p.distinctNeed.size,
      needAudioChars: [...p.distinctNeed.values()].reduce((n, r) => n + r.txt.length, 0),
    }
    const ev = evidencePath(`tools/audio-question-variant-repoint/plan-${course || 'all'}-${Date.now()}.json`)
    fs.writeFileSync(ev, JSON.stringify({ summary, human: p.human, need: [...p.distinctNeed.values()] }))
    console.log(JSON.stringify({ ...summary, evidence: ev }, null, 2))

    if (argv.includes('--render-plan') || argv.includes('--render')) {
      const real = argv.includes('--render')
      const maxChars = Number(argv[argv.indexOf('--max-chars') + 1]) || 0
      const libraryOnly = argv.includes('--library-only')   // free: link only clips the library already holds, render nothing
      if (real && !maxChars && !libraryOnly) throw new Error('--render needs --max-chars N (the characters you are willing to spend this run)')
      const base = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')
      const clips = [...p.distinctNeed.entries()]
      const byKey = new Map()
      for (const r of p.need) { const k = `${r.course_code}|${r.language}|${r.role}|${r.voice_id}|${r.want_key}`; (byKey.get(k) || byKey.set(k, []).get(k)).push(r) }
      const results = []; let spent = 0, i = 0, stopped = null, retries = 0
      const worker = async () => {
        while (i < clips.length && !stopped) {
          const [key, r] = clips[i++]
          const body = { courseCode: r.course_code, role: r.role, text: r.txt, language: r.language,   // no voiceId: the route insists on the course's CURRENT cast voice (old Azure/xai ids are refused)
                         
                         purpose: '#586: right question/statement variant of a line whose recording was the other one', dryRun: !real }
          if (real && libraryOnly) {
            // ask first with a dry run; only a library hit proceeds to the real (free) call
            const d = await (await fetch(`${base}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'job-586' }, body: JSON.stringify({ ...body, dryRun: true }) })).json().catch(() => ({}))
            if (!(d.ok && d.source === 'library')) { results.push({ key, skipped: d.source || d.error || 'no library clip' }); continue }
          }
          let res, out
          try {
            res = await fetch(`${base}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'job-586' }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) })
            if (!res.ok && res.status >= 502) throw new Error(`HTTP ${res.status}`)
            out = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
          } catch (e) {
            await new Promise(r => setTimeout(r, 15000)); i--   // Popty restarting (a deploy): wait, then retry this clip
            if (++retries > 40) { stopped = 'Popty unreachable'; }
            continue
          }
          const chars = out.charsSpent || 0
          if (real) {
            spent += chars
            if (out.ok && out.audioId) {
              const moved = await repoint(c, byKey.get(key).map(l => ({ ...l, to: out.audioId })), 'render')
              results.push({ key, source: out.source, chars, audioId: out.audioId, moved: moved.moved })
            } else { results.push({ key, error: out.error || out.code || `HTTP ${res.status}` }); if (res.status === 402) stopped = out.code || '402 refusal' }
            if (maxChars && spent >= maxChars) stopped = `reached --max-chars ${maxChars}`
          } else results.push({ key, source: out.source || null, wouldSpendChars: out.ok ? (out.wouldSpendChars ?? (out.source === 'rendered' ? r.txt.length : 0)) : null, error: out.ok ? undefined : (out.error || out.code) })
        }
      }
      await Promise.all(Array.from({ length: real ? 1 : 3 }, worker))
      const tally = results.reduce((t, x) => { const k = x.error ? 'error' : x.source; t[k] = (t[k] || 0) + 1; return t }, {})
      const wouldChars = results.reduce((n, x) => n + (x.wouldSpendChars || 0), 0)
      const ev2 = evidencePath(`tools/audio-question-variant-repoint/${real ? 'rendered' : 'render-plan'}-${Date.now()}.json`)
      fs.writeFileSync(ev2, JSON.stringify({ tally, spent, wouldChars, stopped, results }))
      console.log(JSON.stringify({ mode: real ? 'render' : 'render-plan', tally, charsSpent: spent, wouldSpendChars: wouldChars, stopped, evidence: ev2 }, null, 2))
    }

    if (argv.includes('--repoint')) {
      const out = await repoint(c, p.reuse.map(r => ({ ...r, to: r.existing })), 'reuse')
      fs.writeFileSync(evidencePath(`tools/audio-question-variant-repoint/repointed-${Date.now()}.json`), JSON.stringify({ out, links: p.reuse.map(r => ({ kind: r.kind, row_id: r.row_id, side: r.side, from: r.aid, to: r.existing })) }))
      console.log('repointed to existing correct-variant rows:', JSON.stringify({ moved: out.moved, courses: out.courses.length }))
    }
  } finally { await c.end() }
}

if (require.main === module) main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
module.exports = { WRONG_SQL }
