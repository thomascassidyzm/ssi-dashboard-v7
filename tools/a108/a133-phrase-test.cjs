// A-133 — THE PHRASE TEST: 5 DIFFERENT PHRASES PER VOICE, before/after.
//
// Tom ear-approved the tail-pad chain on the #946s samples and then asked for
// one more belt-and-braces pass before any bulk regen. His words set the shape:
// FIVE DIFFERENT PHRASES, before and after, PER VOICE — because the previous
// batch gave most voices one line each, and one line cannot tell you whether a
// voice is safe or whether that line happened to be easy.
//
// PRIORITY ORDER, HIS:
//   1. Dutch — every Dutch voice actually in use, including the female clicker.
//   2. His own cloned voice, and Olivia's.
//   3. A few xAI voices.
//
// WHICH VOICES ARE "IN USE" is read from the estate, not from memory. Every
// voice below was counted in course_audio for nld_for_eng (the only Dutch
// course) or is the named clone/xAI voice Tom asked for:
//   azure_nl-NL-FennaNeural 4,798 · azure_nl-NL-MaartenNeural 4,787 ·
//   xai 247783ebdd51 (Noor) 330 · xai a13662ba951c (Thijs) 285 ·
//   xai 58d27475085e (Femke) 159 · xai 244e27b39200 (Ruben) 46.
//
// THE PROVIDER FACT THAT KILLS THE EXPECTED GAP. Tom flagged that if his clone
// and Olivia live on ElevenLabs, that path is blocked by the key-ID credential
// in .env. They do not. The `voices` table says both are tts_engine='xai':
// gfzdpspr5fdp = "Tom" (en-GB male clone), bedd6226 = "Olivia" (en-GB female).
// So priority 2 renders for real. ElevenLabs stays untestable and is reported
// as a gap in its own right, not as a blocker on anything Tom asked for.
//
// SAME INSTRUMENT AS a133-chain-sample-batch.cjs, deliberately:
//   AFTER  = phase8.masterAudio(raw)                   <- the real wired chain
//   BEFORE = audioProcessor.normalizeAudioClean(raw)   <- the chain before this
//            branch, byte-identical
// Nothing is reimplemented here. If the wiring were wrong this tool would
// render untrimmed clips and say so; it has no way to fake a pass.
//
// EVERY CLIP IS A FRESH TTS CALL. No re-processing of an archived take.
//
// SPEND: 55 renders (11 voices x 5 phrases), roughly $0.003 each — well under
// twenty cents, far under the $20 cap. REUSE=1 re-masters existing raws free.
//
// TOUCHES NOTHING LIVE: no course_audio row, no pod, no S3 object, no DB write.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs'), path = require('path'), cp = require('child_process')
const ttsService = require('../../services/tts-service.cjs')
const audioProcessor = require('../../services/audio-processor.cjs')
const phase8 = require('../../services/phases/phase8-audio-v13.cjs')
const probe = require('./a133-tail-probe.cjs')

const { decode, envelope, endOfSpeech, postSpeechImpulses, roomFloorDb, SR } = probe
const OUT = process.argv[2] || '/tmp/a133-phrase-test'
// Shardable: several processes share OUT (clip dirs are uniquely keyed) and each
// writes its own results file, merged afterwards. 55 clips serial is 45 minutes.
const RESULTS = process.env.RESULTS || 'results.json'

// ── The five phrases, per language ───────────────────────────────────────────
// Course-length declaratives, each chosen for a DIFFERENT tail hazard, so five
// renders per voice probe five distinct ways the end-of-speech detector could
// be wrong rather than one line five times. A control sits in each set so a
// clean result on the hard ones is readable against something ordinary.
const PHRASES = {
  nl: [
    { id: 'p1', tail: 'CONTROL — the clicker reference line, /t/ after a fricative',
      text: 'Ik wil graag een glas bitter, alstublieft.' },
    { id: 'p2', tail: 'HARD — word-final voiceless plosive /p/, the burst the 40ms rule could mislabel',
      text: 'Ik denk dat het beter is als we nu even stoppen.' },
    { id: 'p3', tail: 'HARD — final /s/ into a stop, sibilant trail',
      text: 'Kun je me vertellen waar het station is, alsjeblieft?' },
    { id: 'p4', tail: 'HARD — quiet unstressed final schwa, no consonant to mark the end',
      text: 'Ik probeer dit nu al ongeveer drie maanden te leren.' },
    { id: 'p5', tail: 'HARD — Dutch final devoicing, /d/ surfacing as a weak /t/',
      text: 'Dat had ik echt nooit tegen hem gezegd.' },
  ],
  en: [
    { id: 'p1', tail: 'CONTROL — ordinary voiced declarative ending',
      text: "I've been trying to learn this for about three months now." },
    { id: 'p2', tail: 'HARD — word-final /p/ burst after an unstressed syllable',
      text: 'I think that after all of this we should probably just stop.' },
    { id: 'p3', tail: 'HARD — voiceless fricative /θ/, the quietest ending English has',
      text: 'By the end of it, what she said was barely more than a breath.' },
    { id: 'p4', tail: 'HARD — final sibilant cluster, high-frequency and low-energy',
      text: 'She told me the buses always leave from the other entrance.' },
    { id: 'p5', tail: 'HARD — final /t/ closing a /pt/ cluster',
      text: "I'd rather wait here until the rain has completely stopped." },
  ],
}

// ── The voices, in Tom's priority order ──────────────────────────────────────
const VOICES = [
  // 1 — DUTCH FIRST. Every Dutch voice with clips in nld_for_eng.
  { key: 'nld-noor', group: 'Dutch', lang: 'nl', provider: 'xai', voiceId: '247783ebdd51',
    name: 'Noor', note: 'xAI Dutch female — THE CLICKER (330 clips in nld_for_eng)' },
  { key: 'nld-femke', group: 'Dutch', lang: 'nl', provider: 'xai', voiceId: '58d27475085e',
    name: 'Femke', note: 'xAI Dutch female (159 clips)' },
  { key: 'nld-thijs', group: 'Dutch', lang: 'nl', provider: 'xai', voiceId: 'a13662ba951c',
    name: 'Thijs', note: 'xAI Dutch male (285 clips)' },
  { key: 'nld-ruben', group: 'Dutch', lang: 'nl', provider: 'xai', voiceId: '244e27b39200',
    name: 'Ruben', note: 'xAI Dutch male (46 clips)' },
  { key: 'nld-fenna', group: 'Dutch', lang: 'nl', provider: 'azure', voiceName: 'nl-NL-FennaNeural',
    name: 'Fenna', note: 'Azure Dutch female — the heaviest Dutch voice in the estate (4,798 clips)' },
  { key: 'nld-maarten', group: 'Dutch', lang: 'nl', provider: 'azure', voiceName: 'nl-NL-MaartenNeural',
    name: 'Maarten', note: 'Azure Dutch male (4,787 clips)' },

  // 2 — TOM'S OWN CLONE AND OLIVIA. Both xAI, per the voices table.
  { key: 'eng-tom', group: 'Your clone and Olivia', lang: 'en', provider: 'xai', voiceId: 'gfzdpspr5fdp',
    name: 'Tom — your own clone', note: "xAI clone, en-GB male — 1,500 clips in nld_for_eng alone, 325k estate-wide" },
  { key: 'eng-olivia', group: 'Your clone and Olivia', lang: 'en', provider: 'xai', voiceId: 'bedd6226',
    name: 'Olivia', note: 'xAI en-GB female — 150,237 clips estate-wide' },

  // 3 — A FEW MORE xAI VOICES.
  { key: 'eng-eve', group: 'Other xAI voices', lang: 'en', provider: 'xai', voiceId: 'eve',
    name: 'Eve', note: 'xAI English female — 162,906 clips' },
  { key: 'eng-leo', group: 'Other xAI voices', lang: 'en', provider: 'xai', voiceId: 'leo',
    name: 'Leo', note: 'xAI English male — 90,044 clips' },
  { key: 'eng-sal', group: 'Other xAI voices', lang: 'en', provider: 'xai', voiceId: 'sal',
    name: 'Sal', note: 'xAI English — 91 clips in nld_for_eng' },
]

// ── Rendering ────────────────────────────────────────────────────────────────
async function render(v, text) {
  if (v.provider === 'azure') {
    return (await ttsService.generateWithRetry(text, 'azure', {
      subscriptionKey: process.env.AZURE_SPEECH_KEY,
      region: process.env.AZURE_SPEECH_REGION,
      voiceName: v.voiceName,
    })).audioBuffer
  }
  if (v.provider === 'elevenlabs') {
    return (await ttsService.generateWithRetry(text, 'elevenlabs', {
      apiKey: process.env.ELEVENLABS_API_KEY, voiceId: v.voiceId,
    })).audioBuffer
  }
  return (await ttsService.generateWithRetry(text, 'xai', {
    apiKey: process.env.XAI_API_KEY, voiceId: v.voiceId, language: v.lang,
  })).audioBuffer
}

// ── Measurement ──────────────────────────────────────────────────────────────
function lufs(file) {
  const out = cp.execSync(`ffmpeg -i "${file}" -af ebur128=framelog=quiet -f null - 2>&1 || true`,
    { maxBuffer: 1 << 26, shell: '/bin/bash' }).toString()
  const m = (out.match(/I:\s*(-?[\d.]+)\s*LUFS/g) || []).pop()
  return m ? parseFloat(m.match(/(-?[\d.]+)/)[1]) : NaN
}

function measure(file) {
  const { s, n, peak } = decode(file)
  const env = envelope(s, n, peak)
  const eos = endOfSpeech(env) ?? n
  const room = roomFloorDb(s, n, peak, eos)
  return {
    durationMs: Math.round(n / SR * 1000),
    eosMs: Math.round(eos / SR * 1000),
    postEosMs: Math.round((n - eos) / SR * 1000),
    roomFloorDb: +room.toFixed(1),
    impulses: postSpeechImpulses(env, eos, room)
      .map(i => ({ startMs: +i.startMs.toFixed(0), peakDb: +i.peakDb.toFixed(1), overFloorDb: +i.overFloorDb.toFixed(1) })),
    lufs: +lufs(file).toFixed(1),
  }
}

// INDEPENDENT ASR — a different instrument from the trim's own arithmetic,
// answering the only question that matters: is the last word still there?
// Local whisper, no spend. A missing binary is a reported gap, never a pass.
const WHISPER = `${process.env.HOME}/.local/bin/whisper-cli`
const WHISPER_MODEL = `${process.env.HOME}/.local/share/whisper-models/ggml-medium.bin`
function transcribe(file, langHint) {
  if (!fs.existsSync(WHISPER) || !fs.existsSync(WHISPER_MODEL)) return { gap: 'whisper-cli or model absent — ASR check NOT run' }
  try {
    const wav = file.replace(/\.mp3$/, '.asr.wav')
    cp.execSync(`ffmpeg -v quiet -y -i "${file}" -ar 16000 -ac 1 "${wav}"`, { shell: '/bin/bash' })
    const out = cp.execSync(`"${WHISPER}" -m "${WHISPER_MODEL}" -f "${wav}" -l ${langHint} -nt -np 2>/dev/null || true`,
      { maxBuffer: 1 << 26, shell: '/bin/bash' }).toString().trim()
    fs.unlinkSync(wav)
    return { text: out.replace(/\s+/g, ' ').trim() }
  } catch (e) {
    return { gap: `ASR failed (${e.message})` }
  }
}

// DIFFERENTIAL ASR — read the BEFORE clip and the AFTER clip, and compare them
// to each other rather than each to the script. The absolute check cries wolf:
// on the very first smoke render Ruben said "alsjeblieft" where the script says
// "alstublieft", and whisper is documented to flip that exact Dutch pair between
// model sizes on the SAME clip. That is the voice's register, not a truncation,
// and an absolute check calls it a missing word. What the trim can actually do
// wrong is REMOVE something — so the question that matters is whether the after
// transcript still ends the way the before transcript did. `scriptOk` is kept
// alongside as information, never as the verdict.
function finalWordCheck(text, beforeAsr, afterAsr) {
  if (beforeAsr.gap || afterAsr.gap) return { ok: null, note: beforeAsr.gap || afterAsr.gap }
  const norm = t => t.toLowerCase().replace(/[.,!?;:'"«»]/g, '').trim()
  const lastOf = t => { const w = norm(t).split(/\s+/); return w[w.length - 1] }
  const scriptLast = lastOf(text), beforeLast = lastOf(beforeAsr.text)
  return {
    ok: norm(afterAsr.text).split(/\s+/).includes(beforeLast), // survived the trim
    unit: beforeLast,
    scriptOk: norm(afterAsr.text).split(/\s+/).includes(scriptLast),
    scriptWord: scriptLast,
    heardBefore: beforeAsr.text,
    heardAfter: afterAsr.text,
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const onlyVoice = process.env.ONLY_VOICE ? process.env.ONLY_VOICE.split(',') : null
  const results = []

  for (const v of VOICES) {
    if (onlyVoice && !onlyVoice.includes(v.key)) continue
    console.log(`\n######## ${v.name} — ${v.note}`)
    for (const p of PHRASES[v.lang]) {
      const key = `${v.key}-${p.id}`
      const dir = path.join(OUT, key)
      fs.mkdirSync(dir, { recursive: true })
      const rawFile = path.join(dir, 'raw.mp3')
      try {
        if (process.env.REUSE === '1' && fs.existsSync(rawFile)) console.log(`[reuse] ${key}`)
        else fs.writeFileSync(rawFile, await render(v, p.text))
        const rawBuf = fs.readFileSync(rawFile)

        const beforeFile = path.join(dir, `${key}-before.mp3`)
        await audioProcessor.normalizeAudioClean(rawFile, beforeFile, -16.0)

        const afterFile = path.join(dir, `${key}-after.mp3`)
        const mastered = await phase8.masterAudio(rawBuf, p.text)
        fs.writeFileSync(afterFile, mastered.buffer)

        // What the guard actually decided — asked of the same function the chain
        // calls, on the same bytes. Reported, not inferred from the durations.
        const plan = await audioProcessor.trimToEndOfSpeech(rawFile, path.join(dir, 'plan.wav'))
        if (fs.existsSync(path.join(dir, 'plan.wav'))) fs.unlinkSync(path.join(dir, 'plan.wav'))

        const row = {
          key, voiceKey: v.key, voice: v.name, group: v.group, note: v.note,
          provider: v.provider, voiceId: v.voiceId || v.voiceName,
          phraseId: p.id, tail: p.tail, text: p.text,
          guard: { refused: plan.refused, trimmed: plan.trimmed, removedMs: plan.removedMs, eosMs: plan.eosMs },
          before: measure(beforeFile), after: measure(afterFile),
          finalWord: finalWordCheck(p.text, transcribe(beforeFile, v.lang), transcribe(afterFile, v.lang)),
        }
        row.deltaMs = row.before.durationMs - row.after.durationMs
        results.push(row)
        console.log(`  ${key}  ${plan.refused ? `GUARD REFUSED: ${plan.refused}` : `-${row.deltaMs}ms`}  ` +
          `before ${row.before.durationMs}ms/${row.before.impulses.length}imp  after ${row.after.durationMs}ms/${row.after.impulses.length}imp  ` +
          `${row.after.lufs}LUFS  final word ${row.finalWord.ok === null ? 'NOT CHECKED' : row.finalWord.ok ? 'survives' : `LOST (before "${row.finalWord.heardBefore}" / after "${row.finalWord.heardAfter}")`}`)
      } catch (e) {
        console.error(`  !! ${key} FAILED: ${e.message}`)
        results.push({ key, voiceKey: v.key, voice: v.name, group: v.group, provider: v.provider,
          phraseId: p.id, tail: p.tail, text: p.text, error: e.message })
      }
      fs.writeFileSync(path.join(OUT, RESULTS), JSON.stringify(results, null, 2))
    }
  }
  console.log(`\nwrote ${OUT}/${RESULTS}  (${results.length} rows)`)
}

if (require.main === module) main().catch(e => { console.error(e.stack || e.message); process.exit(1) })
module.exports = { VOICES, PHRASES }
