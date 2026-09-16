/**
 * partition.cjs — IS THIS SPLIT CUTTABLE AT ALL?
 *
 * Seed-and-splice rests on one property that job #991's split was never asked
 * to have: THE CHUNKS MUST BE A CONTIGUOUS, IN-ORDER PARTITION OF THE STORED
 * SENTENCE. If they are, every ladder rung is a span of the natural take and
 * align.cjs can map the gapped take's voiced regions onto them 1:1. If they are
 * not, there is no span to cut and no amount of reading fixes it.
 *
 * Measured over the 57 North Welsh health seeds, 2026-09-16:
 *
 *   exact        30  chunks concatenate to the sentence, word for word
 *   connectives  23  the sentence carries material the split drops at a joint —
 *                    almost always one word (ac, a, ond, felly, reit, rŵan,
 *                    wrth gwrs). Still cuttable: the dropped word rides into the
 *                    adjacent piece, so the COUNT still maps 1:1 and only the
 *                    piece's text label is short by a connective.
 *   blocked       4  not cuttable, for four different reasons, named below.
 *
 * THE FOUR BLOCKED SEEDS, and why each one is a decision rather than a bug:
 *
 *   HG19  DISCONTINUOUS. Chunk 3 is `fedrwch chi ddeud … wrtha i` and chunk 4 is
 *         `eich dyddiad geni chi`, which sits INSIDE chunk 3's ellipsis. Chunk 3
 *         is two spans, not one; the ladder rung `fedrwch chi ddeud … wrtha i`
 *         exists nowhere in the take.
 *   HG16  SCAFFOLD. Chunk 1 is `'ta (tag position)` — a parenthetical note, not
 *         Welsh — and `'ta` appears third in the sentence, not first.
 *   HG05  MUTATED AT THE JOINT. The chunk's citation form is `gair`; inside the
 *         sentence it is `air` (soft mutation after `'na`). The chunk-alone rung
 *         and the in-sentence rung are DIFFERENT AUDIO, which is precisely Tom's
 *         point about word boundaries. A mutated chunk cannot be cut out of the
 *         sentence — it has to be read on its own, Pool A style.
 *   HG46  ALTERNATION. Chunk 3 is `cymrwch eich amser / dim brys` — two
 *         alternative Welsh phrasings behind a slash. Nobody can read a slash.
 *
 * A MERGED CHUNK IS NOT A BLOCKER. #991 merged six seeds down to four chunks by
 * fusing adjacent mapping rows, and the sentence often keeps a connective between
 * the two halves (HG02: `rhowch wybod i mi — ac mi esbonia i'n gliriach`). The
 * merged chunk STRING then appears nowhere in the sentence while every one of its
 * WORDS appears in order, and as a span of audio it is perfectly cuttable. That is
 * why the scan below runs at word level; at string level HG02 reads as blocked and
 * costs a seed for nothing.
 *
 * `classifySplit` is what the staging tool and the assembler both gate on, so
 * the number on the booth-load report and the seeds actually staged cannot
 * drift apart.
 */

/** Punctuation and scaffolding stripped; Welsh diacritics kept, they are letters. */
function normalise(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[.,?!;:—–"“”«»()[\]…/\\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const CLASS_EXACT = 'exact'
const CLASS_CONNECTIVES = 'connectives'
const CLASS_BLOCKED = 'blocked'

/**
 * @returns {{class:string, reason:string|null, dropped:string[]}}
 */
function classifySplit(seed) {
  const whole = normalise(seed.welsh)
  const chunks = (seed.chunks || []).map((c) => normalise(c.target))

  // A slash or a bracketed English note is a scaffold, not something a mouth
  // can say. Caught first, because it would otherwise read as "not in order".
  for (const c of seed.chunks || []) {
    if (/[/]/.test(c.target)) {
      return { class: CLASS_BLOCKED, reason: `alternation: chunk "${c.target}" offers two phrasings behind a slash`, dropped: [] }
    }
    if (/\(/.test(c.target)) {
      return { class: CLASS_BLOCKED, reason: `scaffold: chunk "${c.target}" carries a parenthetical note, not Welsh`, dropped: [] }
    }
    if (/…/.test(c.target)) {
      return { class: CLASS_BLOCKED, reason: `discontinuous: chunk "${c.target}" is two spans with another chunk between them`, dropped: [] }
    }
  }

  // WORD LEVEL, not string level, and that is the whole difference between a
  // real blocker and a merged chunk. HG02's chunk 3 is #991's merge of two
  // mapping rows that the sentence separates with `ac`, so the CHUNK STRING is
  // nowhere in the sentence while every one of its WORDS is, in order. As a
  // span of audio it is perfectly cuttable and only its label is short by a
  // connective — which is the `connectives` class, not the blocked one.
  const words = whole ? whole.split(' ') : []
  const dropped = []
  let w = 0
  for (let i = 0; i < chunks.length; i++) {
    const cw = chunks[i] ? chunks[i].split(' ') : []
    for (const token of cw) {
      const at = words.indexOf(token, w)
      if (at < 0) {
        return {
          class: CLASS_BLOCKED,
          reason: `chunk ${i + 1} "${seed.chunks[i].target}" — the word "${token}" does not appear in the sentence at or after this point; the chunk is reordered, or it mutates when it sits inside`,
          dropped,
        }
      }
      if (at > w) dropped.push(words.slice(w, at).join(' '))
      w = at + 1
    }
  }
  const tail = words.slice(w).join(' ').trim()
  if (tail) dropped.push(tail)

  const real = dropped.filter(Boolean)
  if (!real.length) return { class: CLASS_EXACT, reason: null, dropped: [] }
  return {
    class: CLASS_CONNECTIVES,
    reason: `the sentence carries ${real.length} piece(s) the split drops at a joint: ${real.map((d) => `"${d}"`).join(', ')}`,
    dropped: real,
  }
}

/** Cuttable = the ladder can be produced from two takes. */
function isCuttable(seed) { return classifySplit(seed).class !== CLASS_BLOCKED }

module.exports = { normalise, classifySplit, isCuttable, CLASS_EXACT, CLASS_CONNECTIVES, CLASS_BLOCKED }
