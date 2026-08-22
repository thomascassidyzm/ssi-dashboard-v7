// services/recording-script-items.cjs
//
// THE READING LIST THE AUTOCUE ACTUALLY SHOWS.
//
// The optimizer picks WHICH lines get recorded. This turns that selection into
// the sequence of items a recordist reads, and it owns exactly one decision the
// optimizer knows nothing about: how many times each line is read.
//
//   coverage order (the default, unchanged since the autocue was built)
//     → every line appears TWICE: natural, then slow. The slow read is a
//       deliberately-paused lego-by-lego read whose only job is to give the
//       aligner its chunk boundaries (services/voice-engine/align.cjs
//       alignTakePair — "alignment runs on the slow take"). It is never filed
//       as a clip of its own (services/script-take-filing.cjs).
//
//   course order (?order=course)
//     → every line appears ONCE, natural only. Kai's ruling, 2026-08-21: for a
//       straight-through session, read each line at natural speed and move on.
//
// Since the follow-up ruling of the same day, the course-order script is built
// straight from the course by buildCourseScriptItems below — the coverage
// optimiser is not run at all for it, because its output is a splicing plan and
// these takes are never spliced (services/course-order-script.cjs says why).
// buildScriptItems still shapes the coverage script, and still honours
// natural-only if it is ever asked for one.
//
// WHAT NATURAL-ONLY COSTS: a line with no slow take can never be CHUNKED.
// synthesis-job.cjs:241 records "no slow take uploaded — cannot align without
// pause boundaries" and skips that line's alignment; nothing crashes and
// nothing is orphaned. In the course-order mode that costs nothing at all,
// because each take is attached directly as its item's audio and no chunk of it
// is ever wanted.
//
// Pure function, no I/O: the endpoint runs the optimizer, this shapes the
// result, and both halves stay testable without a database.

/**
 * Does this reading order mean natural-only?
 * Only the exact string 'course' does, so a typo can never silently halve
 * somebody's script.
 */
function isNaturalOnly(order) {
  return order === 'course'
}

/**
 * Build the autocue's item list from an optimizer result.
 *
 * @param {object} args
 * @param {Array} args.phrases - result.recordingScript.phrases
 * @param {Array} args.directItems - result.directRecord.items
 * @param {string} args.order - 'coverage' (default, natural+slow) | 'course' (natural only)
 * @returns {Array} items, index-numbered in reading sequence
 */
function buildScriptItems({ phrases = [], directItems = [], order = 'coverage' } = {}) {
  const naturalOnly = isNaturalOnly(order)
  const items = []
  let idx = 0

  const push = (item) => { items.push({ index: idx++, ...item }) }

  for (let i = 0; i < phrases.length; i++) {
    const p = phrases[i]
    // Chunk data rides along even in natural-only mode: it costs nothing, and
    // the same line read slow later (or a natural take that happens to carry
    // real micro-pauses) still wants its boundaries.
    const base = {
      text: p.target,
      type: 'phrase',
      phraseIndex: i,
      wordCount: p.wordCount,
      coversLegos: p.coversLegos,
      known: p.known || '',
      phraseOrigin: p.source || '',
      seedNumber: p.seedNumber || null,
      recordingChunks: p.recordingChunks || null,
      legoChunks: p.legoChunks || null,
      chunksString: p.chunksString || null,
      chunkCount: p.chunkCount || null,
    }
    push({ ...base, cadence: 'natural' })
    if (!naturalOnly) push({ ...base, cadence: 'slow' })
  }

  // A direct-record item is a single LEGO — one chunk by definition.
  for (const d of directItems) {
    const directChunk = [{ text: d.target, legoId: d.legoId || null, isLego: true }]
    const base = {
      text: d.target,
      type: 'direct',
      known: d.known || '',
      legoId: d.legoId || '',
      recordingChunks: directChunk,
      legoChunks: directChunk,
      chunksString: d.target,
      chunkCount: 1,
    }
    push({ ...base, cadence: 'natural' })
    if (!naturalOnly) push({ ...base, cadence: 'slow' })
  }

  return items
}

/**
 * Shape course-order items (services/course-order-script.cjs) into the autocue's
 * item list: one natural read each, in the order they arrived.
 *
 * The item's own identity travels with it — `itemKind` and `itemId` — and comes
 * back on the upload, which is what lets the take be attached to that exact
 * seed / LEGO / phrase instead of being guessed at by text alone
 * (services/script-take-attach.cjs).
 *
 * No chunk fields: nothing here is ever chunked, and a chunk map the recorder
 * would render pause boundaries from would be a promise this mode does not keep.
 */
function buildCourseScriptItems(courseItems = []) {
  return courseItems.map((it, index) => ({
    index,
    text: it.target,
    cadence: 'natural',
    type: it.kind,
    itemKind: it.kind,
    itemId: it.itemId,
    known: it.known || '',
    seedNumber: it.seedNumber ?? null,
    legoIndex: it.legoIndex ?? null,
    legoId: it.legoId || '',
    phraseRole: it.phraseRole || '',
  }))
}

/**
 * The cadence an isolated Pool A read is filed under.
 *
 * NOT 'slow', and that is load-bearing twice over:
 *   - services/script-take-filing.cjs refuses `cadence === 'slow'` outright
 *     (reason 'slow_cadence'), so a Pool A read tagged slow would go to S3 and
 *     then never become a clip at all — silently. Kai's isolated read IS the
 *     unit's teaching clip; it has to file.
 *   - services/voice-engine/provenance-adapter.cjs drops this cadence from take
 *     grouping, which is what keeps an isolated read out of the segment store
 *     and therefore out of every spliced phrase. That is Kai's explicit ruling:
 *     read on its own it carries no phrase prosody, and spliced in it sounds
 *     strange.
 * It is still read SLOWLY — the word here is a filing key, not a tempo.
 */
const ISOLATED_CADENCE = 'isolated'

/**
 * Build the autocue's item list for the TWO-POOL script (Kai, 2026-08-21).
 *
 * Pool A: ONE item per LEGO/component — a single clear read, never a pair.
 * Pool B: the usual natural + slow pair per line.
 *
 * Pool A is emitted FIRST by default. Kai does not mind which end it goes on;
 * first means the recordist banks every teaching clip even if the session is
 * cut short, and it warms them into the dialect before the sentences start.
 * `poolAFirst: false` puts it after the phrases.
 *
 * @param {object} args
 * @param {Array} args.poolA - [{ target, known, kind, legoId }]
 * @param {Array} args.poolB - [{ target, known, seedNumber, source, chunks, chunksString, chunkCount }]
 * @param {boolean} [args.poolAFirst]
 */
function buildTwoPoolScriptItems({ poolA = [], poolB = [], poolAFirst = true } = {}) {
  const isolatedItems = poolA.map((item) => {
    // One chunk by definition — an isolated read has no internal pause, and
    // saying so explicitly stops the autocue rendering pause boundaries it
    // never asked for.
    const chunk = [{ text: item.target, legoId: item.legoId || null, isLego: true }]
    return {
      text: item.target,
      cadence: ISOLATED_CADENCE,
      type: 'isolated',
      pool: 'A',
      itemKind: item.kind || 'lego',
      known: item.known || '',
      legoId: item.legoId || '',
      recordingChunks: chunk,
      legoChunks: chunk,
      chunksString: item.target,
      chunkCount: 1,
      // The one field the splicer must never ignore.
      spliceable: false,
    }
  })

  const phraseItems = []
  for (let i = 0; i < poolB.length; i++) {
    const line = poolB[i]
    const base = {
      text: line.target,
      type: 'phrase',
      pool: 'B',
      phraseIndex: i,
      wordCount: line.wordCount ?? null,
      known: line.known || '',
      phraseOrigin: line.source || '',
      seedNumber: line.seedNumber ?? null,
      recordingChunks: line.chunks || null,
      legoChunks: line.chunks || null,
      chunksString: line.chunksString || null,
      chunkCount: line.chunkCount ?? null,
      spliceable: true,
    }
    phraseItems.push({ ...base, cadence: 'natural' })
    phraseItems.push({ ...base, cadence: 'slow' })
  }

  const ordered = poolAFirst ? [...isolatedItems, ...phraseItems] : [...phraseItems, ...isolatedItems]
  return ordered.map((item, index) => ({ index, ...item }))
}

module.exports = {
  buildScriptItems,
  buildCourseScriptItems,
  buildTwoPoolScriptItems,
  isNaturalOnly,
  ISOLATED_CADENCE,
}
