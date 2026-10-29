/**
 * The sentences of a pod line, split the way the learner's player splits them.
 *
 * The player (ssi-learning-app packages/player-vue/src/composables/podSentenceSplit.ts, POD_SENTENCE_BOUNDARY) pairs a
 * line's per-sentence clips with the sentences of its text by index, splitting after . ! ? followed by whitespace — and
 * NOT after '…', which marks a hesitation inside one sentence. Two repos share a database, not a module graph, so the
 * boundary is copied here: change both together.
 */
'use strict'

const POD_SENTENCE_BOUNDARY = /(?<=[.!?])\s+/

/** The line's sentences, trimmed, empties dropped. */
function podSentencesOf(text) {
  return String(text || '').split(POD_SENTENCE_BOUNDARY).map((s) => s.trim()).filter(Boolean)
}

/** Letters and digits only, lower-cased: the player's own word comparison (wordsOnly). */
function wordsOnly(text) {
  return String(text || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
}

module.exports = { POD_SENTENCE_BOUNDARY, podSentencesOf, wordsOnly }
