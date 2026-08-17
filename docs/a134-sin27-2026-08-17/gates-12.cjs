// A-134 RENDER worker — the seven gates, shared between render.cjs (shipping takes)
// and spares.cjs (insurance takes), so a spare is judged identically to a shipped clip.
const cp = require('child_process')

// Rate model reused verbatim from #823 (ms ≈ 3143 + 45.4 × chars, residual sd 221ms,
// fitted on 2,199 clean clips of this course and voice) — same course, same voice,
// no reason to refit for these 12.
const RATE_INTERCEPT = 3143, RATE_SLOPE = 45.4, RATE_SD = 221

function normalizeSin(s) {
  return String(s || '').replace(/['".,:!?]/g, '').replace(/\s+/g, ' ').trim()
}
function tokenCorpus(wordBoundaries) {
  return normalizeSin((wordBoundaries || []).map(t => t.text).join(' '))
}
function wordsPresent(text, corpus) {
  const words = normalizeSin(text).split(' ').filter(Boolean)
  const missing = words.filter(w => !corpus.includes(w))
  return { ok: missing.length === 0, missing }
}

// Tail floor: median of 2ms window peaks over [-400ms, -150ms], dB rel. clip peak.
// Same measurement as tools/a108/a131-clean-chain-sample.cjs and #823's gate 6.
function tailFloorDb(file) {
  const pcm = cp.execSync(
    `ffmpeg -v quiet -i "${file}" -ac 1 -ar 44100 -f s16le -`,
    { maxBuffer: 1 << 28, shell: '/bin/bash' }
  )
  const n = pcm.length >> 1
  const s = new Int16Array(n)
  for (let i = 0; i < n; i++) s[i] = pcm.readInt16LE(i * 2)
  let peak = 1
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(s[i]))
  const sr = 44100, win = Math.round(sr * 0.002)
  const from = Math.max(0, n - Math.round(sr * 0.400))
  const to = Math.max(0, n - Math.round(sr * 0.150))
  const vals = []
  for (let i = from; i + win <= to; i += win) {
    let p = 1
    for (let k = i; k < i + win; k++) p = Math.max(p, Math.abs(s[k]))
    vals.push(20 * Math.log10(p / peak))
  }
  vals.sort((a, b) => a - b)
  return vals.length ? vals[vals.length >> 1] : NaN
}

function ffprobeDurationMs(file) {
  const out = cp.execSync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${file}"`,
    { shell: '/bin/bash' }
  ).toString().trim()
  return Math.round(parseFloat(out) * 1000)
}

// row needs { card_known, contextText }
function runGates(row, ttsText, wordBoundaries, ms, file) {
  const fail = []
  const corpus = tokenCorpus(wordBoundaries)

  // Gate 1: decode + duration matches what was recorded
  let ffprobeMs = null
  try {
    ffprobeMs = ffprobeDurationMs(file)
    if (Math.abs(ffprobeMs - ms) > 60) fail.push(`gate1_duration_mismatch: recorded ${ms}ms vs ffprobe ${ffprobeMs}ms`)
  } catch (e) {
    fail.push(`gate1_decode_error: ${e.message}`)
  }

  // Gate 2: duration within 3 sd of the fitted model
  const chars = ttsText.length
  const expected = RATE_INTERCEPT + RATE_SLOPE * chars
  const z = (ms - expected) / RATE_SD
  if (Math.abs(z) > 3) fail.push(`gate2_duration_z_out_of_range: z=${z.toFixed(2)}`)

  // Gate 3: headword voiced
  const headwordCheck = wordsPresent(row.card_known, corpus)
  if (!headwordCheck.ok) fail.push(`gate3_headword_not_voiced: missing ${JSON.stringify(headwordCheck.missing)}`)

  // Gate 4: not truncated — final token 'ඉතින්' present
  const lastTokens = (wordBoundaries || []).slice(-3).map(t => t.text).join(' ')
  if (!normalizeSin(lastTokens).includes('ඉතින්')) fail.push(`gate4_truncated: last tokens were "${lastTokens}"`)

  // Gate 5: no filler regression — zero 'ඒ ගෙ' pairs voiced
  const fillerMatches = corpus.match(/ඒ ගෙ/g)
  if (fillerMatches) fail.push(`gate5_filler_regression: ${fillerMatches.length} 'ඒ ගෙ' pairs voiced`)

  // Gate 6: no end click — tail floor well under -40dB rel. peak
  let tailDb = null
  try {
    tailDb = tailFloorDb(file)
    if (tailDb > -40) fail.push(`gate6_end_click: tail at ${tailDb.toFixed(1)}dB rel. peak`)
  } catch (e) {
    fail.push(`gate6_tail_measure_error: ${e.message}`)
  }

  // Gate 7 (new, examples-only): every word of the example sentence voiced
  let exampleCheck = { ok: true, missing: [] }
  if (row.contextText) {
    exampleCheck = wordsPresent(row.contextText, corpus)
    if (!exampleCheck.ok) fail.push(`gate7_example_not_voiced: missing ${JSON.stringify(exampleCheck.missing)}`)
  }

  return {
    fail, z, tail: tailDb, tokens: (wordBoundaries || []).length,
    chars, expected_ms: Math.round(expected), ffprobe_ms: ffprobeMs,
    gate3_headword_voiced: headwordCheck.ok,
    gate7_example_voiced: exampleCheck.ok,
  }
}

module.exports = { runGates, normalizeSin, tokenCorpus, wordsPresent, tailFloorDb, ffprobeDurationMs }
