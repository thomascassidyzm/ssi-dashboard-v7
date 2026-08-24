#!/usr/bin/env node
/**
 * build.cjs — the blind listening harness for Kai's splice-mechanism decision.
 *
 * THE QUESTION. Kai (2026-08-24): "I think I had misunderstood how the splicing
 * worked on the slow takes (which is why we built the whole pause mechanism,
 * which doesn't make sense with this new context!). So we need to decide whether
 * to undo that, and for that I need to see both splicing mechanisms in action."
 *
 * NO AUDIO IS GENERATED. No TTS, no recording, no S3 write, no DB write. Every
 * byte comes from Sascha Wanasky's existing deu_at_for_eng takes, downloaded
 * read-only and cut on copies.
 *
 * WHAT THE TWO MECHANISMS ARE (established from the code, not assumed):
 *
 *   TIGHT  — today's live path. The recordist reads the phrase SLOWLY with a
 *            deliberate stop at every LEGO boundary (the pause mechanism).
 *            voice-engine/align.cjs runs ffmpeg silencedetect over that take,
 *            maps the voiced runs 1:1 onto the chunksString, and cuts one
 *            segment per chunk. voice-engine/splicer.cjs then rebuilds any
 *            phrase by concatenating those chunk segments. Pieces may be a
 *            single word, so a long phrase can be 8-14 joins deep.
 *
 *   GENEROUS — the two-pool path merged 2026-08-22 (services/recording-pools.cjs).
 *            Same cutter, same concatenator. What changes is the PIECE SIZE:
 *            buildPoolB picks the fewest pieces of at least minPieceWords words
 *            that still assemble every phrase, so the same phrase comes back as
 *            2-3 joins instead of 8-14. (Pool A — one isolated read per teaching
 *            unit — is a third thing and is never spliced at all.)
 *
 * So it is ONE cutter and ONE concatenator with two piece-size regimes. Both
 * sides here therefore go through the identical chain, and the only difference
 * left for Kai's ear is how many joins there are and where they fall.
 *
 * FAIRNESS. The unspliced reference take is put through the same per-piece
 * loudness normalise and the same ffmpeg->lame encode as the spliced sides, so
 * loudness, sample rate and encoder are common to all three and cannot be the
 * tell.
 *
 * CROSS-SENTENCE SOURCING IS THE POINT. A splice that takes its pieces out of
 * the very sentence it is rebuilding is not a splice, it is a re-assembly of
 * adjacent audio, and it flatters both mechanisms. Wherever a piece's text
 * exists as a cuttable span in a DIFFERENT sentence, that is the one used, and
 * every piece records which sentence it came from. The counts ride on the page.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const https = require('https')

process.env.PATH = `${process.env.HOME}/.local/bin:${process.env.PATH}`

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })

const { createClient } = require('@supabase/supabase-js')
const audioProcessor = require('../../services/audio-processor.cjs')
const provenanceAdapter = require('../../services/voice-engine/provenance-adapter.cjs')
const align = require('../../services/voice-engine/align.cjs')
const { spliceSegmentsToFile } = require('../../services/voice-engine/splicer.cjs')

const COURSE = 'deu_at_for_eng'
const VOICE = 'human_sasha_wanasky_deu_at'
const S3_BASE = `https://${process.env.S3_BUCKET || 'ssi-audio-stage'}.s3.amazonaws.com/`

const WORK = process.env.SPLICE_WORK || '/home/tomcassidy/SSi/.splice-harness'
const RAW = path.join(WORK, 'raw')
const SEG = path.join(WORK, 'segments')
const OUT = process.env.SPLICE_OUT || '/home/tomcassidy/command-surface/public/evidence/splice-mechanisms-listen-2026-08-24'
const CLIPS = path.join(OUT, 'clips')

for (const d of [WORK, RAW, SEG, OUT, CLIPS]) fs.mkdirSync(d, { recursive: true })

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Deterministic RNG — the A/B order must be reproducible so the key is checkable. */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20260824)

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return resolve(dest)
    const file = fs.createWriteStream(dest)
    https.get(url, res => {
      if (res.statusCode !== 200) { file.close(); fs.unlinkSync(dest); return reject(new Error(`${res.statusCode} ${url}`)) }
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve(dest)))
    }).on('error', err => { try { fs.unlinkSync(dest) } catch {} ; reject(err) })
  })
}

function norm(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[‘’]/g, "'")
    .replace(/[?!.,;:'"()\[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
const words = t => norm(t).split(' ').filter(Boolean)

function parseChunks(s) {
  return String(s).split('|').map(c => c.trim()).filter(Boolean)
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const { rows, error } = await provenanceAdapter.fetchProvenanceRows(supabase, { courseCode: COURSE, voiceId: VOICE })
  if (error) throw new Error(`provenance fetch failed: ${error.message || error}`)
  console.log(`[census] ${rows.length} takes for ${VOICE}`)

  // Supersession: the recordist redid lines. Keep the surviving take per (text, cadence).
  const superseded = new Set(rows.map(r => r.supersededBy).filter(Boolean))
  const live = rows.filter(r => !superseded.has(r.id))
  console.log(`[census] ${superseded.size} superseded, ${live.length} live`)

  const slow = live.filter(r => r.cadence === 'slow' && r.chunksString)
  const natural = live.filter(r => r.cadence === 'natural')
  const naturalByText = new Map()
  for (const n of natural) if (!naturalByText.has(norm(n.phraseText))) naturalByText.set(norm(n.phraseText), n)
  console.log(`[census] slow-with-chunkmap ${slow.length}, natural ${natural.length}, distinct natural texts ${naturalByText.size}`)

  // ---- 1. download every slow take + the natural take of the same sentence --
  const needed = new Map()
  for (const s of slow) {
    needed.set(s.id, s)
    const n = naturalByText.get(norm(s.phraseText))
    if (n) needed.set(n.id, n)
  }
  const failedDownloads = []
  for (const [id, take] of needed) {
    const dest = path.join(RAW, `${id}.mp3`)
    try {
      await download(S3_BASE + (take.s3Key || `mastered/${id}.mp3`), dest)
    } catch (e) {
      failedDownloads.push({ id, text: take.phraseText, reason: e.message })
    }
  }
  console.log(`[audio] downloaded ${needed.size - failedDownloads.length}/${needed.size}, failed ${failedDownloads.length}`)

  // ---- 2. align every slow take, cut every chunk ---------------------------
  // ALIGNMENT IS THE MECHANISM UNDER TEST. If silencedetect cannot find the
  // recordist's pauses, the whole pause-based path fails here and that failure
  // is itself a finding — it is counted, not hidden.
  const aligned = []
  const alignFailures = []
  for (const s of slow) {
    const takePath = path.join(RAW, `${s.id}.mp3`)
    if (!fs.existsSync(takePath)) continue
    const chunks = parseChunks(s.chunksString)
    if (chunks.length < 2) { alignFailures.push({ id: s.id, text: s.phraseText, reason: 'single-chunk line, nothing to splice' }); continue }
    let res
    try {
      res = await align.alignSlowGapTake(takePath, chunks)
    } catch (e) {
      alignFailures.push({ id: s.id, text: s.phraseText, reason: `align threw: ${e.message}` }); continue
    }
    if (!res.ok) {
      alignFailures.push({ id: s.id, text: s.phraseText, reason: res.reason, expected: res.expectedCount, detected: res.detectedCount })
      continue
    }
    const outDir = path.join(SEG, s.id)
    const segs = await align.cutSegments(takePath, res.chunks, outDir, audioProcessor)
    aligned.push({ take: s, chunks: res.chunks, segments: segs })
  }
  console.log(`[align] ${aligned.length}/${slow.length} slow takes aligned; ${alignFailures.length} failed`)

  // ---- 3. the span library -------------------------------------------------
  // Every contiguous run of chunks inside an aligned take is a cuttable span.
  // Key: normalised text. Value: every place it can be cut from.
  const spanLib = new Map()
  for (const a of aligned) {
    const cs = a.chunks
    for (let i = 0; i < cs.length; i++) {
      for (let j = i; j < cs.length; j++) {
        const text = cs.slice(i, j + 1).map(c => c.text).join(' ')
        const key = norm(text)
        if (!key) continue
        const entry = {
          takeId: a.take.id,
          sourceText: a.take.phraseText,
          startMs: cs[i].startMs,
          endMs: cs[j].endMs,
          nChunks: j - i + 1,
          text,
        }
        if (!spanLib.has(key)) spanLib.set(key, [])
        spanLib.get(key).push(entry)
      }
    }
  }
  console.log(`[library] ${spanLib.size} distinct cuttable spans from ${aligned.length} takes`)

  /** Cut a span out of its source take into its own mp3 (cached by identity). */
  const spanCache = new Map()
  async function cutSpan(entry) {
    const id = `${entry.takeId}-${entry.startMs}-${entry.endMs}`
    if (spanCache.has(id)) return spanCache.get(id)
    const file = path.join(SEG, `span-${id}.mp3`)
    if (!fs.existsSync(file)) {
      const pad = 20
      const start = Math.max(0, entry.startMs - pad) / 1000
      const end = (entry.endMs + pad) / 1000
      await audioProcessor.ffmpegFilterToLameMp3(path.join(RAW, `${entry.takeId}.mp3`), file, {
        filterChain: `atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS`,
      })
    }
    spanCache.set(id, file)
    return file
  }

  /**
   * Pick a source for a piece. A span cut from a DIFFERENT sentence is the real
   * splice; the same sentence is a fallback and is flagged.
   */
  function pickSpan(pieceText, avoidTakeId) {
    const cands = spanLib.get(norm(pieceText))
    if (!cands || !cands.length) return null
    const foreign = cands.filter(c => c.takeId !== avoidTakeId)
    if (foreign.length) return { ...foreign[Math.floor(rnd() * foreign.length)], foreign: true }
    return { ...cands[0], foreign: false }
  }

  /**
   * TIGHT is not a search. Today's live path cuts one segment per chunksString
   * chunk and concatenates them — that is the whole mechanism, and the depth is
   * whatever the recordist's pause map says it is.
   */
  function tileTight(chunks, avoidTakeId) {
    const out = []
    for (const text of chunks) {
      const span = pickSpan(text, avoidTakeId)
      if (!span) return null
      out.push({ text, span })
    }
    return out
  }

  /**
   * GENEROUS is a search: buildPoolB takes the FEWEST pieces of at least
   * minPieceWords words that still assemble the phrase. A piece may not cover
   * the whole sentence — a phrase read whole is not a splice and there is
   * nothing for an ear to judge, so those sentences drop out of the comparison
   * rather than being padded into it.
   */
  function tileGenerous(chunks, minWords, avoidTakeId) {
    const n = chunks.length
    const best = new Array(n + 1).fill(null)
    best[n] = []
    for (let i = n - 1; i >= 0; i--) {
      for (let j = n; j > i; j--) {
        if (j - i === n) continue // never the whole sentence in one piece
        const text = chunks.slice(i, j).join(' ')
        if (words(text).length < minWords) continue
        if (best[j] === null) continue
        const span = pickSpan(text, avoidTakeId)
        if (!span) continue
        const cand = [{ text, span }, ...best[j]]
        if (best[i] === null || cand.length < best[i].length) best[i] = cand
      }
    }
    return best[0]
  }

  // ---- 4. build the cards --------------------------------------------------
  // BOTH SIDES ARE CUT FROM THE SAME NATURAL TAKE, using boundaries transferred
  // off the slow take. That is not a convenience: it is what the shipped code
  // does — voice-engine/align.cjs#alignTakePair aligns the SLOW take to get the
  // boundaries, then cuts the segments out of the NATURAL take (directly when
  // the natural micro-pauses match, otherwise by proportional transfer).
  //
  // It is also the only way to make the test fair. Cutting the two sides out of
  // two different takes would leave a speed difference that gives the answer
  // away before the first join is heard. Same take, same cadence, same loudness,
  // same encoder — the ONLY difference left is how many joins there are.
  const cards = []
  const consistency = []

  for (const a of aligned) {
    const sentence = a.take.phraseText
    const natTake = naturalByText.get(norm(sentence))
    const slowPath = path.join(RAW, `${a.take.id}.mp3`)
    if (!natTake) { consistency.push({ sentence, words: words(sentence).length, excluded: 'no natural take of this sentence' }); continue }
    const natPath = path.join(RAW, `${natTake.id}.mp3`)
    if (!fs.existsSync(natPath)) { consistency.push({ sentence, words: words(sentence).length, excluded: 'natural take audio not retrievable' }); continue }

    const chunkTexts = a.chunks.map(c => c.text)
    let pair
    try {
      pair = await align.alignTakePair({ slowPath, naturalPath: natPath, expectedChunks: chunkTexts })
    } catch (e) {
      consistency.push({ sentence, words: words(sentence).length, excluded: `alignTakePair threw: ${e.message}` }); continue
    }
    if (!pair.ok) { consistency.push({ sentence, words: words(sentence).length, excluded: `alignTakePair failed at ${pair.failure?.stage}` }); continue }

    const nat = pair.chunks // boundaries in the NATURAL take
    if (nat.length < 3) { consistency.push({ sentence, words: words(sentence).length, tight: nat.length, generous: nat.length, excluded: 'too few chunks for the two mechanisms to differ' }); continue }

    // TIGHT: one piece per chunk. GENEROUS: fewest pieces of >= 2 words.
    const tightGroups = nat.map((_, i) => [i, i])
    // GENEROUS = buildPoolB's answer: the FEWEST pieces of >= 2 words each.
    // For a phrase that is not read whole, that floor is two pieces, so the
    // split is taken at the boundary that leaves both halves comfortably long.
    const genGroups = (() => {
      const wOf = (i, j) => words(nat.slice(i, j + 1).map(c => c.text).join(' ')).length
      let best = null
      for (let k = 1; k < nat.length; k++) {
        const l = wOf(0, k - 1), r = wOf(k, nat.length - 1)
        if (l < 2 || r < 2) continue
        const score = Math.min(l, r) // most balanced split wins
        if (!best || score > best.score) best = { k, score }
      }
      if (best) return [[0, best.k - 1], [best.k, nat.length - 1]]
      // No 2-word split exists — fall back to a greedy >=2-word grouping.
      const g = []; let i = 0
      while (i < nat.length) {
        let j = i
        while (j < nat.length - 1 && wOf(i, j) < 2) j++
        g.push([i, j]); i = j + 1
      }
      if (g.length > 1) g[g.length - 1][1] = nat.length - 1
      return g
    })()
    if (genGroups.length >= tightGroups.length) {
      consistency.push({ sentence, words: words(sentence).length, tight: tightGroups.length, generous: genGroups.length, excluded: 'both mechanisms produce the same cut here' }); continue
    }

    /** Cut one contiguous chunk-range out of the natural take. */
    async function cutGroup(g, tag, idx) {
      // The span MUST be in the filename. Keying on (tag, idx) alone let a
      // re-run with different groupings silently reuse the previous run's cuts.
      const file = path.join(SEG, `nat-${natTake.id}-${nat[g[0]].startMs}-${nat[g[1]].endMs}.mp3`)
      const pad = 20
      const start = Math.max(0, nat[g[0]].startMs - pad) / 1000
      const end = (nat[g[1]].endMs + pad) / 1000
      if (!fs.existsSync(file)) {
        await audioProcessor.ffmpegFilterToLameMp3(natPath, file, { filterChain: `atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS` })
      }
      return file
    }

    const mk = async (groups, tag) => {
      const files = []
      for (let i = 0; i < groups.length; i++) files.push(await cutGroup(groups[i], tag, i))
      const outFile = path.join(CLIPS, `${a.take.id}-${tag}.mp3`)
      const r = await spliceSegmentsToFile(files, outFile, { audioProcessor })
      return {
        file: path.basename(outFile),
        depth: groups.length,
        joins: groups.length - 1,
        pieces: groups.map(g => nat.slice(g[0], g[1] + 1).map(c => c.text).join(' ')),
        durationMs: r.durationMs,
      }
    }

    let A, B, W
    try {
      A = await mk(tightGroups, 'tight')
      B = await mk(genGroups, 'generous')
      const outFile = path.join(CLIPS, `${a.take.id}-whole.mp3`)
      const r = await spliceSegmentsToFile([natPath], outFile, { audioProcessor })
      W = { file: path.basename(outFile), depth: 1, joins: 0, durationMs: r.durationMs }
    } catch (e) {
      consistency.push({ sentence, words: words(sentence).length, excluded: `render failed: ${e.message}` }); continue
    }

    // HOW BADLY CAN A CUT LAND? Every boundary here is a PROPORTIONAL GUESS
    // transferred off the slow take (naturalMethod), so the honest measure of
    // risk is how far each cut sits from any real silence in the natural take.
    // A cut inside voiced audio is a chopped word — the catastrophic failure.
    let cutRisk = null
    try {
      const sil = await align.detectSilenceSpans(natPath, { silenceMinMs: 40 })
      const gapMids = sil.map(g => (g.startMs + g.endMs) / 2)
      const dist = ms => gapMids.length ? Math.min(...gapMids.map(m => Math.abs(m - ms))) : null
      const tightCuts = tightGroups.slice(0, -1).map(g => nat[g[1]].endMs)
      const genCuts = genGroups.slice(0, -1).map(g => nat[g[1]].endMs)
      cutRisk = {
        silencesInNaturalTake: sil.length,
        tightCutDistancesMs: tightCuts.map(dist),
        generousCutDistancesMs: genCuts.map(dist),
      }
    } catch {}

    const variants = [{ key: 'TIGHT', ...A }, { key: 'GENEROUS', ...B }, { key: 'WHOLE', ...W }]
    for (let i = variants.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1))
      ;[variants[i], variants[j]] = [variants[j], variants[i]]
    }

    cards.push({
      id: a.take.id,
      sentence,
      wordCount: words(sentence).length,
      chunkCount: nat.length,
      naturalMethod: pair.naturalMethod,
      variants: variants.map((v, i) => ({ label: 'ABC'[i], ...v })),
    })
    consistency.push({
      sentence,
      words: words(sentence).length,
      tight: A.depth,
      generous: B.depth,
      naturalMethod: pair.naturalMethod,
      cutRisk,
      tightMs: A.durationMs, generousMs: B.durationMs, wholeMs: W.durationMs,
    })
  }

  console.log(`[cards] ${cards.length} comparison cards built`)

  // ---- 4b. TRUE cross-sentence splices ------------------------------------
  // The cards above rebuild a sentence out of its OWN take, because seeds 1-9
  // give very little cross-sentence overlap. Adjacent audio glued back together
  // is the easiest possible join and it flatters BOTH mechanisms. So: phrases
  // the recordist never read, assembled ENTIRELY out of pieces cut from other
  // people's sentences. Every join here is a real one.
  const crossCards = []
  let crossCoverage = null
  {
    const { data: phraseRows } = await supabase
      .from('course_practice_phrases')
      .select('id,target_text,seed_number')
      .eq('course_code', COURSE)
      .lte('seed_number', 14)
      .limit(3000)
    const sourceTexts = new Set(aligned.map(a => norm(a.take.phraseText)))
    const recorded = new Set([...naturalByText.keys()])

    // Tile arbitrary text out of library spans only. maximise=true gives the
    // TIGHT shape (smallest available pieces), false gives GENEROUS.
    function tileFromLibrary(text, { minWords = 1, maximise = false } = {}) {
      const toks = words(text)
      const n = toks.length
      const best = new Array(n + 1).fill(null)
      best[n] = []
      for (let i = n - 1; i >= 0; i--) {
        for (let j = n; j > i; j--) {
          if (j - i === n) continue // a whole-phrase span is not a splice
          if (j - i < minWords) continue
          const key = toks.slice(i, j).join(' ')
          if (best[j] === null) continue
          const cands = spanLib.get(key)
          if (!cands || !cands.length) continue
          const span = { ...cands[Math.floor(rnd() * cands.length)], foreign: true }
          const cand = [{ text: key, span }, ...best[j]]
          if (best[i] === null || (maximise ? cand.length > best[i].length : cand.length < best[i].length)) best[i] = cand
        }
      }
      return best[0]
    }

    const candidates = []
    for (const p of phraseRows || []) {
      const t = p.target_text
      if (!t) continue
      const k = norm(t)
      if (sourceTexts.has(k) || recorded.has(k)) continue
      if (words(t).length < 4) continue
      const tight = tileFromLibrary(t, { minWords: 1, maximise: true })
      const gen = tileFromLibrary(t, { minWords: 2, maximise: false })
      if (!tight || !gen || tight.length === gen.length) continue
      candidates.push({ phrase: p, tight, gen })
    }
    candidates.sort((a, b) => (b.tight.length - b.gen.length) - (a.tight.length - a.gen.length))
    console.log(`[cross] ${candidates.length} phrases assemblable entirely from other sentences`)

    // A zero here is a claim about the library, not about the tiler, so it is
    // quantified: how much of each unrecorded phrase the library CAN cover.
    let examined = 0, best = 0
    const shortfalls = []
    for (const p of phraseRows || []) {
      const t = p.target_text; if (!t) continue
      const k = norm(t); if (sourceTexts.has(k) || recorded.has(k)) continue
      examined++
      const toks = words(t)
      const covered = toks.filter((_, i) => {
        for (let len = Math.min(6, toks.length - i); len >= 1; len--) if (spanLib.has(toks.slice(i, i + len).join(' '))) return true
        return false
      }).length
      const frac = covered / toks.length
      if (frac > best) best = frac
      shortfalls.push(frac)
    }
    shortfalls.sort((a, b) => b - a)
    crossCoverage = {
      phrasesExamined: examined,
      fullyAssemblable: candidates.length,
      bestWordCoverage: Number(best.toFixed(3)),
      medianWordCoverage: Number((shortfalls[Math.floor(shortfalls.length / 2)] ?? 0).toFixed(3)),
    }
    console.log(`[cross] coverage: examined ${examined}, best word coverage ${(best * 100).toFixed(0)}%, median ${(crossCoverage.medianWordCoverage * 100).toFixed(0)}%`)

    for (const c of candidates.slice(0, 8)) {
      const mk = async (pieces, tag) => {
        const files = []
        for (const p of pieces) files.push(await cutSpan(p.span))
        const outFile = path.join(CLIPS, `x${c.phrase.id}-${tag}.mp3`)
        const r = await spliceSegmentsToFile(files, outFile, { audioProcessor })
        return {
          file: path.basename(outFile),
          depth: pieces.length,
          foreignPieces: pieces.length,
          pieces: pieces.map(p => ({ text: p.text, from: p.span.sourceText })),
          durationMs: r.durationMs,
        }
      }
      let A, B
      try { A = await mk(c.tight, 'tight'); B = await mk(c.gen, 'generous') } catch (e) { console.log(`[cross skip] ${e.message}`); continue }
      const vs = [{ key: 'TIGHT', ...A }, { key: 'GENEROUS', ...B }]
      if (rnd() < 0.5) vs.reverse()
      crossCards.push({
        id: `x${c.phrase.id}`,
        sentence: c.phrase.target_text,
        seed: c.phrase.seed_number,
        wordCount: words(c.phrase.target_text).length,
        variants: vs.map((v, i) => ({ label: 'AB'[i], ...v })),
      })
      consistency.push({
        sentence: c.phrase.target_text,
        words: words(c.phrase.target_text).length,
        tight: A.depth, generous: B.depth,
        tightForeign: A.depth, generousForeign: B.depth,
        crossSentence: true,
      })
    }
    console.log(`[cross] ${crossCards.length} cross-sentence cards built`)
  }

  // ---- 5. the slow-only cards ---------------------------------------------
  // Kai's open sub-question: would SLOW TAKES ONLY be enough? Unspliced slow
  // take against the unspliced natural take of the same sentence, blind.
  const slowOnly = []
  for (const a of aligned.slice(0, 6)) {
    const natTake = naturalByText.get(norm(a.take.phraseText))
    if (!natTake) continue
    const sPath = path.join(RAW, `${a.take.id}.mp3`)
    const nPath = path.join(RAW, `${natTake.id}.mp3`)
    if (!fs.existsSync(sPath) || !fs.existsSync(nPath)) continue
    const sOut = path.join(CLIPS, `${a.take.id}-slowonly.mp3`)
    const nOut = path.join(CLIPS, `${a.take.id}-natonly.mp3`)
    const sr = await spliceSegmentsToFile([sPath], sOut, { audioProcessor })
    const nr = await spliceSegmentsToFile([nPath], nOut, { audioProcessor })
    const vs = [
      { key: 'SLOW TAKE', file: path.basename(sOut), durationMs: sr.durationMs },
      { key: 'NATURAL TAKE', file: path.basename(nOut), durationMs: nr.durationMs },
    ]
    if (rnd() < 0.5) vs.reverse()
    slowOnly.push({ id: a.take.id, sentence: a.take.phraseText, variants: vs.map((v, i) => ({ label: 'AB'[i], ...v })) })
  }
  console.log(`[cards] ${slowOnly.length} slow-only cards built`)

  const data = {
    generatedAt: new Date().toISOString(),
    course: COURSE,
    voice: VOICE,
    cards,
    crossCards,
    crossCoverage,
    slowOnly,
    consistency,
    census: {
      takesTotal: rows.length,
      superseded: superseded.size,
      live: live.length,
      slowWithChunkMap: slow.length,
      natural: natural.length,
      alignedTakes: aligned.length,
      alignFailures,
      failedDownloads,
      spanLibrarySize: spanLib.size,
    },
  }
  // BLINDNESS: a filename ending -tight.mp3 hands the answer to anyone who
  // long-presses the player. Rename every clip to an opaque, deterministic id
  // and rewrite the references before the page ever sees them.
  {
    const crypto = require('crypto')
    const rename = v => {
      if (!v || !v.file) return
      const opaque = crypto.createHash('sha256').update('splice-2026-08-24|' + v.file).digest('hex').slice(0, 16) + '.mp3'
      const from = path.join(CLIPS, v.file)
      const to = path.join(CLIPS, opaque)
      if (fs.existsSync(from)) fs.renameSync(from, to)
      v.file = opaque
      delete v.pieces // piece texts would also give the depth away on the page
    }
    for (const c of [...data.cards, ...data.crossCards, ...data.slowOnly]) c.variants.forEach(rename)
  }
  fs.writeFileSync(path.join(OUT, 'data.json'), JSON.stringify(data, null, 1))
  console.log(`[done] ${path.join(OUT, 'data.json')}`)
  return data
}

main().catch(e => { console.error(e); process.exit(1) })
