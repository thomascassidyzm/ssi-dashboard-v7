const P = require('./paths.cjs')
require('dotenv').config({ path: P.envPath })
/**
 * Run the silence-substitution probe over a course's seed-1 live clips and emit
 * (a) the full distribution and (b) the suspicion ranking the listening page reads.
 *
 * The ranking is a RANKING, not a verdict. It exists so Kai starts with the most
 * suspicious clips, and all 65 are listed so he can disconfirm it.
 */
const fs = require('fs')
const { probeAll, pct } = require('./silence-substitution.cjs')

const COURSE = process.env.LISTEN_COURSE || 'fra_for_eng'
const manifest = JSON.parse(fs.readFileSync(P.manifest(COURSE), 'utf8'))

// Expected syllables from the text. Vowel-group counting: crude, and used only as a
// weak corroborator against measured voiced nuclei — never on its own.
function expectedSyllables (text, lang) {
  if (!text) return null
  const t = text.toLowerCase().replace(/::[a-z-]+/g, '').replace(/[^a-zà-ÿ' ]/g, ' ').trim()
  if (!t) return null
  let n = 0
  for (let w of t.split(/\s+/)) {
    const groups = w.match(/[aeiouyàâäéèêëîïôöùûüÿ]+/g)
    let s = groups ? groups.length : 1
    if (/^(fr|fra)/.test(lang || '')) {
      if (/e$/.test(w) && s > 1) s--            // French final mute e
      if (/(es|ent)$/.test(w) && s > 1) s--     // and mute plural / 3pl endings
    } else {
      if (/e$/.test(w) && !/[aeiouy]e$/.test(w) && s > 1) s--
    }
    n += Math.max(1, s)
  }
  return n
}

const med = a => pct(a, 0.5)
const mad = a => { const m = med(a); return med(a.map(v => Math.abs(v - m))) || 1e-9 }

;(async () => {
  const clips = manifest.clips.map(c => ({
    id: c.id, s3_key: c.s3_key, role: c.role, voice_id: c.voice_id, language: c.language,
    text: c.text, db_duration_ms: c.duration_ms
  }))
  const res = (await probeAll(clips, COURSE)).filter(r => r.ok)
  const failed = res.length - clips.length
  console.log(`${COURSE}: ${clips.length} clips, ${res.length} measured, ${clips.length - res.length} failed`)

  for (const r of res) {
    r.expSyll = expectedSyllables(r.text, r.language)
    r.nucleusDeficit = (r.expSyll && r.nuclei != null) ? +(r.expSyll - r.nuclei).toFixed(1) : null
    r.deficitRatio = (r.expSyll) ? +(r.nuclei / r.expSyll).toFixed(3) : null
  }

  // Robust z-scores WITHIN (role, voice) — a presentation clip read by eve is not
  // comparable to a one-word target read by leo, and pooling them would manufacture
  // outliers out of role differences.
  const groups = new Map()
  for (const r of res) {
    const k = `${r.role}|${r.voice_id}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(r)
  }
  for (const [k, g] of groups) {
    for (const m of ['trailingSilenceMs', 'trailingFraction', 'deficitRatio']) {
      const vals = g.map(r => r[m]).filter(v => v != null)
      if (vals.length < 3) { for (const r of g) r[m + 'Z'] = null; continue }
      const m0 = med(vals), s0 = 1.4826 * mad(vals)
      for (const r of g) r[m + 'Z'] = (r[m] == null || s0 <= 0) ? null : +((r[m] - m0) / s0).toFixed(2)
    }
  }

  // Suspicion score: trailing silence unusually long FOR ITS OWN GROUP, plus a
  // shortfall of voiced nuclei against the text. Both point at "speech that should
  // be there isn't". Weighted, not thresholded — this orders the listening page.
  for (const r of res) {
    const a = Math.max(0, r.trailingFractionZ ?? 0)
    const b = Math.max(0, r.trailingSilenceMsZ ?? 0)
    const c = Math.max(0, -(r.deficitRatioZ ?? 0))
    r.score = +(a * 1.0 + b * 0.5 + c * 1.5).toFixed(2)
  }
  res.sort((x, y) => y.score - x.score)
  res.forEach((r, i) => { r.rank = i + 1 })

  const D = m => { const v = res.map(r => r[m]).filter(x => x != null); return { n: v.length, min: pct(v, 0), p10: pct(v, 0.1), p25: pct(v, 0.25), med: pct(v, 0.5), p75: pct(v, 0.75), p90: pct(v, 0.9), max: pct(v, 1) } }
  const dist = {
    trailingSilenceMs: D('trailingSilenceMs'),
    trailingFraction: D('trailingFraction'),
    floorGapDb: D('floorGapDb'),
    trailingZeroMs: D('trailingZeroMs'),
    fallMs: D('fallMs'),
    stepDb: D('stepDb'),
    deficitRatio: D('deficitRatio'),
    speechMs: D('speechMs')
  }
  console.log('\n=== DISTRIBUTIONS (all measured clips) ===')
  for (const [k, v] of Object.entries(dist)) {
    console.log(k.padEnd(20), `n=${v.n}`.padEnd(7), 'min', String(v.min).padStart(8), 'p10', String(v.p10).padStart(8),
      'med', String(v.med).padStart(8), 'p90', String(v.p90).padStart(8), 'max', String(v.max).padStart(8))
  }

  console.log('\n=== TOP 20 BY SUSPICION ===')
  console.log('#'.padStart(3), 'score'.padStart(6), 'trailMs'.padStart(8), 'frac'.padStart(7), 'nucl/exp'.padStart(9), 'fallMs'.padStart(7), ' role/voice  text')
  for (const r of res.slice(0, 20)) {
    console.log(String(r.rank).padStart(3), String(r.score).padStart(6), String(r.trailingSilenceMs).padStart(8),
      String(r.trailingFraction).padStart(7), `${r.nuclei}/${r.expSyll}`.padStart(9), String(r.fallMs).padStart(7),
      ` ${r.role}/${r.voice_id}  ${(r.text || '').slice(0, 46)}`)
  }

  fs.writeFileSync(P.measurements(COURSE),
    JSON.stringify({ course: COURSE, measured: res.length, failed: clips.length - res.length, distributions: dist, clips: res }, null, 2))
  fs.writeFileSync(P.suspicion(COURSE),
    JSON.stringify(res.map(r => ({
      id: r.id, rank: r.rank, score: r.score,
      trailingSilenceMs: r.trailingSilenceMs, trailingFraction: r.trailingFraction,
      stepDb: r.stepDb, fallMs: r.fallMs, nuclei: r.nuclei, expSyll: r.expSyll,
      note: `trail ${r.trailingSilenceMs}ms (${(r.trailingFraction * 100).toFixed(1)}% of clip), ${r.nuclei} voiced nuclei vs ~${r.expSyll} expected`
    })), null, 2))
  console.log(`\nwrote ${P.measurements(COURSE)}\n   and ${P.suspicion(COURSE)}`)
})().catch(e => { console.error('FATAL', e.message, e.stack); process.exit(1) })
