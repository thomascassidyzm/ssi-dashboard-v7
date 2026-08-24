// spliceMechanisms.js — the TWO mechanisms, in the browser, on the bench.
//
// Kai named them himself (2026-08-24):
//   (a) splice the SLOW take, cutting it at its PAUSES
//   (b) splice the NATURAL take, using the RHYTHM of the slow take as the guide
//
// Both are real and both are in services/voice-engine/align.cjs, as two
// branches of alignTakePair(). This file ports that decision tree and
// transferBoundaries() verbatim onto Web Audio PCM, so the bench runs the same
// rules the server runs. The slow-gap detector and the joiner come from
// src/utils/takeSplice.js, which is itself the shipped in-browser port.
//
// NOTHING HERE INVENTS A POLICY. Where a constant appears it is the one in
// align.cjs. Where the bench exposes a setting, it is a constant that align.cjs
// also has — the bench lets Kai move it, it does not add new ones.

import {
  SPLICE_CONFIG, detectVoicedRegions, sliceChunk, concatChunks, peakNormalise,
} from './takeSplice.js'

export { SPLICE_CONFIG }

/**
 * Map voiced regions 1:1 onto the expected chunk texts.
 * Ported from align.cjs#mapVoicedToChunks INCLUDING its refusal: a count
 * mismatch is a hard failure and is never papered over by redistributing
 * boundaries. That refusal is the QA gate, and it is a thing Kai should see
 * happen rather than be protected from.
 */
export function mapVoicedToChunks(regions, expectedChunks, method = 'slow-gap') {
  if (regions.length !== expectedChunks.length) {
    return {
      ok: false,
      reason: `chunk-count mismatch — expected ${expectedChunks.length}, detected ${regions.length} voiced regions`,
      expectedCount: expectedChunks.length,
      detectedCount: regions.length,
      regions,
    }
  }
  return {
    ok: true,
    chunks: regions.map((r, i) => ({
      text: expectedChunks[i],
      startMs: r.startMs,
      endMs: r.endMs,
      durationMs: r.endMs - r.startMs,
      confidence: 1,
      method,
    })),
  }
}

/**
 * Transfer slow-take chunk boundaries onto a continuous natural take by
 * voiced-duration proportion. Ported verbatim from align.cjs#transferBoundaries.
 *
 * The slow take's gaps are DROPPED; each chunk's share of the total voiced time
 * maps linearly onto the natural take's voiced span. This is the "rhythm of the
 * slow take" Kai means, and it assumes speech rate scales uniformly between the
 * two takes — an approximation, which is why the confidence is 0.5 and the
 * method is labelled 'transferred' everywhere it appears.
 */
export function transferBoundaries(slowChunks, naturalStartMs, naturalEndMs) {
  if (!slowChunks?.length) throw new Error('transferBoundaries: no slow chunks')
  if (!(naturalEndMs > naturalStartMs)) throw new Error('transferBoundaries: empty natural span')
  const totalVoiced = slowChunks.reduce((s, c) => s + (c.endMs - c.startMs), 0)
  if (totalVoiced <= 0) throw new Error('transferBoundaries: slow take has no voiced time')

  const span = naturalEndMs - naturalStartMs
  const out = []
  let cum = 0
  for (const c of slowChunks) {
    const startFrac = cum / totalVoiced
    cum += (c.endMs - c.startMs)
    const endFrac = cum / totalVoiced
    out.push({
      text: c.text,
      startMs: Math.round(naturalStartMs + startFrac * span),
      endMs: Math.round(naturalStartMs + endFrac * span),
      confidence: 0.5,
      method: 'transferred',
    })
  }
  for (const c of out) c.durationMs = c.endMs - c.startMs
  return out
}

/** The voiced span of a take, lead and tail silence trimmed. */
export function voicedSpan(samples, sampleRate, opts) {
  const { regions, ...det } = detectVoicedRegions(samples, sampleRate, opts)
  if (!regions.length) return null
  return { startMs: regions[0].startMs, endMs: regions[regions.length - 1].endMs, regions, detection: det }
}

/**
 * MECHANISM A — cut the SLOW take at its pauses.
 *
 * align.cjs reaches this when there is no natural take: it aligns the slow take
 * and cuts the segments straight out of it (cadence 'slow'). The pieces
 * therefore carry the slow read's own delivery.
 */
export function mechanismA({ slow, expectedChunks, opts = {} }) {
  const det = detectVoicedRegions(slow.samples, slow.sampleRate, opts)
  const mapped = mapVoicedToChunks(det.regions, expectedChunks, 'slow-gap')
  if (!mapped.ok) return { ok: false, mechanism: 'A', detection: det, ...mapped }
  return {
    ok: true,
    mechanism: 'A',
    label: 'cut the SLOW take at its pauses',
    cutFrom: 'slow',
    detection: det,
    chunks: mapped.chunks,
    source: slow,
  }
}

/**
 * MECHANISM B — cut the NATURAL take, guided by the slow take's rhythm.
 *
 * align.cjs#alignTakePair, the branch that runs whenever a natural take exists.
 * It aligns the SLOW take first (that is the only place the chunk map can come
 * from), then:
 *   1. tries plain silence detection on the NATURAL take — if the count happens
 *      to match, those boundaries are real and are used ('direct');
 *   2. otherwise stretches the slow take's voiced-duration ratios across the
 *      natural take's voiced span ('transferred').
 *
 * Step 1 essentially never fires on real material, which is worth watching
 * happen on the bench rather than taking on trust.
 */
export function mechanismB({ slow, natural, expectedChunks, opts = {} }) {
  const slowDet = detectVoicedRegions(slow.samples, slow.sampleRate, opts)
  const slowMapped = mapVoicedToChunks(slowDet.regions, expectedChunks, 'slow-gap')
  if (!slowMapped.ok) {
    return { ok: false, mechanism: 'B', stage: 'slow-align', detection: slowDet, ...slowMapped }
  }

  const natDet = detectVoicedRegions(natural.samples, natural.sampleRate, opts)
  const direct = mapVoicedToChunks(natDet.regions, expectedChunks, 'direct')
  if (direct.ok) {
    return {
      ok: true, mechanism: 'B', label: 'cut the NATURAL take, guided by the slow take',
      cutFrom: 'natural', naturalMethod: 'direct',
      detection: natDet, slowChunks: slowMapped.chunks, chunks: direct.chunks, source: natural,
    }
  }

  if (!natDet.regions.length) {
    return { ok: false, mechanism: 'B', stage: 'natural-voiced-span', reason: 'no voiced audio detected in the clear take', detection: natDet }
  }
  const spanStart = natDet.regions[0].startMs
  const spanEnd = natDet.regions[natDet.regions.length - 1].endMs
  const chunks = transferBoundaries(slowMapped.chunks, spanStart, spanEnd)
  return {
    ok: true, mechanism: 'B', label: 'cut the NATURAL take, guided by the slow take',
    cutFrom: 'natural', naturalMethod: 'transferred',
    directFailure: direct.reason,
    detection: natDet, slowChunks: slowMapped.chunks, chunks, source: natural,
  }
}

/** Cut one aligned result into per-piece Float32Arrays. */
export function cutPieces(result, opts = {}) {
  const padMs = opts.PAD_MS ?? SPLICE_CONFIG.PAD_MS
  const { samples, sampleRate } = result.source
  return result.chunks.map(c => ({
    text: c.text,
    startMs: c.startMs,
    endMs: c.endMs,
    method: c.method,
    samples: sliceChunk(samples, sampleRate, c.startMs, c.endMs, padMs),
  }))
}

/** Glue pieces back into one phrase, the way the server's joiner does. */
export function joinPieces(pieces, sampleRate, opts = {}) {
  return concatChunks(pieces.map(p => p.samples), sampleRate, opts)
}

// ---------------------------------------------------------------------------
// Phrase assembly — the thing that tells him whether it is trustworthy
// ---------------------------------------------------------------------------

export function normText(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[‘’]/g, "'")
    .replace(/[?!.,;:'"()\[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
export const wordsOf = t => normText(t).split(' ').filter(Boolean)

/**
 * Build a library of cuttable spans from every aligned take.
 * A span is any CONTIGUOUS run of chunks inside one take — contiguous because
 * that is the only thing that can be cut out in one piece.
 */
export function buildSpanLibrary(alignedTakes) {
  const lib = new Map()
  for (const t of alignedTakes) {
    const cs = t.chunks
    for (let i = 0; i < cs.length; i++) {
      for (let j = i; j < cs.length; j++) {
        const text = cs.slice(i, j + 1).map(c => c.text).join(' ')
        const key = normText(text)
        if (!key) continue
        const entry = {
          text, key,
          fromLine: t.lineText,
          takeId: t.id,
          startMs: cs[i].startMs,
          endMs: cs[j].endMs,
          nChunks: j - i + 1,
          source: t.source,
          method: cs[i].method,
        }
        if (!lib.has(key)) lib.set(key, [])
        lib.get(key).push(entry)
      }
    }
  }
  return lib
}

/**
 * Assemble a target phrase out of library spans.
 *
 * `minPieceWords` is recording-pools.cjs's DEFAULT_MIN_PIECE_WORDS — the
 * smallest piece a phrase may be built from. `maxPieces` is the splice-depth
 * cap swept on 2026-08-24. Both are exposed on the bench because both change
 * what he hears.
 *
 * Returns the FEWEST-piece assembly, or null with the words it could not cover.
 */
export function assemblePhrase(targetText, lib, { minPieceWords = 1, maxPieces = Infinity } = {}) {
  const toks = wordsOf(targetText)
  const n = toks.length
  const best = new Array(n + 1).fill(null)
  best[n] = []
  for (let i = n - 1; i >= 0; i--) {
    for (let j = n; j > i; j--) {
      if (j - i < minPieceWords) continue
      if (best[j] === null) continue
      const cands = lib.get(toks.slice(i, j).join(' '))
      if (!cands || !cands.length) continue
      const cand = [{ span: cands[0], alternatives: cands.length }, ...best[j]]
      if (best[i] === null || cand.length < best[i].length) best[i] = cand
    }
  }
  const got = best[0]
  if (!got) {
    // Report the words AS WRITTEN, not as normalised — "wu" and "ubn" on the
    // screen read as gibberish and hide the actual missing word from him.
    const shown = String(targetText).trim().split(/\s+/)
    const uncovered = i => {
      for (let len = Math.min(8, n - i); len >= minPieceWords; len--) if (lib.has(toks.slice(i, i + len).join(' '))) return false
      return true
    }
    // Distinguish "you never said this word" from "you said it, but at this
    // piece-size setting there is no legal way to cut it out". Those need
    // opposite instructions, and getting it wrong tells him to re-record
    // something he has already recorded. A word counts as SAID if it appears
    // anywhere inside any span, not only as a span of its own.
    const said = new Set()
    for (const key of lib.keys()) for (const w of key.split(' ')) said.add(w)
    const uncoveredIdx = toks.map((_, i) => i).filter(uncovered)
    const onlyAsShortPieces = minPieceWords > 1 && uncoveredIdx.every(i => said.has(toks[i]))
    const missing = uncoveredIdx.map(i => shown[i] ?? toks[i])
    return {
      ok: false,
      reason: onlyAsShortPieces
        ? 'you recorded all of this — at this piece size there is no legal way to cut it out'
        : 'cannot be assembled from what is recorded',
      onlyAsShortPieces,
      missing,
    }
  }
  if (got.length > maxPieces) {
    return { ok: false, reason: `needs ${got.length} pieces, more than the cap of ${maxPieces}`, wouldNeed: got.length }
  }
  return { ok: true, pieces: got, depth: got.length, joins: got.length - 1 }
}

/** Cut and glue an assembly into one phrase. */
export function renderAssembly(assembly, sampleRate, opts = {}) {
  const padMs = opts.PAD_MS ?? SPLICE_CONFIG.PAD_MS
  const pieces = assembly.pieces.map(p => ({
    text: p.span.text,
    fromLine: p.span.fromLine,
    samples: sliceChunk(p.span.source.samples, p.span.source.sampleRate, p.span.startMs, p.span.endMs, padMs),
  }))
  return { pieces, samples: concatChunks(pieces.map(p => p.samples), sampleRate, opts) }
}

export { peakNormalise }
