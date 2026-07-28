#!/usr/bin/env node
/**
 * build-lab-data.cjs — bake the prosody-lab study artifacts into the static
 * JSON the VAD Lab surface (/admin/configs/vad) fetches at runtime.
 *
 * Reads temp/prosody-lab/ (gitignored study output — re-runnable via
 * tools/prosody-lab/run-study.sh) and writes public/vad-lab/lab-data.json
 * (committed, so the deployed dashboard has it). Audio itself is NOT copied:
 * every study clip is a course_audio row, so the deployed learning-app proxy
 * (https://saysomethingin.app/api/audio/:id) serves it already.
 *
 * Contents: per-pair scores from results.jsonl + clip metadata from
 * pairs.json + the report's dimension/AUC tables + per-clip 150-point energy
 * contours (the phrase-carrying dimension) for the overlay visualisation.
 * F0 contours are deliberately NOT shipped — the study's finding is that
 * melody is voice, not phrase; the lab must not invite scoring it.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const SRC = path.join(ROOT, 'temp/prosody-lab')
const OUT_DIR = path.join(ROOT, 'public/vad-lab')
const OUT = path.join(OUT_DIR, 'lab-data.json')

const results = fs
  .readFileSync(path.join(SRC, 'results.jsonl'), 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))
const pairsFile = JSON.parse(fs.readFileSync(path.join(SRC, 'pairs.json'), 'utf8'))
const report = JSON.parse(fs.readFileSync(path.join(SRC, 'report.json'), 'utf8'))

const clipMeta = new Map(pairsFile.clips.map((c) => [c.id, c]))

// Combined phrase-identity score — same maths as prosody.py report():
// each surviving dim scaled by its median over the cross+far pool, averaged.
const scale = report.combined_score.median_scale
const DIMS = report.combined_score.dims
function combined(r) {
  const v = DIMS.filter((d) => r[d] != null).map((d) => r[d] / (scale[d] || 1))
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

const round = (x, dp = 3) => (x == null ? null : Math.round(x * 10 ** dp) / 10 ** dp)

const neededClips = new Set()
const pairs = results.map((r) => {
  const a = clipMeta.get(r.a_id) || {}
  const b = clipMeta.get(r.b_id) || {}
  neededClips.add(r.a_id)
  neededClips.add(r.b_id)
  return {
    pair_id: r.pair_id,
    category: r.category,
    language: r.language,
    same_bytes: !!r.same_bytes,
    text_a: r.text,
    text_b: r.text_b,
    a: { id: r.a_id, voice: r.a_voice, origin: r.a_origin, provider: a.provider || null },
    b: { id: r.b_id, voice: r.b_voice, origin: r.b_origin, provider: b.provider || null },
    dims: {
      energy_dtw: round(r.energy_dtw),
      dur_log_ratio: round(r.dur_log_ratio),
      syl_count_diff: r.syl_count_diff,
      syl_rate_diff: round(r.syl_rate_diff),
      f0_dtw: round(r.f0_dtw),
      f0_range_diff_st: round(r.f0_range_diff_st),
      f0_register_gap_st: round(r.f0_register_gap_st),
      voiced_frac_diff: round(r.voiced_frac_diff),
      pause_diff: r.pause_diff,
    },
    combined: round(combined(r)),
  }
})

// Energy contours (z-scored, 150 points) + duration for every clip in a pair.
const contours = {}
let missing = 0
for (const id of neededClips) {
  const f = path.join(SRC, 'features', `${id}.json`)
  if (!fs.existsSync(f)) {
    missing++
    continue
  }
  const feat = JSON.parse(fs.readFileSync(f, 'utf8'))
  contours[id] = {
    e: (feat.energy_contour_z || []).map((v) => round(v, 2)),
    dur: round(feat.duration_s, 2),
    syl: feat.syllable_peaks,
  }
}

const out = {
  generated: new Date().toISOString(),
  source: 'tools/prosody-lab study — docs/course-optimization/prosody-lab-poc.md',
  n_pairs: pairs.length,
  n_clips: Object.keys(contours).length,
  dims: DIMS,
  dimension_discrimination: report.dimension_discrimination,
  stats_by_category: report.stats_by_category,
  combined_score: report.combined_score,
  pairs,
  contours,
}

fs.mkdirSync(OUT_DIR, { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(out))
console.log(
  `wrote ${OUT} — ${pairs.length} pairs, ${Object.keys(contours).length} contours` +
    (missing ? `, ${missing} clips missing features` : '') +
    `, ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`
)
