// A-131 tail-click bisect — offline, read-only on the evidence clips.
// Pushes each existing mp3 through variants of the mastering chain with one
// step removed at a time, and reports what each variant does to the last
// 300ms. SUBTRACTION ONLY: no trim, no pad, no repair, no de-click.
//
// Usage: node scripts/a131-chain-bisect.cjs [outdir]
const path = require('path'), fs = require('fs')
const { execFileSync } = require('child_process')
const ap = require('../../services/audio-processor.cjs')

const SRC = '/home/tomcassidy/command-surface/public/evidence/t22-nld-register-2026-08-16/clips'
const OUT = process.argv[2] || '/tmp/a131/out'
fs.mkdirSync(OUT, { recursive: true })

const AF = ap.ANTI_CLICK_FADE
const PC = 'acompressor=threshold=-24dB:ratio=8:attack=5:release=80:knee=8'
const TP = 'aresample=176400,alimiter=limit=0.841:attack=1:release=50:level=false'

// gain is measured per-file the way normalizeAudio does; for the variants we
// reuse a fixed nominal gain so the ONLY difference between variants is which
// processing step is present.
const VARIANTS = {
  full:             g => `${PC},volume=${g}dB,${TP},${AF}`,  // what shipped
  no_comp:          g => `volume=${g}dB,${TP},${AF}`,         // == normalizeAudioClean
  no_limit:         g => `${PC},volume=${g}dB,${AF}`,
  no_comp_no_limit: g => `volume=${g}dB,${AF}`,
  gain_only:        g => `volume=${g}dB`,
}

function pcm(file) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', '48000', '-f', 's16le', '-'],
    { maxBuffer: 1 << 28 })
  const n = buf.length >> 1
  const s = i => buf.readInt16LE(i * 2)
  return { n, s }
}

// 2ms window peaks over the last `ms`, in dB relative to the clip's own peak.
function tailProfile(file, ms = 300) {
  const { n, s } = pcm(file)
  let peak = 0
  for (let i = 0; i < n; i++) { const a = Math.abs(s(i)); if (a > peak) peak = a }
  const w = 96 // 2ms @48k
  const wins = []
  for (let o = Math.max(0, n - 48 * ms); o + w <= n; o += w) {
    let m = 0
    for (let i = o; i < o + w; i++) { const a = Math.abs(s(i)); if (a > m) m = a }
    wins.push(peak ? (m ? 20 * Math.log10(m / peak) : -99) : -99)
  }
  // the noise-floor cliff: the largest single-window DROP in the tail, and how
  // long the digital silence that follows it runs for.
  let cliff = { db: 0, msBeforeEof: null }
  for (let i = 1; i < wins.length; i++) {
    const d = wins[i - 1] - wins[i]
    if (d > cliff.db) cliff = { db: d, msBeforeEof: (wins.length - i) * 2 }
  }
  // the largest single-window RISE after the level has settled (a transient)
  let rise = { db: 0, msBeforeEof: null }
  for (let i = 1; i < wins.length; i++) {
    const d = wins[i] - wins[i - 1]
    if (d > rise.db && wins[i] > -50) rise = { db: d, msBeforeEof: (wins.length - i) * 2 }
  }
  return { wins, cliff, rise, peak }
}

async function main() {
  const files = process.argv.includes('--all')
    ? fs.readdirSync(SRC).filter(f => f.endsWith('.mp3'))
    : ['nld-live-now.mp3', 'cand-3BC86EF0-B45A-4A4E-B18E-D28DC114F3C2.mp3',
       'cand-BB95F997-BAC9-48D3-9136-199054DAA5E1.mp3', 'cand-7B628FFD-538C-462B-8F07-D80AB2015FA6.mp3',
       'nld-control-azure.mp3']
  const report = []
  for (const f of files) {
    const src = path.join(SRC, f)
    const base = tailProfile(src)
    console.log('='.repeat(72))
    console.log(f, `peak=${base.peak}`)
    console.log(`  as-is        cliff ${base.cliff.db.toFixed(1)}dB @${base.cliff.msBeforeEof}ms  rise ${base.rise.db.toFixed(1)}dB @${base.rise.msBeforeEof}ms`)
    const row = { file: f, asIs: base.cliff, asIsRise: base.rise, variants: {} }
    for (const [name, chain] of Object.entries(VARIANTS)) {
      const out = path.join(OUT, `${f.replace('.mp3', '')}__${name}.mp3`)
      await ap.ffmpegFilterToLameMp3(src, out, { filterChain: chain(0) })
      const p = tailProfile(out)
      console.log(`  ${name.padEnd(16)} cliff ${p.cliff.db.toFixed(1)}dB @${p.cliff.msBeforeEof}ms  rise ${p.rise.db.toFixed(1)}dB @${p.rise.msBeforeEof}ms`)
      row.variants[name] = { cliff: p.cliff, rise: p.rise }
    }
    report.push(row)
  }
  fs.writeFileSync(path.join(OUT, 'bisect.json'), JSON.stringify(report, null, 2))
  console.log('\nwrote', path.join(OUT, 'bisect.json'))
}
main().catch(e => { console.error(e); process.exit(1) })
