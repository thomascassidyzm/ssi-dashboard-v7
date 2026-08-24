// Median F0 of voiced frames, pure Node. ffmpeg -> 16k mono s16le -> autocorrelation.
const { execFileSync } = require('child_process')
const SR = 16000, FMIN = 60, FMAX = 400

function pcm(file) {
  const buf = execFileSync('ffmpeg', ['-v','quiet','-i',file,'-ac','1','-ar',String(SR),'-f','s16le','-'],
    { maxBuffer: 1 << 28 })
  const n = buf.length >> 1, out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = buf.readInt16LE(i << 1) / 32768
  return out
}

function medianF0(file) {
  const x = pcm(file)
  const W = 1024, HOP = 512
  const minLag = Math.floor(SR / FMAX), maxLag = Math.floor(SR / FMIN)
  const f0s = []
  for (let start = 0; start + W + maxLag < x.length; start += HOP) {
    let energy = 0
    for (let i = 0; i < W; i++) energy += x[start+i] * x[start+i]
    const rms = Math.sqrt(energy / W)
    if (rms < 0.015) continue                       // silence / unvoiced
    let bestLag = -1, bestScore = 0
    for (let lag = minLag; lag <= maxLag; lag++) {
      let num = 0, d1 = 0, d2 = 0
      for (let i = 0; i < W; i++) { const a = x[start+i], b = x[start+i+lag]; num += a*b; d1 += a*a; d2 += b*b }
      const score = num / (Math.sqrt(d1*d2) + 1e-12)
      if (score > bestScore) { bestScore = score; bestLag = lag }
    }
    if (bestScore > 0.6 && bestLag > 0) f0s.push(SR / bestLag)   // confident voicing only
  }
  if (f0s.length < 5) return { f0: null, frames: f0s.length }
  f0s.sort((a,b)=>a-b)
  return { f0: Math.round(f0s[f0s.length >> 1]), frames: f0s.length }
}
module.exports = { medianF0 }
if (require.main === module) console.log(JSON.stringify(medianF0(process.argv[2])))
