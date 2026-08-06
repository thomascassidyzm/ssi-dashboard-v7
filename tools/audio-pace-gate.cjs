#!/usr/bin/env node
/**
 * audio-pace-gate — the ear proxy. Finds clipped/rushed takes that the whisper
 * veracity gate is DEAF to.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 * On 2026-08-06 Tom heard two German known-side clips as wrong. Both transcribed
 * perfectly: whisper CER 0, every word present, veracity PASS. The defect was
 * PACE — "I want to learn as often as possible" delivered in 1.70s where the
 * current generation says 2.18s. A transcription check cannot see that, so four
 * consecutive sweeps shipped past it and Tom's ear stayed the only instrument.
 *
 * This gate measures the thing the ear hears: how long a clip takes to say its
 * own text, against how long the CURRENT GENERATION of the same voice takes to
 * say text of the same length. A take materially faster than its own generation
 * is a rushed or clipped take.
 *
 * ── It is an OUTPUT CHECK, never a selector ─────────────────────────────────
 * Read that twice. Every previous attempt on this course failed by using a
 * cheap test to DECIDE WHAT TO REPLACE — markers, file age, tail decay — and
 * every definition missed rows. This tool runs over a FINISHED set to prove it
 * is clean. It must never be wired to drive a repair queue: if it is, its own
 * false negatives silently become the new stale set.
 *
 * ── The model ───────────────────────────────────────────────────────────────
 * duration ≈ a + b·characters, fitted by Theil–Sen (median of pairwise slopes)
 * on the reference generation only, so a handful of outliers in the reference
 * cannot drag the line. Theil–Sen because the reference set is small (hundreds)
 * and may itself contain a bad take or two; least squares would absorb them.
 *
 * A clip fails when its residual — (actual − predicted) / predicted — sits below
 * the threshold. The default threshold is the reference generation's OWN 2nd
 * percentile residual, floored at -0.15, so the gate is calibrated by what this
 * voice actually does rather than by a number someone guessed. Positive
 * residuals are never failures: a slow clip is not a defect.
 *
 * Short clips are noisy — the intercept dominates a 3-character clip — so texts
 * below --min-chars (default 8) are measured and reported but not failed.
 *
 * ── Loudness ────────────────────────────────────────────────────────────────
 * --loudness fetches the bytes the live app actually serves and runs ffmpeg
 * volumedetect, flagging mean-dB outliers against the reference generation's
 * own spread. It costs a fetch and a decode per clip, so it samples by default
 * (--loudness-sample, default 300). Duration analysis is free and always runs.
 *
 *   node tools/audio-pace-gate.cjs deu_for_eng --side known
 *   node tools/audio-pace-gate.cjs deu_for_eng --side known --since 2026-08-06 \
 *        --loudness --json docs/audio/deu-pace-gate.json
 *   node tools/audio-pace-gate.cjs --all-for-eng --side known    # estate sweep
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { execFile } = require('child_process')
const { createClient } = require('@supabase/supabase-js')

const argv = process.argv.slice(2)
const flag = (n, d = null) => {
  const i = argv.indexOf('--' + n)
  if (i === -1) return d
  const v = argv[i + 1]
  return v && !v.startsWith('--') ? v : true
}
const COURSES_ARG = argv.filter(a => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== undefined
  ? !String(argv[argv.indexOf(a) - 1]).startsWith('--') || argv.indexOf(a) === 0
  : true)
const positional = []
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) { if (argv[i + 1] && !argv[i + 1].startsWith('--')) i++; continue }
  positional.push(argv[i])
}

const SIDE = String(flag('side', 'known'))
const SINCE = flag('since', null)
const MIN_CHARS = Number(flag('min-chars', 8))
const THRESHOLD = flag('threshold') ? Number(flag('threshold')) : null
const OUT = flag('json', null)
const DO_LOUDNESS = argv.includes('--loudness')
const LOUDNESS_SAMPLE = Number(flag('loudness-sample', 300))
const APP_HOST = String(flag('host', 'saysomethingin.app'))
const ALL_FOR_ENG = argv.includes('--all-for-eng')
const REFERENCE_COURSE = flag('reference-course', null)
// Estate mode. Most courses have no rebuilt generation AND do not share deu's
// English voice — the known side across the estate is a patchwork of Azure,
// ElevenLabs and xai voices, so there is no single yardstick to borrow. What is
// still comparable is a clip against ITS OWN COURSE's central pace: a clipped
// take stands out from its neighbours whoever voiced them. That is what
// --self-reference measures, and it is a weaker claim — it cannot see a course
// that is uniformly rushed, only clips rushed relative to their own siblings.
const SELF_REFERENCE = argv.includes('--self-reference')

if (!positional.length && !ALL_FOR_ENG) {
  console.error('usage: audio-pace-gate <course> [--side known|target] [--since YYYY-MM-DD]')
  console.error('       audio-pace-gate --all-for-eng [--side known]')
  process.exit(1)
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

const KNOWN_ROLES = ['known', 'presentation']
const TARGET_ROLES = ['target1', 'target2']

// ── the model ───────────────────────────────────────────────────────────────

function theilSen (pts) {
  // Median of pairwise slopes. O(n²) — fine for the reference set (hundreds).
  const slopes = []
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[j][0] - pts[i][0]
      if (dx === 0) continue
      slopes.push((pts[j][1] - pts[i][1]) / dx)
    }
  }
  if (!slopes.length) return null
  const b = median(slopes)
  const a = median(pts.map(p => p[1] - b * p[0]))
  return { a, b }
}

const median = xs => {
  const s = [...xs].sort((x, y) => x - y)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const percentile = (xs, p) => {
  const s = [...xs].sort((x, y) => x - y)
  if (!s.length) return null
  return s[Math.max(0, Math.min(s.length - 1, Math.floor((p / 100) * s.length)))]
}

// ── data ────────────────────────────────────────────────────────────────────

async function pageAll (build) {
  const out = []
  const PAGE = 500
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    out.push(...(data || []))
    if (!data || data.length < PAGE) break
  }
  return out
}

async function loadCourse (course) {
  const roles = SIDE === 'target' ? TARGET_ROLES : KNOWN_ROLES
  const clips = await pageAll(() => db.from('course_audio')
    .select('id, text, duration_ms, role, voice_id, audio_revision, s3_key, created_at')
    .eq('course_code', course).in('role', roles).order('id'))

  const revs = await pageAll(() => db.from('course_audio_revisions')
    .select('audio_id, created_at').eq('course_code', course).order('audio_id'))

  return { clips, revs }
}

/** Reference generation = clips revised on/after `since`. Falls back to the most
 *  recent revision day present, so the tool is useful without being told a date. */
function referenceIds (revs, since) {
  if (!revs.length) return { ids: new Set(), since: null }
  let cut = since
  if (!cut) {
    const days = revs.map(r => String(r.created_at).slice(0, 10)).sort()
    cut = days[days.length - 1]
  }
  const ids = new Set(revs.filter(r => String(r.created_at).slice(0, 10) >= cut).map(r => r.audio_id))
  return { ids, since: cut }
}

// ── loudness ────────────────────────────────────────────────────────────────

const run = (bin, args) => new Promise((res, rej) =>
  execFile(bin, args, { maxBuffer: 1 << 26 }, (e, so, se) => e ? rej(new Error(se || e.message)) : res(so + se)))

async function meanDb (clip) {
  const url = `https://${APP_HOST}/api/audio/${clip.id}${clip.audio_revision > 1 ? '.v' + clip.audio_revision : ''}`
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const buf = Buffer.from(await r.arrayBuffer())
  const tmp = path.join(require('os').tmpdir(), `pace-${clip.id}.mp3`)
  fs.writeFileSync(tmp, buf)
  try {
    const out = await run('ffmpeg', ['-v', 'info', '-i', tmp, '-af', 'volumedetect', '-f', 'null', '-'])
    const m = out.match(/mean_volume:\s*(-?[\d.]+) dB/)
    return m ? Number(m[1]) : null
  } finally { try { fs.unlinkSync(tmp) } catch {} }
}

async function mapLimit (items, n, fn) {
  const out = []; let i = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; try { out[k] = await fn(items[k]) } catch { out[k] = null } }
  }))
  return out
}

// ── the gate ────────────────────────────────────────────────────────────────

/** Cross-course mode. Most courses have no rebuilt clips of their own, so they
 *  cannot self-calibrate. When the known side is the same English voice, the
 *  reference course's current generation is a valid yardstick — the gate checks
 *  the voice matches before borrowing it, and says so in the result. */
let BORROWED = null
async function loadReference (refCourse) {
  const { clips, revs } = await loadCourse(refCourse)
  const { ids, since } = referenceIds(revs, SINCE)
  return { course: refCourse, clips: clips.filter(c => ids.has(c.id) && c.duration_ms && c.text && !c.text.includes('::')), since }
}

async function gate (course) {
  const { clips, revs } = await loadCourse(course)
  // Retired takes carry a `::superseded-regen` suffix in their text. They are
  // linked to nothing, and their marker inflates the character count enough to
  // bend the fit — so they are out of scope for a gate that measures what plays.
  const usable = clips.filter(c => c.duration_ms && c.text && !c.text.includes('::'))
  const { ids: refIds, since } = referenceIds(revs, SINCE)
  let ref = usable.filter(c => refIds.has(c.id))
  let borrowedFrom = null

  if (ref.length < 12 && SELF_REFERENCE) {
    ref = usable
    borrowedFrom = 'self (whole course, no rebuilt generation exists)'
  }

  if (ref.length < 12 && BORROWED) {
    const voices = new Set(usable.map(c => c.voice_id))
    const refVoices = new Set(BORROWED.clips.map(c => c.voice_id))
    const shared = [...voices].filter(v => refVoices.has(v))
    if (!shared.length) {
      return { course, side: SIDE, total: usable.length,
        error: `no current-generation clips of its own, and no voice in common with ${BORROWED.course} ` +
               `(this course: ${[...voices].join(',')}) — cannot calibrate` }
    }
    ref = BORROWED.clips
    borrowedFrom = BORROWED.course
  }

  if (ref.length < 12) {
    return { course, side: SIDE, error: `only ${ref.length} reference clips since ${since} — cannot calibrate`,
      total: usable.length, referenceSince: since }
  }

  // Fit PER ROLE. A presentation line is paced differently from a phrase prompt,
  // and pooling them widens the spread until the gate cannot see anything.
  // Short texts are excluded from the fit as well as from failing: the intercept
  // dominates them, so they carry noise rather than pace information.
  const fits = {}
  for (const role of new Set(ref.map(c => c.role))) {
    const pts = ref.filter(c => c.role === role && c.text.length >= MIN_CHARS)
                   .map(c => [c.text.length, c.duration_ms])
    if (pts.length >= 12) fits[role] = theilSen(pts)
  }
  const fallback = theilSen(ref.filter(c => c.text.length >= MIN_CHARS).map(c => [c.text.length, c.duration_ms]))
  const fitFor = c => fits[c.role] || fallback
  const resid = c => {
    const f = fitFor(c)
    const p = f.a + f.b * c.text.length
    return p > 0 ? (c.duration_ms - p) / p : 0
  }
  // Calibrate on the reference generation's own low tail, clamped: never laxer
  // than -0.30 (or a badly-behaved reference hides real defects), never tighter
  // than -0.15 (or normal TTS jitter is reported as damage).
  const refRes = ref.filter(c => c.text.length >= MIN_CHARS).map(resid)
  const p2 = percentile(refRes, 2)
  const threshold = THRESHOLD !== null ? THRESHOLD : Math.max(-0.30, Math.min(-0.15, p2))

  const scored = usable.map(c => ({
    id: c.id, text: c.text, role: c.role, chars: c.text.length,
    durationMs: c.duration_ms, predictedMs: Math.round(fitFor(c).a + fitFor(c).b * c.text.length),
    residual: Number(resid(c).toFixed(3)), currentGen: refIds.has(c.id), revision: c.audio_revision,
  }))
  const failures = scored.filter(c => c.chars >= MIN_CHARS && c.residual < threshold)
                         .sort((x, y) => x.residual - y.residual)

  const result = {
    course, side: SIDE, referenceSince: since, borrowedReferenceFrom: borrowedFrom,
    model: Object.fromEntries(Object.entries({ ...fits, _fallback: fallback })
      .map(([r, f]) => [r, { intercept: Math.round(f.a), msPerChar: Number(f.b.toFixed(2)) }])),
    referenceClips: ref.length,
    referenceP2: p2 === null ? null : Number(p2.toFixed(3)),
    threshold: Number(threshold.toFixed(3)), minChars: MIN_CHARS,
    total: usable.length,
    currentGeneration: scored.filter(c => c.currentGen).length,
    offCurrentGeneration: scored.filter(c => !c.currentGen).length,
    failed: failures.length,
    failedOnCurrentGeneration: failures.filter(c => c.currentGen).length,
    failures: failures.slice(0, 500),
  }

  if (DO_LOUDNESS) {
    const pool = [...ref].sort(() => 0).slice(0, Math.min(60, ref.length))
    const refDb = (await mapLimit(pool, 6, meanDb)).filter(v => v !== null)
    if (refDb.length >= 10) {
      const lo = percentile(refDb, 2), hi = percentile(refDb, 98)
      const sample = scored.filter(c => !c.currentGen).slice(0, LOUDNESS_SAMPLE)
      const vals = await mapLimit(sample.map(c => clips.find(k => k.id === c.id)), 6, meanDb)
      const out = []
      sample.forEach((c, i) => {
        const v = vals[i]
        if (v !== null && v !== undefined && (v < lo - 3 || v > hi + 3)) out.push({ ...c, meanDb: v })
      })
      result.loudness = { referenceMeanDbRange: [lo, hi], sampled: sample.length, outliers: out.length, items: out.slice(0, 200) }
    } else {
      result.loudness = { error: `only ${refDb.length} reference clips measured — not enough to calibrate` }
    }
  }
  return result
}

;(async () => {
  let courses = positional
  if (ALL_FOR_ENG) {
    const { data, error } = await db.from('courses').select('course_code').like('course_code', '%_for_eng')
    if (error) throw new Error(error.message)
    courses = (data || []).map(r => r.course_code).sort()
  }

  if (REFERENCE_COURSE) {
    BORROWED = await loadReference(String(REFERENCE_COURSE))
    console.log(`reference: ${BORROWED.course} — ${BORROWED.clips.length} current-generation clip(s) since ${BORROWED.since}\n`)
  }

  const results = []
  for (const c of courses) {
    let r
    try { r = await gate(c) } catch (e) { r = { course: c, side: SIDE, error: e.message } }
    results.push(r)
    if (r.error) { console.log(`${c.padEnd(22)} ${r.error}`); continue }
    console.log(`${c.padEnd(22)} clips ${String(r.total).padStart(6)}  current-gen ${String(r.currentGeneration).padStart(6)}` +
      `  FAILED ${String(r.failed).padStart(6)}  ${String(Math.round(100*r.failed/Math.max(1,r.total))).padStart(3)}%` +
      `  ${r.borrowedReferenceFrom ? 'ref<-' + r.borrowedReferenceFrom : 'self-calibrated'}`)
  }

  if (OUT) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true })
    fs.writeFileSync(OUT, JSON.stringify(results.length === 1 ? results[0] : results, null, 1))
    console.log(`\njson -> ${OUT}`)
  }
})().catch(e => { console.error(e.message); process.exit(1) })
