#!/usr/bin/env node
/** Scheduled READ-ONLY summary builder. Run only once merged through PR.
 * All DB statements use the agent door, keyed pages and the 5-second cap.
 * Writes only the atomic summary file. Never renders or changes pointers/content.
 * node tools/voice-coverage/refresh.cjs [--course C] [--out file]
 * A filtered probe requires --out so it cannot replace the estate summary.
 */
const path = require('path')
const fs = require('fs')
const db = require('../../services/shared/agent-db.cjs')
const { summariseSide, summariseLanguages, neededLines, seedOf, OFFERABLE, snapshotReader, writeAtomic, SUMMARY_PATH } = require('../../services/shared/voice-coverage.cjs')
const { clipLanguageKey } = require('../../services/shared/clip-index.cjs')
const rv = require('../../services/shared/resolve-voice.cjs')
const { generateLearningScript } = require('../../services/learning-script-generator.cjs')
const PAGE = 1000
const pause = () => new Promise(r => setTimeout(r, 25))

// Whitelisted course-content tables and their ordered keys. No dynamic input SQL.
const KEYS = { course_seeds: ['seed_number'], course_legos: ['lego_id'],
  course_practice_phrases: ['seed_number', 'lego_index', 'position', 'id'], lego_introductions: ['lego_id'] }
async function content(pg, table, code) {
  const keys = KEYS[table]
  if (!keys) throw new Error('Unknown content table')
  const cols = keys.join(', '), out = []
  let cursor = null
  for (;;) {
    const where = cursor ? ` AND (${cols}) > (${keys.map((_, i) => `$${i + 2}`).join(', ')})` : ''
    const { rows } = await pg.query(`SELECT * FROM ${table} WHERE course_code = $1${where} ORDER BY ${cols} LIMIT ${PAGE}`, [code, ...(cursor || [])])
    out.push(...rows)
    if (rows.length < PAGE) return out
    cursor = keys.map(k => rows.at(-1)[k])
    if (cursor.some(v => v == null)) throw new Error(`Null pagination key in ${table}`)
    await pause()
  }
}
async function loadIndex(pg) {
  const index = new Map(), voices = new Map(), flagged = new Map()
  let cursor = ['', '', ''], entries = 0, playable = 0, failing = 0
  for (;;) {
    // Materialise the bounded PK page BEFORE joining clips by UUID primary key.
    const { rows } = await pg.query(`WITH page AS MATERIALIZED (
      SELECT language, text_key, voice_id, audio_id, origin FROM clip_index
      WHERE (language, text_key, voice_id) > ($1, $2, $3)
      ORDER BY language, text_key, voice_id LIMIT ${PAGE})
      SELECT p.*, a.s3_key, a.duration_ms, a.veracity_pass FROM page p LEFT JOIN course_audio a ON a.id = p.audio_id
      ORDER BY p.language, p.text_key, p.voice_id`, cursor)
    for (const r of rows) {
      if (!voices.has(r.language)) voices.set(r.language, new Set())
      voices.get(r.language).add(r.voice_id)
      entries++
      if (!r.s3_key || r.s3_key.startsWith('pending/') || Number(r.duration_ms || 0) <= 200) continue
      // A clip failing the speech check never enters a menu (design §6); counted, not held.
      if (r.veracity_pass === false) {
        const fk = `${r.language}\u001f${r.voice_id}`
        flagged.set(fk, (flagged.get(fk) || 0) + 1); failing++
        continue
      }
      const key = `${r.language}\u001f${r.text_key}`
      if (!index.has(key)) index.set(key, new Map())
      index.get(key).set(r.voice_id, r.origin === 'human' ? 'human' : 'tts'); playable++
    }
    if (rows.length < PAGE) break
    const last = rows.at(-1); cursor = [last.language, last.text_key, last.voice_id]
    await pause()
  }
  return { index, voices, flagged, entries, playable, failing }
}
async function presentations(pg, code, ids) {
  const out = new Map()
  for (let i = 0; i < ids.length; i += 100) {
    const { rows } = await pg.query(`SELECT lego_id, text, s3_key, created_at FROM course_audio
      WHERE course_code = $1 AND role = 'presentation' AND lego_id = ANY($2::text[])`, [code, ids.slice(i, i + 100)])
    for (const row of rows) {
      const prev = out.get(row.lego_id)
      const real = !!row.s3_key && !row.s3_key.startsWith('pending/')
      const prevReal = !!prev?.s3_key && !prev.s3_key.startsWith('pending/')
      if (!prev || (real && !prevReal) || (real === prevReal && row.created_at > prev.created_at)) out.set(row.lego_id, row)
    }
    await pause()
  }
  return out
}
async function refresh({ courseCode, out = SUMMARY_PATH } = {}) {
  const startedAt = new Date().toISOString()
  const pg = await db.connect({ app: 'agent:voice-coverage-summary' })
  try {
    await pg.query('SET default_transaction_read_only = on')
    const courses = (await pg.query('SELECT course_code, known_lang, target_lang, dialect, voice_pool_key, known_dialect, version FROM courses ORDER BY course_code')).rows
    const cast = { roles: (await pg.query('SELECT language, gender, slot, rank, voice_id, notes, assigned_by FROM voice_language_roles')).rows,
      voices: (await pg.query('SELECT voice_id, display_name, human_name, is_active, gender FROM voices')).rows }
    const config = (await pg.query('SELECT key, config FROM algorithm_config')).rows
    if (!config.some(r => r.key === 'script_shape')) throw new Error('Missing live script_shape; refusing fallback coverage')
    const held = await loadIndex(pg)
    console.error(`Index: ${held.entries} entries, ${held.playable} playable, ${held.failing} failing the speech check`)
    const result = [], needs = new Map()
    for (const course of courses.filter(c => !courseCode || c.course_code === courseCode)) {
      try {
        const tables = { courses: [course], algorithm_config: config }
        for (const table of Object.keys(KEYS)) tables[table] = await content(pg, table, course.course_code)
        const script = await generateLearningScript(snapshotReader(tables), course.course_code, Number.MAX_SAFE_INTEGER, 0, { learnerView: false })
        if (tables.course_legos.some(l => l.is_new !== false) && !script.rounds?.length) throw new Error('Generator emitted no rounds for existing content')
        const intros = await presentations(pg, course.course_code, [...new Set(tables.course_legos.map(l => l.lego_id))])
        const sides = [], courseNeeds = []
        for (const side of ['target', 'known']) {
          const language = clipLanguageKey(side === 'known' ? course.known_lang : course.target_lang, course)
          if (!language) throw new Error(`Ambiguous ${side} language`)
          const resolutions = (side === 'known' ? ['known'] : ['target1', 'target2']).map(role => ({ role, ...rv.resolveVoice({ course, role }, cast) }))
          const rounds = (script.rounds || []).map(r => ({ number: r.roundNumber, seed: seedOf(r), texts: r.items.map(item =>
            side === 'target' ? item.target_text : item.type === 'intro' ? intros.get(item.legoId)?.text ?? null : item.known_text) }))
          courseNeeds.push([language, neededLines(rounds).all])
          sides.push({ side, castResolution: resolutions, ...summariseSide({ language, rounds,
            voices: [...(held.voices.get(language) || [])], cast: resolutions.filter(r => r.status === 'voice').map(r => r.voiceId), index: held.index }) })
        }
        for (const [language, lines] of courseNeeds) {
          if (!needs.has(language)) needs.set(language, { lines: new Set(), courses: new Set() })
          const n = needs.get(language); n.courses.add(course.course_code); for (const k of lines) n.lines.add(k)
        }
        result.push({ courseCode: course.course_code, version: course.version, sides })
        console.error(`${course.course_code}: ${script.rounds?.length || 0} rounds`)
      } catch (e) {
        result.push({ courseCode: course.course_code, error: e.message })
        console.error(`${course.course_code}: GAP ${e.message}`)
      }
      await pause()
    }
    if (courseCode && !result.length) throw new Error(`Unknown course: ${courseCode}`)
    const summary = { schemaVersion: 2, startedAt, generatedAt: new Date().toISOString(), refreshHours: 6,
      scope: 'Full authored production rounds, default fast mode: introductions, builds, consolidation, spaced reviews and whole-seed returns. Each voice covers one language side; pods and personalised runtime choices are separate.',
      indexEntries: held.entries, playableEntries: held.playable, failingSpeechCheck: held.failing, offerableRule: OFFERABLE,
      languageCoverage: summariseLanguages({ needs, voices: held.voices, index: held.index, flagged: held.flagged }),
      languages: [...held.voices].map(([language, ids]) => ({ language, voices: [...ids] })),
      voiceNames: Object.fromEntries(cast.voices.map(v => [v.voice_id, v.human_name || v.display_name || v.voice_id])), courses: result }
    writeAtomic(out, summary)
    return summary
  } finally { await pg.end() }
}
if (require.main === module) {
  const args = process.argv.slice(2), value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined
  if (value('--course') && !value('--out')) throw new Error('--course requires --out (protects estate summary)')
  // A second scheduled/manual builder must not duplicate the index walk.
  const out = value('--out') || SUMMARY_PATH, lock = `${out}.lock`
  fs.mkdirSync(path.dirname(out), { recursive: true })
  let fd
  try { fd = fs.openSync(lock, 'wx') } catch { console.error(`Coverage refresh already locked: ${lock}`); process.exit(2) }
  fs.writeFileSync(fd, String(process.pid))
  const unlock = () => { try { fs.closeSync(fd); fs.unlinkSync(lock) } catch {} }
  process.on('SIGTERM', () => { unlock(); process.exit(143) })
  refresh({ courseCode: value('--course'), out }).then(s => { unlock(); console.error(`Wrote ${out}; ${s.courses.filter(c => c.error).length} course gaps`) }, e => { unlock(); console.error(e.message); process.exitCode = 1 })
}
module.exports = { refresh, loadIndex, content }
