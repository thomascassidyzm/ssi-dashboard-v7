/**
 * voice-engine/chunking.cjs — text chunking for the human voice engine.
 *
 * Pure functions, no I/O. The chunkers are ported verbatim from
 * tools/recording-optimizer/generate-recording-script.cjs (the wired planner)
 * so the engine tiles phrases EXACTLY the way the recording script did —
 * the speaker's pause map (chunksString) and the splice plan must agree.
 * Keep in sync with that file if the planner's chunking ever changes.
 *
 * Vocabulary: known / target / seed. Identity is never derived from filenames
 * (Latin-only safeFilename collapses Cyrillic — Macedonian is Cyrillic).
 */

/**
 * Normalize text for chunk matching:
 * lowercase, strip accents, straighten quotes, strip punctuation.
 * This is the PLANNER's normalization (matching against the LEGO universe),
 * distinct from services/shared/text-normalize.cjs#normalizeForAudio which is
 * the course_audio.text_normalized contract.
 */
function normalizeForMatching(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // Curly single quotes → straight
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // Curly double quotes → straight
    .replace(/[?!.,;:'"()[\]{}]/g, '') // Remove punctuation
    .trim()
}

/** Tokenize a phrase into normalized words (whitespace languages). */
function tokenize(text) {
  return normalizeForMatching(text)
    .split(/\s+/)
    .filter(w => w.length > 0)
}

/**
 * Parse a pipe-delimited chunksString ("je veux|parler|macédonien") into
 * trimmed chunk texts. Falls back to whitespace split when no delimiter.
 * Ported from tools/recording-optimizer/align-audio.cjs#parseChunks.
 */
function parseChunks(text, { delimiter = '|' } = {}) {
  const raw = delimiter && text.includes(delimiter)
    ? text.split(delimiter)
    : text.trim().split(/\s+/)
  return raw
    .map(c => c.trim().replace(/^[¿¡"'(\[]+/, '').replace(/[?!.,;:"'\)\]]+$/, ''))
    .filter(c => c.length > 0)
}

/**
 * Chunk a phrase into LEGO-sized pieces via maximum-munch left-to-right.
 * Words not covered by any LEGO become singleton "glue" chunks.
 *
 * @param {string} originalPhrase - phrase as the speaker saw it
 * @param {Map} universe - Map of normalized LEGO target text → { legoId, type }
 * @returns {Array<{text, legoId, type, isLego}>} in reading order
 */
function chunkPhraseByLegos(originalPhrase, universe) {
  const originalTokens = originalPhrase.trim().split(/\s+/)
  const normalizedTokens = tokenize(originalPhrase)

  // Defensive: if tokenization mismatches word count, bail gracefully.
  if (originalTokens.length !== normalizedTokens.length) {
    return [{ text: originalPhrase, legoId: null, type: null, isLego: false }]
  }

  const chunks = []
  let i = 0
  while (i < normalizedTokens.length) {
    let matchLen = 0
    let matchLegoInfo = null
    const maxLen = Math.min(normalizedTokens.length - i, 8)
    for (let len = maxLen; len >= 1; len--) {
      const candidate = normalizedTokens.slice(i, i + len).join(' ')
      if (universe.has(candidate)) {
        matchLen = len
        matchLegoInfo = universe.get(candidate)
        break
      }
    }

    if (matchLen > 0) {
      const chunkText = originalTokens.slice(i, i + matchLen).join(' ')
      chunks.push({ text: chunkText, legoId: matchLegoInfo.legoId, type: matchLegoInfo.type, isLego: true })
      i += matchLen
    } else {
      chunks.push({ text: originalTokens[i], legoId: null, type: null, isLego: false })
      i += 1
    }
  }
  return chunks
}

/**
 * Merge glue chunks (words not covered by a LEGO) into adjacent LEGO chunks.
 * Left-attach by default; leading glue attaches to the next LEGO.
 * The merged chunk keeps the LEGO's id; absorbed glue tracked in mergedGlue.
 */
function mergeGlueIntoLegos(chunks, direction = 'left') {
  if (chunks.length === 0) return chunks
  if (chunks.every(c => !c.isLego)) return chunks

  const result = []
  let pendingGlue = []

  const flushLeading = (legoChunk) => {
    if (pendingGlue.length === 0) return legoChunk
    const glueText = pendingGlue.map(g => g.text).join(' ')
    const merged = {
      ...legoChunk,
      text: glueText + ' ' + legoChunk.text,
      mergedGlue: [...(legoChunk.mergedGlue || []), ...pendingGlue.map(g => g.text)],
    }
    pendingGlue = []
    return merged
  }

  for (const chunk of chunks) {
    if (chunk.isLego) {
      result.push(flushLeading({ ...chunk }))
    } else {
      if (direction === 'left' && result.length > 0) {
        const prev = result[result.length - 1]
        prev.text = prev.text + ' ' + chunk.text
        prev.mergedGlue = [...(prev.mergedGlue || []), chunk.text]
      } else {
        pendingGlue.push(chunk)
      }
    }
  }

  if (pendingGlue.length > 0 && result.length > 0) {
    const last = result[result.length - 1]
    const glueText = pendingGlue.map(g => g.text).join(' ')
    last.text = last.text + ' ' + glueText
    last.mergedGlue = [...(last.mergedGlue || []), ...pendingGlue.map(g => g.text)]
  }

  return result
}

/**
 * Tile a phrase the way the recording script did: max-munch LEGO chunks with
 * glue merged left. These are the units the splicer looks up in the segment
 * store.
 */
function recordingChunksForPhrase(phraseText, universe) {
  return mergeGlueIntoLegos(chunkPhraseByLegos(phraseText, universe), 'left')
}

/**
 * Build the LEGO universe from course_legos rows (is_new = true), keyed by
 * normalized target text. Mirrors the planner's universe construction.
 */
function buildUniverse(legoRows) {
  const universe = new Map()
  for (const lego of legoRows || []) {
    if (!lego?.target_text) continue
    const key = normalizeForMatching(lego.target_text)
    if (!key || universe.has(key)) continue
    universe.set(key, {
      legoId: lego.lego_id || `S${lego.seed_number}L${lego.lego_index}`,
      type: lego.type || 'A',
      original: lego.target_text,
    })
  }
  return universe
}

/**
 * All contiguous 1..8-token subsequences of a phrase (planner's coverage
 * machinery) — used by /coverage to compute the honest seed-auto-cover gap:
 * a LEGO that appears in NO candidate's contiguous token stream can never be
 * extracted by alignment, however the greedy cover counted it.
 */
function getAllSubsequences(words) {
  const result = new Set()
  for (const w of words) result.add(w)
  for (let len = 2; len <= Math.min(words.length, 8); len++) {
    for (let start = 0; start <= words.length - len; start++) {
      result.add(words.slice(start, start + len).join(' '))
    }
  }
  return result
}

module.exports = {
  normalizeForMatching,
  tokenize,
  parseChunks,
  chunkPhraseByLegos,
  mergeGlueIntoLegos,
  recordingChunksForPhrase,
  buildUniverse,
  getAllSubsequences,
}
