/**
 * Intro lab DSP — the #348 lab's mixing maths, lifted unchanged into a module (job #488) so the Popty page and its test
 * share one copy. Same maths as the shipped levelling (introAssembly.ts) and as #364's remake.mjs: pieces matched to one level,
 * the LEGO set above the frame by the emphasis slider, the whole intro brought to -14 dBFS (voiced RMS) under a peak limiter
 * at 0.97, then the Tom-006 ending (equal-power fade over the last speech, 250 ms of silence).
 *
 * Everything is a pure function over Float32Array — no AudioContext in here — so it runs in the page and in a test.
 */

export const TARGET_DB = -14
export const CEIL = 0.97
export const MAX_GAIN = 6
export const SILENT_TAIL_MS = 250

/**
 * THE HOUSE SETTING — Tom, 2026-10-13, by ear in the #348 lab (ruling r-2026-10-13-spliced-tom-voice-intro-house-setting):
 * splice mode, gap frame→LEGO 0 ms, LEGO→tail −60 ms, LEGO +1.5 dB, tail 0 dB, fade 80 ms, no edge trim, overall −14 dBFS,
 * 250 ms end silence; default tail "is said like this" ("is" and "is given as" acceptable for variety; "sounds like this"
 * rejected as too informal). `inGap` is the 120 ms joint #364 uses between the pieces of an "as in" intro.
 */
export const HOUSE = Object.freeze({ g1: 0, g2: -60, inGap: 120, em: 1.5, tl: 0, fd: 80, trim: false, tail: 'said-like-this' })

export const toDb = (x) => 20 * Math.log10(Math.max(x, 1e-9))

export function voicedRms(x, sr) {
  const f = Math.max(1, Math.round(sr * 0.02)), n = x.length, ms = []
  for (let i = 0; i + f <= n || (i < n && ms.length === 0); i += f) {
    const e = Math.min(n, i + f); let s = 0
    for (let j = i; j < e; j++) s += x[j] * x[j]
    ms.push(s / (e - i))
  }
  let mx = 0; for (const m of ms) if (m > mx) mx = m
  const g = mx * 0.01; let sum = 0, c = 0
  for (const m of ms) if (m >= g && m > 0) { sum += m; c++ }
  return c ? Math.sqrt(sum / c) : 0
}

export const scale = (x, g) => { const o = new Float32Array(x.length); for (let i = 0; i < x.length; i++) o[i] = x[i] * g; return o }

export function limitPeaks(x, sr) {
  const n = x.length, L = Math.max(1, Math.round(sr * 0.004)), need = new Float32Array(n).fill(1); let any = false
  for (let i = 0; i < n; i++) { const a = Math.abs(x[i]); if (a > CEIL) { need[i] = CEIL / a; any = true } }
  if (!any) return x
  const low = new Float32Array(n).fill(1)
  for (let i = 0; i < n; i++) { if (need[i] >= 1) continue; for (let j = Math.max(0, i - L); j <= Math.min(n - 1, i + L); j++) if (need[i] < low[j]) low[j] = need[i] }
  const gain = new Float32Array(n), w = 2 * L + 1; let acc = 0
  for (let j = 0; j < Math.min(n, L); j++) acc += low[j]
  for (let i = 0; i < n; i++) { if (i + L < n) acc += low[i + L]; if (i - L - 1 >= 0) acc -= low[i - L - 1]; gain[i] = acc / w }
  for (let i = 0; i < n; i++) { const lo = Math.max(0, i - L), hi = Math.min(n - 1, i + L), miss = w - (hi - lo + 1); if (miss) gain[i] = (gain[i] * w + miss) / w }
  for (let i = 0; i < n; i++) if (gain[i] > need[i]) gain[i] = need[i]
  const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = x[i] * gain[i]
  return o
}

export function normaliseIntro(x, sr) {
  const lv = voicedRms(x, sr); if (lv <= 0) return x
  let g = 10 ** (TARGET_DB / 20) / lv, out = limitPeaks(scale(x, g), sr)
  for (let k = 0; k < 4; k++) { const l = voicedRms(out, sr); if (Math.abs(toDb(l) - TARGET_DB) < 0.05) break; g *= 10 ** (TARGET_DB / 20) / l; out = limitPeaks(scale(x, g), sr) }
  return out
}

export function matchGains(levels, emDb, legoIdx) {
  const ft = 10 ** ((TARGET_DB - emDb * 0.5) / 20), lift = 10 ** (emDb / 20)
  return levels.map((l, i) => (l <= 0 ? 1 : Math.min(MAX_GAIN, (i === legoIdx ? ft * lift : ft) / l)))
}

/** The Tom-006 ending: fade over the last speech (end = last 5 ms frame above −45 dB), then 250 ms of silence. */
export function tomEnding(x, sr, fadeMs) {
  const fr = Math.max(1, Math.round(sr * 0.005)), n = x.length; let eos = -1
  for (let i = 0; i + fr <= n; i += fr) { let e = 0; for (let j = i; j < i + fr; j++) e += x[j] * x[j]; if (20 * Math.log10(Math.sqrt(e / fr) + 1e-12) > -45) eos = i + fr }
  if (eos < 0) return x
  const fade = Math.min(eos, Math.round(sr * fadeMs / 1000)), o = new Float32Array(eos + Math.round(sr * SILENT_TAIL_MS / 1000))
  o.set(x.subarray(0, eos))
  for (let i = 0; i < fade; i++) o[eos - fade + i] *= Math.cos(i / fade * Math.PI / 2)
  return o
}

export function trimEdges(x, sr) {
  const fr = Math.max(1, Math.round(sr * 0.005)), n = x.length, th = 10 ** (-45 / 20); let a = 0, b = n
  for (let i = 0; i + fr <= n; i += fr) { let e = 0; for (let j = i; j < i + fr; j++) e += x[j] * x[j]; if (Math.sqrt(e / fr) > th) { a = i; break } }
  for (let i = n - fr; i >= 0; i -= fr) { let e = 0; for (let j = i; j < i + fr; j++) e += x[j] * x[j]; if (Math.sqrt(e / fr) > th) { b = i + fr; break } }
  return x.subarray(a, Math.max(a + 1, b))
}

/** Cartesia word starts can land up to ~60 ms inside a soft onset ("to"): walk back to the silence before it (max 150 ms). */
export function snapOnset(x, at, sr) {
  const fr = Math.round(sr * 0.005), th = 10 ** (-45 / 20)
  const rms = (i) => { let e = 0; for (let j = i; j < i + fr && j < x.length; j++) e += x[j] * x[j]; return Math.sqrt(e / fr) }
  let a = at
  while (a - fr >= 0 && at - a < sr * 0.15 && rms(a - fr) > th) a -= fr
  return Math.max(0, a - Math.round(sr * 0.01))
}

/** Join with gaps (a negative gap overlaps the pieces, linear sum). */
export function join(parts, gapsMs, sr) {
  const offs = [0]; let end = parts[0].length
  for (let i = 1; i < parts.length; i++) { const at = Math.max(0, end + Math.round(sr * gapsMs[i - 1] / 1000)); offs.push(at); end = Math.max(end, at + parts[i].length) }
  const o = new Float32Array(end)
  parts.forEach((p, i) => { for (let j = 0; j < p.length; j++) o[offs[i] + j] += p[j] })
  return o
}

/**
 * Build one spliced intro. `kind` is the recipe: 'bare' (frame + LEGO + tail), 'cut' (frame + a slice of a continuous Tom-006
 * intro), 'pieces' (frame + LEGO + "as in" + context + "is"). `pcm` holds the decoded pieces:
 *   bare   { frame, lego, tail }
 *   cut    { frame, donor, donorStart, donorEnd }   (donorStart/End = seconds, from the donor's word_timings: word 3 → last word)
 *   pieces { frame, lego, asIn, context, is }
 * `s` is the settings object (HOUSE shape). Returns { x, note } where x is the finished mono Float32Array.
 */
export function buildIntro(kind, pcm, s, sr) {
  const T = (x) => (s.trim ? trimEdges(x, sr) : x)
  let parts, gaps
  if (kind === 'cut') {
    const a = snapOnset(pcm.donor, Math.round(pcm.donorStart * sr), sr)
    const b = Math.min(pcm.donor.length, Math.round((pcm.donorEnd + 0.03) * sr))
    parts = [T(pcm.frame), T(pcm.donor.subarray(a, b))]; gaps = [s.g1]
  } else if (kind === 'pieces') {
    parts = [pcm.frame, pcm.lego, pcm.asIn, pcm.context, pcm.is].map(T); gaps = [s.g1, s.inGap, s.inGap, s.inGap]
  } else {
    parts = [pcm.frame, pcm.lego, pcm.tail].map(T); gaps = [s.g1, s.g2]
  }
  const gn = matchGains(parts.map((q) => voicedRms(q, sr)), s.em, 1)
  if (kind === 'bare') gn[2] *= 10 ** (s.tl / 20)
  parts = parts.map((q, k) => scale(q, gn[k]))
  return tomEnding(normaliseIntro(join(parts, gaps, sr), sr), sr, s.fd)
}
