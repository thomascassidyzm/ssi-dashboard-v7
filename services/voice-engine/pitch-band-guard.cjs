/**
 * pitch-band-guard.cjs — one cheap check: is this take's pitch anywhere near
 * the voice it claims to be?
 *
 * NOT a voice matcher. A real matcher (energy/prosody/waveform comparison)
 * was explicitly ruled out (Tom, 2026-09-16) — too expensive, too fragile, and
 * not what the actual problem needs. The actual problem is narrower: an
 * account can upload under the WRONG recordist (Catrin's login carrying
 * Aran's read), and a male and a female voice sit in measurably different
 * pitch bands almost always. So: one number (the take's median pitch) against
 * one range (the band this voice's own takes have lived in), and if it is
 * FAR outside that range, flag the take for a human to listen to. Never
 * refuse — a genuinely low or high voice inside the same person is real and
 * must never be blocked by this; it is a nudge to double-check, not a gate.
 *
 * Pitch measurement itself is out of scope here (that is an existing-audio-
 * intelligence-engine's job, per the same ruling — reuse it, do not add a
 * second analyser). This module takes an already-measured Hz value in.
 */

/**
 * @param {object} o
 * @param {number|null} o.measuredHz   this take's own median/representative pitch, or null if unmeasured
 * @param {{minHz:number, maxHz:number}|null} o.knownBand   this recordist's usual pitch range, or null if unknown
 * @param {number} [o.marginRatio]   how far outside the known band still counts as "near" (0.15 = 15%)
 * @returns {{flagged:boolean, reason:string}}
 */
function checkPitchBand({ measuredHz, knownBand, marginRatio = 0.15 }) {
  if (measuredHz == null || !Number.isFinite(measuredHz) || measuredHz <= 0) {
    return { flagged: false, reason: 'pitch not measured — nothing to compare' }
  }
  if (!knownBand || !Number.isFinite(knownBand.minHz) || !Number.isFinite(knownBand.maxHz)) {
    return { flagged: false, reason: 'no known pitch band for this recordist yet — nothing to compare' }
  }
  const span = knownBand.maxHz - knownBand.minHz
  const margin = span > 0 ? span * marginRatio : knownBand.minHz * marginRatio
  const lo = knownBand.minHz - margin
  const hi = knownBand.maxHz + margin
  if (measuredHz < lo || measuredHz > hi) {
    return {
      flagged: true,
      reason: `measured pitch ${measuredHz.toFixed(0)}Hz is outside this recordist's usual `
        + `${knownBand.minHz.toFixed(0)}-${knownBand.maxHz.toFixed(0)}Hz band (±${(marginRatio * 100).toFixed(0)}%) — `
        + 'flagged for review, not refused',
    }
  }
  return { flagged: false, reason: `measured pitch ${measuredHz.toFixed(0)}Hz is within band` }
}

module.exports = { checkPitchBand }
