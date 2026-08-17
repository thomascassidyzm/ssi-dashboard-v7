// A-136 — FEMKE vs LIEKE: the head-to-head, one line at a time.
//
// Tom is deciding who speaks as THE Dutch female voice. Two xAI voices:
//   Femke  58d27475085e  — 159 clips already in nld_for_eng
//   Lieke  cdb1cec8      — currently index 0 of app_config.pod_voice_pools.nld.f
// Both read the SAME eight lines, and every clip is a FRESH TTS call through
// the full new chain — phase8.masterAudio(), on feat/a133-tail-pad-in-chain,
// with the trailing-artefact rule live. No archive take is re-processed, and
// there is no before/after here: the chain is a constant, the voice is the
// variable.
//
// THE EIGHT LINES are course-like Dutch, not tongue-twisters: two short
// prompts, two longer sentences, a question with a tag, and hard endings
// favouring the p4/p5 shapes the A-133 screening tool made default (quiet
// unstressed final schwa with no consonant to mark the end; Dutch final
// devoicing where /d/ surfaces as a weak /t/). Those are the shapes that
// separate voices — an easy line makes any voice sound fine.
//
// A/B BLINDING. The page labels the two players A and B, and which voice is A
// flips per row on a FIXED, recorded pattern (see AB_PATTERN). Tom judges by
// ear; the key sits at the bottom of the page. Randomness is deliberately not
// used — Math.random() would make the page unreproducible, and a fixed
// alternating-with-a-swap pattern blinds just as well.
//
// SPEND: 16 renders at roughly $0.003 each — under five cents.
// TOUCHES NOTHING LIVE: no course_audio row, no pod, no S3 object, no DB write,
// no pool change.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs'), path = require('path'), cp = require('child_process')
const ttsService = require('../../services/tts-service.cjs')
const phase8 = require('../../services/phases/phase8-audio-v13.cjs')
const audioProcessor = require('../../services/audio-processor.cjs')
const probe = require('./a133-tail-probe.cjs')

const { decode, envelope, endOfSpeech, postSpeechImpulses, roomFloorDb, SR } = probe
const OUT = process.argv[2] || '/tmp/a136-femke-lieke'

const VOICES = [
  { key: 'femke', name: 'Femke', voiceId: '58d27475085e', note: 'xAI Dutch female — 159 clips already in nld_for_eng' },
  { key: 'lieke', name: 'Lieke', voiceId: 'cdb1cec8', note: 'xAI Dutch female — current index-0 female in the nld pod pool' },
]

// ── The eight lines ──────────────────────────────────────────────────────────
// `shape` says what the line is for; `tail` names the hazard at its end, which
// is what the numbers below measure.
const LINES = [
  { id: 'L1', shape: 'SHORT PROMPT — the kind of line a learner hears first',
    tail: 'final /t/ after a fricative, the classic clicker reference',
    text: 'Ik wil graag een kop koffie, alsjeblieft.' },
  { id: 'L2', shape: 'SHORT PROMPT — two-beat, ordinary voiced ending',
    tail: 'CONTROL — open vowel, nothing hard about it',
    text: 'Dat weet ik nog niet zo goed.' },
  { id: 'L3', shape: 'LONGER SENTENCE — course-length declarative',
    tail: 'p4-style — quiet unstressed final schwa, no consonant to mark the end',
    text: 'Ik heb het hem gisteren nog een keer proberen uit te leggen.' },
  { id: 'L4', shape: 'LONGER SENTENCE — subordinate clause, the shape most USE phrases take',
    tail: 'p5-style — Dutch final devoicing, /d/ surfacing as a weak /t/',
    text: 'Ik denk dat ik dat vroeger nooit tegen hem had gezegd.' },
  { id: 'L5', shape: 'QUESTION WITH A TAG — the rise-then-fall a voice can flatten',
    tail: 'the tag rise-then-fall, landing on a clipped final /t/',
    text: 'Je komt vanavond toch ook nog even langs, of niet?' },
  { id: 'L6', shape: 'QUESTION — polite request, inverted, the everyday course shape',
    tail: 'final /s/ into a stop, sibilant trail',
    text: 'Kun je me vertellen waar het dichtstbijzijnde station is?' },
  { id: 'L7', shape: 'HARD ENDINGS — word-final voiceless plosive',
    tail: 'p2-style — /p/ burst the end-of-speech rule can mislabel as a click',
    text: 'Ik vind het beter als we hier nu even mee stoppen.' },
  { id: 'L8', shape: 'HARD ENDINGS — devoiced final /d/ closing a long clause',
    tail: 'p5-style again on a longer run, where breath support is already spent',
    text: 'Ze heeft me verteld dat ze toch niet meer meekomt vanavond.' },
]

// A/B ASSIGNMENT — fixed, recorded, blinding. `true` means Femke is A.
// Alternating would be guessable after two rows, so the pattern breaks stride
// twice (rows 4 and 5 both give Lieke position A, rows 7 and 8 both give Femke).
const AB_PATTERN = [true, false, true, false, false, true, true, false]

async function render(voiceId, text) {
  const r = await ttsService.generateWithRetry(text, 'xai', {
    apiKey: process.env.XAI_API_KEY, voiceId, language: 'nl',
  })
  return r.audioBuffer
}

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

// ASR is here to answer ONE question: did the chain eat a word off this voice?
// It is NOT a referee of Dutch register — whisper is documented to flip
// alstublieft/alsjeblieft between model sizes on the same clip, so a transcript
// that differs from the script on a register word is reported, never scored.
const WHISPER = `${process.env.HOME}/.local/bin/whisper-cli`
const WHISPER_MODEL = `${process.env.HOME}/.local/share/whisper-models/ggml-medium.bin`
function transcribe(file) {
  if (!fs.existsSync(WHISPER) || !fs.existsSync(WHISPER_MODEL)) return { gap: 'whisper-cli or model absent — ASR check NOT run' }
  try {
    const wav = file.replace(/\.mp3$/, '.asr.wav')
    cp.execSync(`ffmpeg -v quiet -y -i "${file}" -ar 16000 -ac 1 "${wav}"`, { shell: '/bin/bash' })
    const out = cp.execSync(`"${WHISPER}" -m "${WHISPER_MODEL}" -f "${wav}" -l nl -nt -np 2>/dev/null || true`,
      { maxBuffer: 1 << 26, shell: '/bin/bash' }).toString().trim()
    fs.unlinkSync(wav)
    return { text: out.replace(/\s+/g, ' ').trim() }
  } catch (e) {
    return { gap: `ASR failed (${e.message})` }
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const results = []
  for (const line of LINES) {
    for (const v of VOICES) {
      const key = `${line.id}-${v.key}`
      const dir = path.join(OUT, key)
      fs.mkdirSync(dir, { recursive: true })
      const rawFile = path.join(dir, 'raw.mp3')
      try {
        if (process.env.REUSE === '1' && fs.existsSync(rawFile)) console.log(`[reuse] ${key}`)
        else fs.writeFileSync(rawFile, await render(v.voiceId, line.text))
        const rawBuf = fs.readFileSync(rawFile)

        const outFile = path.join(dir, `${key}.mp3`)
        const mastered = await phase8.masterAudio(rawBuf, line.text)
        fs.writeFileSync(outFile, mastered.buffer)

        // What the guard decided, asked of the same function the chain calls.
        const plan = await audioProcessor.trimToEndOfSpeech(rawFile, path.join(dir, 'plan.wav'))
        if (fs.existsSync(path.join(dir, 'plan.wav'))) fs.unlinkSync(path.join(dir, 'plan.wav'))

        const asr = transcribe(outFile)
        const row = {
          key, lineId: line.id, shape: line.shape, tail: line.tail, text: line.text,
          voiceKey: v.key, voice: v.name, voiceId: v.voiceId, note: v.note,
          guard: { refused: plan.refused, trimmed: plan.trimmed, removedMs: plan.removedMs, eosMs: plan.eosMs },
          measured: measure(outFile),
          asr,
        }
        results.push(row)
        console.log(`  ${key}  ${plan.refused ? `GUARD REFUSED: ${plan.refused}` : `trimmed ${plan.removedMs || 0}ms`}  ` +
          `${row.measured.durationMs}ms  ${row.measured.impulses.length}imp  ${row.measured.lufs}LUFS  ` +
          `tail ${row.measured.postEosMs}ms`)
      } catch (e) {
        console.error(`  !! ${key} FAILED: ${e.message}`)
        results.push({ key, lineId: line.id, voiceKey: v.key, voice: v.name, text: line.text, error: e.message })
      }
      fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
    }
  }
  console.log(`\nwrote ${OUT}/results.json  (${results.length} rows)`)
}

if (require.main === module) main().catch(e => { console.error(e.stack || e.message); process.exit(1) })
module.exports = { VOICES, LINES, AB_PATTERN }
