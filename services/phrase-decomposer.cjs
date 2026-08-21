// services/phrase-decomposer.cjs
//
// Build-time phrase decomposition for course_practice_phrases.
//
// See new_vision/PHRASE_DECOMPOSITION_SPEC.md for the design rationale.
//
// What this does:
//   Take a phrase's target_text and the course's introduced-vocabulary set,
//   produce an ordered list of "blocks" — each block is either a LEGO match
//   (a known declared vocabulary item) or a "ghost" block (residue that the
//   learner is expected to grok from earlier M-LEGO context).
//
// The block list is what the player UI renders directly (no runtime
// alignment). The runtime keeps its own fallback path for the case where the
// stored decomposition is missing or invalid; this module never has to be
// perfect, but when it produces a result it must be self-consistent:
//
//     blocks.map(b => b.target).join('') === targetText
//                                            (modulo whitespace normalisation)
//
// If we can't satisfy that, we throw — never persist an invalid decomposition.
//
// Two exports:
//   decomposeText(targetText, vocabulary) — pure function, no I/O
//   decomposePhrase(supabase, courseCode, seedNumber, targetText)
//       — wrapper that fetches vocabulary + current course version

// =============================================================================
// Tokenisation helpers
// =============================================================================

// First-char heuristic: treat phrases that start with a CJK / Thai character
// as scripts without whitespace word boundaries. Per the spec we advance by
// one character at a time inside ghost residue for these scripts; for everything
// else we advance by one whitespace-separated word.
//
// Ranges:
//   一-鿿 = CJK Unified Ideographs + extensions (covers zh-Hans, zh-Hant, ja kanji)
//   ぁ-ヿ = Hiragana + Katakana (Japanese)
//   ก-๿ = Thai
//
// Korean Hangul is NOT in this set because Korean uses whitespace word
// boundaries (eojeol). If we later add Khmer/Lao/Burmese/Tibetan we'd extend
// here; for the current course catalogue this covers the problem languages.
const CHAR_LEVEL_FIRST_CHAR = /^[一-鿿぀-ヿ฀-๿]/

function isCharLevelScript(text) {
  // We only need to check the first non-whitespace character — a phrase's
  // script doesn't change mid-phrase in practice.
  const stripped = text.replace(/^\s+/, '')
  return stripped.length > 0 && CHAR_LEVEL_FIRST_CHAR.test(stripped[0])
}

// Pull one "token" off the front of `residue`. For char-level scripts that's
// one character; otherwise it's a run of non-whitespace, optionally followed
// by trailing whitespace so the whitespace gets absorbed into the ghost block
// (not emitted as its own zero-width thing).
//
// Returns { token, rest } where token + rest === residue.
function consumeOneToken(residue, charLevel) {
  if (charLevel) {
    // Char-level: one Unicode codepoint at a time. Use Array.from to handle
    // surrogate pairs cleanly (some emoji / rare CJK chars are >0xFFFF).
    const chars = Array.from(residue)
    if (chars.length === 0) return { token: '', rest: '' }
    const token = chars[0]
    return { token, rest: chars.slice(1).join('') }
  }

  // Whitespace-delimited: leading whitespace is part of the token (so the
  // concat invariant holds when we reassemble), then one run of non-whitespace.
  // Trailing whitespace stays in `rest` — the next iteration's match attempt
  // will skip past it, and if no match happens, it'll be absorbed into that
  // ghost block's leading-whitespace.
  const m = residue.match(/^(\s*\S+)/)
  if (m) return { token: m[1], rest: residue.slice(m[1].length) }
  // Pure whitespace residue (shouldn't normally happen because we'd have
  // matched something or exited the loop, but be defensive).
  return { token: residue, rest: '' }
}

// A "word char" for boundary tests: letters, marks (combining/diacritics),
// digits. Whitespace, punctuation, and end-of-string are boundaries.
const WORD_CHAR = /[\p{L}\p{M}\p{N}]/u
function isBoundaryAt(text, pos) {
  if (pos < 0 || pos >= text.length) return true // start / end
  return !WORD_CHAR.test(text[pos])
}

// Try to match the longest vocabulary entry starting at position 0 of
// `residue`. Vocabulary is pre-sorted longest-first, so the first hit wins.
// Returns the matched lego or null.
function findLongestMatch(residue, vocabulary, charLevel) {
  for (const lego of vocabulary) {
    const t = lego.target_text
    if (!t) continue
    // Case-insensitive, FIXED-LENGTH prefix compare. We fold case for the
    // match test only; the caller slices the ORIGINAL surface by t.length, so
    // the displayed casing and the reassembly/integrity contract are both
    // preserved. Comparing exactly t.length chars means accent/ß-style
    // case expansions can only fail-to-match (→ ghost), never corrupt the
    // slice length. Fixes sentence-initial capitals (Quiero/Ich/No) ghosting.
    if (residue.length < t.length) continue
    if (residue.slice(0, t.length).toLowerCase() !== t.toLowerCase()) continue
    // Word-boundary guard for whitespace-delimited scripts: the match must END
    // at a boundary, so a short LEGO ("el") can't match the prefix of a longer
    // word ("ella"). CJK/char-level has a boundary at every char, so skip.
    if (!charLevel && !isBoundaryAt(residue, t.length)) continue
    return lego
  }
  return null
}

// Whitespace-normalise for the integrity check. We collapse runs of whitespace
// to a single space and trim, so "I want  to" matches "I want to". This is
// per the spec: "handle whitespace differences gracefully".
function normaliseWhitespace(s) {
  return (s || '').replace(/\s+/g, ' ').trim()
}

// =============================================================================
// Pure algorithm
// =============================================================================

/**
 * Decompose `targetText` against `vocabulary`.
 *
 * @param {string} targetText
 *   The phrase's target_text (the audible target-language string).
 * @param {Array<{lego_id: string, target_text: string, known_text: string}>} vocabulary
 *   Introduced LEGOs for this phrase. Caller is responsible for filtering by
 *   seed_number; this function takes whatever's handed to it.
 *   Will be sorted internally by target_text length DESC (longest first) so
 *   callers don't have to.
 *
 * @returns {Array<{legoId: string|null, target: string, known: string, isGhost: boolean}>}
 *
 * Throws if the resulting blocks don't recompose to targetText (whitespace-
 * normalised). The runtime fallback handles the throw at the wrapper layer —
 * we never persist an invalid decomposition.
 */
function decomposeText(targetText, vocabulary) {
  if (typeof targetText !== 'string') {
    throw new Error('decomposeText: targetText must be a string')
  }
  if (!Array.isArray(vocabulary)) {
    throw new Error('decomposeText: vocabulary must be an array')
  }

  // Sort longest-first so the left-to-right scan tries the most specific
  // match at each position. A short LEGO would never win against a longer
  // one that starts at the same position — that's the whole point of the
  // "longest-match-wins" greedy decomposition.
  const sorted = vocabulary
    .filter(l => l && typeof l.target_text === 'string' && l.target_text.length > 0)
    .slice()
    .sort((a, b) => b.target_text.length - a.target_text.length)

  const charLevel = isCharLevelScript(targetText)
  const blocks = []

  // Left-to-right scan. `residue` is the unconsumed remainder.
  let residue = targetText

  // Safety stop: in the worst case every iteration consumes at least one
  // character (the token-advance path). Cap at targetText length + a buffer
  // for surrogate pairs to be safe.
  const maxIterations = Array.from(targetText).length + 64
  let iterations = 0

  while (residue.length > 0) {
    if (++iterations > maxIterations) {
      throw new Error(`decomposeText: runaway loop on "${targetText}" (residue="${residue}")`)
    }

    // Skip pure leading whitespace BEFORE attempting a match. Vocabulary
    // entries are stored without leading/trailing whitespace, so trying to
    // match "I want" against " I want to learn" would never hit. We absorb
    // the skipped whitespace into the next block's `target` so the concat
    // invariant still holds.
    const wsMatch = residue.match(/^(\s+)/)
    const leadingWs = wsMatch ? wsMatch[1] : ''
    const matchStart = leadingWs ? residue.slice(leadingWs.length) : residue

    const lego = findLongestMatch(matchStart, sorted, charLevel)

    if (lego) {
      // Carry the ORIGINAL surface (case-preserving) — NOT lego.target_text —
      // so case-insensitive matching can't corrupt reassembly, and the tile
      // shows the phrase's actual casing.
      const surface = matchStart.slice(0, lego.target_text.length)
      blocks.push({
        legoId: lego.lego_id,
        target: leadingWs + surface,
        known: lego.known_text || '',
        isGhost: false
      })
      residue = matchStart.slice(lego.target_text.length)
      continue
    }

    // No LEGO match — advance by one token and emit a ghost block.
    const { token, rest } = consumeOneToken(matchStart, charLevel)
    if (!token) {
      // Defensive: shouldn't happen given the residue.length > 0 guard, but
      // avoid an infinite loop if some pathological input slips through.
      throw new Error(`decomposeText: failed to consume any token from "${matchStart}"`)
    }
    blocks.push({
      legoId: null,
      target: leadingWs + token,
      // Ghost-block `known` defaults to "" per spec. Future work: look up
      // which earlier M-LEGO covers this surface form and inherit its known.
      known: '',
      isGhost: true
    })
    residue = rest
  }

  // Integrity check: blocks must recompose to targetText (whitespace-normalised).
  // This is the contract the runtime depends on — if we violate it, the
  // wrapper logs and skips persistence rather than poisoning the DB.
  const recomposed = blocks.map(b => b.target).join('')
  if (normaliseWhitespace(recomposed) !== normaliseWhitespace(targetText)) {
    throw new Error(
      `decomposeText: integrity violation — recomposed "${recomposed}" != target "${targetText}"`
    )
  }

  return blocks
}

// =============================================================================
// Salient-anchored decomposition
// =============================================================================

// Find the parent LEGO's surface span in the phrase: case-folded, fixed-length
// (so accent/case expansion can't drift the index), and — for whitespace-
// delimited scripts — only at whole-word boundaries (so "한" can't match inside
// "한국어"). CJK/char-level scripts have a boundary at every char.
function findParentSpan(targetText, parentTarget, charLevel) {
  if (!parentTarget) return null
  const L = parentTarget.length
  if (L === 0 || L > targetText.length) return null
  const folded = parentTarget.toLowerCase()
  for (let i = 0; i + L <= targetText.length; i++) {
    if (targetText.slice(i, i + L).toLowerCase() !== folded) continue
    // Whole-word boundary on both sides (whitespace, punctuation, or edge) so
    // "한" can't match inside "한국어". CJK/char-level: every char is a boundary.
    if (!charLevel && !(isBoundaryAt(targetText, i - 1) && isBoundaryAt(targetText, i + L))) continue
    return { index: i, length: L }
  }
  return null
}

// Word spans (word-level scripts): [{ surface, start, end }] for each
// non-whitespace run. Used by the INSERT matcher.
function wordSpans(text) {
  const out = []
  const re = /\S+/g
  let m
  while ((m = re.exec(text)) !== null) out.push({ surface: m[0], start: m.index, end: m.index + m[0].length })
  return out
}
const foldEq = (a, b) => a.toLowerCase() === b.toLowerCase()

// INSERT match (Tom's rule: inserted words are NOT errors — the LEGO's legs are
// present and in order, the words wedged between them are ghosts). Word-level
// only. Finds the phrase span [first..last] where every parent word appears as
// an ordered whole-word subsequence, with ≥1 non-parent word inside the span
// (the ghost insert). Classic case: German/Dutch separable verbs and pronoun/
// adverb interpolation ("habe gemacht" → "habe es gemacht").
// Returns { start, end, parentWordSpans, ghostWordSpans } or null.
function findInsertSpan(targetText, parentTarget) {
  const parentWords = parentTarget.trim().split(/\s+/).filter(Boolean)
  if (parentWords.length < 2) return null // a single-word LEGO can't be split by an insert
  const words = wordSpans(targetText)
  // Greedy earliest ordered subsequence match.
  const matched = []
  let j = 0
  for (let i = 0; i < words.length && j < parentWords.length; i++) {
    if (foldEq(words[i].surface, parentWords[j])) { matched.push(i); j++ }
  }
  if (j < parentWords.length) return null // not all parent words present in order
  const first = matched[0], last = matched[matched.length - 1]
  if (last - first + 1 === matched.length) return null // contiguous → exact path already handles it
  const matchedSet = new Set(matched)
  const parentWordSpans = matched.map(i => words[i])
  const ghostWordSpans = []
  for (let i = first; i <= last; i++) if (!matchedSet.has(i)) ghostWordSpans.push(words[i])
  return { start: words[first].start, end: words[last].end, parentWordSpans, ghostWordSpans }
}

// Celtic initial-consonant mutations. The rule table and the forward-mutation
// helper now live in course-builder/lib/initial-mutations.cjs so that the
// decomposer and the LEGO containment gate agree on what "the same word" means.
const { mutationVariants } = require('./course-builder/lib/initial-mutations.cjs')

// Unified parent anchor: exact → insert → mutation (retrying exact + insert with
// each mutated LEGO surface). Returns a descriptor with `kind`, or null when the
// parent genuinely can't be located — which the caller treats as a content/
// production error (Tom's rule: a conjugated or absent LEGO is a generation
// failure, not something to paper over).
function findParentMatch(targetText, parentLego, charLevel, langPrefix) {
  const pt = parentLego.target_text
  // A LEGO's canonical surface sometimes carries sentence punctuation
  // ("Muchas gracias.") that the phrase doesn't ("Muchas gracias pero…"). Try
  // the raw form first, then a leading/trailing-punctuation-trimmed form.
  const trimmed = pt.replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, '')
  const surfaces = trimmed && trimmed !== pt ? [pt, trimmed] : [pt]

  for (const s of surfaces) {
    const exact = findParentSpan(targetText, s, charLevel)
    if (exact) return { kind: 'exact', span: exact }
    if (!charLevel) {
      const ins = findInsertSpan(targetText, s)
      if (ins) return { kind: 'insert', insert: ins }
    }
  }
  if (!charLevel) {
    for (const base of surfaces) {
      for (const variant of mutationVariants(base, langPrefix)) {
        const ex = findParentSpan(targetText, variant, charLevel)
        if (ex) return { kind: 'mutation', span: ex }
        const mi = findInsertSpan(targetText, variant)
        if (mi) return { kind: 'mutation', insert: mi }
      }
    }
  }
  return null
}

/**
 * Like decomposeText, but GUARANTEES the parent (salient) LEGO is anchored as
 * its own block(s) whenever it's present — exactly, split by ghost inserts, or
 * via a Celtic mutation. Every phrase belongs to its parent course_lego, so the
 * salient is always KNOWN; this anchors it rather than leaving it to the greedy
 * matcher.
 *
 * Returns { blocks, kind } where kind is one of:
 *   'exact'    — parent surface present verbatim
 *   'insert'   — parent legs present in order, ghost word(s) wedged between them
 *   'mutation' — parent present under a Celtic initial-consonant mutation
 *   'error'    — parent neither exact, inserted, nor mutated → conjugated or
 *                absent. A PRODUCTION ERROR (the phrase doesn't cleanly contain
 *                its LEGO). We still emit a salient-less greedy tiling so the
 *                player renders something; the caller flags the error for review.
 *   'no-parent'— no parent LEGO supplied (provenance gap, not a content error)
 *
 * @param {string} targetText
 * @param {Array<{lego_id,target_text,known_text}>} vocabulary
 * @param {{lego_id,target_text,known_text}|null} parentLego
 * @param {string} [langPrefix] course code or target-lang prefix (for mutations)
 */
function decomposeAnchored(targetText, vocabulary, parentLego, langPrefix) {
  if (!parentLego || !parentLego.target_text) {
    return { blocks: decomposeText(targetText, vocabulary), kind: 'no-parent' }
  }
  const charLevel = isCharLevelScript(targetText)
  const prefix = (langPrefix || '').split('_')[0]
  const match = findParentMatch(targetText, parentLego, charLevel, prefix)
  if (!match) {
    // Conjugation or genuine absence — flag it (caller), but still render.
    return { blocks: decomposeText(targetText, vocabulary), kind: 'error' }
  }

  // Carve the salient span. EXACT/MUTATION-exact → one salient block. INSERT →
  // alternating salient legs + ghost inserts.
  let spanStart, spanEnd
  const salientBlocks = []
  const known = parentLego.known_text || ''
  if (match.span) {
    spanStart = match.span.index
    spanEnd = match.span.index + match.span.length
    salientBlocks.push({
      legoId: parentLego.lego_id,
      target: targetText.slice(spanStart, spanEnd),
      known, isGhost: false, isSalient: true,
    })
  } else {
    const ins = match.insert
    spanStart = ins.start
    spanEnd = ins.end
    // Walk every word in the span in order; attach inter-word whitespace to the
    // FOLLOWING word's leading edge (mirrors decomposeText) so reassembly is exact.
    const inSpan = [
      ...ins.parentWordSpans.map(w => ({ ...w, parent: true })),
      ...ins.ghostWordSpans.map(w => ({ ...w, parent: false })),
    ].sort((a, b) => a.start - b.start)
    let cursor = spanStart
    let firstLeg = true
    for (const w of inSpan) {
      const lead = targetText.slice(cursor, w.start)
      if (w.parent) {
        salientBlocks.push({ legoId: parentLego.lego_id, target: lead + w.surface, known: firstLeg ? known : '', isGhost: false, isSalient: true })
        firstLeg = false
      } else {
        salientBlocks.push({ legoId: null, target: lead + w.surface, known: '', isGhost: true })
      }
      cursor = w.end
    }
  }

  const before = targetText.slice(0, spanStart)
  const after = targetText.slice(spanEnd)
  // decomposeText can't consume a trailing-whitespace-only residue, so peel the
  // separator whitespace off the end of `before` and fold it onto the first
  // salient block's leading edge (keeps the concat invariant exact).
  const beforeContent = before.replace(/\s+$/, '')
  const sepWs = before.slice(beforeContent.length)
  if (sepWs && salientBlocks.length) salientBlocks[0].target = sepWs + salientBlocks[0].target

  const blocks = []
  if (beforeContent.length) blocks.push(...decomposeText(beforeContent, vocabulary))
  blocks.push(...salientBlocks)
  if (after.length) blocks.push(...decomposeText(after, vocabulary))

  const recomposed = blocks.map(b => b.target).join('')
  if (normaliseWhitespace(recomposed) !== normaliseWhitespace(targetText)) {
    throw new Error(`decomposeAnchored: integrity violation — "${recomposed}" != "${targetText}"`)
  }
  return { blocks, kind: match.kind }
}

// =============================================================================
// Database wrapper
// =============================================================================

/**
 * Fetch vocabulary + current course version, then run decomposeText.
 *
 * Vocabulary scope per Tom's resolved spec decision:
 *   ALL rows in course_legos for `courseCode` with seed_number ≤ seedNumber.
 *   No status filter — presence in course_legos is the only test for
 *   "introduced in this course".
 *
 * @param {SupabaseClient} supabase
 * @param {string} courseCode
 * @param {number} seedNumber
 *   The phrase's seed_number. We chunk against LEGOs from seeds 1..seedNumber
 *   (cross-seed visibility = "all introduced", not "currently in rotation").
 * @param {string} targetText
 *
 * @returns {Promise<{decomposition: Array, course_version: number}>}
 *   Returns the decomposition blocks + the course's current version stamp.
 *   The caller writes both to the phrase row in the same UPDATE.
 *
 * Throws on:
 *   - Supabase fetch errors (caller decides whether to swallow)
 *   - decomposeText integrity violations
 */
async function decomposePhrase(supabase, courseCode, seedNumber, targetText) {
  if (!supabase) throw new Error('decomposePhrase: supabase client required')
  if (!courseCode) throw new Error('decomposePhrase: courseCode required')
  if (typeof seedNumber !== 'number' || !Number.isFinite(seedNumber)) {
    throw new Error(`decomposePhrase: seedNumber must be a number (got ${seedNumber})`)
  }

  // Build the lego_id string from seed_number + lego_index as we read rows —
  // course_legos has UUID primary keys but the spec/runtime use the
  // canonical "S0042L01" form. Mirror the construction used elsewhere in
  // the codebase (e.g. seed-complete.cjs:628).
  const { data: legoRows, error: legoErr } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, target_text, known_text')
    .eq('course_code', courseCode)
    .lte('seed_number', seedNumber)

  if (legoErr) throw new Error(`decomposePhrase: course_legos fetch failed — ${legoErr.message}`)

  const vocabulary = (legoRows || []).map(l => ({
    lego_id: `S${String(l.seed_number).padStart(4, '0')}L${String(l.lego_index).padStart(2, '0')}`,
    target_text: l.target_text,
    known_text: l.known_text
  }))

  // Pull current course version in parallel-ish — sequential is fine here,
  // saves an extra round-trip if the legos query already failed.
  const { data: courseRow, error: courseErr } = await supabase
    .from('courses')
    .select('version')
    .eq('course_code', courseCode)
    .single()

  if (courseErr) throw new Error(`decomposePhrase: courses fetch failed — ${courseErr.message}`)

  const decomposition = decomposeText(targetText, vocabulary)

  return {
    decomposition,
    course_version: courseRow?.version ?? null
  }
}

module.exports = {
  decomposeText,
  decomposeAnchored,
  decomposePhrase,
  // Exported for testing/debugging; not part of the public surface
  _internal: {
    isCharLevelScript,
    normaliseWhitespace,
    consumeOneToken,
    findLongestMatch
  }
}
