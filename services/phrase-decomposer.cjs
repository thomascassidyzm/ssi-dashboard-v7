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

// Try to match the longest vocabulary entry starting at position 0 of
// `residue`. Vocabulary is pre-sorted longest-first, so the first hit wins.
// Returns the matched lego or null.
function findLongestMatch(residue, vocabulary) {
  for (const lego of vocabulary) {
    const t = lego.target_text
    if (!t) continue
    // Case-insensitive, FIXED-LENGTH prefix compare. We fold case for the
    // match test only; the caller slices the ORIGINAL surface by t.length, so
    // the displayed casing and the reassembly/integrity contract are both
    // preserved. Comparing exactly t.length chars means accent/ß-style
    // case expansions can only fail-to-match (→ ghost), never corrupt the
    // slice length. Fixes sentence-initial capitals (Quiero/Ich/No) ghosting.
    if (residue.length >= t.length &&
        residue.slice(0, t.length).toLowerCase() === t.toLowerCase()) {
      return lego
    }
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

    const lego = findLongestMatch(matchStart, sorted)

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
  decomposePhrase,
  // Exported for testing/debugging; not part of the public surface
  _internal: {
    isCharLevelScript,
    normaliseWhitespace,
    consumeOneToken,
    findLongestMatch
  }
}
