/**
 * Canonical text normalization for audio matching.
 *
 * ⚠️ THE DATABASE DOES NOT AGREE WITH normalizeForAudio, AND THE DATABASE WINS.
 *
 * `course_audio.text_normalized` is written by the BEFORE INSERT OR UPDATE
 * trigger `trg_course_audio_normalize`, which calls the SQL function
 *   normalize_text(t) = rtrim(lower(trim(t)), '.?!¿¡。？！')
 * unconditionally. It overwrites whatever a caller supplied. So the rule this
 * file used to state — "EVERY write to text_normalized MUST use this function"
 * — has not been true since the trigger landed: as of 2026-08-06, of the
 * course_audio rows whose text ends in '?', 154,257 are stored with the '?'
 * STRIPPED and only 5,305 (all written Jan–Feb 2026, before the trigger) keep
 * it. The column therefore holds TWO incompatible conventions and no single
 * exact key can reach both.
 *
 * Consequences that were live bugs, found 2026-08-06:
 *   - reads doing .eq('text_normalized', normalizeForAudio(text)) miss every
 *     question-ending row written since March 2026;
 *   - that included the PRECIOUS-AUDIO GUARD, which therefore could not see
 *     5,090 human recordings and let TTS upsert over them;
 *   - the DB autolink trigger used a third rule again (`lower(trim(text))`,
 *     stripping nothing), fixed in
 *     database/migrations/20260806_audio_link_integrity.sql.
 *
 * Until a gated backfill unifies the column (it feeds
 * UNIQUE (course_code, text_normalized, language, role, voice_id), so it cannot
 * simply be recomputed — see docs/DECISIONS.md 2026-08-06), the rule is:
 *
 *   WRITING a course_audio row  -> the trigger decides; supply anything.
 *   READING / MATCHING against text_normalized -> use audioKeyCandidates()
 *     and match on ANY of them, never on normalizeForAudio alone.
 */

/**
 * The JS-side historical convention: lowercase, trim, collapse internal
 * whitespace, strip trailing . ! 。 ！ but KEEP a trailing ? so that
 * "emin misin" and "emin misin?" could coexist as separate audio (TTS uses ?
 * for question intonation). Only rows written before ~March 2026 are stored
 * this way. Kept for reading those rows, and unchanged for existing callers.
 */
function normalizeForAudio(text) {
  if (!text) return ''
  return text.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!。！]+$/, '')
}

/**
 * Exactly what the database's normalize_text() does, so a JS read can address
 * rows the way they are actually stored. Note rtrim(t, set) in Postgres strips
 * ALL trailing characters in the set, so "what?!" -> "what".
 *
 * Deliberately does NOT collapse internal whitespace — normalize_text() does
 * not either, and this function's whole job is to be byte-identical to it.
 */
function normalizeForDb(text) {
  if (!text) return ''
  return text.toLowerCase().trim().replace(/[.?!¿¡。？！]+$/, '')
}

/**
 * Every form the same text may be stored under, de-duplicated. Match with
 * `.in('text_normalized', audioKeyCandidates(text))` rather than `.eq(...)`,
 * so a lookup reaches both conventions in the split column.
 */
function audioKeyCandidates(text) {
  return [...new Set([normalizeForDb(text), normalizeForAudio(text)].filter(Boolean))]
}

module.exports = { normalizeForAudio, normalizeForDb, audioKeyCandidates }
