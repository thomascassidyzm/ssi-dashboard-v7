// A-133 — SAMPLE BATCH THROUGH THE REAL CHAIN, before any bulk regen.
//
// Tom ruled on 2026-08-17 that the 250ms end-of-speech tail becomes universal
// in the Phase 8 render chain. Per the sample-first policy, this renders ~20
// clips through the NOW-WIRED chain and puts them in front of his ears before a
// single course is regenerated.
//
// WHAT IS DIFFERENT FROM a133-tail-probe.cjs AND a133-money-voice-samples.cjs.
// Those two were standalone: they reimplemented the trim in the tool and fed a
// pre-trimmed WAV to masterAudio. This one calls masterAudio and NOTHING ELSE.
// The trim under test is the one that lives in
// services/audio-processor.cjs::trimToEndOfSpeech, called from
// phase8-audio-v13.cjs::masterAudio. If the wiring is wrong, this tool renders
// untrimmed clips and says so — it has no way to fake a pass.
//
//   AFTER  = phase8.masterAudio(raw)                      <- the new chain
//   BEFORE = audioProcessor.normalizeAudioClean(raw)      <- the old chain,
//            byte-identical to what masterAudio did before this branch (the
//            other two steps it does, flagTailDefect and getAudioMetadata, are
//            both read-only and alter nothing).
//
// SAMPLE SELECTION. Diversity is the point, not coverage:
//   - three providers: xAI, Azure, ElevenLabs (all three phase8 can call);
//   - the known clicker voice (xai_247783ebdd51, nld_for_eng pod-0 cast);
//   - DELIBERATELY HARD TAILS. The one thing the detector could get wrong is
//     documented in audio-processor.cjs: a word-final plosive burst can be
//     shorter than the 40ms sustained-speech rule and so read as an impulse.
//     So this batch is loaded with the endings most likely to break it —
//     word-final voiceless plosives, voiceless fricatives, sibilants, German
//     final devoicing, Japanese devoiced final vowels, quiet unstressed final
//     vowels, and the Welsh voiceless lateral — plus ordinary declaratives as
//     controls. Every line is course-length, because a fragment gives the ear
//     nothing to judge a tail against.
//
// EVIDENCE PER SAMPLE: before/after duration, ms removed, whether a guard
// refused and which, the post-speech impulses present in each take, LUFS, and
// an INDEPENDENT ASR read of the after-clip's final word. That last one is a
// genuinely different instrument from the trim's own arithmetic: the 2026-08-05
// German incident was invisible to every physical probe and visible only to ASR.
//
// SPEND: ~20 short renders, roughly $0.002 each — single-figure cents, far under
// the $20 cap, pre-authorised for A-133's sample batch only. REUSE=1 re-masters
// existing raws with no spend at all.
//
// TOUCHES NOTHING LIVE: no course_audio row, no pod, no S3 object, no DB write.
// Local files for one published listening doc.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs'), path = require('path'), cp = require('child_process')
const ttsService = require('../../services/tts-service.cjs')
const audioProcessor = require('../../services/audio-processor.cjs')
const phase8 = require('../../services/phases/phase8-audio-v13.cjs')
const probe = require('./a133-tail-probe.cjs')

const { decode, envelope, events, endOfSpeech, postSpeechImpulses, roomFloorDb, SR } = probe
const OUT = process.argv[2] || '/tmp/a133-batch'

// ── The batch ────────────────────────────────────────────────────────────────
// `tail` names the phonetic hazard each line is chosen to exercise. `control`
// marks the ordinary endings that tell us the hard cases are not just noise.
const SAMPLES = [
  // ── xAI, including the one voice with a proven defect ──────────────────────
  { key: '01-nld-clicker-reference', provider: 'xai', voiceId: '247783ebdd51', lang: 'nl',
    voiceLabel: 'Noor — xai_247783ebdd51, nld_for_eng pod-0 cast',
    tail: 'THE KNOWN CLICKER — two impulses 260ms and 380ms past last phonation',
    text: 'Ik wil graag een glas bitter, alstublieft.' },
  { key: '02-nld-clicker-plosive', provider: 'xai', voiceId: '247783ebdd51', lang: 'nl',
    voiceLabel: 'Noor — xai_247783ebdd51, the clicker',
    tail: 'HARD — word-final voiceless plosive /p/, the burst the 40ms rule could mislabel',
    text: 'Ik denk dat het beter is als we nu even stoppen.' },
  { key: '03-eng-tom-clone-sibilant', provider: 'xai', voiceId: 'gfzdpspr5fdp', lang: 'en',
    voiceLabel: "Tom's own clone — 325,223 clips",
    tail: 'HARD — sibilant /s/ ending, high-frequency low-energy trail',
    text: 'She always says the buses leave from the other side.' },
  { key: '04-eng-olivia-plosive', provider: 'xai', voiceId: 'bedd6226', lang: 'en',
    voiceLabel: 'Olivia — 150,237 clips',
    tail: 'HARD — word-final /p/ burst after an unstressed syllable',
    text: 'I think that after all of this we should probably just stop.' },
  { key: '05-eng-eve-fricative', provider: 'xai', voiceId: 'eve', lang: 'en',
    voiceLabel: 'Eve — 162,906 clips',
    tail: 'HARD — voiceless fricative /θ/, the quietest ending English has',
    text: 'By the end of it, what she said was barely more than a breath.' },
  { key: '06-eng-leo-control', provider: 'xai', voiceId: 'leo', lang: 'en',
    voiceLabel: 'Leo — 90,044 clips',
    tail: 'CONTROL — ordinary voiced declarative ending',
    text: "I've been trying to learn this for about three months now." },
  { key: '07-nld-femke-vowel', provider: 'xai', voiceId: '58d27475085e', lang: 'nl',
    voiceLabel: 'Femke — xAI Dutch, measured clean in A-133',
    tail: 'HARD — quiet unstressed final schwa',
    text: 'Ik probeer dit nu al ongeveer drie maanden te leren.' },

  // ── Azure — the heavy end of the estate ───────────────────────────────────
  { key: '08-eng-sonia-control', provider: 'azure', voiceName: 'en-GB-SoniaNeural',
    voiceLabel: 'Sonia (Azure) — 414,080 clips, heaviest voice in the estate',
    tail: 'CONTROL — ordinary declarative',
    text: 'I would rather sit outside if the weather stays like this.' },
  { key: '09-eng-ryan-plosive', provider: 'azure', voiceName: 'en-GB-RyanNeural',
    voiceLabel: 'Ryan (Azure) — 79,120 clips, the biggest mover in the money-voice set',
    tail: 'HARD — final /t/ plosive; this voice pads ~0.6s of dead air',
    text: "I'd rather wait here until the rain has completely stopped." },
  { key: '10-deu-katja-devoiced', provider: 'azure', voiceName: 'de-DE-KatjaNeural',
    voiceLabel: 'Katja (Azure) — heaviest German voice',
    tail: 'HARD — German final devoicing, /d/ surfacing as a weak /t/',
    text: 'Das habe ich so wirklich niemals zu ihm gesagt.' },
  { key: '11-deu-conrad-cluster', provider: 'azure', voiceName: 'de-DE-ConradNeural',
    voiceLabel: 'Conrad (Azure) — German male',
    tail: 'HARD — final /st/ cluster, sibilant into plosive',
    text: 'Ich weiß nicht, ob das für heute wirklich genug ist.' },
  { key: '12-fra-celeste-vowel', provider: 'azure', voiceName: 'fr-FR-CelesteNeural',
    voiceLabel: 'Céleste (Azure) — heaviest metropolitan French voice',
    tail: 'HARD — quiet rounded final vowel /ø/, no consonant to mark the end',
    text: "Je crois qu'il vaut mieux attendre encore un peu." },
  { key: '13-fra-antoine-control', provider: 'azure', voiceName: 'fr-CA-AntoineNeural',
    voiceLabel: 'Antoine (Azure) — heaviest French voice overall (fr-CA)',
    tail: 'CONTROL — ordinary vowel ending',
    text: 'Il est parti sans rien dire du tout.' },
  { key: '14-spa-elvira-vowel', provider: 'azure', voiceName: 'es-ES-ElviraNeural',
    voiceLabel: 'Elvira (Azure) — heaviest Spanish voice',
    tail: 'HARD — unstressed final /a/, the softest ending Spanish makes',
    text: 'Quiero terminar esto antes de que llegue mi hermana.' },
  { key: '15-spa-alvaro-sibilant', provider: 'azure', voiceName: 'es-ES-AlvaroNeural',
    voiceLabel: 'Álvaro (Azure) — Spanish male, the largest cut in the money set',
    tail: 'HARD — final /s/ on an unstressed syllable',
    text: 'No sé si vamos a llegar a tiempo, pero lo intentamos.' },
  { key: '16-zho-xiaochen-particle', provider: 'azure', voiceName: 'zh-CN-XiaochenNeural',
    voiceLabel: 'Xiaochen (Azure) — heaviest Chinese voice',
    tail: 'HARD — neutral-tone final particle 吗, quiet and short by design',
    text: '我想在开始之前喝一杯水，可以吗？' },
  { key: '17-jpn-shiori-devoiced', provider: 'azure', voiceName: 'ja-JP-ShioriNeural',
    voiceLabel: 'Shiori (Azure) — heaviest Japanese voice',
    tail: 'HARD — devoiced final vowel in ます, near-whispered by rule',
    text: 'これは思っていたよりもずっと難しいと思います。' },
  { key: '18-jpn-naoki-devoiced', provider: 'azure', voiceName: 'ja-JP-NaokiNeural',
    voiceLabel: 'Naoki (Azure) — Japanese male',
    tail: 'HARD — devoiced final vowel in します',
    text: '明日の朝またこちらに来ますので、よろしくお願いします。' },
  { key: '19-cym-nia-lateral', provider: 'azure', voiceName: 'cy-GB-NiaNeural',
    voiceLabel: 'Nia (Azure) — Welsh, the house language',
    tail: 'HARD — Welsh voiceless lateral /ɬ/ and a final /l/, both low-energy',
    text: "Dw i ddim yn siŵr o gwbl fod hynny'n wir." },

  // ── ElevenLabs — the third provider phase8 can call ───────────────────────
  { key: '20-deu-elevenlabs', provider: 'elevenlabs', voiceId: 'FVdzAUsp8apoOdc0907A',
    voiceLabel: 'elevenlabs_FVdzAUsp8apoOdc0907A — 2,740 clips across the estate',
    tail: 'HARD — final nasal /n/ trailing off with no burst',
    text: 'Ich weiß noch nicht, ob ich morgen überhaupt kommen kann.' },

  // ── Second pass, added after the first run's finding ──────────────────────
  // The first 19 fresh renders contained NOT ONE post-speech impulse — including
  // the known clicker voice, on the exact line it clicked on this morning. So
  // the click is intermittent per RENDER, not a property of the voice, and the
  // batch could only prove the pad safe, not that it removes a click on a fresh
  // take. These six repeats of the clicker on its reference line hunt one. Each
  // is an independent TTS call; if any comes back with impulses in the raw, the
  // demonstration is fresh rather than archived. If none does, that is itself
  // the finding and gets reported as a measured miss rate, not glossed.
  ...Array.from({ length: 6 }, (_, i) => ({
    key: `2${i + 1}-nld-clicker-repeat-${i + 1}`, provider: 'xai', voiceId: '247783ebdd51', lang: 'nl',
    voiceLabel: `Noor — xai_247783ebdd51, repeat render ${i + 1} of 6`,
    tail: 'THE CLICKER, HUNTED — independent render of the reference line',
    text: 'Ik wil graag een glas bitter, alstublieft.',
  })),

  // Three more voices so the fresh-only set clears 20 without the blocked
  // ElevenLabs sample propping the count up.
  { key: '27-nld-fenna-azure', provider: 'azure', voiceName: 'nl-NL-FennaNeural',
    voiceLabel: 'Fenna (Azure) — the Dutch family that came out clean in the blind test',
    tail: 'CONTROL — the clean comparator for the clicker, same language',
    text: 'Ik wil graag een glas bitter, alstublieft.' },
  { key: '28-nld-thijs-sibilant', provider: 'xai', voiceId: 'a13662ba951c', lang: 'nl',
    voiceLabel: 'Thijs — xAI Dutch male',
    tail: 'HARD — final /s/ into a stop',
    text: 'Kun je me vertellen waar het station is, alsjeblieft?' },
  { key: '29-zho-yunyi-particle', provider: 'azure', voiceName: 'zh-CN-YunyiMultilingualNeural',
    voiceLabel: 'Yunyi (Azure) — Chinese male, 11,278 clips',
    tail: 'HARD — sentence-final 了, unstressed and short',
    text: '我已经在这里等了很久了。' },
]

// ── Rendering ────────────────────────────────────────────────────────────────
async function render(v) {
  if (v.provider === 'azure') {
    return (await ttsService.generateWithRetry(v.text, 'azure', {
      subscriptionKey: process.env.AZURE_SPEECH_KEY,
      region: process.env.AZURE_SPEECH_REGION,
      voiceName: v.voiceName,
    })).audioBuffer
  }
  if (v.provider === 'elevenlabs') {
    return (await ttsService.generateWithRetry(v.text, 'elevenlabs', {
      apiKey: process.env.ELEVENLABS_API_KEY, voiceId: v.voiceId,
    })).audioBuffer
  }
  return (await ttsService.generateWithRetry(v.text, 'xai', {
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

function measure(file, label) {
  const { s, n, peak } = decode(file)
  const env = envelope(s, n, peak)
  const eos = endOfSpeech(env) ?? n
  const room = roomFloorDb(s, n, peak, eos)
  return {
    label,
    durationMs: Math.round(n / SR * 1000),
    eosMs: Math.round(eos / SR * 1000),
    postEosMs: Math.round((n - eos) / SR * 1000),
    roomFloorDb: +room.toFixed(1),
    impulses: postSpeechImpulses(env, eos, room)
      .map(i => ({ startMs: +i.startMs.toFixed(0), peakDb: +i.peakDb.toFixed(1), overFloorDb: +i.overFloorDb.toFixed(1) })),
    lufs: +lufs(file).toFixed(1),
  }
}

// INDEPENDENT ASR. Not the trim's own arithmetic and not flagTailDefect: a
// different instrument answering the only question that actually matters —
// is the last word still there? Local whisper, no spend. A missing binary or
// model is reported as a gap, never as a pass.
const WHISPER = `${process.env.HOME}/.local/bin/whisper-cli`
const WHISPER_MODEL = `${process.env.HOME}/.local/share/whisper-models/ggml-medium.bin`
const WHISPER_LANG = { xai: null, azure: null }
function transcribe(file, langHint) {
  if (!fs.existsSync(WHISPER) || !fs.existsSync(WHISPER_MODEL)) return { gap: 'whisper-cli or model absent — ASR check NOT run' }
  try {
    const wav = file.replace(/\.mp3$/, '.asr.wav')
    cp.execSync(`ffmpeg -v quiet -y -i "${file}" -ar 16000 -ac 1 "${wav}"`, { shell: '/bin/bash' })
    const out = cp.execSync(`"${WHISPER}" -m "${WHISPER_MODEL}" -f "${wav}" ${langHint ? `-l ${langHint}` : '-l auto'} -nt -np 2>/dev/null || true`,
      { maxBuffer: 1 << 26, shell: '/bin/bash' }).toString().trim()
    fs.unlinkSync(wav)
    return { text: out.replace(/\s+/g, ' ').trim() }
  } catch (e) {
    return { gap: `ASR failed (${e.message})` }
  }
}

// Final-word retention. Punctuation and case stripped; CJK/Japanese have no word
// boundaries, so for those we check the last few characters instead and say so.
const CJK = /[\u3040-\u30ff\u4e00-\u9fff]/
function finalWordCheck(text, asr) {
  if (asr.gap) return { ok: null, note: asr.gap }
  const norm = t => t.toLowerCase().replace(/[.,!?;:'"«»、。？！]/g, '').trim()
  if (CJK.test(text)) {
    const tailChars = norm(text).slice(-3)
    return { ok: norm(asr.text).includes(tailChars), unit: `last 3 characters "${tailChars}"`, heard: asr.text }
  }
  const words = norm(text).split(/\s+/)
  const last = words[words.length - 1]
  return { ok: norm(asr.text).split(/\s+/).includes(last), unit: `final word "${last}"`, heard: asr.text }
}

const LANG_HINT = {
  '01': 'nl', '02': 'nl', '07': 'nl', '03': 'en', '04': 'en', '05': 'en', '06': 'en',
  '08': 'en', '09': 'en', '10': 'de', '11': 'de', '12': 'fr', '13': 'fr',
  '14': 'es', '15': 'es', '16': 'zh', '17': 'ja', '18': 'ja', '19': 'cy', '20': 'de',
  '21': 'nl', '22': 'nl', '23': 'nl', '24': 'nl', '25': 'nl', '26': 'nl', '27': 'nl', '28': 'nl', '29': 'zh',
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null
  const results = []

  for (const v of SAMPLES) {
    if (only && !only.includes(v.key)) continue
    const dir = path.join(OUT, v.key)
    fs.mkdirSync(dir, { recursive: true })
    const rawFile = path.join(dir, 'raw.mp3')

    try {
      if (process.env.REUSE === '1' && fs.existsSync(rawFile)) {
        console.log(`[reuse] ${v.key}`)
      } else {
        fs.writeFileSync(rawFile, await render(v))
      }
      const rawBuf = fs.readFileSync(rawFile)

      // BEFORE — the old chain: clean-normalise the raw bytes, no trim. This is
      // exactly what masterAudio did before this branch.
      const beforeFile = path.join(dir, `${v.key}-before.mp3`)
      await audioProcessor.normalizeAudioClean(rawFile, beforeFile, -16.0)

      // AFTER — the real, wired chain. One call. The trim under test is inside.
      const afterFile = path.join(dir, `${v.key}-after.mp3`)
      const mastered = await phase8.masterAudio(rawBuf, v.text)
      fs.writeFileSync(afterFile, mastered.buffer)

      // What did the guard actually decide? Asked of the same function the chain
      // calls, on the same bytes — reported, not inferred from the durations.
      const plan = await audioProcessor.trimToEndOfSpeech(rawFile, path.join(dir, 'plan.wav'))
      if (fs.existsSync(path.join(dir, 'plan.wav'))) fs.unlinkSync(path.join(dir, 'plan.wav'))

      const hint = LANG_HINT[v.key.slice(0, 2)] || null
      const asr = transcribe(afterFile, hint)

      const row = {
        key: v.key, provider: v.provider, voice: v.voiceId || v.voiceName,
        voiceLabel: v.voiceLabel, tail: v.tail, text: v.text,
        guard: { refused: plan.refused, trimmed: plan.trimmed, removedMs: plan.removedMs, eosMs: plan.eosMs },
        before: measure(beforeFile, 'before — old chain'),
        after: measure(afterFile, 'after — new chain'),
        finalWord: finalWordCheck(v.text, asr),
      }
      row.deltaMs = row.before.durationMs - row.after.durationMs
      results.push(row)

      console.log(`\n=== ${v.key} — ${v.voiceLabel}`)
      console.log(`  tail: ${v.tail}`)
      console.log(`  ${plan.refused ? `GUARD REFUSED: ${plan.refused}` : `removed ${row.deltaMs}ms (eos at ${plan.eosMs}ms)`}`)
      console.log(`  before ${row.before.durationMs}ms  impulses ${row.before.impulses.length}  ${row.before.lufs} LUFS`)
      console.log(`  after  ${row.after.durationMs}ms  impulses ${row.after.impulses.length}  ${row.after.lufs} LUFS`)
      console.log(`  final word: ${row.finalWord.ok === null ? `NOT CHECKED — ${row.finalWord.note}` : (row.finalWord.ok ? 'present' : `MISSING — heard "${row.finalWord.heard}"`)}`)
    } catch (e) {
      console.error(`  !! ${v.key} FAILED: ${e.message}`)
      results.push({ key: v.key, provider: v.provider, voiceLabel: v.voiceLabel, error: e.message })
    }
  }

  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
  console.log(`\nwrote ${OUT}/results.json`)
}

if (require.main === module) main().catch(e => { console.error(e.stack || e.message); process.exit(1) })
module.exports = { SAMPLES }
