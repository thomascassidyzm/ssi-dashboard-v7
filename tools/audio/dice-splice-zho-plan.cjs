/**
 * DICE AND SPLICE, CHINESE MAIN FLOW — the text half (job #340, Tom 2026-10-24: "if we apply our same dice and splice
 * thinking we could possibly produce a big reduction in the actual separate recordings we need … This is in Chinese, so
 * if the word order doesn't change …"). Pure: no I/O, no database, no audio. tools/audio/dice-splice-zho.cjs is the CLI.
 *
 * THE QUESTION: for every target text a learner hears in seeds A..B (seed sentences, LEGOs, BUILD and USE phrases —
 * component rows are never played), can its clip be made from a span cut out of a clip we already have, or a short
 * splice of such spans, instead of being recorded on its own?
 *
 * UNITS. Chinese is unsegmented, so a cut may only fall where the COURSE ITSELF puts a unit boundary: a LEGO's target,
 * an M-LEGO's components, the ghost tokens of a phrase decomposition that still matches its text. Intl.Segmenter('zh')
 * only splits a stretch no course unit covers. A span is reusable only if it sits in the base between two boundaries
 * of the base's own tokenisation AND between two boundaries of the target's — same characters, same order, contiguous.
 * A plain substring test is not enough: 想和 is a substring of 我现在想和你说中文 but cuts 和你 in half.
 *
 * Bases: the seed sentences first (Tom's design ruling: "drill clips would be extracted from the immersion clip (the
 * full clip) by intelligent editing"), then — only for a text no ≤maxPieces cover exists for — the text itself, longest
 * first, so a new base can serve the texts after it. One plan holds per voice: a splice never mixes voices.
 */

const PUNCT = /[。，？！、；：,.?!;:\s"“”'‘’（）()…—-]/g
const normText = (t) => String(t || '').replace(PUNCT, '')

/** Atomic unit lexicon from the seeds payload of GET /api/production/:course/seeds. */
function buildLexicon(seeds) {
  const lex = new Set()
  for (const s of seeds) {
    for (const l of s.legos || []) {
      const t = normText(l.target_text)
      const comps = Array.isArray(l.components) ? l.components.map((c) => normText(c.target)).filter(Boolean) : []
      // An M-LEGO whose components tile it contributes the components (finer boundaries); the whole stays a unit too
      // through tokenisation, because adjacent component boundaries still fall at its two ends.
      if (comps.length > 1 && comps.join('') === t) comps.forEach((c) => lex.add(c))
      else if (t) lex.add(t)
      for (const p of l.basket_phrases || []) {
        const dec = Array.isArray(p.decomposition) ? p.decomposition.map((x) => normText(x.target)) : []
        if (dec.length && dec.join('') === normText(p.target_text)) dec.filter(Boolean).forEach((x) => lex.add(x))
      }
    }
  }
  return lex
}

const SEG = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('zh', { granularity: 'word' }) : null

/**
 * Pure. Tokenise a normalised text: fewest lexicon units (DP), stretches no unit covers re-split by Intl.Segmenter.
 * @returns {{text:string, tokens:string[], bounds:number[]}} bounds = char offsets 0..len of every unit boundary
 */
function tokenize(text, lex) {
  const t = normText(text), n = t.length
  const maxLen = Math.max(1, ...[...lex].map((w) => w.length))
  const best = new Array(n + 1).fill(Infinity), prev = new Array(n + 1).fill(null)
  best[0] = 0
  for (let i = 0; i < n; i++) {
    if (best[i] === Infinity) continue
    for (let L = 1; L <= Math.min(maxLen, n - i); L++) {
      const w = t.slice(i, i + L)
      const known = lex.has(w)
      if (!known && L > 1) continue
      const c = best[i] + (known ? 1 : 3)
      if (c < best[i + L]) { best[i + L] = c; prev[i + L] = { from: i, known } }
    }
  }
  const raw = []
  for (let j = n; j > 0; j = prev[j].from) raw.unshift({ s: prev[j].from, e: j, known: prev[j].known })
  // merge consecutive unknown single chars and let the segmenter split them
  const tokens = []
  for (let k = 0; k < raw.length;) {
    if (raw[k].known) { tokens.push(t.slice(raw[k].s, raw[k].e)); k++; continue }
    let e = k; while (e < raw.length && !raw[e].known) e++
    const stretch = t.slice(raw[k].s, raw[e - 1].e)
    if (SEG) for (const g of SEG.segment(stretch)) tokens.push(g.segment)
    else tokens.push(stretch)
    k = e
  }
  const bounds = [0]
  for (const w of tokens) bounds.push(bounds[bounds.length - 1] + w.length)
  return { text: t, tokens, bounds }
}

/**
 * Pure. Every place `piece` can be cut from `base` — contiguous, same order, both ends on base unit boundaries.
 * base = tokenize() result. @returns {Array<{start:number,end:number}>}
 */
function cutsIn(piece, base) {
  const out = [], b = new Set(base.bounds)
  if (!piece) return out
  for (let i = base.text.indexOf(piece); i >= 0; i = base.text.indexOf(piece, i + 1)) {
    if (b.has(i) && b.has(i + piece.length)) out.push({ start: i, end: i + piece.length })
  }
  return out
}

/**
 * Pure. Index every reusable span of a set of bases: span text → [{baseId, start, end, baseInitial, baseFinal}].
 * A base of k units offers k(k+1)/2 spans. addBase() keeps the index current as bases are promoted.
 */
function spanIndex() {
  const ix = new Map()
  const addBase = (id, base) => {
    const b = base.bounds
    for (let i = 0; i < b.length - 1; i++) for (let j = i + 1; j < b.length; j++) {
      const text = base.text.slice(b[i], b[j])
      const arr = ix.get(text) || []
      arr.push({ baseId: id, start: b[i], end: b[j], baseInitial: b[i] === 0, baseFinal: b[j] === base.text.length })
      ix.set(text, arr)
    }
  }
  return { ix, addBase }
}

/**
 * Pure. Cover `target` (tokenize() result) with the fewest pieces from a spanIndex. Pieces start and end on the
 * target's own boundaries. Tie-break: a piece taken from the same position class (sentence-initial / medial / final)
 * it occupies in the target, because Mandarin sentence-final intonation and a lengthened final syllable do not
 * survive being moved mid-sentence.
 * @returns {null | Array<{text, baseId, start, end, targetStart, targetEnd, baseFinal, targetFinal, baseInitial, targetInitial}>}
 */
function cover(target, index, { maxPieces = 3, excludeId = null } = {}) {
  const ix = index.ix || index
  const T = target.text, tb = target.bounds, n = tb.length - 1
  const best = new Array(n + 1).fill(null)
  best[0] = { count: 0, mismatch: 0, pieces: [] }
  for (let a = 0; a < n; a++) {
    if (!best[a] || best[a].count >= maxPieces) continue
    for (let z = a + 1; z <= n; z++) {
      const piece = T.slice(tb[a], tb[z])
      const cands = ix.get(piece)
      if (!cands) continue
      const tI = tb[a] === 0, tF = tb[z] === T.length
      let pick = null
      for (const c of cands) {
        if (c.baseId === excludeId) continue
        const mm = (c.baseFinal !== tF ? 1 : 0) + (c.baseInitial !== tI ? 0.5 : 0)
        if (!pick || mm < pick.mm) pick = { c, mm }
        if (mm === 0) break
      }
      if (!pick) continue
      const p = { text: piece, ...pick.c, targetStart: tb[a], targetEnd: tb[z], targetInitial: tI, targetFinal: tF }
      const cand = { count: best[a].count + 1, mismatch: best[a].mismatch + pick.mm, pieces: [...best[a].pieces, p] }
      const cur = best[z]
      if (!cur || cand.count < cur.count || (cand.count === cur.count && cand.mismatch < cur.mismatch)) best[z] = cand
    }
  }
  return best[n] ? best[n].pieces : null
}

/**
 * Pure. Every played target text in seeds [from..to], deduplicated on the normalised text.
 * @returns {Array<{text, kinds:Set<string>, slots:number, firstSeed:number, raw:string}>}
 */
function collectItems(seeds, { from = 1, to = 100 } = {}) {
  const m = new Map()
  const add = (raw, kind, seed) => {
    const t = normText(raw); if (!t) return
    const it = m.get(t) || { text: t, raw, kinds: new Set(), slots: 0, firstSeed: seed }
    it.kinds.add(kind); it.slots++; it.firstSeed = Math.min(it.firstSeed, seed)
    m.set(t, it)
  }
  for (const s of seeds) {
    if (s.seed_number < from || s.seed_number > to) continue
    add(s.target_text, 'seed', s.seed_number)
    for (const l of s.legos || []) {
      add(l.target_text, 'lego', s.seed_number)
      for (const p of l.basket_phrases || []) if (p.phrase_role !== 'component') add(p.target_text, p.phrase_role, s.seed_number)
    }
  }
  return [...m.values()]
}

/**
 * Pure. The whole plan: seed sentences are bases; every other text is cut (1 piece), spliced (2..maxPieces) or,
 * failing both, promoted to a base itself (longest first) — repeated until every text is accounted for.
 */
function plan(seeds, { from = 1, to = 100, maxPieces = 3 } = {}) {
  const lex = buildLexicon(seeds)
  const items = collectItems(seeds, { from, to })
  const tok = new Map(items.map((it) => [it.text, tokenize(it.text, lex)]))
  const bases = new Map(), index = spanIndex()
  const addBase = (t) => { bases.set(t, tok.get(t)); index.addBase(t, tok.get(t)) }
  for (const it of items) if (it.kinds.has('seed')) addBase(it.text)
  const result = new Map()
  let pending = items.filter((it) => !bases.has(it.text)).sort((a, b) => b.text.length - a.text.length)
  while (pending.length) {
    const still = []
    for (const it of pending) {
      const c = cover(tok.get(it.text), index, { maxPieces })
      if (c) result.set(it.text, c); else still.push(it)
    }
    if (!still.length) break
    // promote the longest uncovered text; it may cover others on the next pass
    const promo = still.shift()
    addBase(promo.text)
    pending = still
  }
  const rows = items.map((it) => {
    const isBase = bases.has(it.text)
    const pieces = isBase ? null : result.get(it.text)
    return { text: it.text, raw: it.raw, kinds: [...it.kinds], slots: it.slots, firstSeed: it.firstSeed, tokens: tok.get(it.text).tokens,
      how: isBase ? (it.kinds.has('seed') ? 'base-seed' : 'base-extra') : pieces.length === 1 ? 'cut' : 'splice', pieces }
  })
  const count = (h) => rows.filter((r) => r.how === h).length
  const joins = rows.filter((r) => r.how === 'splice').map((r) => r.pieces.length - 1)
  const finalMoved = rows.filter((r) => r.pieces).reduce((n, r) => n + r.pieces.filter((p) => p.baseFinal && !p.targetFinal).length, 0)
  const summary = {
    range: { from, to }, maxPieces, distinctTexts: rows.length,
    slots: rows.reduce((n, r) => n + r.slots, 0),
    baseSeeds: count('base-seed'), baseExtra: count('base-extra'), cut: count('cut'), splice: count('splice'),
    renders: count('base-seed') + count('base-extra'),
    joinsTotal: joins.reduce((a, b) => a + b, 0),
    distinctUnitsUsed: new Set(rows.filter((r) => r.pieces).flatMap((r) => r.pieces.map((p) => p.text))).size,
    piecesFromFinalUsedNonFinal: finalMoved,
  }
  summary.reduction = 1 - summary.renders / summary.distinctTexts
  return { summary, rows, lexiconSize: lex.size }
}

module.exports = { normText, buildLexicon, tokenize, cutsIn, spanIndex, cover, collectItems, plan }
