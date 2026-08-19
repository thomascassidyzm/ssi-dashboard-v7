// src/utils/tutorialScript.js
/**
 * The practice script the recordist tutorial feeds to the REAL Autocue Studio.
 *
 * The studio's phrases normally come from `/api/production/:course/recording-
 * script` (useAutocueState.loadOptimizedScript). The tutorial hands it the same
 * SHAPE of rows built locally from PHRASE_PACKS instead, so every downstream
 * behaviour the recordist is being taught — the slow pass drawing gap markers,
 * the live chunk pips, the refusal panel when the pauses do not land, the LEGO
 * pieces on the review card — is the product's own code path reading its own
 * data, not a lookalike.
 *
 * The fields that matter, and why:
 *   cadence      'natural' | 'slow' — decides which pass the teleprompter draws
 *                and, via legoChunkCount(), whether a take is judged on pauses.
 *   chunksString 'a|b|c'  — the LEGO map. resolvePhraseChunks() reads it, the
 *                teleprompter draws a beat marker between each piece, the
 *                recorder sizes its silence tolerance from the count, and
 *                buildTakeChunks() labels the pieces on the review card.
 *   seedNumber / legoId / coversLegos are deliberately NULL/empty: a tutorial
 *                take has no course identity, and nothing in it may ever be
 *                mistakable for one. Nothing uploads it either (see
 *                AutocueStudio's tutorial gate) — this is belt and braces.
 *
 * `id` is a local key only. Prefixed `tutorial-` rather than the live script's
 * `script-N` so a stray row is identifiable at a glance in any log.
 */
import { PHRASE_PACKS, packById } from '@/utils/tutorialPhrases'

export { PHRASE_PACKS, packById }

/**
 * Build the four-item practice script for a pack: two natural, then two slow.
 *
 * The order is the lesson's order and is not incidental — the recordist hears
 * themselves talking normally before they are asked to do anything strange, so
 * the slow read is felt as a departure from their own voice rather than as
 * "how recording sounds".
 */
export function tutorialPhrases(packId) {
  const pack = packById(packId)
  const rows = []

  pack.natural.forEach((text, i) => {
    rows.push({
      id: `tutorial-nat-${i}`,
      text,
      translation: '',
      cadence: 'natural',
      type: 'phrase',
      phraseIndex: i,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      coversLegos: [],
      known: '',
      seedNumber: null,
      legoId: '',
      role: 'tutorial',
      recordingChunks: null,
      legoChunks: null,
      chunksString: null,
      chunkCount: null
    })
  })

  pack.slow.forEach((read, i) => {
    const text = read.chunks.join(' ')
    rows.push({
      id: `tutorial-slow-${i}`,
      text,
      translation: '',
      cadence: 'slow',
      type: 'phrase',
      phraseIndex: pack.natural.length + i,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      coversLegos: [],
      known: '',
      seedNumber: null,
      legoId: '',
      role: 'tutorial',
      // recordingChunks is what resolvePhraseChunks prefers, and its presence
      // is what makes legoChunkCount return 3 rather than the "unknown = 1"
      // fallback. Without it the studio would treat a slow tutorial read as an
      // ordinary phrase: no beat markers, no pips, no refusal — i.e. none of
      // the lesson.
      recordingChunks: read.chunks.map(text => ({ text, mergedGlue: null, legoId: null })),
      legoChunks: null,
      chunksString: read.chunks.join('|'),
      chunkCount: read.chunks.length
    })
  })

  return rows
}

/** Which of the four items are the slow reads, in order. */
export function slowPhraseIds(packId) {
  return tutorialPhrases(packId).filter(p => p.cadence === 'slow').map(p => p.id)
}
