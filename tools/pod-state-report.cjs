#!/usr/bin/env node
/**
 * Pod state report (READ-ONLY) — what listening-pod content actually exists.
 *
 * For each course (or all), counts listening_pod_sentences coverage so we can
 * see at a glance what is DONE vs MISSING:
 *
 *   keep (known + target):  target_text / known_text + target_audio / known_audio
 *   atom_map
 *
 * The explainer_text / explainer_decomposition / explainer_audio_id columns
 * were reported here as a "rework zone" until the pod-sentence explainer
 * narration track was deprecated (Tom, 2026-08-24: "Explainers do not exist
 * anymore. We don't do them."). Those columns are no longer read or reported
 * on by this tool.
 *
 * Reads only. Writes nothing, deletes nothing, spends nothing.
 *
 * Usage:
 *   node tools/pod-state-report.cjs                      # every course, summary
 *   node tools/pod-state-report.cjs spa_for_eng ita_for_eng
 *   node tools/pod-state-report.cjs --all-pods spa_for_eng   # include choice pods
 *
 * Needs SUPABASE_URL + SUPABASE_SERVICE_KEY (from .env). On a bare checkout run
 * `npm install` first so @supabase/supabase-js is available.
 */

const path = require('path')
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
} catch (_) {
  /* dotenv optional; rely on process env */
}

// NO LITERAL SLUG. This report used to filter on a hard-coded `pod-0` suffix,
// which since Tom's 1-based ruling of 2026-08-22 reports ZERO sentences for the
// 22 courses that moved to `pod-1`. The rule lives once, in
// tools/pods/serving-slug.cjs.
const { fetchServingSlug } = require('./pods/serving-slug.cjs')

function getSupabase() {
  let createClient
  try {
    ;({ createClient } = require('@supabase/supabase-js'))
  } catch (_) {
    console.error('@supabase/supabase-js not installed — run `npm install` first.')
    process.exit(1)
  }
  const url = (process.env.SUPABASE_URL || '').trim()
  const key = (process.env.SUPABASE_SERVICE_KEY || '').trim()
  if (!url || !key) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set — load your .env.')
    process.exit(1)
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function pct(n, d) {
  if (!d) return '  -  '
  return `${String(Math.round((100 * n) / d)).padStart(3)}%`
}

async function listCourses(supabase) {
  const { data, error } = await supabase
    .from('listening_pods')
    .select('course_code')
  if (error) throw new Error(`list courses: ${error.message}`)
  return [...new Set((data || []).map((r) => r.course_code))].sort()
}

async function reportCourse(supabase, courseCode, { allPods }) {
  // Paginate so large courses are fully counted (PostgREST caps rows per call).
  const cols =
    'id, pod_id, target_text, known_text, target_audio_id, known_audio_id, atom_map'
  const rows = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('listening_pod_sentences')
      .select(cols)
      .like('pod_id', `${courseCode}:%`)
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`${courseCode}: ${error.message}`)
    rows.push(...(data || []))
    if (!data || data.length < PAGE) break
  }
  const servingPodId = allPods ? null : `${courseCode}:${await fetchServingSlug(supabase, courseCode)}`
  const sents = rows.filter((r) =>
    allPods ? true : String(r.pod_id || '') === servingPodId,
  )
  const has = (v) => v !== null && v !== undefined && v !== '' &&
    !(Array.isArray(v) && v.length === 0)
  const c = {
    total: sents.length,
    target_text: sents.filter((r) => has(r.target_text)).length,
    known_text: sents.filter((r) => has(r.known_text)).length,
    target_audio: sents.filter((r) => has(r.target_audio_id)).length,
    known_audio: sents.filter((r) => has(r.known_audio_id)).length,
    atom_map: sents.filter((r) => has(r.atom_map)).length,
  }
  return c
}

async function main() {
  const args = process.argv.slice(2)
  const allPods = args.includes('--all-pods')
  let courses = args.filter((a) => !a.startsWith('--'))
  const supabase = getSupabase()
  if (courses.length === 0) courses = await listCourses(supabase)

  const scope = allPods ? 'ALL pods' : 'pod-0 only'
  console.log(`\nPod state report (${scope})\n`)
  const head = [
    'course'.padEnd(16),
    'sents'.padStart(6),
    'tgtTxt', 'knwTxt', 'tgtAud', 'knwAud', 'atomMap',
  ].join(' ')
  console.log(head)
  console.log('-'.repeat(head.length))

  const totals = {}
  for (const course of courses) {
    let c
    try {
      c = await reportCourse(supabase, course, { allPods })
    } catch (e) {
      console.log(`${course.padEnd(16)}  ERROR: ${e.message}`)
      continue
    }
    for (const k of Object.keys(c)) totals[k] = (totals[k] || 0) + c[k]
    console.log(
      [
        course.padEnd(16),
        String(c.total).padStart(6),
        pct(c.target_text, c.total), pct(c.known_text, c.total),
        pct(c.target_audio, c.total), pct(c.known_audio, c.total),
        pct(c.atom_map, c.total),
      ].join(' '),
    )
  }

  if (courses.length > 1 && totals.total) {
    console.log('-'.repeat(head.length))
    console.log(
      [
        'TOTAL'.padEnd(16),
        String(totals.total).padStart(6),
        pct(totals.target_text, totals.total), pct(totals.known_text, totals.total),
        pct(totals.target_audio, totals.total), pct(totals.known_audio, totals.total),
        pct(totals.atom_map, totals.total),
      ].join(' '),
    )
  }
  console.log('\n(read-only — nothing was written)\n')
}

main().catch((e) => {
  console.error('pod-state-report failed:', e.message)
  process.exit(1)
})
