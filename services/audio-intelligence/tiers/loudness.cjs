/**
 * LOUDNESS — the cheapest gate in the estate, because the number is already computed.
 *
 * `services/audio-processor.cjs` normalises every clip towards a target
 * (`normalizeAudio`, :552) and it MEASURES the result on the way through
 * (`measureIntegratedLoudness`, :317, :575) — and then throws the measurement away.
 * Nothing compares the output against a band and nothing has ever failed a clip for
 * missing it. So the estate applies a loudness target blind and finds out by ear.
 * This module turns that existing measurement into a verdict. That is the whole file.
 *
 * WHY IT MATTERS BEYOND TIDINESS. The module's own comments record that a single
 * `loudnorm` pass can stall 4-6 LUFS short of target on a peaky voice
 * (`audio-processor.cjs:301` — Azure Sonia lands at -16, the xAI clone at -20 to -22).
 * A clip 5 dB quiet is not broken audio; it is a clip the learner turns the volume up
 * for, and then the next clip is 5 dB louder. Consistency is the product.
 *
 * ── THE BAND, AND HOW MUCH IT RESTS ON ──────────────────────────────────────────────
 * Default target -15.5 LUFS integrated, +/-1.5 dB, true peak below -1.0 dBTP.
 *
 * ⚠️ THE EVIDENCE IS ONE 25-CLIP TEST — `docs/audio/deu-loudness-cluster-test-2026-08-06.md`,
 * whose clips sit between -15.0 and -16.3 dB. That is enough to say where the estate
 * currently lives; it is NOT enough to say where it should live. The band is therefore
 * a DECLARED PER-COURSE CONFIG VALUE (VOICELAB writes it as a versioned config), not a
 * constant in this file, and these numbers are only the default a course inherits until
 * someone measures its own side. Read the target off the config; never off this header.
 *
 * MEASUREMENT IS ON THE MASTERED BYTES, always — what is judged is what the learner hears.
 */

const { spawn } = require('child_process')

/** The default band. A course's declared config overrides every field. */
const DEFAULT_BAND = {
  targetLufs: -15.5,
  toleranceDb: 1.5,
  truePeakCeilingDbtp: -1.0,
  evidence: 'docs/audio/deu-loudness-cluster-test-2026-08-06.md — 25 clips, -15.0 to -16.3 LUFS',
}

/**
 * Pull the integrated loudness and true peak out of ffmpeg's ebur128 summary.
 *
 * Kept pure and exported so the parse can be tested without ffmpeg — the parse is
 * where this breaks when ffmpeg changes its output, and a test that needs a real
 * decode is a test nobody runs.
 *
 * @param {string} output  combined stdout+stderr from ffmpeg
 * @returns {{lufs:number|null, truePeakDbtp:number|null, lra:number|null}}
 */
function parseEbur128 (output) {
  const text = String(output || '')
  // The summary block repeats the running values; the LAST match is the final one.
  const last = (re) => {
    const all = text.match(re)
    if (!all || !all.length) return null
    const m = all[all.length - 1].match(/(-?\d+(?:\.\d+)?)/)
    return m ? Number(m[1]) : null
  }
  return {
    lufs: last(/I:\s*-?\d+(?:\.\d+)?\s*LUFS/g),
    truePeakDbtp: last(/Peak:\s*-?\d+(?:\.\d+)?\s*dBFS/g),
    lra: last(/LRA:\s*-?\d+(?:\.\d+)?\s*LU/g),
  }
}

/**
 * Measure a clip. Accepts a Buffer or a path, because callers hold both.
 * @returns {Promise<{measured:boolean, lufs:number|null, truePeakDbtp:number|null,
 *                    lra:number|null, error:string|null}>}
 */
function measure (input) {
  return new Promise((resolve) => {
    const isBuffer = Buffer.isBuffer(input)
    const args = [
      '-hide_banner', '-nostats',
      '-i', isBuffer ? 'pipe:0' : input,
      '-af', 'ebur128=peak=true:framelog=quiet',
      '-f', 'null', '-',
    ]
    const ff = spawn('ffmpeg', args)
    let out = ''
    ff.stdout.on('data', (d) => { out += d.toString() })
    ff.stderr.on('data', (d) => { out += d.toString() })
    // ffmpeg absent is the honest "cannot measure", not a pass.
    ff.on('error', (e) => resolve({ measured: false, lufs: null, truePeakDbtp: null, lra: null, error: e.message }))
    ff.on('close', (code) => {
      const parsed = parseEbur128(out)
      if (code !== 0 && parsed.lufs === null) {
        return resolve({ measured: false, ...parsed, error: `ffmpeg exited ${code}` })
      }
      if (parsed.lufs === null) {
        return resolve({ measured: false, ...parsed, error: 'no ebur128 I: line in ffmpeg output' })
      }
      resolve({ measured: true, ...parsed, error: null })
    })
    if (isBuffer) {
      ff.stdin.on('error', () => {})
      ff.stdin.end(input)
    }
  })
}

/**
 * Judge a measurement against a band. Pure.
 *
 * THREE OUTCOMES, NEVER TWO — `pass: true`, `pass: false`, `pass: null` meaning
 * "I could not measure this". Under the content-addressed store `null` REFUSES
 * admission; it is the caller's job to apply that, and gate-stack.cjs does.
 *
 * True peak is only judged when ffmpeg reported one: an absent peak reading makes
 * the peak leg unmeasured, and it says so rather than quietly passing.
 */
function verdict (m, band = {}) {
  const cfg = { ...DEFAULT_BAND, ...band }
  if (!m || !m.measured || m.lufs === null) {
    return {
      pass: null,
      reason: `loudness not measured — ${m?.error || 'no reading'}`,
      lufs: null,
      truePeakDbtp: null,
      band: cfg,
    }
  }
  const low = cfg.targetLufs - cfg.toleranceDb
  const high = cfg.targetLufs + cfg.toleranceDb
  const inBand = m.lufs >= low && m.lufs <= high
  const peakKnown = m.truePeakDbtp !== null
  const peakOk = !peakKnown || m.truePeakDbtp < cfg.truePeakCeilingDbtp

  const pass = inBand && peakOk
  const parts = []
  if (!inBand) {
    parts.push(
      `${m.lufs} LUFS is outside ${low.toFixed(1)}..${high.toFixed(1)} ` +
      `(target ${cfg.targetLufs} +/-${cfg.toleranceDb})`
    )
  }
  if (peakKnown && !peakOk) {
    parts.push(`true peak ${m.truePeakDbtp} dBTP is at or above the ${cfg.truePeakCeilingDbtp} dBTP ceiling`)
  }
  const reason = pass
    ? `${m.lufs} LUFS within ${low.toFixed(1)}..${high.toFixed(1)}` +
      (peakKnown ? `, true peak ${m.truePeakDbtp} dBTP` : ', true peak not reported')
    : parts.join('; ')

  return {
    pass,
    reason,
    lufs: m.lufs,
    truePeakDbtp: m.truePeakDbtp,
    lra: m.lra,
    truePeakMeasured: peakKnown,
    band: cfg,
  }
}

/** Measure and judge in one call. */
async function check (input, band = {}) {
  const m = await measure(input)
  return { ...verdict(m, band), measurement: m }
}

module.exports = { DEFAULT_BAND, parseEbur128, measure, verdict, check }
