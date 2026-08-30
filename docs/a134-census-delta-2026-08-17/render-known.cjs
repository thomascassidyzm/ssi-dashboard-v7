// A-134 census delta — render the repaired KNOWN/prompt clips.
// Nothing reaches S3 or the DB here: render, master on the compressor-free chain
// (normalizeAudioClean), gate locally. Passing takes land in ship/, EVERY take in spares/.
process.env.PHASE8_NO_LISTEN = '1'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs'), path = require('path'), crypto = require('crypto')
const ttsService = require('../../services/tts-service.cjs')
const phase8 = require('../../services/phases/phase8-audio-v13.cjs')
const { runGates } = require('./gates-known.cjs')

const SHIP = path.join(__dirname, 'ship'), SPARE = path.join(__dirname, 'spares')
const MAX_ATTEMPTS = 3
const VOICE = { voiceId: 'si-LK-SameeraNeural', speed: 1 }

async function renderOnce(text, attempt) {
  const { audioBuffer, wordBoundaries } = await ttsService.generateWithRetry(text, 'azure', {
    subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION,
    voiceName: VOICE.voiceId, speed: VOICE.speed, regenerationAttempt: attempt })
  const { buffer, durationMs } = await phase8.masterAudio(audioBuffer, text)
  return { buffer, durationMs, wordBoundaries }
}

async function main() {
  fs.mkdirSync(SHIP, { recursive: true }); fs.mkdirSync(SPARE, { recursive: true })
  const work = require('./render-plan.json')
  console.log(`${work.length} distinct texts to render`)
  const log = []
  for (const w of work) {
    let shipped = null, attempts = []
    for (let a = 1; a <= MAX_ATTEMPTS; a++) {
      console.log(`\n${w.slug} attempt ${a}: ${JSON.stringify(w.text)}`)
      const { buffer, durationMs, wordBoundaries } = await renderOnce(w.text, a - 1)
      const f = path.join(SPARE, `${w.slug}-attempt${a}.mp3`)
      fs.writeFileSync(f, buffer)
      const g = runGates({}, w.text, wordBoundaries, durationMs, f)
      attempts.push({ attempt: a, fail: g.fail, ms: durationMs, z: g.z, tail: g.tail })
      console.log(`  ms=${durationMs} z=${g.z.toFixed(2)} tail=${g.tail?.toFixed(1)}dB tokens=${g.tokens} fail=${JSON.stringify(g.fail)}`)
      if (!g.fail.length) { shipped = { f, buffer, durationMs, wordBoundaries, g, attempt: a }; break }
      console.log(`  FAILED — re-rendering (spare kept)`)
    }
    if (shipped) {
      const dest = path.join(SHIP, `${w.slug}.mp3`)
      fs.copyFileSync(shipped.f, dest)
      log.push({ ...w, file: dest, bytes: shipped.buffer.length, ms: shipped.durationMs,
        md5: crypto.createHash('md5').update(shipped.buffer).digest('hex'),
        word_boundaries: shipped.wordBoundaries, z: shipped.g.z, tail: shipped.g.tail,
        tokens: shipped.g.tokens, attempt: shipped.attempt, total_attempts: attempts.length, fail: [] })
    } else {
      console.error(`\n${w.slug}: NO PASSING TAKE after ${MAX_ATTEMPTS}`)
      log.push({ ...w, file: null, shipped: false, all_attempts: attempts })
    }
  }
  fs.writeFileSync(path.join(__dirname, 'ship-log.json'), JSON.stringify(log, null, 1))
  console.log(`\n${log.filter(r => r.file).length}/${work.length} passing. ship-log.json written.`)
}
main().catch(e => { console.error('ABORT:', e.stack || e.message); process.exit(1) })
