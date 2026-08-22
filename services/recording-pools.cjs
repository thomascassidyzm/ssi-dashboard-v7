// services/recording-pools.cjs
//
// TWO POOLS, TWO PURPOSES, AND THEY MUST NOT MIX. Kai's ruling, 2026-08-21.
//
//   POOL A — the isolated list. Every LEGO and every component of a LEGO gets
//     ONE clear read, on its own, in a list. That clip is the unit's own
//     TEACHING audio — what a learner hears when the unit is taught by itself.
//     It is NEVER spliced into a phrase: read in isolation it carries no phrase
//     prosody and spliced in it sounds strange. The guard for that lives in
//     services/voice-engine/provenance-adapter.cjs (cadence 'isolated' never
//     enters the segment store), not here.
//
//   POOL B — the slow phrase reads. The ONLY source of splice material.
//
// WHAT THE SPLIT BUYS. Before it, the slow read had TWO jobs: hand back every
// teaching unit as its own clip, AND yield pieces that rebuild every phrase.
// The first job is what forced a stop around every one-word LEGO. Pool A takes
// that job away, so Pool B's only remaining obligation is reassembly.
//
// THE HARD RULE (Kai, non-negotiable): 100% coverage no matter what — every
// phrase in the course must be assemblable from Pool B pieces, with no phrase
// incomplete. That is a RECONSTRUCTION test (buildPoolB verifies it and
// verifyAssembly re-runs it), never the "the words appear somewhere in what
// will be read" test that produced the fake 100% the tool reported until now.
//
// WHY SPANS, NOT CHUNKS. A slow take is one continuous recording with pauses at
// its cut points, so the pieces it yields are not only the chunks between
// ADJACENT cuts — they are every span between ANY two cut points, because
// adjacent chunks inside one take concatenate seamlessly. Modelling that is
// what makes the hard rule affordable at all.
//
// Pure functions, no I/O.

const {
  normalizeForMatching,
  tokenize,
  chunkPhraseByLegos,
  mergeGlueIntoLegos,
} = require('./voice-engine/chunking.cjs')

// Longest piece the splicer will ever be asked to find in one take. Matches the
// planner's max-munch window plus headroom; spans longer than this are not
// indexed, which keeps the span sets small without changing any answer (a
// longer span always has a shorter decomposition available).
const MAX_SPAN_WORDS = 12

// Smallest piece a phrase may be assembled FROM. 1 = a single word may be
// spliced. Raising it forbids word-sized splice material, which sounds better
// but forces far more lines to be read whole — see the exchange rate measured
// on deu_at_for_eng in docs/recording/two-pool-redesign-2026-08-22.md.
const DEFAULT_MIN_PIECE_WORDS = 1

const wordCount = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length

/**
 * The finest cut set we would ever ask a recordist for, as token offsets:
 * the LEGO tiling with glue absorbed left. Pool B starts here and then PRUNES —
 * it never asks for a stop nothing needs.
 */
function atomCuts(originalText, tokens, universe) {
  const chunks = mergeGlueIntoLegos(chunkPhraseByLegos(originalText, universe), 'left')
  const cuts = []
  let acc = 0
  for (let i = 0; i < chunks.length - 1; i++) {
    acc += wordCount(chunks[i].text)
    cuts.push(acc)
  }
  return cuts.filter(c => c > 0 && c < tokens.length)
}

/** Every span between any two cut points (plus the two ends), >= minWords long. */
function spansOf(tokens, cuts, minWords) {
  const bounds = [0, ...cuts, tokens.length]
  const out = []
  for (let i = 0; i < bounds.length; i++) {
    for (let j = i + 1; j < bounds.length; j++) {
      const len = bounds[j] - bounds[i]
      if (len > MAX_SPAN_WORDS) break
      if (len < minWords) continue
      out.push({ text: tokens.slice(bounds[i], bounds[j]).join(' '), a: bounds[i], b: bounds[j] })
    }
  }
  return out
}

/**
 * Fewest-piece assembly of `tokens` from `available` spans, or null if the
 * phrase cannot be assembled at all. THIS is the real coverage test.
 */
function assemble(tokens, available, minWords = DEFAULT_MIN_PIECE_WORDS) {
  const n = tokens.length
  if (n === 0) return []
  const best = new Array(n + 1).fill(null)
  best[0] = { cost: 0, from: -1, text: null }
  for (let i = 0; i < n; i++) {
    if (!best[i]) continue
    for (let len = Math.min(MAX_SPAN_WORDS, n - i); len >= minWords; len--) {
      const text = tokens.slice(i, i + len).join(' ')
      if (!available.has(text)) continue
      const cand = { cost: best[i].cost + 1, from: i, text }
      if (!best[i + len] || cand.cost < best[i + len].cost) best[i + len] = cand
    }
  }
  if (!best[n]) return null
  const out = []
  let i = n
  while (i > 0) { out.unshift(best[i].text); i = best[i].from }
  return out
}

/**
 * POOL A — every LEGO and every component, one item each.
 *
 * A component is a sub-unit recorded on its parent LEGO's `components` jsonb
 * (course_legos.components), not a row of its own — Kai's worked example is
 * S0038L02 "seit zirka ana Wochn" with components seit / zirka / ana Wochn.
 * Those three have no clip of their own today unless somebody happened to enter
 * them as standalone LEGOs too.
 *
 * A one-token LEGO's components are itself, so they are skipped. Deduplicated
 * by normalized target text, LEGOs winning over components on a tie so the item
 * carries the LEGO's identity.
 *
 * @param {Array} legoRows - course_legos rows (all of them, not just is_new:
 *   an is_new:false row still has components worth teaching)
 * @returns {Array<{target, known, kind, legoId}>}
 */
function buildPoolA(legoRows = []) {
  const items = new Map()
  const idOf = (l) => `S${String(l.seed_number).padStart(4, '0')}L${String(l.lego_index).padStart(2, '0')}`

  for (const lego of legoRows) {
    if (!lego?.is_new || !lego.target_text) continue
    const key = normalizeForMatching(lego.target_text)
    if (!key || items.has(key)) continue
    items.set(key, { target: lego.target_text, known: lego.known_text || '', kind: 'lego', legoId: idOf(lego) })
  }

  for (const lego of legoRows) {
    const components = Array.isArray(lego?.components) ? lego.components : []
    if (!components.length) continue
    if (tokenize(lego.target_text || '').length <= 1) continue
    const parentKey = normalizeForMatching(lego.target_text || '')
    for (const comp of components) {
      const target = comp && (comp.target ?? comp.target_text)
      if (!target) continue
      const key = normalizeForMatching(String(target))
      if (!key || key === parentKey || items.has(key)) continue
      items.set(key, {
        target: String(target),
        known: String(comp.known ?? comp.known_text ?? ''),
        kind: 'component',
        legoId: idOf(lego),
      })
    }
  }

  return [...items.values()]
}

/**
 * POOL B — the slow phrase reads, sized by reassembly and nothing else.
 *
 * Three steps:
 *   1  SELECT. Walk the phrases shortest-first and record one only when it
 *      cannot already be assembled from what the takes chosen so far yield.
 *      Shortest-first is what keeps the list small: a short line's pieces are
 *      the ones long lines need, and a line already recorded whole needs no
 *      pieces of its own.
 *   2  ASSEMBLE. Give every unrecorded phrase its fewest-piece assembly and
 *      note which spans it actually uses.
 *   3  PRUNE. Keep only the cut points those spans need. Every other cut was a
 *      stop the recordist was being asked for that nobody needed — and that is
 *      where the absurd one-word stops go. Where a span is available from
 *      several takes it is put on the take needing the fewest NEW cuts, settled
 *      over a few rounds.
 *
 * @param {object} args
 * @param {Array} args.phrases - [{ target_text, known_text, seed_number, source }]
 *   — every phrase in the course, seeds and practice phrases both
 * @param {Map} args.universe - normalized LEGO text -> { legoId, type, ... }
 * @param {number} [args.minPieceWords]
 * @returns {{ lines, stats, failures }}
 */
function buildPoolB({ phrases = [], universe = new Map(), minPieceWords = DEFAULT_MIN_PIECE_WORDS } = {}) {
  const minWords = Math.max(1, minPieceWords | 0)

  // Distinct phrases, keyed the way the splicer keys them.
  const byKey = new Map()
  for (const p of phrases) {
    const text = p?.target_text
    if (!text) continue
    const key = normalizeForMatching(text)
    if (!key || byKey.has(key)) continue
    byKey.set(key, {
      key,
      target: text,
      known: p.known_text || '',
      seedNumber: p.seed_number ?? null,
      source: p.source || 'practice',
      tokens: tokenize(text),
    })
  }
  const all = [...byKey.values()]

  // ---- 1. select -----------------------------------------------------------
  const ordered = [...all].sort((a, b) => a.tokens.length - b.tokens.length || a.key.localeCompare(b.key))
  const available = new Set()
  const selected = []
  for (const p of ordered) {
    if (assemble(p.tokens, available, minWords)) continue
    p.cuts = atomCuts(p.target, p.tokens, universe)
    selected.push(p)
    for (const s of spansOf(p.tokens, p.cuts, minWords)) available.add(s.text)
  }
  const recorded = new Set(selected.map(p => p.key))

  // ---- 2. assemble ---------------------------------------------------------
  const usedSpans = new Map()
  let pieceTotal = 0
  let splicedCount = 0
  for (const p of all) {
    if (recorded.has(p.key)) continue
    const pieces = assemble(p.tokens, available, minWords)
    if (!pieces) continue // reported as a failure after pruning
    splicedCount++
    pieceTotal += pieces.length
    for (const text of pieces) usedSpans.set(text, (usedSpans.get(text) || 0) + 1)
  }

  // ---- 3. prune ------------------------------------------------------------
  const sources = new Map()
  for (const p of selected) {
    for (const s of spansOf(p.tokens, p.cuts, minWords)) {
      if (!usedSpans.has(s.text)) continue
      if (!sources.has(s.text)) sources.set(s.text, [])
      sources.get(s.text).push({ phrase: p, a: s.a, b: s.b })
    }
  }
  const spanOrder = [...usedSpans.keys()].sort((x, y) => (usedSpans.get(y) - usedSpans.get(x)) || x.localeCompare(y))
  let needed = new Map(selected.map(p => [p.key, new Set()]))
  for (let round = 0; round < 4; round++) {
    const next = new Map(selected.map(p => [p.key, new Set()]))
    for (const text of spanOrder) {
      const candidates = sources.get(text) || []
      if (!candidates.length) continue
      let best = null
      let bestNew = Infinity
      for (const c of candidates) {
        const have = needed.get(c.phrase.key)
        let fresh = 0
        if (c.a > 0 && !have.has(c.a)) fresh++
        if (c.b < c.phrase.tokens.length && !have.has(c.b)) fresh++
        if (fresh < bestNew) { bestNew = fresh; best = c }
        if (fresh === 0) break
      }
      const set = next.get(best.phrase.key)
      if (best.a > 0) set.add(best.a)
      if (best.b < best.phrase.tokens.length) set.add(best.b)
    }
    needed = next
  }

  const finalAvailable = new Set()
  const lines = []
  let stops = 0
  let oneWordInStoppedLines = 0
  const chunkWordDistribution = {}
  for (const p of selected) {
    const cuts = [...needed.get(p.key)].sort((a, b) => a - b)
    const bounds = [0, ...cuts, p.tokens.length]
    // Chunk text comes off the ORIGINAL line, so the autocue keeps the
    // recordist's casing and diacritics; token offsets are shared because
    // tokenize() preserves word count.
    const originalTokens = p.target.trim().split(/\s+/)
    const usable = originalTokens.length === p.tokens.length ? originalTokens : p.tokens
    const chunkTexts = []
    for (let i = 0; i < bounds.length - 1; i++) chunkTexts.push(usable.slice(bounds[i], bounds[i + 1]).join(' '))
    stops += cuts.length
    for (const t of chunkTexts) {
      const w = wordCount(t)
      chunkWordDistribution[w] = (chunkWordDistribution[w] || 0) + 1
      if (cuts.length > 0 && w === 1) oneWordInStoppedLines++
    }
    for (const s of spansOf(p.tokens, cuts, minWords)) finalAvailable.add(s.text)
    lines.push({
      target: p.target,
      known: p.known,
      seedNumber: p.seedNumber,
      source: p.source,
      wordCount: p.tokens.length,
      chunks: chunkTexts.map(text => ({ text, isLego: true, legoId: null })),
      chunksString: chunkTexts.join('|'),
      chunkCount: chunkTexts.length,
    })
  }

  // ---- verify: the hard rule, on the PRUNED cut map -------------------------
  const failures = []
  for (const p of all) {
    if (recorded.has(p.key)) continue
    if (!assemble(p.tokens, finalAvailable, minWords)) failures.push(p.target)
  }

  return {
    lines,
    failures,
    stats: {
      coursePhrases: all.length,
      linesRecorded: lines.length,
      linesSpliced: all.length - lines.length,
      internalStops: stops,
      linesWithNoStop: lines.filter(l => l.chunkCount === 1).length,
      slowChunks: lines.reduce((a, l) => a + l.chunkCount, 0),
      oneWordChunksInStoppedLines: oneWordInStoppedLines,
      chunkWordDistribution,
      averagePiecesPerSplicedPhrase: splicedCount ? +(pieceTotal / splicedCount).toFixed(2) : 0,
      phrasesAssemblable: all.length - failures.length,
      realCoveragePercent: all.length ? +(((all.length - failures.length) / all.length) * 100).toFixed(1) : 100,
      minPieceWords: minWords,
    },
  }
}

/**
 * THE HONEST COVERAGE TEST, standalone — hand it a set of recorded lines with
 * their chunk maps and it tells you which phrases can actually be rebuilt.
 *
 * Use this in place of "does the text appear somewhere in what will be read",
 * which is what reported 100% while 402 of 1,248 Austrian German blocks could
 * never be cut back out.
 *
 * @param {Array} phrases - [{ target_text }] every phrase that must exist
 * @param {Array} lines - [{ target, chunks|chunksString }] what will be recorded
 * @returns {{ assemblable, failures, extractable }}
 */
function verifyAssembly(phrases = [], lines = [], minPieceWords = DEFAULT_MIN_PIECE_WORDS) {
  const minWords = Math.max(1, minPieceWords | 0)
  const available = new Set()
  const recorded = new Set()
  for (const line of lines) {
    const text = line?.target
    if (!text) continue
    recorded.add(normalizeForMatching(text))
    const chunkTexts = Array.isArray(line.chunks)
      ? line.chunks.map(c => (typeof c === 'string' ? c : c.text))
      : String(line.chunksString || text).split('|')
    const tokens = tokenize(text)
    const cuts = []
    let acc = 0
    for (let i = 0; i < chunkTexts.length - 1; i++) {
      acc += wordCount(chunkTexts[i])
      cuts.push(acc)
    }
    for (const s of spansOf(tokens, cuts.filter(c => c > 0 && c < tokens.length), minWords)) available.add(s.text)
  }

  const failures = []
  let assemblable = 0
  for (const p of phrases) {
    const text = p?.target_text ?? p?.target
    if (!text) continue
    const key = normalizeForMatching(text)
    if (recorded.has(key)) { assemblable++; continue }
    if (assemble(tokenize(text), available, minWords)) assemblable++
    else failures.push(text)
  }
  return { assemblable, failures, extractable: available }
}

module.exports = {
  buildPoolA,
  buildPoolB,
  verifyAssembly,
  assemble,
  spansOf,
  MAX_SPAN_WORDS,
  DEFAULT_MIN_PIECE_WORDS,
}
