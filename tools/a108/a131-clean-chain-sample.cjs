// A-131 clean-chain ear sample — render the Dutch pod line on the cast voice and
// master it through the LIVE production path (phase8's masterAudio), which as of
// 2026-08-17 is the compressor-free chain. What Tom hears here is literally what
// would ship.
//
// Also keeps the RAW provider buffer and reports the tail floor of both, measured
// exactly as the 2026-08-17 diagnosis doc did: median of 2ms peak windows over the
// last 400-150ms, in dB relative to the clip's own speech peak.
//
// SUBTRACTION ONLY. No trim, no pad, no de-click, no repair. Nothing is written to
// S3 and nothing touches a live row: the outputs are local files for a listening
// doc.
//
// Spend: 1-3 renders x 42 chars on the xAI path ≈ $0.002. Pre-authorised for
// A-131 only (brief, 2026-08-17).
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs'), path = require('path'), cp = require('child_process')
const ttsService = require('../../services/tts-service.cjs')
const phase8 = require('../../services/phases/phase8-audio-v13.cjs')

const TEXT = 'Ik wil graag een glas bitter, alstublieft.'
const VOICE = '247783ebdd51'   // xai_247783ebdd51, the nld_for_eng pod cast voice
const LANG = 'nl'
const TAKES = Number(process.env.TAKES || 1)
const OUT = process.argv[2] || '/tmp/a131/clean'

// Tail floor: median of 2ms window peaks over [-400ms, -150ms], dB rel. clip peak.
function tailFloorDb(file) {
  const pcm = cp.execSync(
    `ffmpeg -v quiet -i "${file}" -ac 1 -ar 44100 -f s16le - `,
    { maxBuffer: 1 << 28, shell: '/bin/bash' }
  )
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

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  for (let i = 1; i <= TAKES; i++) {
    const { audioBuffer } = await ttsService.generateWithRetry(TEXT, 'xai', {
      apiKey: process.env.XAI_API_KEY, voiceId: VOICE, language: LANG,
    })
    const raw = path.join(OUT, `take${i}-raw.mp3`)
    fs.writeFileSync(raw, audioBuffer)
    // The live production mastering step — compressor-free as of 2026-08-17.
    const { buffer, durationMs } = await phase8.masterAudio(audioBuffer, TEXT)
    const out = path.join(OUT, `take${i}-new-chain.mp3`)
    fs.writeFileSync(out, buffer)
    console.log(`take ${i}: raw ${audioBuffer.length}B tail ${tailFloorDb(raw).toFixed(1)}dB-rel-peak` +
      ` → new-chain ${buffer.length}B ${durationMs}ms tail ${tailFloorDb(out).toFixed(1)}dB-rel-peak`)
  }
  console.log('wrote', OUT)
}
main().catch(e => { console.error(e.stack || e.message); process.exit(1) })
