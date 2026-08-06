const P = require('./paths.cjs')
require('dotenv').config({ path: P.psqlEnvPath })
/**
 * CALIBRATION FIRST. A detector nobody has shown a known positive to is a
 * threshold plucked from air.
 *
 * The candidate positives are the deu_for_eng clips marked ::superseded-regen —
 * clips a human judged CUT and paid to replace. Each is paired with the
 * replacement that supersedes it: same text, same role, same voice, rendered
 * later. Old = candidate positive, new = candidate negative.
 *
 * The 2026-08-06 census found these pairs measure INDISTINGUISHABLY under a
 * truncation detector. Under Kai's model that is exactly the expected result —
 * so the question this script answers is the only one that matters: does the
 * silence-substitution probe separate them where the truncation probe could not?
 *
 * Honest failure is a real outcome here. If the pairs don't separate, this
 * prints that, and the listening page is what decides.
 */
const { Client } = require('pg'); const fs = require('fs')
const { probeAll, pct } = require('./silence-substitution.cjs')

const SQL = `
with sup as (
  select id, course_code, role, voice_id, language, s3_key, duration_ms, created_at,
         trim(regexp_replace(text, '::superseded[a-z-]*', '', 'gi')) as base_text
    from course_audio
   where course_code = 'deu_for_eng' and text ilike '%::superseded%'
), rep as (
  select id, course_code, role, voice_id, language, s3_key, duration_ms, created_at,
         trim(text) as base_text
    from course_audio
   where course_code = 'deu_for_eng' and text not ilike '%::superseded%'
)
select s.id as old_id, s.s3_key as old_key, s.duration_ms as old_ms, s.created_at as old_at,
       r.id as new_id, r.s3_key as new_key, r.duration_ms as new_ms, r.created_at as new_at,
       s.role, s.voice_id, s.language, s.base_text
  from sup s
  join lateral (
    select * from rep r
     where r.base_text = s.base_text and r.role = s.role and r.voice_id is not distinct from s.voice_id
       and r.created_at > s.created_at
     order by r.created_at asc limit 1
  ) r on true
 order by s.created_at desc`

const fmt = n => n == null ? '  n/a' : String(n).padStart(7)

;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect()
  const { rows } = await c.query(SQL)
  await c.end()
  console.log(`paired superseded->replacement clips: ${rows.length}`)
  if (!rows.length) { console.log('NO PAIRS — calibration impossible, say so.'); process.exit(0) }

  const olds = rows.map(r => ({ id: r.old_id, s3_key: r.old_key, side: 'old', pair: r.old_id, role: r.role, voice_id: r.voice_id, text: r.base_text, db_duration_ms: r.old_ms }))
  const news = rows.map(r => ({ id: r.new_id, s3_key: r.new_key, side: 'new', pair: r.old_id, role: r.role, voice_id: r.voice_id, text: r.base_text, db_duration_ms: r.new_ms }))

  const res = await probeAll([...olds, ...news], 'calibration')
  const byPair = new Map()
  for (const r of res) {
    if (!byPair.has(r.pair)) byPair.set(r.pair, {})
    byPair.get(r.pair)[r.side] = r
  }

  const METRICS = ['trailingSilenceMs', 'trailingFraction', 'floorGapDb', 'trailingZeroMs', 'stepDb', 'fallMs', 'msPerNucleus', 'speechMs', 'nuclei']
  const pairs = [...byPair.values()].filter(p => p.old?.ok && p.new?.ok)
  console.log(`usable pairs (both sides decoded): ${pairs.length}`)

  console.log('\n=== PER-PAIR, old (candidate CUT) vs new (candidate CLEAN) ===')
  console.log('text'.padEnd(38), 'trailMs old/new'.padEnd(18), 'floorGapDb'.padEnd(16), 'fallMs'.padEnd(14), 'msPerNucl')
  for (const p of pairs) {
    console.log(
      (p.old.text || '').slice(0, 36).padEnd(38),
      `${fmt(p.old.trailingSilenceMs)}/${fmt(p.new.trailingSilenceMs)}`.padEnd(18),
      `${fmt(p.old.floorGapDb)}/${fmt(p.new.floorGapDb)}`.padEnd(16),
      `${fmt(p.old.fallMs)}/${fmt(p.new.fallMs)}`.padEnd(14),
      `${fmt(p.old.msPerNucleus)}/${fmt(p.new.msPerNucleus)}`)
  }

  console.log('\n=== SEPARATION per metric ===')
  console.log('A metric separates only if old and new differ CONSISTENTLY in one direction.')
  console.log('metric'.padEnd(20), 'old med'.padStart(10), 'new med'.padStart(10), 'old>new'.padStart(9), 'old<new'.padStart(9), 'verdict')
  const separating = []
  for (const m of METRICS) {
    const o = pairs.map(p => p.old[m]).filter(v => v != null)
    const n = pairs.map(p => p.new[m]).filter(v => v != null)
    if (!o.length || !n.length) { console.log(m.padEnd(20), 'no data'); continue }
    let hi = 0, lo = 0, eq = 0
    for (const p of pairs) {
      const a = p.old[m], b = p.new[m]
      if (a == null || b == null) continue
      if (a > b) hi++; else if (a < b) lo++; else eq++
    }
    const tot = hi + lo + eq
    const dom = Math.max(hi, lo) / (tot || 1)
    // A metric "separates" only if it points the same way in >=80% of pairs.
    const verdict = dom >= 0.8 ? `SEPARATES (${(dom * 100).toFixed(0)}% one way)` : `no (${(dom * 100).toFixed(0)}% dominant)`
    if (dom >= 0.8) separating.push({ metric: m, direction: hi > lo ? 'old higher' : 'old lower', dominance: dom })
    console.log(m.padEnd(20), fmt(pct(o, 0.5)).padStart(10), fmt(pct(n, 0.5)).padStart(10),
      String(hi).padStart(9), String(lo).padStart(9), verdict)
  }

  console.log('\n=== HEADLINE ===')
  if (!separating.length) {
    console.log('NULL RESULT: no metric separates the known candidates consistently.')
    console.log('The probe cannot tell a replaced-for-being-cut clip from its replacement.')
  } else {
    console.log('Metrics that separate the candidate pairs:')
    for (const s of separating) console.log(`  ${s.metric}: ${s.direction} in ${(s.dominance * 100).toFixed(0)}% of pairs`)
  }

  fs.writeFileSync(P.calibration, JSON.stringify({
    pairCount: pairs.length, separating,
    pairs: pairs.map(p => ({ text: p.old.text, role: p.old.role, voice: p.old.voice_id, old: p.old, new: p.new }))
  }, null, 2))
})().catch(e => { console.error('FATAL', e.message); process.exit(1) })
