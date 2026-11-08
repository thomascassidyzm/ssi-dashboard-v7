/**
 * Canonical text normalization for audio matching.
 *
 * THE RULE (Tom, 2026-10-13): capitalisation does not distinguish a recording,
 * a question mark does. "Onde era?" and "onde era" are two recordings (question
 * intonation vs statement), so a trailing ? is PART OF THE KEY. Everything else
 * trailing (. ! and the CJK stops) is stripped, case is folded.
 *
 * This is byte-identical to the SQL function normalize_text(), which the
 * course_audio / shared_audio BEFORE INSERT OR UPDATE trigger runs and which
 * feeds UNIQUE (course_code, text_normalized, language, role, voice_id). Before
 * 2026-10-13 the SQL stripped the ? as well, so rendering the question
 * overwrote the statement (and vice versa) and the app, which kept the ?,
 * missed every row (#408/#409). The SQL lives in
 * database/migrations/20261013_audio_key_keeps_question_mark.sql; the backfill
 * that re-keyed the stored rows is tools/audio-question-key-backfill.cjs.
 *
 * Question detection: a trailing run of [.!?。？！] that CONTAINS a ? or ？ is
 * collapsed to a single ASCII '?', with any whitespace before it dropped
 * ("Tu viens ?" and "tu viens?" are one recording). A run with no ? is stripped.
 * A leading ¿ or ¡ is left alone.
 */
const QUESTION_TAIL = /\s*[.!?。？！¡]*[?？][.!?。？！]*$/
const ENDS_IN_QUESTION = /[?？][.!?。？！]*$/

/** The one rule. Does NOT collapse internal whitespace (the SQL does not). */
function normalizeForDb(text) {
  if (!text) return ''
  const t = text.toLowerCase().trim()
  if (ENDS_IN_QUESTION.test(t)) return t.replace(QUESTION_TAIL, '?')
  return t.replace(/[.?!¿¡。？！]+$/, '')
}

/** Same key, plus internal whitespace collapsed (callers that build keys from loose input). */
function normalizeForAudio(text) {
  if (!text) return ''
  return normalizeForDb(text.replace(/\s+/g, ' '))
}

/**
 * Every form the same text may be stored under, de-duplicated. Since the
 * 2026-10-13 backfill there is one convention, so this is normally a single
 * key; kept as a list so existing `.in('text_normalized', ...)` callers work.
 */
function audioKeyCandidates(text) {
  return [...new Set([normalizeForDb(text), normalizeForAudio(text)].filter(Boolean))]
}

/** A pod TURN's sentences: the boundary phase 8 synthesises on (moved here from phase8-audio-v13.cjs, job #352). */
function splitPodTurnSentences(text) {
  return String(text || '')
    .split(/(?<=[。！？])\s*(?=\S)|(?<=[.!?…؟])\s+(?=\S)/)
    .map(s => s.trim())
    .filter(Boolean)
}

/**
 * The text a multi-sentence pod turn is synthesised AND STORED as: its sentences joined by the " … " pause cue.
 * So the clip of the row "A. B." carries the text "A. … B." — one recording, two spellings. Every lookup of a
 * line's existing recording asks for both (clip-library existingClipsInLanguage).
 */
function podTtsText(text) {
  const sents = splitPodTurnSentences(text)
  return sents.length > 1 ? sents.join(' … ') : String(text)
}

/**
 * THE POD PAUSE CUE IS NOT A WORD (job #813, 2026-11-08). podTtsText above makes "A. B." into "A. … B." for the
 * synthesiser, and stores it that way, so ONE line of words has two spellings in course_audio. Lookups that asked
 * for one spelling never saw a clip filed under the other, and the render route paid for a second take of the same
 * words in the same voice: job #440·Y's English pod-1 fill (2026-10-26) asked with the old clip's cued text and
 * rendered Tom-006 80f18176 / 7858bc28 beside the plain-text cd09add1 / d3a981c8 made 20 minutes earlier.
 *
 * The fold removes ONLY a cue: an ellipsis ("…" or "...") standing on its own AFTER a completed sentence stop and
 * before whitespace or the end. That is exactly the token podTtsText inserts, so nothing a speaker says is removed.
 * An ellipsis attached to a word ("Sarah… did you", "...I") is a hesitation INSIDE a sentence (the splice tool's
 * ELLIPSIS_IS_HESITATION courses split on it) and is never folded, so lines that differ in delivery stay apart.
 * normalizeForDb is untouched: it is byte-identical to SQL normalize_text() and keys the unique constraint.
 */
// Latin/Arabic stops: podTtsText joins with " … " and the space after the stop stays. CJK stops take no space, so
// podTtsText's "你好。 … 谢谢" folds back to "你好。谢谢"; an unspaced "你好。…谢谢" is not its output and is kept.
const POD_PAUSE_CUE = /(?<=[.!?؟])\s*(?:…|\.{3})(?=\s|$)/g
const POD_PAUSE_CUE_CJK = /(?<=[。！？])\s+(?:…|\.{3})(?:\s+|$)/g
function withoutPodPauseCues(text) {
  return String(text == null ? '' : text).replace(POD_PAUSE_CUE_CJK, '').replace(POD_PAUSE_CUE, '')
}

/** Do two texts name ONE recording? Same audio key once pod pause cues are folded. */
function sameRecordedWords(a, b) {
  return normalizeForAudio(withoutPodPauseCues(a)) === normalizeForAudio(withoutPodPauseCues(b))
}

/**
 * Every stored text_normalized a recording of these words may sit under: the text as given, its cue-folded form,
 * and the cued form phase 8 stores a multi-sentence pod turn as. The key list a library-first lookup asks for.
 */
function recordingTextKeys(text) {
  if (!text) return []
  const plain = withoutPodPauseCues(text)
  return [...new Set([text, plain, podTtsText(plain)].flatMap(audioKeyCandidates))]
}

module.exports = { normalizeForAudio, normalizeForDb, audioKeyCandidates, podTtsText, splitPodTurnSentences, withoutPodPauseCues, sameRecordedWords, recordingTextKeys }
