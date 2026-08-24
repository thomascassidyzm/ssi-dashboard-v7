// A-134 මමා — the seven gates, as applied by this worker.
//
// Built on job #874's gates.cjs (which is itself the plate's precedent) with
// three changes I made after re-measuring rather than inheriting constants:
//
//  1. DURATION MODELS REFIT from scratch on this course+voice, and fitted
//     SEPARATELY per clip kind. Measured 2026-08-17:
//       presentation  ms = 3061.1 + 46.38*chars  sd=164  n=2060
//       known         ms = 1392.5 + 45.53*chars  sd=130  n=11943
//     The two slopes agreeing to within 2% (46.38 vs 45.53 ms/char) is
//     corroboration that the model is real; the 1669ms intercept gap is the
//     presentation template frame. #874 used a single presentation model
//     (3136.4 + 45.50, sd 223) — same structure, looser sd because it had not
//     excluded the ellipsis population from the fit.
//
//  2. ELLIPSIS-CORRECTED gate 2, per the plate's existing finding, but with my
//     own numbers. A literal '...' is an authoring convention marking a gap the
//     learner fills; Azure voices it as a real pause the char-count model omits.
//     Measured against my base models:
//       presentation with '...'  n=72  mean z=+5.17  sd 1.51  |z|>3 in 95.8%
//       known        with '...'  n=71  mean z=+7.09  sd 1.39  |z|>3 in 98.6%
//     So on ellipsis text the BASE gate fires on ~96-99% of GOOD clips. Such
//     text is judged against the ellipsis population instead. This is a
//     corrected model, NOT a widened tolerance.
//
//  3. The template artefact 'ඉංග්‍රීසිෙන්' is reported as INFO, never a failure.
//     It comes from the course-wide presentation TEMPLATE
//     ("{target_lang_name}ෙන්. '{known}'. '{seed}' ඉතින්. :") and is therefore
//     present in all 1300 presentation texts, healthy ones included. It is a
//     separate, out-of-scope defect class. Failing on it would block every
//     legitimate recomposition.
const cp = require('child_process')

const MODELS = {
  presentation: { intercept: 3061.1, slope: 46.38, sd: 164, n: 2060,
                  ell: { mean: 5.17, sd: 1.51, n: 72 } },
  known:        { intercept: 1392.5, slope: 45.53, sd: 130, n: 11943,
                  ell: { mean: 7.09, sd: 1.39, n: 71 } },
}

// The doubled-ma corruption family, all attested variants, plus the strays.
const DOUBLED_MA = /මමා|මමට|මමම|මMA|මමතා|[ऀ-ॿ]/
const STRAY_CONJUNCT = /ඥ/
const OTHER_CORRUPTION = ['ෙවෙනස', 'දිහා', 'නනිකු']
const TEMPLATE_ARTEFACT = 'ඉංග්‍රීසිෙන්'

function normalizeSin(s) {
  return String(s || '').replace(/['".,:!?]/g, '').replace(/\s+/g, ' ').trim()
}
function tokenList(wb) { return (wb || []).map(t => normalizeSin(t.text)).filter(Boolean) }
function tokenCorpus(wb) { return tokenList(wb).join(' ') }
function wordsPresent(text, corpus) {
  // '...' is a pause cue, never a word — it must not be demanded of the corpus.
  const words = normalizeSin(String(text).replace(/\.\.\./g, ' ')).split(' ').filter(Boolean)
  return { ok: words.every(w => corpus.includes(w)), missing: words.filter(w => !corpus.includes(w)) }
}

// Tail floor: median of 2ms window peaks over [-400ms,-150ms], dB rel. clip peak.
// Same measurement the A-131 diagnosis used.
function tailFloorDb(file) {
  const pcm = cp.execSync(`ffmpeg -v quiet -i "${file}" -ac 1 -ar 44100 -f s16le -`,
    { maxBuffer: 1 << 28, shell: '/bin/bash' })
  const n = pcm.length >> 1
  const s = new Int16Array(n)
  for (let i = 0; i < n; i++) s[i] = pcm.readInt16LE(i * 2)
  let peak = 1
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(s[i]))
  const sr = 44100, win = Math.round(sr * 0.002)
  const from = Math.max(0, n - Math.round(sr * 0.400)), to = Math.max(0, n - Math.round(sr * 0.150))
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

/** row: { kind:'presentation'|'known', headword, contextText, fullText } */
function runGates(row, ttsText, wb, ms, file) {
  const fail = [], info = []
  const corpus = tokenCorpus(wb), toks = tokenList(wb)

  // GATE 1 — the file decodes, and its real duration matches what we recorded.
  let ffprobeMs = null
  try {
    ffprobeMs = ffprobeDurationMs(file)
    if (Math.abs(ffprobeMs - ms) > 60)
      fail.push(`gate1_duration_mismatch: recorded ${ms}ms vs ffprobe ${ffprobeMs}ms`)
  } catch (e) { fail.push(`gate1_decode_error: ${e.message}`) }

  // GATE 2 — duration within 3sd of the fitted rate model, ellipsis-corrected.
  const model = MODELS[row.kind]
  let z = null, zEll = null
  if (model) {
    const expected = model.intercept + model.slope * ttsText.length
    z = (ms - expected) / model.sd
    if (ttsText.includes('...')) {
      zEll = (z - model.ell.mean) / model.ell.sd
      if (Math.abs(zEll) > 3)
        fail.push(`gate2_duration_z_out_of_range_ellipsis: z_ell=${zEll.toFixed(2)} (base z=${z.toFixed(2)})`)
    } else if (Math.abs(z) > 3) {
      fail.push(`gate2_duration_z_out_of_range: z=${z.toFixed(2)}`)
    }
  }

  // GATE 3 — HEADWORD VOICED PER TOKEN ARRAY. Non-negotiable, and duration
  // cannot do this job: for a 4-char headword the duration test is blind at z=0.
  const hw = wordsPresent(row.headword, corpus)
  if (!hw.ok) fail.push(`gate3_headword_not_voiced: missing ${JSON.stringify(hw.missing)}`)

  // GATE 4 — not truncated.
  if (row.kind === 'presentation') {
    const last = toks.slice(-3).join(' ')
    if (!last.includes('ඉතින්')) fail.push(`gate4_truncated: last tokens were "${last}"`)
  } else {
    const want = normalizeSin(String(row.fullText).replace(/\.\.\./g, ' ')).split(' ').filter(Boolean).pop()
    const last = toks.slice(-2).join(' ')
    if (want && !last.includes(want))
      fail.push(`gate4_truncated: last tokens "${last}" do not carry final word "${want}"`)
  }

  // GATE 5 — NO-FILLER-REGRESSION, extended to the මමා class.
  // (a) 'ඒ ගෙ' matched as ADJACENT WHOLE TOKENS, not as a substring. #874 found
  //     that the substring form also fires on the legitimate word ගෙදර/ගෙදරදී
  //     ("home"), which 2 of this set's texts contain.
  let filler = 0
  for (let i = 0; i + 1 < toks.length; i++) if (toks[i] === 'ඒ' && toks[i + 1] === 'ගෙ') filler++
  if (filler) fail.push(`gate5a_filler_regression: ${filler} standalone 'ඒ ගෙ' pairs voiced`)
  // (b) the doubled-ma family — the class this job exists to remove.
  const dm = toks.filter(t => DOUBLED_MA.test(t))
  if (dm.length) fail.push(`gate5b_doubled_ma_regression: ${JSON.stringify(dm)} voiced`)
  // (c) stray conjuncts and the other corruptions attested on this plate.
  const st = toks.filter(t => STRAY_CONJUNCT.test(t))
  if (st.length) fail.push(`gate5c_stray_conjunct: ${JSON.stringify(st)} voiced`)
  for (const bad of OTHER_CORRUPTION)
    if (corpus.includes(bad)) fail.push(`gate5c_known_corruption_voiced: ${bad}`)
  // (d) also assert against the TTS TEXT, not only the token array — a corruption
  //     the voice silently swallowed is still wrong text to have shipped.
  if (DOUBLED_MA.test(ttsText)) fail.push(`gate5d_doubled_ma_in_text: text still carries the corruption`)

  // GATE 6 — no end click. Tail must sit below -40dB rel. peak.
  let tailDb = null
  try {
    tailDb = tailFloorDb(file)
    if (tailDb > -40) fail.push(`gate6_end_click: tail at ${tailDb.toFixed(1)}dB rel. peak`)
  } catch (e) { fail.push(`gate6_tail_measure_error: ${e.message}`) }

  // GATE 7 — every word of the example sentence actually voiced.
  let ex = { ok: true, missing: [] }
  if (row.contextText) {
    ex = wordsPresent(row.contextText, corpus)
    if (!ex.ok) fail.push(`gate7_example_not_voiced: missing ${JSON.stringify(ex.missing)}`)
  }

  // INFO — course-wide template artefact, out of scope, never a blocker.
  if (ttsText.includes(TEMPLATE_ARTEFACT)) info.push('template_artefact_ඉංග්‍රීසිෙන්')

  return { fail, info, z: z === null ? null : +z.toFixed(2), z_ellipsis: zEll === null ? null : +zEll.toFixed(2),
           tail: tailDb, tokens: toks.length, chars: ttsText.length, ffprobe_ms: ffprobeMs,
           gate3_headword_voiced: hw.ok, gate5_filler: filler, gate5_doubled_ma: dm,
           gate7_example_voiced: ex.ok }
}
module.exports = { runGates, normalizeSin, tokenCorpus, tokenList, wordsPresent,
                   tailFloorDb, ffprobeDurationMs, DOUBLED_MA, MODELS }
