/**
 * health-seed-ladders/ladder.cjs — THE LEAN LADDER, AND WHY IT NEEDS NO SPLICER.
 *
 * 57 North Welsh health seeds. Read whole, the LEAN ladder is 339 lines per
 * voice (job #991·G). Read as a MINIMAL RECORDING SET it is TWO takes per seed
 * per voice — a natural whole read and a gapped read with a pause at every
 * chunk joint — and every ladder rung is then cut out of those two takes.
 *
 * THE LOAD-BEARING FACT, and the reason this is worth doing at all:
 *
 *   EVERY RUNG OF THE LEAN LADDER IS A CONTIGUOUS SPAN OF ONE TAKE.
 *
 * LEAN is (a) each chunk alone + (b) forward accumulation + (d) the full
 * sentence. A chunk alone is the span [i,i]. A forward accumulation is the
 * span [0,k]. The full sentence is [0,n-1] — which is the natural take, whole,
 * untouched. Not one of them is a join between pieces that were not already
 * adjacent in the same breath, so NOTHING HERE IS SPLICED:
 * services/voice-engine/splicer.cjs is not on this path and must not be put on
 * it. `planLadder` asserts that invariant rather than documenting it, because a
 * document rots and an assertion does not.
 *
 * (Backward accumulation — the (c) rung of FULL — is the span [k,n-1] and is
 * equally contiguous. FULL costs 85 more lines read whole; as spans it costs
 * nothing but more atrim calls. That is an argument for FULL that only exists
 * once the ladder is cut rather than read, and it is Tom's call, not this
 * file's.)
 *
 * WHERE THE BOUNDARIES COME FROM. services/voice-engine/align.cjs, unchanged:
 * the GAPPED take is the map (ffmpeg silencedetect, voiced regions mapped 1:1
 * onto the expected chunk list, chunk-count mismatch is a hard failure), and
 * the NATURAL take is the material (boundaries carried across by
 * `transferBoundaries`, or detected directly when the reader's own micro-pauses
 * happen to land on the joints). So the rungs are natural-cadence audio with a
 * gapped-read chunk map — which is exactly `alignTakePair`'s contract.
 *
 * A SINGLE-CHUNK SEED HAS NO LADDER. HG12 and HG13 split into one chunk, so
 * their ladder collapses to the full sentence: natural take only, no gapped
 * take, nothing to cut. `planLadder` returns the one rung and `takesFor`
 * returns one take. Recording a gapped read of a sentence with no joints is a
 * take nobody can use.
 */

/** Rung kinds, in the order the ladder is taught. */
const RUNG_ALONE = 'alone'        // (a) chunk i by itself
const RUNG_FORWARD = 'forward'    // (b) chunks 0..k, k < n-1
const RUNG_FULL = 'full'          // (d) the sentence, whole

/**
 * The LEAN ladder for one seed, as spans of its own takes.
 *
 * @param {{code:string, chunks:Array<{known:string,target:string}>}} seed
 * @returns {Array<{rung:number, kind:string, from:number, to:number,
 *                  source:'natural-whole'|'natural-span', target:string, known:string}>}
 */
function planLadder(seed) {
  const chunks = seed.chunks || []
  const n = chunks.length
  if (!n) throw new Error(`planLadder: ${seed.code} has no chunks`)
  const span = (from, to, kind) => ({
    rung: 0,
    kind,
    from,
    to,
    // The full sentence is the take itself. Tom's standing rule and Kai's:
    // a natural whole read always beats an assembled one, so the ground-truth
    // rung is never cut, padded or re-encoded — it is the file.
    source: kind === RUNG_FULL ? 'natural-whole' : 'natural-span',
    target: kind === RUNG_FULL
      ? (seed.welsh || chunks.map((c) => c.target).join(' '))
      : chunks.slice(from, to + 1).map((c) => c.target).join(' '),
    known: kind === RUNG_FULL
      ? (seed.english || chunks.map((c) => c.known).join(' '))
      : chunks.slice(from, to + 1).map((c) => c.known).join(' '),
  })

  const out = []
  if (n === 1) {
    out.push(span(0, 0, RUNG_FULL))
  } else {
    for (let i = 0; i < n; i++) out.push(span(i, i, RUNG_ALONE))
    // k runs to n-2: the accumulation that reaches the last chunk IS the full
    // sentence, and the full sentence is the whole natural take, not a span.
    for (let k = 1; k <= n - 2; k++) out.push(span(0, k, RUNG_FORWARD))
    out.push(span(0, n - 1, RUNG_FULL))
  }
  out.forEach((r, i) => { r.rung = i + 1 })
  assertContiguous(seed, out)
  return out
}

/**
 * THE INVARIANT, ASSERTED. Every rung is one unbroken run of adjacent chunks
 * inside the seed, so no rung is ever a splice. If this ever throws, the ladder
 * shape changed and the splicer became a dependency — which is a decision, not
 * a bug fix.
 */
function assertContiguous(seed, rungs) {
  const n = (seed.chunks || []).length
  for (const r of rungs) {
    if (!Number.isInteger(r.from) || !Number.isInteger(r.to) ||
        r.from < 0 || r.to >= n || r.to < r.from) {
      throw new Error(`planLadder: ${seed.code} rung ${r.rung} is not a contiguous span [${r.from},${r.to}] of ${n} chunks`)
    }
  }
}

/** Take kinds. The gapped read is the quarry; the natural read is ground truth. */
const TAKE_GAPPED = 'gapped'
const TAKE_NATURAL = 'natural'

/**
 * The takes ONE VOICE must read for one seed. Two, unless the seed has a single
 * chunk and there is nothing to cut.
 */
function takesFor(seed) {
  const n = (seed.chunks || []).length
  if (n <= 1) return [TAKE_NATURAL]
  return [TAKE_GAPPED, TAKE_NATURAL]
}

/** The expected chunk list align.cjs gates on — the #991 split, verbatim. */
function expectedChunks(seed) {
  return (seed.chunks || []).map((c) => c.target)
}

/** Booth load for a set of seeds, per voice and for both voices. */
function boothLoad(seeds, { voices = 2 } = {}) {
  let takes = 0
  let ladderLines = 0
  for (const s of seeds) {
    takes += takesFor(s).length
    ladderLines += planLadder(s).length
  }
  return {
    seeds: seeds.length,
    takesPerVoice: takes,
    takesBothVoices: takes * voices,
    ladderLinesPerVoice: ladderLines,
    ladderLinesBothVoices: ladderLines * voices,
  }
}

module.exports = {
  RUNG_ALONE, RUNG_FORWARD, RUNG_FULL,
  TAKE_GAPPED, TAKE_NATURAL,
  planLadder, takesFor, expectedChunks, boothLoad,
}
