#!/usr/bin/env node
/**
 * build-lab-data.cjs — bake the prosody-lab study artifacts into the static
 * JSON the VAD Lab surface (/admin/configs/vad) fetches at runtime.
 *
 * Reads temp/prosody-lab/ (gitignored study output — re-runnable via
 * tools/prosody-lab/run-study.sh) and writes public/vad-lab/ (committed, so
 * the deployed dashboard has it). Audio itself is NOT copied:
 * every study clip is a course_audio row, so the deployed learning-app proxy
 * (https://saysomethingin.app/api/audio/:id) serves it already.
 *
 * Contents: per-pair scores from results.jsonl + clip metadata from
 * pairs.json + the report's dimension/AUC tables + per-clip 150-point energy
 * contours (the phrase-carrying dimension) for the overlay visualisation,
 * plus syllable-peak times for the axis ticks.
 * F0 contours (semitones re the clip's own median — register-normalised) ARE
 * shipped as of v2, by founder direction, strictly as an EXPERIMENTAL display
 * track: the study's finding stands that melody is voice-dominated (AUC
 * 0.464), so F0 is never folded into any score — the surface labels it so.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const SRC = path.join(ROOT, 'temp/prosody-lab')
const OUT_DIR = path.join(ROOT, 'public/vad-lab')
// The payload ships as ~30KB part-files + a manifest, reassembled by the app.
// Not an optimisation: some networks (Tom's, 2026-07-28) corrupt any HTTPS
// upload over ~50KB, so a single 900KB JSON could never be pushed or deployed
// from them. Small parts keep every git/API POST under that ceiling.
const PART_BYTES = 30 * 1024

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
    sylT: feat.syllable_peak_t || [],
    // experimental pitch-shape display track — register-normalised, never scored
    f0: feat.f0_contour_st ? feat.f0_contour_st.map((v) => round(v, 1)) : null,
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
for (const f of fs.readdirSync(OUT_DIR)) fs.unlinkSync(path.join(OUT_DIR, f))
const payload = Buffer.from(JSON.stringify(out))
const parts = []
for (let off = 0; off < payload.length; off += PART_BYTES) {
  const name = `lab-data.part-${String(parts.length).padStart(2, '0')}`
  fs.writeFileSync(path.join(OUT_DIR, name), payload.subarray(off, off + PART_BYTES))
  parts.push(name)
}
fs.writeFileSync(
  path.join(OUT_DIR, 'manifest.json'),
  JSON.stringify({ parts, bytes: payload.length, generated: out.generated })
)
console.log(
  `wrote ${OUT_DIR} — ${pairs.length} pairs, ${Object.keys(contours).length} contours` +
    (missing ? `, ${missing} clips missing features` : '') +
    `, ${(payload.length / 1024).toFixed(0)} KB in ${parts.length} parts`
)
