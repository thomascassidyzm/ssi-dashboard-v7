/**
 * chunked-take/01-synth-ssml.cjs — generate the SSML <break>-chunked takes.
 *
 * STRATEGY: instead of cutting a continuous natural take at atom boundaries and
 * inserting silence (the prior "fusion ladder" approach, which sounded choppy
 * because the voice coarticulated each word into the next), we make the voice
 * itself close and reopen each prosodic unit by inserting <break time="Xms"/> at
 * every atom seam in the SSML. The KEY question this answers empirically: does
 * the Azure neural voice produce clean phrase-final prosody before each break
 * (the win), or does it just drop silence into otherwise-coarticulated speech?
 *
 * We use the SAME Azure voice that produced the existing pod clip (voice_id from
 * course_audio) — ga-IE-ColmNeural (Irish) / hr-HR-SreckoNeural (Croatian).
 *
 * Output (raw 48kHz mono PCM-from-MP3, native rate of the stored clips):
 *   raw/<course>-g3-ssml-break450.mp3        generous 450ms breaks, normal rate
 *   raw/<course>-g3-ssml-break450-slow.mp3   same, <prosody rate="-15%">
 *   raw/<course>-g3-ssml-continuous.mp3      no breaks — coarticulation control
 *   data/synth.json                          word boundaries + atom-break map per take
 *
 * TTS SPEND: 6 Azure calls (2 courses x {break, slow-break, continuous}).
 * Approved diagnostic budget is 12; this uses 6. No DB writes, no S3 writes.
 *
 * We call the Azure Speech SDK DIRECTLY with speakSsmlAsync (not
 * services/tts-service.cjs, which escapes XML and would mangle our <break> tags).
 */

const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const REPO = path.resolve(__dirname, '..', '..', '..')
require('dotenv').config({ path: path.join(REPO, '.env') })

const sdk = require('microsoft-cognitiveservices-speech-sdk')

const SPIKE_DIR = __dirname
const RAW_DIR = path.join(SPIKE_DIR, 'raw')
const DATA_DIR = path.join(SPIKE_DIR, 'data')
// reuse the already-fetched test data from the sibling spike (read-only)
const FETCHED = path.join(SPIKE_DIR, '..', 'atom-fusion-spike', 'data', 'sentences.json')

const BREAK_MS = 450 // generous break at each atom seam

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Build chunked SSML. Atoms tile the sentence; we emit each atom's text followed
 * by a <break>. Where the atom text itself ends at sentence punctuation (the
 * target_text has "." or "?"), that punctuation is preserved inside the atom so
 * the voice still hears the sentence boundary — the <break> is ADDITIONAL.
 *
 * We reconstruct each atom's surface form (with its punctuation) by walking the
 * target_text and consuming atom tokens in order, so "go raibh maith agat." keeps
 * its period and "oibre?" keeps its question mark.
 */
function buildChunkedSsml(voice, atoms, targetText, { breakMs, rate }) {
  // Map each atom onto its slice of target_text (atoms tile it, modulo
  // punctuation/whitespace). Greedy forward match on normalized letters.
  const norm = (s) => s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
  const surfaces = []
  let cursor = 0
  for (const atom of atoms) {
    const want = norm(atom)
    // advance until the normalized text from `cursor` starts with `want`
    let start = cursor
    // skip leading separators
    while (start < targetText.length && norm(targetText[start]) === '') start++
    let end = start
    let acc = ''
    while (end < targetText.length && acc.length < want.length) {
      const ch = targetText[end]
      if (norm(ch) !== '') acc += norm(ch)
      end++
    }
    // include a trailing punctuation char (.,?!) if it immediately follows
    while (end < targetText.length && /[.,?!…]/.test(targetText[end])) end++
    surfaces.push(targetText.slice(start, end).trim())
    cursor = end
  }
  // any tail (rare) gets appended to the last surface
  const tail = targetText.slice(cursor).trim()
  if (tail) surfaces[surfaces.length - 1] += ' ' + tail

  const breakTag = breakMs > 0 ? `<break time="${breakMs}ms"/>` : ''
  const inner = surfaces
    .map((s, i) => escapeXml(s) + (i < surfaces.length - 1 ? breakTag : ''))
    .join(' ')
  const body = rate ? `<prosody rate="${rate}">${inner}</prosody>` : inner

  return {
    surfaces,
    ssml:
      `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" ` +
      `xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">` +
      `<voice name="${voice}">${body}</voice></speak>`,
  }
}

function buildContinuousSsml(voice, targetText, { rate }) {
  const inner = escapeXml(targetText)
  const body = rate ? `<prosody rate="${rate}">${inner}</prosody>` : inner
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" ` +
    `xml:lang="en-US"><voice name="${voice}">${body}</voice></speak>`
  )
}

function synth(ssml) {
  return new Promise((resolve, reject) => {
    const cfg = sdk.SpeechConfig.fromSubscription(
      (process.env.AZURE_SPEECH_KEY || '').trim(),
      (process.env.AZURE_SPEECH_REGION || 'westeurope').trim(),
    )
    // Native 48kHz mono MP3 — matches the stored pod clips' sample rate so the
    // chunked take and the natural take A/B at the same fidelity.
    cfg.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio48Khz96KBitRateMonoMp3
    const synthesizer = new sdk.SpeechSynthesizer(cfg, null)
    const wordBoundaries = []
    synthesizer.wordBoundary = (_, e) => {
      wordBoundaries.push({
        text: e.text,
        offset: Math.round(e.audioOffset / 10000),
        duration: Math.round(e.duration / 10000),
        boundaryType: e.boundaryType,
      })
    }
    synthesizer.speakSsmlAsync(
      ssml,
      (result) => {
        synthesizer.close()
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          resolve({ audioBuffer: Buffer.from(result.audioData), wordBoundaries })
        } else {
          reject(new Error(`Azure failed: ${result.errorDetails || result.reason}`))
        }
      },
      (err) => {
        synthesizer.close()
        reject(new Error(`Azure error: ${err}`))
      },
    )
  })
}

async function main() {
  fs.mkdirSync(RAW_DIR, { recursive: true })
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const all = JSON.parse(fs.readFileSync(FETCHED, 'utf8'))
  const tests = all.filter((s) => s.global_order === 3) // gle g3 + hrv g3

  const out = []
  let calls = 0

  for (const s of tests) {
    const voice = s.audio.voice_id
    const atoms = s.atoms.map((a) => a.target)
    console.log(`\n=== ${s.course} g${s.global_order} | voice=${voice} ===`)
    console.log(`  target: ${s.target_text}`)
    console.log(`  atoms : ${atoms.map((a) => `[${a}]`).join(' ')}`)

    // (1) generous break, normal rate
    const b = buildChunkedSsml(voice, atoms, s.target_text, { breakMs: BREAK_MS })
    console.log(`  surfaces: ${b.surfaces.map((x) => `«${x}»`).join(' ')}`)
    const r1 = await synth(b.ssml)
    calls++
    const f1 = path.join(RAW_DIR, `${s.course}-g3-ssml-break${BREAK_MS}.mp3`)
    fs.writeFileSync(f1, r1.audioBuffer)
    console.log(`  [break${BREAK_MS}] ${r1.audioBuffer.length} bytes, ${r1.wordBoundaries.length} boundary events`)

    // (2) generous break, slower rate -15%
    const bSlow = buildChunkedSsml(voice, atoms, s.target_text, { breakMs: BREAK_MS, rate: '-15%' })
    const r2 = await synth(bSlow.ssml)
    calls++
    const f2 = path.join(RAW_DIR, `${s.course}-g3-ssml-break${BREAK_MS}-slow.mp3`)
    fs.writeFileSync(f2, r2.audioBuffer)
    console.log(`  [break${BREAK_MS}-slow] ${r2.audioBuffer.length} bytes, ${r2.wordBoundaries.length} boundary events`)

    // (3) continuous control (no breaks) — to compare coarticulation
    const cont = buildContinuousSsml(voice, s.target_text, {})
    const r3 = await synth(cont)
    calls++
    const f3 = path.join(RAW_DIR, `${s.course}-g3-ssml-continuous.mp3`)
    fs.writeFileSync(f3, r3.audioBuffer)
    console.log(`  [continuous] ${r3.audioBuffer.length} bytes, ${r3.wordBoundaries.length} boundary events`)

    out.push({
      course: s.course,
      global_order: s.global_order,
      voice,
      target_text: s.target_text,
      atoms,
      break_ms: BREAK_MS,
      surfaces: b.surfaces,
      ssml_break: b.ssml,
      ssml_slow: bSlow.ssml,
      ssml_continuous: cont,
      takes: {
        break: {
          path: f1,
          sha256: crypto.createHash('sha256').update(r1.audioBuffer).digest('hex'),
          word_boundaries: r1.wordBoundaries,
        },
        break_slow: {
          path: f2,
          sha256: crypto.createHash('sha256').update(r2.audioBuffer).digest('hex'),
          word_boundaries: r2.wordBoundaries,
        },
        continuous: {
          path: f3,
          sha256: crypto.createHash('sha256').update(r3.audioBuffer).digest('hex'),
          word_boundaries: r3.wordBoundaries,
        },
      },
    })
  }

  fs.writeFileSync(path.join(DATA_DIR, 'synth.json'), JSON.stringify(out, null, 2))
  console.log(`\nwrote data/synth.json (${calls} Azure calls used; budget 12)`)
}

main().catch((e) => {
  console.error('synth failed:', e.message)
  process.exit(1)
})
