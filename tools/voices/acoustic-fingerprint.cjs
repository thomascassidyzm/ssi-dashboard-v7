#!/usr/bin/env node
/**
 * Acoustic fingerprint of a recording — evidence for "who spoke this?" when no
 * metadata names them (job #703). Pure Node + ffmpeg, no ML: median pitch (f0),
 * pitch spread, voiced fraction, and a 16-band long-term spectrum (timbre).
 *
 * A fingerprint groups clips by LIKELY speaker; it never names one. Naming is
 * Tom's ear (listening sheet) or a metadata source, never this file.
 *
 *   node tools/voices/acoustic-fingerprint.cjs --in keys.txt --out fp.jsonl [--par 4]
 *   keys.txt: one line per clip, `<tag>|<s3_key>` ; output resumes (skips keys already done).
 * Reads S3 read-only (SigV4 via curl). No TTS, no writes anywhere but --out.
 */
const fs = require('fs')
const { spawn, execFile } = require('child_process')
const SR = 16000, FRAME = 640, HOP = 320 // 40 ms frames, 20 ms hop
const BANDS = 16, FMIN = 100, FMAX = 7000

function fft(re, im) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]] } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2
        const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t
      }
    }
  }
}

/** f0 per voiced frame by normalised autocorrelation, 70–400 Hz. */
function f0Frame(x, off) {
  const lagMin = Math.floor(SR / 400), lagMax = Math.floor(SR / 70)
  let e0 = 0
  for (let i = 0; i < FRAME; i++) e0 += x[off + i] * x[off + i]
  if (e0 < 1e-4 * FRAME) return null
  const corr = new Float64Array(lagMax + 2)
  let best = 0
  for (let lag = lagMin; lag <= lagMax + 1; lag++) {
    let s = 0, e1 = 0
    for (let i = 0; i < FRAME - lagMax - 1; i++) { s += x[off + i] * x[off + i + lag]; e1 += x[off + i + lag] * x[off + i + lag] }
    corr[lag] = s / Math.sqrt(e0 * (e1 || 1))
    if (corr[lag] > best) best = corr[lag]
  }
  // the SHORTEST lag that is a local peak within 10% of the best: taking the plain maximum picks the
  // sub-octave (2T) as often as T and halves the pitch of high voices
  let bestLag = 0
  for (let lag = lagMin + 1; lag <= lagMax; lag++) {
    if (corr[lag] >= 0.9 * best && corr[lag] >= corr[lag - 1] && corr[lag] >= corr[lag + 1]) { bestLag = lag; break }
  }
  if (!bestLag) return null
  return best > 0.6 ? SR / bestLag : null
}

function analyse(pcm) {
  const x = new Float32Array(pcm.length / 2)
  for (let i = 0; i < x.length; i++) x[i] = pcm.readInt16LE(i * 2) / 32768
  const f0s = []
  let frames = 0
  const ltas = new Float64Array(BANDS)
  const edges = Array.from({ length: BANDS + 1 }, (_, i) => FMIN * Math.pow(FMAX / FMIN, i / BANDS))
  const N = 1024
  const re = new Float64Array(N), im = new Float64Array(N)
  let nspec = 0
  for (let off = 0; off + FRAME <= x.length; off += HOP) {
    frames++
    const f = f0Frame(x, off)
    if (f) {
      f0s.push(f)
      re.fill(0); im.fill(0)
      for (let i = 0; i < FRAME; i++) re[i] = x[off + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (FRAME - 1)))
      fft(re, im)
      for (let b = 0; b < BANDS; b++) {
        let s = 0
        const k0 = Math.max(1, Math.round(edges[b] * N / SR)), k1 = Math.max(k0 + 1, Math.round(edges[b + 1] * N / SR))
        for (let k = k0; k < k1; k++) s += re[k] * re[k] + im[k] * im[k]
        ltas[b] += s / (k1 - k0)
      }
      nspec++
    }
  }
  if (f0s.length < 5) return { ok: false, frames, voiced: f0s.length }
  f0s.sort((a, b) => a - b)
  const q = p => f0s[Math.floor(p * (f0s.length - 1))]
  const db = Array.from(ltas, v => 10 * Math.log10(v / nspec + 1e-12))
  const mean = db.reduce((a, b) => a + b, 0) / BANDS
  return { ok: true, f0: +q(0.5).toFixed(1), f0lo: +q(0.1).toFixed(1), f0hi: +q(0.9).toFixed(1), voicedFrac: +(f0s.length / frames).toFixed(2), secs: +(x.length / SR).toFixed(2), ltas: db.map(v => +(v - mean).toFixed(1)) }
}

function fetchPcm(key, env) {
  return new Promise((resolve, reject) => {
    const url = `https://${env.bucket}.s3.${env.region}.amazonaws.com/${key}`
    const curl = spawn('curl', ['-sf', '--aws-sigv4', `aws:amz:${env.region}:s3`, '--user', `${env.ak}:${env.sk}`, url])
    const ff = spawn('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-ac', '1', '-ar', String(SR), '-f', 's16le', 'pipe:1'])
    const out = []
    curl.stdout.pipe(ff.stdin); ff.stdin.on('error', () => {}); curl.stderr.on('data', () => {})
    ff.stdout.on('data', d => out.push(d)); ff.stderr.on('data', () => {})
    let cc = null
    curl.on('close', c => { cc = c })
    ff.on('close', () => (cc === 0 ? resolve(Buffer.concat(out)) : reject(new Error('curl exit ' + cc))))
  })
}

async function main() {
  const a = process.argv.slice(2), arg = (n, d) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : d }
  const inF = arg('--in'), outF = arg('--out'), par = +arg('--par', 4)
  if (!inF || !outF) { console.error('usage: --in keys.txt --out fp.jsonl [--par n]'); process.exit(2) }
  const env = { ak: process.env.AWS_ACCESS_KEY_ID, sk: process.env.AWS_SECRET_ACCESS_KEY, region: process.env.AWS_REGION || 'eu-west-1', bucket: process.env.S3_AUDIO_BUCKET || 'ssi-audio-stage' }
  const done = new Set(fs.existsSync(outF) ? fs.readFileSync(outF, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).key) : [])
  const todo = fs.readFileSync(inF, 'utf8').split('\n').filter(Boolean).map(l => { const i = l.indexOf('|'); return { tag: l.slice(0, i), key: l.slice(i + 1) } }).filter(t => !done.has(t.key))
  const fd = fs.openSync(outF, 'a')
  let i = 0, n = 0
  await Promise.all(Array.from({ length: par }, async () => {
    while (i < todo.length) {
      const t = todo[i++]
      try { const r = analyse(await fetchPcm(t.key, env)); fs.writeSync(fd, JSON.stringify({ key: t.key, tag: t.tag, ...r }) + '\n') } catch (e) { fs.writeSync(fd, JSON.stringify({ key: t.key, tag: t.tag, ok: false, err: String(e.message) }) + '\n') }
      if (++n % 500 === 0) console.error(`${new Date().toISOString()} ${n}/${todo.length}`)
    }
  }))
}
if (require.main === module) main()
module.exports = { analyse }
