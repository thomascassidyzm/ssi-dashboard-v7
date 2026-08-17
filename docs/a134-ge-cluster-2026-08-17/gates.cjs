// A-134 bare-ගෙ cluster — gates for PHRASE KNOWN clips.
//
// Built on docs/a134-sin27-2026-08-17/gates-12.cjs, which gates PRESENTATION clips.
// Three of that file's gates do not transfer and are deliberately NOT reused:
//   gate3 (headword voiced)   — a phrase clip has no headword
//   gate4 (final token ඉතින්) — that is the presentation composer's closing word
//   gate7 (example voiced)    — a phrase clip has no example sentence
// In their place, gate3' asserts EVERY word of the phrase is voiced, which is the
// stronger check the presentation gates could not make.
//
// gate5 is EXTENDED AGAIN. The nullsweep gate already banned 'ඒ ගෙ' and the මමා family.
// This adds the defect this job exists for: a STANDALONE ගෙ token must never be voiced.
// ගෙදර ("home") and ගෙන are real words CONTAINING ගෙ and must still pass, so the check
// is word-boundary aware, run over the TTS word boundaries rather than the raw string.
//
// RATE MODEL, gate2. The presentation model (3143 + 45.4 × chars, sd 221) does NOT
// transfer to known/phrase clips. Refitted here on this course's own known/sin clips in
// this voice, 2026-08-17:
//
//   all known/sin clips   n=13,412  ms = 1398.2 + 45.57 × chars  sd 149.9
//   excluding "..." text  n=13,338  ms = 1387.6 + 45.78 × chars  sd 133.3
//
// This independently REPRODUCES the earlier worker's figure (1398.0 + 45.58x, sd 149.6,
// n=13,301) — same coefficients to three significant figures on a slightly larger set.
// Scored against the 13,338 ellipsis-free clips it fires on 1.0% at |z|>3, so it is a
// gate and not a rubber stamp. NONE of the 24 texts in this job contain '...', so the
// ellipsis correction is not engaged; it is kept below only so this file stays reusable.
const base = require('../a134-sin27-2026-08-17/gates-12.cjs')
const { normalizeSin, tokenCorpus, wordsPresent, tailFloorDb, ffprobeDurationMs } = base

const RATE = { intercept: 1398.2, slope: 45.57, sd: 149.9, n: 13412 }
const ELLIPSIS = { mean: 3.68, sd: 1.09, n: 74 }

// A standalone ගෙ among the voiced tokens. Word-boundary aware: ගෙදර / ගෙන pass.
function bareGeTokens(wordBoundaries) {
  return (wordBoundaries || [])
    .map(t => normalizeSin(t.text))
    .filter(t => t === 'ගෙ')
}

function runGates(row, ttsText, wordBoundaries, ms, file) {
  const fail = []
  const corpus = tokenCorpus(wordBoundaries)

  // Gate 1 — decodes, and the decoded length matches what was recorded
  let ffprobeMs = null
  try {
    ffprobeMs = ffprobeDurationMs(file)
    if (Math.abs(ffprobeMs - ms) > 60) fail.push(`gate1_duration_mismatch: recorded ${ms}ms vs ffprobe ${ffprobeMs}ms`)
  } catch (e) { fail.push(`gate1_decode_error: ${e.message}`) }

  // Gate 2 — duration within 3 sd of the refitted known/sin model
  const chars = ttsText.length
  const expected = RATE.intercept + RATE.slope * chars
  let z = (ms - expected) / RATE.sd
  const isEllipsis = ttsText.includes('...')
  if (isEllipsis) {
    const zEll = (z - ELLIPSIS.mean) / ELLIPSIS.sd
    if (Math.abs(zEll) > 3) fail.push(`gate2_duration_z_out_of_range_ellipsis: z_ell=${zEll.toFixed(2)}`)
  } else if (Math.abs(z) > 3) {
    fail.push(`gate2_duration_z_out_of_range: z=${z.toFixed(2)}`)
  }

  // Gate 3' — EVERY word of the phrase is voiced (replaces the presentation headword gate)
  const spoken = wordsPresent(ttsText, corpus)
  if (!spoken.ok) fail.push(`gate3_phrase_not_fully_voiced: missing ${JSON.stringify(spoken.missing)}`)

  // Gate 5 — filler regression, inherited and extended
  const pairs = corpus.match(/ඒ ගෙ/g)
  if (pairs) fail.push(`gate5_filler_regression: ${pairs.length} 'ඒ ගෙ' pairs voiced`)
  const mamaa = corpus.match(/මමා/g)
  if (mamaa) fail.push(`gate5b_mamaa_regression: ${mamaa.length} මමා voiced`)
  for (const bad of ['මමතා', 'ෙවෙනස', 'ඥග', 'දිහා', 'නනිකු']) {
    if (corpus.includes(bad)) fail.push(`gate5c_known_corruption_voiced: ${bad}`)
  }
  // Gate 5d — THE NEW ONE: no standalone ගෙ token may be voiced
  const ge = bareGeTokens(wordBoundaries)
  if (ge.length) fail.push(`gate5d_bare_ge_voiced: ${ge.length} standalone ගෙ token(s)`)

  // Gate 6 — no end click
  let tailDb = null
  try {
    tailDb = tailFloorDb(file)
    if (tailDb > -40) fail.push(`gate6_end_click: tail at ${tailDb.toFixed(1)}dB rel. peak`)
  } catch (e) { fail.push(`gate6_tail_measure_error: ${e.message}`) }

  return {
    fail, z: +z.toFixed(2), tail: tailDb, tokens: (wordBoundaries || []).length,
    chars, expected_ms: Math.round(expected), ffprobe_ms: ffprobeMs,
    gate3_fully_voiced: spoken.ok, gate3_missing: spoken.missing,
    gate5d_no_bare_ge: ge.length === 0,
  }
}
module.exports = { ...base, runGates, RATE, bareGeTokens }
