// src/utils/phraseChunks.js
/**
 * Resolve a script phrase into the chunks the recordist reads without pausing.
 *
 * The autocue draws a gap marker BETWEEN these chunks in the slow pass, and the
 * recorder sizes its silence tolerance from how many of them there are. Those
 * two must agree: the UI inviting a pause the recorder cannot survive is
 * exactly the 2026-08-07 bug (Kai's slow takes cut at the first gap marker).
 * So both read this one function rather than each rolling their own.
 *
 * `source` says where the chunks came from, and it matters. Only the first
 * three are real LEGO boundaries from the recording optimiser; 'words' is a
 * display-only fallback for phrases that arrived with no chunk map at all, and
 * a caller making a RECORDING decision must not treat a word count as a LEGO
 * count — see legoChunkCount() below.
 */
export function resolvePhraseChunks(phrase) {
  if (!phrase) return { chunks: [], source: 'none' }

  const asChunk = (c) => ({
    text: typeof c === 'string' ? c : c.text,
    mergedGlue: typeof c === 'object' && c ? c.mergedGlue ?? null : null,
    legoId: typeof c === 'object' && c ? c.legoId ?? null : null,
  })

  // Preferred: recordingChunks with glue absorbed into adjacent LEGOs
  if (Array.isArray(phrase.recordingChunks) && phrase.recordingChunks.length > 0) {
    return { chunks: phrase.recordingChunks.map(asChunk), source: 'recordingChunks' }
  }
  // Next: raw chunks array (strings or objects)
  if (Array.isArray(phrase.chunks) && phrase.chunks.length > 0) {
    return { chunks: phrase.chunks.map(asChunk), source: 'chunks' }
  }
  // Next: pipe-delimited string from the optimiser output
  if (typeof phrase.chunksString === 'string' && phrase.chunksString.length > 0) {
    const chunks = phrase.chunksString
      .split('|')
      .map(s => s.trim())
      .filter(Boolean)
      .map(text => ({ text, mergedGlue: null, legoId: null }))
    if (chunks.length > 0) return { chunks, source: 'chunksString' }
  }
  // Fallback: legacy word-level split (no LEGO info available)
  if (!phrase.text) return { chunks: [], source: 'none' }
  return {
    chunks: phrase.text.split(/\s+/).filter(Boolean).map(text => ({ text, mergedGlue: null, legoId: null })),
    source: 'words',
  }
}

/**
 * How many LEGO chunks this phrase is genuinely known to have — 1 when we do
 * not actually know.
 *
 * Deliberately returns 1 for the word-split fallback. A phrase with no chunk
 * map draws no gap markers, so the recordist is not being asked to pause in it;
 * treating its nine words as nine chunks would make the recorder wait out a
 * long silence on every ordinary phrase. Unknown means "behave as before".
 */
export function legoChunkCount(phrase) {
  const { chunks, source } = resolvePhraseChunks(phrase)
  if (source === 'recordingChunks' || source === 'chunks' || source === 'chunksString') {
    return Math.max(1, chunks.length)
  }
  return 1
}
