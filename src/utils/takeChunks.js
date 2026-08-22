// src/utils/takeChunks.js
/**
 * Turn the pauses the VAD heard inside a take into playable LEGO-chunk ranges.
 *
 * A slow-pass take is one continuous recording of a whole phrase, read with a
 * deliberate pause at each LEGO boundary — the autocue draws the recordist a
 * gap marker for every one of them. The VAD hears those pauses live (it has to;
 * that is how it knows not to cut the take mid-phrase) and now keeps their
 * timings, so the review screen can play a single chunk instead of only the
 * whole take. See useVAD.ts ChunkGap.
 *
 * All of the maths is here and pure: what the cut points are is worth testing
 * without a microphone, a browser or a real take.
 */

// Kept each side of a chunk so the cut never clips a consonant onset or a
// decaying tail. The gap edges are already measured a poll INSIDE the silence,
// so this is spending known-silent time, not neighbouring speech.
const DEFAULT_PADDING_MS = 40
// Below this a "chunk" is a click, a breath or a mouth noise between two real
// pauses, not something a recordist can judge. Offering it as a playable piece
// only makes the list lie about how the take was cut.
const MIN_CHUNK_MS = 120

/**
 * @param {Array<{startMs:number,endMs:number|null}>} gaps - VAD chunk gaps, in order
 * @param {number} durationMs - full length of the take
 * @param {{paddingMs?:number,minChunkMs?:number}} [opts]
 * @returns {Array<{index:number,startMs:number,endMs:number,durationMs:number}>}
 */
export function chunkRangesFromGaps(gaps, durationMs, opts = {}) {
  const paddingMs = opts.paddingMs ?? DEFAULT_PADDING_MS
  const minChunkMs = opts.minChunkMs ?? MIN_CHUNK_MS

  if (!Number.isFinite(durationMs) || durationMs <= 0) return []

  const clean = (Array.isArray(gaps) ? gaps : [])
    .filter(g => g && Number.isFinite(g.startMs) && g.startMs >= 0 && g.startMs <= durationMs)
    .map(g => ({
      startMs: g.startMs,
      // An end past the take, or before its own start, is not usable as a
      // resume point — treat it as an open (trailing) gap.
      endMs: Number.isFinite(g.endMs) && g.endMs > g.startMs && g.endMs <= durationMs ? g.endMs : null
    }))
    .sort((a, b) => a.startMs - b.startMs)

  // A gap still open when the take closed is the FINAL silence: speech never
  // resumed, so its start is where the last chunk ends rather than a boundary
  // with a chunk after it. Anything open before that (there should be nothing)
  // is dropped rather than guessed at.
  const trailing = clean.length && clean[clean.length - 1].endMs === null
    ? clean[clean.length - 1]
    : null
  const internal = clean.filter(g => g.endMs !== null)
  const speechEndMs = trailing ? Math.min(trailing.startMs, durationMs) : durationMs

  const raw = []
  let cursor = 0
  for (const gap of internal) {
    if (gap.startMs > cursor) raw.push({ startMs: cursor, endMs: gap.startMs })
    cursor = Math.max(cursor, gap.endMs)
  }
  if (speechEndMs > cursor) raw.push({ startMs: cursor, endMs: speechEndMs })

  return raw
    .map(r => ({
      startMs: Math.max(0, r.startMs - paddingMs),
      endMs: Math.min(durationMs, r.endMs + paddingMs)
    }))
    .filter(r => r.endMs - r.startMs >= minChunkMs)
    .map((r, index) => ({ index, ...r, durationMs: r.endMs - r.startMs }))
}

/**
 * The playable chunk list for one take, labelled with the script's own chunk
 * text where the two agree.
 *
 * When the counts DISAGREE the labels are withheld rather than guessed. A
 * mislabelled piece is worse than an unlabelled one here: the whole point of
 * the control is checking the take was cut where the script says the LEGOs are,
 * and pairing the 3 detected pieces against the first 3 of 4 expected texts
 * would quietly answer the question it exists to ask. `matchesScript` is what
 * the card shows the recordist instead.
 *
 * @param {Object} args
 * @param {Array<{startMs:number,endMs:number|null}>} args.gaps
 * @param {number} args.durationMs
 * @param {string[]} [args.chunkTexts] - expected LEGO chunk texts, in reading order
 * @param {{paddingMs?:number,minChunkMs?:number}} [args.opts]
 */
export function buildTakeChunks({ gaps, durationMs, chunkTexts = [], opts = {} }) {
  const ranges = chunkRangesFromGaps(gaps, durationMs, opts)
  const expected = chunkTexts.length
  const matchesScript = expected > 0 && expected === ranges.length

  return {
    expected,
    detected: ranges.length,
    matchesScript,
    chunks: ranges.map(r => ({
      ...r,
      text: matchesScript ? chunkTexts[r.index] : null,
      label: matchesScript ? chunkTexts[r.index] : `Piece ${r.index + 1}`
    }))
  }
}
