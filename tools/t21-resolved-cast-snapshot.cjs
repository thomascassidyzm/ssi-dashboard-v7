#!/usr/bin/env node
/**
 * T-21 resolved-cast snapshot — the "nothing that is currently correct moves"
 * proof, over EVERY course, not a sample.
 *
 *   node tools/t21-resolved-cast-snapshot.cjs before.json
 *   node tools/t21-resolved-cast-snapshot.cjs after.json --diff before.json
 *
 * For every row in `courses` it resolves the pool keys three ways and then
 * resolves the actual cast a canonical two-hander would get:
 *
 *   old_api    poolKeyFor(target_lang) / poolKeyFor(known_lang)
 *              — what api/pod-cast-voices.js and PodLab did before T-21. This
 *                is the path that could not tell deu_at from deu.
 *   old_tools  poolKeyFor(<code target part>) / poolKeyFor(<code known part>)
 *              — what tools/pod-sync.cjs and tools/pod-recast.cjs already did.
 *                This is the path that actually casts, so it is the baseline
 *                that must not move.
 *   new        poolKeysForCourse(pools, course) — the T-21 resolver.
 *
 * Read-only: it opens the DB, resolves in memory, writes a JSON file. It never
 * writes a row and never generates audio.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
const { resolveCast, poolKeyFor, poolKeysForCourse, loadVoicePools } = require('./pod-sync.cjs')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// A canonical two-hander: one explicitly female label, one explicitly male, so
// both pool genders are exercised on both tracks.
const FIXTURE = ['Anna (F)', 'Bruno (M)']

function castOf(pools, tk, kk) {
  try {
    const c = resolveCast(FIXTURE, tk, kk, pools)
    return {
      pool_keys: { target: tk, known: kk },
      f: { target: c['Anna'].target, known: c['Anna'].known },
      m: { target: c['Bruno'].target, known: c['Bruno'].known },
    }
  } catch (e) {
    return { pool_keys: { target: tk, known: kk }, error: e.message }
  }
}

function codeParts(code) {
  const [t, k] = String(code).split('_for_')
  return { target: t || '', known: k || '' }
}

async function main() {
  const out = process.argv[2]
  if (!out) throw new Error('usage: t21-resolved-cast-snapshot.cjs <out.json> [--diff <before.json>]')
  const diffIdx = process.argv.indexOf('--diff')
  const before = diffIdx > -1 ? JSON.parse(fs.readFileSync(process.argv[diffIdx + 1], 'utf8')) : null

  const pools = await loadVoicePools()
  const { data: courses, error } = await supabase
    .from('courses').select('course_code, target_lang, known_lang, voice_pool_key').order('course_code')
  if (error) throw new Error(`load courses: ${error.message}`)

  const snap = { courses: {} }
  for (const c of courses) {
    const parts = codeParts(c.course_code)
    let neu
    try {
      const k = poolKeysForCourse(pools, c)
      neu = castOf(pools, k.target, k.known)
    } catch (e) {
      neu = { error: e.message }
    }
    snap.courses[c.course_code] = {
      target_lang: c.target_lang,
      known_lang: c.known_lang,
      voice_pool_key: c.voice_pool_key || null,
      old_api: castOf(pools, poolKeyFor(pools, c.target_lang), poolKeyFor(pools, c.known_lang)),
      old_tools: castOf(pools, poolKeyFor(pools, parts.target), poolKeyFor(pools, parts.known)),
      new: neu,
    }
  }
  fs.writeFileSync(out, JSON.stringify(snap, null, 2))
  console.log(`\n📸 ${Object.keys(snap.courses).length} courses → ${out}`)

  if (!before) return

  // The claim under test: for every course, the NEW resolution equals the
  // BEFORE run's old_tools resolution — the path that actually casts — unless
  // the course is on the deliberate list.
  const moved = []
  const fixed = []
  for (const [code, now] of Object.entries(snap.courses)) {
    const was = before.courses[code]
    if (!was) { moved.push({ course: code, note: 'new course, no before row' }); continue }
    const a = JSON.stringify(was.old_tools)
    const b = JSON.stringify(now.new)
    if (a !== b) moved.push({ course: code, before_old_tools: was.old_tools, after_new: now.new })
    if (JSON.stringify(was.old_api) !== b) fixed.push(code)
  }
  console.log(`\n── vs ${process.argv[diffIdx + 1]} ──`)
  console.log(`   casting path (old_tools → new): ${moved.length} moved, ${Object.keys(snap.courses).length - moved.length} byte-identical`)
  for (const m of moved) console.log(`     MOVED  ${m.course}: ${JSON.stringify(m.before_old_tools?.f?.target?.name)}/${JSON.stringify(m.before_old_tools?.m?.target?.name)} → ${JSON.stringify(m.after_new?.f?.target?.name)}/${JSON.stringify(m.after_new?.m?.target?.name)}`)
  console.log(`   PodLab path  (old_api → new):   ${fixed.length} differ: ${fixed.join(', ') || '(none)'}`)
  fs.writeFileSync(out.replace(/\.json$/, '-diff.json'), JSON.stringify({ moved, api_path_differs: fixed }, null, 2))
}

main().catch((e) => { console.error(`\n❌ ${e.message}\n`); process.exit(1) })
