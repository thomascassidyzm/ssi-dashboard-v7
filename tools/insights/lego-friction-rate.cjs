#!/usr/bin/env node
/**
 * lego-friction-rate — the one signal the nightly insight dump could not give.
 *
 * The Discovery digest ranks friction by RAW SKIP COUNT, so its top-12 is always
 * S0001–S0008: everyone passes the first seeds, nobody reaches seed 300. That is an
 * exposure artefact, not a content defect, and it is why the nightly findings read as
 * leads rather than tickets.
 *
 * This ranks friction PER LEARNER EXPOSED:
 *   exposure = distinct learners with an audio_play at that lego
 *   skips    = tap_skip + phase_skip + lego_skip events naming that lego
 *   rate     = skips / exposure, with a minimum-exposure floor so n=1 noise can't top it
 *
 * A lego at the top of THIS list is a content ticket for popty: enough people met it,
 * and they bailed out of it. Read-only. School-demo learners excluded, as the digest does.
 *
 * Usage: node tools/insights/lego-friction-rate.cjs [windowDays=30] [--min-exposure=5] [--json]
 */
const fs = require('fs')
const path = require('path')

function loadEnv(p) {
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
}
loadEnv(path.resolve(__dirname, '../../.env'))
loadEnv(path.resolve(__dirname, '../../.env.local'))

const BASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
if (!BASE || !KEY) { console.error('Missing SUPABASE env'); process.exit(1) }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

const argv = process.argv.slice(2)
const WINDOW_DAYS = Number(argv.find(a => /^\d+$/.test(a)) || 30)
const MIN_EXPOSURE = Number((argv.find(a => a.startsWith('--min-exposure=')) || '').split('=')[1] || 5)
const AS_JSON = argv.includes('--json')
const since = new Date(Date.now() - WINDOW_DAYS * 86400_000).toISOString()

async function pageAll(table, qs, cap = 400000) {
  const out = []
  for (let from = 0; from < cap; from += 1000) {
    const r = await fetch(`${BASE}/rest/v1/${table}?${qs}`, { headers: { ...H, Range: `${from}-${from + 999}` } })
    if (!r.ok) throw new Error(`${table} ${r.status}: ${await r.text()}`)
    const rows = await r.json()
    out.push(...rows)
    if (rows.length < 1000) break
  }
  return out
}
const legoOf = p => p && (p.legoId || p.lego_id || p.fromLegoId)

;(async () => {
  const demo = await pageAll('learners', 'select=id&educational_role=eq.student', 20000)
  const DEMO = new Set(demo.map(d => d.id))

  const plays = (await pageAll('player_events',
    `select=user_id,course_code,payload&event_type=eq.audio_play&occurred_at=gte.${since}`))
    .filter(r => !DEMO.has(r.user_id))
  const skips = (await pageAll('player_events',
    `select=user_id,course_code,payload&event_type=in.(tap_skip,phase_skip,lego_skip)&occurred_at=gte.${since}`))
    .filter(r => !DEMO.has(r.user_id))

  const exposure = new Map()   // key -> Set(learner)
  for (const r of plays) {
    const l = legoOf(r.payload); if (!l) continue
    const k = `${r.course_code}|${l}`
    if (!exposure.has(k)) exposure.set(k, new Set())
    exposure.get(k).add(r.payload.learnerId || r.user_id)
  }
  const skipCount = new Map(), skipLearners = new Map()
  for (const r of skips) {
    const l = legoOf(r.payload); if (!l) continue
    const k = `${r.course_code}|${l}`
    skipCount.set(k, (skipCount.get(k) || 0) + 1)
    if (!skipLearners.has(k)) skipLearners.set(k, new Set())
    skipLearners.get(k).add(r.payload.learnerId || r.user_id)
  }

  const rows = []
  for (const [k, learners] of exposure) {
    const n = learners.size
    if (n < MIN_EXPOSURE) continue
    const s = skipCount.get(k) || 0
    if (!s) continue
    const [course, lego] = k.split('|')
    rows.push({
      course, lego, exposed: n, skips: s,
      skippers: (skipLearners.get(k) || new Set()).size,
      rate: +(s / n).toFixed(2),
      share_of_learners: +((skipLearners.get(k) || new Set()).size / n).toFixed(2),
    })
  }
  rows.sort((a, b) => b.rate - a.rate || b.skips - a.skips)

  const result = {
    generated_at: new Date().toISOString(), window_days: WINDOW_DAYS,
    min_exposure: MIN_EXPOSURE,
    legos_scored: rows.length,
    real_learner_plays: plays.length, real_learner_skips: skips.length,
    top: rows.slice(0, 25),
  }
  if (AS_JSON) { console.log(JSON.stringify(result, null, 2)); return }

  console.log(`\nLEGO FRICTION PER LEARNER EXPOSED — ${WINDOW_DAYS}d, min ${MIN_EXPOSURE} learners exposed`)
  console.log(`${rows.length} legos scored from ${plays.length} plays / ${skips.length} skips (school-demo excluded)\n`)
  console.log('rate  skips  exposed  who-skipped  course              lego')
  for (const r of result.top) {
    console.log(
      `${String(r.rate).padStart(4)}  ${String(r.skips).padStart(5)}  ${String(r.exposed).padStart(7)}  ` +
      `${String(Math.round(r.share_of_learners * 100) + '%').padStart(11)}  ${r.course.padEnd(18)} ${r.lego}`)
  }
})().catch(e => { console.error(e.message); process.exit(1) })
