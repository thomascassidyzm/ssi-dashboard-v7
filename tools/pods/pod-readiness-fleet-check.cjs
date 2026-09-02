#!/usr/bin/env node
/**
 * pod-readiness-fleet-check.cjs — run the FIXED switchover readiness gate over every
 * course's listening pods, read-only, so the fleet's answer is known before anyone
 * promotes anything.
 *
 * READ-ONLY. No writes of any kind. Safe to re-run — and worth re-running after any
 * authoring or audio pass, since a pass that fills a known side changes the verdict.
 *
 * It imports `readinessBlockers` from pod-switchover.cjs itself rather than
 * re-implementing it: a re-implementation would prove nothing about the gate.
 *
 * The known-side blockers it can now report did not exist before 2026-09-02 —
 * `no_known_audio` was counted and discarded, `known_text` emptiness was never counted.
 *
 *   node tools/pods/pod-readiness-fleet-check.cjs [--json=out.json]
 */
'use strict'
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
const { readinessBlockers } = require('./pod-switchover.cjs')
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const arg = (n) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=').slice(1).join('=') : null }

const empty = (s) => !(typeof s === 'string' && s.trim().length > 0)

;(async () => {
  const { data: pods, error: e1 } = await db.from('listening_pods').select('id, course_code, slug')
  if (e1) throw e1

  // Count every pod's rows. ALWAYS .order('id') when paging: an unordered .range()
  // over multi-pod chunks duplicates rows (census #89's hard-won lesson).
  const counts = new Map()
  const ids = pods.map(p => p.id)
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20)
    let from = 0
    for (;;) {
      const { data, error } = await db.from('listening_pod_sentences')
        .select('pod_id, known_text, target_text, target_text_draft, target_audio_id, known_audio_id')
        .in('pod_id', chunk).order('id').range(from, from + 999)
      if (error) throw error
      for (const r of data) {
        const c = counts.get(r.pod_id) ||
          { n: 0, no_text: 0, draft: 0, no_target_audio: 0, no_known_text: 0, no_known_audio: 0 }
        c.n++
        if (empty(r.target_text)) c.no_text++
        if (r.target_text_draft) c.draft++
        if (r.target_audio_id == null) c.no_target_audio++
        if (empty(r.known_text)) c.no_known_text++
        if (r.known_audio_id == null) c.no_known_audio++
        counts.set(r.pod_id, c)
      }
      if (data.length < 1000) break
      from += 1000
    }
  }

  const zero = { n: 0, no_text: 0, draft: 0, no_target_audio: 0, no_known_text: 0, no_known_audio: 0 }
  const byCourse = new Map()
  for (const p of pods) {
    const e = byCourse.get(p.course_code) || { course: p.course_code, pods: [] }
    const c = counts.get(p.id) || { ...zero }
    e.pods.push({ slug: p.slug, counts: c, blockers: readinessBlockers(c) })
    byCourse.set(p.course_code, e)
  }

  // The slug the player actually serves: pod-1 preferred, pod-0 fallback (SERVING_POD_SLUGS).
  const serving = (e) => e.pods.find(p => p.slug === 'pod-1') || e.pods.find(p => p.slug === 'pod-0') || null
  const rows = [...byCourse.values()].map(e => {
    const s = serving(e)
    return { course: e.course, live_slug: s ? s.slug : null, counts: s ? s.counts : null,
             blockers: s ? s.blockers : ['no pod-1 or pod-0 pod at all'], all_pods: e.pods }
  }).sort((a, b) => a.course.localeCompare(b.course))

  const on1 = rows.filter(r => r.live_slug === 'pod-1')
  const on0 = rows.filter(r => r.live_slug === 'pod-0')
  const knownSide = (b) => b.some(x => /no known (text|audio)/.test(x))

  const show = (label, list) => {
    console.log(`\n=== ${label} (${list.length}) ===`)
    for (const r of list) {
      const c = r.counts || zero
      const verdict = r.blockers.length ? `REFUSED: ${r.blockers.join('; ')}` : 'PASSES'
      console.log(`${r.course.padEnd(20)} ${String(r.live_slug).padEnd(6)} n=${String(c.n).padEnd(4)} ${verdict}`)
    }
  }
  show('live on pod-1', on1)
  show('live on pod-0', on0)

  console.log(`\n--- headline ---`)
  console.log(`courses with a listening pod: ${rows.length}`)
  console.log(`already on pod-1: ${on1.length}; of those the fixed gate would REFUSE: ${on1.filter(r => r.blockers.length).length}` +
              `, on KNOWN-SIDE blockers: ${on1.filter(r => knownSide(r.blockers)).length}`)
  console.log(`still on pod-0: ${on0.length}; the fixed gate would REFUSE: ${on0.filter(r => r.blockers.length).length}` +
              `, on KNOWN-SIDE blockers: ${on0.filter(r => knownSide(r.blockers)).length}`)

  // Every non-serving pod too — a staged POD 1 waiting on a pod-0 course is exactly
  // what the gate would be run against on the day someone promotes it.
  const staged = rows.flatMap(r => r.all_pods.filter(p => p.slug !== r.live_slug).map(p => ({ course: r.course, ...p })))
  console.log(`\n=== non-serving (staged/archived) pods (${staged.length}) ===`)
  for (const p of staged) {
    console.log(`${p.course.padEnd(20)} ${p.slug.padEnd(34)} n=${String(p.counts.n).padEnd(4)} ` +
                (p.blockers.length ? `REFUSED: ${p.blockers.join('; ')}` : 'PASSES'))
  }

  const out = arg('json')
  if (out) { fs.writeFileSync(out, JSON.stringify({ generated: new Date().toISOString(), rows }, null, 2)); console.log(`\nwrote ${out}`) }
})().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
