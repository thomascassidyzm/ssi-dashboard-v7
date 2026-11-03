// MOVED to Popty from ssi-learning-app/tools/intro-bank/frankenstein/dsp.mjs (job #699, Tom 2026-11-03: "we need everything that touches course content to be a popty tool"); behaviour unchanged, app paths via tools/lib/learning-app.mjs.
// DSP for the spliced Tom-006 intro house setting: copied 1:1 from ../afr-remake/remake.mjs (the #348 lab maths). Pure functions, no I/O.
// ── DSP (the #348 lab maths, ported 1:1) ─────────────────────────────────
export const TARGET_DB = -14, CEIL = 0.97, MAX_GAIN = 6, SILENT_TAIL_MS = 250
const toDb = (x) => 20 * Math.log10(Math.max(x, 1e-9))
export function voicedRms(x, sr) {
  const f = Math.max(1, Math.round(sr * 0.02)), n = x.length, ms = []
  for (let i = 0; i + f <= n || (i < n && ms.length === 0); i += f) { const e = Math.min(n, i + f); let s = 0; for (let j = i; j < e; j++) s += x[j] * x[j]; ms.push(s / (e - i)) }
  let mx = 0; for (const m of ms) if (m > mx) mx = m
  const g = mx * 0.01; let sum = 0, c = 0; for (const m of ms) if (m >= g && m > 0) { sum += m; c++ }
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
  const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = x[i] * gain[i]; return o
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
export function tomEnding(x, sr, fadeMs) {
  const fr = Math.max(1, Math.round(sr * 0.005)), n = x.length; let eos = -1
  for (let i = 0; i + fr <= n; i += fr) { let e = 0; for (let j = i; j < i + fr; j++) e += x[j] * x[j]; if (20 * Math.log10(Math.sqrt(e / fr) + 1e-12) > -45) eos = i + fr }
  if (eos < 0) return x
  const fade = Math.min(eos, Math.round(sr * fadeMs / 1000)), o = new Float32Array(eos + Math.round(sr * SILENT_TAIL_MS / 1000))
  o.set(x.subarray(0, eos)); for (let i = 0; i < fade; i++) o[eos - fade + i] *= Math.cos(i / fade * Math.PI / 2)
  return o
}
export function snapOnset(x, at, sr) {
  const fr = Math.round(sr * 0.005), th = 10 ** (-45 / 20), rms = (i) => { let e = 0; for (let j = i; j < i + fr && j < x.length; j++) e += x[j] * x[j]; return Math.sqrt(e / fr) }
  let a = at; while (a - fr >= 0 && at - a < sr * 0.15 && rms(a - fr) > th) a -= fr
  return Math.max(0, a - Math.round(sr * 0.01))
}
export function overlay(parts, gapsMs, sr) {
  const offs = [0]; let end = parts[0].length
  for (let i = 1; i < parts.length; i++) { const at = Math.max(0, end + Math.round(sr * gapsMs[i - 1] / 1000)); offs.push(at); end = Math.max(end, at + parts[i].length) }
  const o = new Float32Array(end); parts.forEach((p, i) => { for (let j = 0; j < p.length; j++) o[offs[i] + j] += p[j] }); return o
}

