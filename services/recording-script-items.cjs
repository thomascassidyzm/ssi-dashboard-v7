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

module.exports = { buildScriptItems, buildCourseScriptItems, isNaturalOnly }
