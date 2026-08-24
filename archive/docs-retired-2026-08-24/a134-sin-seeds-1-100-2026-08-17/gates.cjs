// A-134 seeds 1-100 — the seven gates, adapted from docs/a134-sin27-2026-08-17/gates-12.cjs.
//
// TWO DELIBERATE DIVERGENCES from the A-134 presentation-clip gates, both required:
//
// 1. RATE MODEL REFITTED. The A-134 model (ms ≈ 3143 + 45.4×chars, sd 221) was fitted on
//    PRESENTATION clips, which carry a fixed all-Sinhala template ("ඉංග්‍රීසිෙන්. '…'. '…' ඉතින්. :").
//    16 of the 19 clips here are plain SEED known-side sentences with no template, so that
//    intercept over-predicts every one of them by ~1.75s and gate 2 would be meaningless.
//    Refitted on 652 clean seed known clips of this same course and voice, excluding the 16
//    being repaired: ms ≈ 1388.3 + 44.21×chars, residual sd 119.4ms. The slope agrees with
//    A-134's to within 3% (44.21 vs 45.4); it is the intercept that is clip-type specific.
//
// 2. GATE 4 IS CLIP-TYPE AWARE. 'ඉතින්' is the presentation template's final word and does
//    not appear in a seed sentence at all, so the A-134 truncation test cannot be reused for
//    seed clips. For a seed clip the gate asserts the seed's OWN final word was voiced.
const cp = require('child_process')

const MODELS = {
  seed:         { intercept: 1388.3, slope: 44.21, sd: 119.4, n: 652 },
  presentation: { intercept: 3143,   slope: 45.4,  sd: 221,   n: 2199 },
}

// INTER-SENTENCE PAUSE TERM. The seed model above is fitted on single-sentence seeds and has
// no term for the silence the voice inserts at an internal full stop. Measured on the live
// course: of 668 seed known clips exactly TWO contain an internal sentence break (seeds 82 and
// 141), and BOTH sit at z ≈ +9 under the single-sentence model — including seed 141, a healthy
// clip that has never been flagged by anything. The single-sentence cohort (666 clips) has
// mean z = -0.02 and one member beyond 3 sd. So a +9 z on a two-sentence clip is the model
// failing, not the clip.
//
// DISCLOSED WEAKNESS: n = 2. This is not a fitted parameter, it is the mean residual of the
// only two exemplars that exist (9.13 sd x 119.4 ms). It is applied ONLY to gate 2 and ONLY to
// clips with an internal sentence break, and every other gate is untouched. Stated rather than
// silently widening gate 2's tolerance, which would have blinded it for all 19 clips.
const PAUSE_MS = 1090
const hasInternalBreak = t => /[.?!]\s+\S/.test(String(t || ''))

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
function tailFloorDb(file) {
  const pcm = cp.execSync(`ffmpeg -v quiet -i "${file}" -ac 1 -ar 44100 -f s16le -`,
    { maxBuffer: 1 << 28, shell: '/bin/bash' })
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
  return Math.round(parseFloat(cp.execSync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${file}"`,
    { shell: '/bin/bash' }).toString().trim()) * 1000)
}

// row: { id, kind: 'seed'|'presentation', fullText, headword?, mustVoice }
function runGates(row, ttsText, wordBoundaries, ms, file) {
  const fail = []
  const corpus = tokenCorpus(wordBoundaries)
  const model = MODELS[row.kind]

  // Gate 1: decodes, and file duration matches what was recorded
  let ffprobeMs = null
  try {
    ffprobeMs = ffprobeDurationMs(file)
    if (Math.abs(ffprobeMs - ms) > 60) fail.push(`gate1_duration_mismatch: recorded ${ms}ms vs ffprobe ${ffprobeMs}ms`)
  } catch (e) { fail.push(`gate1_decode_error: ${e.message}`) }

  // Gate 2: duration within 3 sd of the model fitted for THIS clip type
  const pause = (row.kind === 'seed' && hasInternalBreak(ttsText)) ? PAUSE_MS : 0
  const expected = model.intercept + model.slope * ttsText.length + pause
  const z = (ms - expected) / model.sd
  if (Math.abs(z) > 3) fail.push(`gate2_duration_z_out_of_range: z=${z.toFixed(2)} (${row.kind} model${pause ? ', +pause' : ''})`)

  // Gate 3: headword voiced (presentation only — a seed clip has no headword slot)
  let headwordOk = true
  if (row.headword) {
    const c = wordsPresent(row.headword, corpus)
    headwordOk = c.ok
    if (!c.ok) fail.push(`gate3_headword_not_voiced: missing ${JSON.stringify(c.missing)}`)
  }

  // Gate 4: not truncated. Presentation -> template tail 'ඉතින්'. Seed -> the seed's own last word.
  const lastTokens = normalizeSin((wordBoundaries || []).slice(-3).map(t => t.text).join(' '))
  const expectTail = row.kind === 'presentation'
    ? 'ඉතින්'
    : normalizeSin(row.fullText).split(' ').filter(Boolean).pop()
  if (!lastTokens.includes(expectTail)) fail.push(`gate4_truncated: expected tail "${expectTail}", last tokens were "${lastTokens}"`)

  // Gate 5: no filler regression — zero 'ඒ ගෙ' pairs voiced. Permanent gate on the A-134 defect.
  const filler = corpus.match(/ඒ ගෙ/g)
  if (filler) fail.push(`gate5_filler_regression: ${filler.length} 'ඒ ගෙ' pairs voiced`)

  // Gate 5b: none of the corruptions this pass exists to remove may reappear
  const relapse = ['මමා', 'ලිහිල්ල', 'නාගෙ', 'මත් එක්ක', 'ඕනෑකමට', 'පූර්ණය', 'කඩා කනවා', 'ආසන්නෙන්', 'බලාගන්නේ', 'බසියෙ']
    .filter(w => corpus.includes(w))
  if (relapse.length) fail.push(`gate5b_corruption_relapse: voiced ${JSON.stringify(relapse)}`)

  // Gate 6: no end click — tail floor well under -40dB rel. peak
  let tailDb = null
  try {
    tailDb = tailFloorDb(file)
    if (tailDb > -40) fail.push(`gate6_end_click: tail at ${tailDb.toFixed(1)}dB rel. peak`)
  } catch (e) { fail.push(`gate6_tail_measure_error: ${e.message}`) }

  // Gate 7: EVERY word of the repaired text voiced — the whole point of the repair is the words
  const voiced = wordsPresent(row.mustVoice, corpus)
  if (!voiced.ok) fail.push(`gate7_text_not_fully_voiced: missing ${JSON.stringify(voiced.missing)}`)

  return {
    fail, z, tail: tailDb, tokens: (wordBoundaries || []).length,
    chars: ttsText.length, expected_ms: Math.round(expected), ffprobe_ms: ffprobeMs, pause_term_ms: pause,
    model: row.kind, gate3_headword_voiced: headwordOk, gate7_all_words_voiced: voiced.ok,
  }
}

module.exports = { runGates, normalizeSin, tokenCorpus, wordsPresent, tailFloorDb, ffprobeDurationMs, MODELS }
