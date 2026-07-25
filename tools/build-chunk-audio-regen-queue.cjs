#!/usr/bin/env node
/**
 * build-chunk-audio-regen-queue.cjs — STAGED regen queue for the chunk-audio
 * coverage gaps found by `tools/audit-chunk-audio-coverage.cjs` (run that
 * first; this reads its JSON). STAGING ONLY — this script NEVER calls a TTS
 * provider or spends money; it writes one `*-STAGED.json` file per pod
 * (same shape as the existing `azure-rerender-queue-*-STAGED.json` pattern)
 * for the founder to review and approve before anything renders.
 *
 * Two buckets per pod:
 *   - `cut_candidates`  — source audio already exists (whole-take/Take-G);
 *     these just need a re-alignment pass to slice at the exact seam.
 *     ZERO TTS cost — an alignment job, not a render.
 *   - `render_candidates` — no source audio anywhere; needs either a fresh
 *     TTS render (cost estimated where the target's provider/rate is on
 *     file — Azure only, $4/M chars, `services/audio-generation-planner.cjs`)
 *     or a human-recording booking (Tier-0 languages, no per-char cost).
 *     xAI-voiced targets have NO documented per-char rate in this repo —
 *     flagged `rate_tbd`, cost left null rather than guessed.
 *
 *   node tools/build-chunk-audio-regen-queue.cjs [courseFilter]
 */
const fs = require('fs')
const path = require('path')
const { resolveTargetPool, KNOWN_POOL } = require('./pod-voice-coverage.cjs')
const { isHumanVoiceCourse } = require('../services/shared/human-voice-courses.cjs')

const AZURE_COST_PER_MILLION_CHARS_USD = 4.0 // services/audio-generation-planner.cjs s0 tier

const courseFilter = process.argv[2] || null
const auditPath = path.join(__dirname, '..', 'docs', 'pods', 'chunk-audio-coverage-2026-07-17.json')
if (!fs.existsSync(auditPath)) {
  console.error(`Missing ${auditPath} — run tools/audit-chunk-audio-coverage.cjs first.`)
  process.exit(1)
}
const results = JSON.parse(fs.readFileSync(auditPath, 'utf8'))

function targetLangFor(courseCode) {
  const m = /^(.+?)_for_/.exec(courseCode)
  return m ? m[1] : courseCode
}

function resolvePod(courseCode) {
  const lang = targetLangFor(courseCode)
  // English-target pods (eng_for_*, English course for non-English speakers)
  // aren't in TARGET — resolveTargetPool's own comment: "English isn't in
  // TARGET — English is never a target language" (elsewhere in the course
  // estate). They use the curated xAI KNOWN_POOL (Tom's clone) instead.
  if (lang === 'eng' || lang === 'en') return { tier: 1, provider: 'xai', locale: KNOWN_POOL.locale, note: 'eng target — xAI KNOWN_POOL (Tom clone)' }
  try {
    return resolveTargetPool(lang)
  } catch (e) {
    return { tier: null, provider: 'unknown', note: e.message }
  }
}

const outDir = path.join(__dirname, 'course-optimization')
fs.mkdirSync(outDir, { recursive: true })

const summary = []
for (const r of results) {
  if (courseFilter && !r.courseCode.includes(courseFilter)) continue
  // Human-voice-only courses (Welsh cym_*) are never synthesised (Tom 2026-07-25):
  // never stage a TTS regen queue for them.
  if (isHumanVoiceCourse(r.courseCode)) { console.log(`${r.courseCode}: human-voice-only — no TTS queue staged (Tom 2026-07-25)`); continue }
  // Stage a file only where there's an actual GAP (nothing playable) — the
  // cut-candidate opportunity (source exists, already plays via fallback) is
  // real but zero-cost and non-urgent; it's summarised course-wide below
  // instead of spawning a queue file per pod that has nothing to spend on.
  if (!r.missing.length) continue

  const pool = resolvePod(r.courseCode)
  const chars = r.missing.reduce((a, m) => a + (m.text || '').length, 0)

  let costUsd = null
  let renderAction = 'tts_render'
  let rateNote = pool.note || ''
  if (pool.provider === 'human') {
    renderAction = 'human_recording'
    rateNote = pool.note || 'no TTS voice for this target — human studio recording required, cost is studio time not per-char'
  } else if (pool.provider === 'azure') {
    costUsd = Math.round((chars / 1_000_000) * AZURE_COST_PER_MILLION_CHARS_USD * 10000) / 10000
  } else if (pool.provider === 'xai') {
    rateNote = `${pool.note || ''} — xAI has no documented per-char rate in this repo; approve a rate before running, cost intentionally left null`
  }

  const podSlug = r.pod.split(':').slice(1).join(':').replace(/[^a-z0-9-]/gi, '_')
  const fname = `chunk-audio-regen-queue-${r.courseCode}-${podSlug}-STAGED.json`
  const staged = {
    pod_id: r.pod,
    course_code: r.courseCode,
    reason: 'chunk-audio coverage audit 2026-07-17 — S-LEGO seam chunks with no playable audio at any fallback tier (founder ruling 2026-07-17, graceful-fallback fix)',
    status: 'STAGED — not queued for render, awaiting approval',
    provider: pool.provider,
    provider_tier: pool.tier,
    provider_note: rateNote,
    cut_candidates: {
      note: 'source audio already exists (whole-sentence/Take-G take); these already play via fallback — re-aligning would upgrade them to exact-slice at ZERO TTS cost',
      count: r.cutCandidates.length,
      items: r.cutCandidates,
    },
    render_candidates: {
      action: renderAction,
      count: r.missing.length,
      total_chars: chars,
      cost_per_million_chars_usd: pool.provider === 'azure' ? AZURE_COST_PER_MILLION_CHARS_USD : null,
      estimated_cost_usd: costUsd,
      items: r.missing,
    },
  }
  fs.writeFileSync(path.join(outDir, fname), JSON.stringify(staged, null, 2))
  summary.push({ pod: r.pod, file: fname, provider: pool.provider, renderAction, chars, costUsd, cutCount: r.cutCandidates.length, missingCount: r.missing.length })
}

console.log('Staged queue files written to tools/course-optimization/:')
for (const s of summary) {
  console.log(`  ${s.file}  [${s.provider}/${s.renderAction}]  render:${s.missingCount} (${s.chars} chars${s.costUsd != null ? `, ~$${s.costUsd}` : ', cost n/a'})  cut:${s.cutCount}`)
}
const totalCost = summary.reduce((a, s) => a + (s.costUsd || 0), 0)
console.log(`\nTotal estimated TTS spend (Azure-priced entries only): ~$${Math.round(totalCost * 10000) / 10000}`)
console.log('xAI-voiced and human-recording entries have NO cost figure — approve rate/booking separately before running.')
console.log('NOTHING WAS RENDERED. Staging only — approve explicitly before any TTS call.')

// Course-wide free-upgrade summary (source exists, just needs re-alignment,
// zero TTS cost) — informational, no queue file per pod for this bucket.
const cutTotal = results.reduce((a, r) => a + r.cutCandidates.length, 0)
const cutByPod = results.filter((r) => r.cutCandidates.length > 0)
fs.writeFileSync(
  path.join(__dirname, '..', 'docs', 'pods', 'chunk-audio-cut-candidates-2026-07-17.json'),
  JSON.stringify(cutByPod.map((r) => ({ pod: r.pod, count: r.cutCandidates.length, items: r.cutCandidates })), null, 2),
)
console.log(`\nFree upgrade opportunity (approx→exact via re-alignment, zero TTS cost): ${cutTotal} chunks across ${cutByPod.length} pods.`)
console.log('Full list: docs/pods/chunk-audio-cut-candidates-2026-07-17.json (not staged for spend — no cost to approve).')
