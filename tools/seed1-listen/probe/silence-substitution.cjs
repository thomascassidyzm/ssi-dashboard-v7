const P = require('./paths.cjs')
require('dotenv').config({ path: P.envPath })
/**
 * SILENCE-SUBSTITUTION probe — a different defect from truncation.
 *
 * Kai's model, and the reason the 2026-08-06 seed-1 census returned zero: a "cut"
 * clip is NOT shorter. Its file length is unchanged; the final speech has been
 * REPLACED BY SILENCE mid-word. Every detector that asks "does this file stop
 * abruptly with energy still in it?" is blind to that by construction — the file
 * ends in silence either way, and tail RMS measured just before the trailing
 * silence reads that silence as the pad and scores the clip clean.
 *
 * So this probe never asks where the FILE ends. It asks three things about the
 * trailing silent region itself:
 *
 *   1. HOW LONG is it — absolutely, as a fraction of the clip, and relative to
 *      the clip's siblings (same course, same role, same voice).
 *   2. HOW QUIET is its floor COMPARED TO THIS CLIP'S OWN natural pauses. This is
 *      the load-bearing measurement. Every clip carries a noise floor — encoder
 *      noise, room tone — visible in the gaps between its own words. Silence
 *      written over the tail is quieter than that floor, because it is written,
 *      not recorded. `floorGapDb` is per-clip and self-referential, so it needs
 *      no cross-clip threshold to mean something.
 *   3. HOW ABRUPTLY it begins — `fallMs`, the time to drop 6 dB -> 30 dB below
 *      the pre-silence level. Speech decays over tens of milliseconds; a mute
 *      steps in under one frame.
 *
 * Plus the corroborating question the tail cannot answer: is there LESS SPEECH
 * than the text needs? `msPerNucleus` counts voiced syllable nuclei (method and
 * caveats: scripts/seed1-census/syllables.cjs) and compares audible speech
 * duration against the syllable count the text implies.
 *
 * GAP, stated up front because it bounds everything below: NOT ONE of these clips
 * has `course_audio.word_boundaries` populated. With boundaries this question is
 * decidable outright — the array says what the synthesiser spoke and when, so a
 * final word whose interval is silent is proof, not inference. Without them every
 * number here is acoustic inference.
 *
 * Reads via credentialed S3 GET: the repair-candidates/ prefix is not publicly
 * readable, and the learner is served presigned URLs, so this matches the learner.
 */
const fs = require('fs'), os = require('os'), path = require('path')
const { execFile } = require('child_process'); const run = require('util').promisify(execFile)
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
})

const SR = 16000
const HOP = Math.round(SR * 0.005)          // 5 ms hop
const WIN = HOP * 2                          // 10 ms window
const CONC = 4                               // watson-1 is a shared 8-core box

const db = v => v <= 0 ? -140 : 20 * Math.log10(v)
function rms (b, a, z) {
  a = Math.max(0, a); z = Math.min(b.length / 2, z)
  let s = 0, n = 0
  for (let i = a; i < z; i++) { const v = b.readInt16LE(i * 2) / 32768; s += v * v; n++ }
  return n ? Math.sqrt(s / n) : 0
}
const pct = (arr, p) => {
  if (!arr.length) return null
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)))]
}

async function decode (s3key, tmp, filters) {
  const local = path.join(tmp, Math.random().toString(36).slice(2) + '.mp3')
  const o = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: s3key }))
  fs.writeFileSync(local, Buffer.concat(await o.Body.toArray()))
  const args = ['-v', 'error', '-i', local, '-ac', '1', '-ar', String(SR)]
  if (filters) args.push('-af', filters)
  args.push('-f', 's16le', '-')
  try {
    return (await run('/usr/bin/ffmpeg', args, { maxBuffer: 1 << 28, encoding: 'buffer' })).stdout
  } finally { fs.unlinkSync(local) }
}

// Voiced syllable nuclei — the "is speech MISSING" corroborator. Band-limited to the
// vowel formant region so fricatives and plosives don't mint peaks of their own.
function countNuclei (pcm) {
  const H = Math.round(SR * 0.01)
  const N = pcm.length / 2
  let env = []
  for (let a = 0; a + H <= N; a += H) env.push(db(rms(pcm, a, a + H)))
  env = env.map((_, i) => (env[Math.max(0, i - 1)] + env[i] + env[Math.min(env.length - 1, i + 1)]) / 3)
  const peak = Math.max(...env), thr = peak - 25, DIP = 4
  let count = 0, i = 0
  while (i < env.length) {
    if (env[i] < thr) { i++; continue }
    let j = i
    while (j < env.length && env[j] >= thr) j++
    let sub = 1, running = env[i], falling = false
    for (let k = i; k < j; k++) {
      if (env[k] > running) { if (falling) { sub++; falling = false } running = env[k] } else if (running - env[k] >= DIP) { falling = true; running = env[k] }
    }
    count += sub; i = j
  }
  return count
}

async function probe (clip, tmp) {
  if (!clip.s3_key) return { ...clip, ok: false, error: 'no s3_key' }
  let pcm, band
  try {
    pcm = await decode(clip.s3_key, tmp)
    band = await decode(clip.s3_key, tmp, 'highpass=f=250,lowpass=f=1600')
  } catch (e) { return { ...clip, ok: false, error: (e.name || 'decode') + ': ' + (e.message || '').slice(0, 80) } }

  const N = pcm.length / 2
  if (N < SR * 0.1) return { ...clip, ok: false, error: `too short (${N} samples)` }

  const env = []
  for (let a = 0; a + WIN <= N; a += HOP) env.push(db(rms(pcm, a, a + WIN)))
  const peakDb = Math.max(...env)
  const floorDb = peakDb - 40                       // 40 dB below loudest frame = "silent"

  let last = env.length - 1; while (last > 0 && env[last] <= floorDb) last--
  let first = 0; while (first < last && env[first] <= floorDb) first++
  if (last <= first) return { ...clip, ok: false, error: 'no speech region found' }

  const cutFrame = last + 1
  const cutSample = Math.min(N, cutFrame * HOP + WIN)
  const durationMs = (N / SR) * 1000
  const speechMs = ((cutSample - first * HOP) / SR) * 1000
  const trailingSilenceMs = durationMs - (cutSample / SR) * 1000

  // ---- 2. floor of the trailing silence vs THIS CLIP'S OWN natural pauses -------
  // Skip 20 ms after the cut so a decay tail isn't counted as floor.
  const tailFrames = env.slice(cutFrame + 4)
  const trailingFloorDb = tailFrames.length ? pct(tailFrames, 0.5) : null
  const trailingMinDb = tailFrames.length ? Math.min(...tailFrames) : null
  // Natural in-clip pause floor: the quietest 10% of frames strictly INSIDE the
  // speech region. On a clip with no internal pause this is just its noise floor —
  // which is exactly the right comparator either way.
  const bodyFrames = env.slice(first, last + 1)
  const internalFloorDb = pct(bodyFrames, 0.10)
  const internalMinDb = bodyFrames.length ? Math.min(...bodyFrames) : null
  const floorGapDb = (trailingFloorDb == null || internalFloorDb == null)
    ? null : +(internalFloorDb - trailingFloorDb).toFixed(2)
  // digital silence: literally zero-valued samples in the trailing region
  let zeroRun = 0
  for (let i = N - 1; i >= cutSample && pcm.readInt16LE(i * 2) === 0; i--) zeroRun++
  const trailingZeroMs = +((zeroRun / SR) * 1000).toFixed(1)

  // ---- 3. abruptness of the silence onset --------------------------------------
  const preCutDb = db(rms(pcm, cutSample - Math.round(SR * 0.02), cutSample))
  const postCutDb = db(rms(pcm, cutSample, cutSample + Math.round(SR * 0.02)))
  const stepDb = +(preCutDb - postCutDb).toFixed(2)
  // fallMs: frames from the last frame above (ref-6) to the first frame below (ref-30),
  // ref = the loudest frame in the 100 ms before the cut. Speech decays; a mute steps.
  const refWin = env.slice(Math.max(0, cutFrame - 20), cutFrame)
  const refDb = refWin.length ? Math.max(...refWin) : peakDb
  let fA = null, fB = null
  for (let i = Math.max(0, cutFrame - 40); i < env.length; i++) { if (env[i] >= refDb - 6) fA = i }
  if (fA != null) for (let i = fA; i < env.length; i++) { if (env[i] <= refDb - 30) { fB = i; break } }
  const fallMs = (fA != null && fB != null) ? +((fB - fA) * 5).toFixed(1) : null

  // ---- corroborator: is there LESS SPEECH than the text implies? ---------------
  const nuclei = countNuclei(band)
  const msPerNucleus = nuclei ? +(speechMs / nuclei).toFixed(1) : null

  return {
    ...clip,
    ok: true,
    durationMs: +durationMs.toFixed(1),
    speechMs: +speechMs.toFixed(1),
    leadingSilenceMs: +((first * HOP / SR) * 1000).toFixed(1),
    trailingSilenceMs: +trailingSilenceMs.toFixed(1),
    trailingFraction: +(trailingSilenceMs / durationMs).toFixed(4),
    trailingFloorDb: trailingFloorDb == null ? null : +trailingFloorDb.toFixed(2),
    trailingMinDb: trailingMinDb == null ? null : +trailingMinDb.toFixed(2),
    internalFloorDb: internalFloorDb == null ? null : +internalFloorDb.toFixed(2),
    internalMinDb: internalMinDb == null ? null : +internalMinDb.toFixed(2),
    floorGapDb,
    trailingZeroMs,
    peakDb: +peakDb.toFixed(2),
    preCutDb: +preCutDb.toFixed(2),
    postCutDb: +postCutDb.toFixed(2),
    stepDb,
    fallMs,
    nuclei,
    msPerNucleus
  }
}

async function probeAll (clips, label) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'silsub-'))
  const out = []
  let done = 0
  const queue = [...clips]
  await Promise.all(Array.from({ length: CONC }, async () => {
    while (queue.length) {
      const c = queue.shift()
      out.push(await probe(c, tmp))
      if (++done % 10 === 0) process.stderr.write(`  ${label}: ${done}/${clips.length}\n`)
    }
  }))
  fs.rmSync(tmp, { recursive: true, force: true })
  return out
}

module.exports = { probe, probeAll, pct }
