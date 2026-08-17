// A-131 ear sample — render the Dutch pod line on the cast voice, keep the RAW
// provider buffer, and master it TWO ways so Tom can hear the difference:
//   A. current chain  — normalizeAudio()      (compressor + limiter + fades)
//   B. compressor out — normalizeAudioClean() (limiter + fades only)
//
// SUBTRACTION ONLY. No trim, no pad, no de-click, no repair. Nothing is written
// to S3 and nothing touches a live row: the outputs are local files for a
// listening doc.
//
// Spend: 3 renders x 42 chars on the xAI path ≈ $0.002. Pre-authorised for
// A-131 only (brief, 2026-08-17).
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs'), os = require('os'), path = require('path')
const ttsService = require('../../services/tts-service.cjs')
const ap = require('../../services/audio-processor.cjs')

const TEXT = 'Ik wil graag een glas bitter, alstublieft.'
const VOICE = '247783ebdd51'   // xai_247783ebdd51, the nld_for_eng pod cast voice
const LANG = 'nl'
const TAKES = Number(process.env.TAKES || 3)
const OUT = process.argv[2] || '/tmp/a131/ear'

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  for (let i = 1; i <= TAKES; i++) {
    const { audioBuffer } = await ttsService.generateWithRetry(TEXT, 'xai', {
      apiKey: process.env.XAI_API_KEY, voiceId: VOICE, language: LANG,
    })
    const raw = path.join(OUT, `take${i}-raw.mp3`)
    fs.writeFileSync(raw, audioBuffer)
    const a = path.join(OUT, `take${i}-A-current-chain.mp3`)
    const b = path.join(OUT, `take${i}-B-compressor-removed.mp3`)
    await ap.normalizeAudio(raw, a, -16.0)
    const clean = await ap.normalizeAudioClean(raw, b, -16.0)
    console.log(`take ${i}: raw ${audioBuffer.length}B → A ${fs.statSync(a).size}B, B ${fs.statSync(b).size}B (clean LUFS in ${clean.inputLUFS} out ${clean.outputLUFS})`)
  }
  console.log('wrote', OUT)
}
main().catch(e => { console.error(e.stack || e.message); process.exit(1) })
