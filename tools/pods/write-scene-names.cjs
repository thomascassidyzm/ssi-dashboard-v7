#!/usr/bin/env node
/**
 * write-scene-names — copy the learner-facing scene names from their one source
 * (services/shared/pod-scene-names/<cut>.json) onto every course pod whose shape
 * matches a named cut, in that course's KNOWN language, as
 * listening_pods.metadata.scene_names. The learner app shows "Scene N - Name".
 *
 * DRY RUN BY DEFAULT: prints what each pod would get. --apply writes one UPDATE
 * per changed pod, through the agent-db door, touching ONLY the scene_names key
 * of metadata (jsonb_set) — never sentences, audio, speakers or any other
 * metadata key, so a concurrent writer of the same row loses nothing.
 * Retired slugs are left alone. A known language the cut has no names for is
 * skipped (the app then shows "Scene N"), never filled with English.
 *
 *   node tools/pods/write-scene-names.cjs [--course=<code>] [--apply]
 */
'use strict'
const { sceneShape, planSceneNames, loadCuts } = require('../../services/shared/pod-scene-names.cjs')

const isRetired = (slug) => /retired-/.test(String(slug || ''))
const QUIET_SKIPS = new Set(['shape matches no named cut', 'no scene shape'])

/**
 * Pure: courses [{course_code, known_lang}], pods [{id, course_code, slug, scene_names}],
 * sentenceRows [{pod_id, scene_number}] → { writes: [{podId, knownLang, cut, names}], skips, unchanged }.
 */
function planWrites({ courses, pods, sentenceRows, cuts = loadCuts() }) {
  const known = new Map(courses.map(c => [c.course_code, c.known_lang]))
  const rowsByPod = new Map()
  for (const r of sentenceRows) {
    if (!rowsByPod.has(r.pod_id)) rowsByPod.set(r.pod_id, [])
    rowsByPod.get(r.pod_id).push(r)
  }
  const writes = [], skips = []
  let unchanged = 0
  for (const pod of pods) {
    if (isRetired(pod.slug) || !known.has(pod.course_code)) continue
    const knownLang = known.get(pod.course_code)
    const plan = planSceneNames({ shape: sceneShape(rowsByPod.get(pod.id)), knownLang, cuts })
    if (plan.skip) { if (!QUIET_SKIPS.has(plan.skip)) skips.push({ podId: pod.id, reason: plan.skip }); continue }
    if (JSON.stringify(pod.scene_names || null) === JSON.stringify(plan.names)) { unchanged++; continue }
    writes.push({ podId: pod.id, knownLang, cut: plan.cut, names: plan.names })
  }
  return { writes, skips, unchanged }
}

async function run({ apply, only, log = console.log }) {
  const db = require('../../services/shared/agent-db.cjs')
  const pg = await db.connect()
  try {
    const courseSql = only
      ? ['select course_code, known_lang from courses where course_code = $1', [only]]
      : ['select course_code, known_lang from courses', []]
    const { rows: courses } = await pg.query(...courseSql)
    const codes = courses.map(c => c.course_code)
    const { rows: pods } = await pg.query(
      `select id, course_code, slug, metadata->'scene_names' as scene_names from listening_pods where course_code = any($1::text[])`, [codes])
    const ids = pods.filter(p => !isRetired(p.slug)).map(p => p.id)
    const { rows: sentenceRows } = await pg.query(
      `select pod_id, scene_number from listening_pod_sentences where pod_id = any($1::text[])`, [ids])
    const plan = planWrites({ courses, pods, sentenceRows })
    for (const s of plan.skips) log(`SKIP ${s.podId}: ${s.reason}`)
    let written = 0
    for (const w of plan.writes) {
      log(`${apply ? 'WRITE' : 'WOULD WRITE'} ${w.podId} [${w.knownLang}] 1=${w.names['1']} | 8=${w.names['8'] || '-'}`)
      if (!apply) continue
      const res = await pg.query(
        `update listening_pods set metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{scene_names}', $2::jsonb), updated_at = now() where id = $1`,
        [w.podId, JSON.stringify(w.names)])
      written += res.rowCount
    }
    const summary = { apply: !!apply, writes: plan.writes.length, written, unchanged: plan.unchanged, skipped: plan.skips.length }
    log(JSON.stringify(summary))
    return summary
  } finally {
    await pg.end()
  }
}

module.exports = { planWrites, run }

if (require.main === module) {
  const arg = (n) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=').slice(1).join('=') : null }
  run({ apply: process.argv.includes('--apply'), only: arg('course') })
    .catch(e => { console.error('FAILED:', e.message || e); process.exit(1) })
}
