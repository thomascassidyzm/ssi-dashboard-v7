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

module.exports = { normalizeForAudio, normalizeForDb, audioKeyCandidates }
