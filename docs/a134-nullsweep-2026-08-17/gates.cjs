// A-134 null sweep — the seven gates, reused verbatim from
// docs/a134-sin27-2026-08-17/gates-12.cjs, with ONE addition:
//
//   Gate 5 is EXTENDED to assert zero මමා tokens as well as zero 'ඒ ගෙ' pairs.
//
// මමා is a corrupt spelling of මම ("I") that the voice reads aloud as "mamaa". It is a
// second, distinct defect class from the 'ඒ ගෙ' placeholder this plate was built around
// (measured 2026-08-17: 1,076 clips carry it in text, 73 of them learner-reachable). Two
// of the nine clips this sweep replaces carried it, so it gets a permanent gate here for
// the same reason 'ඒ ගෙ' did — a defect that has been shipped once must never regress
// silently.
const base = require('../a134-sin27-2026-08-17/gates-12.cjs')
const { normalizeSin, tokenCorpus, wordsPresent, tailFloorDb, ffprobeDurationMs } = base

function runGates(row, ttsText, wordBoundaries, ms, file) {
  const res = base.runGates(row, ttsText, wordBoundaries, ms, file)
  const corpus = tokenCorpus(wordBoundaries)

  // Gate 5b — the මමා extension. Word-boundary aware: මමා must not appear as a token,
  // and must not appear inside one either (the corruption has been seen welded to a
  // following particle).
  const mamaa = corpus.match(/මමා/g)
  if (mamaa) res.fail.push(`gate5b_mamaa_regression: ${mamaa.length} මමා voiced`)
  res.gate5b_no_mamaa = !mamaa

  // Also assert the other corruptions this sweep is displacing never come back.
  for (const bad of ['මමතා', 'ෙවෙනස', 'ඥග', 'දිහා', 'නනිකු']) {
    if (corpus.includes(bad)) res.fail.push(`gate5c_known_corruption_voiced: ${bad}`)
  }
  return res
}

module.exports = { ...base, runGates }

// ---------------------------------------------------------------------------
// Gate 2, ellipsis-corrected. NOT a widened tolerance — a corrected model.
//
// The course uses a literal '...' in Sinhala card text as a deliberate authoring
// convention marking a gap the learner fills (74 presentation clips carry it).
// Azure voices it as a real pause, which the char-count rate model
// (ms ≈ 3143 + 45.4 × chars) does not include. Measured across this course's own
// 2,266 presentation clips on 2026-08-17:
//
//   without '...'  n=2192  mean z=-0.09  sd 0.77  |z|>3 in   0.3%
//   with    '...'  n=  74  mean z=+3.68  sd 1.09  |z|>3 in  91.9%
//
// So for ellipsis-bearing text the base gate fires on 92% of GOOD clips — it is
// measuring the convention, not the clip. For those, judge the residual against
// the ellipsis population instead (n=74, stated plainly rather than hidden).
const ELLIPSIS_MEAN = 3.68, ELLIPSIS_SD = 1.09, ELLIPSIS_N = 74

function runGatesEllipsisAware(row, ttsText, wordBoundaries, ms, file) {
  const res = runGates(row, ttsText, wordBoundaries, ms, file)
  if (!ttsText.includes('...')) return res
  const zEll = (res.z - ELLIPSIS_MEAN) / ELLIPSIS_SD
  res.z_ellipsis = +zEll.toFixed(2)
  res.ellipsis_model = { mean: ELLIPSIS_MEAN, sd: ELLIPSIS_SD, n: ELLIPSIS_N }
  res.fail = res.fail.filter(f => !f.startsWith('gate2_duration_z_out_of_range'))
  if (Math.abs(zEll) > 3) res.fail.push(`gate2_duration_z_out_of_range_ellipsis: z_ell=${zEll.toFixed(2)}`)
  return res
}

module.exports.runGatesEllipsisAware = runGatesEllipsisAware
