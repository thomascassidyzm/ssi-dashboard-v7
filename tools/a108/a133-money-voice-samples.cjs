// A-133 — money-order ear-check samples + the run-together artefact.
//
// Two jobs, both commissioned by Tom on 2026-08-17 after he approved the chain
// by ear ("Click is gone and latest processing chain sounds excellent"):
//
//   1. "Let's have 10-20 more examples", prioritising heavy-use voices — his own
//      clone and Olivia for English, then Chinese, Spanish, German, French,
//      Japanese. The order here is not typed by hand: it comes from
//      a133-build-screen-list.cjs, which reads clip counts out of course_audio.
//
//   2. "If we're taking off the dead air, is there a danger that the phrases
//      will run into each other when played continuously?" A millisecond count
//      is not an answer to that question. So this also builds a LISTENING
//      artefact: consecutive phrases concatenated with EXACTLY ZERO samples
//      between them, before and after the trim, so he can hear the worst case
//      the app can ever produce.
//
// WHY ZERO IS THE WORST CASE, AND WHY IT IS REAL (ssi-learning-app, read
// 2026-08-17 — see the doc for file:line):
//   - config `cycle.transition_gap_ms: 500` is DECLARED AND UNIT-TESTED BUT HAS
//     NO CONSUMER. It is dead config; nothing in the playback path reads it.
//   - SimplePlayer.ts chains phases on the audio element's 'ended' event:
//     prompt → pause → voice1 → voice2. The PAUSE phase is a real silent clip of
//     seconds. But voice1 → voice2, and voice2 → the NEXT cycle's prompt, have
//     no designed gap at all unless the cycle carries `lingerMs` — and only
//     intro (2000ms) and component_intro (1500ms) tiles do. Ordinary build/use
//     cycles get 0ms.
//   - The listening/pod paths DO have designed gaps, and they are tight:
//     50ms (immersion same-speaker join), 90ms (default between phrases and
//     drill), and the pod matrix 100/200/300/1000ms.
//   So the tightest adjacency in the estate is 0ms in the cycle player. The pad
//   we keep on the end of a clip IS the whole inter-phrase silence there. That
//   is the evidence DECAY_MS=250 is chosen on, and it is why this artefact is
//   built at 0ms rather than at some average.
//
// This tool RENDERS AUDIO AND SPENDS MONEY: ~21 short takes at roughly $0.002
// each, single-figure cents, pre-authorised for A-133 only. REUSE=1 re-masters
// existing raws with no spend. It touches no live row, no pod, no course_audio,
// no S3 — local files for one published listening doc, nothing else.
//
// The measurement functions are imported from a133-tail-probe.cjs rather than
// reimplemented, so the numbers in this doc are the same numbers, computed by
// the same code, as the ones in the A-133 diagnosis.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs'), path = require('path'), cp = require('child_process')
const ttsService = require('../../services/tts-service.cjs')
const phase8 = require('../../services/phases/phase8-audio-v13.cjs')
const probe = require('./a133-tail-probe.cjs')

const { decode, envelope, events, endOfSpeech, postSpeechImpulses, roomFloorDb, tailFloorDb, SR } = probe

const OUT = process.argv[2] || '/tmp/a133-money'
// The pad kept past end-of-speech. 250ms, not the probe's 150ms default, and the
// reason is the app evidence above: at the cycle player's voice1→voice2 seam the
// app contributes NOTHING, so this pad is the entire audible separation between
// two consecutive phrases. 250ms is inside Watson's 150-300ms frame, audibly
// separates phrases on its own, and still ends the file hundreds of ms short of
// where the xAI impulses live (they sat 260ms and 380ms past last phonation on
// the known clicker — so 250ms is deliberately the tightest number that clears
// the whole impulse region on that voice).
const DECAY_MS = Number(process.env.DECAY_MS || 250)
const MAX_TRIM_FRAC = 0.40
const MAX_TRIM_MS = 2000

// ── Probe lines ──────────────────────────────────────────────────────────────
// Course-length sentences, not fragments — Tom is judging the tail AFTER real
// speech, and a one-word take gives the ear nothing to judge it against. Each
// language gets three consecutive lines so the run-together artefact can be
// built from genuinely different sentences rather than one line repeated.
const LINES = {
  eng: [
    "I'd like to have a glass of water before we start, if that's all right.",
    'Can you tell me where the station is, please?',
    "I've been trying to learn this for about three months now.",
  ],
  nld: [
    'Ik wil graag een glas bitter, alstublieft.',
    'Kun je me vertellen waar het station is?',
    'Ik probeer dit nu al ongeveer drie maanden te leren.',
  ],
  zho: ['我想在开始之前喝一杯水，可以吗？'],
  spa: ['Quiero beber un vaso de agua antes de empezar, si te parece bien.'],
  deu: ['Ich möchte bitte ein Glas Wasser trinken, bevor wir anfangen.'],
  fra: ['Je voudrais boire un verre d’eau avant de commencer, si tu veux bien.'],
  jpn: ['始める前に、お水を一杯いただけますか。'],
}
const XAI_TAG = { eng: 'en', nld: 'nl', zho: 'zh', spa: 'es', deu: 'de', fra: 'fr', jpn: 'ja' }

// ── The voices ───────────────────────────────────────────────────────────────
// Order and clip counts are lifted from a133-build-screen-list.cjs's read of
// course_audio (bare + xai_-prefixed spellings collapsed — matching only one
// spelling under-counts a voice by roughly half). 18 voices: inside Tom's
// "10-20 more examples", and no further.
//
// AN HONEST GAP, STATED UP FRONT: for the five big-money TARGET languages the
// estate has no xAI voice above the 2,000-clip floor — those target sides are
// Azure-cast, end of story. So "one Azure and one xAI per family" is satisfiable
// only on English (where both families really do serve) and on Dutch (the
// control). The five money languages below are Azure-only because that is what
// the estate actually is, not because xAI was skipped.
const VOICES = [
  // ── Tier 1: English, named by Tom, then the rest of the English pool by weight
  { key: '01-tom-clone',    provider: 'xai',   voiceId: 'gfzdpspr5fdp', lang: 'eng', clips: 325223,
    note: "Tom's own voice clone — 2nd heaviest voice in the estate" },
  { key: '02-olivia',       provider: 'xai',   voiceId: 'bedd6226',     lang: 'eng', clips: 150237,
    note: 'Olivia — 4th heaviest in the estate' },
  { key: '03-sonia-azure',  provider: 'azure', voiceName: 'en-GB-SoniaNeural', lang: 'eng', clips: 414080,
    note: 'Azure English — the single heaviest voice in the estate' },
  { key: '04-eve',          provider: 'xai',   voiceId: 'eve',          lang: 'eng', clips: 162906,
    note: 'xAI English — 3rd heaviest' },
  { key: '05-leo',          provider: 'xai',   voiceId: 'leo',          lang: 'eng', clips: 90044,
    note: 'xAI English male' },
  { key: '06-ryan-azure',   provider: 'azure', voiceName: 'en-GB-RyanNeural', lang: 'eng', clips: 79120,
    note: 'Azure English male' },
  { key: '07-ara',          provider: 'xai',   voiceId: 'ara',          lang: 'eng', clips: 70680,
    note: 'xAI English' },

  // ── Tier 2: the five big-money target languages Tom named, two voices each
  { key: '08-zho-xiaochen', provider: 'azure', voiceName: 'zh-CN-XiaochenNeural', lang: 'zho', clips: 37996,
    note: 'Chinese — heaviest zho voice' },
  { key: '09-zho-yunyi',    provider: 'azure', voiceName: 'zh-CN-YunyiMultilingualNeural', lang: 'zho', clips: 11278,
    note: 'Chinese male' },
  { key: '10-spa-elvira',   provider: 'azure', voiceName: 'es-ES-ElviraNeural', lang: 'spa', clips: 35592,
    note: 'Spanish — heaviest spa voice (Iberian)' },
  { key: '11-spa-alvaro',   provider: 'azure', voiceName: 'es-ES-AlvaroNeural', lang: 'spa', clips: 30718,
    note: 'Spanish male (Iberian)' },
  { key: '12-deu-katja',    provider: 'azure', voiceName: 'de-DE-KatjaNeural', lang: 'deu', clips: 17184,
    note: 'German — heaviest deu voice' },
  { key: '13-deu-conrad',   provider: 'azure', voiceName: 'de-DE-ConradNeural', lang: 'deu', clips: 5542,
    note: 'German male' },
  { key: '14-fra-celeste',  provider: 'azure', voiceName: 'fr-FR-CelesteNeural', lang: 'fra', clips: 13479,
    note: 'French — heaviest metropolitan fra voice' },
  { key: '15-fra-antoine',  provider: 'azure', voiceName: 'fr-CA-AntoineNeural', lang: 'fra', clips: 18597,
    note: 'French male (Canadian — heaviest fra voice overall)' },
  { key: '16-jpn-shiori',   provider: 'azure', voiceName: 'ja-JP-ShioriNeural', lang: 'jpn', clips: 35343,
    note: 'Japanese — heaviest jpn voice' },
  { key: '17-jpn-naoki',    provider: 'azure', voiceName: 'ja-JP-NaokiNeural', lang: 'jpn', clips: 11018,
    note: 'Japanese male' },

  // ── The control. Without it none of the above is interpretable.
  { key: '18-nld-clicker',  provider: 'xai',   voiceId: '247783ebdd51', lang: 'nld', clips: 0,
    note: 'CONTROL — xai_247783ebdd51, the one voice with a proven defect' },
]

// ── Extra measurement this job needs that the probe does not have ────────────
// Leading silence. The inter-phrase silence a learner actually hears is
// (our tail pad) + (the NEXT clip's own lead-in), so reporting the pad alone
// would understate the real separation. This measures the second half.
function leadInMs(s, n, peak) {
  const env = envelope(s, n, peak)
  const first = events(env).find(e => e.kind === 'speech')
  return first ? +(first.start / SR * 1000).toFixed(0) : 0
}

function writeWav(file, s, n) {
  const data = Buffer.alloc(n * 2)
  for (let i = 0; i < n; i++) data.writeInt16LE(s[i], i * 2)
  const h = Buffer.alloc(44)
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8)
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22)
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34)
  h.write('data', 36); h.writeUInt32LE(data.length, 40)
  fs.writeFileSync(file, Buffer.concat([h, data]))
}

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
    leadInMs: leadInMs(s, n, peak),
    eosMs: Math.round(eos / SR * 1000),
    postEosMs: Math.round((n - eos) / SR * 1000),
    tailFloorDb: +tailFloorDb(s, n, peak).toFixed(1),
    roomFloorDb: +room.toFixed(1),
    impulses: postSpeechImpulses(env, eos, room)
      .map(i => ({ startMs: +i.startMs.toFixed(0), ms: +i.ms.toFixed(0), peakDb: +i.peakDb.toFixed(1), overFloorDb: +i.overFloorDb.toFixed(1) })),
    lufs: +lufs(file).toFixed(1),
  }
}

async function render(v, text) {
  if (v.provider === 'azure') {
    return (await ttsService.generateWithRetry(text, 'azure', {
      subscriptionKey: process.env.AZURE_SPEECH_KEY,
      region: process.env.AZURE_SPEECH_REGION,
      voiceName: v.voiceName,
    })).audioBuffer
  }
  return (await ttsService.generateWithRetry(text, 'xai', {
    apiKey: process.env.XAI_API_KEY, voiceId: v.voiceId, language: XAI_TAG[v.lang],
  })).audioBuffer
}

// Trim to end-of-speech + DECAY_MS, with the probe's refusal guards intact.
// Returns { end, refused, removed, env }. The one thing this must never do is
// remove a speech event; the caller asserts that independently.
function trimPlan(s, n, peak) {
  const env = envelope(s, n, peak)
  const eos = endOfSpeech(env)
  if (eos === null) return { end: n, refused: 'no sustained speech event detected — refused, kept untrimmed', removed: 0, env }
  const want = Math.min(n, eos + Math.round(SR * DECAY_MS / 1000))
  const removed = n - want
  if (removed / n > MAX_TRIM_FRAC)
    return { end: n, refused: `would remove ${(removed / n * 100).toFixed(1)}% of the clip (guard ${MAX_TRIM_FRAC * 100}%) — refused, kept untrimmed`, removed: 0, env }
  if (removed / SR * 1000 > MAX_TRIM_MS)
    return { end: n, refused: `would remove ${Math.round(removed / SR * 1000)}ms (guard ${MAX_TRIM_MS}ms) — refused, kept untrimmed`, removed: 0, env }
  const end = Math.max(want, eos)
  return { end, refused: null, removed: n - end, env }
}

// ── One voice, one line: raw → current chain → end-of-speech tail ────────────
async function sampleOne(v, text, dir, tag) {
  fs.mkdirSync(dir, { recursive: true })
  const rawFile = path.join(dir, `${tag}-raw.mp3`)
  if (process.env.REUSE === '1' && fs.existsSync(rawFile)) {
    console.log(`  [reuse] ${v.key}/${tag}: re-mastering existing raw, no render`)
  } else {
    fs.writeFileSync(rawFile, await render(v, text))
  }

  const prodFile = path.join(dir, `${tag}-current-chain.mp3`)
  fs.writeFileSync(prodFile, (await phase8.masterAudio(fs.readFileSync(rawFile), text)).buffer)

  const { s, n, peak } = decode(rawFile)
  const plan = trimPlan(s, n, peak)

  // Independent second opinion on the cut: whatever we removed must contain no
  // speech event. The brief is explicit — if this ever fires, STOP and report,
  // never loosen it.
  const removedSpeech = events(plan.env).filter(e => e.kind === 'speech' && e.end > plan.end)
  if (removedSpeech.length) throw new Error(`${v.key}/${tag}: cut would remove a speech event — aborting`)

  const trimWav = path.join(dir, `${tag}-trim.wav`)
  writeWav(trimWav, s.subarray(0, plan.end), plan.end)
  const eosFile = path.join(dir, `${tag}-eos-tail.mp3`)
  fs.writeFileSync(eosFile, (await phase8.masterAudio(fs.readFileSync(trimWav), text)).buffer)
  fs.unlinkSync(trimWav)

  return {
    refused: plan.refused,
    removedMs: Math.round(plan.removed / SR * 1000),
    files: { raw: rawFile, prod: prodFile, eos: eosFile },
    takes: [
      measure(rawFile, 'raw provider bytes'),
      measure(prodFile, 'current chain (compressor-free)'),
      measure(eosFile, `end-of-speech tail (+${DECAY_MS}ms)`),
    ],
  }
}

// ── The run-together artefact ────────────────────────────────────────────────
// Concatenate mastered clips with EXACTLY ZERO samples between them. Not a
// crossfade, not a small gap — zero, because 0ms is what the cycle player
// actually gives at voice1→voice2 and at voice2→next prompt.
function concatZeroGap(files, outMp3) {
  const parts = files.map(f => decode(f))
  const total = parts.reduce((a, p) => a + p.n, 0)
  const all = new Int16Array(total)
  let off = 0
  const seams = []
  for (const p of parts) {
    all.set(p.s.subarray(0, p.n), off)
    off += p.n
    if (off < total) seams.push(off)
  }
  const wav = outMp3.replace(/\.mp3$/, '.wav')
  writeWav(wav, all, total)
  cp.execSync(`ffmpeg -v quiet -y -i "${wav}" -codec:a libmp3lame -q:a 2 "${outMp3}"`, { shell: '/bin/bash' })
  fs.unlinkSync(wav)
  return { seams: seams.map(x => +(x / SR * 1000).toFixed(0)) }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null
  const results = []

  console.log(`A-133 money-order samples — pad ${DECAY_MS}ms, ${VOICES.length} voices\n`)

  for (const v of VOICES) {
    if (only && !only.includes(v.key)) continue
    const dir = path.join(OUT, v.key)
    const text = LINES[v.lang][0]
    const r = await sampleOne(v, text, dir, 's1')
    const row = { ...v, text, ...r }
    results.push(row)

    console.log(`=== ${v.key} — ${v.note}`)
    console.log(r.refused ? `  REFUSED: ${r.refused}` : `  removed ${r.removedMs}ms of post-speech tail`)
    for (const t of r.takes) {
      console.log(`  ${t.label.padEnd(34)} ${String(t.durationMs).padStart(5)}ms  lead ${String(t.leadInMs).padStart(4)}ms` +
        `  eos ${String(t.eosMs).padStart(5)}ms  post ${String(t.postEosMs).padStart(4)}ms` +
        `  tail ${String(t.tailFloorDb).padStart(6)}  room ${String(t.roomFloorDb).padStart(6)}` +
        `  imp ${t.impulses.length ? t.impulses.map(i => i.peakDb.toFixed(0) + 'dB').join('/') : 'none'}` +
        `  ${t.lufs} LUFS`)
    }
    console.log('')
  }

  // ── Artefact: three consecutive phrases, zero gap, before and after ────────
  if (!process.env.NO_ARTEFACT) {
    // WHICH VOICE THE ARTEFACT IS BUILT ON, AND WHY IT IS NOT TOM'S CLONE.
    // The first run built it on the clone, and it proved nothing: the xAI clone
    // pool already ends its files 73-225ms after the last phonation, i.e.
    // TIGHTER than the 250ms pad, so the trim removed 0ms and the two takes
    // were byte-for-byte the same question. The trim only does real work on the
    // Azure voices, which ship 380-980ms of dead room tone. Ryan is the biggest
    // English mover in the set (847ms → 240ms of post-speech tail), so he is
    // where "do phrases run together?" is a real question rather than a
    // rhetorical one. Override with ARTEFACT_VOICE=<key>.
    const av = VOICES.find(x => x.key === (process.env.ARTEFACT_VOICE || '06-ryan-azure'))
    const dir = path.join(OUT, `run-together-${av.key}`)
    console.log(`=== run-together artefact — ${av.note}, three consecutive phrases, ZERO gap`)
    const parts = []
    for (let i = 0; i < LINES.eng.length; i++) {
      parts.push(await sampleOne(av, LINES.eng[i], dir, `p${i + 1}`))
    }
    const before = concatZeroGap(parts.map(p => p.files.prod), path.join(dir, 'A-current-chain-zero-gap.mp3'))
    const after = concatZeroGap(parts.map(p => p.files.eos), path.join(dir, 'B-eos-tail-zero-gap.mp3'))

    // The number that answers Tom's question: at each seam, how much silence
    // does the learner actually hear? = this clip's post-EOS tail + the next
    // clip's lead-in.
    const gapsBefore = [], gapsAfter = []
    for (let i = 0; i + 1 < parts.length; i++) {
      const a = parts[i].takes, b = parts[i + 1].takes
      gapsBefore.push(a[1].postEosMs + b[1].leadInMs)
      gapsAfter.push(a[2].postEosMs + b[2].leadInMs)
    }
    console.log(`  current chain, seams at ${before.seams.join('/')}ms — audible silence at seams: ${gapsBefore.join(', ')}ms`)
    console.log(`  eos tail,      seams at ${after.seams.join('/')}ms — audible silence at seams: ${gapsAfter.join(', ')}ms`)
    results.push({ key: 'run-together', voice: av.key, padMs: DECAY_MS, lines: LINES.eng,
      seamSilenceCurrentMs: gapsBefore, seamSilenceEosMs: gapsAfter,
      perPhrase: parts.map((p, i) => ({ line: LINES.eng[i], refused: p.refused, removedMs: p.removedMs, takes: p.takes })) })
  }

  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
  console.log(`\nwrote ${OUT}/results.json`)
}

module.exports = { VOICES, LINES, DECAY_MS, trimPlan, leadInMs, concatZeroGap }
if (require.main === module) main().catch(e => { console.error(e.stack || e.message); process.exit(1) })
