// A-133 end-of-speech-aware tail probe — SAMPLE ONLY.
//
// Tom, 2026-08-17, after the A-131 ear check: "the time after the voice ends and
// before the click is definitely heard." That sentence turned out to be a
// literal, measurable description of the defect, and it is what this tool is
// built around.
//
// WHAT THE BYTES ACTUALLY SHOW (xai_247783ebdd51, 'Ik wil graag een glas bitter,
// alstublieft.', raw provider bytes, dB relative to the clip's own speech peak):
//
//   ... speech decays to the -67dB room floor by 740ms before EOF ...
//   544ms:-44  539ms:-25  534ms:-41     <- isolated ~10ms impulse, 42dB over floor
//   ... back to -67dB floor ...
//   429ms:-58  424ms:-27  419ms:-36     <- second isolated impulse
//   ... -67dB floor to 68ms, then digital silence to EOF ...
//
// So the click is NOT an end-of-file hard cut. It is one or more isolated
// impulses sitting out in the dead room tone, a fifth of a second after the last
// phonation — which is precisely the gap Tom hears. That also explains why the
// 8ms ANTI_CLICK_FADE never helped: the fade is at EOF and the impulses are
// 400-550ms upstream of it, and why the old PRE_COMPRESS made it worse (it lifted
// this whole region ~12dB).
//
// THE TREATMENT. End the file at the end of SPEECH plus a short natural decay.
// The impulses live past that point, so they never enter our file. Pure removal
// of dead room tone. Nothing is patched, crossfaded, padded, synthesised,
// de-clicked or rewritten.
//
// WHAT THIS IS NOT. On 2026-08-05 Tom deleted the tail-repair service's ability
// to modify audio entirely ("do not just change its default"), after a 9%-precise
// detector amputated taught words from LIVE German course clips. That was a
// REPAIR pass over already-shipped audio, cutting at a detector's guess. This is
// not that, and must never become that:
//   - it decides where a BRAND-NEW file ends, at render time, on clips that do
//     not exist yet;
//   - the only operation permitted is "stop the file earlier";
//   - it is standalone. No production caller, no env flag, no A/B switch (the
//     tail-repair switch WAS the bug once). Nothing here touches course_audio,
//     S3, a pod, or any live row. Outputs are local files for a listening doc;
//   - flagTailDefect (9% precision) is printed as corroborating instrumentation
//     ONLY. It never decides where to cut.
//
// Spend: a handful of short renders on the xAI/Azure paths, ~$0.002 each.
// Pre-authorised for A-133 only. REUSE=1 re-masters existing raws with no spend.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs'), path = require('path'), cp = require('child_process')
const ttsService = require('../../services/tts-service.cjs')
const audioProcessor = require('../../services/audio-processor.cjs')
const phase8 = require('../../services/phases/phase8-audio-v13.cjs')

const SR = 44100
const OUT = process.argv[2] || '/tmp/a133'

// ── Tunables, every one of them stated and justified in the report ───────────
// Speech threshold, dB RELATIVE TO THE CLIP'S OWN SPEECH PEAK — not a fixed dBFS
// number, because xAI clones are peaky (crest factor ~19dB) and a fixed floor
// means something different on every voice.
const SPEECH_DB = -45
const WIN_MS = 5
// An event only counts as SPEECH if this much of it is ACTUALLY above threshold
// (summed window time, not the event's span — a decaying impulse rings across a
// 45ms span on only 20ms of real energy, and span-based counting let exactly
// that through on the first pass). This is the load-bearing rule, and it is why
// the naive "last sample over -45dB" detector fails here: the clicks ARE over
// -45dB — they hit -25dB — but they are 10-20ms of energy. Speech is sustained.
//
// Safety note on the one thing this could get wrong: a word-final plosive burst
// can be shorter than 40ms and so could be mis-labelled an impulse. It is still
// protected, because DECAY_MS keeps 150ms past the previous speech event and no
// language has a 150ms word-internal closure. The trim can only ever reach
// something that stands MORE than 150ms clear of the last sustained speech.
const MIN_SPEECH_MS = 40
// Windows this close together belong to the same event (intra-word closures).
const EVENT_GAP_MS = 20
// Natural decay kept past end-of-speech. Too tight sounds amputated; too loose
// reaches the impulses, which is the entire thing we are avoiding.
const DECAY_MS = Number(process.env.DECAY_MS || 150)
// Refusal guards. If either trips we do NOT trim, we keep the untrimmed take and
// say so. See the report for why these are the numbers: the provider's dead tail
// is routinely 20%+ of a short clip, so a 15% fraction guard would refuse every
// good cut; these bound a DETECTION FAILURE instead of bounding normal operation.
const MAX_TRIM_FRAC = 0.40
const MAX_TRIM_MS = 2000
// Near-digital-silence floor, used to find where the provider's bytes stop.
const SILENCE_DB = -72

// ── Measurement ──────────────────────────────────────────────────────────────
function decode(file) {
  const pcm = cp.execSync(`ffmpeg -v quiet -i "${file}" -ac 1 -ar ${SR} -f s16le - `,
    { maxBuffer: 1 << 28, shell: '/bin/bash' })
  const n = pcm.length >> 1
  const s = new Int16Array(n)
  for (let i = 0; i < n; i++) s[i] = pcm.readInt16LE(i * 2)
  let peak = 1
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(s[i]))
  return { s, n, peak }
}

const db = (v, peak) => 20 * Math.log10(Math.max(v, 1) / peak)

function winPeak(s, from, to) {
  let p = 0
  for (let i = Math.max(0, from); i < Math.min(s.length, to); i++) p = Math.max(p, Math.abs(s[i]))
  return p
}

// Envelope of 5ms window peaks, dB rel. clip peak. Everything below reads this.
function envelope(s, n, peak) {
  const win = Math.round(SR * WIN_MS / 1000)
  const e = []
  for (let i = 0; i + win <= n; i += win) e.push({ i, end: i + win, db: db(winPeak(s, i, i + win), peak) })
  return e
}

// Group above-threshold windows into events, then label each as SPEECH (>=
// MIN_SPEECH_MS) or IMPULSE (shorter). Returns events in time order.
function events(env) {
  const gapWin = Math.max(1, Math.round(EVENT_GAP_MS / WIN_MS))
  const out = []
  let cur = null, gap = 0
  for (const w of env) {
    if (w.db > SPEECH_DB) {
      if (cur && gap <= gapWin) { cur.end = w.end; cur.peakDb = Math.max(cur.peakDb, w.db); cur.aboveWins++ }
      else { if (cur) out.push(cur); cur = { start: w.i, end: w.end, peakDb: w.db, aboveWins: 1 } }
      gap = 0
    } else if (cur) gap++
  }
  if (cur) out.push(cur)
  return out.map(e => ({
    ...e,
    ms: (e.end - e.start) / SR * 1000,
    aboveMs: e.aboveWins * WIN_MS,
    kind: e.aboveWins * WIN_MS >= MIN_SPEECH_MS ? 'speech' : 'impulse',
  }))
}

// End of speech = the end of the LAST event long enough to be speech.
function endOfSpeech(env) {
  const sp = events(env).filter(e => e.kind === 'speech')
  return sp.length ? sp[sp.length - 1].end : null
}

// Tail floor EXACTLY as the A-131 diagnosis and ear-check docs measured it:
// median of 2ms window peaks over the last 400-150ms, dB rel. clip peak. Kept
// verbatim so numbers here are directly comparable with those docs. CAVEAT: on a
// trimmed take that window no longer covers the same physical stretch of audio,
// so it is NOT comparable across trimmed/untrimmed — roomFloorDb is.
function tailFloorDb(s, n, peak) {
  const win = Math.round(SR * 0.002)
  const from = Math.max(0, n - Math.round(SR * 0.400))
  const to = Math.max(0, n - Math.round(SR * 0.150))
  const vals = []
  for (let i = from; i + win <= to; i += win) vals.push(db(winPeak(s, i, i + win), peak))
  vals.sort((a, b) => a - b)
  return vals.length ? vals[vals.length >> 1] : NaN
}

// Room floor over a FIXED PHYSICAL REGION — [eos+30ms, eos+130ms] — so the same
// stretch of dead air is measured in every take regardless of where the file
// ends. This is the honest cross-take comparison.
function roomFloorDb(s, n, peak, eos) {
  const win = Math.round(SR * 0.002)
  const from = Math.min(n, eos + Math.round(SR * 0.030))
  const to = Math.min(n, eos + Math.round(SR * 0.130))
  const vals = []
  for (let i = from; i + win <= to; i += win) vals.push(db(winPeak(s, i, i + win), peak))
  vals.sort((a, b) => a - b)
  return vals.length ? vals[vals.length >> 1] : NaN
}

// THE SCREEN SIGNAL (Part B). Isolated impulses sitting AFTER the end of speech,
// reported as their height above the room floor they interrupt. A clean voice
// has none; the known clicker has two at 40dB+ over floor.
function postSpeechImpulses(env, eos, roomDb) {
  return events(env)
    .filter(e => e.kind === 'impulse' && e.start >= eos)
    .map(e => ({ atMsFromEnd: null, startMs: e.start / SR * 1000, ms: e.ms, peakDb: e.peakDb, overFloorDb: e.peakDb - roomDb }))
}

function endProfile(s, n, peak) {
  const thr = peak * Math.pow(10, SILENCE_DB / 20)
  let last = n - 1
  while (last > 0 && Math.abs(s[last]) <= thr) last--
  const win = Math.round(SR * 0.005)
  return {
    endStepDb: db(winPeak(s, last - win + 1, last + 1), peak),
    trailingSilenceMs: (n - 1 - last) / SR * 1000,
  }
}

function lufs(file) {
  const out = cp.execSync(`ffmpeg -i "${file}" -af ebur128=framelog=quiet -f null - 2>&1 || true`,
    { maxBuffer: 1 << 26, shell: '/bin/bash' }).toString()
  const m = (out.match(/I:\s*(-?[\d.]+)\s*LUFS/g) || []).pop()
  return m ? parseFloat(m.match(/(-?[\d.]+)/)[1]) : NaN
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

async function measure(file, label) {
  const { s, n, peak } = decode(file)
  const env = envelope(s, n, peak)
  const eos = endOfSpeech(env) ?? n
  const room = roomFloorDb(s, n, peak, eos)
  const flag = await audioProcessor.flagTailDefect(file, { text: label }).catch(() => null)
  return {
    label,
    durationMs: Math.round(n / SR * 1000),
    eosMs: Math.round(eos / SR * 1000),
    postEosMs: Math.round((n - eos) / SR * 1000),
    tailFloorDb: tailFloorDb(s, n, peak),
    roomFloorDb: room,
    impulses: postSpeechImpulses(env, eos, room),
    ...endProfile(s, n, peak),
    lufs: lufs(file),
    flagged9pc: flag ? flag.action === 'flagged' : null,   // instrumentation only
  }
}

// ── The takes ────────────────────────────────────────────────────────────────
const NL = 'Ik wil graag een glas bitter, alstublieft.'
const VOICES = [
  { key: 'nld-noor', provider: 'xai', voiceId: '247783ebdd51', lang: 'nl', text: NL,
    note: 'xai_247783ebdd51 — the nld_for_eng pod-0 cast voice, the known clicker' },
  { key: 'nld-femke', provider: 'xai', voiceId: '58d27475085e', lang: 'nl', text: NL,
    note: 'xAI Dutch, other female seat — comparator' },
  { key: 'nld-thijs', provider: 'xai', voiceId: 'a13662ba951c', lang: 'nl', text: NL,
    note: 'xAI Dutch, male seat — comparator' },
  { key: 'nld-azure', provider: 'azure', voiceName: 'nl-NL-FennaNeural', text: NL,
    note: 'Azure Dutch — the family that came out clean in the blind test' },
]

async function render(v) {
  if (v.provider === 'azure') {
    return (await ttsService.generateWithRetry(v.text, 'azure', {
      subscriptionKey: process.env.AZURE_SPEECH_KEY,
      region: process.env.AZURE_SPEECH_REGION,
      voiceName: v.voiceName,
    })).audioBuffer
  }
  return (await ttsService.generateWithRetry(v.text, 'xai', {
    apiKey: process.env.XAI_API_KEY, voiceId: v.voiceId, language: v.lang,
  })).audioBuffer
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null
  const results = []

  for (const v of VOICES) {
    if (only && !only.includes(v.key)) continue
    const dir = path.join(OUT, v.key)
    fs.mkdirSync(dir, { recursive: true })
    const rawFile = path.join(dir, 'a-raw.mp3')

    if (process.env.REUSE === '1' && fs.existsSync(rawFile)) {
      console.log(`[reuse] ${v.key}: re-mastering the existing raw, no render`)
    } else {
      fs.writeFileSync(rawFile, await render(v))
    }
    const rawBuf = fs.readFileSync(rawFile)

    // B — CURRENT PRODUCTION: exactly what would ship today, the compressor-free
    // chain fed the provider's own bytes.
    const prodFile = path.join(dir, 'b-current-chain.mp3')
    fs.writeFileSync(prodFile, (await phase8.masterAudio(rawBuf, v.text)).buffer)

    const { s, n, peak } = decode(rawFile)
    const env = envelope(s, n, peak)

    // Control — same chain fed a full-length decode, so anything C shows against
    // B is attributable to the trim and not to the extra decode. No render, free.
    const ctlWav = path.join(dir, 'ctl.wav'); writeWav(ctlWav, s, n)
    const ctlFile = path.join(dir, 'c0-control-untrimmed.mp3')
    fs.writeFileSync(ctlFile, (await phase8.masterAudio(fs.readFileSync(ctlWav), v.text)).buffer)

    // C — END-OF-SPEECH-AWARE.
    const eos = endOfSpeech(env)
    let end = n, refused = null
    if (eos === null) {
      refused = 'no sustained speech event detected — refused, kept untrimmed'
    } else {
      const want = Math.min(n, eos + Math.round(SR * DECAY_MS / 1000))
      const removed = n - want
      if (removed / n > MAX_TRIM_FRAC) refused = `would remove ${(removed / n * 100).toFixed(1)}% of the clip (guard ${MAX_TRIM_FRAC * 100}%) — refused, kept untrimmed`
      else if (removed / SR * 1000 > MAX_TRIM_MS) refused = `would remove ${Math.round(removed / SR * 1000)}ms (guard ${MAX_TRIM_MS}ms) — refused, kept untrimmed`
      else end = Math.max(want, eos)   // never end before the detected end of speech
    }
    const trimWav = path.join(dir, 'trim.wav'); writeWav(trimWav, s.subarray(0, end), end)
    const eosFile = path.join(dir, 'c-end-of-speech.mp3')
    fs.writeFileSync(eosFile, (await phase8.masterAudio(fs.readFileSync(trimWav), v.text)).buffer)

    // Independent assertion: whatever we removed must contain NO speech event.
    // By construction it cannot, so this is a genuine second opinion on the cut.
    const removedSpeech = events(env).filter(e => e.kind === 'speech' && e.end > end)
    if (removedSpeech.length) throw new Error(`${v.key}: cut would remove a speech event — aborting`)

    const row = {
      key: v.key, note: v.note, provider: v.provider,
      voice: v.voiceId || v.voiceName, text: v.text,
      refused, removedMs: Math.round((n - end) / SR * 1000),
      rawEvents: events(env).map(e => ({ startMs: +(e.start / SR * 1000).toFixed(0), ms: +e.ms.toFixed(0), aboveMs: e.aboveMs, peakDb: +e.peakDb.toFixed(1), kind: e.kind })),
      takes: [
        await measure(rawFile, 'raw provider bytes'),
        await measure(prodFile, 'current chain (compressor-free)'),
        await measure(ctlFile, 'control: same chain, untrimmed'),
        await measure(eosFile, `end-of-speech tail (+${DECAY_MS}ms decay)`),
      ],
    }
    results.push(row)

    console.log(`\n=== ${v.key} — ${v.note} ===`)
    console.log(refused ? `  REFUSED: ${refused}` : `  removed ${row.removedMs}ms of post-speech tail`)
    for (const t of row.takes) {
      console.log(`  ${t.label.padEnd(36)} ${String(t.durationMs).padStart(5)}ms  eos ${String(t.eosMs).padStart(5)}ms` +
        `  tail ${t.tailFloorDb.toFixed(1)}  room ${t.roomFloorDb.toFixed(1)}` +
        `  impulses ${t.impulses.length ? t.impulses.map(i => i.peakDb.toFixed(0) + 'dB').join('/') : 'none'}` +
        `  ${t.lufs.toFixed(1)} LUFS  flag9%=${t.flagged9pc}`)
    }
    for (const f of [ctlWav, trimWav]) fs.unlinkSync(f)
  }

  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
  console.log(`\nwrote ${OUT}/results.json`)
}

module.exports = {
  decode, envelope, events, endOfSpeech, postSpeechImpulses, roomFloorDb, tailFloorDb,
  SPEECH_DB, MIN_SPEECH_MS, EVENT_GAP_MS, SILENCE_DB, WIN_MS, SR,
}
if (require.main === module) main().catch(e => { console.error(e.stack || e.message); process.exit(1) })
