#!/usr/bin/env node
/**
 * Build MANY splice candidates for the four deu_at_for_eng phrases Kai rejected,
 * out of Sascha's existing takes. No speech is ever generated — every millisecond
 * of every candidate is audio Sascha already recorded.
 *
 * The four phrases (Kai, 2026-08-25):  "i wü" · "i wü iatz mit dir Deitsch reden"
 *                                      "i wü reden" · "reden"
 *
 * NATURAL SEED 1-9 TAKES ONLY — Kai, 2026-08-25: *"don't use slow takes, use the
 * natural seed 1-9 takes. They won't all cut perfectly, but that's why we're
 * making many different versions, hoping one is good for each phrase."*
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHY THERE IS NO TRANSCRIPT IN THIS FILE ANY MORE
 *
 * Earlier versions of this tool cut on whisper's word offsets. Kai heard the
 * result: *"most of the reden ones just say 're', many of the i wü ones say
 * 'i'"*. Measured afterwards on the take of "i wü iatz reden": whisper places
 * "reden" at 1810ms when the word does not begin until 2490ms — a 680ms error.
 * Cut on that number and you get the end of the PREVIOUS word. A decode of the
 * clips confirmed it: candidates meant to say "reden" said "und dann" and "dem
 * anderen".
 *
 * So whisper is gone from the cutting entirely. Every boundary now comes from one
 * of two things that cannot be wrong in that way:
 *
 *   THE START AND END OF THE TAKE ITSELF — the first word of a recording begins
 *   where the speech begins, the last word ends where it ends. That needs no
 *   alignment and it is exact.
 *
 *   THE GAPS SASCHA LEFT — between those, a cut lands on a boundary between
 *   speech runs, a silence they actually left, never inside one.
 *
 * That is why every piece here is a PREFIX or a SUFFIX of a real line: 84 takes
 * begin with "i wü" and 46 end with "reden", so the words we need sit against an
 * edge that can be measured. Which gap to stop at is chosen by a plausibility
 * window, and EVERY gap in that window becomes its own candidate — that is the
 * "many different versions" Kai asked for, and his ear settles which is right.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * THE AXES, crossed deliberately: which line the words came out of; how much of
 * the silence beside them is kept (tight / medium / wide); and on glued clips how
 * long a gap sits at the join (none, a crossfade, 50 / 110 / 190ms).
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

// `win` is how long this phrase can plausibly last in Sascha's natural speech.
// It is a real constraint, not decoration: a decode of the first whisper-free
// build came back saying "mit dir reden" where "reden" was asked for, because the
// nearest gap was a word too early. Where no gap falls inside the window the take
// is REFUSED — "they won't all cut perfectly" means using the ones that do, not
// stretching to the next gap along.
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

/** The four takes Kai rejected are not source material for replacing themselves. */
const REJECTED_LINES = new Set(TARGETS.map((t) => t.words.join(' ')))

/** How much of the silence beside a cut is kept. */
const PADDINGS = [
  { id: 'tight', label: 'tight cut', frac: 0.15, cap: 60 },
  { id: 'mid', label: 'medium padding', frac: 0.5, cap: 130 },
  { id: 'wide', label: 'wide padding', frac: 0.9, cap: 260 },
]

/** Silence inserted between two glued pieces. -40 means a 40ms crossfade. */
const JOINS = [
  { id: 'butt', label: 'no gap', ms: 0 },
  { id: 'xfade', label: '40ms crossfade', ms: -40 },
  { id: 'g50', label: '50ms gap', ms: 50 },
  { id: 'g110', label: '110ms gap', ms: 110 },
  { id: 'g190', label: '190ms gap', ms: 190 },
]

/**
 * How long a given piece of Sascha's natural speech plausibly lasts.
 *
 * MEASURED FROM THEIR OWN TAKES, not guessed: across 60 natural seed 1-9 takes
 * the median is 523ms per word — about 105ms per character, which is the better
 * unit here because "i wü" and "Deitsch reden" are not the same size. Word count
 * alone put the floor for a five-word head at 800ms, and a decode came back
 * saying "Ich will Deutsch reden" for the seven-word phrase: the head had stopped
 * after two words and still passed.
 *
 * The multipliers are wide (0.55x–1.7x) because rhythm varies; they exist to
 * exclude a gap that is a whole word out, not to police delivery.
 */
const MS_PER_CHAR = 105
const windowFor = (want) => {
  const chars = want.join('').length
  return {
    // A piece of k words has to be long enough to CONTAIN k words. 210ms is the
    // 10th percentile of Sascha's own per-word rate, so this is their fastest
    // plausible delivery, not an opinion. It is what separates a cut that says
    // "i wü" from one that says "i": measured, those come out ≥780ms and ≤615ms
    // respectively. 350ms per word sits just under the 25th percentile of
    // Sascha's own rate (403ms), so it is their fast delivery, and the floor
    // lands between the two readings.
    lo: Math.max(200, Math.round(chars * MS_PER_CHAR * 0.5), want.length * 350),
    // The ceiling never drops below 900ms: "i wü" is three characters, and a
    // strict character window excluded the reading where the two words sit in
    // separate runs — which is the reading that actually contains "wü". Two short
    // words cannot be told apart from one by duration, so BOTH are offered.
    hi: Math.max(900, Math.round(chars * MS_PER_CHAR * 1.9)),
  }
}

/** Silence added where mastering left a take starting flat on the word. */
const LEAD_MS = 90
/** Silence shorter than this is inside a word (a stop closure), not a gap. */
const BRIDGE_MS = 130
const FRAME_MS = 10

const norm = (w) => String(w || '').toLowerCase().replace(/[^a-zäöüß']/g, '')
const words = (text) => String(text).split(/\s+/).map(norm).filter(Boolean)
const ms = (n) => Math.round(n)

// ───────────────────────────── measurement ──────────────────────────────────

const pcmCache = new Map()

/**
 * A 10ms RMS envelope, thresholded RELATIVE TO THIS TAKE'S OWN speech level — an
 * absolute dB gate reads a quiet take as silence. `bridged` fills any silence
 * shorter than BRIDGE_MS, because the closure inside "reden" (the d) is not the
 * end of the word.
 */
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

  const bridged = frames.map((f) => f > thr)
  for (let i = 0; i < bridged.length; i++) {
    if (bridged[i]) continue
    let j = i
    while (j < bridged.length && !bridged[j]) j++
    if (j < bridged.length && i > 0 && (j - i) * FRAME_MS < BRIDGE_MS) {
      for (let k = i; k < j; k++) bridged[k] = true
    }
    i = j - 1
  }
  const env = { frames, thr, floor, peak, bridged, durMs: frames.length * FRAME_MS }
  pcmCache.set(mp3, env)
  return env
}

/** Contiguous stretches of speech, with word-internal closures bridged. */
function speechRuns(env, minRunMs = 60) {
  const out = []
  let cur = null
  env.bridged.forEach((on, i) => {
    if (on && !cur) cur = { s: i * FRAME_MS }
    if (!on && cur) { cur.e = i * FRAME_MS; out.push(cur); cur = null }
  })
  if (cur) { cur.e = env.frames.length * FRAME_MS; out.push(cur) }
  return out.filter((r) => r.e - r.s >= minRunMs)
}

function voicedInSpan(env, aMs, bMs) {
  const a = Math.max(0, Math.round(aMs / FRAME_MS))
  const b = Math.min(env.frames.length - 1, Math.round(bMs / FRAME_MS))
  let n = 0
  for (let i = a; i <= b; i++) if (env.frames[i] > env.thr) n += FRAME_MS
  return n
}

// ─────────────────────────── piece selection ────────────────────────────────

const isPrefix = (take, want) => { const P = words(take.prompted_text); return want.every((w, i) => P[i] === w) }
const isSuffix = (take, want) => {
  const P = words(take.prompted_text)
  const o = P.length - want.length
  return o >= 0 && want.every((w, i) => P[o + i] === w)
}

/**
 * Every measured way to cut `want` off the front (or the back) of one take.
 *
 * The outer edge is that take's own first (or last) speech — exact. The inner
 * edge is a boundary BETWEEN speech runs, chosen from those inside the
 * plausibility window. Several usually qualify, and each becomes its own
 * candidate rather than this tool picking one for Kai.
 */
function measuredPieces(take, env, want, side, win) {
  const runs = speechRuns(env)
  if (!runs.length) return []
  const P = words(take.prompted_text)
  const out = []

  // The take IS the phrase: both edges are exact, no inner boundary needed.
  if (P.length === want.length) {
    return [{
      aMs: runs[0].s, bMs: runs[runs.length - 1].e,
      gapBefore: runs[0].s, gapAfter: env.durMs - runs[runs.length - 1].e,
      whole: true,
    }]
  }
  if (runs.length < 2) return []

  if (side === 'prefix') {
    const a = runs[0].s
    // A piece can never contain more speech runs than it has words.
    for (let i = 0; i < runs.length - 1 && i < want.length; i++) {
      const len = runs[i].e - a
      if (len < win.lo || len > win.hi) continue
      out.push({ aMs: a, bMs: runs[i].e, gapBefore: a, gapAfter: runs[i + 1].s - runs[i].e, runsSpanned: i + 1 })
    }
    return out
  }

  const b = runs[runs.length - 1].e
  for (let i = runs.length - 1; i > 0 && runs.length - i <= want.length; i--) {
    const len = b - runs[i].s
    if (len < win.lo || len > win.hi) continue
    out.push({ aMs: runs[i].s, bMs: b, gapBefore: runs[i].s - runs[i - 1].e, gapAfter: env.durMs - b, runsSpanned: runs.length - i })
  }
  return out
}

// ────────────────────────────── audio ───────────────────────────────────────

function ff(args) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args])
}

function cutPiece(srcMp3, startMs, endMs, outWav) {
  const dur = (endMs - startMs) / 1000
  ff(['-ss', (startMs / 1000).toFixed(3), '-t', dur.toFixed(3), '-i', srcMp3,
    '-af', `afade=t=in:st=0:d=0.008,afade=t=out:st=${Math.max(0, dur - 0.008).toFixed(3)}:d=0.008`,
    '-ar', '44100', '-ac', '1', outWav])
}

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
    const steps = []
    for (let i = 1; i < wavs.length; i++) {
      const lab = `[x${i}]`
      steps.push(`${last}[${i}:a]acrossfade=d=${d}:c1=tri:c2=tri${lab}`)
      last = lab
    }
    filter = steps.join(';')
  } else {
    const chain = []
    for (let i = 0; i < wavs.length; i++) {
      chain.push(`[${i}:a]`)
      if (i < wavs.length - 1 && joinMs > 0) chain.push(`[s${i}]`)
    }
    const sil = joinMs > 0
      ? wavs.slice(0, -1).map((_, i) => `aevalsrc=0:d=${(joinMs / 1000).toFixed(3)}:s=44100[s${i}]`).join(';') + ';'
      : ''
    filter = `${sil}${chain.join('')}concat=n=${chain.length}:v=0:a=1[out]`
    last = '[out]'
  }
  ff([...inputs, '-filter_complex', filter, '-map', last, '-codec:a', 'libmp3lame', '-q:a', '4', outMp3])
}

/**
 * Mastering trims a take's head, so a phrase-initial cut has no lead-in silence
 * left to keep, whatever padding is asked for (job #642 measured this). Silence
 * is added rather than the cut being thrown away — and it is silence, not speech.
 */
function padWithSilence(srcMp3, outMp3, headMs, tailMs) {
  const f = []
  if (headMs) f.push(`adelay=${headMs}:all=1`)
  if (tailMs) f.push(`apad=pad_dur=${(tailMs / 1000).toFixed(3)}`)
  ff(['-i', srcMp3, '-af', f.join(','), '-codec:a', 'libmp3lame', '-q:a', '4', outMp3])
}

function meanVolume(wav) {
  try {
    execFileSync('ffmpeg', ['-hide_banner', '-i', wav, '-af', 'volumedetect', '-f', 'null', '-'],
      { stdio: ['ignore', 'ignore', 'pipe'] })
    return null
  } catch (err) {
    const m = String(err.stderr || '').match(/mean_volume:\s*(-?[\d.]+) dB/)
    return m ? Number(m[1]) : null
  }
}

/** Match a glued piece's level to the first piece, so a join does not step. */
function matchLevel(wav, targetDb) {
  const db = meanVolume(wav)
  if (db == null || targetDb == null) return
  const delta = targetDb - db
  if (Math.abs(delta) < 0.8) return
  const tmp = wav.replace(/\.wav$/, '.lvl.wav')
  ff(['-i', wav, '-af', `volume=${delta.toFixed(2)}dB`, tmp])
  fs.renameSync(tmp, wav)
}

// ───────────────────────────── generation ───────────────────────────────────

function edgesOf(piece, env, pad) {
  const a = Math.max(0, piece.aMs - Math.min((piece.gapBefore ?? 0) * pad.frac, pad.cap))
  const b = Math.min(env.durMs, piece.bMs + Math.min((piece.gapAfter ?? 0) * pad.frac, pad.cap))
  return { a, b }
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(WORK, 'manifest-sources.json'), 'utf8'))
  const all = (manifest.takes || []).filter((t) => t.mp3_path)
  const takes = all.filter((t) => t.cadence === 'natural' && t.seed_number <= 9)
  const excluded = {
    slow_reads: all.filter((t) => t.cadence !== 'natural').length,
    seed_10_plus: all.filter((t) => t.cadence === 'natural' && t.seed_number > 9).length,
  }
  fs.mkdirSync(CLIPS, { recursive: true })

  const candidates = []
  const dropped = []
  let n = 0

  /** Measured pieces for one word-sequence, one per carrier line, both boundaries. */
  const piecesFor = (want, side, win) => {
    const hits = []
    const seenLine = new Set()
    for (const t of takes) {
      if (REJECTED_LINES.has(words(t.prompted_text).join(' '))) continue
      if (side === 'prefix' ? !isPrefix(t, want) : !isSuffix(t, want)) continue
      if (seenLine.has(t.prompted_text)) continue
      const env = envelope(t.mp3_path)
      const ps = measuredPieces(t, env, want, side, win || windowFor(want))
      if (!ps.length) continue
      seenLine.add(t.prompted_text)
      // At most two gaps per carrier line: variety of LINE beats variety of
      // millisecond.
      for (const p of ps.slice(0, 3)) hits.push({ t, env, p, side, want })
    }
    return hits
  }

  for (const target of TARGETS) {
    const before = candidates.length

    // ---- one piece: the phrase sits whole at the edge of some take ----------
    for (const side of ['prefix', 'suffix']) {
      for (const h of piecesFor(target.words, side).slice(0, 14)) {
        for (const pad of PADDINGS) {
          const { a, b } = edgesOf(h.p, h.env, pad)
          if (b - a < 200) continue
          const voice = voicedInSpan(h.env, a, b)
          if (voice < 90 * target.words.length) {
            dropped.push({ target: target.id, source: h.t.uuid, why: `only ${voice}ms of voice in the cut — not the whole phrase` })
            continue
          }
          const id = `${target.id}-${side === 'prefix' ? 'p' : 's'}${++n}`
          const wav = path.join(CLIPS, `${id}.wav`)
          const mp3 = path.join(CLIPS, `${id}.mp3`)
          cutPiece(h.t.mp3_path, a, b, wav)
          joinPieces([wav], 0, mp3)
          fs.unlinkSync(wav)
          const base = {
            target: target.id, kind: 'one piece',
            how: `cut off the ${side === 'prefix' ? 'start' : 'end'} of “${h.t.prompted_text}”`,
            detail: `${pad.label} · ${h.p.whole ? 'the whole line, nothing cut off' : `cut at a gap Sascha left${h.p.runsSpanned ? ` · ${h.p.runsSpanned} run${h.p.runsSpanned > 1 ? 's' : ''} of speech` : ''}`}`,
            padding: pad.id, join: null,
            sources: [{ uuid: h.t.uuid, prompted_text: h.t.prompted_text, seed: h.t.seed_number, cadence: h.t.cadence, span_ms: [ms(a), ms(b)] }],
            test_material: false,
          }
          candidates.push({ id, file: `clips/${id}.mp3`, ...base })
          if (a <= 20 || b >= h.env.durMs - 20) {
            const lid = `${id}-lead`
            padWithSilence(mp3, path.join(CLIPS, `${lid}.mp3`), a <= 20 ? LEAD_MS : 0, b >= h.env.durMs - 20 ? LEAD_MS : 0)
            candidates.push({
              id: lid, file: `clips/${lid}.mp3`, ...base, silence_added: true,
              detail: `${base.detail} · ${LEAD_MS}ms of silence added where mastering left none`,
            })
          }
        }
      }
    }

    // ---- two pieces: a measured prefix glued to a measured suffix -----------
    if (target.words.length >= 2) {
      let made = 0
      const budget = 40
      for (let i = 1; i < target.words.length && made < budget; i++) {
        const head = piecesFor(target.words.slice(0, i), 'prefix')
        const tail = piecesFor(target.words.slice(i), 'suffix')
        if (!head.length || !tail.length) {
          dropped.push({
            target: target.id,
            split: `${target.words.slice(0, i).join(' ')} + ${target.words.slice(i).join(' ')}`,
            why: !head.length ? 'no take begins with that part' : 'no take ends with that part',
          })
          continue
        }
        const pairs = Math.min(8, Math.max(head.length, tail.length))
        for (let k = 0; k < pairs && made < budget; k++) {
          const h = head[k % head.length]
          const s = tail[k % tail.length]
          const pad = PADDINGS[k % PADDINGS.length]
          for (const join of JOINS) {
            if (made >= budget) break
            const id = `${target.id}-g${++n}`
            const wavs = []
            let refDb = null, leadHead = false, leadTail = false, voice = 0
            for (const [idx, part] of [[0, h], [1, s]]) {
              const { a, b } = edgesOf(part.p, part.env, pad)
              if (idx === 0 && a <= 20) leadHead = true
              if (idx === 1 && b >= part.env.durMs - 20) leadTail = true
              voice += voicedInSpan(part.env, a, b)
              const w = path.join(CLIPS, `${id}.p${idx}.wav`)
              cutPiece(part.t.mp3_path, a, b, w)
              if (idx === 0) refDb = meanVolume(w); else matchLevel(w, refDb)
              wavs.push(w)
            }
            const mp3 = path.join(CLIPS, `${id}.mp3`)
            if (voice < 90 * target.words.length) {
              wavs.forEach((w) => fs.existsSync(w) && fs.unlinkSync(w)); n--
              dropped.push({ target: target.id, why: `only ${voice}ms of voice across the glued pieces` })
              continue
            }
            try { joinPieces(wavs, join.ms, mp3) } catch (err) {
              wavs.forEach((w) => fs.existsSync(w) && fs.unlinkSync(w)); n--
              dropped.push({ target: target.id, id, why: `ffmpeg refused the join: ${String(err.message).slice(0, 120)}` })
              continue
            }
            wavs.forEach((w) => fs.existsSync(w) && fs.unlinkSync(w))
            made++
            const base = {
              target: target.id, kind: '2 pieces',
              how: `“${h.want.join(' ')}” off the start of “${h.t.prompted_text}”  +  “${s.want.join(' ')}” off the end of “${s.t.prompted_text}”`,
              detail: `${join.label} · ${pad.label}`,
              padding: pad.id, join: join.id,
              sources: [h, s].map((x) => ({ uuid: x.t.uuid, prompted_text: x.t.prompted_text, seed: x.t.seed_number, cadence: x.t.cadence, part: x.want.join(' ') })),
              test_material: false,
            }
            candidates.push({ id, file: `clips/${id}.mp3`, ...base })
            if (leadHead || leadTail) {
              const lid = `${id}-lead`
              padWithSilence(mp3, path.join(CLIPS, `${lid}.mp3`), leadHead ? LEAD_MS : 0, leadTail ? LEAD_MS : 0)
              candidates.push({
                id: lid, file: `clips/${lid}.mp3`, ...base, silence_added: true,
                detail: `${base.detail} · ${LEAD_MS}ms of silence added where mastering left none`,
              })
              made++
            }
          }
        }
      }
    }

    if (candidates.length === before) {
      dropped.push({ target: target.id, why: 'nothing could be built for this phrase from measured edges alone' })
    }
  }

  // Duration is the one number that tells Kai at a glance whether a candidate can
  // possibly be right: at Sascha's measured 523ms per word, a 400ms "i wü reden"
  // is a fragment whatever it is labelled. Shown on every row so an outlier costs
  // him a glance, not a tap.
  for (const c of candidates) {
    try {
      const d = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=nw=1:nk=1', path.join(OUT, c.file)]).toString().trim()
      c.duration_ms = Math.round(Number(d) * 1000)
    } catch { c.duration_ms = null }
  }
  // What to tell Kai a phrase "should" last. NOT a model of it — the character
  // model says 0.3s for "i wü", while every cut that actually contains both words
  // is nearer 0.9s. So this reports the MEDIAN OF WHAT WAS BUILT, which is a
  // measurement of this material rather than a prediction about it.
  const expected = (t) => {
    const ds = candidates.filter((c) => c.target === t.id && c.duration_ms).map((c) => c.duration_ms).sort((a, b) => a - b)
    return ds.length ? ds[Math.floor(ds.length / 2)] : null
  }

  const out = {
    course: 'deu_at_for_eng',
    recordist: 'Sascha (they/them)',
    built_at: new Date().toISOString(),
    source_rule: 'natural reads from seeds 1-9 only (Kai, 2026-08-25)',
    boundary_rule: 'every cut is the start or end of a take, or a gap between speech runs — no transcript is used',
    excluded_by_source_rule: excluded,
    source_takes_read: takes.length,
    speech_rate: `${MS_PER_CHAR}ms per character, measured across 60 of Sascha's natural takes (median 523ms per word)`,
    targets: TARGETS.map((t) => ({
      ...t,
      count: candidates.filter((c) => c.target === t.id).length,
      median_ms: expected(t),
    })),
    dropped,
    candidates,
  }
  fs.writeFileSync(path.join(OUT, 'candidates.json'), JSON.stringify(out, null, 2))
  console.log(`${candidates.length} candidates from ${takes.length} takes`)
  for (const t of out.targets) console.log(`  ${t.text}: ${t.count}`)
  if (dropped.length) console.log(`  ${dropped.length} things deliberately not built (listed in candidates.json)`)
}

if (require.main === module) main()
module.exports = { envelope, speechRuns, measuredPieces, isPrefix, isSuffix, TARGETS }
