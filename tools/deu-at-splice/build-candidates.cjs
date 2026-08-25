#!/usr/bin/env node
/**
 * Build MANY splice candidates for the four deu_at_for_eng phrases Kai rejected,
 * out of Sascha's existing takes. No speech is ever generated — every millisecond
 * of every candidate is audio Sascha already recorded.
 *
 * The four phrases (Kai, 2026-08-25):  "i wü" · "i wü iatz mit dir Deitsch reden"
 *                                      "i wü reden" · "reden"
 *
 * KAI ASKED FOR VARIETY, ON THREE AXES, and this varies all three deliberately:
 *   SOURCE   — the same words cut out of many different longer utterances
 *   PADDING  — where in the silence around a word the cut falls: tight / mid / wide
 *   JOIN     — how long a gap sits between two glued pieces, 0…190ms, plus a
 *              short crossfade variant
 * A candidate that differs from another only by a few milliseconds teaches Kai
 * nothing, so the axes are crossed rather than piled up on one source.
 *
 * WHOLE BEATS GLUED. Kai's rule — "use the most complete phrases as the source for
 * the longer ones" — is implemented as a preference order, not a filter: a target
 * found CONTIGUOUSLY inside one take is cut in one piece and ranked first; two- and
 * three-piece assemblies follow. Kai still hears both, because a one-piece cut with
 * the wrong prosody can lose to a good join and only his ear can say so.
 *
 * WHERE THE TIMINGS COME FROM, AND WHAT THEY ARE NOT. whisper-cli gives word
 * timestamps, and it renders Austrian dialect into Standard German — "i wü" comes
 * back as "ich will". The transcript is therefore used for POSITION ONLY. The
 * PROMPTED line (recording_provenance.quality_notes) is the truth about what
 * Sascha was asked to say. A take whose two word counts disagree is not guessed
 * at: it is anchored on a unique word or dropped and named in `unusable`.
 *
 * Usage: node tools/deu-at-splice/build-candidates.cjs [--dir <work dir>]
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const WORK = process.argv.includes('--dir')
  ? process.argv[process.argv.indexOf('--dir') + 1]
  : path.join(__dirname, '..', '..', 'scripts', 'deu-at-splice')

const OUT = path.join(WORK, 'candidates')
const CLIPS = path.join(OUT, 'clips')

/** Austrian word -> what whisper is likely to print for it. Position only. */
const ALT = {
  'i': ['ich', 'i', 'ick'],
  'wü': ['will', 'wü', 'wil', 'wüll'],
  'iatz': ['jetzt', 'iatz', 'jetz', 'jatz'],
  'mit': ['mit'],
  'dir': ['dir', 'der'],
  'deitsch': ['deutsch', 'deitsch', 'teutsch'],
  'reden': ['reden', 'redn', 'red'],
}

const TARGETS = [
  { id: 'i-wue', text: 'i wü', words: ['i', 'wü'] },
  { id: 'reden', text: 'reden', words: ['reden'] },
  { id: 'i-wue-reden', text: 'i wü reden', words: ['i', 'wü', 'reden'] },
  {
    id: 'i-wue-iatz-mit-dir-deitsch-reden',
    text: 'i wü iatz mit dir Deitsch reden',
    words: ['i', 'wü', 'iatz', 'mit', 'dir', 'deitsch', 'reden'],
  },
]

/** How far into the silence beside a word the cut falls. */
const PADDINGS = [
  { id: 'tight', label: 'tight cut', frac: 0.15, cap: 60, flow: 0 },
  { id: 'mid', label: 'medium padding', frac: 0.5, cap: 130, flow: 30 },
  { id: 'wide', label: 'wide padding', frac: 0.9, cap: 260, flow: 70 },
]

/** Silence inserted between two glued pieces. -40 means a 40ms crossfade. */
const JOINS = [
  { id: 'butt', label: 'no gap', ms: 0 },
  { id: 'xfade', label: '40ms crossfade', ms: -40 },
  { id: 'g50', label: '50ms gap', ms: 50 },
  { id: 'g110', label: '110ms gap', ms: 110 },
  { id: 'g190', label: '190ms gap', ms: 190 },
]

const norm = (w) => String(w || '').toLowerCase().replace(/[^a-zäöüß']/g, '')

function tokenisePrompted(text) {
  return String(text).split(/\s+/).map(norm).filter(Boolean)
}

/**
 * Map each PROMPTED word onto a whisper word's timing.
 * Equal counts -> positional, which is the common case and the reliable one.
 * Otherwise anchor on words whose whisper form is known AND unique in both
 * sequences; anything not anchored stays null and its spans are simply not
 * offered. Nothing is interpolated: a guessed boundary is a click in Kai's ear.
 */
function alignWords(prompted, whisper) {
  const P = tokenisePrompted(prompted)
  const W = whisper.map((w) => ({ ...w, n: norm(w.word) })).filter((w) => w.n)
  if (!W.length) return { map: [], why: 'whisper produced no words' }

  if (P.length === W.length) {
    return { map: P.map((p, i) => ({ word: p, i, t: W[i] })), method: 'positional' }
  }

  const map = P.map((p, i) => ({ word: p, i, t: null }))
  for (let i = 0; i < P.length; i++) {
    const alts = ALT[P[i]]
    if (!alts) continue
    if (P.filter((x) => x === P[i]).length !== 1) continue
    const hits = W.filter((w) => alts.includes(w.n))
    if (hits.length === 1) map[i].t = hits[0]
  }
  return { map, method: 'anchored' }
}

/**
 * THE CUT POINT COMES FROM THE AUDIO, NOT FROM WHISPER.
 *
 * whisper-cli with `-ml 1 -sow` gives one segment per word, but each segment's
 * end is the next segment's START — so every inter-word gap it reports is zero
 * and "tight / medium / wide padding" cut on those numbers would be three
 * identical clips. Measured on Sascha's takes, 2026-08-25.
 *
 * So whisper's word start is used only as an ANCHOR, and the real edge of the
 * speech is found in the waveform around it: a 10ms RMS envelope, thresholded
 * RELATIVE TO THIS CLIP'S OWN SPEECH LEVEL (an absolute dB gate reads a quiet
 * take as silence — the boundary-margin lesson). Padding then means a real
 * position inside a real silence.
 */
const FRAME_MS = 10
const pcmCache = new Map()

function envelope(mp3) {
  if (pcmCache.has(mp3)) return pcmCache.get(mp3)
  const raw = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', mp3,
    '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], { maxBuffer: 1 << 28 })
  const n = Math.floor(raw.length / 2)
  const per = (8000 * FRAME_MS) / 1000
  const frames = []
  for (let i = 0; i + per <= n; i += per) {
    let s = 0
    for (let k = 0; k < per; k++) { const v = raw.readInt16LE((i + k) * 2) / 32768; s += v * v }
    frames.push(Math.sqrt(s / per))
  }
  const sorted = [...frames].sort((a, b) => a - b)
  const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] || 0
  const floor = q(0.10), peak = q(0.95)
  const thr = floor + 0.12 * Math.max(0, peak - floor)
  const env = { frames, thr, floor, peak, durMs: frames.length * FRAME_MS }
  pcmCache.set(mp3, env)
  return env
}

const voiced = (env, i) => (env.frames[i] ?? 0) > env.thr
const frameOf = (env, ms) => Math.max(0, Math.min(env.frames.length - 1, Math.round(ms / FRAME_MS)))

/**
 * An edge is one of two very different things, and Kai should hear both:
 *   IN SILENCE — Sascha paused there, so there is real room and `frac` of it is
 *                kept. This is the clean cut, and slow takes are full of them.
 *   MID FLOW   — the words run together with no pause at all, so there is no
 *                silence to cut in and the cut lands inside connected speech.
 *                Padding then means a few ms either side of whisper's boundary.
 * Labelling which one a candidate got is the whole point: "it only works when
 * there was a pause" is a rule we could then apply.
 */
function leftEdge(env, t, pad) {
  const onset0 = frameOf(env, t.start_ms)
  let onset = onset0
  while (onset > 0 && !voiced(env, onset)) onset++          // anchor may sit in the gap
  while (onset > 0 && voiced(env, onset - 1)) onset--       // back to this word's onset
  let sil = onset
  while (sil > 0 && !voiced(env, sil - 1)) sil--
  const room = (onset - sil) * FRAME_MS
  if (room >= 30) {
    return { ms: Math.max(0, onset * FRAME_MS - Math.min(room * pad.frac, pad.cap)), kind: 'in silence' }
  }
  return { ms: Math.max(0, t.start_ms - pad.flow), kind: 'mid flow' }
}

function rightEdge(env, t, pad) {
  let i = frameOf(env, t.start_ms + 20)
  while (i < env.frames.length - 1 && !voiced(env, i)) i++
  let off = i
  while (off < env.frames.length - 1 && voiced(env, off + 1)) off++
  const offMs = off * FRAME_MS
  // If the voiced run carries on well past where whisper put this word's end,
  // the next word is joined on and this is a mid-flow cut, not a pause.
  if (offMs > t.end_ms + 60) {
    return { ms: Math.min(env.durMs, t.end_ms + pad.flow), kind: 'mid flow' }
  }
  let sil = off
  while (sil < env.frames.length - 1 && !voiced(env, sil + 1)) sil++
  const room = (sil - off) * FRAME_MS
  return { ms: Math.min(env.durMs, offMs + Math.min(room * pad.frac, pad.cap)), kind: 'in silence' }
}

/**
 * SASCHA'S OWN PAUSES, on a slow read.
 *
 * A slow take carries `chunks_string` — the chunking the autocue asked them to
 * read with pauses between, e.g. "i wü|iatz|wos|auf Deitsch|sogn". When the
 * voiced regions in the audio come out at exactly that count, each chunk's
 * boundaries are a pause SASCHA MADE, not a boundary anything estimated. That
 * is the best cut available anywhere in this material, and "i wü" is itself a
 * chunk on several takes.
 *
 * The count check is the gate, and it refuses rather than redistributing —
 * mapVoicedToChunks in align.cjs refuses the same way, and for the same reason.
 */
function voicedRegions(env, minGapMs = 120, minRunMs = 80) {
  const runs = []
  let i = 0
  while (i < env.frames.length) {
    if (!voiced(env, i)) { i++; continue }
    let j = i
    while (j < env.frames.length - 1) {
      if (voiced(env, j + 1)) { j++; continue }
      let k = j + 1
      while (k < env.frames.length && !voiced(env, k)) k++
      if ((k - j - 1) * FRAME_MS < minGapMs && k < env.frames.length) { j = k } else break
    }
    if ((j - i + 1) * FRAME_MS >= minRunMs) runs.push({ startMs: i * FRAME_MS, endMs: (j + 1) * FRAME_MS })
    i = j + 1
  }
  return runs
}

/** Spans for a target found as a contiguous run of CHUNKS on a slow take. */
function findChunkSpans(take, want, env) {
  if (!take.chunks_string) return { spans: [], why: 'no pause map on this take' }
  const chunks = take.chunks_string.split('|').map((c) => c.trim()).filter(Boolean)
  // The chunk COUNT is known truth, so the pause threshold is calibrated to it
  // per take rather than fixed: Sascha pauses differently on different lines and
  // one global gap value matches almost none of them. If no threshold in the
  // range produces exactly the right number of regions, this refuses — it never
  // redistributes boundaries to force a fit.
  let regions = null
  for (const gap of [100, 130, 160, 200, 240, 290, 350, 420, 500, 600]) {
    const r = voicedRegions(env, gap)
    if (r.length === chunks.length) { regions = r; break }
    if (r.length < chunks.length) break
  }
  if (!regions) return { spans: [], why: `no pause threshold gives exactly ${chunks.length} regions — the pauses in this take do not match its own chunk map` }
  const words = chunks.map((c) => tokenisePrompted(c))
  const out = []
  for (let i = 0; i < chunks.length; i++) {
    for (let j = i; j < chunks.length; j++) {
      const flat = words.slice(i, j + 1).flat()
      if (flat.length !== want.length || flat.some((w, k) => w !== want[k])) continue
      out.push({
        chunkFrom: i, chunkTo: j,
        startMs: regions[i].startMs, endMs: regions[j].endMs,
        prevEndMs: i > 0 ? regions[i - 1].endMs : 0,
        nextStartMs: j < regions.length - 1 ? regions[j + 1].startMs : env.durMs,
        label: chunks.slice(i, j + 1).join(' | '),
      })
    }
  }
  return { spans: out }
}

/**
 * Every contiguous run of PROMPTED words in one take that spells `want`, with
 * usable timings at both ends.
 */
function findSpans(take, want, aligned) {
  const P = tokenisePrompted(take.prompted_text)
  const out = []
  for (let i = 0; i + want.length <= P.length; i++) {
    let ok = true
    for (let k = 0; k < want.length; k++) if (P[i + k] !== want[k]) { ok = false; break }
    if (!ok) continue
    const first = aligned.map[i]?.t
    const last = aligned.map[i + want.length - 1]?.t
    if (!first || !last || !(last.end_ms > first.start_ms)) continue
    out.push({
      from: i, to: i + want.length - 1, first, last,
      prevEnd: aligned.map[i - 1]?.t?.end_ms ?? null,
      nextStart: aligned.map[i + want.length]?.t?.start_ms ?? null,
      utterance_initial: i === 0,
      utterance_final: i + want.length === P.length,
    })
  }
  return out
}


/**
 * A cut that holds almost no speech is a misalignment, not a candidate: whisper
 * put the word somewhere it is not.
 *
 * MEASURED IN THE SOURCE TAKE'S FRAME OF REFERENCE, never in the cut's own. A
 * one-word clip is nearly all speech, so its own 10th percentile is a quiet
 * speech frame and its own threshold is meaningless — the first version of this
 * check measured the cut and reported a flat "80ms of voice" for everything,
 * which is the signature of a threshold with no silence to calibrate against.
 * The source take has real silence in it, so its threshold is the real one.
 */
function voicedInSpan(env, aMs, bMs) {
  const a = frameOf(env, aMs), b = frameOf(env, bMs)
  let n = 0
  for (let i = a; i <= b; i++) if (voiced(env, i)) n += FRAME_MS
  return n
}

function ff(args) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args])
}

/** One piece of audio, faded 8ms at each end so a cut never clicks. */
function cutPiece(srcMp3, startMs, endMs, outWav) {
  const dur = (endMs - startMs) / 1000
  ff(['-ss', (startMs / 1000).toFixed(3), '-t', dur.toFixed(3), '-i', srcMp3,
    '-af', `afade=t=in:st=0:d=0.008,afade=t=out:st=${Math.max(0, dur - 0.008).toFixed(3)}:d=0.008`,
    '-ar', '44100', '-ac', '1', outWav])
}

/** Glue pieces with a gap, or overlap them for the crossfade variant. */
function joinPieces(wavs, joinMs, outMp3) {
  if (wavs.length === 1) {
    ff(['-i', wavs[0], '-codec:a', 'libmp3lame', '-q:a', '4', outMp3])
    return
  }
  const inputs = []
  wavs.forEach((w) => inputs.push('-i', w))
  let filter, last
  if (joinMs < 0) {
    const d = (-joinMs) / 1000
    last = '[0:a]'
    let steps = []
    for (let i = 1; i < wavs.length; i++) {
      const outLab = `[x${i}]`
      steps.push(`${last}[${i}:a]acrossfade=d=${d}:c1=tri:c2=tri${outLab}`)
      last = outLab
    }
    filter = steps.join(';')
  } else {
    const sil = []
    for (let i = 0; i < wavs.length; i++) {
      sil.push(`[${i}:a]`)
      if (i < wavs.length - 1 && joinMs > 0) sil.push(`[s${i}]`)
    }
    const silGen = joinMs > 0
      ? wavs.slice(0, -1).map((_, i) => `aevalsrc=0:d=${(joinMs / 1000).toFixed(3)}:s=44100[s${i}]`).join(';') + ';'
      : ''
    filter = `${silGen}${sil.join('')}concat=n=${sil.length}:v=0:a=1[out]`
    last = '[out]'
  }
  ff([...inputs, '-filter_complex', filter, '-map', last, '-codec:a', 'libmp3lame', '-q:a', '4', outMp3])
}


/**
 * A cut that begins at sample 0 is not necessarily a clipped word: mastering
 * trims a take's head, so a phrase-initial cut has NO lead-in silence left to
 * keep, whatever padding is asked for. Measured 2026-08-25 — every one of the
 * pause-bounded "i wü" cuts starts at 0ms for this reason.
 *
 * That is a real risk of the best-sounding path being rejected for the wrong
 * reason, so rather than decide it, this offers the same cut again with digital
 * SILENCE added at the head or tail (no speech is created — silence is silence)
 * and labels it. Kai's ear picks; the label makes his pick into a rule.
 */
function padWithSilence(srcMp3, outMp3, headMs, tailMs) {
  const f = []
  if (headMs) f.push(`adelay=${headMs}:all=1`)
  if (tailMs) f.push(`apad=pad_dur=${(tailMs / 1000).toFixed(3)}`)
  ff(['-i', srcMp3, '-af', f.join(','), '-codec:a', 'libmp3lame', '-q:a', '4', outMp3])
}

/** Match a piece's loudness to the first piece, so a join does not step in level. */
function meanVolume(wav) {
  try {
    const out = execFileSync('ffmpeg', ['-hide_banner', '-i', wav, '-af', 'volumedetect', '-f', 'null', '-'],
      { stdio: ['ignore', 'ignore', 'pipe'] }).toString()
    return null
  } catch (err) {
    const m = String(err.stderr || '').match(/mean_volume:\s*(-?[\d.]+) dB/)
    return m ? Number(m[1]) : null
  }
}
function matchLevel(wav, targetDb) {
  const db = meanVolume(wav)
  if (db == null || targetDb == null) return false
  const delta = targetDb - db
  if (Math.abs(delta) < 0.8) return false
  const tmp = wav.replace(/\.wav$/, '.lvl.wav')
  ff(['-i', wav, '-af', `volume=${delta.toFixed(2)}dB`, tmp])
  fs.renameSync(tmp, wav)
  return true
}

function ms(n) { return Math.round(n) }

function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(WORK, 'manifest-sources.json'), 'utf8'))
  const takes = (manifest.takes || manifest.sources || []).filter((t) => t.whisper_words?.length && t.mp3_path)
  fs.mkdirSync(CLIPS, { recursive: true })

  const unusable = []
  const prepared = takes.map((t) => {
    const aligned = alignWords(t.prompted_text, t.whisper_words)
    if (!aligned.map.length) { unusable.push({ uuid: t.uuid, why: aligned.why }); return null }
    return { ...t, aligned }
  }).filter(Boolean)

  const candidates = []
  const dropped = []
  let n = 0

  for (const target of TARGETS) {
    // ---- one piece, cut whole out of a single take (ranked first) -----------
    const wholes = []
    for (const t of prepared) {
      for (const sp of findSpans(t, target.words, t.aligned)) wholes.push({ t, sp })
    }
    // ---- cut at Sascha's own pauses, on the slow reads (best edges there are)
    let pauseMade = 0
    const pauseRefusals = []
    for (const t of prepared) {
      if (t.cadence !== 'slow' || !t.chunks_string || pauseMade >= 9) continue
      const env = envelope(t.mp3_path)
      const chunkFind = findChunkSpans(t, target.words, env)
      if (chunkFind.why && target.words.length <= 3) pauseRefusals.push({ uuid: t.uuid, why: chunkFind.why })
      for (const cs of chunkFind.spans) {
        for (const pad of PADDINGS) {
          const a = Math.max(0, cs.startMs - Math.min((cs.startMs - cs.prevEndMs) * pad.frac, pad.cap))
          const b = Math.min(env.durMs, cs.endMs + Math.min((cs.nextStartMs - cs.endMs) * pad.frac, pad.cap))
          if (!(b - a > 120)) continue
          const id = `${target.id}-p${++n}`
          const wav = path.join(CLIPS, `${id}.wav`)
          const mp3 = path.join(CLIPS, `${id}.mp3`)
          cutPiece(t.mp3_path, a, b, wav)
          joinPieces([wav], 0, mp3)
          fs.unlinkSync(wav)
          const pv = voicedInSpan(env, a, b)
          if (pv < 80 * target.words.length) {
            fs.unlinkSync(mp3); n--
            dropped.push({ target: target.id, source: t.uuid, why: `pause-bounded cut held only ${pv}ms of voice` })
            continue
          }
          pauseMade++
          if (a <= 20 || b >= env.durMs - 20) {
            const padId = `${id}-lead`
            padWithSilence(mp3, path.join(CLIPS, `${padId}.mp3`), a <= 20 ? 90 : 0, b >= env.durMs - 20 ? 90 : 0)
            candidates.push({
              id: padId, target: target.id, kind: 'one piece',
              file: `clips/${padId}.mp3`,
              how: `cut at Sascha's own pauses in the slow read of “${t.prompted_text}”`,
              detail: `${pad.label} · chunk “${cs.label}” · 90ms of silence added where mastering left none`,
              padding: pad.id, join: null, edges: ['pause', 'pause'], silence_added: true,
              sources: [{ uuid: t.uuid, prompted_text: t.prompted_text, seed: t.seed_number, cadence: t.cadence, chunk: cs.label, span_ms: [ms(a), ms(b)] }],
              test_material: t.seed_number >= 10,
            })
          }
          candidates.push({
            id, target: target.id, kind: 'one piece',
            file: `clips/${id}.mp3`,
            how: `cut at Sascha's own pauses in the slow read of “${t.prompted_text}”`,
            detail: `${pad.label} · chunk “${cs.label}” · both edges in a pause Sascha made`,
            padding: pad.id, join: null, edges: ['pause', 'pause'],
            sources: [{ uuid: t.uuid, prompted_text: t.prompted_text, seed: t.seed_number, cadence: t.cadence, chunk: cs.label, span_ms: [ms(a), ms(b)] }],
            test_material: t.seed_number >= 10,
          })
        }
      }
    }

    if (pauseRefusals.length) dropped.push({ target: target.id, kind: 'pause-bounded', refused: pauseRefusals.length, why: pauseRefusals[0].why })

    // VARIETY IS THE POINT, so one CARRIER LINE contributes one span, not five.
    // Kai asked for many different "i wü"s out of many different phrases; ten
    // cuts out of three takes is not that, however many clips it makes.
    const seenLine = new Set()
    const distinct = wholes.filter(({ t }) => {
      if (seenLine.has(t.prompted_text)) return false
      seenLine.add(t.prompted_text); return true
    })
    const wholeBudget = 12
    if (distinct.length > wholeBudget) dropped.push({ target: target.id, kind: 'whole', distinct_carrier_lines: distinct.length, kept: wholeBudget })
    for (const { t, sp } of distinct.slice(0, wholeBudget)) {
      const env = envelope(t.mp3_path)
      for (const pad of PADDINGS) {
        const a = leftEdge(env, sp.first, pad)
        const b = rightEdge(env, sp.last, pad)
        if (!(b.ms - a.ms > 120)) continue
        const id = `${target.id}-w${++n}`
        const wav = path.join(CLIPS, `${id}.wav`)
        const mp3 = path.join(CLIPS, `${id}.mp3`)
        cutPiece(t.mp3_path, a.ms, b.ms, wav)
        joinPieces([wav], 0, mp3)
        fs.unlinkSync(wav)
        const voice = voicedInSpan(env, a.ms, b.ms)
        if (voice < 80 * target.words.length) {
          fs.unlinkSync(mp3); n--
          dropped.push({ target: target.id, source: t.uuid, why: `the cut held only ${voice}ms of voice — whisper put “${target.words.join(' ')}” somewhere it is not` })
          continue
        }
        const edges = a.kind === b.kind ? `both edges ${a.kind}` : `starts ${a.kind}, ends ${b.kind}`
        if (pad.id === 'wide' && (a.ms <= 20 || b.ms >= env.durMs - 20)) {
          const padId = `${id}-lead`
          padWithSilence(mp3, path.join(CLIPS, `${padId}.mp3`), a.ms <= 20 ? 90 : 0, b.ms >= env.durMs - 20 ? 90 : 0)
          candidates.push({
            id: padId, target: target.id, kind: 'one piece',
            file: `clips/${padId}.mp3`,
            how: `cut whole out of “${t.prompted_text}”`,
            detail: `${pad.label} · ${edges} · 90ms of silence added where mastering left none`,
            padding: pad.id, join: null, edges: [a.kind, b.kind], silence_added: true,
            sources: [{ uuid: t.uuid, prompted_text: t.prompted_text, seed: t.seed_number, cadence: t.cadence, span_ms: [ms(a.ms), ms(b.ms)] }],
            test_material: t.seed_number >= 10,
          })
        }
        candidates.push({
          id, target: target.id, kind: 'one piece',
          file: `clips/${id}.mp3`,
          how: `cut whole out of “${t.prompted_text}”`,
          detail: `${pad.label} · ${edges}${t.cadence === 'slow' ? ' · slow read' : ''}`,
          padding: pad.id, join: null, edges: [a.kind, b.kind],
          sources: [{ uuid: t.uuid, prompted_text: t.prompted_text, seed: t.seed_number, cadence: t.cadence, span_ms: [ms(a.ms), ms(b.ms)] }],
          test_material: t.seed_number >= 10,
        })
      }
    }

    // ---- two and three pieces, glued ---------------------------------------
    if (target.words.length < 2) continue
    const splits = []
    for (let i = 1; i < target.words.length; i++) splits.push([target.words.slice(0, i), target.words.slice(i)])
    if (target.words.length >= 4) {
      for (let i = 1; i < target.words.length - 1; i++)
        for (let j = i + 1; j < target.words.length; j++)
          splits.push([target.words.slice(0, i), target.words.slice(i, j), target.words.slice(j)])
    }

    // Kai's rule: prefer the split whose parts are longest — the most complete
    // phrase carries the longer piece.
    splits.sort((a, b) => (b.reduce((m, p) => Math.max(m, p.length), 0) - a.reduce((m, p) => Math.max(m, p.length), 0)) || (a.length - b.length))

    let made = 0
    const perTargetBudget = 22
    for (const split of splits) {
      if (made >= perTargetBudget) { dropped.push({ target: target.id, kind: 'glued', why: `budget ${perTargetBudget} reached before split ${split.map((s) => s.join(' ')).join(' + ')}` }); break }
      const partSources = split.map((part) => {
        const hits = []
        const seen = new Set()
        for (const t of prepared) for (const sp of findSpans(t, part, t.aligned)) {
          if (seen.has(t.prompted_text)) continue
          seen.add(t.prompted_text)
          hits.push({ t, sp, part })
        }
        // prefer a part taken from the END or START of a line — a cleaner edge
        hits.sort((x, y) => (Number(y.sp.utterance_final || y.sp.utterance_initial) - Number(x.sp.utterance_final || x.sp.utterance_initial)))
        return hits
      })
      if (partSources.some((h) => !h.length)) continue

      const combos = []
      const width = Math.min(4, ...partSources.map((h) => h.length))
      for (let k = 0; k < Math.max(2, width); k++) {
        const pick = partSources.map((h) => h[k % h.length])
        if (pick.some((p) => !p)) continue
        combos.push(pick)
      }

      for (const [ci, pick] of combos.entries()) {
        // padding varies across combos so the set covers all three axes without
        // the full cross product, which would be hundreds of near-identical clips
        const pad = PADDINGS[ci % PADDINGS.length]
        for (const join of JOINS) {
          if (made >= perTargetBudget) break
          const id = `${target.id}-g${++n}`
          const wavs = []
          const pieceVoice = []
          let ok = true
          let refDb = null
          pick.forEach((p, idx) => {
            const env = envelope(p.t.mp3_path)
            const a = leftEdge(env, p.sp.first, pad)
            const b = rightEdge(env, p.sp.last, pad)
            if (!(b.ms - a.ms > 100)) { ok = false; return }
            pieceVoice.push(voicedInSpan(env, a.ms, b.ms))
            const w = path.join(CLIPS, `${id}.p${idx}.wav`)
            cutPiece(p.t.mp3_path, a.ms, b.ms, w)
            if (idx === 0) refDb = meanVolume(w); else matchLevel(w, refDb)
            wavs.push(w)
          })
          if (!ok || wavs.length !== pick.length) { wavs.forEach((w) => fs.existsSync(w) && fs.unlinkSync(w)); n--; continue }
          const mp3 = path.join(CLIPS, `${id}.mp3`)
          try { joinPieces(wavs, join.ms, mp3) } catch (err) {
            wavs.forEach((w) => fs.existsSync(w) && fs.unlinkSync(w))
            dropped.push({ target: target.id, id, why: `ffmpeg refused the join: ${String(err.message).slice(0, 120)}` })
            continue
          }
          wavs.forEach((w) => fs.existsSync(w) && fs.unlinkSync(w))
          const gv = pieceVoice.reduce((x, y) => x + y, 0)
          if (gv < 80 * target.words.length) {
            fs.unlinkSync(mp3); n--
            dropped.push({ target: target.id, id, why: `the glued clip held only ${gv}ms of voice — one of its pieces is a misalignment` })
            continue
          }
          made++
          candidates.push({
            id, target: target.id, kind: `${pick.length} pieces`,
            file: `clips/${id}.mp3`,
            how: pick.map((p) => `“${p.part.join(' ')}” from “${p.t.prompted_text}”`).join('  +  '),
            detail: `${join.label} · ${pad.label}`,
            padding: pad.id, join: join.id,
            sources: pick.map((p) => ({ uuid: p.t.uuid, prompted_text: p.t.prompted_text, seed: p.t.seed_number, cadence: p.t.cadence, part: p.part.join(' ') })),
            test_material: pick.some((p) => p.t.seed_number >= 10),
          })
        }
      }
    }
  }

  const out = {
    course: 'deu_at_for_eng',
    recordist: 'Sascha (they/them)',
    built_at: new Date().toISOString(),
    targets: TARGETS.map((t) => ({ ...t, count: candidates.filter((c) => c.target === t.id).length })),
    source_takes_read: prepared.length,
    unusable, dropped, candidates,
  }
  fs.writeFileSync(path.join(OUT, 'candidates.json'), JSON.stringify(out, null, 2))
  console.log(`${candidates.length} candidates from ${prepared.length} takes`)
  for (const t of out.targets) console.log(`  ${t.text}: ${t.count}`)
  if (dropped.length) console.log(`  ${dropped.length} things deliberately not built (listed in candidates.json)`)
}

if (require.main === module) main()
module.exports = { alignWords, findSpans, TARGETS }
