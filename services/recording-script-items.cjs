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
//       straight-through weekend session, read each line at natural speed and
//       move on. Half the takes, half the booth time, start of the course
//       first.
//
// WHAT NATURAL-ONLY COSTS, stated here because this is where the choice is made:
// a line with no slow take can never be CHUNKED. synthesis-job.cjs:241 records
// "no slow take uploaded — cannot align without pause boundaries" and skips
// that line's alignment; nothing crashes and nothing is orphaned. The take is
// still filed at upload as a real course_audio row and is still used WHOLE
// wherever a course item matches its text ("a recorded whole-phrase natural
// take ALWAYS beats splicing it", synthesis-job.cjs:303). What it cannot do is
// donate chunks to OTHER phrases — until someone supplies alignment another
// way, or the line is read slow later. That is an informed trade, not a bug.
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

module.exports = { buildScriptItems, isNaturalOnly }
