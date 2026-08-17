// A-135 — the seven gates, adapted from docs/a134-sin-seeds-1-100-2026-08-17/gates.cjs.
//
// THREE DELIBERATE DIVERGENCES from the A-134 Sinhala gates, all forced by the language:
//
// 1. RATE MODELS REFITTED PER COURSE+VOICE, on live clips of the same role. A-134's model was
//    Sinhala on Sameera; nothing about it transfers. Fitted here on every live `known` clip of
//    the course carrying script in the known language, excluding nothing (the rows being
//    repaired carry ENGLISH text, so they are not in the Korean/Japanese cohort at all and
//    cannot contaminate their own model):
//
//      eng_for_kor / azure_ko-KR-SunHiNeural   n=6944   ms ≈ 1203.1 + 186.594·chars   r²=0.897  sd=270.4
//      eng_for_jpn / azure_ja-JP-MayuNeural    n=11246  ms ≈ 1088.8 + 162.215·chars   r²=0.896  sd=318.6
//
//    REFITTED ONCE, after the first render run, and the reason is worth recording. The first
//    fit used raw length(text) over the WHOLE cohort and gave Korean a slope of 129.4 at
//    r²=0.956 — a high r² that was hiding systematic curvature. 5,611 of the 9,153 Korean clips
//    are under 15 characters (single words and short LEGO glosses), so the line was fitted
//    almost entirely on short clips and under-predicted every sentence. It showed up
//    immediately: all 28 fresh Korean renders landed at z between +1.5 and +7.3, mean +2.43,
//    while the 2 Japanese ones landed at −0.15. Twenty-eight clips do not go wrong together —
//    the model was wrong. Checked against the live data directly: live clips of 15–19 chars
//    average 4,347 ms where the old model predicted ~3,625.
//    So the fit is now (a) on PUNCTUATION-NORMALIZED character count, matching what the gate
//    actually measures, and (b) restricted to 8–32 characters, the band the repaired sentences
//    occupy. r² drops to ~0.90 because the easy short-clip mass is gone; that is the honest
//    number for this band, and the gate is calibrated rather than widened. Widening the
//    tolerance to make 28 clips pass would have blinded gate 2 for every future clip.
//
//    Both cohorts are the `azure_`-prefixed voice id. The BARE id (`ko-KR-SunHiNeural`,
//    `ja-JP-MayuNeural`) is the SAME voice under the estate's known id duality, but its clips
//    fit far worse (r²=0.913/0.896, sd 804/1050ms) — an older or differently-rendered cohort.
//    Modelling the two together would inflate sd by ~3x and blind gate 2, so the prefixed
//    cohort is the model and this is said out loud rather than silently chosen.
//
// 2. GATE 4 (truncation) CANNOT USE A WORD TAIL. Korean and Japanese are written without spaces,
//    so "the last word" is not recoverable by splitting. Azure's word_boundaries DO segment
//    them, so the gate asserts the final BOUNDARY TOKEN is a suffix of the normalized text —
//    i.e. the voice reached the end of the string — rather than matching a pre-computed word.
//
// 3. GATE 7 (all words voiced) IS CHARACTER-COVERAGE, not word containment. Same reason: with no
//    spaces there is no word list to check off. It asserts that concatenating the boundary
//    tokens reproduces the whole normalized text, which is strictly stronger than the Sinhala
//    word check and is what actually catches a dropped syllable.
//
// Gate 5 (Sinhala filler/corruption relapse) has no analogue here and is replaced by 5a/5b: the
// defect THIS pass exists to remove must not reappear in the bytes — no Latin letters may be
// voiced on a Korean/Japanese known clip (defect 2), and no bracket-annotation content may be
// voiced (defect 1).
const cp = require('child_process')

const MODELS = {
  'eng_for_kor|azure_ko-KR-SunHiNeural': { intercept: 1203.1, slope: 186.594, sd: 270.4, n: 6944 },
  'eng_for_jpn|azure_ja-JP-MayuNeural':  { intercept: 1088.8, slope: 162.215, sd: 318.6, n: 11246 },
}

// Punctuation the voice does not utter, stripped before any comparison of text to bytes.
// Both the ASCII and the CJK full-width forms, because the content carries both.
const PUNCT = /[\s'"“”‘’.,:;!?~・…（）()「」『』【】《》、。！？，：；]/g
const norm = s => String(s || '').replace(PUNCT, '')

function tokenCorpus(wordBoundaries) {
  return norm((wordBoundaries || []).map(t => t.text).join(''))
}

// Tail floor: median of 2ms window peaks over [-400ms, -150ms], dB rel. clip peak.
// This is the A-131 measurement — the end click Tom heard — kept identical so the numbers
// are comparable across plates.
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

// row: { id, course, voice_id, ttsText }
function runGates(row, ttsText, wordBoundaries, ms, file) {
  const fail = []
  const corpus = tokenCorpus(wordBoundaries)
  const want = norm(ttsText)
  const key = `${row.course}|${row.voice_id}`
  const model = MODELS[key]
  if (!model) fail.push(`gate0_no_model_for: ${key}`)

  // Gate 1: decodes, and the file's real duration matches what the renderer recorded.
  let ffprobeMs = null
  try {
    ffprobeMs = ffprobeDurationMs(file)
    if (Math.abs(ffprobeMs - ms) > 60) fail.push(`gate1_duration_mismatch: recorded ${ms}ms vs ffprobe ${ffprobeMs}ms`)
  } catch (e) { fail.push(`gate1_decode_error: ${e.message}`) }

  // Gate 2: duration within 3 sd of the model fitted for THIS course and voice.
  let z = null, expected = null
  if (model) {
    expected = model.intercept + model.slope * want.length
    z = (ms - expected) / model.sd
    if (Math.abs(z) > 3) fail.push(`gate2_duration_z_out_of_range: z=${z.toFixed(2)} (${key})`)
  }

  // Gate 3: the voice produced boundaries at all. No boundaries means we cannot see inside the
  // clip, and a gate that cannot see must fail rather than pass.
  if (!wordBoundaries || !wordBoundaries.length) fail.push('gate3_no_word_boundaries')

  // Gate 4: not truncated. No word tail exists in a space-less script, so assert the voice
  // reached the END of the string: the final boundary token must close the normalized text.
  if (corpus && want && !want.endsWith(corpus.slice(-Math.min(corpus.length, 4)))) {
    fail.push(`gate4_truncated: text ends "${want.slice(-8)}" but the last voiced tokens were "${corpus.slice(-8)}"`)
  }

  // Gate 5a: the defect-2 relapse guard. A Korean or Japanese known clip must not voice Latin
  // letters — that IS the defect (a Korean voice reading an English sentence).
  const latin = corpus.match(/[A-Za-z]{2,}/g)
  if (latin) fail.push(`gate5a_latin_voiced: ${JSON.stringify([...new Set(latin)].slice(0, 6))}`)

  // Gate 5b: the defect-1 relapse guard. No bracket-annotation content may be voiced, in either
  // bracket spelling. Checked on the TEXT sent to TTS, because the brackets themselves are
  // stripped from the corpus by norm().
  if (/[（(][^）)]*[）)]/.test(String(ttsText))) fail.push('gate5b_annotation_in_tts_text')

  // Gate 6: no end click — tail floor well under -40dB rel. peak (the A-131 threshold).
  let tailDb = null
  try {
    tailDb = tailFloorDb(file)
    if (tailDb > -40) fail.push(`gate6_end_click: tail at ${tailDb.toFixed(1)}dB rel. peak`)
  } catch (e) { fail.push(`gate6_tail_measure_error: ${e.message}`) }

  // Gate 7: EVERY character of the text voiced. Character coverage, not word containment —
  // with no spaces there is no word list, and this is the stronger check anyway.
  const covered = corpus === want
  if (!covered) {
    const missing = [...want].filter(ch => !corpus.includes(ch))
    fail.push(`gate7_text_not_fully_voiced: corpus "${corpus}" != text "${want}"${missing.length ? `, chars absent: ${JSON.stringify([...new Set(missing)])}` : ''}`)
  }

  return {
    fail, z, tail: tailDb, tokens: (wordBoundaries || []).length,
    chars: want.length, expected_ms: expected == null ? null : Math.round(expected),
    ffprobe_ms: ffprobeMs, model: key, gate7_all_chars_voiced: covered,
  }
}

module.exports = { runGates, norm, tokenCorpus, tailFloorDb, ffprobeDurationMs, MODELS }
