// A-133 per-voice raw-tail screen — casting-time triage for T-21.
//
// Tom, 2026-08-17: "I think the trick is to not use voices that generate clicks
// right?" This is that trick, made cheap: one short RAW render per candidate
// voice, ZERO processing of ours on it, one number, one verdict. A clicking
// voice caught before casting costs one render; caught after casting it costs a
// whole language's audio.
//
// THE SIGNAL, and where it comes from. The A-133 probe measured four Dutch
// voices on the same line (docs/a108/a133-end-of-speech-tail-2026-08-17.md).
// Every clip's tail was read as an envelope of 5ms window peaks in dB relative
// to that clip's own speech peak, above-threshold windows were grouped into
// events, and events were split into SPEECH (>=40ms of energy) and IMPULSE
// (less). The discriminator is what sits AFTER the last speech event:
//
//   xai_247783ebdd51 (Noor) — the voice Tom's blind test heard a click on:
//       two impulses, -24.8dB and -26.7dB, +41.7dB and +39.8dB over its floor
//   xai 58d27475085e (Femke)          none
//   xai a13662ba951c (Thijs)          none
//   azure nl-NL-FennaNeural           none
//
// So on the evidence available the separation is not marginal — it is roughly
// 40dB against nothing at all. The threshold below sits at +20dB over floor,
// halfway down that gap in dB terms, which is a long way clear of both sides.
//
// HOW CONFIDENT TO BE. Not very, and deliberately so. This is n=1 known-positive
// and n=3 known-negatives, one line, one language. It screens the OBVIOUS case —
// a voice that fires a loud impulse into dead air — and it WILL miss marginal
// ones: a quiet click a few dB over floor, a click that lands during speech
// rather than after it, or a voice that only clicks on some lines. The estate has
// been burned once by a tail detector that was 9% precise (flagTailDefect), so
// the verdicts here are 'pass' and 'suspect', never 'clean' and 'broken', and a
// suspect verdict means "a human listens", not "reject the voice".
//
// SAFETY. Read-only. Renders, measures, prints. Writes nothing but its own JSON
// report and, optionally, the raw mp3s for a human to listen to. It never
// modifies audio, never touches course_audio / listening_pods / S3, and is not
// wired into any render path.
//
// COST. One render per voice, ~2-3s of speech each: ~$0.002 per voice on xAI,
// less on Azure. A full T-21 sweep is ~250 voices ≈ $0.50 and, at the default
// concurrency of 4, roughly 10-15 minutes of wall clock. THAT SWEEP IS NOT
// AUTHORISED BY THIS FILE — it is bulk rendering and it is Tom's call.
//
// Usage:
//   node tools/a108/a133-voice-tail-screen.cjs voices.json [outdir]
//   where voices.json is [{ key, provider:'xai'|'azure', voiceId|voiceName,
//                           lang, text }]
//   Or with no argument: screens the four A-133 validation voices (known
//   positive + three known negatives) to prove the shape still separates.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs'), path = require('path')
const ttsService = require('../../services/tts-service.cjs')
const { decode, envelope, events, endOfSpeech, roomFloorDb, SR } = require('./a133-tail-probe.cjs')

// An impulse this far over the room floor it interrupts makes the voice a
// suspect. See the header for how the number was chosen and how thin the
// evidence under it is.
const SUSPECT_OVER_FLOOR_DB = 20
const CONCURRENCY = Number(process.env.CONCURRENCY || 4)
const KEEP_RAW = process.env.KEEP_RAW !== '0'

const NL = 'Ik wil graag een glas bitter, alstublieft.'
const VALIDATION = [
  { key: 'xai_247783ebdd51', provider: 'xai', voiceId: '247783ebdd51', lang: 'nl', text: NL, expect: 'suspect' },
  { key: 'xai_58d27475085e', provider: 'xai', voiceId: '58d27475085e', lang: 'nl', text: NL, expect: 'pass' },
  { key: 'xai_a13662ba951c', provider: 'xai', voiceId: 'a13662ba951c', lang: 'nl', text: NL, expect: 'pass' },
  { key: 'azure_nl-NL-FennaNeural', provider: 'azure', voiceName: 'nl-NL-FennaNeural', text: NL, expect: 'pass' },
]

async function render(v) {
  if (v.provider === 'azure') {
    return (await ttsService.generateWithRetry(v.text, 'azure', {
      subscriptionKey: process.env.AZURE_SPEECH_KEY,
      region: process.env.AZURE_SPEECH_REGION,
      voiceName: v.voiceName || v.voiceId,
    })).audioBuffer
  }
  return (await ttsService.generateWithRetry(v.text, 'xai', {
    apiKey: process.env.XAI_API_KEY, voiceId: v.voiceId, language: v.lang,
  })).audioBuffer
}

// Screen ONE voice from its raw provider bytes. No processing of ours is applied
// first — the point is to judge the voice, not our chain.
function screenFile(file) {
  const { s, n, peak } = decode(file)
  const env = envelope(s, n, peak)
  const eos = endOfSpeech(env)
  if (eos === null) {
    return { verdict: 'unreadable', reason: 'no sustained speech detected — render or voice failed', impulses: [] }
  }
  const floor = roomFloorDb(s, n, peak, eos)
  const impulses = events(env)
    .filter(e => e.kind === 'impulse' && e.start >= eos)
    .map(e => ({
      atMs: Math.round(e.start / SR * 1000),
      msAfterSpeech: Math.round((e.start - eos) / SR * 1000),
      ms: Math.round(e.ms),
      peakDb: +e.peakDb.toFixed(1),
      overFloorDb: +(e.peakDb - floor).toFixed(1),
    }))
  const worst = impulses.reduce((a, b) => (a && a.overFloorDb >= b.overFloorDb ? a : b), null)
  return {
    verdict: worst && worst.overFloorDb >= SUSPECT_OVER_FLOOR_DB ? 'suspect' : 'pass',
    durationMs: Math.round(n / SR * 1000),
    endOfSpeechMs: Math.round(eos / SR * 1000),
    postSpeechMs: Math.round((n - eos) / SR * 1000),
    roomFloorDb: +floor.toFixed(1),
    worstOverFloorDb: worst ? worst.overFloorDb : null,
    impulses,
    reason: worst
      ? `${impulses.length} post-speech impulse(s); worst ${worst.peakDb}dB, +${worst.overFloorDb}dB over the ${floor.toFixed(1)}dB room floor, ${worst.msAfterSpeech}ms after speech ends`
      : `no post-speech impulses above the ${floor.toFixed(1)}dB room floor`,
  }
}

async function pool(items, n, fn) {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k) }
  }))
  return out
}

async function main() {
  const spec = process.argv[2]
  const outDir = process.argv[3] || '/tmp/a133-screen'
  const voices = spec ? JSON.parse(fs.readFileSync(spec, 'utf8')) : VALIDATION
  fs.mkdirSync(outDir, { recursive: true })
  console.log(`screening ${voices.length} voice(s) — one raw render each, no processing applied`)

  const rows = await pool(voices, CONCURRENCY, async (v) => {
    const file = path.join(outDir, `${v.key}.mp3`)
    try {
      if (!fs.existsSync(file)) fs.writeFileSync(file, await render(v))
      const r = screenFile(file)
      if (!KEEP_RAW) fs.unlinkSync(file)
      return { ...v, ...r, file: KEEP_RAW ? file : null }
    } catch (e) {
      return { ...v, verdict: 'error', reason: e.message, impulses: [] }
    }
  })

  for (const r of rows) {
    const mark = r.expect ? (r.expect === r.verdict ? ' ✓expected' : ` ✗EXPECTED ${r.expect}`) : ''
    console.log(`${r.verdict.toUpperCase().padEnd(10)} ${r.key.padEnd(26)} ${r.reason}${mark}`)
  }
  const suspects = rows.filter(r => r.verdict === 'suspect')
  console.log(`\n${suspects.length}/${rows.length} suspect — a suspect is "a human listens before this voice is cast", never an automatic reject.`)
  fs.writeFileSync(path.join(outDir, 'screen.json'), JSON.stringify(rows, null, 2))
  console.log(`wrote ${outDir}/screen.json`)
  if (rows.some(r => r.expect && r.expect !== r.verdict)) process.exitCode = 1
}

module.exports = { screenFile, SUSPECT_OVER_FLOOR_DB }
if (require.main === module) main().catch(e => { console.error(e.stack || e.message); process.exit(1) })
