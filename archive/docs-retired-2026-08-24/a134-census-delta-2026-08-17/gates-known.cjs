// A-134 census delta — gates for KNOWN/prompt clips (eng_for_sin, Sinhala side).
//
// WHY A NEW MODULE. docs/a134-nullsweep-2026-08-17/gates.cjs is shaped for PRESENTATION
// clips: its gate 4 demands the narration terminator 'ඉතින්', its gate 3 wants a
// card headword, and its rate model (3143 + 45.4x chars) was fitted on presentation
// clips. None of that transfers to a bare prompt clip. Gates 1/5/6 DO transfer and are
// reused; 2/3/4 are replaced; the corruption gate is EXTENDED for this job's classes.
//
// RATE MODEL — refitted here, not inherited. Fitted 2026-08-17 on this course's own
// known/sin clips, excluding the 74 that carry the '...' authoring convention:
//     n = 13,341   ms = 1387.6 + 45.78 x chars   residual sd = 133.3
// This independently reproduces the prior worker's known/sin fit (1398.0 + 45.58x,
// sd 149.6, n=13,301) to within 1% on both coefficients, so that model is confirmed.
// None of this job's texts contain '...', so no ellipsis correction is applied.
const base = require('../a134-sin27-2026-08-17/gates-12.cjs')
const { normalizeSin, tokenCorpus, wordsPresent, tailFloorDb, ffprobeDurationMs } = base

const RATE_INTERCEPT = 1387.6, RATE_SLOPE = 45.78, RATE_SD = 133.3, RATE_N = 13341

// Sinhala dependent vowel signs + virama. A token may never OPEN with one of these —
// a vowel sign is bound to a preceding consonant, so a leading one is always wreckage
// (this job repairs four such tokens: ිකියලා, ෙමෙක, a bare ෙ, and දිකිනකොට's cousin).
const DEP_VOWEL = /[්-ෟෲෳ]/
const DEVANAGARI = /[ऀ-ॿ]/
const TELUGU = /[ఀ-౿]/
const LATIN = /[A-Za-z]/
// Every corruption this plate has shipped once. A defect that reached a learner gets a
// permanent gate, so it can never regress silently.
const KNOWN_CORRUPTIONS = ['මමා', 'මමතා', 'ෙවෙනස', 'ඥග', 'දිහා', 'නනිකු', 'අපිේ', 'ළමාවිල', 'දිකින']
// 'ඒ ගෙ' (the placeholder filler #887 owns) must be matched as a BARE TOKEN PAIR, never
// as a substring: 'ඒ ගෙදරදී' ("at home") is real taught vocabulary and contains it. The
// nullsweep gate used a substring match, which is safe on presentation clips but
// false-positives on two of this job's repaired prompts.
function hasBareGeFiller(corpus) {
  const t = corpus.split(' ')
  return t.some((w, i) => w === 'ඒ' && t[i + 1] === 'ගෙ')
}

function runGates(row, ttsText, wordBoundaries, ms, file) {
  const fail = []
  const corpus = tokenCorpus(wordBoundaries)

  // Gate 1 — decodes, and the decoded duration matches what the provider recorded.
  let ffprobeMs = null
  try {
    ffprobeMs = ffprobeDurationMs(file)
    if (Math.abs(ffprobeMs - ms) > 60) fail.push(`gate1_duration_mismatch: recorded ${ms}ms vs ffprobe ${ffprobeMs}ms`)
  } catch (e) { fail.push(`gate1_decode_error: ${e.message}`) }

  // Gate 2 — duration within 3 sd of the refitted known/sin model.
  const chars = ttsText.length
  const expected = RATE_INTERCEPT + RATE_SLOPE * chars
  const z = (ms - expected) / RATE_SD
  if (Math.abs(z) > 3) fail.push(`gate2_duration_z_out_of_range: z=${z.toFixed(2)}`)

  // Gate 3 — EVERY word of the prompt is voiced. For a prompt clip the whole text is
  // the payload, so this subsumes the presentation gates' headword and example checks.
  const all = wordsPresent(ttsText, corpus)
  if (!all.ok) fail.push(`gate3_text_not_fully_voiced: missing ${JSON.stringify(all.missing)}`)

  // Gate 4 — not truncated: the last word of the text is among the last spoken tokens.
  const textWords = normalizeSin(ttsText).split(' ').filter(Boolean)
  const lastWord = textWords[textWords.length - 1]
  const lastSpoken = normalizeSin((wordBoundaries || []).slice(-3).map(t => t.text).join(' '))
  if (lastWord && !lastSpoken.includes(lastWord)) fail.push(`gate4_truncated: last word "${lastWord}" not in tail "${lastSpoken}"`)

  // Gate 5 — SCRIPT PURITY. The whole point of this job: the prompt side is Sinhala and
  // nothing else. Asserted on what was SPOKEN (word_boundaries), not on the stored text.
  if (DEVANAGARI.test(corpus)) fail.push(`gate5a_devanagari_voiced`)
  if (TELUGU.test(corpus)) fail.push(`gate5b_telugu_voiced`)
  if (LATIN.test(corpus)) fail.push(`gate5c_latin_voiced: ${JSON.stringify(corpus.match(/[A-Za-z]+/g))}`)
  const opens = corpus.split(' ').filter(t => t && DEP_VOWEL.test(t[0]))
  if (opens.length) fail.push(`gate5d_token_opens_with_dependent_vowel_sign: ${JSON.stringify(opens)}`)
  for (const bad of KNOWN_CORRUPTIONS) {
    if (corpus.includes(bad)) fail.push(`gate5e_known_corruption_voiced: ${bad}`)
  }
  if (hasBareGeFiller(corpus)) fail.push(`gate5f_bare_ge_filler_voiced`)

  // Gate 6 — no end click; tail floor well under -40dB rel. peak (compressor-free chain).
  let tailDb = null
  try {
    tailDb = tailFloorDb(file)
    if (tailDb > -40) fail.push(`gate6_end_click: tail at ${tailDb.toFixed(1)}dB rel. peak`)
  } catch (e) { fail.push(`gate6_tail_measure_error: ${e.message}`) }

  return { fail, z, tail: tailDb, tokens: (wordBoundaries || []).length, chars,
    expected_ms: Math.round(expected), ffprobe_ms: ffprobeMs,
    gate3_fully_voiced: all.ok, rate_model: { RATE_INTERCEPT, RATE_SLOPE, RATE_SD, RATE_N } }
}

module.exports = { runGates, hasBareGeFiller, normalizeSin, tokenCorpus, wordsPresent, tailFloorDb, ffprobeDurationMs,
  DEP_VOWEL, DEVANAGARI, TELUGU, LATIN, KNOWN_CORRUPTIONS }
