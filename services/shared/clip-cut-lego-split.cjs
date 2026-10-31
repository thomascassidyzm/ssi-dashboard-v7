/**
 * WHERE A POD DRILL LINE IS CUT: at its LEGOs (job #419, Tom 2026-10-31, r-2026-10-31 LEGO split):
 *   "We use the LEGOs, they're already in the pods. We don't need to do any derivations ... The LEGOs are already the
 *    standard way of breaking. If it can be broken up into a LEGO, then great. It's a clip. If it can't be, then it probably
 *    means that clip can't be broken up because it's already like an idiom or something."
 *
 * So the TEXT split of a line is a tiling of its target text by the course's own LEGO target texts — never whisper's word
 * gaps (whisper only places the chosen pieces in time, clip-cut.cjs), never a chunking an agent invents.
 *
 *   - Tokens are the line's words (spaced scripts) or, for a script without spaces (Chinese), the words an agent returned
 *     (verified here: no word lost, none added — `checkWordSplit`). A LEGO matches a run of whole tokens whose letters equal
 *     its target's letters, so a cut can never fall inside a word.
 *   - Of all tilings the one chosen is, in order: the most words covered by LEGOs; then the fewest pieces over the drill
 *     ceiling (r-2026-10-29-drill-chunks-are-measured-in-syllables: hard ceiling 6; r-2026-10-30: a judgement, not a hard
 *     count — so it only breaks ties between LEGO tilings, it never forces a cut a LEGO does not give); then the FEWEST
 *     pieces (taste-safe default: an ambiguous LEGO split takes the coarser).
 *   - Words no LEGO covers are never split among themselves: each uncovered run is ONE unit (`unmapped`) — the clip
 *     "can't be broken up because it's already like an idiom". A line no LEGO splits stays ONE piece — WHOLE, which is a
 *     correct outcome and not a failure.
 *
 * Pure: the LEGOs come in as data ({ legoId, target, known, target1AudioId }), read by the caller through Popty's own
 * GET /api/production/:courseCode/seeds route.
 */
'use strict'

const SYLLABLE_CEILING = 6

/** Letters and digits only, lower-cased, accents kept — the same key clip-cut.cjs compares by. */
const bare = (s) => String(s || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, '')

const HAN = /\p{Script=Han}/u

/** Rough syllable count of a text: Han characters, Devanagari akshara, else vowel groups. For the drill-size grouping only. */
function syllables(text) {
  const s = String(text || '').normalize('NFC').toLowerCase()
  const han = (s.match(/\p{Script=Han}/gu) || []).length
  if (han) return han
  if (/\p{Script=Devanagari}/u.test(s)) {
    // an akshara = an independent vowel, or a consonant not killed by a virama (U+094D); Hindi drops the inherent vowel
    // of a word's last bare consonant (ek = 1, aur = 1), so that one is not counted when the word has another syllable
    return s.split(/[^\p{L}\p{M}]+/u).filter(Boolean).reduce((n, w) => {
      const k = (w.match(/[ऄ-औ]|[क-हक़-य़](?!्)/gu) || []).length
      const schwaDrop = k > 1 && /[क-हक़-य़]़?$/u.test(w) ? 1 : 0
      return n + k - schwaDrop
    }, 0)
  }
  return (s.match(/[aeiouyàáâäèéêëìíîïòóôöùúûü]+/gu) || []).length
}

/** The line's tokens: its own words for a spaced script; `words` (an agent's split) for a script without spaces. */
function tokensOf(text, words = null) {
  if (words) return words.map(String)
  return String(text || '').trim().split(/\s+/u).filter((w) => bare(w))
}

/**
 * Pure. An agent's word split of an unspaced line is accepted only if its words rejoin to exactly the line's letters
 * (nothing dropped, nothing added, order kept) and none is empty. Returns null when fine, else the reason.
 */
function checkWordSplit(text, words) {
  if (!Array.isArray(words) || !words.length) return 'no words returned'
  if (words.some((w) => !bare(w))) return 'an empty word'
  const joined = words.map(bare).join('')
  if (joined !== bare(text)) return `words rejoin to "${joined}", not "${bare(text)}"`
  return null
}

/** Pure. bare(target) -> the LEGOs with that target (first seen first: lowest seed, lowest index). */
function legoIndex(legos) {
  const m = new Map()
  for (const l of legos || []) {
    const k = bare(l.target)
    if (!k) continue
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(l)
  }
  return m
}

/**
 * Pure. Split a line at its LEGOs.
 * @param {string} text  the line's target text
 * @param {Map|Array} legos  legoIndex(...) or the LEGO list
 * @param {object} [o] { words: an agent's word split (unspaced scripts), ceiling }
 * @returns {{ pieces: [{ text, legos: [{legoId,target,known,target1AudioId}], unmapped: boolean, units, syllables }], whole: boolean,
 *            coverage: number, overCeiling: number }}
 */
function legoSplit(text, legos, { words = null, ceiling = SYLLABLE_CEILING } = {}) {
  const idx = legos instanceof Map ? legos : legoIndex(legos)
  const toks = tokensOf(text, words)
  const n = toks.length
  const keys = toks.map(bare)
  // best[i] = best tiling of toks[i..n): [uncovered, overCeiling, pieces], with the step taken
  const best = new Array(n + 1).fill(null)
  best[n] = { cost: [0, 0, 0] }
  const better = (a, b) => { for (let k = 0; k < 3; k++) if (a[k] !== b[k]) return a[k] < b[k]; return false }
  for (let i = n - 1; i >= 0; i--) {
    // an uncovered word: cost one uncovered, no piece of its own (uncovered runs become one unit below)
    let choice = { cost: [best[i + 1].cost[0] + 1, best[i + 1].cost[1], best[i + 1].cost[2]], to: i + 1, lego: null }
    let key = ''
    for (let j = i; j < n; j++) {
      key += keys[j]
      const hit = idx.get(key)
      if (!hit) continue
      const surface = toks.slice(i, j + 1).join(words ? '' : ' ')
      const over = syllables(surface) > ceiling ? 1 : 0
      const c = [best[j + 1].cost[0], best[j + 1].cost[1] + over, best[j + 1].cost[2] + 1]
      if (better(c, choice.cost)) choice = { cost: c, to: j + 1, lego: hit[0] }
    }
    best[i] = choice
  }
  // walk the tiling
  const raw = []
  for (let i = 0; i < n;) {
    const s = best[i]
    raw.push({ toks: toks.slice(i, s.to), lego: s.lego })
    i = s.to
  }
  // a LEGO run is a unit; a run of words no LEGO covers is ONE unit, never split inside (the idiom case)
  const pieces = []
  for (const r of raw) {
    const last = pieces[pieces.length - 1]
    if (!r.lego && last && !last.legos.length) last.toks.push(...r.toks)
    else pieces.push({ toks: [...r.toks], legos: r.lego ? [r.lego] : [], unmapped: !r.lego })
  }
  const covered = n - best[0].cost[0]
  const units = pieces.map((p) => {
    const t = p.toks.join(words ? '' : ' ')
    return { text: t, legos: p.legos, unmapped: p.unmapped, syllables: syllables(t) }
  })
  const out = groupUnits(units, { join: words ? '' : ' ' })
  return { pieces: out, units, whole: out.length < 2, coverage: n ? covered / n : 0, overCeiling: out.filter((p) => p.syllables > ceiling).length }
}

/**
 * Pure. Drill chunks from LEGO units. Each LEGO unit IS a chunk ("If it can be broken up into a LEGO, then great. It's a
 * clip."); the one exception is a unit under MIN_SYLLABLES (a bare "ma", "und", "el"): r-2026-10-29 aims a chunk at 2-3
 * syllables, and a one-syllable function word is not a drill chunk, so it joins the unit AFTER it (the word it leads:
 * "ma deve", "Und was") — or the one before it at the end of the line. No other grouping: the ceiling never forces a cut
 * a LEGO does not give, and nothing merges two LEGOs that each stand on their own.
 */
const MIN_SYLLABLES = 2
function groupUnits(units, { join = ' ' } = {}) {
  const groups = []
  let carry = []
  for (const u of units) {
    carry.push(u)
    if (carry.reduce((n, x) => n + x.syllables, 0) >= MIN_SYLLABLES) { groups.push(carry); carry = [] }
  }
  if (carry.length) { if (groups.length) groups[groups.length - 1].push(...carry); else groups.push(carry) }
  return groups.map((g) => {
    const text = g.map((u) => u.text).join(join)
    return { text, legos: g.flatMap((u) => u.legos), unmapped: g.some((u) => u.unmapped), units: g.length, syllables: syllables(text) }
  })
}

/**
 * Pure. A piece's library match: the LEGO whose target IS the piece's exact words (no glue) — its own target1 clip.
 * Whether that clip is in the right voice is the render route's library-first answer, asked by the caller.
 */
function exactLego(piece) {
  return !piece.unmapped && piece.legos.length === 1 && (piece.units || 1) === 1 && bare(piece.legos[0].target) === bare(piece.text) ? piece.legos[0] : null
}

module.exports = { legoSplit, groupUnits, MIN_SYLLABLES, legoIndex, tokensOf, checkWordSplit, syllables, exactLego, bare, SYLLABLE_CEILING }
